"""Qwen3 agent via Nebius Token Factory.

Replaces the keyword router in /api/chat with a real reasoning loop:
  user message + live lab context → Qwen picks tool → backend executes → Qwen replies

The agent is grounded: it only states facts it retrieved from tools, never hallucinated ones.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import AsyncOpenAI

from datetime import datetime, timedelta, timezone

from labops_api import storage, tools as lab_tools
from labops_api.names import normalize_equipment_id, normalize_location
from labops_api.storage import next_id, now_iso

# ── Nebius client ─────────────────────────────────────────────────────────────

def _nebius_client() -> AsyncOpenAI | None:
    key = os.getenv("NEBIUS_API_KEY", "").strip()
    if not key:
        return None
    return AsyncOpenAI(
        api_key=key,
        base_url=os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.nebius.com/v1").rstrip("/"),
    )

MODEL = os.getenv("NEBIUS_COMMAND_MODEL", "Qwen3-235B-A22B-Instruct-2507")
CONVERSATIONS: dict[str, list[dict[str, str]]] = {}

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM = """You are LabOps Guardian, an AI coworker for a biotech (cardiovascular tissue) research lab.
You have real-time access to equipment state, incidents, SOPs, inventory, samples, reminders, and operational history through your tools.

Lab layout (static reference — ALWAYS call get_lab_state for live readings; this list just tells you what exists):
- Cold Chain Zone: Freezer (-60 °C, sample C17's home), Backup Freezer, Biosafety Cabinet, CO2 Incubator (37 °C / 5% CO2), Reagent Fridge (4 °C).
- Prep & Imaging: Bench 2 (room temp ~21 °C), Centrifuge 2, Microscope 1, Pipette Station, Inventory Shelf A, Chemical Cabinet 1, Autoclave, Biohazard Waste, a simulated shelf camera/sensor, and the PI / Postdoc station.
- Tracked samples: C17 (cardiovascular tissue, home = Freezer, -60 °C, 20-minute room-temp limit on a bench) and A12 (backup tissue, Backup Freezer).
- Inventory includes: 15 mL tubes (Inventory Shelf A, bin 3, count is camera-inferred), pipette tips (Shelf A, bin 1, low stock), reagent bottles (Chemical Cabinet 1).
- Local SOPs cover: cardiovascular tissue prep, freezer temperature excursion, freezer sample storage, centrifuge setup, centrifuge error code 42, inventory shortage, and reagent calculation policy.

Rules you must always follow:
- NEVER state a temperature, incident ID, sample name/location, count, or any live lab fact unless you retrieved it from a tool in this conversation. The static layout above tells you what exists, NOT its current readings — call a tool for those.
- Call get_lab_state before answering any question about equipment status, incidents, samples, timers, or the overall inventory. It now also returns reminders (active room-temp timers) and experiment_runs.
- For general inventory questions call list_inventory; for a specific item's location or stock call find_inventory.
- To check any reagent math, call validate_calculation. It handles v/v (→ microliters), w/v (→ grams of solid), and stock dilutions (pass stock_percent for C1V1=C2V2). Choose the basis from the wording, report the expected value, and state which basis you assumed.
- To escalate to a person, use send_emergency_message. ALWAYS draft first (confirmed=false), read the draft back, and only send (confirmed=true) after the user explicitly confirms. Never claim a message was sent unless the tool returns status "sent".
- Sample IDs such as C17 and A12 are sample records, not inventory items. Use move_sample or get_lab_state for sample questions.
- Canonical freezer names are "Freezer" and "Backup Freezer". "Freezer A" → "Freezer"; "Freezer B" or "Freezer D" → "Backup Freezer". Equipment can also be referenced casually (e.g. "incubator", "fridge", "hood", "centrifuge") — resolve to the right unit.
- Distinguish confirmed facts from historical context. Say "a prior incident involved X — this may be relevant but the current cause is not confirmed."
- When citing SOP steps say "based on the local SOP".
- Be brief and operational — you are talking to a lab worker, not writing a report.
- Your reply is BOTH spoken aloud and shown on a small screen, so keep it voice-friendly: 1-3 short sentences (or up to 3 brief "- " bullets for a real list). Lead with the answer.
- Do NOT use LaTeX or math notation ($...$, \\frac, etc.), tables, headings (#), or code blocks. Write numbers and units in plain words a voice can read naturally: "20 microliters", "37 degrees Celsius", "0.02 percent", "minus 60". Light markdown (a **bold** key value or short bullets) is fine; no emojis.
- If asked to update something (resolve an incident, add an observation, create a ticket, post a sensor reading), call the right tool and confirm what you did.
- After move_sample, only mention incidents or alarms if the tool result includes open_incidents. If open_incidents is empty, do not speculate about alarms.
- Do not wrap responses in XML tags. Return plain conversational text only.
"""

# ── Tool definitions (OpenAI function-calling format) ─────────────────────────

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_lab_state",
            "description": "Get the current lab state: equipment readings, open incidents, samples, inventory, and tickets.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "move_sample",
            "description": "Move a known sample to a new location and persist the update in the LabOps sample database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sample_id": {"type": "string", "description": "Sample ID, e.g. C17 or A12"},
                    "to_location": {"type": "string", "description": "Destination, e.g. Freezer, Backup Freezer, Bench 2"},
                    "from_location": {"type": "string", "description": "Optional source location if the user stated it."},
                    "from_temperature": {"type": "string", "description": "Optional source temperature, e.g. -60C"},
                    "allowed_room_temp_minutes": {"type": "integer", "description": "Room-temperature limit if moving to bench."},
                },
                "required": ["sample_id", "to_location"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_incidents",
            "description": "List all incidents. Filter by status open/investigating/resolved.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["open", "investigating", "resolved"],
                               "description": "Filter by status. Omit to return all."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "retrieve_sop",
            "description": "Retrieve grounded SOP guidance from local documents. Never invents steps.",
            "parameters": {
                "type": "object",
                "properties": {
                    "issue_type": {"type": "string",
                                   "description": "e.g. temperature_excursion, centrifuge_error, inventory_shortage"},
                    "equipment_id": {"type": "string", "description": "e.g. freezer or backup_freezer"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recall_history",
            "description": "Recall prior incidents for a piece of equipment. Always note that past cause does not confirm current cause.",
            "parameters": {
                "type": "object",
                "properties": {
                    "equipment_id": {"type": "string", "description": "e.g. freezer or backup_freezer"},
                    "issue_type": {"type": "string", "description": "e.g. temperature_excursion"},
                },
                "required": ["equipment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_ticket",
            "description": "Create a maintenance ticket for an open incident and assign it to a team.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {"type": "string", "description": "e.g. LAB-INC-001"},
                    "summary": {"type": "string"},
                    "severity": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "assigned_to": {"type": "string", "description": "e.g. Facilities, Lab Manager"},
                },
                "required": ["incident_id", "severity", "assigned_to"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_observation",
            "description": "Append an observation to an incident log (e.g. door confirmed closed, alarm active).",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {"type": "string"},
                    "observation": {"type": "string"},
                },
                "required": ["incident_id", "observation"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_incident_status",
            "description": "Update the status of an incident to investigating or resolved.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {"type": "string"},
                    "status": {"type": "string", "enum": ["open", "investigating", "resolved"]},
                },
                "required": ["incident_id", "status"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_handoff",
            "description": "Generate a shift handoff summary, optionally focused on a specific incident.",
            "parameters": {
                "type": "object",
                "properties": {
                    "incident_id": {"type": "string", "description": "Focus handoff on this incident."},
                    "shift": {"type": "string", "description": "e.g. night, morning"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_inventory",
            "description": "List all known inventory records with locations, stock levels, counts, confidence, and source metadata.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_inventory",
            "description": "Look up where an item is stored and its current stock level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {"type": "string", "description": "e.g. 15 mL tubes, ethanol"},
                },
                "required": ["item_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "validate_calculation",
            "description": (
                "Check a reagent calculation and show the work with assumptions. Three modes: "
                "percent_volume_volume (v/v → microliters of neat reagent), "
                "percent_weight_volume (w/v → grams of solid, X g per 100 mL), and "
                "stock_dilution (C1V1=C2V2 — pass stock_percent to dilute a stock to target_percent). "
                "Use whenever the user asks you to verify a concentration, dilution, percent, volume, microliter, or gram amount. "
                "Pick calculation_type from the wording (v/v vs w/v); if they mention a stock %, pass stock_percent."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "target_percent": {"type": "number", "description": "Target concentration percent, e.g. 0.02 for 0.02%"},
                    "final_volume_ml": {"type": "number", "description": "Final volume in mL, e.g. 100"},
                    "user_answer_ul": {"type": "number", "description": "Optional: microliters the user calculated (v/v or dilution), to verify."},
                    "user_answer_g": {"type": "number", "description": "Optional: grams the user calculated (w/v), to verify."},
                    "stock_percent": {"type": "number", "description": "Stock concentration percent, when diluting from a stock (enables C1V1=C2V2)."},
                    "calculation_type": {"type": "string", "enum": ["percent_volume_volume", "percent_weight_volume", "stock_dilution"], "description": "Defaults to percent_volume_volume."},
                },
                "required": ["target_percent", "final_volume_ml"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "send_emergency_message",
            "description": (
                "Draft or send an escalation message to a teammate (postdoc, PI, lab manager, facilities). "
                "SAFETY GATE: FIRST call with confirmed=false to create a DRAFT, then read the draft back and ask the user to confirm. "
                "Only call again with confirmed=true AFTER the user explicitly says to send. "
                "Never send without explicit confirmation, and never claim it was sent unless the tool returns status 'sent'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient_role": {"type": "string", "description": "e.g. postdoc, PI, lab manager, facilities"},
                    "message": {"type": "string", "description": "The message body to send."},
                    "confirmed": {"type": "boolean", "description": "false = draft only (default); true = actually send, only after the user confirms."},
                },
                "required": ["recipient_role", "message"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "post_sensor_reading",
            "description": "Log a sensor reading for a piece of equipment. Triggers anomaly detection automatically.",
            "parameters": {
                "type": "object",
                "properties": {
                    "equipment_id": {"type": "string", "description": "e.g. freezer or backup_freezer"},
                    "value": {"type": "number", "description": "The sensor reading value"},
                    "unit": {"type": "string", "description": "e.g. C, RPM, percent"},
                },
                "required": ["equipment_id", "value"],
            },
        },
    },
]

# ── Tool execution ────────────────────────────────────────────────────────────

def _run_tool(name: str, args: dict[str, Any]) -> str:
    try:
        if name == "get_lab_state":
            return json.dumps({
                "equipment": storage.load("equipment"),
                "incidents": storage.load("incidents"),
                "tickets": storage.load("tickets"),
                "samples": storage.load("samples"),
                "inventory": storage.load("inventory"),
                "reminders": storage.load("reminders"),
                "experiment_runs": storage.load("experiment_runs"),
                "server_time": now_iso(),
            })

        if name == "validate_calculation":
            return json.dumps(lab_tools.validate_calculation(
                calculation_type=args.get("calculation_type") or "percent_volume_volume",
                target_percent=args.get("target_percent"),
                final_volume_ml=args.get("final_volume_ml"),
                user_answer_ul=args.get("user_answer_ul"),
                stock_percent=args.get("stock_percent"),
                user_answer_g=args.get("user_answer_g"),
            ))

        if name == "send_emergency_message":
            return json.dumps(lab_tools.send_emergency_message(
                recipient_role=args.get("recipient_role") or "postdoc",
                message=args.get("message") or "",
                confirmed=bool(args.get("confirmed", False)),
            ))

        if name == "get_incidents":
            incidents = storage.load("incidents")
            status_filter = args.get("status")
            if status_filter:
                incidents = [i for i in incidents if i.get("status") == status_filter]
            return json.dumps(incidents)

        if name == "retrieve_sop":
            return json.dumps(lab_tools.retrieve_sop(
                issue_type=args.get("issue_type"),
                equipment_id=normalize_equipment_id(args.get("equipment_id")),
            ))

        if name == "recall_history":
            return json.dumps(lab_tools.recall_history(
                equipment_id=normalize_equipment_id(args["equipment_id"]) or args["equipment_id"],
                issue_type=args.get("issue_type"),
            ))

        if name == "create_ticket":
            return json.dumps(lab_tools.create_ticket(
                incident_id=args["incident_id"],
                severity=args["severity"],
                assigned_to=args["assigned_to"],
                summary=args.get("summary"),
            ))

        if name == "add_observation":
            incidents = storage.load("incidents")
            incident = next((i for i in incidents if i["incident_id"] == args["incident_id"]), None)
            if not incident:
                return json.dumps({"error": f"Incident {args['incident_id']} not found"})
            incident.setdefault("observations", []).append(args["observation"])
            incident["updated_at"] = now_iso()
            storage.save("incidents", incidents)
            return json.dumps({"ok": True, "incident_id": args["incident_id"],
                               "observations": incident["observations"]})

        if name == "update_incident_status":
            incidents = storage.load("incidents")
            incident = next((i for i in incidents if i["incident_id"] == args["incident_id"]), None)
            if not incident:
                return json.dumps({"error": f"Incident {args['incident_id']} not found"})
            incident["status"] = args["status"]
            incident["updated_at"] = now_iso()
            storage.save("incidents", incidents)
            return json.dumps({"ok": True, "incident_id": args["incident_id"], "status": args["status"]})

        if name == "generate_handoff":
            return json.dumps(lab_tools.generate_handoff(
                incident_id=args.get("incident_id"),
                shift=args.get("shift"),
            ))

        if name == "move_sample":
            samples = storage.load("samples")
            sample_id = str(args["sample_id"]).upper().replace(" ", "")
            sample = next((s for s in samples if s.get("sample_id", "").upper() == sample_id), None)
            if not sample:
                return json.dumps({"error": f"Sample {sample_id} not found in sample records."})

            from_location = normalize_location(args.get("from_location")) or sample.get("location")
            to_location = normalize_location(args["to_location"]) or args["to_location"]
            allowed_minutes = int(args.get("allowed_room_temp_minutes") or sample.get("max_room_temp_minutes") or 20)

            sample["location"] = to_location
            sample["source_type"] = "user_reported"
            sample["confidence"] = "medium"
            sample["updated_at"] = now_iso()

            reminders_created: list[dict[str, Any]] = []
            if any(k in to_location.lower() for k in ("bench", "room", "table", "counter")):
                started = datetime.now(timezone.utc)
                deadline = started + timedelta(minutes=allowed_minutes)
                sample["room_temp_started_at"] = started.isoformat(timespec="seconds")
                sample["room_temp_deadline"] = deadline.isoformat(timespec="seconds")

                reminders = storage.load("reminders")
                warning = {
                    "id": next_id("rem", reminders),
                    "kind": "warning",
                    "sample_id": sample_id,
                    "label": f"{sample_id} nearing room-temp limit ({allowed_minutes - 2} min)",
                    "due_at": (deadline - timedelta(minutes=2)).isoformat(timespec="seconds"),
                    "status": "open",
                    "created_at": now_iso(),
                }
                reminders.append(warning)
                escalation = {
                    "id": next_id("rem", reminders),
                    "kind": "escalation",
                    "sample_id": sample_id,
                    "label": f"{sample_id} hit the {allowed_minutes}-min room-temp limit",
                    "due_at": deadline.isoformat(timespec="seconds"),
                    "status": "open",
                    "created_at": now_iso(),
                }
                reminders.append(escalation)
                storage.save("reminders", reminders)
                reminders_created = [warning, escalation]
            else:
                sample["room_temp_started_at"] = None
                sample["room_temp_deadline"] = None

            storage.save("samples", samples)

            events = storage.load("events")
            event = {
                "id": next_id("evt", events),
                "type": "sample_moved",
                "payload": {
                    "sample_id": sample_id,
                    "from": from_location,
                    "to": to_location,
                    "from_temperature": args.get("from_temperature"),
                    "allowed_room_temp_minutes": allowed_minutes,
                },
                "source_type": "user_reported",
                "confidence": "medium",
                "timestamp": now_iso(),
            }
            events.append(event)
            storage.save("events", events)

            destination_equipment_id = normalize_equipment_id(to_location)
            open_incidents = [
                i for i in storage.load("incidents")
                if i.get("status") != "resolved" and i.get("equipment_id") == destination_equipment_id
            ]
            destination_equipment = next(
                (e for e in storage.load("equipment") if e.get("id") == destination_equipment_id),
                None,
            )

            return json.dumps({
                "sample": sample,
                "reminders": reminders_created,
                "event": event,
                "destination_equipment": destination_equipment,
                "open_incidents": open_incidents,
            })

        if name == "list_inventory":
            return json.dumps(storage.load("inventory"))

        if name == "find_inventory":
            return json.dumps(lab_tools.find_inventory(args["item_name"]))

        if name == "post_sensor_reading":
            equipment_list = storage.load("equipment")
            equipment_id = normalize_equipment_id(args["equipment_id"]) or args["equipment_id"]
            eq = next((e for e in equipment_list if e["id"] == equipment_id), None)
            if not eq:
                return json.dumps({"error": f"Equipment {equipment_id} not found"})
            unit = args.get("unit", "C")
            value = args["value"]
            eq["current_temperature"] = f"{value}{unit}"
            eq["updated_at"] = now_iso()
            normal_range = eq.get("normal_range")
            incident_result = None
            if normal_range and (value > normal_range["max"] or value < normal_range["min"]):
                eq["status"] = "alarm"
                from labops_api.app import _severity_from_exceedance, _process_sensor_event
                from labops_api.models import EventRequest
                req = EventRequest(type="temperature_reading", equipment_id=equipment_id,
                                   value=value, unit=unit)
                incident_result = _process_sensor_event(req)
            else:
                eq["status"] = "ok"
                storage.save("equipment", equipment_list)
            return json.dumps({"ok": True, "equipment_id": equipment_id,
                               "reading": f"{value}{unit}", "incident": incident_result})

        return json.dumps({"error": f"Unknown tool: {name}"})

    except Exception as exc:
        return json.dumps({"error": str(exc)})


def _strip_think(text: str) -> str:
    """Remove Qwen3 chain-of-thought <think>...</think> blocks from the reply."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


# ── Main agent call ───────────────────────────────────────────────────────────

async def run(message: str, sender: str = "user") -> str:
    """Run the Qwen agent on a user message. Returns the final text reply."""
    client = _nebius_client()
    if not client:
        return "Nebius is not configured (NEBIUS_API_KEY missing)."

    history = CONVERSATIONS.get(sender, [])[-8:]
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM},
        *history,
        {"role": "user", "content": message},
    ]

    for _ in range(6):  # max tool-call iterations
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )
        choice = response.choices[0]

        # Append assistant turn
        messages.append(choice.message.model_dump(exclude_none=True))

        if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
            for tc in choice.message.tool_calls:
                args = json.loads(tc.function.arguments or "{}")
                result = _run_tool(tc.function.name, args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            # Final text reply — strip any Qwen3 thinking blocks
            reply = _strip_think(choice.message.content or "I could not complete that.")
            CONVERSATIONS[sender] = [
                *history,
                {"role": "user", "content": message},
                {"role": "assistant", "content": reply},
            ][-8:]
            return reply

    reply = "I reached the tool call limit. Please try a simpler request."
    CONVERSATIONS[sender] = [
        *history,
        {"role": "user", "content": message},
        {"role": "assistant", "content": reply},
    ][-8:]
    return reply
