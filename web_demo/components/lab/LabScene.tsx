"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows } from "@react-three/drei";
import Equipment from "./Equipment";
import SampleC17 from "./SampleC17";
import Pin from "./Pin";
import { useLabStore } from "@/store/labStore";
import { LAB_OBJECTS, SAMPLE_LOCATION_POS, type Tone, type Vec3 } from "@/lib/labObjects";
import type { SampleStatus } from "@/types/lab";

const STATUS_TONE: Record<SampleStatus, Tone> = {
  stored: "info",
  tracking: "ok",
  stabilized: "ok",
  warning: "warn",
  critical: "crit",
};

export default function LabScene() {
  const highlighted = useLabStore((s) => s.highlighted);
  const selectedPinId = useLabStore((s) => s.selectedPinId);
  const setSelectedPin = useLabStore((s) => s.setSelectedPin);
  const sample = useLabStore((s) => s.sample);

  const samplePos = SAMPLE_LOCATION_POS[sample.location];
  const samplePinPos: Vec3 = [samplePos[0], samplePos[1] + 1.35, samplePos[2]];

  return (
    <Canvas
      camera={{ position: [10, 8.5, 14], fov: 46 }}
      shadows
      dpr={[1, 2]}
      onPointerMissed={() => setSelectedPin(null)}
    >
      <color attach="background" args={["#070b16"]} />
      <fog attach="fog" args={["#070b16", 14, 38]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#9fc0ff", "#0a0e1a", 0.5]} />
      <directionalLight
        position={[7, 11, 6]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <pointLight position={[-6, 4, 4]} intensity={0.5} color="#4aa8ff" />
      <pointLight position={[6, 3, -3]} intensity={0.35} color="#36d1a6" />

      {/* floor */}
      <Grid
        position={[0, 0.01, 0]}
        args={[60, 60]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#16203a"
        sectionSize={5}
        sectionThickness={1.1}
        sectionColor="#27406e"
        fadeDistance={42}
        fadeStrength={1.2}
        infiniteGrid
        followCamera={false}
      />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.55} scale={46} blur={2.4} far={8} color="#000814" />

      {/* equipment + pins */}
      {LAB_OBJECTS.map((o) => {
        const pinY = o.position[1] + o.size[1] / 2 + (o.shape === "sphere" ? 0.5 : 0.6);
        const pinPos: Vec3 = [o.position[0], pinY, o.position[2]];
        return (
          <group key={o.id}>
            {o.shape === "sphere" ? (
              <mesh position={o.position}>
                <sphereGeometry args={[o.size[0], 20, 20]} />
                <meshStandardMaterial color={o.color} emissive={o.emissive ?? "#000"} emissiveIntensity={0.6} />
              </mesh>
            ) : (
              <Equipment
                position={o.position}
                size={o.size}
                color={o.color}
                emissive={o.emissive}
                highlighted={o.id === "shelf_a" && highlighted === "shelf_a"}
              />
            )}
            <Pin
              position={pinPos}
              code={o.code}
              tone={o.tone}
              active={selectedPinId === o.id}
              onClick={() => setSelectedPin(o.id)}
            />
          </group>
        );
      })}

      {/* Sample C17 + its live pin */}
      <SampleC17 />
      <Pin
        position={samplePinPos}
        code={sample.id}
        tone={STATUS_TONE[sample.status]}
        active={selectedPinId === "sample"}
        pulse={sample.status === "warning" || sample.status === "critical"}
        onClick={() => setSelectedPin("sample")}
      />

      <OrbitControls
        enablePan={false}
        target={[1, 1, 0.5]}
        minDistance={8}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.1}
      />
    </Canvas>
  );
}
