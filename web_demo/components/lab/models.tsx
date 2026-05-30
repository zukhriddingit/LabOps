"use client";

// Lab equipment built from Three primitives — authored around each object's local
// origin (= the centre of its bounding box) so the floating pins in LabScene line
// up. With the scene's procedural Environment in place, the metals/glass below now
// reflect real light banks; `envMapIntensity` tunes how strongly. LabModel switches
// on object id.

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBox, Text } from "@react-three/drei";
import { screenTexture, type ScreenLine } from "@/lib/labTextures";

const HILITE = "#36d1a6";

// Format a backend temperature string ("-81C") for an instrument screen ("−81 °C").
function formatTemp(t?: string | null): string {
  if (!t) return "—";
  const m = String(t).match(/-?\d+(\.\d+)?/);
  if (!m) return String(t);
  return `${m[0].replace("-", "−")} °C`;
}

function Outline({ size }: { size: [number, number, number] }) {
  return (
    <mesh>
      <boxGeometry args={[size[0] + 0.2, size[1] + 0.2, size[2] + 0.2]} />
      <meshBasicMaterial color={HILITE} wireframe transparent opacity={0.9} toneMapped={false} />
    </mesh>
  );
}

/* A self-lit instrument screen rendered from a canvas texture (crisp text, glows
   under bloom). Sits in a dark-glass bezel. */
function Screen({
  position,
  rotation,
  w,
  h,
  lines,
  bg,
  accent,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
  w: number;
  h: number;
  lines: ScreenLine[];
  bg?: string;
  accent?: string;
}) {
  const tex = screenTexture({ lines, bg, accent, width: 512, height: Math.max(64, Math.round(512 * (h / w))) });
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[w + 0.05, h + 0.05, 0.035]} />
        <meshStandardMaterial color="#0a0f16" metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.95} toneMapped={false} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ───────────────────────── Freezer ───────────────────────── */
function Freezer({
  body = "#1f4f9e",
  door = "#2a63c2",
  alarm = false,
  temp,
  open = false,
}: {
  body?: string;
  door?: string;
  emissive?: string;
  alarm?: boolean;
  temp?: string;
  open?: boolean;
}) {
  const accent = alarm ? "#ff5d76" : "#7ee5ff";
  const doorRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (doorRef.current) {
      const target = open ? -2.15 : 0; // swing the door outward when open
      doorRef.current.rotation.y = THREE.MathUtils.damp(doorRef.current.rotation.y, target, 5, dt);
    }
  });
  return (
    <group>
      {/* cabinet */}
      <RoundedBox args={[1.6, 3, 1.6]} radius={0.08} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={alarm ? "#3a1622" : body}
          metalness={0.55}
          roughness={0.22}
          envMapIntensity={1.25}
          emissive={alarm ? "#ff3b5c" : "#000000"}
          emissiveIntensity={alarm ? 0.25 : 0}
          clearcoat={0.4}
          clearcoatRoughness={0.18}
        />
      </RoundedBox>
      {/* interior revealed when the door opens: dark cavity wall + shelves + cold glow */}
      <mesh position={[0, 0.05, 0.82]}>
        <boxGeometry args={[1.36, 2.7, 0.02]} />
        <meshStandardMaterial color="#0b131d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.05, 0.825]}>
        <planeGeometry args={[1.2, 2.5]} />
        <meshStandardMaterial color="#bfe0ff" emissive="#9fd0ff" emissiveIntensity={0.22} toneMapped={false} />
      </mesh>
      {[0.7, 0.0, -0.7].map((y) => (
        <mesh key={y} position={[0, y, 0.84]}>
          <boxGeometry args={[1.2, 0.04, 0.06]} />
          <meshStandardMaterial color="#425064" transparent opacity={0.6} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* hinged door assembly — pivots on the left edge (double-group keeps child coords) */}
      <group position={[-0.7, 0, 0]}>
        <group ref={doorRef}>
          <group position={[0.7, 0, 0]}>
            <RoundedBox args={[1.4, 2.74, 0.12]} radius={0.05} smoothness={5} position={[0, 0.05, 0.92]} castShadow>
              <meshPhysicalMaterial
                color={alarm ? "#5a2030" : door}
                metalness={0.6}
                roughness={0.2}
                envMapIntensity={1.4}
                clearcoat={0.5}
                clearcoatRoughness={0.12}
              />
            </RoundedBox>
            <mesh position={[0, 0.05, 0.985]}>
              <boxGeometry args={[1.18, 2.5, 0.01]} />
              <meshStandardMaterial color={alarm ? "#6a2436" : "#27559e"} roughness={0.4} metalness={0.5} envMapIntensity={1.2} />
            </mesh>
            <Screen
              position={[0, 1.12, 1.0]}
              w={0.62}
              h={0.34}
              bg={alarm ? "#2a0810" : "#04101c"}
              accent={accent}
              lines={
                alarm
                  ? [
                      { text: "ALARM", size: 80, color: "#ff5d76" },
                      { text: formatTemp(temp), size: 60, color: "#ffb9c4" },
                    ]
                  : [
                      { text: formatTemp(temp), size: 88, color: "#7ee5ff" },
                      { text: "STABLE", size: 44, color: "#9fb6c9" },
                    ]
              }
            />
            <mesh position={[0.56, 0.86, 1.02]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
              <meshStandardMaterial color="#cfd8e8" metalness={0.95} roughness={0.16} envMapIntensity={1.5} />
            </mesh>
            <mesh position={[0.56, -0.66, 1.02]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
              <meshStandardMaterial color="#cfd8e8" metalness={0.95} roughness={0.16} envMapIntensity={1.5} />
            </mesh>
            <mesh position={[0.62, 0.1, 1.02]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 1.62, 16]} />
              <meshStandardMaterial color="#dde4f2" metalness={0.95} roughness={0.14} envMapIntensity={1.6} />
            </mesh>
          </group>
        </group>
      </group>
      {/* side hinges */}
      {[0.85, -0.55].map((y) => (
        <mesh key={y} position={[-0.72, y, 0.78]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 12]} />
          <meshStandardMaterial color="#8c97a8" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* brushed kick plate */}
      <mesh position={[0, -1.36, 0.81]}>
        <boxGeometry args={[1.4, 0.22, 0.04]} />
        <meshStandardMaterial color="#aab4c4" metalness={0.7} roughness={0.4} envMapIntensity={1.1} />
      </mesh>
      {/* feet */}
      {[-0.6, 0.6].map((x) =>
        [-0.6, 0.6].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -1.52, z]}>
            <cylinderGeometry args={[0.09, 0.11, 0.14, 16]} />
            <meshStandardMaterial color="#0b1220" metalness={0.5} roughness={0.6} />
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
      {/* stainless worktop */}
      <RoundedBox args={[3.6, 0.16, 2]} radius={0.03} position={[0, 0.42, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#d4dde8" metalness={0.65} roughness={0.22} envMapIntensity={1.3} clearcoat={0.3} clearcoatRoughness={0.2} />
      </RoundedBox>
      {/* raised back-rail */}
      <mesh position={[0, 0.62, -0.92]} castShadow>
        <boxGeometry args={[3.6, 0.24, 0.08]} />
        <meshStandardMaterial color="#b7c2d1" metalness={0.6} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      {/* lower shelf */}
      <mesh position={[0, -0.18, 0]} receiveShadow>
        <boxGeometry args={[3.4, 0.08, 1.8]} />
        <meshStandardMaterial color="#2a3148" metalness={0.4} roughness={0.55} />
      </mesh>
      {/* legs */}
      {legXs.map((x) =>
        legZs.map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.05, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.94, 16]} />
            <meshStandardMaterial color="#3a435f" metalness={0.7} roughness={0.34} envMapIntensity={1.2} />
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
        <cylinderGeometry args={[0.52, 0.56, 0.32, 48]} />
        <meshStandardMaterial color="#8e98ad" metalness={0.65} roughness={0.36} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.6, 48]} />
        <meshPhysicalMaterial color="#c6cfdf" metalness={0.55} roughness={0.28} envMapIntensity={1.3} clearcoat={0.25} />
      </mesh>
      {/* domed lid (smooth) */}
      <mesh position={[0, 0.27, 0]} castShadow>
        <sphereGeometry args={[0.47, 48, 28, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#eef3fb" metalness={0.4} roughness={0.14} envMapIntensity={1.5} clearcoat={0.6} clearcoatRoughness={0.12} />
      </mesh>
      {/* lid seam ring */}
      <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.47, 0.018, 12, 48]} />
        <meshStandardMaterial color="#6c7789" metalness={0.7} roughness={0.3} envMapIntensity={1.2} />
      </mesh>
      {/* rear hinge */}
      <mesh position={[0, 0.3, -0.44]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.12]} />
        <meshStandardMaterial color="#5a6478" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* front latch */}
      <mesh position={[0, 0.27, 0.47]} castShadow>
        <boxGeometry args={[0.16, 0.1, 0.08]} />
        <meshStandardMaterial color="#aab4c4" metalness={0.8} roughness={0.25} envMapIntensity={1.3} />
      </mesh>
      {/* control screen */}
      <Screen position={[0, 0.04, 0.52]} rotation={[-0.5, 0, 0]} w={0.46} h={0.24} bg="#04101c" accent="#69b6ff"
        lines={[{ text: "3000 ×g", size: 64, color: "#7ec8ff" }, { text: "10:00", size: 40, color: "#9fb6c9" }]} />
      {/* rubber feet */}
      {[-0.4, 0.4].map((x) =>
        [-0.4, 0.4].map((z) => (
          <mesh key={`${x}${z}`} position={[x, -0.62, z]}>
            <cylinderGeometry args={[0.06, 0.07, 0.06, 12]} />
            <meshStandardMaterial color="#11161f" roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

/* ───────────────────────── Microscope ───────────────────────── */
function Microscope() {
  return (
    <group>
      {/* heavy base */}
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.34, 0.4, 0.16, 32]} />
        <meshStandardMaterial color="#363b50" metalness={0.55} roughness={0.42} envMapIntensity={1.1} />
      </mesh>
      <RoundedBox args={[0.66, 0.16, 0.58]} radius={0.05} position={[0, -0.5, 0.06]} castShadow>
        <meshStandardMaterial color="#3d4258" metalness={0.5} roughness={0.45} envMapIntensity={1.1} />
      </RoundedBox>
      {/* curved arm */}
      <mesh position={[0, -0.02, -0.16]} rotation={[0.18, 0, 0]} castShadow>
        <boxGeometry args={[0.16, 0.92, 0.16]} />
        <meshStandardMaterial color="#586280" metalness={0.55} roughness={0.4} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.42, -0.06]} rotation={[0.5, 0, 0]} castShadow>
        <boxGeometry args={[0.18, 0.34, 0.18]} />
        <meshStandardMaterial color="#586280" metalness={0.55} roughness={0.4} envMapIntensity={1.1} />
      </mesh>
      {/* stage with illuminated insert */}
      <mesh position={[0, -0.14, 0.07]} castShadow>
        <boxGeometry args={[0.46, 0.05, 0.46]} />
        <meshStandardMaterial color="#aeb6c9" metalness={0.55} roughness={0.36} envMapIntensity={1.2} />
      </mesh>
      <mesh position={[0, -0.115, 0.07]}>
        <boxGeometry args={[0.14, 0.012, 0.14]} />
        <meshStandardMaterial color="#cdfaff" emissive="#9ff0ff" emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
      {/* focus knobs */}
      {[-0.36, 0.36].map((x) => (
        <mesh key={x} position={[x, -0.3, -0.02]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.06, 20]} />
          <meshStandardMaterial color="#2b3147" metalness={0.5} roughness={0.45} />
        </mesh>
      ))}
      {/* objective nosepiece + 3 objectives */}
      <mesh position={[0, 0.04, 0.07]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
        <meshStandardMaterial color="#22283a" metalness={0.6} roughness={0.4} envMapIntensity={1.1} />
      </mesh>
      {[-0.06, 0, 0.06].map((x, i) => (
        <mesh key={i} position={[x, -0.04, 0.09]} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.12, 14]} />
          <meshStandardMaterial color={i === 1 ? "#d4b34a" : "#9aa6bd"} metalness={0.8} roughness={0.3} envMapIntensity={1.3} />
        </mesh>
      ))}
      {/* binocular eyepieces */}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.5, -0.04]} rotation={[0.55, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 0.3, 18]} />
          <meshStandardMaterial color="#1b2030" metalness={0.6} roughness={0.3} envMapIntensity={1.1} />
        </mesh>
      ))}
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
            <meshStandardMaterial color={frame} metalness={0.55} roughness={0.4} envMapIntensity={1.1} />
          </mesh>
        ))
      )}
      {/* shelves */}
      {levels.map((y) => (
        <mesh key={y} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[2, 0.06, 0.6]} />
          <meshStandardMaterial color="#2a3450" metalness={0.45} roughness={0.5} envMapIntensity={1.0} />
        </mesh>
      ))}
      {/* labelled bins on the top two shelves */}
      {[-0.6, 0.0, 0.6].map((x, i) => (
        <RoundedBox key={`t${x}`} args={[0.5, 0.34, 0.46]} radius={0.03} position={[x, 0.24, 0]} castShadow>
          <meshStandardMaterial color={["#6f86b8", "#7a9a86", "#b8956f"][i]} roughness={0.7} />
        </RoundedBox>
      ))}
      {/* 15 mL tube boxes on the bottom shelf (bin 3) — glow when highlighted */}
      {[-0.55, 0.0].map((x, i) => (
        <mesh key={i} position={[x, -0.66, 0]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshStandardMaterial
            color={highlighted ? "#7fe9c8" : "#c9b27a"}
            emissive={highlighted ? HILITE : "#000000"}
            emissiveIntensity={highlighted ? 0.9 : 0}
            toneMapped={!highlighted}
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
        <meshStandardMaterial color="#2c3a2a" metalness={0.45} roughness={0.5} envMapIntensity={1.0} />
      </RoundedBox>
      {/* glass door */}
      <mesh position={[0, 0.1, 0.31]}>
        <boxGeometry args={[1.2, 1.6, 0.03]} />
        <meshPhysicalMaterial
          color="#d9f5ff"
          metalness={0.05}
          roughness={0.03}
          transmission={0.5}
          thickness={0.08}
          transparent
          opacity={0.34}
          envMapIntensity={1.4}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
      {/* hazard label */}
      <mesh position={[0.42, 0.78, 0.33]}>
        <planeGeometry args={[0.26, 0.26]} />
        <meshStandardMaterial color="#f2b01e" roughness={0.5} />
      </mesh>
      {/* bottles behind glass */}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, -0.25, 0.08]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.5, 20]} />
          <meshStandardMaterial color={b.c} metalness={0.2} roughness={0.4} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ───────────────────────── Biosafety cabinet / hood ───────────────────────── */
function BiosafetyCabinet() {
  return (
    <group>
      {/* upper plenum */}
      <RoundedBox args={[3.2, 1.55, 1.05]} radius={0.06} position={[0, 0.15, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#dde7f1" metalness={0.5} roughness={0.28} envMapIntensity={1.25} clearcoat={0.2} />
      </RoundedBox>
      {/* support stand */}
      <RoundedBox args={[3.35, 0.16, 1.22]} radius={0.03} position={[0, -0.75, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#8693a5" metalness={0.5} roughness={0.4} envMapIntensity={1.1} />
      </RoundedBox>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, -1.25, 0.45]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.85, 16]} />
          <meshStandardMaterial color="#6d7b8e" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* back interior wall */}
      <mesh position={[0, 0.18, -0.55]} receiveShadow>
        <boxGeometry args={[2.85, 1.18, 0.06]} />
        <meshStandardMaterial color="#c4d0dc" roughness={0.6} />
      </mesh>
      {/* sash glass + aluminium frame */}
      <mesh position={[0, 0.07, 0.55]}>
        <boxGeometry args={[2.75, 0.82, 0.03]} />
        <meshPhysicalMaterial color="#d8f3ff" roughness={0.02} transmission={0.55} thickness={0.08} transparent opacity={0.34} envMapIntensity={1.5} clearcoat={1} clearcoatRoughness={0.03} />
      </mesh>
      <mesh position={[0, 0.49, 0.56]}>
        <boxGeometry args={[2.8, 0.05, 0.06]} />
        <meshStandardMaterial color="#9fadbd" metalness={0.75} roughness={0.28} envMapIntensity={1.3} />
      </mesh>
      <mesh position={[0, -0.35, 0.56]}>
        <boxGeometry args={[2.8, 0.05, 0.06]} />
        <meshStandardMaterial color="#9fadbd" metalness={0.75} roughness={0.28} envMapIntensity={1.3} />
      </mesh>
      {/* hood task light */}
      <mesh position={[0, 0.82, 0.46]}>
        <boxGeometry args={[2.8, 0.07, 0.08]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} toneMapped={false} roughness={0.2} />
      </mesh>
      {/* front intake grille */}
      <mesh position={[0, -0.47, 0.52]}>
        <boxGeometry args={[2.55, 0.05, 0.12]} />
        <meshStandardMaterial color="#6d7b8e" metalness={0.5} roughness={0.35} />
      </mesh>
      {[-1.16, -0.74, -0.32, 0.32, 0.74, 1.16].map((x) => (
        <mesh key={x} position={[x, 0.93, 0.05]}>
          <boxGeometry args={[0.18, 0.04, 0.8]} />
          <meshStandardMaterial color="#7c899c" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* tubes inside */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.32, 0.2]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.38, 18]} />
          <meshStandardMaterial color="#7fc8a9" roughness={0.35} />
        </mesh>
      ))}
      {/* airflow status display */}
      <Screen position={[1.16, 0.62, 0.55]} w={0.56} h={0.3} bg="#031712" accent="#67e3bd"
        lines={[{ text: "AIRFLOW", size: 44, color: "#67e3bd" }, { text: "0.38 m/s", size: 50, color: "#bdeede" }]} />
    </group>
  );
}

/* ───────────────────────── Incubator ───────────────────────── */
function Incubator() {
  return (
    <group>
      <RoundedBox args={[1.5, 2.7, 1.3]} radius={0.06} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial color="#d4dde8" metalness={0.5} roughness={0.24} envMapIntensity={1.3} clearcoat={0.3} clearcoatRoughness={0.18} />
      </RoundedBox>
      {/* glass door */}
      <mesh position={[0, 0.08, 0.66]}>
        <boxGeometry args={[1.18, 1.7, 0.035]} />
        <meshPhysicalMaterial color="#dff8ff" transparent opacity={0.3} roughness={0.03} transmission={0.5} thickness={0.08} envMapIntensity={1.4} clearcoat={1} />
      </mesh>
      {/* door handle */}
      <mesh position={[0.5, 0.08, 0.7]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.3, 14]} />
        <meshStandardMaterial color="#dde4f2" metalness={0.9} roughness={0.18} envMapIntensity={1.5} />
      </mesh>
      {/* env display */}
      <Screen position={[0, 0.96, 0.7]} w={0.78} h={0.3} bg="#03130e" accent="#36d1a6"
        lines={[{ text: "37.0 °C", size: 58, color: "#7ff0cb" }, { text: "5.0% CO₂", size: 44, color: "#bdeede" }]} />
      {/* lower drawers */}
      {[-0.38, 0, 0.38].map((x) => (
        <mesh key={x} position={[x, -0.38, 0.12]}>
          <boxGeometry args={[0.28, 0.16, 0.46]} />
          <meshStandardMaterial color="#a9b6c6" metalness={0.3} roughness={0.45} envMapIntensity={1.0} />
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
      <RoundedBox args={[1.5, 2.3, 1.2]} radius={0.06} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial color="#dce8f4" metalness={0.45} roughness={0.24} envMapIntensity={1.3} clearcoat={0.3} />
      </RoundedBox>
      <mesh position={[0, 0, 0.62]}>
        <boxGeometry args={[1.18, 1.78, 0.035]} />
        <meshPhysicalMaterial color="#d8f3ff" transparent opacity={0.34} roughness={0.03} transmission={0.5} thickness={0.08} envMapIntensity={1.4} clearcoat={1} />
      </mesh>
      <mesh position={[0.56, 0, 0.7]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.5, 14]} />
        <meshStandardMaterial color="#eef5ff" metalness={0.9} roughness={0.16} envMapIntensity={1.5} />
      </mesh>
      {[-0.42, 0.08, 0.58].map((y) => (
        <mesh key={y} position={[0, y, 0.18]}>
          <boxGeometry args={[1.0, 0.04, 0.64]} />
          <meshStandardMaterial color="#b9c8d8" roughness={0.36} metalness={0.18} />
        </mesh>
      ))}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.28]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.34, 16]} />
          <meshStandardMaterial color={b.c} transparent opacity={0.88} roughness={0.38} />
        </mesh>
      ))}
      <Screen position={[0, 0.92, 0.64]} w={0.46} h={0.22} bg="#04101c" accent="#69b6ff"
        lines={[{ text: "4 °C", size: 70, color: "#7ec8ff" }]} />
    </group>
  );
}

/* ───────────────────────── Pipette station ───────────────────────── */
function PipetteStation() {
  return (
    <group>
      <RoundedBox args={[1.3, 0.08, 0.72]} radius={0.025} position={[0, -0.34, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8e1ed" metalness={0.4} roughness={0.34} envMapIntensity={1.1} />
      </RoundedBox>
      <mesh position={[-0.38, -0.03, -0.16]} castShadow>
        <boxGeometry args={[0.36, 0.56, 0.12]} />
        <meshStandardMaterial color="#65728a" roughness={0.42} metalness={0.32} />
      </mesh>
      {[-0.5, -0.38, -0.26].map((x, i) => (
        <mesh key={x} position={[x, 0.18, 0.02]} rotation={[0.22, 0, i * 0.12]} castShadow>
          <cylinderGeometry args={[0.028, 0.04, 0.68, 14]} />
          <meshStandardMaterial color={i === 0 ? "#4aa8ff" : i === 1 ? "#36d1a6" : "#ffb020"} roughness={0.3} metalness={0.2} />
        </mesh>
      ))}
      {[0.02, 0.48].map((x, i) => (
        <RoundedBox key={x} args={[0.38, 0.26, 0.34]} radius={0.025} position={[x, -0.16, -0.08]} castShadow>
          <meshStandardMaterial color={i === 0 ? "#9ad2ff" : "#f0d98a"} roughness={0.52} />
        </RoundedBox>
      ))}
      {[-0.12, 0.02, 0.16, 0.3, 0.44].map((x) => (
        <mesh key={x} position={[x, -0.09, 0.25]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.16, 12]} />
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
        <cylinderGeometry args={[0.38, 0.32, 0.82, 28]} />
        <meshStandardMaterial color="#d64b42" roughness={0.45} metalness={0.1} envMapIntensity={1.0} />
      </mesh>
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 28]} />
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
      <RoundedBox args={[1.7, 2.4, 1.5]} radius={0.06} smoothness={5} castShadow receiveShadow>
        <meshPhysicalMaterial color="#a7b0c0" metalness={0.68} roughness={0.2} envMapIntensity={1.4} clearcoat={0.35} />
      </RoundedBox>
      <mesh position={[0, 0, 0.78]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.12, 48]} />
        <meshPhysicalMaterial color="#d8e1ed" metalness={0.72} roughness={0.16} envMapIntensity={1.5} clearcoat={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.86]} castShadow>
        <torusGeometry args={[0.42, 0.035, 16, 36]} />
        <meshStandardMaterial color="#6c7789" metalness={0.75} roughness={0.22} envMapIntensity={1.3} />
      </mesh>
      <mesh position={[0, 0, 0.93]}>
        <cylinderGeometry args={[0.16, 0.16, 0.045, 24]} />
        <meshStandardMaterial color="#263447" metalness={0.65} roughness={0.22} />
      </mesh>
      <Screen position={[0.45, 0.78, 0.79]} w={0.46} h={0.26} bg="#04101c" accent="#69b6ff"
        lines={[{ text: "READY", size: 56, color: "#7ec8ff" }, { text: "121 °C", size: 38, color: "#9fb6c9" }]} />
    </group>
  );
}

/* ───────────────────────── Camera / shelf sensor ───────────────────────── */
function CameraNode() {
  return (
    <group>
      {/* wall plate */}
      <RoundedBox args={[0.46, 0.52, 0.08]} radius={0.025} position={[0, 0.04, 0.02]} castShadow receiveShadow>
        <meshStandardMaterial color="#d8e1ec" metalness={0.35} roughness={0.4} envMapIntensity={1.1} />
      </RoundedBox>
      {/* wall arm */}
      <mesh position={[0, 0.02, -0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.34, 16]} />
        <meshStandardMaterial color="#6b7488" metalness={0.6} roughness={0.36} />
      </mesh>
      {/* dome housing */}
      <mesh position={[0, -0.1, -0.36]} castShadow>
        <sphereGeometry args={[0.2, 28, 28]} />
        <meshPhysicalMaterial color="#eef5ff" metalness={0.45} roughness={0.16} envMapIntensity={1.4} clearcoat={0.65} clearcoatRoughness={0.12} />
      </mesh>
      {/* lens */}
      <mesh position={[0, -0.22, -0.36]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.07, 0.12, 20]} />
        <meshStandardMaterial color="#0a1426" emissive="#55ccff" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* status LED */}
      <mesh position={[0.16, 0.18, 0.06]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#36d1a6" emissive="#36d1a6" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, -0.36]}>
        <ringGeometry args={[0.25, 0.29, 36]} />
        <meshBasicMaterial color="#55ccff" transparent opacity={0.3} toneMapped={false} />
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
        <cylinderGeometry args={[0.32, 0.36, 0.1, 28]} />
        <meshStandardMaterial color="#2a1c28" metalness={0.45} roughness={0.55} />
      </mesh>
      {/* pole */}
      <mesh position={[0, -0.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.3, 20]} />
        <meshStandardMaterial color="#3a2a38" metalness={0.55} roughness={0.45} envMapIntensity={1.1} />
      </mesh>
      {/* monitor shell */}
      <RoundedBox args={[0.95, 0.7, 0.07]} radius={0.04} position={[0, 0.55, 0.06]} castShadow>
        <meshStandardMaterial color="#241622" metalness={0.45} roughness={0.4} envMapIntensity={1.1} />
      </RoundedBox>
      {/* screen */}
      <Screen position={[0, 0.55, 0.105]} w={0.82} h={0.56} bg="#240a1c" accent="#ff5ca8"
        lines={[{ text: "✉ PI / POSTDOC", size: 46, color: "#ffd9ec" }, { text: "TAP TO DRAFT", size: 34, color: "#ff9fcb" }]} />
    </group>
  );
}

export default function LabModel({
  id,
  highlighted,
  alarm,
  temp,
  open,
}: {
  id: string;
  highlighted?: boolean;
  alarm?: boolean;
  temp?: string;
  open?: boolean;
}) {
  switch (id) {
    case "freezer":
      return <Freezer body="#1f4f9e" door="#2a63c2" alarm={alarm} temp={temp ?? "-60C"} open={open} />;
    case "backup_freezer":
      return <Freezer body="#1a4480" door="#235194" alarm={alarm} temp={temp ?? "-81C"} open={open} />;
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
