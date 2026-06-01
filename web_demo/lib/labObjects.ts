// Static layout + metadata for every object in the lab. The 3D scene, the floating pins,
// and the info cards all read from this so they stay in sync.

import type { SampleLocation, SampleStatus } from "@/types/lab";

export type Tone = "default" | "ok" | "info" | "warn" | "crit";
export type Vec3 = [number, number, number];

export const TONE_HEX: Record<Tone, string> = {
  default: "#8094bd",
  ok: "#36d1a6",
  info: "#4aa8ff",
  warn: "#ffb020",
  crit: "#ff3b5c",
};

// Single source of truth for sample status → tone/colour. Both the floating pin
// and the vial liquid read from here so they never disagree. (`tracking` is the
// safe in-window state → ok/teal; once on the bench the C17 vial separately ramps
// amber→red by elapsed time, which carries the urgency cue.)
export const SAMPLE_STATUS_TONE: Record<SampleStatus, Tone> = {
  stored: "info",
  tracking: "ok",
  stabilized: "ok",
  warning: "warn",
  critical: "crit",
};

export const SAMPLE_STATUS_HEX: Record<SampleStatus, string> = {
  stored: TONE_HEX.info,
  tracking: TONE_HEX.ok,
  stabilized: TONE_HEX.ok,
  warning: TONE_HEX.warn,
  critical: TONE_HEX.crit,
};

export interface LabObject {
  id: string;
  code: string; // short badge code, MedSim-style
  label: string;
  tone: Tone;
  position: Vec3; // center
  size: Vec3;
  rotationY?: number;
  color: string;
  emissive?: string;
  shape?: "box" | "sphere";
  description: string;
}

// Where Sample C17 sits for each location (shared by the vial mesh + its pin).
export const SAMPLE_LOCATION_POS: Record<SampleLocation, Vec3> = {
  "Freezer": [-5.2, 1.4, 10.2],
  "Bench 2": [2.5, 1.2, 1],
  "Backup Freezer": [-7.2, 1.4, 10.2],
};

export const LAB_OBJECTS: LabObject[] = [
  {
    id: "freezer",
    code: "FRZ",
    label: "Freezer",
    tone: "info",
    position: [-5.2, 1.5, 10.95],
    size: [1.6, 3, 1.6],
    rotationY: Math.PI,
    color: "#1b3a6b",
    emissive: "#0d6efd",
    description: "Primary cold storage, -60 °C. Sample C17's home freezer.",
  },
  {
    id: "backup_freezer",
    code: "BAK",
    label: "Backup Freezer",
    tone: "info",
    position: [-7.2, 1.5, 10.95],
    size: [1.6, 3, 1.6],
    rotationY: Math.PI,
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
    rotationY: Math.PI,
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
    rotationY: Math.PI,
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
    rotationY: Math.PI,
    color: "#2c3a2a",
    description: "Reagent bottles and controlled chemicals.",
  },
  {
    id: "biosafety_cabinet",
    code: "BSC",
    label: "Biosafety Cabinet",
    tone: "ok",
    position: [-11.4, 0.83, 10.65],
    size: [3.2, 2.7, 1.2],
    rotationY: Math.PI,
    color: "#d8e3ef",
    emissive: "#e9fbff",
    description: "Class II-style work hood with bright task lighting and a glass sash for sterile tissue handling.",
  },
  {
    id: "co2_incubator",
    code: "INC",
    label: "CO2 Incubator",
    tone: "info",
    position: [-10.4, 1.35, 2.1],
    size: [1.5, 2.7, 1.3],
    rotationY: Math.PI,
    color: "#d3dce8",
    emissive: "#36d1a6",
    description: "Cell/tissue incubator display: 37 °C, 5% CO2. Protocol-sensitive environmental storage.",
  },
  {
    id: "reagent_fridge",
    code: "REF",
    label: "Reagent Fridge",
    tone: "info",
    position: [-10.5, 1.15, -2.6],
    size: [1.5, 2.3, 1.2],
    rotationY: Math.PI,
    color: "#dce8f4",
    emissive: "#4aa8ff",
    description: "Short-term reagent fridge with a glass door and visible bottles.",
  },
  {
    id: "centrifuge_2",
    code: "CTF",
    label: "Centrifuge 2",
    tone: "default",
    position: [5.5, 0.6, -2],
    size: [1, 1.2, 1],
    rotationY: Math.PI,
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
    rotationY: Math.PI,
    color: "#46406b",
    description: "Imaging station for prepared samples.",
  },
  {
    id: "pipette_station",
    code: "PIP",
    label: "Pipette Station",
    tone: "default",
    position: [1.2, 1.38, 0.7],
    size: [1.35, 0.8, 0.9],
    rotationY: Math.PI,
    color: "#7b88a2",
    description: "Pipette rack, tip boxes, and tube rack for bench prep steps.",
  },
  {
    id: "biohazard_bin",
    code: "BIO",
    label: "Biohazard Waste",
    tone: "warn",
    position: [6.8, 0.55, 2.3],
    size: [0.85, 1.1, 0.85],
    rotationY: Math.PI,
    color: "#d64b42",
    emissive: "#ffb020",
    description: "Biohazard waste bin and sharps container for contaminated glove and bench waste moments.",
  },
  {
    id: "autoclave",
    code: "AUT",
    label: "Autoclave",
    tone: "default",
    position: [10.5, 1.2, 4.6],
    size: [1.7, 2.4, 1.5],
    rotationY: Math.PI,
    color: "#9aa3b8",
    emissive: "#4aa8ff",
    description: "Sterilization station with a pressure door and status display.",
  },
  {
    id: "sim_camera",
    code: "CAM",
    label: "Simulated Camera / Shelf Sensor",
    tone: "info",
    position: [-1, 3.35, 11.78],
    size: [0.36, 0.36, 0.36],
    rotationY: 0,
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
    rotationY: Math.PI,
    color: "#5a2a4a",
    description: "Escalation contact. Draft an emergency message here when hands are contaminated.",
  },
];

// id → centre position, so glows/effects can be anchored to objects instead of
// hardcoded coordinates that silently drift when an object is moved.
export const OBJECT_POS: Record<string, Vec3> = Object.fromEntries(
  LAB_OBJECTS.map((o) => [o.id, o.position])
) as Record<string, Vec3>;
