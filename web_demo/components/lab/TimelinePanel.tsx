"use client";

import Panel from "@/components/shared/Panel";
import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";
import type { EventInfo } from "@/types/lab";

const TYPE_LABEL: Record<string, string> = {
  sample_moved: "Sample moved",
  inventory_observation: "Inventory observed (sim camera)",
  inventory_lookup: "Inventory lookup",
  calculation_validated: "Calculation checked",
  sop_retrieved: "SOP retrieved",
  temperature_reading: "Temperature reading",
};

function sourceTone(src: string): "ok" | "info" | "warn" | "crit" | "default" {
  if (src === "sop_grounded" || src === "human_confirmed") return "ok";
  if (src === "camera_inferred" || src === "pending_confirmation") return "warn";
  if (src === "stale") return "crit";
  if (src === "observed_by_sensor" || src === "calculated" || src === "user_reported") return "info";
  return "default";
}

function ago(ts?: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(diff)) return "";
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function TimelinePanel() {
  const events = useLabStore((s) => s.events);
  const incidents = useLabStore((s) => s.incidents);
  const recover = useLabStore((s) => s.recoverFreezer);

  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const recent: EventInfo[] = [...events].slice(-12).reverse();

  return (
    <Panel title="Activity & Incidents">
      {openIncidents.length > 0 && (
        <div className="incident-list">
          {openIncidents.map((i) => (
            <div key={i.incident_id} className="incident-card">
              <div className="incident-head">
                <span className="incident-id">{i.incident_id}</span>
                <Badge tone={i.severity === "critical" || i.severity === "high" ? "crit" : "warn"}>
                  {i.severity}
                </Badge>
              </div>
              <div className="incident-body">
                {i.type.replace(/_/g, " ")} on {i.equipment_id} — {i.current_value} vs {i.threshold}
              </div>
              {i.equipment_id === "freezer" && (
                <button className="btn small" onClick={recover}>
                  Mark recovered
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {recent.length === 0 ? (
        <p style={{ color: "var(--dim)", fontSize: 13, margin: 0 }}>
          No backend activity yet. Actions you take here are logged with truth-state labels.
        </p>
      ) : (
        <div className="timeline">
          {recent.map((e) => (
            <div key={e.id} className="tl-row">
              <span className="tl-dot" data-tone={sourceTone(e.source_type)} />
              <div className="tl-main">
                <div className="tl-top">
                  <span className="tl-type">{TYPE_LABEL[e.type] ?? e.type.replace(/_/g, " ")}</span>
                  <span className="tl-time">{ago(e.timestamp)}</span>
                </div>
                <div className="tl-badges">
                  <Badge tone={sourceTone(e.source_type)}>{e.source_type}</Badge>
                  <Badge>{e.confidence}</Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
