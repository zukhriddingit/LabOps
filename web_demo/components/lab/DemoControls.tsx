"use client";

import Panel from "@/components/shared/Panel";
import { useLabStore } from "@/store/labStore";

export default function DemoControls() {
  const {
    sample,
    moveToBench,
    triggerWarning,
    triggerCritical,
    findTubes,
    draftMessage,
    moveToBackupFreezer,
    reset,
  } = useLabStore();

  const onBench = sample.location === "Bench 2";

  return (
    <Panel title="Demo Controls" className="controls">
      <button className="btn primary" onClick={moveToBench} disabled={onBench}>
        Move C17 to Bench
      </button>
      <button className="btn" onClick={triggerWarning}>
        Trigger 18-min warning
      </button>
      <button className="btn" onClick={triggerCritical}>
        Trigger 20-min escalation
      </button>
      <button className="btn" onClick={findTubes}>
        Find 15 mL tubes
      </button>
      <button className="btn" onClick={draftMessage}>
        Draft emergency message
      </button>
      <button className="btn" onClick={moveToBackupFreezer}>
        Move C17 to Backup Freezer
      </button>
      <button className="btn ghost" onClick={reset}>
        Reset demo
      </button>
    </Panel>
  );
}
