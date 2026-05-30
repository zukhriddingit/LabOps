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
    simulateExcursion,
    runDemo,
    demoRunning,
    reset,
  } = useLabStore();

  const onBench = sample.location === "Bench 2";

  return (
    <Panel title="Demo Controls" className="controls">
      <button className="btn primary" onClick={runDemo} disabled={demoRunning}>
        {demoRunning ? "Running scripted demo..." : "Run guided demo"}
      </button>
      <button className="btn primary" onClick={moveToBench} disabled={onBench || demoRunning}>
        Move C17 to Bench
      </button>
      <button className="btn" onClick={triggerWarning} disabled={demoRunning}>
        Trigger 18-min warning
      </button>
      <button className="btn" onClick={triggerCritical} disabled={demoRunning}>
        Trigger 20-min escalation
      </button>
      <button className="btn" onClick={findTubes} disabled={demoRunning}>
        Find 15 mL tubes
      </button>
      <button className="btn" onClick={draftMessage} disabled={demoRunning}>
        Draft emergency message
      </button>
      <button className="btn" onClick={moveToBackupFreezer} disabled={demoRunning}>
        Move C17 to Backup Freezer
      </button>
      <button className="btn" onClick={simulateExcursion} disabled={demoRunning}>
        Simulate freezer excursion
      </button>
      <button className="btn ghost" onClick={reset}>
        Reset demo
      </button>
    </Panel>
  );
}
