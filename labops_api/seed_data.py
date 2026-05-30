"""Seed the LabOps Guardian memory with the cardio-tissue demo scenario.

Run:  python -m labops_api.seed_data        (or:  python labops_api/seed_data.py)

This (re)writes labops_api/data/*.json to the known demo starting state. Safe to run
any time you want to reset the demo.
"""

from __future__ import annotations

from labops_api import storage
from labops_api.storage import now_iso

SAMPLES = [
    {
        "sample_id": "C17",
        "name": "Cardiovascular tissue sample",
        "location": "Freezer",
        "storage_temperature": "-60C",
        "max_room_temp_minutes": 20,
        "room_temp_started_at": None,
        "room_temp_deadline": None,
        "source_type": "user_reported",
        "confidence": "high",
        "updated_at": now_iso(),
    },
    {
        "sample_id": "A12",
        "name": "Backup tissue sample",
        "location": "Backup Freezer",
        "storage_temperature": "-60C",
        "max_room_temp_minutes": 20,
        "room_temp_started_at": None,
        "room_temp_deadline": None,
        "source_type": "user_reported",
        "confidence": "high",
        "updated_at": now_iso(),
    },
]

EQUIPMENT = [
    {"id": "freezer", "name": "Freezer", "kind": "ultra_low_freezer", "current_temperature": "-60C",
     "status": "ok", "normal_range": {"min": -80, "max": -50, "unit": "C"},
     "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
    {"id": "backup_freezer", "name": "Backup Freezer", "kind": "ultra_low_freezer", "current_temperature": "-81C",
     "status": "ok", "normal_range": {"min": -90, "max": -70, "unit": "C"},
     "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
    {"id": "bench_2", "name": "Bench 2", "kind": "bench", "current_temperature": "21C",
     "status": "ok", "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
    {"id": "centrifuge_2", "name": "Centrifuge 2", "kind": "centrifuge", "current_temperature": None,
     "status": "idle", "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
    {"id": "microscope_1", "name": "Microscope 1", "kind": "microscope", "current_temperature": None,
     "status": "idle", "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
    {"id": "shelf_a", "name": "Storage Shelf A", "kind": "shelf", "current_temperature": None,
     "status": "ok", "source_type": "observed_by_sensor", "confidence": "high", "updated_at": now_iso()},
]

INVENTORY = [
    {"item_name": "15 mL tubes", "location": "Shelf A, bin 3", "bin": "3", "record_count": None,
     "camera_inferred_count": 2, "stock_level": "ok", "confidence": "medium",
     "source_type": "camera_inferred", "timestamp": now_iso()},
    {"item_name": "pipette tips", "location": "Shelf A, bin 1", "bin": "1", "record_count": 1,
     "camera_inferred_count": None, "stock_level": "low", "confidence": "high",
     "source_type": "user_reported", "timestamp": now_iso()},
    {"item_name": "reagent bottles", "location": "Chemical Cabinet 1", "bin": None, "record_count": 6,
     "camera_inferred_count": None, "stock_level": "ok", "confidence": "high",
     "source_type": "user_reported", "timestamp": now_iso()},
]

EXPERIMENT_RUNS = [
    {"id": "run_1", "title": "Cardio tissue prep — C17", "started_at": now_iso(),
     "sample_ids": ["C17"], "notes": ["Run created from seed data."], "status": "in_progress"},
]


def seed() -> None:
    storage.save("samples", SAMPLES)
    storage.save("equipment", EQUIPMENT)
    storage.save("inventory", INVENTORY)
    storage.save("experiment_runs", EXPERIMENT_RUNS)
    storage.save("reminders", [])
    storage.save("events", [])
    storage.save("messages", [])
    # Reset the incident/ticket logs so demos start clean. prior_events.json is left
    # intact on disk — it's the long-term history the agent recalls.
    storage.save("incidents", [])
    storage.save("tickets", [])
    print("Seeded labops_api/data/ with the cardio-tissue demo scenario.")


if __name__ == "__main__":
    seed()
