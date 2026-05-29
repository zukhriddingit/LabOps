"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import Equipment from "./Equipment";
import SampleC17 from "./SampleC17";
import { useLabStore } from "@/store/labStore";

function Room() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#11182b" />
      </mesh>
      {/* back wall */}
      <mesh position={[0, 3, -5]} receiveShadow>
        <planeGeometry args={[26, 8]} />
        <meshStandardMaterial color="#0c1322" />
      </mesh>
      {/* side wall */}
      <mesh position={[-9, 3, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#0c1322" />
      </mesh>
    </group>
  );
}

export default function LabScene() {
  const highlighted = useLabStore((s) => s.highlighted);

  return (
    <Canvas camera={{ position: [7, 6, 9], fov: 50 }} shadows>
      <color attach="background" args={["#0a0e1a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 9, 5]} intensity={1.15} castShadow />
      <pointLight position={[-5, 4, 3]} intensity={0.4} color="#4aa8ff" />

      <Room />

      {/* 1. Freezer B */}
      <Equipment position={[-4.5, 1.5, -1]} size={[1.6, 3, 1.6]} color="#1b3a6b" emissive="#0d6efd" label="Freezer B  -60°C" />
      {/* 2. Backup Freezer D */}
      <Equipment position={[-4.5, 1.5, 2.5]} size={[1.6, 3, 1.6]} color="#1b3a5b" emissive="#0d6efd" label="Backup Freezer D" />
      {/* 3. Bench 2 */}
      <Equipment position={[2.5, 0.5, 1]} size={[3.6, 1, 2]} color="#2a2f45" label="Bench 2" />
      {/* 5. Inventory Shelf A (highlighted on Find tubes) */}
      <Equipment position={[-1, 1, 4]} size={[2, 2, 0.6]} color="#243049" label="Shelf A" highlighted={highlighted === "shelf_a"} />
      {/* 6. Chemical Cabinet 1 */}
      <Equipment position={[1.5, 1, 4]} size={[1.4, 2, 0.6]} color="#2c3a2a" label="Chem Cabinet 1" />
      {/* 7. Centrifuge 2 */}
      <Equipment position={[5.5, 0.6, -2]} size={[1, 1.2, 1]} color="#3a4668" label="Centrifuge 2" />
      {/* 8. Microscope 1 */}
      <Equipment position={[4.5, 0.6, 3]} size={[0.8, 1.2, 0.8]} color="#46406b" label="Microscope 1" />
      {/* 10. PI / Postdoc message station */}
      <Equipment position={[7, 0.9, 0]} size={[1, 1.8, 0.4]} color="#5a2a4a" label="PI / Postdoc" />

      {/* 9. Simulated camera / shelf sensor node */}
      <group position={[-1, 4.2, 4]}>
        <mesh>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshStandardMaterial color="#9aa7c7" emissive="#5cf" emissiveIntensity={0.6} />
        </mesh>
        <Text position={[0, 0.4, 0]} fontSize={0.22} color="#7cf" anchorX="center">
          Sim camera (no CV)
        </Text>
      </group>

      {/* 4. Sample C17 */}
      <SampleC17 />

      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} />
    </Canvas>
  );
}
