"use client";

import { RoundedBox } from "@react-three/drei";
import type { Vec3 } from "@/lib/labObjects";

export default function Equipment({
  position,
  size,
  color,
  emissive,
  highlighted = false,
}: {
  position: Vec3;
  size: Vec3;
  color: string;
  emissive?: string;
  highlighted?: boolean;
}) {
  return (
    <group position={position}>
      <RoundedBox args={size} radius={0.08} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          metalness={0.35}
          roughness={0.45}
          emissive={highlighted ? "#36d1a6" : emissive ?? "#000000"}
          emissiveIntensity={highlighted ? 0.85 : emissive ? 0.35 : 0}
        />
      </RoundedBox>

      {highlighted && (
        <mesh>
          <boxGeometry args={[size[0] + 0.2, size[1] + 0.2, size[2] + 0.2]} />
          <meshBasicMaterial color="#36d1a6" wireframe transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
