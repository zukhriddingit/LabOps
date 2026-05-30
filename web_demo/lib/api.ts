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
