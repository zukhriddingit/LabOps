"use client";

// Low-poly but recognizable lab equipment, built from Three primitives.
// Each model is authored around its local origin = the centre of its bounding box
// (so the floating pins in LabScene still line up). LabModel switches on object id.

import { RoundedBox, Text } from "@react-three/drei";

const HILITE = "#36d1a6";

function Outline({ size }: { size: [number, number, number] }) {
  return (
    <mesh>
      <boxGeometry args={[size[0] + 0.2, size[1] + 0.2, size[2] + 0.2]} />
      <meshBasicMaterial color={HILITE} wireframe transparent opacity={0.9} />
    </mesh>
  );
}

/* ───────────────────────── Freezer ───────────────────────── */
function Freezer({ body = "#1f4f9e", door = "#2a63c2", emissive = "#0d6efd" }) {
  return (
    <group>
      <RoundedBox args={[1.6, 3, 1.6]} radius={0.07} smoothness={4} castShadow receiveShadow>
        <meshPhysicalMaterial color={body} metalness={0.62} roughness={0.28} clearcoat={0.25} clearcoatRoughness={0.18} />
      </RoundedBox>
      {/* door */}
      <RoundedBox args={[1.4, 2.74, 0.1]} radius={0.05} position={[0, 0.05, 0.8]} castShadow>
        <meshPhysicalMaterial
          color={door}
          metalness={0.68}
          roughness={0.24}
          emissive={emissive}
          emissiveIntensity={0.08}
          clearcoat={0.35}
          clearcoatRoughness={0.16}
        />
      </RoundedBox>
      <Text position={[-0.05, 0.78, 0.875]} fontSize={0.13} color="#edf7ff" anchorX="center" anchorY="middle">
        -60 C
      </Text>
      {/* handle */}
      <mesh position={[0.52, 0.1, 0.9]} castShadow>
        <boxGeometry args={[0.08, 1.1, 0.14]} />
        <meshStandardMaterial color="#d4ddf2" metalness={0.9} roughness={0.18} />
      </mesh>
      {/* control display */}
      <mesh position={[0, 1.18, 0.87]}>
        <boxGeometry args={[0.5, 0.26, 0.04]} />
        <meshStandardMaterial color="#06121f" emissive={HILITE} emissiveIntensity={1.1} />
      </mesh>
      {/* feet */}
      {[-0.6, 0.6].map((x) =>
        [-0.6, 0.6].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -1.48, z]}>
            <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
            <meshStandardMaterial color="#0b1220" metalness={0.6} roughness={0.5} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ───────────────────────── Bench ───────────────────────── */
function Bench() {
  const legXs = [-1.6, 1.6];
  const legZs = [-0.8, 0.8];
  return (
    <group>
      {/* worktop */}
      <RoundedBox args={[3.6, 0.16, 2]} radius={0.03} position={[0, 0.42, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#d9e1ed" metalness={0.48} roughness={0.28} clearcoat={0.22} clearcoatRoughness={0.2} />
      </RoundedBox>
      {/* lower shelf */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.08, 1.8]} />
        <meshStandardMaterial color="#2a3148" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* legs */}
      {legXs.map((x) =>
        legZs.map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.05, z]} castShadow>
            <boxGeometry args={[0.12, 0.94, 0.12]} />
            <meshStandardMaterial color="#3a435f" metalness={0.6} roughness={0.4} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ───────────────────────── Centrifuge ───────────────────────── */
function Centrifuge() {
  return (
    <group>
      <mesh position={[0, -0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.52, 0.55, 0.32, 28]} />
        <meshStandardMaterial color="#9aa3b8" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.6, 28]} />
        <meshStandardMaterial color="#c3ccdd" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* lid */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <sphereGeometry args={[0.47, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#edf3fb" metalness={0.45} roughness={0.18} clearcoat={0.4} clearcoatRoughness={0.15} />
      </mesh>
      {/* control panel */}
      <mesh position={[0, 0.02, 0.5]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.42, 0.22, 0.04]} />
        <meshStandardMaterial color="#06121f" emissive="#4aa8ff" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Microscope ───────────────────────── */
function Microscope() {
  return (
    <group>
      {/* base */}
      <RoundedBox args={[0.7, 0.14, 0.62]} radius={0.04} position={[0, -0.53, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3d4258" metalness={0.5} roughness={0.5} />
      </RoundedBox>
      {/* arm */}
      <mesh position={[0, 0, -0.16]} castShadow>
        <boxGeometry args={[0.14, 0.9, 0.14]} />
        <meshStandardMaterial color="#5a6480" metalness={0.5} roughness={0.45} />
      </mesh>
      {/* stage */}
      <mesh position={[0, -0.16, 0.05]} castShadow>
        <boxGeometry args={[0.42, 0.05, 0.42]} />
        <meshStandardMaterial color="#aeb6c9" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* objective turret */}
      <mesh position={[0, 0.05, 0.04]}>
        <cylinderGeometry args={[0.1, 0.1, 0.12, 16]} />
        <meshStandardMaterial color="#2b3147" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* eyepiece */}
      <mesh position={[0, 0.42, -0.02]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.34, 16]} />
        <meshStandardMaterial color="#1b2030" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.1, 0.12]}>
        <boxGeometry args={[0.18, 0.02, 0.12]} />
        <meshStandardMaterial color="#7ee5ff" emissive="#7ee5ff" emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Inventory Shelf ───────────────────────── */
function Shelf({ highlighted }: { highlighted?: boolean }) {
  const frame = "#36405e";
  const levels = [-0.9, 0, 0.9];
  return (
    <group>
      {/* uprights */}
      {[-0.95, 0.95].map((x) =>
        [-0.25, 0.25].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0, z]} castShadow>
            <boxGeometry args={[0.08, 2, 0.08]} />
            <meshStandardMaterial color={frame} metalness={0.5} roughness={0.5} />
          </mesh>
        ))
      )}
      {/* shelves */}
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[2, 0.06, 0.6]} />
          <meshStandardMaterial color="#27314c" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
      {/* 15 mL tube boxes on the bottom shelf (bin 3) — glow when highlighted */}
      {[-0.55, 0.0].map((x, i) => (
        <mesh key={i} position={[x, -0.66, 0]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshStandardMaterial
            color={highlighted ? "#7fe9c8" : "#c9b27a"}
            emissive={highlighted ? HILITE : "#000000"}
            emissiveIntensity={highlighted ? 0.8 : 0}
            roughness={0.8}
          />
        </mesh>
      ))}
      {highlighted && <Outline size={[2, 2, 0.6]} />}
    </group>
  );
}

/* ───────────────────────── Chemical Cabinet ───────────────────────── */
function ChemCabinet() {
  const bottles = [
    { x: -0.4, c: "#7fc8a9" },
    { x: 0.0, c: "#d2a3e0" },
    { x: 0.4, c: "#e0c07f" },
  ];
  return (
    <group>
      <RoundedBox args={[1.4, 2, 0.6]} radius={0.05} castShadow receiveShadow>
        <meshStandardMaterial color="#2c3a2a" metalness={0.4} roughness={0.55} />
      </RoundedBox>
      {/* glass door */}
      <mesh position={[0, 0.1, 0.31]}>
        <boxGeometry args={[1.2, 1.6, 0.03]} />
        <meshPhysicalMaterial
          color="#d9f5ff"
          metalness={0.05}
          roughness={0.03}
          transmission={0.25}
          thickness={0.08}
          transparent
          opacity={0.34}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
      <mesh position={[-0.28, 0.22, 0.34]} rotation={[0, 0, -0.35]}>
        <boxGeometry args={[0.04, 1.35, 0.01]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.35} transparent opacity={0.42} />
      </mesh>
      {/* bottles behind glass */}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, -0.25, 0.08]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
          <meshStandardMaterial color={b.c} metalness={0.2} roughness={0.4} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── Biosafety cabinet / hood ───────────────────────── */
function BiosafetyCabinet() {
  return (
    <group>
      <RoundedBox args={[3.2, 1.55, 1.05]} radius={0.05} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d9e4ef" metalness={0.38} roughness={0.34} />
      </RoundedBox>
      <RoundedBox args={[3.35, 0.16, 1.22]} radius={0.03} position={[0, -0.75, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#8e9bad" metalness={0.45} roughness={0.42} />
      </RoundedBox>
      <mesh position={[0, 0.18, -0.55]} receiveShadow>
        <boxGeometry args={[2.85, 1.18, 0.06]} />
        <meshStandardMaterial color="#c4d0dc" roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.07, 0.55]}>
        <boxGeometry args={[2.75, 0.82, 0.035]} />
        <meshPhysicalMaterial
          color="#d8f3ff"
          roughness={0.02}
          transmission={0.22}
          thickness={0.08}
          transparent
          opacity={0.36}
          clearcoat={1}
          clearcoatRoughness={0.04}
        />
      </mesh>
      <mesh position={[0, 0.82, 0.48]}>
        <boxGeometry args={[2.8, 0.08, 0.08]} />
        <meshStandardMaterial color="#f9fdff" emissive="#ffffff" emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.47, 0.52]}>
        <boxGeometry args={[2.55, 0.05, 0.12]} />
        <meshStandardMaterial color="#6d7b8e" metalness={0.45} roughness={0.35} />
      </mesh>
      {[-1.16, -0.74, -0.32, 0.32, 0.74, 1.16].map((x) => (
        <mesh key={x} position={[x, 0.93, 0.05]}>
          <boxGeometry args={[0.18, 0.04, 0.8]} />
          <meshStandardMaterial color="#7c899c" metalness={0.35} roughness={0.5} />
        </mesh>
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.32, 0.2]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.38, 16]} />
          <meshStandardMaterial color="#7fc8a9" roughness={0.35} />
        </mesh>
      ))}
      <Text position={[0, 0.56, 0.6]} fontSize={0.13} color="#263447" anchorX="center">
        AIRFLOW ON
      </Text>
    </group>
  );
}

/* ───────────────────────── Incubator ───────────────────────── */
function Incubator() {
  return (
    <group>
      <RoundedBox args={[1.5, 2.7, 1.3]} radius={0.06} castShadow receiveShadow>
        <meshPhysicalMaterial color="#d4dde8" metalness={0.42} roughness={0.26} clearcoat={0.3} clearcoatRoughness={0.18} />
      </RoundedBox>
      <mesh position={[0, 0.08, 0.66]}>
        <boxGeometry args={[1.18, 1.7, 0.035]} />
        <meshPhysicalMaterial color="#dff8ff" transparent opacity={0.28} roughness={0.03} transmission={0.18} thickness={0.08} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.96, 0.69]}>
        <boxGeometry args={[0.74, 0.28, 0.04]} />
        <meshStandardMaterial color="#06121f" emissive="#36d1a6" emissiveIntensity={0.95} />
      </mesh>
      <Text position={[0, 0.96, 0.725]} fontSize={0.085} color="#eafff8" anchorX="center" anchorY="middle">
        37C  5% CO2
      </Text>
      {[-0.38, 0, 0.38].map((x) => (
        <mesh key={x} position={[x, -0.38, 0.12]}>
          <boxGeometry args={[0.28, 0.16, 0.46]} />
          <meshStandardMaterial color="#a9b6c6" metalness={0.25} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── Reagent fridge ───────────────────────── */
function ReagentFridge() {
  const bottles = [
    { x: -0.34, y: -0.35, c: "#7fc8a9" },
    { x: 0.0, y: -0.35, c: "#e0c07f" },
    { x: 0.34, y: -0.35, c: "#d2a3e0" },
    { x: -0.18, y: 0.34, c: "#9ad2ff" },
    { x: 0.22, y: 0.34, c: "#ffb5ca" },
  ];
  return (
    <group>
      <RoundedBox args={[1.5, 2.3, 1.2]} radius={0.06} castShadow receiveShadow>
        <meshPhysicalMaterial color="#dce8f4" metalness={0.34} roughness={0.27} clearcoat={0.28} />
      </RoundedBox>
      <mesh position={[0, 0, 0.62]}>
        <boxGeometry args={[1.18, 1.78, 0.035]} />
        <meshPhysicalMaterial color="#d8f3ff" transparent opacity={0.34} roughness={0.03} transmission={0.24} thickness={0.08} clearcoat={1} />
      </mesh>
      <mesh position={[0.56, 0, 0.7]}>
        <boxGeometry args={[0.06, 1.5, 0.08]} />
        <meshStandardMaterial color="#eef5ff" metalness={0.85} roughness={0.18} />
      </mesh>
      {[-0.42, 0.08, 0.58].map((y) => (
        <mesh key={y} position={[0, y, 0.18]}>
          <boxGeometry args={[1.0, 0.04, 0.64]} />
          <meshStandardMaterial color="#b9c8d8" roughness={0.36} metalness={0.18} />
        </mesh>
      ))}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.28]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.34, 14]} />
          <meshStandardMaterial color={b.c} transparent opacity={0.86} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0, 0.92, 0.66]}>
        <boxGeometry args={[0.52, 0.18, 0.035]} />
        <meshStandardMaterial color="#071525" emissive="#4aa8ff" emissiveIntensity={0.75} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Pipette station ───────────────────────── */
function PipetteStation() {
  return (
    <group>
      <RoundedBox args={[1.3, 0.08, 0.72]} radius={0.025} position={[0, -0.34, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8e1ed" metalness={0.28} roughness={0.4} />
      </RoundedBox>
      <mesh position={[-0.38, -0.03, -0.16]} castShadow>
        <boxGeometry args={[0.36, 0.56, 0.12]} />
        <meshStandardMaterial color="#65728a" roughness={0.42} metalness={0.32} />
      </mesh>
      {[-0.5, -0.38, -0.26].map((x, i) => (
        <mesh key={x} position={[x, 0.18, 0.02]} rotation={[0.22, 0, i * 0.12]} castShadow>
          <cylinderGeometry args={[0.028, 0.04, 0.68, 10]} />
          <meshStandardMaterial color={i === 0 ? "#4aa8ff" : i === 1 ? "#36d1a6" : "#ffb020"} roughness={0.32} />
        </mesh>
      ))}
      {[0.02, 0.48].map((x, i) => (
        <RoundedBox key={x} args={[0.38, 0.26, 0.34]} radius={0.025} position={[x, -0.16, -0.08]} castShadow>
          <meshStandardMaterial color={i === 0 ? "#9ad2ff" : "#f0d98a"} roughness={0.52} />
        </RoundedBox>
      ))}
      {[-0.12, 0.02, 0.16, 0.3, 0.44].map((x) => (
        <mesh key={x} position={[x, -0.09, 0.25]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 10]} />
          <meshStandardMaterial color="#7ee5ff" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── Biohazard bin / sharps ───────────────────────── */
function BiohazardBin() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.32, 0.82, 18]} />
        <meshStandardMaterial color="#d64b42" roughness={0.48} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 18]} />
        <meshStandardMaterial color="#f2bf31" roughness={0.35} metalness={0.12} />
      </mesh>
      <Text position={[0, 0.02, 0.39]} fontSize={0.12} color="#ffffff" anchorX="center">
        BIO
      </Text>
      <RoundedBox args={[0.34, 0.58, 0.28]} radius={0.035} position={[0.52, 0.02, 0]} castShadow>
        <meshStandardMaterial color="#f1c232" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0.52, 0.35, 0]}>
        <boxGeometry args={[0.25, 0.04, 0.2]} />
        <meshStandardMaterial color="#b8202f" roughness={0.35} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Autoclave ───────────────────────── */
function Autoclave() {
  return (
    <group>
      <RoundedBox args={[1.7, 2.4, 1.5]} radius={0.06} castShadow receiveShadow>
        <meshPhysicalMaterial color="#a7b0c0" metalness={0.62} roughness={0.23} clearcoat={0.35} />
      </RoundedBox>
      <mesh position={[0, 0, 0.78]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 32]} />
        <meshPhysicalMaterial color="#d8e1ed" metalness={0.72} roughness={0.18} clearcoat={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.86]} castShadow>
        <torusGeometry args={[0.42, 0.035, 12, 28]} />
        <meshStandardMaterial color="#6c7789" metalness={0.72} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.93]}>
        <cylinderGeometry args={[0.16, 0.16, 0.045, 20]} />
        <meshStandardMaterial color="#263447" metalness={0.65} roughness={0.22} />
      </mesh>
      <mesh position={[0.45, 0.78, 0.78]}>
        <boxGeometry args={[0.42, 0.24, 0.04]} />
        <meshStandardMaterial color="#06121f" emissive="#4aa8ff" emissiveIntensity={0.85} />
      </mesh>
      <Text position={[0.45, 0.78, 0.815]} fontSize={0.07} color="#eaf7ff" anchorX="center" anchorY="middle">
        READY
      </Text>
    </group>
  );
}

/* ───────────────────────── Camera / shelf sensor ───────────────────────── */
function CameraNode() {
  return (
    <group>
      {/* wall plate */}
      <RoundedBox args={[0.46, 0.52, 0.08]} radius={0.025} position={[0, 0.04, 0.02]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8e1ec" metalness={0.3} roughness={0.42} />
      </RoundedBox>
      {/* wall arm */}
      <mesh position={[0, 0.02, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.34, 12]} />
        <meshStandardMaterial color="#6b7488" metalness={0.55} roughness={0.38} />
      </mesh>
      {/* dome housing, proud of the wall */}
      <mesh position={[0, -0.1, -0.36]} castShadow>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshPhysicalMaterial color="#eef5ff" metalness={0.42} roughness={0.18} clearcoat={0.65} clearcoatRoughness={0.12} />
      </mesh>
      {/* lens angled toward the shelf */}
      <mesh position={[0, -0.22, -0.36]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.12, 16]} />
        <meshStandardMaterial color="#0a1426" emissive="#55ccff" emissiveIntensity={1.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, -0.36]}>
        <ringGeometry args={[0.25, 0.29, 36]} />
        <meshBasicMaterial color="#55ccff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── PI / Postdoc message kiosk ───────────────────────── */
function MessageStation() {
  return (
    <group>
      {/* base */}
      <mesh position={[0, -0.85, 0]} receiveShadow>
        <boxGeometry args={[0.6, 0.1, 0.4]} />
        <meshStandardMaterial color="#2a1c28" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* pole */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <boxGeometry args={[0.12, 1.3, 0.12]} />
        <meshStandardMaterial color="#3a2a38" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* screen */}
      <RoundedBox args={[0.95, 0.7, 0.07]} radius={0.04} position={[0, 0.55, 0.06]} castShadow>
        <meshStandardMaterial color="#241622" metalness={0.4} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0.55, 0.1]}>
        <boxGeometry args={[0.82, 0.56, 0.02]} />
        <meshStandardMaterial color="#3a1030" emissive="#ff5ca8" emissiveIntensity={1.15} roughness={0.18} />
      </mesh>
      {/* envelope glyph */}
      <mesh position={[0, 0.55, 0.12]}>
        <boxGeometry args={[0.4, 0.26, 0.01]} />
        <meshStandardMaterial color="#ffd9ec" emissive="#ffd9ec" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

export default function LabModel({ id, highlighted }: { id: string; highlighted?: boolean }) {
  switch (id) {
    case "freezer_b":
      return <Freezer body="#1f4f9e" door="#2a63c2" />;
    case "backup_freezer_d":
      return <Freezer body="#1a4480" door="#235194" />;
    case "bench_2":
      return <Bench />;
    case "centrifuge_2":
      return <Centrifuge />;
    case "microscope_1":
      return <Microscope />;
    case "shelf_a":
      return <Shelf highlighted={highlighted} />;
    case "chem_cabinet_1":
      return <ChemCabinet />;
    case "biosafety_cabinet":
      return <BiosafetyCabinet />;
    case "co2_incubator":
      return <Incubator />;
    case "reagent_fridge":
      return <ReagentFridge />;
    case "sim_camera":
      return <CameraNode />;
    case "pipette_station":
      return <PipetteStation />;
    case "biohazard_bin":
      return <BiohazardBin />;
    case "autoclave":
      return <Autoclave />;
    case "pi_postdoc":
      return <MessageStation />;
    default:
      return null;
  }
}
