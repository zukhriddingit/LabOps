"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";
import type { SampleLocation, SampleStatus } from "@/types/lab";

const LOCATION_POS: Record<SampleLocation, THREE.Vector3> = {
  "Freezer B": new THREE.Vector3(-4.5, 1.4, -1),
  "Bench 2": new THREE.Vector3(2.5, 1.2, 1),
  "Backup Freezer D": new THREE.Vector3(-4.5, 1.4, 2.5),
};

const STATUS_COLOR: Record<SampleStatus, string> = {
  stored: "#4aa8ff",
  stabilized: "#36d1a6",
  tracking: "#36d1a6",
  warning: "#ffb020",
  critical: "#ff3b5c",
};

export default function SampleC17() {
  const sample = useLabStore((s) => s.sample);
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);

  const target = LOCATION_POS[sample.location];
  const color = STATUS_COLOR[sample.status];
  const pulsing = sample.status === "warning" || sample.status === "critical";

  useFrame((_, dt) => {
    if (group.current) group.current.position.lerp(target, Math.min(1, dt * 2.5));
    if (ring.current && pulsing) {
      const speed = sample.status === "critical" ? 120 : 220;
      const s = 1 + 0.3 * Math.sin(performance.now() / speed);
      ring.current.scale.setScalar(s);
    }
  });

  const onBench = sample.location === "Bench 2";
  const elapsedMin = Math.min(DEMO.limitSeconds, sample.elapsedDemoSeconds);
  const timerLabel = onBench
    ? `${elapsedMin} / ${sample.allowedRoomTempMinutes} min`
    : sample.status === "stabilized"
      ? "stabilized"
      : "in storage";

  return (
    <group ref={group} position={LOCATION_POS[sample.location].toArray()}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.6, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>

      {pulsing && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[0.4, 0.52, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Text position={[0, 0.7, 0]} fontSize={0.26} color="#ffffff" anchorX="center">
        {sample.id}
      </Text>
      <Text position={[0, 1.02, 0]} fontSize={0.2} color={color} anchorX="center">
        {timerLabel}
      </Text>
    </group>
  );
}
