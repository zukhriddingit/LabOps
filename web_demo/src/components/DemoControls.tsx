import { findInventory, sendEmergencyMessage } from "../api";

export default function DemoControls({
  onMove,
  onWarning,
  onCritical,
  onMessage,
  onReset,
  fastMode,
  setFastMode,
}: {
  onMove: () => void;
  onWarning: () => void;
  onCritical: () => void;
  onMessage: (status: string) => void;
  onReset: () => void;
  fastMode: boolean;
  setFastMode: (v: boolean) => void;
}) {
  const lookupTubes = async () => {
    try {
      const r: any = await findInventory("15 mL tubes");
      onMessage(`tubes: ${r.location ?? "?"} (${r.confidence ?? "?"})`);
    } catch {
      onMessage("inventory lookup failed (backend down)");
    }
  };

  const draftMessage = async () => {
    try {
      const r: any = await sendEmergencyMessage(
        "postdoc",
        "Sample C17 is near the 20-minute room-temp limit on Bench 2. Assistance needed.",
        false
      );
      onMessage(`message ${r.status ?? "draft"}`);
    } catch {
      onMessage("draft (offline)");
    }
  };

  return (
    <div className="panel controls">
      <h3>Demo controls</h3>
      <button className="btn primary" onClick={onMove}>
        Move C17 to Bench
      </button>
      <button className="btn" onClick={onWarning}>
        Trigger 18-min warning
      </button>
      <button className="btn" onClick={onCritical}>
        Trigger 20-min escalation
      </button>
      <button className="btn" onClick={lookupTubes}>
        Inventory lookup
      </button>
      <button className="btn" onClick={draftMessage}>
        Draft emergency message
      </button>
      <button className="btn ghost" onClick={onReset}>
        Reset demo
      </button>
      <label className="toggle">
        <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} />
        Fast mode (20 min → 20 s)
      </label>
    </div>
  );
}
