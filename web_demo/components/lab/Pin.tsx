"use client";

import { Html } from "@react-three/drei";
import type { Tone, Vec3 } from "@/lib/labObjects";

export default function Pin({
  position,
  code,
  tone,
  active,
  pulse = false,
  onClick,
}: {
  position: Vec3;
  code: string;
  tone: Tone;
  active: boolean;
  pulse?: boolean;
  onClick: () => void;
}) {
  return (
    <Html position={position} center zIndexRange={[12, 0]} className="pin-html">
      <button
        className={`pin tone-${tone} ${active ? "active" : ""} ${pulse ? "pulse" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <span className="pin-code">{code}</span>
        <span className="pin-dot" />
      </button>
    </Html>
  );
}
