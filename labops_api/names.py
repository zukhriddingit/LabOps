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
    "centrifuge": "centrifuge_2",
    "centrifuge2": "centrifuge_2",
    "microscope": "microscope_1",
    "microscope1": "microscope_1",
    "shelfa": "shelf_a",
    "inventoryshelf": "shelf_a",
    "inventoryshelfa": "shelf_a",
    "storageshelfa": "shelf_a",
    "incubator": "co2_incubator",
    "co2incubator": "co2_incubator",
    "co2": "co2_incubator",
    "fridge": "reagent_fridge",
    "reagentfridge": "reagent_fridge",
    "chemcabinet": "chem_cabinet_1",
    "chemicalcabinet": "chem_cabinet_1",
    "chemicalcabinet1": "chem_cabinet_1",
    "biosafetycabinet": "biosafety_cabinet",
    "biosafety": "biosafety_cabinet",
    "hood": "biosafety_cabinet",
    "bsc": "biosafety_cabinet",
    "autoclave": "autoclave",
    "pipettestation": "pipette_station",
    "pipette": "pipette_station",
    "biohazardbin": "biohazard_bin",
    "biohazard": "biohazard_bin",
    "sharps": "biohazard_bin",
    "camera": "sim_camera",
    "shelfsensor": "sim_camera",
    "simcamera": "sim_camera",
    "pipostdoc": "pi_postdoc",
    "pistation": "pi_postdoc",
}

EQUIPMENT_LABELS = {
    "freezer": "Freezer",
    "backup_freezer": "Backup Freezer",
    "bench_2": "Bench 2",
    "centrifuge_2": "Centrifuge 2",
    "microscope_1": "Microscope 1",
    "shelf_a": "Inventory Shelf A",
    "co2_incubator": "CO2 Incubator",
    "reagent_fridge": "Reagent Fridge",
    "chem_cabinet_1": "Chemical Cabinet 1",
    "biosafety_cabinet": "Biosafety Cabinet",
    "autoclave": "Autoclave",
    "pipette_station": "Pipette Station",
    "biohazard_bin": "Biohazard Waste",
    "sim_camera": "Simulated Camera / Shelf Sensor",
    "pi_postdoc": "PI / Postdoc Station",
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
