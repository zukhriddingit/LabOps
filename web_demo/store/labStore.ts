// Global demo state (Zustand). Holds the sample, inventory observation, connection status,
// highlighted object, the scripted transcript, and the message draft. Actions fire structured
// backend calls and ALWAYS fall back to deterministic local state on failure.

import { create } from "zustand";
import {
  getState,
  moveSample,
  postEvent,
  sendEmergencyMessage,
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
    }),
}));
