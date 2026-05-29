"use client";

// Low-poly but recognizable lab equipment, built from Three primitives.
// Each model is authored around its local origin = the centre of its bounding box
// (so the floating pins in LabScene still line up). LabModel switches on object id.

import { RoundedBox } from "@react-three/drei";

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
        <meshStandardMaterial color={body} metalness={0.55} roughness={0.35} />
      </RoundedBox>
      {/* door */}
      <RoundedBox args={[1.4, 2.74, 0.1]} radius={0.05} position={[0, 0.05, 0.8]} castShadow>
        <meshStandardMaterial color={door} metalness={0.6} roughness={0.3} emissive={emissive} emissiveIntensity={0.08} />
      </RoundedBox>
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
        <meshStandardMaterial color="#cfd6e6" metalness={0.5} roughness={0.35} />
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
        <meshStandardMaterial color="#dfe6f2" metalness={0.5} roughness={0.25} />
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
        <meshStandardMaterial color="#bfe0e8" metalness={0.1} roughness={0.05} transparent opacity={0.22} />
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

/* ───────────────────────── Camera / shelf sensor ───────────────────────── */
function CameraNode() {
  return (
    <group>
      {/* mount */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.18, 12]} />
        <meshStandardMaterial color="#6b7488" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* dome housing */}
      <mesh castShadow>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#aab4cc" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* lens pointing down */}
      <mesh position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.12, 16]} />
        <meshStandardMaterial color="#0a1426" emissive="#55ccff" emissiveIntensity={1.2} />
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
        <meshStandardMaterial color="#3a1030" emissive="#ff5ca8" emissiveIntensity={0.9} />
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
    case "sim_camera":
      return <CameraNode />;
    case "pi_postdoc":
      return <MessageStation />;
    default:
      return null;
  }
}
