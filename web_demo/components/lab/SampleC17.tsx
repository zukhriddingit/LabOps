"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";
import { SAMPLE_LOCATION_POS } from "@/lib/labObjects";
import type { SampleLocation, SampleStatus } from "@/types/lab";

const LOCATION_POS: Record<SampleLocation, THREE.Vector3> = {
  "Freezer": new THREE.Vector3(...SAMPLE_LOCATION_POS["Freezer"]),
  "Bench 2": new THREE.Vector3(...SAMPLE_LOCATION_POS["Bench 2"]),
  "Backup Freezer": new THREE.Vector3(...SAMPLE_LOCATION_POS["Backup Freezer"]),
};

const STATUS_COLOR: Record<SampleStatus, string> = {
  stored: "#4aa8ff",
  stabilized: "#36d1a6",
  tracking: "#ffb020",
  warning: "#ffb020",
  critical: "#ff3b5c",
};

export default function SampleC17() {
  const sample = useLabStore((s) => s.sample);
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);

  const target = LOCATION_POS[sample.location];
  const color = getSampleColor(sample.status, sample.location, sample.elapsedDemoSeconds);
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
      {/* glass tube */}
      <mesh castShadow>
        <cylinderGeometry args={[0.17, 0.15, 0.62, 24]} />
        <meshPhysicalMaterial
          color="#e7f5ff"
          metalness={0}
          roughness={0.02}
          transmission={0.38}
          thickness={0.16}
          transparent
          opacity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.06}
        />
      </mesh>
      {/* conical tube bottom */}
      <mesh position={[0, -0.36, 0]}>
        <coneGeometry args={[0.15, 0.16, 24]} />
        <meshPhysicalMaterial
          color="#e7f5ff"
          metalness={0}
          roughness={0.02}
          transmission={0.36}
          thickness={0.14}
          transparent
          opacity={0.48}
          clearcoat={1}
          clearcoatRoughness={0.06}
        />
      </mesh>
      {/* liquid (status colour) */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.13, 0.12, 0.34, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} />
      </mesh>
      {/* cap */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.12, 24]} />
        <meshStandardMaterial color="#11203a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* label band */}
      <mesh position={[0, 0.02, 0.16]}>
        <boxGeometry args={[0.22, 0.18, 0.01]} />
        <meshStandardMaterial color="#f2f6ff" roughness={0.8} />
      </mesh>

      {pulsing && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[0.4, 0.52, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}

      {onBench && (
        <Text position={[0, 0.92, 0]} fontSize={0.2} color={color} anchorX="center">
          {timerLabel}
        </Text>
      )}
    </group>
  );
}

function getSampleColor(status: SampleStatus, location: SampleLocation, elapsedDemoSeconds: number) {
  if (location === "Bench 2") {
    const t = Math.min(1, Math.max(0, elapsedDemoSeconds / DEMO.limitSeconds));
    const amber = new THREE.Color("#ffb020");
    const red = new THREE.Color("#ff3b5c");
    return `#${amber.lerp(red, t).getHexString()}`;
  }

  return STATUS_COLOR[status];
}
