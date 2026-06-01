"use client";

import Badge from "@/components/shared/Badge";
import { useLabStore } from "@/store/labStore";
import { LAB_OBJECTS } from "@/lib/labObjects";
import { DEMO } from "@/lib/mockData";

export default function InfoCard() {
  const selectedPinId = useLabStore((s) => s.selectedPinId);
  const setSelectedPin = useLabStore((s) => s.setSelectedPin);
  const sample = useLabStore((s) => s.sample);
  const inventory = useLabStore((s) => s.inventory);
  const messageStatus = useLabStore((s) => s.messageStatus);
  const moveToBench = useLabStore((s) => s.moveToBench);
  const moveToFreezer = useLabStore((s) => s.moveToFreezer);
  const moveToBackupFreezer = useLabStore((s) => s.moveToBackupFreezer);
  const sampleA12 = useLabStore((s) => s.sampleA12);
  const moveA12 = useLabStore((s) => s.moveA12);
  const freezerOpen = useLabStore((s) => s.freezerOpen);
  const toggleFreezerDoor = useLabStore((s) => s.toggleFreezerDoor);
  const findTubes = useLabStore((s) => s.findTubes);
  const draftMessage = useLabStore((s) => s.draftMessage);
  const equipment = useLabStore((s) => s.equipment);
  const incidents = useLabStore((s) => s.incidents);

  if (!selectedPinId) return null;

  // ── Sample C17 (live) ──────────────────────────────────────────────
  if (selectedPinId === "sample") {
    const onBench = sample.location === "Bench 2";
    const timer = onBench
      ? `${Math.min(DEMO.limitSeconds, sample.elapsedDemoSeconds)} / ${sample.allowedRoomTempMinutes} min`
      : "—";
    return (
      <Card title={sample.label} code={sample.id} onClose={() => setSelectedPin(null)}>
        <Line k="Location" v={sample.location} />
        <Line k="Status" v={<Badge tone={tone(sample.status)}>{sample.status}</Badge>} />
        <Line k="Room-temp" v={timer} />
        <Line k="Storage" v={sample.storageTemperature} />
        <div className="card-actions">
          <button className="btn primary" onClick={moveToBench} disabled={onBench}>
            Move to Bench
          </button>
          <button className="btn" onClick={moveToFreezer} disabled={sample.location === "Freezer"}>
            Move to Freezer
          </button>
          <button className="btn" onClick={moveToBackupFreezer} disabled={sample.location === "Backup Freezer"}>
            Move to Backup Freezer
          </button>
        </div>
      </Card>
    );
  }

  if (selectedPinId === "sample_a12") {
    const a = sampleA12;
    const onBenchA = a.location === "Bench 2";
    const timerA = onBenchA
      ? `${Math.min(DEMO.limitSeconds, a.elapsedDemoSeconds)} / ${a.allowedRoomTempMinutes} min`
      : "—";
    return (
      <Card title={a.label} code="A12" onClose={() => setSelectedPin(null)}>
        <Line k="Location" v={a.location} />
        <Line k="Status" v={<Badge tone={tone(a.status)}>{a.status}</Badge>} />
        <Line k="Room-temp" v={timerA} />
        <Line k="Storage" v={a.storageTemperature} />
        <div className="card-actions">
          <button className="btn primary" onClick={() => moveA12("Bench 2")} disabled={onBenchA}>
            Move to Bench
          </button>
          <button className="btn" onClick={() => moveA12("Freezer")} disabled={a.location === "Freezer"}>
            Move to Freezer
          </button>
          <button className="btn" onClick={() => moveA12("Backup Freezer")} disabled={a.location === "Backup Freezer"}>
            Move to Backup Freezer
          </button>
        </div>
      </Card>
    );
  }

  const obj = LAB_OBJECTS.find((o) => o.id === selectedPinId);
  if (!obj) return null;

  // ── Inventory shelf ────────────────────────────────────────────────
  if (obj.id === "shelf_a") {
    return (
      <Card title={obj.label} code={obj.code} onClose={() => setSelectedPin(null)}>
        <p className="card-desc">{obj.description}</p>
        {inventory ? (
          <>
            <Line k="Record" v={inventory.official_location} />
            <Line
              k="Sim count"
              v={
                <Badge tone="info">
                  {inventory.visible_count} {inventory.unit}
                </Badge>
              }
            />
            <Line k="Confidence" v={<Badge tone="warn">{inventory.confidence}</Badge>} />
            <p className="card-note">Simulated shelf counter — human confirmation recommended.</p>
          </>
        ) : (
          <div className="card-actions">
            <button className="btn primary" onClick={findTubes}>
              Find 15 mL tubes
            </button>
          </div>
        )}
      </Card>
    );
  }

  // ── PI / Postdoc station ───────────────────────────────────────────
  if (obj.id === "pi_postdoc") {
    return (
      <Card title={obj.label} code={obj.code} onClose={() => setSelectedPin(null)}>
        <p className="card-desc">{obj.description}</p>
        <Line k="Message" v={<Badge tone={messageStatus === "none" ? "default" : "info"}>{messageStatus}</Badge>} />
        <div className="card-actions">
          <button className="btn primary" onClick={draftMessage}>
            Draft emergency message
          </button>
        </div>
      </Card>
    );
  }

  // ── Everything else (incl. equipment with live sensor status) ──────
  const eq = equipment.find((e) => e.id === obj.id);
  const inc = incidents.find((i) => i.equipment_id === obj.id && i.status !== "resolved");
  return (
    <Card title={obj.label} code={obj.code} onClose={() => setSelectedPin(null)}>
      <p className="card-desc">{obj.description}</p>
      {eq && (
        <>
          {eq.current_temperature && <Line k="Temp" v={eq.current_temperature} />}
          <Line
            k="Status"
            v={
              <Badge tone={eq.status === "alarm" || eq.status === "error" ? "crit" : eq.status === "ok" ? "ok" : "info"}>
                {eq.status}
              </Badge>
            }
          />
          <Line k="Source" v={<Badge>{eq.source_type}</Badge>} />
          {inc && (
            <p className="card-note">
              ⛔ Incident {inc.incident_id}: {inc.type.replace(/_/g, " ")} — {inc.current_value} vs {inc.threshold} threshold (severity {inc.severity}).
            </p>
          )}
        </>
      )}
      {(obj.id === "freezer" || obj.id === "backup_freezer") && (
        <div className="card-actions">
          <button className="btn primary" onClick={() => toggleFreezerDoor(obj.id)}>
            {freezerOpen[obj.id] ? "Close door" : "Open door"}
          </button>
        </div>
      )}
    </Card>
  );
}

function tone(status: string): "ok" | "info" | "warn" | "crit" {
  if (status === "warning") return "warn";
  if (status === "critical") return "crit";
  if (status === "stored") return "info";
  return "ok";
}

function Card({
  title,
  code,
  onClose,
  children,
}: {
  title: string;
  code: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="info-card">
      <div className="info-card-head">
        <span className="info-code">{code}</span>
        <span className="info-title">{title}</span>
        <button className="info-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="info-card-body">{children}</div>
    </div>
  );
}

function Line({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="row">
      <span>{k}</span>
      <span className="val">{v}</span>
    </div>
  );
}
