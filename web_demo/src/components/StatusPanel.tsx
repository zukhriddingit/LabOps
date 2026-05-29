import type { AlertLevel, SampleSpot } from "../App";
import type { LabState } from "../types";

export default function StatusPanel({
  state,
  connected,
  spot,
  elapsed,
  limit,
  alert,
  messageStatus,
}: {
  state: LabState;
  connected: boolean;
  spot: SampleSpot;
  elapsed: number;
  limit: number;
  alert: AlertLevel;
  messageStatus: string;
}) {
  const c17 = state.samples.find((s) => s.sample_id === "C17");
  const openReminders = state.reminders.filter((r) => r.status === "open");
  const location = spot === "bench" ? "Bench 2" : c17?.location ?? "Freezer B";

  return (
    <div className="panel">
      <h3>Status</h3>
      <div className="row">
        <span>Sample C17</span>
        <span className="val">{location}</span>
      </div>
      <div className="row">
        <span>Room-temp timer</span>
        <span className={`val alert-${alert}`}>
          {spot === "bench" ? `${Math.floor(elapsed)} / ${limit} min` : "in storage"}
        </span>
      </div>
      <div className="row">
        <span>Active reminders</span>
        <span className="val">{openReminders.length}</span>
      </div>
      <div className="row">
        <span>Last message</span>
        <span className="val">{messageStatus}</span>
      </div>
      <div className="row">
        <span>Backend</span>
        <span className={`val ${connected ? "ok" : "bad"}`}>
          {connected ? "connected" : "disconnected"}
        </span>
      </div>
      {alert === "warning" && <div className="banner warn">⚠ Approaching the {limit}-min limit</div>}
      {alert === "critical" && <div className="banner crit">⛔ Room-temp limit reached — return C17</div>}
    </div>
  );
}
