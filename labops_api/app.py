"""LabOps Guardian — FastAPI backend.

The lab's operational brain: equipment state, sensor anomaly detection, incidents,
SOP retrieval, maintenance tickets, operational memory, and shift handoffs.

Run:
    pip install -r labops_api/requirements.txt
    uvicorn labops_api.app:app --reload --port 8000
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
_root = Path(__file__).parent.parent
load_dotenv(_root / ".env")          # local overrides (gitignored)
load_dotenv(_root / ".env.example", override=False)  # fallback for fresh clones

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from labops_api import storage, tools
from labops_api.models import (
    AddObservationRequest,
    CreateIncidentRequest,
    CreateReminderRequest,
    CreateTicketRequest,
    EventRequest,
    FindInventoryRequest,
    GenerateHandoffRequest,
    LogActivityEventRequest,
    MoveSampleRequest,
    RecallHistoryRequest,
    RetrieveSopRequest,
    SendEmergencyMessageRequest,
    ValidateCalculationRequest,
)
from labops_api.names import normalize_equipment_id, normalize_location
from labops_api.storage import next_id, now_iso

app = FastAPI(title="LabOps Guardian API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOM_TEMP_LOCATIONS = {"bench", "room", "table", "counter"}


# ── Internal helpers ──────────────────────────────────────────────────────────

def _log_event(event_type: str, payload: dict, source_type: str, confidence: str) -> dict:
    events = storage.load("events")
    event = {
        "id": next_id("evt", events),
        "type": event_type,
        "payload": payload,
        "source_type": source_type,
        "confidence": confidence,
        "timestamp": now_iso(),
    }
    events.append(event)
    storage.save("events", events)
    return event


def _severity_from_exceedance(exceedance_c: float) -> str:
    """Classify severity by how many °C above the normal_range.max."""
    if exceedance_c >= 10:
        return "critical"
    if exceedance_c >= 5:
        return "high"
    if exceedance_c >= 2:
        return "medium"
    return "low"


def _process_sensor_event(req: EventRequest) -> dict | None:
    """For temperature_reading events: update equipment state and auto-create/update incidents."""
    if req.type != "temperature_reading":
        return None

    equipment_id = normalize_equipment_id(req.equipment_id)
    value = req.value
    if equipment_id is None or value is None:
        return None

    equipment_list = storage.load("equipment")
    eq = next((e for e in equipment_list if e["id"] == equipment_id), None)
    if eq is None:
        return None

    eq["current_temperature"] = f"{value}{req.unit}"
    eq["updated_at"] = now_iso()

    normal_range = eq.get("normal_range")
    incident_result = None

    if normal_range:
        max_val = normal_range["max"]
        min_val = normal_range["min"]

        if value > max_val or value < min_val:
            eq["status"] = "alarm"
            exceedance = value - max_val if value > max_val else min_val - value
            severity = _severity_from_exceedance(exceedance)
            threshold_str = f"{max_val}{req.unit}" if value > max_val else f"{min_val}{req.unit}"

            incidents = storage.load("incidents")
            existing = next(
                (i for i in incidents
                 if i["equipment_id"] == equipment_id and i["status"] == "open"),
                None,
            )

            if existing is None:
                n = len(incidents) + 1
                incident = {
                    "incident_id": f"LAB-INC-{n:03d}",
                    "type": "temperature_excursion",
                    "equipment_id": equipment_id,
                    "severity": severity,
                    "status": "open",
                    "current_value": eq["current_temperature"],
                    "threshold": threshold_str,
                    "observations": [],
                    "tickets": [],
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }
                incidents.append(incident)
                incident_result = {"action": "created", "incident": incident}
            else:
                existing["current_value"] = eq["current_temperature"]
                existing["severity"] = severity
                existing["updated_at"] = now_iso()
                incident_result = {"action": "updated", "incident": existing}

            storage.save("incidents", incidents)
        else:
            eq["status"] = "ok"

    storage.save("equipment", equipment_list)
    return incident_result


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
def root() -> dict:
    return {"service": "LabOps Guardian API", "version": "0.2.0", "status": "ok", "time": now_iso()}


# ── State ─────────────────────────────────────────────────────────────────────

@app.get("/api/state")
def get_state() -> dict:
    return {
        "equipment": storage.load("equipment"),
        "samples": storage.load("samples"),
        "incidents": storage.load("incidents"),
        "tickets": storage.load("tickets"),
        "inventory": storage.load("inventory"),
        "reminders": storage.load("reminders"),
        "events": storage.load("events"),
        "messages": storage.load("messages"),
        "experiment_runs": storage.load("experiment_runs"),
        "server_time": now_iso(),
    }


# ── Equipment ─────────────────────────────────────────────────────────────────

@app.get("/api/equipment")
def get_equipment() -> list[dict]:
    return storage.load("equipment")


@app.get("/api/equipment/{equipment_id}")
def get_equipment_by_id(equipment_id: str) -> dict:
    equipment_id = normalize_equipment_id(equipment_id) or equipment_id
    for eq in storage.load("equipment"):
        if eq["id"] == equipment_id:
            return eq
    raise HTTPException(status_code=404, detail=f"Equipment '{equipment_id}' not found")


# ── Sensor events ─────────────────────────────────────────────────────────────

@app.post("/api/events")
def post_event(req: EventRequest) -> dict:
    payload = req.payload.copy()
    equipment_id = normalize_equipment_id(req.equipment_id)
    if equipment_id:
        payload["equipment_id"] = equipment_id
    if req.value is not None:
        payload["value"] = req.value
        payload["unit"] = req.unit

    event = _log_event(req.type, payload, req.source_type, req.confidence)
    incident_result = _process_sensor_event(req)

    response: dict = {"event": event}
    if incident_result:
        response["incident_action"] = incident_result["action"]
        response["incident"] = incident_result["incident"]
    return response


# ── Samples ───────────────────────────────────────────────────────────────────

@app.get("/api/samples")
def get_samples() -> list[dict]:
    return storage.load("samples")


@app.get("/api/samples/{sample_id}")
def get_sample(sample_id: str) -> dict:
    for s in storage.load("samples"):
        if s["sample_id"].upper() == sample_id.upper():
            return s
    raise HTTPException(status_code=404, detail=f"Sample {sample_id} not found")


@app.post("/api/samples/{sample_id}/move")
def move_sample(sample_id: str, req: MoveSampleRequest) -> dict:
    samples = storage.load("samples")
    sample = next((s for s in samples if s["sample_id"].upper() == sample_id.upper()), None)
    if sample is None:
        raise HTTPException(status_code=404, detail=f"Sample {sample_id} not found")

    to_location = normalize_location(req.to_location) or req.to_location
    from_location = normalize_location(req.from_location)

    sample["location"] = to_location
    sample["source_type"] = "user_reported"
    sample["confidence"] = "medium"
    sample["updated_at"] = now_iso()

    reminders_created: list[dict] = []
    to_lower = to_location.lower()
    is_room_temp = any(k in to_lower for k in ROOM_TEMP_LOCATIONS)

    if is_room_temp:
        started = datetime.now(timezone.utc)
        deadline = started + timedelta(minutes=req.allowed_room_temp_minutes)
        sample["room_temp_started_at"] = started.isoformat(timespec="seconds")
        sample["room_temp_deadline"] = deadline.isoformat(timespec="seconds")

        reminders = storage.load("reminders")
        warn_at = deadline - timedelta(minutes=2)
        warning = {
            "id": next_id("rem", reminders), "kind": "warning",
            "sample_id": sample["sample_id"],
            "label": f"{sample['sample_id']} nearing room-temp limit ({req.allowed_room_temp_minutes - 2} min)",
            "due_at": warn_at.isoformat(timespec="seconds"),
            "status": "open", "created_at": now_iso(),
        }
        reminders.append(warning)
        escalation = {
            "id": next_id("rem", reminders), "kind": "escalation",
            "sample_id": sample["sample_id"],
            "label": f"{sample['sample_id']} hit the {req.allowed_room_temp_minutes}-min room-temp limit",
            "due_at": deadline.isoformat(timespec="seconds"),
            "status": "open", "created_at": now_iso(),
        }
        reminders.append(escalation)
        storage.save("reminders", reminders)
        reminders_created = [warning, escalation]
    else:
        sample["room_temp_started_at"] = None
        sample["room_temp_deadline"] = None

    storage.save("samples", samples)
    event = _log_event(
        "sample_moved",
        {"sample_id": sample["sample_id"], "from": from_location, "to": to_location,
         "from_temperature": req.from_temperature,
         "allowed_room_temp_minutes": req.allowed_room_temp_minutes},
        "user_reported", "medium",
    )
    return {"sample": sample, "reminders": reminders_created, "event": event}


# ── Incidents ─────────────────────────────────────────────────────────────────

@app.get("/api/incidents")
def get_incidents() -> list[dict]:
    return storage.load("incidents")


@app.post("/api/incidents")
def create_incident(req: CreateIncidentRequest) -> dict:
    incidents = storage.load("incidents")
    n = len(incidents) + 1
    incident = {
        "incident_id": f"LAB-INC-{n:03d}",
        "type": req.type,
        "equipment_id": req.equipment_id,
        "severity": req.severity,
        "status": "open",
        "current_value": req.current_value,
        "threshold": req.threshold,
        "observations": [],
        "tickets": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    incidents.append(incident)
    storage.save("incidents", incidents)
    return incident


@app.post("/api/incidents/{incident_id}/observations")
def add_observation(incident_id: str, req: AddObservationRequest) -> dict:
    incidents = storage.load("incidents")
    incident = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    incident.setdefault("observations", []).append(req.observation)
    incident["updated_at"] = now_iso()
    storage.save("incidents", incidents)
    return incident


# ── AI Tools ──────────────────────────────────────────────────────────────────

@app.post("/api/tools/retrieve_sop")
def retrieve_sop(req: RetrieveSopRequest) -> dict:
    result = tools.retrieve_sop(
        issue_type=req.issue_type,
        equipment_id=req.equipment_id,
        query=req.query,
        sample_id=req.sample_id,
    )
    _log_event(
        "sop_retrieved",
        {"issue_type": req.issue_type, "query": req.query, "result": result},
        "sop_grounded", "high" if result.get("found") else "low",
    )
    return result


@app.post("/api/tools/create_ticket")
def create_ticket(req: CreateTicketRequest) -> dict:
    incidents = storage.load("incidents")
    if not any(i["incident_id"] == req.incident_id for i in incidents):
        raise HTTPException(status_code=404, detail=f"Incident {req.incident_id} not found")
    ticket = tools.create_ticket(
        incident_id=req.incident_id,
        severity=req.severity,
        assigned_to=req.assigned_to,
        summary=req.summary,
        notes=req.notes,
    )
    _log_event("ticket_created", {"ticket": ticket}, "human_confirmed", "high")
    return ticket


@app.post("/api/tools/recall_history")
def recall_history(req: RecallHistoryRequest) -> dict:
    result = tools.recall_history(req.equipment_id, req.issue_type)
    _log_event(
        "history_recalled",
        {"equipment_id": req.equipment_id, "issue_type": req.issue_type, "found": result.get("found")},
        "human_confirmed", "high",
    )
    return result


@app.post("/api/tools/generate_handoff")
def generate_handoff(req: GenerateHandoffRequest | None = None) -> dict:
    incident_id = req.incident_id if req else None
    shift = req.shift if req else None
    return tools.generate_handoff(shift=shift, incident_id=incident_id)


@app.post("/api/tools/validate_calculation")
def validate_calculation(req: ValidateCalculationRequest) -> dict:
    result = tools.validate_calculation(
        req.calculation_type, req.target_percent, req.final_volume_ml, req.user_answer_ul,
        req.stock_percent, req.user_answer_g,
    )
    _log_event("calculation_validated", {"request": req.model_dump(), "result": result},
               "calculated", result.get("confidence", "medium"))
    return result


@app.post("/api/tools/find_inventory")
def find_inventory(req: FindInventoryRequest) -> dict:
    result = tools.find_inventory(req.item_name)
    _log_event("inventory_lookup", {"item_name": req.item_name, "result": result},
               result.get("source_type", "camera_inferred"), result.get("confidence", "medium"))
    return result


@app.post("/api/tools/create_reminder")
def create_reminder(req: CreateReminderRequest) -> dict:
    # Accept both explicit {label, due_at} and Rasa's {duration_minutes, message} form
    if req.due_at:
        due_at = req.due_at
    elif req.duration_minutes:
        due_at = (datetime.now(timezone.utc) + timedelta(minutes=req.duration_minutes)).isoformat(timespec="seconds")
    else:
        raise HTTPException(status_code=422, detail="Provide either due_at or duration_minutes.")

    label = req.label or req.message or f"Lab reminder in {req.duration_minutes} min"

    reminders = storage.load("reminders")
    reminder = {
        "id": next_id("rem", reminders), "kind": "manual", "label": label,
        "due_at": due_at, "sample_id": req.sample_id, "status": "open",
        "created_at": now_iso(),
    }
    reminders.append(reminder)
    storage.save("reminders", reminders)
    return reminder


# ── Activity events ───────────────────────────────────────────────────────────

@app.post("/api/activity-events")
def log_activity_event(req: LogActivityEventRequest) -> dict:
    activity_events = storage.load("activity_events")
    today = now_iso()[:10]  # YYYY-MM-DD
    event = {
        "id": next_id("act", activity_events),
        "person_name": req.person_name,
        "event_type": req.event_type,
        "sample_id": req.sample_id,
        "description": req.description or f"{req.person_name} performed {req.event_type}",
        "source_type": req.source_type,
        "confidence": req.confidence,
        "date": today,
        "timestamp": now_iso(),
    }
    activity_events.append(event)
    storage.save("activity_events", activity_events)
    return event


@app.get("/api/activity-events/today")
def get_today_activity() -> list[dict]:
    today = now_iso()[:10]
    return [e for e in storage.load("activity_events") if e.get("date") == today]


@app.get("/api/people/{person_name}/daily-activity")
def get_person_daily_activity(person_name: str) -> dict:
    today = now_iso()[:10]
    all_events = storage.load("activity_events")
    person_events = [
        e for e in all_events
        if e.get("person_name", "").lower() == person_name.lower()
        and e.get("date") == today
    ]
    return {
        "person_name": person_name,
        "date": today,
        "activities": person_events,
        "count": len(person_events),
        "source_type": "user_reported",
        "confidence": "medium",
    }


@app.post("/api/tools/send_emergency_message")
def send_emergency_message(req: SendEmergencyMessageRequest) -> dict:
    messages = storage.load("messages")
    message = {
        "id": next_id("msg", messages),
        "recipient_role": req.recipient_role,
        "message": req.message,
        "status": "sent" if req.confirmed else "draft",
        "source_type": "human_confirmed" if req.confirmed else "pending_confirmation",
        "timestamp": now_iso(),
    }
    messages.append(message)
    storage.save("messages", messages)
    return message


# ── Voice chat endpoint (Rasa-compatible format, powered by Qwen via Nebius) ──
# VITE_RASA_REST_URL=http://localhost:8001/api/chat in voice_client/.env.local

from labops_api import agent as _agent

class ChatRequest(BaseModel):
    message: str
    sender: str = "user"


def _chat_response(text: str) -> list[dict[str, Any]]:
    return [{"recipient_id": "user", "text": text}]


@app.post("/api/chat")
async def chat(req: ChatRequest) -> list[dict[str, Any]]:
    """Keyword-routes voice/text input to the right backend tool and returns a spoken reply."""
    t = req.message.lower().strip()

    reply = await _agent.run(req.message, sender=req.sender)
    return _chat_response(reply)
