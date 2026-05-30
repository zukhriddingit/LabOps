// Types for the LabOps Guardian 3D demo. Mirror shared/api_contract.md where they overlap.

export type SourceType =
  | "observed_by_sensor"
  | "user_reported"
  | "sop_grounded"
  | "calculated"
  | "camera_inferred"
  | "simulated_camera_counter"
  | "pending_confirmation"
  | "human_confirmed"
  | "stale";

export type Confidence = "high" | "medium" | "low";

export type SampleLocation = "Freezer B" | "Bench 2" | "Backup Freezer D";

export type SampleStatus =
  | "stored"
  | "tracking"
  | "warning"
  | "critical"
  | "stabilized";

export interface Sample {
  id: string;
  label: string;
  location: SampleLocation;
  status: SampleStatus;
  storageTemperature: string;
  roomTempStartedAt?: string;
  allowedRoomTempMinutes: number;
  elapsedDemoSeconds: number;
}

export interface InventoryObservation {
  item_id: string;
  item_name: string;
  official_location: string;
  visible_count: number;
  unit: string;
  source_type: SourceType; // always "simulated_camera_counter" here — NOT real CV
  confidence: Confidence;
  human_confirmation_required: boolean;
}

export type ConnectionStatus = "checking" | "connected" | "disconnected";

export type MessageStatus = "none" | "draft" | "sent";

export type LabViewPreset =
  | "entry"
  | "cold"
  | "bench"
  | "inventory"
  | "message"
  | "overview";

export interface TranscriptLine {
  who: "human" | "agent";
  text: string;
}

export interface VoiceLine {
  who: "human" | "agent";
  text: string;
}

// Structured event sent to POST /api/events. No image data — structured-only.
export interface InventoryObservationEvent {
  event_type: "inventory_observation";
  source_type: "simulated_camera_counter";
  item_id: string;
  item_name: string;
  location: string;
  visible_count: number;
  unit: string;
  confidence: Confidence;
}
