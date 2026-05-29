"use client";

import { Text } from "@react-three/drei";

type Vec3 = [number, number, number];

export default function Equipment({
  position,
  size = [1.4, 2, 1.4],
  color,
  label,
  emissive,
  highlighted = false,
}: {
  position: Vec3;
  size?: Vec3;
  color: string;
  label: string;
  emissive?: string;
  highlighted?: boolean;
}) {
  const [x, y, z] = position;
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={highlighted ? "#36d1a6" : emissive ?? "#000000"}
          emissiveIntensity={highlighted ? 0.7 : emissive ? 0.4 : 0}
        />
      </mesh>

      {/* glowing selection outline */}
      {highlighted && (
        <mesh>
          <boxGeometry args={[size[0] + 0.18, size[1] + 0.18, size[2] + 0.18]} />
          <meshBasicMaterial color="#36d1a6" wireframe transparent opacity={0.85} />
        </mesh>
      )}

      <Text
        position={[0, size[1] / 2 + 0.35, 0]}
        fontSize={0.3}
        color="#cfe3ff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}
