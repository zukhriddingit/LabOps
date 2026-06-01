"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useLabStore } from "@/store/labStore";
import { DEMO } from "@/lib/mockData";
import { SAMPLE_LOCATION_POS, SAMPLE_STATUS_HEX } from "@/lib/labObjects";
import type { SampleLocation, SampleStatus } from "@/types/lab";

const LOCATION_POS: Record<SampleLocation, THREE.Vector3> = {
  "Freezer": new THREE.Vector3(...SAMPLE_LOCATION_POS["Freezer"]),
  "Bench 2": new THREE.Vector3(...SAMPLE_LOCATION_POS["Bench 2"]),
  "Backup Freezer": new THREE.Vector3(...SAMPLE_LOCATION_POS["Backup Freezer"]),
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
      {/* glass tube — refractive */}
      <mesh castShadow>
        <cylinderGeometry args={[0.17, 0.15, 0.62, 48]} />
        <MeshTransmissionMaterial
          transmissionSampler
          transmission={1}
          thickness={0.25}
          roughness={0.05}
          ior={1.46}
          chromaticAberration={0.03}
          anisotropy={0.1}
          distortion={0.0}
          temporalDistortion={0}
          resolution={256}
          samples={6}
          color="#eaf6ff"
        />
      </mesh>
      {/* conical tube bottom */}
      <mesh position={[0, -0.36, 0]}>
        <coneGeometry args={[0.15, 0.16, 48]} />
        <MeshTransmissionMaterial
          transmissionSampler
          transmission={1}
          thickness={0.2}
          roughness={0.05}
          ior={1.46}
          chromaticAberration={0.03}
          resolution={256}
          samples={6}
          color="#eaf6ff"
        />
      </mesh>
      {/* liquid (status colour) */}
      <mesh position={[0, -0.14, 0]}>
        <cylinderGeometry args={[0.135, 0.12, 0.34, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.3} toneMapped={false} />
      </mesh>
      {/* meniscus highlight at the liquid surface */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.132, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      {/* cap */}
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.12, 32]} />
        <meshStandardMaterial color="#12233e" metalness={0.6} roughness={0.3} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.03, 32]} />
        <meshStandardMaterial color="#1c3354" metalness={0.6} roughness={0.35} envMapIntensity={1.2} />
      </mesh>
      {/* label band */}
      <mesh position={[0, 0.02, 0.155]}>
        <boxGeometry args={[0.22, 0.18, 0.012]} />
        <meshStandardMaterial color="#f4f8ff" roughness={0.7} />
      </mesh>

      {pulsing && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[0.4, 0.52, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.75} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}

      {onBench && (
        <Text position={[0, 0.92, 0]} fontSize={0.2} color={color} anchorX="center" outlineWidth={0.006} outlineColor="#0a1422">
          {timerLabel}
        </Text>
      )}
    </group>
  );
}

function getSampleColor(status: SampleStatus, location: SampleLocation, elapsedDemoSeconds: number) {
  if (location === "Bench 2") {
    const t = Math.min(1, Math.max(0, elapsedDemoSeconds / DEMO.limitSeconds));
    const amber = new THREE.Color(SAMPLE_STATUS_HEX.warning);
    const red = new THREE.Color(SAMPLE_STATUS_HEX.critical);
    return `#${amber.lerp(red, t).getHexString()}`;
  }

  return SAMPLE_STATUS_HEX[status];
}
