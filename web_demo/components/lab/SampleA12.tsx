"use client";

import { Text } from "@react-three/drei";
import * as THREE from "three";
import { SAMPLE_LOCATION_POS } from "@/lib/labObjects";

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

export default function SampleA12() {
  return (
    <group position={A12_POS}>
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.58, 24]} />
        <meshPhysicalMaterial
          color="#e7f5ff"
          metalness={0}
          roughness={0.03}
          transmission={0.34}
          thickness={0.14}
          transparent
          opacity={0.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh position={[0, -0.33, 0]}>
        <coneGeometry args={[0.13, 0.14, 24]} />
        <meshPhysicalMaterial
          color="#e7f5ff"
          metalness={0}
          roughness={0.03}
          transmission={0.3}
          thickness={0.12}
          transparent
          opacity={0.46}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh position={[0, -0.11, 0]}>
        <cylinderGeometry args={[0.11, 0.1, 0.3, 24]} />
        <meshStandardMaterial color="#36d1a6" emissive="#36d1a6" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.31, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.11, 24]} />
        <meshStandardMaterial color="#10223d" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0.145]}>
        <boxGeometry args={[0.21, 0.16, 0.01]} />
        <meshStandardMaterial color="#f2f6ff" roughness={0.8} />
      </mesh>
      <Text position={[0, 0.76, 0]} fontSize={0.18} color="#36d1a6" anchorX="center">
        A12
      </Text>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <ringGeometry args={[0.3, 0.38, 32]} />
        <meshBasicMaterial color="#36d1a6" transparent opacity={0.42} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
