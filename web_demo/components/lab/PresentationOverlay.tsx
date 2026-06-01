"use client";

import { useLabStore } from "@/store/labStore";

// Cinematic caption bar shown during the narrated guided tour (Run Demo).
export default function PresentationOverlay() {
  const demoRunning = useLabStore((s) => s.demoRunning);
  const caption = useLabStore((s) => s.demoCaption);
  const step = useLabStore((s) => s.demoStep);
  const total = useLabStore((s) => s.demoTotal);
  const stopDemo = useLabStore((s) => s.stopDemo);

  if (!demoRunning) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 88,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 14,
        maxWidth: "min(760px, 92vw)",
        padding: "12px 16px",
        borderRadius: 14,
        background: "rgba(10, 16, 26, 0.82)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(120, 180, 255, 0.25)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.45)",
        color: "#eaf2ff",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color: "#7ec8ff",
          whiteSpace: "nowrap",
        }}
      >
        ▶ PRESENTING {step}/{total}
      </span>
      <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>{caption}</span>
      <button
        onClick={stopDemo}
        title="Stop the guided tour"
        style={{
          marginLeft: "auto",
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.06)",
          color: "#eaf2ff",
          borderRadius: 9,
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Stop ✕
      </button>
    </div>
  );
}
