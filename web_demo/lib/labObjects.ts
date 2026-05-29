// Static layout + metadata for every object in the lab. The 3D scene, the floating pins,
// and the info cards all read from this so they stay in sync.

import type { SampleLocation } from "@/types/lab";

export type Tone = "default" | "ok" | "info" | "warn" | "crit";
export type Vec3 = [number, number, number];

export const TONE_HEX: Record<Tone, string> = {
  default: "#8094bd",
  ok: "#36d1a6",
  info: "#4aa8ff",
  warn: "#ffb020",
  crit: "#ff3b5c",
};

export interface LabObject {
  id: string;
  code: string; // short badge code, MedSim-style
  label: string;
  tone: Tone;
  position: Vec3; // center
  size: Vec3;
  color: string;
  emissive?: string;
  shape?: "box" | "sphere";
  description: string;
}

// Where Sample C17 sits for each location (shared by the vial mesh + its pin).
export const SAMPLE_LOCATION_POS: Record<SampleLocation, Vec3> = {
  "Freezer B": [-4.5, 1.4, -1],
  "Bench 2": [2.5, 1.2, 1],
  "Backup Freezer D": [-7, 1.4, -1],
};

export const LAB_OBJECTS: LabObject[] = [
  {
    id: "freezer_b",
    code: "FRZ",
    label: "Freezer B",
    tone: "info",
    position: [-4.5, 1.5, -1],
    size: [1.6, 3, 1.6],
    color: "#1b3a6b",
    emissive: "#0d6efd",
    description: "Primary cold storage, -60 °C. Sample C17's home freezer.",
  },
  {
    id: "backup_freezer_d",
    code: "BAK",
    label: "Backup Freezer D",
    tone: "info",
    position: [-7, 1.5, -1],
    size: [1.6, 3, 1.6],
    color: "#1b3a5b",
    emissive: "#0d6efd",
    description: "Backup cold storage. Move C17 here to stabilize before the limit.",
  },
  {
    id: "bench_2",
    code: "BCH",
    label: "Bench 2",
    tone: "default",
    position: [2.5, 0.5, 1],
    size: [3.6, 1, 2],
    color: "#2a2f45",
    description: "Working bench. Room temperature ~21 °C — the cold-chain clock runs here.",
  },
  {
    id: "shelf_a",
    code: "INV",
    label: "Inventory Shelf A",
    tone: "warn",
    position: [-1, 1, 4],
    size: [2, 2, 0.6],
    color: "#243049",
    description: "Consumables. 15 mL tubes in Bin 3 — counted by the simulated shelf sensor.",
  },
  {
    id: "chem_cabinet_1",
    code: "CHM",
    label: "Chemical Cabinet 1",
    tone: "default",
    position: [1.5, 1, 4],
    size: [1.4, 2, 0.6],
    color: "#2c3a2a",
    description: "Reagent bottles and controlled chemicals.",
  },
  {
    id: "centrifuge_2",
    code: "CTF",
    label: "Centrifuge 2",
    tone: "default",
    position: [5.5, 0.6, -2],
    size: [1, 1.2, 1],
    color: "#3a4668",
    description: "Centrifuge. SOP: Cardiovascular Tissue Prep v2 — confirm rotor before running.",
  },
  {
    id: "microscope_1",
    code: "MIC",
    label: "Microscope 1",
    tone: "default",
    position: [4.5, 0.6, 3],
    size: [0.8, 1.2, 0.8],
    color: "#46406b",
    description: "Imaging station for prepared samples.",
  },
  {
    id: "sim_camera",
    code: "CAM",
    label: "Simulated Camera / Shelf Sensor",
    tone: "info",
    position: [-1, 4.2, 4],
    size: [0.36, 0.36, 0.36],
    color: "#9aa7c7",
    emissive: "#55ccff",
    shape: "sphere",
    description:
      "Structured shelf counter — NOT computer vision. Emits inventory_observation events with a confidence label. No webcam, no detection.",
  },
  {
    id: "pi_postdoc",
    code: "MSG",
    label: "PI / Postdoc Station",
    tone: "crit",
    position: [7, 0.9, 0],
    size: [1, 1.8, 0.4],
    color: "#5a2a4a",
    description: "Escalation contact. Draft an emergency message here when hands are contaminated.",
  },
];
