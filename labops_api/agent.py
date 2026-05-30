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

from labops_api import storage, tools as lab_tools
from labops_api.storage import now_iso

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

# ── System prompt ─────────────────────────────────────────────────────────────

SYSTEM = """You are LabOps Guardian, an AI coworker for a biotech research lab.
You have real-time access to equipment state, incidents, SOPs, inventory, and operational history through your tools.

Rules you must always follow:
- NEVER state a temperature, incident ID, sample name, location, or any lab fact unless you retrieved it from a tool in this conversation. If you have not called a tool yet, you do not know the current state.
- Call get_lab_state before answering any question about equipment, incidents, or samples.
- Distinguish confirmed facts from historical context. Say "a prior incident involved X — this may be relevant but the current cause is not confirmed."
- When citing SOP steps say "based on the local SOP".
- Be brief and operational — you are talking to a lab worker, not writing a report.
- If asked to update something (resolve an incident, add an observation, create a ticket), call the right tool and confirm what you did.
- Do not wrap responses in XML tags. Return plain conversational text only.
"""

# ── Tool definitions (OpenAI function-calling format) ─────────────────────────

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_lab_state",
            "description": "Get the current lab state: equipment readings, open incidents, samples, and tickets.",
            "parameters": {"type": "object", "properties": {}, "required": []},
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
                    "equipment_id": {"type": "string", "description": "e.g. freezer_b"},
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
                    "equipment_id": {"type": "string", "description": "e.g. freezer_b"},
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
            "name": "post_sensor_reading",
            "description": "Log a sensor reading for a piece of equipment. Triggers anomaly detection automatically.",
            "parameters": {
                "type": "object",
                "properties": {
                    "equipment_id": {"type": "string", "description": "e.g. freezer_b"},
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
                "server_time": now_iso(),
            })

        if name == "get_incidents":
            incidents = storage.load("incidents")
            status_filter = args.get("status")
            if status_filter:
                incidents = [i for i in incidents if i.get("status") == status_filter]
            return json.dumps(incidents)

        if name == "retrieve_sop":
            return json.dumps(lab_tools.retrieve_sop(
                issue_type=args.get("issue_type"),
                equipment_id=args.get("equipment_id"),
            ))

        if name == "recall_history":
            return json.dumps(lab_tools.recall_history(
                equipment_id=args["equipment_id"],
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

        if name == "find_inventory":
            return json.dumps(lab_tools.find_inventory(args["item_name"]))

        if name == "post_sensor_reading":
            equipment_list = storage.load("equipment")
            eq = next((e for e in equipment_list if e["id"] == args["equipment_id"]), None)
            if not eq:
                return json.dumps({"error": f"Equipment {args['equipment_id']} not found"})
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
                req = EventRequest(type="temperature_reading", equipment_id=args["equipment_id"],
                                   value=value, unit=unit)
                incident_result = _process_sensor_event(req)
            else:
                eq["status"] = "ok"
                storage.save("equipment", equipment_list)
            return json.dumps({"ok": True, "equipment_id": args["equipment_id"],
                               "reading": f"{value}{unit}", "incident": incident_result})

        return json.dumps({"error": f"Unknown tool: {name}"})

    except Exception as exc:
        return json.dumps({"error": str(exc)})


def _strip_think(text: str) -> str:
    """Remove Qwen3 chain-of-thought <think>...</think> blocks from the reply."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


# ── Main agent call ───────────────────────────────────────────────────────────

async def run(message: str) -> str:
    """Run the Qwen agent on a user message. Returns the final text reply."""
    client = _nebius_client()
    if not client:
        return "Nebius is not configured (NEBIUS_API_KEY missing)."

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM},
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
            return _strip_think(choice.message.content or "I could not complete that.")

    return "I reached the tool call limit. Please try a simpler request."
