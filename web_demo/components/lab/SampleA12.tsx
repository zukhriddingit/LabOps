"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";
import { SAMPLE_LOCATION_POS, SAMPLE_STATUS_HEX } from "@/lib/labObjects";
import type { SampleLocation, SampleStatus } from "@/types/lab";

// Lateral offset so A12 sits beside C17 and never exactly overlaps it.
export const A12_OFFSET: [number, number, number] = [0.45, 0, -0.05];

const POS: Record<SampleLocation, THREE.Vector3> = {
  Freezer: new THREE.Vector3(
    SAMPLE_LOCATION_POS["Freezer"][0] + A12_OFFSET[0],
    SAMPLE_LOCATION_POS["Freezer"][1],
    SAMPLE_LOCATION_POS["Freezer"][2] + A12_OFFSET[2]
  ),
  "Bench 2": new THREE.Vector3(
    SAMPLE_LOCATION_POS["Bench 2"][0] + A12_OFFSET[0],
    SAMPLE_LOCATION_POS["Bench 2"][1],
    SAMPLE_LOCATION_POS["Bench 2"][2] + A12_OFFSET[2]
  ),
  "Backup Freezer": new THREE.Vector3(
    SAMPLE_LOCATION_POS["Backup Freezer"][0] + A12_OFFSET[0],
    SAMPLE_LOCATION_POS["Backup Freezer"][1],
    SAMPLE_LOCATION_POS["Backup Freezer"][2] + A12_OFFSET[2]
  ),
};

function a12Color(status: SampleStatus, location: SampleLocation, elapsed: number) {
  if (location === "Bench 2") {
    const t = Math.min(1, Math.max(0, elapsed / DEMO.limitSeconds));
    const amber = new THREE.Color(SAMPLE_STATUS_HEX.warning);
    const red = new THREE.Color(SAMPLE_STATUS_HEX.critical);
    return `#${amber.lerp(red, t).getHexString()}`;
  }
  return SAMPLE_STATUS_HEX[status];
}

export default function SampleA12() {
  const a = useLabStore((s) => s.sampleA12);
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);

  const target = POS[a.location];
  const color = a12Color(a.status, a.location, a.elapsedDemoSeconds);
  const pulsing = a.status === "warning" || a.status === "critical";
  const onBench = a.location === "Bench 2";

  useFrame((_, dt) => {
    if (group.current) group.current.position.lerp(target, Math.min(1, dt * 2.5));
    if (ring.current && pulsing) {
      const speed = a.status === "critical" ? 120 : 220;
      ring.current.scale.setScalar(1 + 0.3 * Math.sin(performance.now() / speed));
    }
  });

  const label = onBench
    ? `A12  ${Math.min(DEMO.limitSeconds, a.elapsedDemoSeconds)}/${a.allowedRoomTempMinutes}m`
    : "A12";

  return (
    <group ref={group} position={POS[a.location].toArray()}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.58, 48]} />
        <MeshTransmissionMaterial transmissionSampler transmission={1} thickness={0.22} roughness={0.06} ior={1.46} chromaticAberration={0.03} resolution={256} samples={6} color="#eaf6ff" />
      </mesh>
      <mesh position={[0, -0.33, 0]}>
        <coneGeometry args={[0.13, 0.14, 48]} />
        <MeshTransmissionMaterial transmissionSampler transmission={1} thickness={0.18} roughness={0.06} ior={1.46} chromaticAberration={0.03} resolution={256} samples={6} color="#eaf6ff" />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.115, 0.1, 0.3, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.112, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.11, 32]} />
        <meshStandardMaterial color="#11223d" metalness={0.6} roughness={0.32} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.14]}>
        <boxGeometry args={[0.21, 0.16, 0.012]} />
        <meshStandardMaterial color="#f4f8ff" roughness={0.7} />
      </mesh>
      {pulsing && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[0.34, 0.44, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
      <Text position={[0, 0.76, 0]} fontSize={0.16} color={color} anchorX="center" outlineWidth={0.005} outlineColor="#0a1422">
        {label}
      </Text>
    </group>
  );
}
