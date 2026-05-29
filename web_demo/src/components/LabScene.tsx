import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { AlertLevel, SampleSpot } from "../App";

const FREEZER_POS = new THREE.Vector3(-4, 1.2, 0);
const BENCH_POS = new THREE.Vector3(3, 1.0, 1);

function Label({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Text position={position} fontSize={0.32} color="#cfe3ff" anchorX="center" anchorY="middle">
      {text}
    </Text>
  );
}

function Box({
  position,
  size,
  color,
  emissive,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} emissive={emissive ?? "#000000"} emissiveIntensity={emissive ? 0.5 : 0} />
    </mesh>
  );
}

function Sample({ spot, alert, elapsed, limit }: { spot: SampleSpot; alert: AlertLevel; elapsed: number; limit: number }) {
  const group = useRef<THREE.Group>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const target = spot === "bench" ? BENCH_POS : FREEZER_POS;
  const vialColor = alert === "critical" ? "#ff3b5c" : alert === "warning" ? "#ffb020" : "#36d1a6";

  useFrame((_, dt) => {
    if (group.current) group.current.position.lerp(target, Math.min(1, dt * 2.5));
    if (ring.current) {
      const s = 1 + 0.25 * Math.sin(performance.now() / 200);
      ring.current.scale.setScalar(alert === "ok" ? 1 : s);
    }
  });

  const remaining = Math.max(0, limit - elapsed);
  const timer = spot === "bench" ? `${Math.floor(elapsed)}m / ${limit}m` : "in storage";

  return (
    <group ref={group} position={FREEZER_POS.toArray()}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.6, 16]} />
        <meshStandardMaterial color={vialColor} emissive={vialColor} emissiveIntensity={0.6} />
      </mesh>
      {alert !== "ok" && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color={vialColor} transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}
      <Text position={[0, 0.7, 0]} fontSize={0.26} color="#ffffff" anchorX="center">
        C17
      </Text>
      <Text position={[0, 1.0, 0]} fontSize={0.2} color={vialColor} anchorX="center">
        {timer}
      </Text>
    </group>
  );
}

export default function LabScene({
  spot,
  alert,
  elapsed,
  limit,
}: {
  spot: SampleSpot;
  alert: AlertLevel;
  elapsed: number;
  limit: number;
}) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[24, 18]} />
        <meshStandardMaterial color="#11182b" />
      </mesh>

      {/* Freezer B */}
      <Box position={[-4, 1.5, 0]} size={[1.6, 3, 1.6]} color="#1b3a6b" emissive="#0d6efd" />
      <Label position={[-4, 3.3, 0]} text="Freezer B  -60°C" />

      {/* Bench 2 */}
      <Box position={[3, 0.5, 1]} size={[3.5, 1, 2]} color="#2a2f45" />
      <Label position={[3, 1.4, 1]} text="Bench 2" />

      {/* Centrifuge 2 */}
      <Box position={[5.5, 0.6, -2]} size={[1, 1.2, 1]} color="#3a4668" />
      <Label position={[5.5, 1.5, -2]} text="Centrifuge 2" />

      {/* Microscope 1 */}
      <Box position={[1, 0.6, -2.5]} size={[0.8, 1.2, 0.8]} color="#46406b" />
      <Label position={[1, 1.5, -2.5]} text="Microscope 1" />

      {/* Storage Shelf A */}
      <Box position={[-4, 1, 3.5]} size={[2, 2, 0.6]} color="#243049" />
      <Label position={[-4, 2.4, 3.5]} text="Shelf A" />

      {/* Chemical Cabinet 1 */}
      <Box position={[-1.5, 1, 4]} size={[1.4, 2, 0.6]} color="#2c3a2a" />
      <Label position={[-1.5, 2.4, 4]} text="Chem Cabinet 1" />

      {/* Camera / sensor node */}
      <mesh position={[0, 4.5, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#9aa7c7" emissive="#5cf" emissiveIntensity={0.5} />
      </mesh>
      <Label position={[0, 4.9, 0]} text="Camera node" />

      {/* PI / postdoc station */}
      <Box position={[6.5, 0.9, 3]} size={[1, 1.8, 0.4]} color="#5a2a4a" />
      <Label position={[6.5, 2.1, 3]} text="PI / Postdoc" />

      <Sample spot={spot} alert={alert} elapsed={elapsed} limit={limit} />
    </group>
  );
}
