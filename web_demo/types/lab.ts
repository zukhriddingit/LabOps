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

export type SampleLocation = "Freezer" | "Bench 2" | "Backup Freezer";

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

export type VoiceBrainMode = "unknown" | "rasa" | "local";

export interface EquipmentInfo {
  id: string;
  name: string;
  kind: string;
  current_temperature: string | null;
  status: string; // ok | alarm | error | idle
  normal_range?: { min: number; max: number; unit: string } | null;
  source_type: SourceType;
  confidence: Confidence;
  updated_at?: string;
}

export interface IncidentInfo {
  incident_id: string;
  type: string;
  equipment_id: string;
  severity: string;
  status: string; // open | investigating | resolved
  current_value?: string | null;
  threshold?: string | null;
  observations: string[];
  tickets: string[];
  created_at: string;
  updated_at?: string;
}

// A backend inventory record as returned in /api/state.inventory (and list_inventory).
export interface InventoryRecord {
  item_name: string;
  location: string;
  bin?: string | null;
  record_count?: number | null;
  camera_inferred_count?: number | null;
  stock_level?: string;
  confidence: Confidence;
  source_type: SourceType;
  timestamp?: string;
}

export interface EventInfo {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  source_type: SourceType;
  confidence: Confidence;
  timestamp?: string;
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
