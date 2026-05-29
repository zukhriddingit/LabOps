"""Custom actions for LabOps Guardian.

Principle (Rasa playbook): flows own the *conversation logic*; actions do the *raw work*
and hand results back as slots for the flow to branch on. Here the "raw work" is an HTTP
call to the LabOps API. If the API is down, every action sets `labops_available = False`
so flows can fall back gracefully instead of crashing.

Truth-state language: actions surface the backend's `source_type` / `confidence` into slots
so the agent can say "based on the local SOP", "camera-inferred, confidence medium", etc.
"""

from __future__ import annotations

from typing import Any, Dict, List, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

from actions import labops_client as api


def _unavailable() -> List[Dict[Text, Any]]:
    return [SlotSet("labops_available", False)]


class ActionMoveSample(Action):
    def name(self) -> Text:
        return "action_move_sample"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        sample_id = (tracker.get_slot("sample_id") or "").upper().replace(" ", "")
        payload = {
            "from_location": tracker.get_slot("from_location"),
            "to_location": tracker.get_slot("to_location"),
            "from_temperature": tracker.get_slot("from_temperature"),
            "allowed_room_temp_minutes": int(tracker.get_slot("allowed_room_temp_minutes") or 20),
        }
        try:
            result = api.move_sample(sample_id, payload)
        except api.LabOpsUnavailable:
            return _unavailable()
        sample = result.get("sample", {})
        reminders = result.get("reminders", [])
        return [
            SlotSet("labops_available", True),
            SlotSet("sample_id", sample.get("sample_id", sample_id)),
            SlotSet("room_temp_deadline", sample.get("room_temp_deadline")),
            SlotSet("reminder_count", len(reminders)),
        ]


class ActionValidateLabCalculation(Action):
    def name(self) -> Text:
        return "action_validate_lab_calculation"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        payload = {
            "calculation_type": tracker.get_slot("calculation_type") or "percent_volume_volume",
            "target_percent": tracker.get_slot("target_percent"),
            "final_volume_ml": tracker.get_slot("final_volume_ml"),
            "user_answer_ul": tracker.get_slot("user_answer_ul"),
        }
        try:
            r = api.validate_calculation(payload)
        except api.LabOpsUnavailable:
            return _unavailable()
        assumptions = "; ".join(r.get("assumptions", []))
        return [
            SlotSet("labops_available", True),
            SlotSet("calc_status", r.get("status")),
            SlotSet("calc_expected_ul", r.get("expected_ul")),
            SlotSet("calc_formula", r.get("formula")),
            SlotSet("calc_assumptions", assumptions),
            SlotSet("calc_warning", r.get("warning")),
        ]


class ActionRetrieveLabSop(Action):
    def name(self) -> Text:
        return "action_retrieve_lab_sop"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        payload = {"query": tracker.get_slot("sop_query") or "",
                   "sample_id": tracker.get_slot("sample_id")}
        try:
            r = api.retrieve_sop(payload)
        except api.LabOpsUnavailable:
            return _unavailable()
        if not r.get("found"):
            return [SlotSet("labops_available", True), SlotSet("sop_found", False)]
        return [
            SlotSet("labops_available", True),
            SlotSet("sop_found", True),
            SlotSet("sop_title", r.get("title")),
            SlotSet("sop_checklist", "; ".join(r.get("checklist", []))),
            SlotSet("sop_missing", "; ".join(r.get("missing_fields", []))),
            SlotSet("sop_caution", r.get("caution")),
        ]


class ActionFindInventory(Action):
    def name(self) -> Text:
        return "action_find_inventory"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            r = api.find_inventory({"item_name": tracker.get_slot("inventory_item") or ""})
        except api.LabOpsUnavailable:
            return _unavailable()
        if not r.get("found"):
            return [SlotSet("labops_available", True), SlotSet("inventory_found", False)]
        return [
            SlotSet("labops_available", True),
            SlotSet("inventory_found", True),
            SlotSet("inventory_location", r.get("location")),
            SlotSet("inventory_confidence", r.get("confidence")),
            SlotSet("inventory_source", r.get("source_type")),
            SlotSet("inventory_camera_count", r.get("camera_inferred_count")),
        ]


class ActionCreateLabReminder(Action):
    def name(self) -> Text:
        return "action_create_lab_reminder"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        payload = {
            "label": tracker.get_slot("reminder_label") or "Lab reminder",
            "due_at": tracker.get_slot("reminder_due_at") or "",
            "sample_id": tracker.get_slot("sample_id"),
        }
        try:
            api.create_reminder(payload)
        except api.LabOpsUnavailable:
            return _unavailable()
        return [SlotSet("labops_available", True)]


class ActionSendEmergencyMessage(Action):
    def name(self) -> Text:
        return "action_send_emergency_message"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        payload = {
            "recipient_role": tracker.get_slot("recipient_role") or "postdoc",
            "message": tracker.get_slot("emergency_message") or "",
            "confirmed": bool(tracker.get_slot("message_confirmed")),
        }
        try:
            r = api.send_emergency_message(payload)
        except api.LabOpsUnavailable:
            return _unavailable()
        return [SlotSet("labops_available", True), SlotSet("message_status", r.get("status"))]


class ActionGenerateLabHandoff(Action):
    def name(self) -> Text:
        return "action_generate_lab_handoff"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            r = api.generate_handoff({"shift": tracker.get_slot("shift")})
        except api.LabOpsUnavailable:
            return _unavailable()
        samples = r.get("current_sample_status", [])
        status_lines = [f"{s['sample_id']} on {s['location']}" for s in samples]
        risks = "; ".join(r.get("unresolved_risks", []))
        return [
            SlotSet("labops_available", True),
            SlotSet("handoff_summary", " · ".join(status_lines)),
            SlotSet("handoff_risks", risks),
            SlotSet("handoff_uncertainty", r.get("uncertainty_note")),
            SlotSet("handoff_move_count", len(r.get("sample_movements", []))),
        ]


class ActionGetLabState(Action):
    def name(self) -> Text:
        return "action_get_lab_state"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        try:
            state = api.get_state()
        except api.LabOpsUnavailable:
            return _unavailable()
        return [
            SlotSet("labops_available", True),
            SlotSet("open_reminder_count",
                    len([r for r in state.get("reminders", []) if r.get("status") == "open"])),
        ]
