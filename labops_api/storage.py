"""Dead-simple JSON-file storage.

One file per collection under labops_api/data/. This is the lab's persistent memory —
it survives restarts so the Guardian "remembers" across sessions (the whole point of the
hackathon). Swap for Postgres/Redis later; the interface is intentionally tiny.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"

COLLECTIONS = [
    "samples",
    "equipment",
    "inventory",
    "reminders",
    "events",
    "messages",
    "experiment_runs",
]


def _path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


def load(name: str) -> Any:
    p = _path(name)
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def save(name: str, data: Any) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _path(name).write_text(json.dumps(data, indent=2), encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def next_id(prefix: str, existing: list[dict]) -> str:
    n = len(existing) + 1
    ids = {row.get("id") for row in existing}
    while f"{prefix}_{n}" in ids:
        n += 1
    return f"{prefix}_{n}"
