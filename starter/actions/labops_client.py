"""Thin HTTP client for the LabOps Guardian API.

Rasa custom actions should NOT contain lab logic — they call the backend over HTTP and hand
results back as slots. This keeps the brain (Rasa) and the memory/tools (FastAPI) decoupled,
exactly as the shared API contract intends.

Base URL comes from LABOPS_API_URL (default http://localhost:8000).
"""

from __future__ import annotations

import os
from typing import Any

import requests

BASE_URL = os.environ.get("LABOPS_API_URL", "http://localhost:8000").rstrip("/")
TIMEOUT = 10


class LabOpsUnavailable(Exception):
    """Raised when the LabOps API can't be reached — actions degrade gracefully."""


def _post(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        resp = requests.post(f"{BASE_URL}{path}", json=payload, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise LabOpsUnavailable(str(exc)) from exc


def _get(path: str) -> Any:
    try:
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise LabOpsUnavailable(str(exc)) from exc


def move_sample(sample_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _post(f"/api/samples/{sample_id}/move", payload)


def validate_calculation(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/validate_calculation", payload)


def retrieve_sop(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/retrieve_sop", payload)


def find_inventory(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/find_inventory", payload)


def create_reminder(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/create_reminder", payload)


def send_emergency_message(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/send_emergency_message", payload)


def generate_handoff(payload: dict[str, Any]) -> dict[str, Any]:
    return _post("/api/tools/generate_handoff", payload)


def get_state() -> dict[str, Any]:
    return _get("/api/state")
