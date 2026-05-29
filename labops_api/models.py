"""Pydantic models for LabOps Guardian.

Every stored fact carries a `source_type` + `confidence` (the "truth state" system from
shared/api_contract.md) so the agent never presents a guess as a confirmed fact.
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


# ── Stored objects ────────────────────────────────────────────────────────────
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


class Equipment(BaseModel):
    id: str
    name: str
    kind: str
    current_temperature: Optional[str] = None
    status: str = "ok"
    source_type: SourceType = "observed_by_sensor"
    confidence: Confidence = "high"
    updated_at: Optional[str] = None


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


class RetrieveSopRequest(BaseModel):
    query: str
    sample_id: Optional[str] = None


class FindInventoryRequest(BaseModel):
    item_name: str


class CreateReminderRequest(BaseModel):
    label: str
    due_at: str
    sample_id: Optional[str] = None


class SendEmergencyMessageRequest(BaseModel):
    recipient_role: str
    message: str
    confirmed: bool = False


class GenerateHandoffRequest(BaseModel):
    shift: Optional[str] = None


class EventRequest(BaseModel):
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)
    source_type: SourceType = "user_reported"
    confidence: Confidence = "medium"
