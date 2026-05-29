import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import LabScene from "./components/LabScene";
import StatusPanel from "./components/StatusPanel";
import InventoryPanel from "./components/InventoryPanel";
import DemoControls from "./components/DemoControls";
import TranscriptPanel from "./components/TranscriptPanel";
import { getState, moveSample, MOCK_STATE } from "./api";
import type { LabState } from "./types";

export type AlertLevel = "ok" | "warning" | "critical";
export type SampleSpot = "freezer" | "bench";

// Fast mode: the 20-minute limit is simulated in 20 seconds for the live demo.
const LIMIT_MINUTES = 20;
const FAST_SECONDS = 20;

export default function App() {
  const [state, setState] = useState<LabState>(MOCK_STATE);
  const [connected, setConnected] = useState(false);
  const [spot, setSpot] = useState<SampleSpot>("freezer");
  const [fastMode, setFastMode] = useState(true);
  const [elapsed, setElapsed] = useState(0); // simulated minutes at room temp
  const [running, setRunning] = useState(false);
  const [alert, setAlert] = useState<AlertLevel>("ok");
  const [messageStatus, setMessageStatus] = useState<string>("none");
  const tick = useRef<number | null>(null);

  // Poll backend state; fall back to mock when unreachable.
  const refresh = useCallback(async () => {
    try {
      const s = await getState();
      setState(s);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  // Room-temp timer.
  useEffect(() => {
    if (!running) return;
    const stepMinutes = fastMode ? LIMIT_MINUTES / FAST_SECONDS : 1;
    const intervalMs = 1000;
    tick.current = window.setInterval(() => {
      setElapsed((e) => {
        const next = e + stepMinutes;
        if (next >= LIMIT_MINUTES) setAlert("critical");
        else if (next >= LIMIT_MINUTES - 2) setAlert("warning");
        return next;
      });
    }, intervalMs);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running, fastMode]);

  const moveToBench = useCallback(async () => {
    setSpot("bench");
    setElapsed(0);
    setAlert("ok");
    setRunning(true);
    try {
      await moveSample("C17", {
        from_location: "Freezer B",
        to_location: "Bench 2",
        from_temperature: "-60C",
        allowed_room_temp_minutes: LIMIT_MINUTES,
      });
      await refresh();
    } catch {
      setConnected(false);
    }
  }, [refresh]);

  const reset = useCallback(() => {
    setSpot("freezer");
    setElapsed(0);
    setAlert("ok");
    setRunning(false);
    setMessageStatus("none");
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">🧪 LabOps Guardian</span>
        <span className="subtitle">protocol-aware lab coworker · command center</span>
        <span className={`conn ${connected ? "online" : "offline"}`}>
          {connected ? "● backend connected" : "○ backend disconnected (mock)"}
        </span>
      </header>

      <main className="layout">
        <section className="scene">
          <Canvas camera={{ position: [6, 5, 8], fov: 50 }} shadows>
            <color attach="background" args={["#0a0e1a"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
            <LabScene spot={spot} alert={alert} elapsed={elapsed} limit={LIMIT_MINUTES} />
            <OrbitControls enablePan={false} minDistance={5} maxDistance={16} />
          </Canvas>
        </section>

        <aside className="panels">
          <StatusPanel
            state={state}
            connected={connected}
            spot={spot}
            elapsed={elapsed}
            limit={LIMIT_MINUTES}
            alert={alert}
            messageStatus={messageStatus}
          />
          <InventoryPanel state={state} />
          <DemoControls
            onMove={moveToBench}
            onWarning={() => {
              setElapsed(LIMIT_MINUTES - 2);
              setAlert("warning");
            }}
            onCritical={() => {
              setElapsed(LIMIT_MINUTES);
              setAlert("critical");
            }}
            onMessage={(s) => setMessageStatus(s)}
            onReset={reset}
            fastMode={fastMode}
            setFastMode={setFastMode}
          />
        </aside>
      </main>

      <TranscriptPanel />
    </div>
  );
}
