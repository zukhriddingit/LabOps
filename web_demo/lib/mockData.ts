// Deterministic mock data — used when the backend is unreachable so the demo always works.

import type { InventoryObservation, Sample } from "@/types/lab";

export const INITIAL_SAMPLE: Sample = {
  id: "C17",
  label: "Cardio Sample C17",
  location: "Freezer",
  status: "stored",
  storageTemperature: "-60C",
  allowedRoomTempMinutes: 20,
  elapsedDemoSeconds: 0,
};

export const TUBES_OBSERVATION: InventoryObservation = {
  item_id: "15ml_tubes",
  item_name: "15 mL tubes",
  official_location: "Shelf A / Bin 3",
  visible_count: 2,
  unit: "boxes",
  source_type: "simulated_camera_counter",
  confidence: "medium",
  human_confirmation_required: true,
};

// Fast demo clock: 20 lab minutes simulated in 20 seconds.
export const DEMO = {
  limitSeconds: 20,
  warningSeconds: 18,
  labMinutesPerSecond: 1, // 20 min over 20 s
} as const;
