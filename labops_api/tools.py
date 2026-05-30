"""Tool logic: SOP retrieval, ticket creation, history recall, handoff generation, calculation validation, inventory lookup.

Every function that produces a "fact" stamps it with source_type + confidence so the agent
never presents a hypothesis as a confirmed finding.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from labops_api import storage

SOPS_DIR = Path(__file__).parent / "sops"

# Maps issue_type strings to SOP IDs (filename stems)
ISSUE_TYPE_TO_SOP: dict[str, str] = {
    "temperature_excursion": "freezer_temperature_excursion",
    "centrifuge_error": "centrifuge_error_code_42",
    "inventory_shortage": "inventory_shortage",
    "freezer_temperature_excursion": "freezer_temperature_excursion",
    "centrifuge_error_code_42": "centrifuge_error_code_42",
}


# ── SOP parsing ───────────────────────────────────────────────────────────────

def _parse_sop(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    meta: dict[str, Any] = {
        "sop_id": path.stem,
        "title": path.stem,
        "tags": [],
        "applies_to": [],
        "required_fields": [],
    }
    fm = re.match(r"^---\n(.*?)\n---\n(.*)$", text, re.DOTALL)
    body = text
    if fm:
        body = fm.group(2)
        for line in fm.group(1).splitlines():
            if ":" not in line:
                continue
            key, _, val = line.partition(":")
            key, val = key.strip(), val.strip()
            if val.startswith("[") and val.endswith("]"):
                meta[key] = [v.strip() for v in val[1:-1].split(",") if v.strip()]
            else:
                meta[key] = val

    # Pull escalation rules (lines under ## Escalation Rules)
    escalation_match = re.search(r"##\s*Escalation Rules\s*\n(.+?)(\n##|\Z)", body, re.DOTALL)
    matched_rules = []
    if escalation_match:
        for line in escalation_match.group(1).splitlines():
            line = line.strip().lstrip("- ").strip()
            if line:
                matched_rules.append(line)

    # Pull numbered recommended actions
    recommended_actions = [
        re.sub(r"^\d+\.\s*", "", ln).strip()
        for ln in body.splitlines()
        if re.match(r"^\d+\.\s+", ln.strip())
    ]

    caution_match = re.search(r"##\s*Caution\s*\n(.+?)(\n##|\Z)", body, re.DOTALL)
    caution = caution_match.group(1).strip() if caution_match else ""

    return {
        **meta,
        "matched_rules": matched_rules,
        "recommended_actions": recommended_actions[:8],
        "caution": caution,
    }


def retrieve_sop(
    issue_type: str | None = None,
    equipment_id: str | None = None,
    query: str | None = None,
    sample_id: str | None = None,
) -> dict[str, Any]:
    """Return grounded SOP content. Never invents steps — only returns what is in local files."""
    all_sops = {p.stem: _parse_sop(p) for p in sorted(SOPS_DIR.glob("*.md"))}

    # 1. Direct issue_type → SOP ID lookup
    if issue_type:
        sop_id = ISSUE_TYPE_TO_SOP.get(issue_type.lower().replace(" ", "_"))
        if sop_id and sop_id in all_sops:
            sop = all_sops[sop_id]
            return {
                "found": True,
                "sop_id": sop["sop_id"],
                "title": sop.get("title", sop["sop_id"]),
                "matched_rules": sop.get("matched_rules", []),
                "recommended_actions": sop.get("recommended_actions", []),
                "caution": sop.get("caution", "Confirm details before proceeding."),
                "source_type": "sop_grounded",
                "confidence": "high",
            }

    # 2. Tag/keyword search using issue_type or query
    search_text = (issue_type or query or "").lower()
    if not search_text:
        return {"found": False, "message": "No issue_type or query provided."}

    best, best_score = None, 0
    for sop in all_sops.values():
        terms = sop.get("tags", []) + sop.get("applies_to", [])
        score = sum(1 for t in terms if t and t.lower() in search_text)
        # Also score if search terms appear in the SOP's tags
        score += sum(1 for word in search_text.split() if any(word in t.lower() for t in terms))
        if sample_id and sample_id.upper().startswith("C") and "cardio" in sop["sop_id"]:
            score += 1
        if score > best_score:
            best, best_score = sop, score

    if not best or best_score == 0:
        return {"found": False, "message": "No matching local SOP."}

    return {
        "found": True,
        "sop_id": best["sop_id"],
        "title": best.get("title", best["sop_id"]),
        "matched_rules": best.get("matched_rules", []),
        "recommended_actions": best.get("recommended_actions", []),
        "caution": best.get("caution", "Confirm details before proceeding."),
        "source_type": "sop_grounded",
        "confidence": "high",
    }


# ── Ticket creation ───────────────────────────────────────────────────────────

def create_ticket(
    incident_id: str,
    severity: str,
    assigned_to: str,
    summary: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    tickets = storage.load("tickets")
    n = len(tickets) + 1
    ticket = {
        "ticket_id": f"LAB-TICKET-{n:03d}",
        "incident_id": incident_id,
        "summary": summary or f"Maintenance required: {incident_id}",
        "severity": severity,
        "assigned_to": assigned_to,
        "notes": notes,
        "status": "open",
        "created_at": storage.now_iso(),
    }
    tickets.append(ticket)
    storage.save("tickets", tickets)

    # Link ticket back to its incident
    incidents = storage.load("incidents")
    incident = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if incident:
        incident.setdefault("tickets", []).append(ticket["ticket_id"])
        incident["updated_at"] = storage.now_iso()
        storage.save("incidents", incidents)

    return ticket


# ── History recall ────────────────────────────────────────────────────────────

def recall_history(equipment_id: str, issue_type: str | None = None) -> dict[str, Any]:
    """Return prior events for this equipment, clearly marked as past history, not current cause."""
    prior_events = storage.load("prior_events")

    matches = []
    for event in prior_events:
        if event.get("equipment_id") != equipment_id:
            continue
        if issue_type and event.get("issue_type") != issue_type:
            continue
        matches.append({
            "summary": event.get("summary", f"{equipment_id} had a {event.get('issue_type')} event"),
            "timestamp": event.get("timestamp"),
            "recorded_cause": event.get("recorded_cause"),
            "resolution": event.get("resolution"),
            "duration_hours": event.get("duration_hours"),
            "source_type": event.get("source_type", "human_confirmed"),
            "confidence": event.get("confidence", "high"),
        })

    if not matches:
        return {
            "found": False,
            "related_events": [],
            "uncertainty_note": "No prior incidents found for this equipment and issue type.",
            "source_type": "human_confirmed",
            "confidence": "high",
        }

    return {
        "found": True,
        "related_events": matches,
        "uncertainty_note": (
            "Prior incidents may be relevant, but current root cause is not confirmed. "
            "Do not assume the same cause applies to the current event."
        ),
        "source_type": "human_confirmed",
        "confidence": "high",
    }


# ── Handoff generation ────────────────────────────────────────────────────────

def generate_handoff(
    shift: str | None = None,
    incident_id: str | None = None,
) -> dict[str, Any]:
    """Generate a shift handoff summary.

    With incident_id: focused incident handoff for the agent to narrate.
    Without: generic lab-wide shift handoff.
    """
    if incident_id:
        return _incident_handoff(incident_id)
    return _shift_handoff(shift)


def _incident_handoff(incident_id: str) -> dict[str, Any]:
    incidents = storage.load("incidents")
    incident = next((i for i in incidents if i["incident_id"] == incident_id), None)
    if not incident:
        return {"error": f"Incident {incident_id} not found.", "incident_id": incident_id}

    equipment_list = storage.load("equipment")
    eq = next((e for e in equipment_list if e["id"] == incident["equipment_id"]), {})

    tickets = storage.load("tickets")
    inc_tickets = [t for t in tickets if t.get("incident_id") == incident_id]

    prior_events = storage.load("prior_events")
    related_prior = [
        e for e in prior_events
        if e.get("equipment_id") == incident["equipment_id"]
        and e.get("issue_type") == incident["type"]
    ]

    sop = retrieve_sop(issue_type=incident["type"], equipment_id=incident["equipment_id"])

    summary_points = [
        f"{eq.get('name', incident['equipment_id'])} {incident['type'].replace('_', ' ')} detected",
        f"Current reading: {incident.get('current_value', 'unknown')}",
        f"Threshold: {incident.get('threshold', 'unknown')}",
        f"Severity: {incident['severity']}",
        f"Incident status: {incident['status']}",
    ]
    if incident.get("observations"):
        for obs in incident["observations"]:
            summary_points.append(f"Observation: {obs}")

    open_actions = sop.get("recommended_actions", []) if sop.get("found") else [
        "Confirm door is closed",
        "Check alarm state",
        "Move critical samples if escalation threshold is confirmed met",
    ]

    prior_note = None
    if related_prior:
        p = related_prior[0]
        prior_note = (
            f"{eq.get('name', incident['equipment_id'])} had a {incident['type'].replace('_', ' ')} "
            f"on {p.get('timestamp', 'unknown date')}. "
            f"Recorded cause: {p.get('recorded_cause', 'unknown')}. "
            f"Resolution: {p.get('resolution', 'unknown')}."
        )

    return {
        "generated_at": storage.now_iso(),
        "incident_id": incident_id,
        "summary": summary_points,
        "current_status": {
            "equipment": eq.get("name"),
            "current_value": incident.get("current_value"),
            "threshold": incident.get("threshold"),
            "severity": incident["severity"],
            "incident_status": incident["status"],
        },
        "observations": incident.get("observations", []),
        "sop_used": sop.get("title") if sop.get("found") else None,
        "matched_rules": sop.get("matched_rules", []) if sop.get("found") else [],
        "open_actions": open_actions,
        "tickets_created": inc_tickets,
        "related_prior_event": prior_note,
        "uncertainty_statement": (
            "Prior incidents may be relevant, but the current root cause is not confirmed. "
            "All observations are recorded as-seen. Root cause remains unconfirmed."
        ),
    }


def _shift_handoff(shift: str | None) -> dict[str, Any]:
    samples = storage.load("samples")
    events = storage.load("events")
    reminders = storage.load("reminders")
    messages = storage.load("messages")
    incidents = storage.load("incidents")

    movements = [e for e in events if e.get("type") == "sample_moved"]
    calcs = [e for e in events if e.get("type") == "calculation_validated"]
    sops = [e for e in events if e.get("type") == "sop_retrieved"]
    lookups = [e for e in events if e.get("type") == "inventory_lookup"]
    open_incidents = [i for i in incidents if i.get("status") == "open"]

    unresolved = []
    for s in samples:
        if s.get("room_temp_started_at") and "freezer" not in s.get("location", "").lower():
            unresolved.append(
                f"{s['sample_id']} is out of cold storage on {s['location']} — outcome not confirmed."
            )
    for inc in open_incidents:
        unresolved.append(
            f"Open incident {inc['incident_id']}: {inc['type']} on {inc['equipment_id']} "
            f"(severity: {inc['severity']}) — root cause not confirmed."
        )
    if not unresolved:
        unresolved.append("No open risks detected. Some facts may be user-reported and unconfirmed.")

    return {
        "generated_at": storage.now_iso(),
        "shift": shift or "next",
        "open_incidents": open_incidents,
        "sample_movements": movements,
        "current_sample_status": samples,
        "active_reminders": [r for r in reminders if r.get("status") == "open"],
        "calculations_validated": calcs,
        "sops_retrieved": sops,
        "inventory_lookups": lookups,
        "messages": messages,
        "unresolved_risks": unresolved,
        "uncertainty_note": (
            "Some facts are user-reported or camera-inferred and not human-confirmed."
        ),
    }


# ── Calculation validation ────────────────────────────────────────────────────

def validate_calculation(
    calculation_type: str,
    target_percent: float | None,
    final_volume_ml: float | None,
    user_answer_ul: float | None,
) -> dict[str, Any]:
    if calculation_type == "percent_volume_volume":
        if target_percent is None or final_volume_ml is None:
            return {
                "status": "ambiguous",
                "formula": None,
                "assumptions": [],
                "warning": "I need both the target percent and the final volume to check this.",
                "source_type": "calculated",
                "confidence": "low",
            }
        expected_ml = (target_percent / 100.0) * final_volume_ml
        expected_ul = round(expected_ml * 1000.0, 4)
        formula = (
            f"{target_percent} / 100 * {final_volume_ml} mL = "
            f"{expected_ml:g} mL = {expected_ul:g} uL"
        )
        assumptions = ["percent is v/v", f"{final_volume_ml:g} mL is the final volume"]
        warning = "If this is w/v or a stock dilution, I need the stock concentration first."

        if user_answer_ul is None:
            status = "ambiguous"
        elif abs(user_answer_ul - expected_ul) <= max(0.01 * expected_ul, 0.001):
            status = "correct"
        else:
            status = "incorrect"

        return {
            "status": status,
            "expected_ul": expected_ul,
            "user_answer_ul": user_answer_ul,
            "formula": formula,
            "assumptions": assumptions,
            "warning": warning,
            "source_type": "calculated",
            "confidence": "high",
        }

    return {
        "status": "ambiguous",
        "formula": None,
        "assumptions": [],
        "warning": f"Calculation type '{calculation_type}' is not supported yet.",
        "source_type": "calculated",
        "confidence": "low",
    }


# ── Inventory lookup ──────────────────────────────────────────────────────────

def find_inventory(item_name: str) -> dict[str, Any]:
    q = item_name.lower().strip()
    for item in storage.load("inventory"):
        name = item["item_name"].lower()
        if q in name or name in q:
            note = (
                "Inventory record location is high-confidence; the count is camera-inferred."
                if item.get("camera_inferred_count") is not None
                else "From the inventory record."
            )
            return {"found": True, **item, "note": note}
    return {"found": False, "message": f"No inventory record for '{item_name}'."}
