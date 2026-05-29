"""LabOps Guardian — FastAPI tool & memory server.

The lab's "second brain": sample/cold-chain memory, inventory, calculation validation,
SOP grounding, reminders, simulated emergency messaging, and shift handoffs. Every fact
is stamped with a truth-state (source_type + confidence).

Run:
    pip install -r labops_api/requirements.txt
    uvicorn labops_api.app:app --reload --port 8000
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from labops_api import storage, tools
from labops_api.models import (
    CreateReminderRequest,
    EventRequest,
    FindInventoryRequest,
    GenerateHandoffRequest,
    MoveSampleRequest,
    RetrieveSopRequest,
    SendEmergencyMessageRequest,
    ValidateCalculationRequest,
)
from labops_api.storage import next_id, now_iso

app = FastAPI(title="LabOps Guardian API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOM_TEMP_LOCATIONS = {"bench", "room", "table", "counter"}


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


@app.get("/")
def root() -> dict:
    return {"service": "LabOps Guardian API", "status": "ok", "time": now_iso()}


# ── State & samples ──────────────────────────────────────────────────────────────
@app.get("/api/state")
def get_state() -> dict:
    return {
        "samples": storage.load("samples"),
        "equipment": storage.load("equipment"),
        "inventory": storage.load("inventory"),
        "reminders": storage.load("reminders"),
        "events": storage.load("events"),
        "messages": storage.load("messages"),
        "experiment_runs": storage.load("experiment_runs"),
        "server_time": now_iso(),
    }


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

    sample["location"] = req.to_location
    sample["source_type"] = "user_reported"
    sample["confidence"] = "medium"
    sample["updated_at"] = now_iso()

    reminders_created: list[dict] = []
    to_lower = req.to_location.lower()
    is_room_temp = any(k in to_lower for k in ROOM_TEMP_LOCATIONS)

    if is_room_temp:
        started = datetime.now(timezone.utc)
        deadline = started + timedelta(minutes=req.allowed_room_temp_minutes)
        sample["room_temp_started_at"] = started.isoformat(timespec="seconds")
        sample["room_temp_deadline"] = deadline.isoformat(timespec="seconds")

        reminders = storage.load("reminders")
        warn_at = deadline - timedelta(minutes=2)
        warning = {
            "id": next_id("rem", reminders), "kind": "warning", "sample_id": sample["sample_id"],
            "label": f"{sample['sample_id']} nearing the room-temp limit "
                     f"({req.allowed_room_temp_minutes - 2} min)",
            "due_at": warn_at.isoformat(timespec="seconds"), "status": "open", "created_at": now_iso(),
        }
        reminders.append(warning)
        escalation = {
            "id": next_id("rem", reminders), "kind": "escalation", "sample_id": sample["sample_id"],
            "label": f"{sample['sample_id']} hit the {req.allowed_room_temp_minutes}-min room-temp limit",
            "due_at": deadline.isoformat(timespec="seconds"), "status": "open", "created_at": now_iso(),
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
        {"sample_id": sample["sample_id"], "from": req.from_location, "to": req.to_location,
         "from_temperature": req.from_temperature,
         "allowed_room_temp_minutes": req.allowed_room_temp_minutes},
        "user_reported", "medium",
    )
    return {"sample": sample, "reminders": reminders_created, "event": event}


# ── Tools ────────────────────────────────────────────────────────────────────────
@app.post("/api/tools/validate_calculation")
def validate_calculation(req: ValidateCalculationRequest) -> dict:
    result = tools.validate_calculation(
        req.calculation_type, req.target_percent, req.final_volume_ml, req.user_answer_ul
    )
    _log_event("calculation_validated", {"request": req.model_dump(), "result": result},
               "calculated", result.get("confidence", "medium"))
    return result


@app.post("/api/tools/retrieve_sop")
def retrieve_sop(req: RetrieveSopRequest) -> dict:
    result = tools.retrieve_sop(req.query, req.sample_id)
    _log_event("sop_retrieved", {"query": req.query, "result": result},
               "sop_grounded", "high" if result.get("found") else "low")
    return result


@app.post("/api/tools/find_inventory")
def find_inventory(req: FindInventoryRequest) -> dict:
    result = tools.find_inventory(req.item_name)
    _log_event("inventory_lookup", {"item_name": req.item_name, "result": result},
               result.get("source_type", "camera_inferred"), result.get("confidence", "medium"))
    return result


@app.post("/api/tools/create_reminder")
def create_reminder(req: CreateReminderRequest) -> dict:
    reminders = storage.load("reminders")
    reminder = {
        "id": next_id("rem", reminders), "kind": "manual", "label": req.label,
        "due_at": req.due_at, "sample_id": req.sample_id, "status": "open", "created_at": now_iso(),
    }
    reminders.append(reminder)
    storage.save("reminders", reminders)
    return reminder


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


@app.post("/api/tools/generate_handoff")
def generate_handoff(req: GenerateHandoffRequest | None = None) -> dict:
    shift = req.shift if req else None
    return tools.generate_handoff(shift)


@app.post("/api/events")
def post_event(req: EventRequest) -> dict:
    return _log_event(req.type, req.payload, req.source_type, req.confidence)
