// Thin wrapper around the LabOps API (shared/api_contract.md).
// Falls back to MOCK_STATE when the backend is unreachable so the demo stays usable.

import type { LabState } from "./types";

const BASE = import.meta.env.VITE_LABOPS_API_URL ?? "http://localhost:8000";

export const MOCK_STATE: LabState = {
  samples: [
    {
      sample_id: "C17",
      name: "Cardiovascular tissue sample",
      location: "Freezer B",
      storage_temperature: "-60C",
      max_room_temp_minutes: 20,
      room_temp_started_at: null,
      room_temp_deadline: null,
      source_type: "user_reported",
      confidence: "high",
    },
  ],
  equipment: [
    { id: "freezer_b", name: "Freezer B", kind: "freezer", current_temperature: "-60C", status: "ok", source_type: "observed_by_sensor", confidence: "high" },
    { id: "bench_2", name: "Bench 2", kind: "bench", current_temperature: "21C", status: "ok", source_type: "observed_by_sensor", confidence: "high" },
    { id: "centrifuge_2", name: "Centrifuge 2", kind: "centrifuge", current_temperature: null, status: "idle", source_type: "observed_by_sensor", confidence: "high" },
    { id: "shelf_a", name: "Storage Shelf A", kind: "shelf", current_temperature: null, status: "ok", source_type: "observed_by_sensor", confidence: "high" },
  ],
  inventory: [
    { item_name: "15 mL tubes", location: "Shelf A, bin 3", bin: "3", record_count: null, camera_inferred_count: 2, stock_level: "ok", confidence: "medium", source_type: "camera_inferred" },
  ],
  reminders: [],
  events: [],
  messages: [],
  experiment_runs: [],
  server_time: new Date().toISOString(),
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!resp.ok) throw new Error(`${path} → HTTP ${resp.status}`);
  return resp.json() as Promise<T>;
}

export async function getState(): Promise<LabState> {
  return req<LabState>("/api/state");
}

export interface MovePayload {
  from_location: string;
  to_location: string;
  from_temperature: string;
  allowed_room_temp_minutes: number;
}

export async function moveSample(sampleId: string, payload: MovePayload) {
  return req(`/api/samples/${sampleId}/move`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function postEvent(type: string, payload: Record<string, unknown>) {
  return req("/api/events", {
    method: "POST",
    body: JSON.stringify({ type, payload, source_type: "user_reported", confidence: "medium" }),
  });
}

export async function sendEmergencyMessage(recipient_role: string, message: string, confirmed: boolean) {
  return req("/api/tools/send_emergency_message", {
    method: "POST",
    body: JSON.stringify({ recipient_role, message, confirmed }),
  });
}

export async function findInventory(item_name: string) {
  return req("/api/tools/find_inventory", {
    method: "POST",
    body: JSON.stringify({ item_name }),
  });
}
