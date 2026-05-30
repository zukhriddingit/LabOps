from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Text

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

try:
    from .labops_client import LabOpsClient
except ImportError:
    from labops_client import LabOpsClient


client = LabOpsClient()


def slot(tracker: Tracker, name: str) -> Optional[Any]:
    value = tracker.get_slot(name)
    if value in ("", "None"):
        return None
    return value


def text(tracker: Tracker) -> str:
    return tracker.latest_message.get("text", "") or ""


def first_entity(tracker: Tracker, entity: str) -> Optional[Any]:
    for item in tracker.latest_message.get("entities", []):
        if item.get("entity") == entity:
            return item.get("value")
    return None


def value(tracker: Tracker, name: str) -> Optional[Any]:
    return first_entity(tracker, name) or slot(tracker, name)


def as_float(raw: Any) -> Optional[float]:
    if raw is None:
        return None
    match = re.search(r"-?\d+(?:\.\d+)?", str(raw))
    return float(match.group(0)) if match else None


def as_int(raw: Any) -> Optional[int]:
    number = as_float(raw)
    return int(number) if number is not None else None


def normalize_temperature(raw: Any) -> Optional[str]:
    if raw is None:
        return None
    raw_text = str(raw).strip()
    number = as_float(raw_text)
    if number is None:
        return raw_text
    if re.search(r"minus|-", raw_text, re.I):
        number = -abs(number)
    return f"{int(number) if number.is_integer() else number}C"


def display(result: Dict[str, Any], *keys: str) -> Optional[str]:
    for key in keys:
        value = result.get(key)
        if value:
            return str(value)
    return None


def backend_error(dispatcher: CollectingDispatcher, result: Dict[str, Any]) -> bool:
    if result.get("ok", True):
        return False
    dispatcher.utter_message(text=result.get("user_message") or f"I could not complete that through the LabOps tool server: {result.get('error')}")
    return True


class ActionMoveSample(Action):
    def name(self) -> Text:
        return "action_move_sample"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        sample_id = value(tracker, "sample_id")
        to_location = value(tracker, "to_location")
        from_location = value(tracker, "from_location")
        temperature = normalize_temperature(value(tracker, "temperature"))
        duration = as_int(value(tracker, "duration_minutes"))

        if not sample_id or not to_location:
            dispatcher.utter_message(text="I can log the movement, but I need the sample ID and destination location first.")
            return []

        if not from_location:
            sample = client.get_sample(str(sample_id))
            if sample.get("ok"):
                from_location = sample.get("location") or sample.get("current_location") or sample.get("latest_location")
            from_location = from_location or "Freezer B"

        payload = {
            "from_location": from_location,
            "to_location": to_location,
            "from_temperature": temperature or "-60C",
            "allowed_room_temp_minutes": duration,
            "source_type": "user_reported",
            "confidence": "medium",
        }
        result = client.move_sample(str(sample_id), payload)
        if backend_error(dispatcher, result):
            return []

        warning = result.get("warning_minutes") or (duration - 2 if duration and duration >= 2 else None)
        escalation = result.get("escalation_minutes") or duration
        if warning and escalation:
            dispatcher.utter_message(
                text=f"Logged as user-reported. {sample_id} moved from {from_location} to {to_location}. I'll alert you at {warning} minutes and escalate at {escalation}."
            )
        else:
            dispatcher.utter_message(text=f"Logged as user-reported. {sample_id} moved from {from_location} to {to_location}.")
        return [
            SlotSet("sample_id", sample_id),
            SlotSet("from_location", from_location),
            SlotSet("to_location", to_location),
            SlotSet("temperature", temperature),
            SlotSet("duration_minutes", duration),
        ]


class ActionValidateLabCalculation(Action):
    def name(self) -> Text:
        return "action_validate_lab_calculation"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        target_percent = as_float(value(tracker, "target_percent"))
        final_volume_ml = as_float(value(tracker, "final_volume_ml"))
        user_answer_ul = as_float(value(tracker, "user_answer_ul"))
        calculation_type = value(tracker, "calculation_type") or "percent_volume_volume"

        if not target_percent or not final_volume_ml or user_answer_ul is None:
            dispatcher.utter_message(text="I can check this, but I need the target percent, final volume, and your answer in microliters.")
            return []

        payload = {
            "calculation_type": calculation_type,
            "target_percent": target_percent,
            "final_volume_ml": final_volume_ml,
            "user_answer_ul": user_answer_ul,
        }
        result = client.validate_calculation(payload)
        if backend_error(dispatcher, result):
            return []

        response = display(result, "response", "message", "summary")
        if response:
            dispatcher.utter_message(text=response)
        else:
            correct_ul = target_percent / 100 * final_volume_ml * 1000
            if abs(correct_ul - user_answer_ul) < 0.01:
                dispatcher.utter_message(
                    text=(
                        f"Yes, assuming v/v and {final_volume_ml:g} mL final volume, this is correct. "
                        f"{target_percent:g} / 100 * {final_volume_ml:g} mL = {correct_ul / 1000:g} mL = {correct_ul:g} uL. "
                        "If this is w/v or stock-based, I need more information."
                    )
                )
            else:
                dispatcher.utter_message(
                    text=(
                        f"Calculated assuming v/v, I get {correct_ul:g} uL, not {user_answer_ul:g} uL. "
                        "If this is w/v or stock-based, I need the stock concentration or mass basis."
                    )
                )
        return [
            SlotSet("calculation_type", calculation_type),
            SlotSet("target_percent", target_percent),
            SlotSet("final_volume_ml", final_volume_ml),
            SlotSet("user_answer_ul", user_answer_ul),
        ]


class ActionFindInventory(Action):
    def name(self) -> Text:
        return "action_find_inventory"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        item_name = value(tracker, "item_name")
        if not item_name:
            dispatcher.utter_message(text="What inventory item should I look up?")
            return []

        result = client.find_inventory({"item_name": item_name})
        if backend_error(dispatcher, result):
            return []
        response = display(result, "response", "message", "summary")
        location = result.get("location")
        camera = result.get("camera_inference") or result.get("camera_summary")
        confidence = result.get("camera_confidence") or result.get("confidence")
        if response:
            dispatcher.utter_message(text=response)
        elif location:
            suffix = f" Camera inference shows {camera}, confidence {confidence}." if camera else ""
            dispatcher.utter_message(text=f"The inventory record says {item_name} are on {location}.{suffix}")
        else:
            dispatcher.utter_message(text=f"I did not find a current inventory record for {item_name}.")
        return [SlotSet("item_name", item_name)]


class ActionRetrieveLabSop(Action):
    def name(self) -> Text:
        return "action_retrieve_lab_sop"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        query = value(tracker, "sop_query") or value(tracker, "equipment_name") or text(tracker)
        sample_id = value(tracker, "sample_id")
        payload = {"query": query, "sample_id": sample_id}
        result = client.retrieve_sop(payload)
        if backend_error(dispatcher, result):
            return []

        if result.get("requires_clarification"):
            dispatcher.utter_message(text=result.get("message") or "I found the matching SOP, but I need one more detail before giving the setup checklist.")
        else:
            response = display(result, "response", "answer", "summary", "message")
            if response:
                dispatcher.utter_message(text=f"Based on the local SOP, {response}")
            else:
                dispatcher.utter_message(text="I could not find a local SOP match. I won't invent a protocol.")
        return [SlotSet("sop_query", query), SlotSet("sample_id", sample_id)]


class ActionDraftEmergencyMessage(Action):
    def name(self) -> Text:
        return "action_draft_emergency_message"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        recipient = value(tracker, "recipient_role") or "postdoc"
        drafted = value(tracker, "message_text") or slot(tracker, "emergency_message")
        if not drafted:
            sample_id = value(tracker, "sample_id") or "C17"
            location = value(tracker, "to_location") or "Bench 2"
            drafted = f"Sample {sample_id} is near the room-temperature limit on {location}. Assistance needed before the limit is reached."
        dispatcher.utter_message(text=f"Drafting emergency message to {recipient}: '{drafted}' Confirm send?")
        return [
            SlotSet("recipient_role", recipient),
            SlotSet("emergency_message", drafted),
            SlotSet("emergency_message_pending", True),
        ]


class ActionSendEmergencyMessage(Action):
    def name(self) -> Text:
        return "action_send_emergency_message"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        if not slot(tracker, "emergency_message_pending"):
            dispatcher.utter_message(text="I do not have an emergency message pending confirmation.")
            return []
        recipient = slot(tracker, "recipient_role") or "postdoc"
        message = slot(tracker, "emergency_message")
        result = client.draft_or_send_emergency_message({"recipient_role": recipient, "message": message, "confirmed": True})
        if backend_error(dispatcher, result):
            return []

        sent = result.get("sent", True) or result.get("status") == "sent"
        if sent:
            dispatcher.utter_message(text=f"Sent to {recipient}.")
            return [SlotSet("emergency_message_pending", False), SlotSet("emergency_message", None)]
        dispatcher.utter_message(text="The LabOps tool server did not confirm sending, so I am treating this as not sent.")
        return []


class ActionCancelEmergencyMessage(Action):
    def name(self) -> Text:
        return "action_cancel_emergency_message"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        dispatcher.utter_message(text="Cancelled. I did not send the emergency message.")
        return [SlotSet("emergency_message_pending", False), SlotSet("emergency_message", None)]


class ActionGenerateLabHandoff(Action):
    def name(self) -> Text:
        return "action_generate_lab_handoff"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        shift = value(tracker, "shift") or "night"
        result = client.generate_handoff({"shift": shift, "date": value(tracker, "date")})
        if backend_error(dispatcher, result):
            return []
        response = display(result, "handoff", "response", "summary", "message")
        dispatcher.utter_message(text=response or f"{str(shift).title()} shift handoff is not available yet from the LabOps tool server.")
        return [SlotSet("shift", shift)]


class ActionGetLabState(Action):
    def name(self) -> Text:
        return "action_get_lab_state"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        sample_id = value(tracker, "sample_id")
        if sample_id:
            sample = client.get_sample(str(sample_id))
            if backend_error(dispatcher, sample):
                return []
            location = sample.get("location") or sample.get("current_location") or sample.get("latest_location") or "unknown"
            source_type = sample.get("source_type") or "user_reported"
            confidence = sample.get("confidence") or "medium"
            dispatcher.utter_message(
                text=f"The latest recorded location for {sample_id} is {location}. Source: {source_type}, confidence {confidence}."
            )
            return [SlotSet("sample_id", sample_id)]

        result = client.get_state()
        if backend_error(dispatcher, result):
            return []
        response = display(result, "response", "summary", "message")
        if response:
            dispatcher.utter_message(text=response)
        else:
            active = result.get("active_samples") or result.get("samples") or []
            reminders = result.get("active_reminders") or result.get("reminders") or []
            dispatcher.utter_message(text=f"Latest lab state from the database: {len(active)} sample records and {len(reminders)} active reminders.")
        return []


class ActionLogDailyActivity(Action):
    def name(self) -> Text:
        return "action_log_daily_activity"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        person = value(tracker, "person_name")
        sample_id = value(tracker, "sample_id")
        if not person:
            dispatcher.utter_message(text="Who should I log this activity for?")
            return []
        description = text(tracker)
        event_type = "sample_preparation" if sample_id and re.search(r"prepared|prep", description, re.I) else "lab_activity"
        payload = {
            "person_name": person,
            "event_type": event_type,
            "sample_id": sample_id,
            "description": f"{person} prepared Sample {sample_id}" if event_type == "sample_preparation" else description,
            "source_type": "user_reported",
            "confidence": "medium",
        }
        result = client.log_activity_event(payload)
        if backend_error(dispatcher, result):
            return []
        if sample_id:
            dispatcher.utter_message(text=f"Logged as user-reported: {person} prepared Sample {sample_id} today.")
        else:
            dispatcher.utter_message(text=f"Logged as user-reported: {person}'s activity today.")
        return [SlotSet("person_name", person), SlotSet("sample_id", sample_id)]


class ActionGetPersonDailyActivity(Action):
    def name(self) -> Text:
        return "action_get_person_daily_activity"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        person = value(tracker, "person_name")
        if not person:
            dispatcher.utter_message(text="Whose daily activity should I check?")
            return []
        result = client.get_person_daily_activity(str(person))
        if backend_error(dispatcher, result):
            return []
        response = display(result, "response", "summary", "message")
        if response:
            dispatcher.utter_message(text=response)
        else:
            activities = result.get("activities") or result.get("events") or []
            if not activities:
                dispatcher.utter_message(text=f"I do not see activity recorded for {person} today.")
            else:
                descriptions = [item.get("description", str(item)) for item in activities[:5]]
                dispatcher.utter_message(text=f"Today, {person} worked on: {', '.join(descriptions)}.")
        return [SlotSet("person_name", person)]


class ActionCreateLabReminder(Action):
    def name(self) -> Text:
        return "action_create_lab_reminder"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        duration = as_int(value(tracker, "duration_minutes"))
        sample_id = value(tracker, "sample_id")
        message = value(tracker, "message_text") or text(tracker)
        if not duration:
            dispatcher.utter_message(text="How many minutes from now should I set the reminder?")
            return []
        payload = {
            "sample_id": sample_id,
            "duration_minutes": duration,
            "message": message,
            "source_type": "user_reported",
            "confidence": "medium",
        }
        result = client.create_reminder(payload)
        if backend_error(dispatcher, result):
            return []
        dispatcher.utter_message(text=display(result, "response", "message") or f"Reminder created as user-reported for {duration} minutes from now.")
        return [SlotSet("duration_minutes", duration), SlotSet("sample_id", sample_id)]


class ActionRecallHistory(Action):
    def name(self) -> Text:
        return "action_recall_history"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        equipment_id = value(tracker, "equipment_id") or value(tracker, "equipment_name")
        issue_type = value(tracker, "issue_type")
        if not equipment_id:
            dispatcher.utter_message(text="Which piece of equipment should I check history for?")
            return []

        result = client.recall_history({"equipment_id": equipment_id, "issue_type": issue_type})
        if backend_error(dispatcher, result):
            return []

        if not result.get("found"):
            dispatcher.utter_message(text=f"No prior incidents found for {equipment_id}.")
            return []

        events = result.get("related_events", [])
        parts = []
        for e in events[:2]:
            parts.append(e.get("summary", ""))
            if e.get("recorded_cause"):
                parts.append(f"Recorded cause: {e['recorded_cause']}.")
            if e.get("resolution"):
                parts.append(f"Resolution: {e['resolution']}.")

        note = result.get("uncertainty_note", "")
        dispatcher.utter_message(text=" ".join(parts) + (f" Note: {note}" if note else ""))
        return [SlotSet("equipment_id", equipment_id), SlotSet("issue_type", issue_type)]


class ActionCreateMaintenanceTicket(Action):
    def name(self) -> Text:
        return "action_create_maintenance_ticket"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        incident_id = value(tracker, "incident_id")
        if not incident_id:
            # Try to find the latest open incident
            incidents = client.get_incidents()
            if isinstance(incidents, list):
                open_inc = [i for i in incidents if i.get("status") == "open"]
                if open_inc:
                    incident_id = open_inc[-1]["incident_id"]
            if not incident_id:
                dispatcher.utter_message(text="I need an incident ID to create a maintenance ticket. Is there an open incident?")
                return []

        equipment_id = value(tracker, "equipment_id") or "unknown equipment"
        payload = {
            "incident_id": incident_id,
            "summary": f"Maintenance required for {equipment_id}: {incident_id}",
            "severity": "high",
            "assigned_to": "Facilities",
        }
        result = client.create_ticket(payload)
        if backend_error(dispatcher, result):
            return []

        ticket_id = result.get("ticket_id", "unknown")
        dispatcher.utter_message(
            text=f"Maintenance ticket {ticket_id} created and assigned to Facilities for incident {incident_id}."
        )
        return [SlotSet("incident_id", incident_id)]


class ActionGetOpenIncidents(Action):
    def name(self) -> Text:
        return "action_get_open_incidents"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        result = client.get_incidents()
        if isinstance(result, dict) and not result.get("ok", True):
            backend_error(dispatcher, result)
            return []

        incidents = result if isinstance(result, list) else result.get("data", [])
        open_incidents = [i for i in incidents if i.get("status") == "open"]

        if not open_incidents:
            dispatcher.utter_message(text="No open incidents right now.")
            return []

        parts = []
        for inc in open_incidents[:3]:
            parts.append(
                f"{inc['incident_id']}: {inc['type'].replace('_', ' ')} on {inc['equipment_id']} "
                f"(severity: {inc['severity']}, current: {inc.get('current_value', 'unknown')})"
            )
        dispatcher.utter_message(text="Open incidents: " + "; ".join(parts) + ".")
        return []
