// LabOps API client. Every call degrades gracefully — callers treat a thrown error as
// "backend disconnected" and fall back to mock data.

import type { InventoryObservationEvent } from "@/types/lab";

const BASE =
  process.env.NEXT_PUBLIC_LABOPS_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!resp.ok) throw new Error(`${path} → HTTP ${resp.status}`);
  return resp.json() as Promise<T>;
}

export async function getState(): Promise<unknown> {
  return req("/api/state");
}

export interface RasaReply {
  recipient_id?: string;
  text?: string;
  image?: string;
  buttons?: Array<{ title: string; payload: string }>;
}

export async function sendRasaMessage(message: string, sender = "web_demo"): Promise<RasaReply[]> {
  const resp = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ sender, message }),
  });
  if (!resp.ok) throw new Error(`/api/chat -> HTTP ${resp.status}`);
  const data = (await resp.json()) as RasaReply[] | { replies?: RasaReply[] };
  const replies = Array.isArray(data) ? data : data.replies ?? [];
  if (replies.some((r) => /Nebius is not configured/i.test(r.text ?? ""))) {
    throw new Error("Hosted chat LLM is not configured");
  }
  return replies;
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

export async function postEvent(event: InventoryObservationEvent) {
  return req("/api/events", {
    method: "POST",
    body: JSON.stringify({
      type: event.event_type,
      source_type: "camera_inferred",
      confidence: event.confidence,
      payload: {
        ...event,
        original_source_type: event.source_type,
      },
    }),
  });
}

export async function findInventory(item_name: string) {
  return req("/api/tools/find_inventory", {
    method: "POST",
    body: JSON.stringify({ item_name }),
  });
}

export interface CalcPayload {
  target_percent?: number;
  final_volume_ml?: number;
  user_answer_ul?: number;
}

export async function validateCalculation(p: CalcPayload): Promise<any> {
  return req("/api/tools/validate_calculation", {
    method: "POST",
    body: JSON.stringify({ calculation_type: "percent_volume_volume", ...p }),
  });
}

export async function retrieveSop(query: string, sample_id?: string): Promise<any> {
  return req("/api/tools/retrieve_sop", {
    method: "POST",
    body: JSON.stringify({ query, sample_id }),
  });
}

export async function generateHandoff(shift?: string): Promise<any> {
  return req("/api/tools/generate_handoff", {
    method: "POST",
    body: JSON.stringify({ shift }),
  });
}

// Push a temperature sensor reading. The backend updates equipment state and, if the
// value is outside the equipment's normal_range, auto-creates/updates an incident.
export async function postSensorReading(
  equipment_id: string,
  value: number,
  unit = "C"
): Promise<any> {
  return req("/api/events", {
    method: "POST",
    body: JSON.stringify({
      type: "temperature_reading",
      equipment_id,
      value,
      unit,
      source_type: "observed_by_sensor",
      confidence: "high",
    }),
  });
}

export async function recallHistory(equipment_id: string, issue_type?: string): Promise<any> {
  return req("/api/tools/recall_history", {
    method: "POST",
    body: JSON.stringify({ equipment_id, issue_type }),
  });
}

export async function sendEmergencyMessage(
  recipient_role: string,
  message: string,
  confirmed: boolean
) {
  return req("/api/tools/send_emergency_message", {
    method: "POST",
    body: JSON.stringify({ recipient_role, message, confirmed }),
  });
}
