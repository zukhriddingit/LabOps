from __future__ import annotations

import os
from typing import Any, Dict, Optional

import requests


class LabOpsClient:
    """Small, defensive wrapper around the LabOps FastAPI tool server."""

    def __init__(self, base_url: Optional[str] = None, timeout: float = 5.0) -> None:
        self.base_url = (base_url or os.getenv("LABOPS_API_URL") or "http://localhost:8000").rstrip("/")
        self.timeout = timeout

    def _error(self, message: str, detail: Optional[str] = None) -> Dict[str, Any]:
        return {
            "ok": False,
            "error": message,
            "detail": detail,
            "user_message": (
                "I can't reach the LabOps tool server right now. I can still collect the details, "
                "but I won't log, validate, retrieve, or send anything until the tool server is back."
            ),
        }

    def _request(self, method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            response = requests.request(method, url, json=payload, timeout=self.timeout)
            response.raise_for_status()
        except requests.ConnectionError as exc:
            return self._error("Backend unavailable", str(exc))
        except requests.Timeout as exc:
            return self._error("Backend request timed out", str(exc))
        except requests.HTTPError as exc:
            detail = None
            try:
                detail = response.json()
            except Exception:
                detail = response.text
            return {"ok": False, "error": f"Backend returned HTTP {response.status_code}", "detail": detail}
        except requests.RequestException as exc:
            return self._error("Backend request failed", str(exc))

        if response.status_code == 204 or not response.content:
            return {"ok": True}

        try:
            data = response.json()
        except ValueError:
            data = {"text": response.text}

        if isinstance(data, dict):
            data.setdefault("ok", True)
            return data
        return {"ok": True, "data": data}

    def get_state(self) -> Dict[str, Any]:
        return self._request("GET", "/api/state")

    def get_sample(self, sample_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/samples/{sample_id}")

    def move_sample(self, sample_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", f"/api/samples/{sample_id}/move", payload)

    def validate_calculation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/validate_calculation", payload)

    def find_inventory(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/find_inventory", payload)

    def retrieve_sop(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/retrieve_sop", payload)

    def draft_or_send_emergency_message(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/send_emergency_message", payload)

    def generate_handoff(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/generate_handoff", payload)

    def log_activity_event(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/activity-events", payload)

    def get_today_activity(self) -> Dict[str, Any]:
        return self._request("GET", "/api/activity-events/today")

    def get_person_daily_activity(self, person_name_or_id: str) -> Dict[str, Any]:
        return self._request("GET", f"/api/people/{person_name_or_id}/daily-activity")

    def create_reminder(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._request("POST", "/api/tools/create_reminder", payload)
