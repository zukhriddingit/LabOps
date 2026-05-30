"""Canonical LabOps display names and legacy aliases."""

from __future__ import annotations


def _key(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


LOCATION_ALIASES = {
    "freezer": "Freezer",
    "freezera": "Freezer",
    "primaryfreezer": "Freezer",
    "mainfreezer": "Freezer",
    "freezerb": "Backup Freezer",
    "freezerd": "Backup Freezer",
    "backup": "Backup Freezer",
    "backupfreezer": "Backup Freezer",
    "backupfreezerd": "Backup Freezer",
    "bench2": "Bench 2",
    "bench": "Bench 2",
}

EQUIPMENT_ALIASES = {
    "freezer": "freezer",
    "freezera": "freezer",
    "primaryfreezer": "freezer",
    "mainfreezer": "freezer",
    "freezerb": "backup_freezer",
    "freezerd": "backup_freezer",
    "backup": "backup_freezer",
    "backupfreezer": "backup_freezer",
    "backupfreezerd": "backup_freezer",
    "freezer_b": "backup_freezer",
    "freezer_d": "backup_freezer",
    "backup_freezer_d": "backup_freezer",
    "bench2": "bench_2",
    "bench": "bench_2",
}

EQUIPMENT_LABELS = {
    "freezer": "Freezer",
    "backup_freezer": "Backup Freezer",
    "bench_2": "Bench 2",
    "centrifuge_2": "Centrifuge 2",
    "microscope_1": "Microscope 1",
    "shelf_a": "Storage Shelf A",
}


def normalize_location(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return cleaned
    return LOCATION_ALIASES.get(_key(cleaned), cleaned)


def normalize_equipment_id(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return cleaned
    return EQUIPMENT_ALIASES.get(_key(cleaned), cleaned)


def equipment_label(equipment_id: str) -> str:
    return EQUIPMENT_LABELS.get(equipment_id, equipment_id)
