"""Pydantic models for LabOps Guardian.

Every stored fact carries a `source_type` + `confidence` (truth-state system) so the
agent never presents a camera-guess or hypothesis as a confirmed fact.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

SourceType = Literal[
    "observed_by_sensor",
    "user_reported",
    "sop_grounded",
    "calculated",
    "camera_inferred",
    "pending_confirmation",
    "human_confirmed",
    "stale",
]
Confidence = Literal["high", "medium", "low"]
Severity = Literal["low", "medium", "high", "critical"]


# ── Core stored objects ───────────────────────────────────────────────────────

class NormalRange(BaseModel):
    min: float
    max: float
    unit: str = "C"


class Equipment(BaseModel):
    id: str
    name: str
    kind: str
    current_temperature: Optional[str] = None
    status: str = "ok"                         # ok | alarm | error | idle
    normal_range: Optional[NormalRange] = None
    source_type: SourceType = "observed_by_sensor"
    confidence: Confidence = "high"
    updated_at: Optional[str] = None


class Sample(BaseModel):
    sample_id: str
    name: str
    location: str
    storage_temperature: str
    max_room_temp_minutes: int = 20
    room_temp_started_at: Optional[str] = None
    room_temp_deadline: Optional[str] = None
    source_type: SourceType = "user_reported"
    confidence: Confidence = "medium"
    updated_at: Optional[str] = None


class Incident(BaseModel):
    incident_id: str
    type: str                                  # temperature_excursion | centrifuge_error | ...
    equipment_id: str
    severity: Severity = "high"
    status: Literal["open", "investigating", "resolved"] = "open"
    current_value: Optional[str] = None
    threshold: Optional[str] = None
    observations: list[str] = Field(default_factory=list)
    tickets: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: Optional[str] = None


class Ticket(BaseModel):
    ticket_id: str
    incident_id: str
    summary: Optional[str] = None
    severity: str
    assigned_to: str
    status: str = "open"
    notes: Optional[str] = None
    created_at: str


class PriorEvent(BaseModel):
    id: str
    equipment_id: str
    issue_type: str
    timestamp: str
    summary: Optional[str] = None
    recorded_cause: Optional[str] = None
    resolution: Optional[str] = None
    duration_hours: Optional[float] = None
    source_type: SourceType = "human_confirmed"
    confidence: Confidence = "high"


class InventoryItem(BaseModel):
    item_name: str
    location: str
    bin: Optional[str] = None
    record_count: Optional[int] = None
    camera_inferred_count: Optional[int] = None
    stock_level: str = "ok"
    confidence: Confidence = "medium"
    source_type: SourceType = "camera_inferred"
    timestamp: Optional[str] = None


class Reminder(BaseModel):
    id: str
    label: str
    due_at: str
    sample_id: Optional[str] = None
    kind: Literal["warning", "escalation", "manual"] = "manual"
    status: Literal["open", "done", "cancelled"] = "open"
    created_at: Optional[str] = None


class Event(BaseModel):
    id: str
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    source_type: SourceType = "user_reported"
    confidence: Confidence = "medium"
    timestamp: Optional[str] = None


class Message(BaseModel):
    id: str
    recipient_role: str
    message: str
    status: Literal["draft", "sent"] = "draft"
    source_type: SourceType = "pending_confirmation"
    timestamp: Optional[str] = None


class ExperimentRun(BaseModel):
    id: str
    title: str
    started_at: str
    sample_ids: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    status: str = "in_progress"


# ── Request bodies ────────────────────────────────────────────────────────────

class EventRequest(BaseModel):
    type: str
    equipment_id: Optional[str] = None
    value: Optional[float] = None
    unit: str = "C"
    payload: dict[str, Any] = Field(default_factory=dict)
    source_type: SourceType = "observed_by_sensor"
    confidence: Confidence = "high"
    timestamp: Optional[str] = None


class RetrieveSopRequest(BaseModel):
    issue_type: Optional[str] = None
    equipment_id: Optional[str] = None
    query: Optional[str] = None          # fallback free-text search
    sample_id: Optional[str] = None


class CreateTicketRequest(BaseModel):
    incident_id: str
    summary: Optional[str] = None
    severity: str = "high"
    assigned_to: str = "Facilities"
    notes: Optional[str] = None


class RecallHistoryRequest(BaseModel):
    equipment_id: str
    issue_type: Optional[str] = None


class CreateIncidentRequest(BaseModel):
    type: str
    equipment_id: str
    severity: Severity = "high"
    current_value: Optional[str] = None
    threshold: Optional[str] = None


class AddObservationRequest(BaseModel):
    observation: str


class MoveSampleRequest(BaseModel):
    from_location: Optional[str] = None
    to_location: str
    from_temperature: Optional[str] = None
    allowed_room_temp_minutes: int = 20


class ValidateCalculationRequest(BaseModel):
    calculation_type: str = "percent_volume_volume"
    target_percent: Optional[float] = None
    final_volume_ml: Optional[float] = None
    user_answer_ul: Optional[float] = None
    stock_percent: Optional[float] = None
    user_answer_g: Optional[float] = None


class FindInventoryRequest(BaseModel):
    item_name: str


class CreateReminderRequest(BaseModel):
    # Either the explicit label+due_at form, or the Rasa duration_minutes+message form
    label: Optional[str] = None
    due_at: Optional[str] = None
    sample_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    message: Optional[str] = None


class LogActivityEventRequest(BaseModel):
    person_name: str
    event_type: str = "lab_activity"
    sample_id: Optional[str] = None
    description: Optional[str] = None
    source_type: SourceType = "user_reported"
    confidence: Confidence = "medium"


class SendEmergencyMessageRequest(BaseModel):
    recipient_role: str
    message: str
    confirmed: bool = False


class GenerateHandoffRequest(BaseModel):
    incident_id: Optional[str] = None
    shift: Optional[str] = None
