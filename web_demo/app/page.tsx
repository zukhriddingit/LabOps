"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import HudBar from "@/components/lab/HudBar";
import Dashboard from "@/components/lab/Dashboard";
import InfoCard from "@/components/lab/InfoCard";
import CameraControls from "@/components/lab/CameraControls";
import VoicePanel from "@/components/lab/VoicePanel";
import { useLabStore } from "@/store/labStore";

// The R3F Canvas can't server-render — load it client-only.
const LabScene = dynamic(() => import("@/components/lab/LabScene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Loading lab…</div>,
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
    <div className="stage">
      <div className="scene-full">
        <LabScene />
      </div>

      <div className="brand-overlay">
        <span className="brand-name">🧪 LabOps Guardian</span>
        <span className="brand-tag">CARDIOVASCULAR LAB · BENCH 2 · LIVE</span>
        <span className="brand-hint">WASD / arrows to move · shift to run · drag to look · click a pin</span>
      </div>

      <InfoCard />
      <VoicePanel />
      <CameraControls />
      <Dashboard />
      <HudBar />
    </div>
  );
}
