"use client";

import Panel from "@/components/shared/Panel";
import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";
import type { SampleStatus } from "@/types/lab";

const STATUS_TONE: Record<SampleStatus, "ok" | "info" | "warn" | "crit"> = {
  stored: "info",
  tracking: "ok",
  stabilized: "ok",
  warning: "warn",
  critical: "crit",
};

export default function StatusPanel() {
  const sample = useLabStore((s) => s.sample);
  const connection = useLabStore((s) => s.connection);

  const onBench = sample.location === "Bench 2";
  const timer = onBench
    ? `${Math.min(DEMO.limitSeconds, sample.elapsedDemoSeconds)} / ${sample.allowedRoomTempMinutes} min`
    : "—";

  return (
    <Panel title="Lab Status">
      <div className="row">
        <span>Sample {sample.id}</span>
        <span className="val">{sample.location}</span>
      </div>
      <div className="row">
        <span>Room-temp timer</span>
        <span className="val">{timer}</span>
      </div>
      <div className="row">
        <span>Sample status</span>
        <span className="val">
          <Badge tone={STATUS_TONE[sample.status]}>{sample.status}</Badge>
        </span>
      </div>
      <div className="row">
        <span>Backend</span>
        <span className="val">
          <Badge tone={connection === "connected" ? "ok" : connection === "checking" ? "info" : "crit"}>
            {connection === "connected"
              ? "connected"
              : connection === "checking"
                ? "checking…"
                : "disconnected (mock)"}
          </Badge>
        </span>
      </div>

      {sample.status === "warning" && (
        <div className="banner warn">⚠ C17 near room-temp limit.</div>
      )}
      {sample.status === "critical" && (
        <div className="banner crit">⛔ C17 exceeded room-temp limit. Escalation recommended.</div>
      )}
    </Panel>
  );
}
