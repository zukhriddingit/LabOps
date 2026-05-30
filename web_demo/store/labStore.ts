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
} from "@/lib/api";
import { DEMO, INITIAL_SAMPLE, TUBES_OBSERVATION } from "@/lib/mockData";
import type {
  ConnectionStatus,
  InventoryObservation,
  MessageStatus,
  Sample,
  SampleStatus,
  LabViewPreset,
  TranscriptLine,
  VoiceLine,
} from "@/types/lab";

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
  transcript: TranscriptLine[];
  transcriptShown: number;

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
  transcript: TRANSCRIPT,
  transcriptShown: 2,

  selectedPinId: null,
  dashboardOpen: false,
  viewPreset: "entry",
  viewPresetTick: 0,
  demoRunning: false,
  voiceLog: [],
  listening: false,
  setSelectedPin: (id) => set({ selectedPinId: id }),
  toggleDashboard: (force) =>
    set((s) => ({ dashboardOpen: force ?? !s.dashboardOpen })),
  setViewPreset: (preset) =>
    set((s) => ({ viewPreset: preset, viewPresetTick: s.viewPresetTick + 1 })),

  pollState: async () => {
    try {
      await getState();
      set({ connection: "connected" });
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
        from_location: "Freezer B",
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
    set((s) => ({
      sample: {
        ...s.sample,
        location: "Backup Freezer D",
        status: "stabilized",
        elapsedDemoSeconds: 0,
        roomTempStartedAt: undefined,
      },
    }));
    try {
      await moveSample("C17", {
        from_location: get().sample.location,
        to_location: "Backup Freezer D",
        from_temperature: "21C",
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
        location: s.sample.location === "Freezer B" ? "Bench 2" : s.sample.location,
        status: "warning",
        elapsedDemoSeconds: DEMO.warningSeconds,
      },
    })),

  triggerCritical: () =>
    set((s) => ({
      sample: {
        ...s.sample,
        location: s.sample.location === "Freezer B" ? "Bench 2" : s.sample.location,
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
      transcriptShown: 2,
      selectedPinId: null,
      viewPreset: "entry",
      viewPresetTick: 0,
      demoRunning: false,
      voiceLog: [],
      listening: false,
    }),
}));
