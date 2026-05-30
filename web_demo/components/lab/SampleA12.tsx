"use client";

import { Text, MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { SAMPLE_LOCATION_POS, SAMPLE_STATUS_HEX } from "@/lib/labObjects";

const A12_POS: [number, number, number] = [
  SAMPLE_LOCATION_POS["Backup Freezer"][0] - 0.34,
  SAMPLE_LOCATION_POS["Backup Freezer"][1],
  SAMPLE_LOCATION_POS["Backup Freezer"][2] - 0.08,
];

export const A12_PIN_POS: [number, number, number] = [
  A12_POS[0],
  A12_POS[1] + 1.2,
  A12_POS[2],
];

const A12_COLOR = SAMPLE_STATUS_HEX.stabilized;

export default function SampleA12() {
  return (
    <group position={A12_POS}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.58, 48]} />
        <MeshTransmissionMaterial
          transmissionSampler
          transmission={1}
          thickness={0.22}
          roughness={0.06}
          ior={1.46}
          chromaticAberration={0.03}
          resolution={256}
          samples={6}
          color="#eaf6ff"
        />
      </mesh>
      <mesh position={[0, -0.33, 0]}>
        <coneGeometry args={[0.13, 0.14, 48]} />
        <MeshTransmissionMaterial
          transmissionSampler
          transmission={1}
          thickness={0.18}
          roughness={0.06}
          ior={1.46}
          chromaticAberration={0.03}
          resolution={256}
          samples={6}
          color="#eaf6ff"
        />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.115, 0.1, 0.3, 32]} />
        <meshStandardMaterial color={A12_COLOR} emissive={A12_COLOR} emissiveIntensity={0.45} roughness={0.3} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.112, 32]} />
        <meshStandardMaterial color={A12_COLOR} emissive={A12_COLOR} emissiveIntensity={0.8} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.11, 32]} />
        <meshStandardMaterial color="#11223d" metalness={0.6} roughness={0.32} envMapIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.14]}>
        <boxGeometry args={[0.21, 0.16, 0.012]} />
        <meshStandardMaterial color="#f4f8ff" roughness={0.7} />
      </mesh>
      <Text position={[0, 0.76, 0]} fontSize={0.18} color={A12_COLOR} anchorX="center" outlineWidth={0.005} outlineColor="#0a1422">
        A12
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[0.3, 0.38, 48]} />
        <meshBasicMaterial color={A12_COLOR} transparent opacity={0.42} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
