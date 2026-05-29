// Shapes mirror shared/api_contract.md. Keep them in sync with the backend.

export type SourceType =
  | "observed_by_sensor"
  | "user_reported"
  | "sop_grounded"
  | "calculated"
  | "camera_inferred"
  | "pending_confirmation"
  | "human_confirmed"
  | "stale";

export type Confidence = "high" | "medium" | "low";

export interface Sample {
  sample_id: string;
  name: string;
  location: string;
  storage_temperature: string;
  max_room_temp_minutes: number;
  room_temp_started_at: string | null;
  room_temp_deadline: string | null;
  source_type: SourceType;
  confidence: Confidence;
  updated_at?: string;
}

export interface Equipment {
  id: string;
  name: string;
  kind: string;
  current_temperature: string | null;
  status: string;
  source_type: SourceType;
  confidence: Confidence;
}

export interface InventoryItem {
  item_name: string;
  location: string;
  bin: string | null;
  record_count: number | null;
  camera_inferred_count: number | null;
  stock_level: string;
  confidence: Confidence;
  source_type: SourceType;
  timestamp?: string;
}

export interface Reminder {
  id: string;
  label: string;
  due_at: string;
  sample_id: string | null;
  kind: "warning" | "escalation" | "manual";
  status: "open" | "done" | "cancelled";
}

export interface Message {
  id: string;
  recipient_role: string;
  message: string;
  status: "draft" | "sent";
  source_type: SourceType;
  timestamp?: string;
}

export interface LabState {
  samples: Sample[];
  equipment: Equipment[];
  inventory: InventoryItem[];
  reminders: Reminder[];
  events: any[];
  messages: Message[];
  experiment_runs: any[];
  server_time: string;
}
