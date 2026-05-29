"""Tool logic: calculation validation, SOP retrieval, inventory lookup, handoff.

Kept separate from app.py so the HTTP layer stays thin. Everything that produces a "fact"
stamps it with a truth-state (source_type + confidence).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from labops_api import storage

SOPS_DIR = Path(__file__).parent / "sops"


# ── Calculation validation ──────────────────────────────────────────────────────
def validate_calculation(
    calculation_type: str,
    target_percent: float | None,
    final_volume_ml: float | None,
    user_answer_ul: float | None,
) -> dict[str, Any]:
    """MVP: percent v/v. Returns correct/incorrect/ambiguous + formula + assumptions."""
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
        "warning": f"Calculation type '{calculation_type}' is not supported yet "
                   "(MVP supports percent_volume_volume).",
        "source_type": "calculated",
        "confidence": "low",
    }


# ── SOP retrieval (grounded — only from local files) ─────────────────────────────
def _parse_sop(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    meta: dict[str, Any] = {"sop_id": path.stem, "title": path.stem, "tags": [],
                            "applies_to": [], "required_fields": []}
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
    # Pull numbered checklist lines from the body.
    checklist = [re.sub(r"^\d+\.\s*", "", ln).strip()
                 for ln in body.splitlines() if re.match(r"^\d+\.\s+", ln.strip())]
    caution_match = re.search(r"##\s*Caution\s*\n(.+?)(\n##|\Z)", body, re.DOTALL)
    caution = caution_match.group(1).strip() if caution_match else ""
    return {**meta, "checklist": checklist[:8], "caution": caution}


def retrieve_sop(query: str, sample_id: str | None = None) -> dict[str, Any]:
    q = query.lower()
    sops = [_parse_sop(p) for p in sorted(SOPS_DIR.glob("*.md"))]
    best, best_score = None, 0
    for sop in sops:
        terms = sop.get("tags", []) + sop.get("applies_to", [])
        score = sum(1 for t in terms if t and t.lower() in q)
        # cardio sample → prefer the cardio SOP
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
        "checklist": best.get("checklist", []),
        "missing_fields": best.get("required_fields", []),
        "caution": best.get("caution", "Confirm details before proceeding."),
        "source_type": "sop_grounded",
        "confidence": "high",
    }


# ── Inventory lookup ─────────────────────────────────────────────────────────────
def find_inventory(item_name: str) -> dict[str, Any]:
    q = item_name.lower().strip()
    for item in storage.load("inventory"):
        name = item["item_name"].lower()
        if q in name or name in q:
            note = ("Inventory record location is high-confidence; "
                    "the count is camera-inferred." if item.get("camera_inferred_count") is not None
                    else "From the inventory record.")
            return {"found": True, **item, "note": note}
    return {"found": False, "message": f"No inventory record for '{item_name}'."}


# ── Handoff ──────────────────────────────────────────────────────────────────────
def generate_handoff(shift: str | None = None) -> dict[str, Any]:
    samples = storage.load("samples")
    events = storage.load("events")
    reminders = storage.load("reminders")
    messages = storage.load("messages")

    movements = [e for e in events if e.get("type") == "sample_moved"]
    calcs = [e for e in events if e.get("type") == "calculation_validated"]
    sops = [e for e in events if e.get("type") == "sop_retrieved"]
    lookups = [e for e in events if e.get("type") == "inventory_lookup"]

    unresolved = []
    for s in samples:
        if s.get("room_temp_started_at") and s.get("location", "").lower() not in {"freezer b"}:
            unresolved.append(
                f"{s['sample_id']} is out of cold storage (on {s['location']}) — outcome not confirmed."
            )
    if not unresolved:
        unresolved.append("No open cold-chain risks. Root cause / outcomes otherwise unconfirmed.")

    return {
        "generated_at": storage.now_iso(),
        "shift": shift or "next",
        "sample_movements": movements,
        "current_sample_status": samples,
        "active_reminders": [r for r in reminders if r.get("status") == "open"],
        "calculations_validated": calcs,
        "sops_retrieved": sops,
        "inventory_lookups": lookups,
        "messages": messages,
        "unresolved_risks": unresolved,
        "uncertainty_note": "Some facts are user-reported or camera-inferred and not human-confirmed.",
    }
