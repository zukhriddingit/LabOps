"use client";

import { useLabStore } from "@/store/labStore";
import type { LabViewPreset } from "@/types/lab";

const PRESETS: Array<{ id: LabViewPreset; label: string }> = [
  { id: "entry", label: "Entry" },
  { id: "cold", label: "Cold" },
  { id: "bench", label: "Bench" },
  { id: "inventory", label: "Inventory" },
  { id: "message", label: "Message" },
  { id: "overview", label: "Overview" },
];

export default function CameraControls() {
  const viewPreset = useLabStore((s) => s.viewPreset);
  const setViewPreset = useLabStore((s) => s.setViewPreset);
  const runDemo = useLabStore((s) => s.runDemo);
  const demoRunning = useLabStore((s) => s.demoRunning);

  return (
    <div className="camera-controls" aria-label="Camera controls">
      <button className="tour-btn" onClick={runDemo} disabled={demoRunning}>
        {demoRunning ? "Running..." : "Run Demo"}
      </button>
      <div className="preset-row">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            className={`preset-btn ${viewPreset === preset.id ? "active" : ""}`}
            onClick={() => setViewPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
