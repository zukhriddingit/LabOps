// Global demo state (Zustand). Holds the sample, inventory observation, connection status,
// highlighted object, the scripted transcript, and the message draft. Actions fire structured
// backend calls and ALWAYS fall back to deterministic local state on failure.

import { create } from "zustand";
import {
  getState,
  moveSample,
  postEvent,
  sendEmergencyMessage,
  validateCalculation,
  retrieveSop,
  generateHandoff,
  findInventory,
  postSensorReading,
  recallHistory,
  sendRasaMessage,
} from "@/lib/api";
import { DEMO, INITIAL_SAMPLE, TUBES_OBSERVATION } from "@/lib/mockData";
import type {
  ConnectionStatus,
  InventoryObservation,
  InventoryRecord,
  MessageStatus,
  Sample,
  SampleStatus,
  SampleLocation,
  LabViewPreset,
  TranscriptLine,
  VoiceLine,
  EquipmentInfo,
  IncidentInfo,
  EventInfo,
  VoiceBrainMode,
} from "@/types/lab";

// Map any backend location string onto one of the 3 scene locations (null = unknown/skip).
function toSceneLocation(value: unknown): SampleLocation | null {
  const v = String(value ?? "").toLowerCase();
  if (!v) return null;
  if (v.includes("backup")) return "Backup Freezer";
  if (v.includes("freezer") || v.includes("cold") || v.includes("storage")) return "Freezer";
  if (/(bench|room|table|counter)/.test(v)) return "Bench 2";
  return null;
}

// Build the local sample state when the backend reports C17 somewhere new (e.g. an agent move).
function sampleFromBackendMove(current: Sample, loc: SampleLocation): Sample {
  if (loc === "Bench 2") {
    return {
      ...current,
      location: loc,
      status: "tracking",
      elapsedDemoSeconds: 0,
      roomTempStartedAt: new Date().toISOString(),
    };
  }
  return {
    ...current,
    location: loc,
    status: loc === "Backup Freezer" ? "stabilized" : "stored",
    elapsedDemoSeconds: 0,
    roomTempStartedAt: undefined,
  };
}

const TRANSCRIPT: TranscriptLine[] = [
  { who: "human", text: "Guardian, I'm taking C17 out of minus 60 and putting it on Bench 2." },
  { who: "agent", text: "Logged. I'll alert you at 18 minutes and escalate at 20." },
  { who: "human", text: "Where are the 15 mL tubes?" },
  { who: "agent", text: "Inventory says Shelf A bin 3. The simulated shelf camera reports 2 visible boxes with medium confidence." },
  { who: "human", text: "My gloves are contaminated. Message the postdoc." },
  { who: "agent", text: "Draft ready. Confirm send?" },
];

const EMERGENCY_TEXT =
  "Sample C17 is near/exceeding the room-temp limit on Bench 2. Assistance needed.";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LabState {
  sample: Sample;
  inventory: InventoryObservation | null;
  highlighted: string | null; // equipment id with glowing outline
  connection: ConnectionStatus;
  messageStatus: MessageStatus;
  messageDraft: string | null;
  lastMsgKey: string; // tracks the latest backend message (id:status) to detect new drafts/sends
  transcript: TranscriptLine[];
  transcriptShown: number;

  // backend memory (from /api/state)
  equipment: EquipmentInfo[];
  events: EventInfo[];
  incidents: IncidentInfo[];
  inventoryList: InventoryRecord[];
  simulateExcursion: () => Promise<void>;
  recoverFreezer: () => Promise<void>;

  // UI
  selectedPinId: string | null;
  dashboardOpen: boolean;
  viewPreset: LabViewPreset;
  viewPresetTick: number;
  demoRunning: boolean;
  setSelectedPin: (id: string | null) => void;
  toggleDashboard: (force?: boolean) => void;
  setViewPreset: (preset: LabViewPreset) => void;

  // lifecycle
  pollState: () => Promise<void>;
  tick: () => void;

  // demo actions
  moveToBench: () => Promise<void>;
  moveToBackupFreezer: () => Promise<void>;
  triggerWarning: () => void;
  triggerCritical: () => void;
  findTubes: () => Promise<void>;
  draftMessage: () => Promise<void>;
  runDemo: () => Promise<void>;
  advanceTranscript: () => void;
  reset: () => void;

  // voice
  voiceLog: VoiceLine[];
  voiceBrain: VoiceBrainMode;
  listening: boolean;
  setListening: (b: boolean) => void;
  runVoiceCommand: (text: string) => Promise<string>;
  clearVoice: () => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  sample: { ...INITIAL_SAMPLE },
  inventory: null,
  highlighted: null,
  connection: "checking",
  messageStatus: "none",
  messageDraft: null,
  lastMsgKey: "",
  transcript: TRANSCRIPT,
  transcriptShown: 2,

  equipment: [],
  events: [],
  incidents: [],
  inventoryList: [],

  selectedPinId: null,
  dashboardOpen: false,
  viewPreset: "entry",
  viewPresetTick: 0,
  demoRunning: false,
  voiceLog: [],
  voiceBrain: "unknown",
  listening: false,
  setSelectedPin: (id) => set({ selectedPinId: id }),
  toggleDashboard: (force) =>
    set((s) => ({ dashboardOpen: force ?? !s.dashboardOpen })),
  setViewPreset: (preset) =>
    set((s) => ({ viewPreset: preset, viewPresetTick: s.viewPresetTick + 1 })),

  pollState: async () => {
    try {
      const s: any = await getState();
      const patch: Partial<LabState> = {
        connection: "connected",
        equipment: s.equipment ?? [],
        events: s.events ?? [],
        incidents: s.incidents ?? [],
        inventoryList: s.inventory ?? [],
      };

      // Reflect a real backend sample move (Qwen agent / voice / API) in the 3D scene —
      // but never while the scripted local demo is animating, and only on an actual change
      // (so we don't reset the fast bench timer on every 5 s poll).
      if (!get().demoRunning) {
        const c17 = (s.samples ?? []).find(
          (x: any) => String(x.sample_id).toUpperCase() === "C17"
        );
        const loc = toSceneLocation(c17?.location);
        const cur = get().sample;
        // Only adopt a backend-driven move when the sample is at rest locally, so we
        // never clobber an active bench/warning/critical state (e.g. the trigger buttons
        // or a live timer) whose move wasn't persisted to the backend.
        const atRest = cur.status === "stored" || cur.status === "stabilized";
        if (loc && loc !== cur.location && atRest) {
          patch.sample = sampleFromBackendMove(cur, loc);
        }
      }

      // Reflect agent/voice-driven emergency drafts + sends in the UI (MessagePanel,
      // pi_postdoc glow). React only to a NEW message or a draft->sent change so a
      // local reset stays clean.
      const msgs: any[] = s.messages ?? [];
      const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
      const key = lastMsg ? `${lastMsg.id}:${lastMsg.status}` : "";
      if (key && key !== get().lastMsgKey) {
        patch.lastMsgKey = key;
        patch.messageStatus = lastMsg.status === "sent" ? "sent" : "draft";
        patch.messageDraft = lastMsg.message ?? get().messageDraft;
      }

      set(patch as LabState);
    } catch {
      set({ connection: "disconnected" });
    }
  },

  // Simulate a freezer temperature excursion: the backend auto-creates an incident
  // and flips the primary Freezer into alarm. Shows the monitoring/resilience layer live.
  simulateExcursion: async () => {
    try {
      await postSensorReading("freezer", -40, "C");
      await get().pollState();
    } catch {
      set({ connection: "disconnected" });
    }
  },

  recoverFreezer: async () => {
    try {
      await postSensorReading("freezer", -60, "C");
      await get().pollState();
    } catch {
      set({ connection: "disconnected" });
    }
  },

  tick: () => {
    const { sample } = get();
    if (sample.status !== "tracking" && sample.status !== "warning") return;
    const elapsed = sample.elapsedDemoSeconds + 1;
    let status: SampleStatus = sample.status;
    if (elapsed >= DEMO.limitSeconds) status = "critical";
    else if (elapsed >= DEMO.warningSeconds) status = "warning";
    set({ sample: { ...sample, elapsedDemoSeconds: elapsed, status } });
  },

  moveToBench: async () => {
    set((s) => ({
      sample: {
        ...s.sample,
        location: "Bench 2",
        status: "tracking",
        roomTempStartedAt: new Date().toISOString(),
        elapsedDemoSeconds: 0,
      },
      transcriptShown: Math.max(s.transcriptShown, 2),
    }));
    try {
      await moveSample("C17", {
        from_location: "Freezer",
        to_location: "Bench 2",
        from_temperature: "-60C",
        allowed_room_temp_minutes: 20,
      });
      set({ connection: "connected" });
    } catch {
      set({ connection: "disconnected" });
    }
  },

  moveToBackupFreezer: async () => {
    const from = get().sample.location; // capture BEFORE the optimistic update
    set((s) => ({
      sample: {
        ...s.sample,
        location: "Backup Freezer",
        status: "stabilized",
        elapsedDemoSeconds: 0,
        roomTempStartedAt: undefined,
      },
    }));
    try {
      await moveSample("C17", {
        from_location: from,
        to_location: "Backup Freezer",
        from_temperature: from === "Bench 2" ? "21C" : "-60C",
        allowed_room_temp_minutes: 20,
      });
      set({ connection: "connected" });
    } catch {
      set({ connection: "disconnected" });
    }
  },

  triggerWarning: () =>
    set((s) => ({
      sample: {
        ...s.sample,
        location: s.sample.location === "Freezer" ? "Bench 2" : s.sample.location,
        status: "warning",
        elapsedDemoSeconds: DEMO.warningSeconds,
      },
    })),

  triggerCritical: () =>
    set((s) => ({
      sample: {
        ...s.sample,
        location: s.sample.location === "Freezer" ? "Bench 2" : s.sample.location,
        status: "critical",
        elapsedDemoSeconds: DEMO.limitSeconds,
      },
    })),

  findTubes: async () => {
    set({ inventory: { ...TUBES_OBSERVATION }, highlighted: "shelf_a" });
    try {
      await postEvent({
        event_type: "inventory_observation",
        source_type: "simulated_camera_counter",
        item_id: TUBES_OBSERVATION.item_id,
        item_name: TUBES_OBSERVATION.item_name,
        location: TUBES_OBSERVATION.official_location,
        visible_count: TUBES_OBSERVATION.visible_count,
        unit: TUBES_OBSERVATION.unit,
        confidence: TUBES_OBSERVATION.confidence,
      });
      set({ connection: "connected" });
    } catch {
      set({ connection: "disconnected" });
    }
  },

  draftMessage: async () => {
    set({ messageStatus: "draft", messageDraft: EMERGENCY_TEXT });
    try {
      // confirmed=false → backend returns a draft only, never "sends".
      await sendEmergencyMessage("postdoc", EMERGENCY_TEXT, false);
      set({ connection: "connected" });
    } catch {
      set({ connection: "disconnected" });
    }
  },

  runDemo: async () => {
    if (get().demoRunning) return;

    set((s) => ({
      demoRunning: true,
      dashboardOpen: true,
      viewPreset: "entry",
      viewPresetTick: s.viewPresetTick + 1,
    }));
    get().reset();
    set((s) => ({
      demoRunning: true,
      dashboardOpen: true,
      viewPreset: "cold",
      viewPresetTick: s.viewPresetTick + 1,
    }));
    await wait(900);

    await get().moveToBench();
    set((s) => ({ viewPreset: "bench", viewPresetTick: s.viewPresetTick + 1, transcriptShown: 2, selectedPinId: "sample" }));
    await wait(1900);

    get().triggerWarning();
    set({ transcriptShown: 2, selectedPinId: "sample" });
    await wait(1200);

    set((s) => ({ viewPreset: "inventory", viewPresetTick: s.viewPresetTick + 1, transcriptShown: 3, selectedPinId: "shelf_a" }));
    await wait(900);
    await get().findTubes();
    set({ transcriptShown: 4, selectedPinId: "shelf_a" });
    await wait(1600);

    get().triggerCritical();
    set((s) => ({ viewPreset: "message", viewPresetTick: s.viewPresetTick + 1, transcriptShown: 5, selectedPinId: "pi_postdoc" }));
    await wait(900);
    await get().draftMessage();
    set({ transcriptShown: 6, selectedPinId: "pi_postdoc" });
    await wait(1600);

    set((s) => ({ viewPreset: "cold", viewPresetTick: s.viewPresetTick + 1, selectedPinId: "sample" }));
    await get().moveToBackupFreezer();
    set({ demoRunning: false, transcriptShown: 6, selectedPinId: "sample" });
  },

  setListening: (b) => set({ listening: b }),
  clearVoice: () => set({ voiceLog: [] }),

  // The Guardian "brain": interpret a spoken/typed command, drive the 3D demo,
  // and ground answers via the real backend tools. Returns the reply to speak.
  runVoiceCommand: async (raw) => {
    const text = (raw || "").trim();
    if (!text) return "";
    const pushVoice = (who: "human" | "agent", t: string) =>
      set((s) => ({ voiceLog: [...s.voiceLog, { who, text: t }].slice(-20) }));
    pushVoice("human", text);

    try {
      const replies = await sendRasaMessage(text);
      const reply = replies
        .map((r) => r.text)
        .filter((r): r is string => Boolean(r?.trim()))
        .join(" ");

      if (reply) {
        set({ voiceBrain: "rasa", connection: "connected" });
        await get().pollState();
        pushVoice("agent", reply);
        return reply;
      }
      set({ voiceBrain: "local" });
    } catch {
      set({ voiceBrain: "local" });
    }

    const t = text.toLowerCase();
    const num = (re: RegExp): number | undefined => {
      const m = t.match(re);
      return m ? parseFloat(m[1]) : undefined;
    };
    let reply = "";

    // 1. confirm sending a pending draft
    if (
      get().messageStatus === "draft" &&
      /\b(yes|send it|send|confirm|go ahead|do it|affirmative|please send)\b/.test(t)
    ) {
      try {
        await sendEmergencyMessage("postdoc", get().messageDraft ?? EMERGENCY_TEXT, true);
        set({ messageStatus: "sent", connection: "connected" });
      } catch {
        set({ connection: "disconnected" });
      }
      reply = "Sent to the postdoc.";
    }
    // 2. emergency message / escalation
    else if (
      /(contaminat|gloves|my hands|postdoc|\bp\.?i\.?\b|message the|notify the|alert the|emergency)/.test(t)
    ) {
      await get().draftMessage();
      reply = `Draft to the postdoc: ${EMERGENCY_TEXT} Confirm send?`;
    }
    // 3. reagent calculation check
    else if (
      /(calculat|percent|%|microlit|µl|\bul\b|dilut|is that right|is that correct|tween|v\/v)/.test(t) &&
      /\d/.test(t)
    ) {
      const target_percent = num(/([\d.]+)\s*(?:percent|%)/);
      const final_volume_ml = num(/([\d.]+)\s*(?:millilit(?:re|er)s?|mls?|ml)\b/);
      const user_answer_ul = num(/([\d.]+)\s*(?:microlit(?:re|er)s?|micro ?lit(?:re|er)s?|µl|ul)\b/);
      if (target_percent === undefined || final_volume_ml === undefined) {
        reply =
          "I can check that — give me the target percent, the final volume in milliliters, and the microliters you calculated.";
      } else {
        try {
          const r = await validateCalculation({ target_percent, final_volume_ml, user_answer_ul });
          const lead =
            r.status === "correct"
              ? "That's correct"
              : r.status === "incorrect"
                ? `That doesn't match — I get ${r.expected_ul} microliters`
                : "I can't confirm that without more detail";
          reply = `${lead}, assuming ${(r.assumptions || []).join(" and ")}. ${r.warning ?? ""}`.trim();
          set({ connection: "connected" });
        } catch {
          set({ connection: "disconnected" });
          reply = "I can't reach the calculation tool right now, so I won't validate it yet.";
        }
      }
    }
    // 4. inventory / location
    else if (/(where|find|locate|tubes|inventory|shelf|15 ?ml|fifteen mil)/.test(t)) {
      await get().findTubes();
      try {
        const r: any = await findInventory("15 mL tubes");
        reply = `The inventory record puts the 15 mL tubes at ${r.location}. The simulated shelf counter sees ${r.camera_inferred_count} boxes, confidence ${r.confidence}. Human confirmation recommended.`;
        set({ connection: "connected" });
      } catch {
        reply =
          "The inventory record puts the 15 mL tubes on Shelf A, bin 3. Simulated count two boxes, confidence medium.";
      }
    }
    // 5. SOP / protocol
    else if (/(sop|protocol|procedure|centrifuge|rotor|spin down|setup|prep)/.test(t)) {
      try {
        const r = await retrieveSop(text, "C17");
        reply = r.found
          ? `Based on the local SOP, the match is ${r.title}. ${r.caution ?? ""}`.trim()
          : "I don't have a matching local SOP, and I won't guess at protocol steps.";
        set({ connection: "connected" });
      } catch {
        set({ connection: "disconnected" });
        reply = "I can't reach the SOP tool right now.";
      }
    }
    // 5b. freezer excursion (sensor → incident)
    else if (
      /(excursion|freezer (is )?(warm|warming|too warm|rising|above)|temperature (alarm|spike|reading)|simulate.*(excursion|alarm))/.test(t)
    ) {
      await get().simulateExcursion();
      const inc = get().incidents.find(
        (i) => i.equipment_id === "freezer" && i.status !== "resolved"
      );
      reply = inc
        ? `Freezer is reading ${inc.current_value}, above the ${inc.threshold} threshold. I've opened incident ${inc.incident_id}, severity ${inc.severity}. This is sensor-observed.`
        : "Logged a Freezer temperature reading.";
    }
    // 5c. prior-incident history recall
    else if (
      /(prior|past|previous|history|happened before|seen this before|any (issues|incidents|problems))/.test(t)
    ) {
      try {
        const r: any = await recallHistory("freezer");
        set({ connection: "connected" });
        if (r.found && r.related_events?.length) {
          const e = r.related_events[0];
          reply = `History: ${e.summary}. Recorded cause: ${e.recorded_cause ?? "unknown"}. ${r.uncertainty_note ?? ""}`.trim();
        } else {
          reply = "I don't have prior incidents on record for Freezer.";
        }
      } catch {
        set({ connection: "disconnected" });
        reply = "I can't reach the history tool right now.";
      }
    }
    // 5d. incident / alarm status
    else if (/(incident|alarm|what'?s wrong|active alert|open issue)/.test(t)) {
      const open = get().incidents.filter((i) => i.status !== "resolved");
      reply = open.length
        ? `There ${open.length === 1 ? "is" : "are"} ${open.length} open incident${open.length === 1 ? "" : "s"}: ${open
            .map((i) => `${i.incident_id}, ${i.type.replace(/_/g, " ")}, severity ${i.severity}`)
            .join("; ")}.`
        : "No open incidents. All monitored equipment is within range.";
    }
    // 6. move to backup freezer
    else if (
      /(backup|freezer d|put it back|back (in|to|into) (the )?(freezer|storage|cold)|stabiliz|return.*storage)/.test(t)
    ) {
      await get().moveToBackupFreezer();
      reply = "Moving C17 to the backup freezer. It's stabilizing in cold storage.";
    }
    // 7. move to bench
    else if (
      /(bench|out of (minus|negative|-?\s?60)|taking c.?17|move c.?17|onto the bench|on the bench|remove c.?17)/.test(t)
    ) {
      await get().moveToBench();
      reply = "Logged. C17 is on Bench 2. I'll warn you at 18 minutes and escalate at 20.";
    }
    // 8. warning / critical (explicit)
    else if (/\b(warning|near (the )?limit|eighteen minutes?)\b/.test(t)) {
      get().triggerWarning();
      reply = "C17 is approaching the room-temperature limit.";
    } else if (/\b(critical|escalat|exceeded|over the limit|twenty[- ]minute)\b/.test(t)) {
      get().triggerCritical();
      reply = "C17 has exceeded the room-temperature limit. Escalation recommended.";
    }
    // 9. shift handoff
    else if (/(hand ?off|night shift|summary|brief|status report|wrap up)/.test(t)) {
      const s = get();
      try {
        await generateHandoff("night");
        set({ connection: "connected" });
      } catch {
        set({ connection: "disconnected" });
      }
      reply =
        `Handoff: C17 is currently on ${s.sample.location}, status ${s.sample.status}. ` +
        (s.inventory
          ? `15 mL tubes located on ${s.inventory.official_location}, confidence ${s.inventory.confidence}. `
          : "") +
        (s.messageStatus !== "none" ? `Postdoc message ${s.messageStatus}. ` : "") +
        "Root cause and final outcome are not yet confirmed.";
    }
    // 10. status query
    else if (/(status|where is c.?17|how long|the timer|how is c)/.test(t)) {
      const s = get().sample;
      reply = `C17 is on ${s.location}, status ${s.status}.`;
    }
    // help / fallback
    else {
      reply =
        "I can track samples, check reagent calculations, find inventory, clarify local SOPs, and message your team. Try: move C17 to the bench, or where are the 15 mL tubes.";
    }

    pushVoice("agent", reply);
    return reply;
  },

  advanceTranscript: () =>
    set((s) => ({
      transcriptShown: Math.min(s.transcript.length, s.transcriptShown + 1),
    })),

  reset: () =>
    set({
      sample: { ...INITIAL_SAMPLE },
      inventory: null,
      highlighted: null,
      messageStatus: "none",
      messageDraft: null,
      lastMsgKey: "",
      transcriptShown: 2,
      selectedPinId: null,
      viewPreset: "entry",
      viewPresetTick: 0,
      demoRunning: false,
      voiceLog: [],
      voiceBrain: "unknown",
      listening: false,
    }),
}));
