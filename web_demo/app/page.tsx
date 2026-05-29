"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import StatusPanel from "@/components/lab/StatusPanel";
import InventoryPanel from "@/components/lab/InventoryPanel";
import MessagePanel from "@/components/lab/MessagePanel";
import DemoControls from "@/components/lab/DemoControls";
import TranscriptPanel from "@/components/lab/TranscriptPanel";
import { useLabStore } from "@/store/labStore";

// The R3F Canvas can't server-render — load it client-only.
const LabScene = dynamic(() => import("@/components/lab/LabScene"), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: "#8094bd" }}>Loading lab…</div>,
});

export default function Page() {
  const pollState = useLabStore((s) => s.pollState);
  const tick = useLabStore((s) => s.tick);

  // Backend health poll (sets connected/disconnected).
  useEffect(() => {
    pollState();
    const id = setInterval(pollState, 5000);
    return () => clearInterval(id);
  }, [pollState]);

  // Fast demo clock: 1 tick/sec (20 lab min ≈ 20 s).
  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo">🧪 LabOps Guardian</span>
        <span className="subtitle">protocol-aware lab coworker · 3D command center</span>
      </header>

      <main className="layout">
        <section className="scene">
          <LabScene />
        </section>
        <aside className="panels">
          <StatusPanel />
          <InventoryPanel />
          <MessagePanel />
          <DemoControls />
        </aside>
      </main>

      <TranscriptPanel />
    </div>
  );
}
