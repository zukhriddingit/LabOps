"use client";

import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";

export default function HudBar() {
  const sample = useLabStore((s) => s.sample);
  const inventory = useLabStore((s) => s.inventory);
  const connection = useLabStore((s) => s.connection);
  const dashboardOpen = useLabStore((s) => s.dashboardOpen);
  const toggleDashboard = useLabStore((s) => s.toggleDashboard);

  const onBench = sample.location === "Bench 2";
  const timer = onBench
    ? `${Math.min(DEMO.limitSeconds, sample.elapsedDemoSeconds)}/${sample.allowedRoomTempMinutes}m`
    : "—";
  const alerts =
    sample.status === "critical" ? 1 : sample.status === "warning" ? 1 : 0;

  return (
    <div className="hud">
      <div className="hud-brand">
        <span className="hud-logo">LabOps Guardian</span>
        <span className="hud-sub">PROTOCOL-AWARE LAB COWORKER · LIVE</span>
      </div>

      <div className="hud-stats">
        <Stat label="ROOM TEMP" value={timer} tone={statusTone(sample.status)} />
        <Stat label="C17 STATUS" value={sample.status.toUpperCase()} tone={statusTone(sample.status)} />
        <Stat label="ALERTS" value={String(alerts)} tone={alerts ? "crit" : "ok"} />
        <Stat label="INVENTORY" value={inventory ? "LOGGED" : "—"} tone={inventory ? "ok" : "dim"} />
        <Stat
          label="BACKEND"
          value={connection === "connected" ? "LIVE" : connection === "checking" ? "…" : "MOCK"}
          tone={connection === "connected" ? "ok" : "warn"}
        />
      </div>

      <button className="hud-dash-btn" onClick={() => toggleDashboard()}>
        {dashboardOpen ? "CLOSE DASHBOARD ✕" : "OPEN DASHBOARD →"}
      </button>
    </div>
  );
}

function statusTone(status: string): Tone {
  if (status === "warning") return "warn";
  if (status === "critical") return "crit";
  if (status === "stored") return "info";
  return "ok";
}

type Tone = "ok" | "info" | "warn" | "crit" | "dim";

function Stat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="hud-stat">
      <span className={`hud-val ${tone}`}>{value}</span>
      <span className="hud-label">{label}</span>
    </div>
  );
}
