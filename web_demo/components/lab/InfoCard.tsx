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
  const moveToBackupFreezer = useLabStore((s) => s.moveToBackupFreezer);
  const findTubes = useLabStore((s) => s.findTubes);
  const draftMessage = useLabStore((s) => s.draftMessage);

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
          <button className="btn" onClick={moveToBackupFreezer}>
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

  // ── Everything else (incl. simulated camera) ───────────────────────
  return (
    <Card title={obj.label} code={obj.code} onClose={() => setSelectedPin(null)}>
      <p className="card-desc">{obj.description}</p>
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
