"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, ContactShadows, Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import LabModel from "./models";
import SampleA12, { A12_PIN_POS } from "./SampleA12";
import SampleC17 from "./SampleC17";
import Pin from "./Pin";
import { useLabStore } from "@/store/labStore";
import { LAB_OBJECTS, SAMPLE_LOCATION_POS, type Tone, type Vec3 } from "@/lib/labObjects";
import type { LabViewPreset, SampleStatus } from "@/types/lab";

const STATUS_TONE: Record<SampleStatus, Tone> = {
  stored: "info",
  tracking: "ok",
  stabilized: "ok",
  warning: "warn",
  critical: "crit",
};

const ROOM_WIDTH = 32;
const ROOM_DEPTH = 24;
const ROOM_HEIGHT = 8;
const HALF_ROOM_WIDTH = ROOM_WIDTH / 2;
const HALF_ROOM_DEPTH = ROOM_DEPTH / 2;

const CAMERA_PRESETS: Record<LabViewPreset, { position: Vec3; target: Vec3 }> = {
  entry: { position: [0, 2.15, -7.2], target: [0.3, 1.45, -0.5] },
  cold: { position: [-6.4, 2.35, 5.8], target: [-6.2, 1.5, 10.5] },
  bench: { position: [0.7, 2.05, -3.2], target: [2.6, 1.12, 1] },
  inventory: { position: [-3.6, 2.25, 1.7], target: [-0.4, 1.25, 4.1] },
  message: { position: [4.9, 2.15, -2.7], target: [7, 1.15, 0] },
  overview: { position: [9.8, 5.2, -8.8], target: [0.2, 1.15, 0.7] },
};

export default function LabScene() {
  const highlighted = useLabStore((s) => s.highlighted);
  const selectedPinId = useLabStore((s) => s.selectedPinId);
  const setSelectedPin = useLabStore((s) => s.setSelectedPin);
  const sample = useLabStore((s) => s.sample);
  const messageStatus = useLabStore((s) => s.messageStatus);
  const viewPreset = useLabStore((s) => s.viewPreset);
  const viewPresetTick = useLabStore((s) => s.viewPresetTick);
  const equipment = useLabStore((s) => s.equipment);
  const eqStatus: Record<string, string> = {};
  for (const e of equipment) eqStatus[e.id] = e.status;
  const controlsRef = useRef<any>(null);

  const samplePos = SAMPLE_LOCATION_POS[sample.location];
  const samplePinPos: Vec3 = [samplePos[0], samplePos[1] + 1.35, samplePos[2]];

  return (
    <Canvas
      camera={{ position: [0, 2.15, -7.2], fov: 54 }}
      shadows
      dpr={[1, 2]}
      onPointerMissed={() => setSelectedPin(null)}
    >
      <color attach="background" args={["#eef5ff"]} />
      <fog attach="fog" args={["#eef5ff", 22, 48]} />

      <ambientLight intensity={0.78} />
      <hemisphereLight args={["#f7fbff", "#a9b9c8", 0.9]} />
      <directionalLight
        position={[7, 12, 7]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <rectAreaLight position={[-3.5, ROOM_HEIGHT - 0.15, 2]} rotation={[-Math.PI / 2, 0, 0]} args={["#ffffff", 4.2, 4.4, 1.2]} />
      <rectAreaLight position={[3.8, ROOM_HEIGHT - 0.15, -1.6]} rotation={[-Math.PI / 2, 0, 0]} args={["#f5fbff", 3.8, 4.6, 1.2]} />
      <pointLight position={[-6.4, 3.4, 4.6]} intensity={0.85} color="#4aa8ff" />
      <pointLight position={[6.2, 3.2, -2.8]} intensity={0.55} color="#36d1a6" />

      <LabRoom />
      <Grid
        position={[0, 0.035, 0]}
        args={[ROOM_WIDTH, ROOM_DEPTH]}
        cellSize={1}
        cellThickness={0.45}
        cellColor="#c7d4e5"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#a7bad3"
        fadeDistance={28}
        fadeStrength={1.1}
        infiniteGrid={false}
        followCamera={false}
      />
      <ContactShadows position={[0, 0.04, 0]} opacity={0.38} scale={30} blur={2.6} far={8} color="#536070" />
      <StateGlows sampleStatus={sample.status} messageStatus={messageStatus} />

      {/* equipment models + pins */}
      {LAB_OBJECTS.map((o) => {
        const pinY = o.position[1] + o.size[1] / 2 + (o.shape === "sphere" ? 0.45 : 0.6);
        const pinPos: Vec3 = [o.position[0], pinY, o.position[2]];
        const alarm = eqStatus[o.id] === "alarm" || eqStatus[o.id] === "error";
        const tone: Tone = alarm ? "crit" : o.tone;
        return (
          <group key={o.id}>
            <group position={o.position} rotation-y={o.rotationY ?? 0}>
              <LabModel
                id={o.id}
                highlighted={o.id === "shelf_a" && highlighted === "shelf_a"}
                alarm={alarm}
              />
              <NamePlate label={o.label} code={o.code} size={o.size} />
            </group>
            <Pin
              position={pinPos}
              code={o.code}
              tone={tone}
              active={selectedPinId === o.id}
              pulse={alarm}
              onClick={() => setSelectedPin(o.id)}
            />
          </group>
        );
      })}

      {/* Backup sample A12 + its pin */}
      <SampleA12 />
      <Pin
        position={A12_PIN_POS}
        code="A12"
        tone="ok"
        active={selectedPinId === "sample_a12"}
        onClick={() => setSelectedPin("sample_a12")}
      />

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
        ref={controlsRef}
        makeDefault
        enablePan={false}
        target={[0.3, 1.45, -0.5]}
        minDistance={2.2}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 4.8}
        enableDamping
        dampingFactor={0.07}
      />
      <KeyboardWalkControls controlsRef={controlsRef} />
      <PresetCameraRig preset={viewPreset} tick={viewPresetTick} controlsRef={controlsRef} />
    </Canvas>
  );
}

function LabRoom() {
  const benches = [
    [-14.1, 0.72, 10.2, 2.2, 1.05, 0.45],
    [5.2, 0.72, 10.2, 5.2, 1.05, 0.45],
  ] as const;

  return (
    <group>
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.04, ROOM_DEPTH]} />
        <meshStandardMaterial color="#e4ebf4" roughness={0.62} metalness={0.08} />
      </mesh>

      <mesh position={[0, ROOM_HEIGHT / 2, HALF_ROOM_DEPTH + 0.05]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, 0.18]} />
        <meshStandardMaterial color="#dce9f5" roughness={0.78} />
      </mesh>
      <mesh position={[-HALF_ROOM_WIDTH + 0.05, ROOM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[0.18, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#e8f1f8" roughness={0.78} />
      </mesh>
      <mesh position={[HALF_ROOM_WIDTH - 0.05, ROOM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[0.18, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#e2edf6" roughness={0.78} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT + 0.02, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.16, ROOM_DEPTH]} />
        <meshStandardMaterial color="#f5f9fc" roughness={0.86} />
      </mesh>

      <WallPanels />
      <CeilingFixtures />
      <Windows />

      {benches.map(([x, y, z, w, h, d]) => (
        <RoundedBox key={x} position={[x, y, z]} args={[w, h, d]} radius={0.03} castShadow receiveShadow>
          <meshStandardMaterial color="#c8d4e0" metalness={0.25} roughness={0.42} />
        </RoundedBox>
      ))}

      <mesh position={[0, 0.08, HALF_ROOM_DEPTH - 0.2]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH - 0.2, 0.16, 0.28]} />
        <meshStandardMaterial color="#b8c7d6" roughness={0.55} />
      </mesh>
    </group>
  );
}

function WallPanels() {
  const panelXs = [-12.8, -9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6, 12.8];
  const panelZ = HALF_ROOM_DEPTH - 0.06;
  const signZ = HALF_ROOM_DEPTH - 0.1;
  const readableFromInside: [number, number, number] = [0, Math.PI, 0];

  return (
    <group>
      {panelXs.map((x) => (
        <mesh key={x} position={[x, 2.55, panelZ]}>
          <boxGeometry args={[1.75, 1.05, 0.04]} />
          <meshStandardMaterial color="#f7fbff" roughness={0.48} metalness={0.05} />
        </mesh>
      ))}
      <mesh position={[-9.1, 4.38, signZ]}>
        <boxGeometry args={[5.2, 0.48, 0.05]} />
        <meshStandardMaterial color="#2b6cb0" emissive="#1f76cc" emissiveIntensity={0.08} roughness={0.4} />
      </mesh>
      <Text position={[-9.1, 4.4, signZ - 0.04]} rotation={readableFromInside} fontSize={0.22} color="#edf7ff" anchorX="center">
        COLD CHAIN ZONE
      </Text>
      <mesh position={[6.2, 4.38, signZ]}>
        <boxGeometry args={[5.8, 0.48, 0.05]} />
        <meshStandardMaterial color="#22735d" emissive="#22a885" emissiveIntensity={0.08} roughness={0.4} />
      </mesh>
      <Text position={[6.2, 4.4, signZ - 0.04]} rotation={readableFromInside} fontSize={0.22} color="#effff8" anchorX="center">
        PREP AND IMAGING
      </Text>
    </group>
  );
}

function CeilingFixtures() {
  const fixtures = [
    [-8.2, ROOM_HEIGHT - 0.08, 5.2],
    [4.2, ROOM_HEIGHT - 0.08, 5.2],
    [-8.2, ROOM_HEIGHT - 0.08, -4.2],
    [4.2, ROOM_HEIGHT - 0.08, -4.2],
  ] as const;

  return (
    <group>
      {fixtures.map(([x, y, z]) => (
        <group key={`${x}-${z}`} position={[x, y, z]}>
          <mesh>
            <boxGeometry args={[3.6, 0.05, 0.68]} />
            <meshStandardMaterial color="#fbfdff" emissive="#ffffff" emissiveIntensity={0.9} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[3.85, 0.05, 0.88]} />
            <meshStandardMaterial color="#ccd8e5" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Windows() {
  return (
    <group>
      {[-5.9, -3.35].map((z) => (
        <group key={z} position={[HALF_ROOM_WIDTH - 0.16, 3.15, z]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[1.6, 1.25, 0.035]} />
            <meshStandardMaterial color="#bfe0f6" transparent opacity={0.38} roughness={0.04} metalness={0.12} />
          </mesh>
          <mesh position={[0, 0, -0.03]}>
            <boxGeometry args={[1.75, 1.4, 0.035]} />
            <meshStandardMaterial color="#eef5fb" roughness={0.36} metalness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NamePlate({ label, code, size }: { label: string; code: string; size: Vec3 }) {
  const frontZ = size[2] / 2 + 0.08;
  const y = -size[1] / 2 + 0.24;

  return (
    <group position={[0, y, frontZ]}>
      <mesh>
        <boxGeometry args={[Math.min(1.45, Math.max(0.74, label.length * 0.062)), 0.22, 0.025]} />
        <meshStandardMaterial color="#f7fbff" roughness={0.35} metalness={0.08} />
      </mesh>
      <Text position={[0, 0.012, 0.02]} fontSize={0.082} color="#263447" anchorX="center" anchorY="middle" maxWidth={1.32}>
        {code}  {label}
      </Text>
    </group>
  );
}

function StateGlows({ sampleStatus, messageStatus }: { sampleStatus: SampleStatus; messageStatus: string }) {
  const benchAlert = sampleStatus === "warning" || sampleStatus === "critical";
  const benchColor = sampleStatus === "critical" ? "#ff3b5c" : "#ffb020";
  const messageActive = messageStatus === "draft" || sampleStatus === "critical";

  return (
    <group>
      {benchAlert && (
        <>
          <pointLight position={[2.5, 1.8, 1]} intensity={sampleStatus === "critical" ? 2.4 : 1.45} color={benchColor} distance={5.8} />
          <mesh position={[2.5, 0.055, 1]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.9, 2.25, 48]} />
            <meshBasicMaterial color={benchColor} transparent opacity={sampleStatus === "critical" ? 0.38 : 0.24} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
      {messageActive && (
        <>
          <pointLight position={[7, 1.65, 0]} intensity={1.4} color="#ff5ca8" distance={4.8} />
          <mesh position={[7, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.78, 1.05, 42]} />
            <meshBasicMaterial color="#ff5ca8" transparent opacity={0.28} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
}

function PresetCameraRig({
  preset,
  tick,
  controlsRef,
}: {
  preset: LabViewPreset;
  tick: number;
  controlsRef: MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const transition = useRef<{
    fromPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPosition: THREE.Vector3;
    toTarget: THREE.Vector3;
    elapsed: number;
  } | null>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    const destination = CAMERA_PRESETS[preset];
    transition.current = {
      fromPosition: camera.position.clone(),
      fromTarget: controls?.target?.clone?.() ?? new THREE.Vector3(0.3, 1.45, -0.5),
      toPosition: new THREE.Vector3(...destination.position),
      toTarget: new THREE.Vector3(...destination.target),
      elapsed: 0,
    };
  }, [camera, controlsRef, preset, tick]);

  useFrame((_, dt) => {
    const current = transition.current;
    if (!current) return;

    current.elapsed += dt;
    const t = Math.min(1, current.elapsed / 1.15);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(current.fromPosition, current.toPosition, eased);

    const controls = controlsRef.current;
    if (controls?.target) {
      controls.target.lerpVectors(current.fromTarget, current.toTarget, eased);
      controls.update();
    } else {
      camera.lookAt(current.toTarget);
    }

    if (t >= 1) transition.current = null;
  });

  return null;
}

function KeyboardWalkControls({ controlsRef }: { controlsRef: MutableRefObject<any> }) {
  const { camera } = useThree();
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Don't hijack keys while the user is typing in a field.
      if (isTypingTarget(event.target)) return;
      if (isWalkKey(event.code)) {
        event.preventDefault();
        pressed.current.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      pressed.current.delete(event.code);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, dt) => {
    if (pressed.current.size === 0) return;

    const controls = controlsRef.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const delta = new THREE.Vector3();
    if (pressed.current.has("KeyW") || pressed.current.has("ArrowUp")) delta.add(forward);
    if (pressed.current.has("KeyS") || pressed.current.has("ArrowDown")) delta.sub(forward);
    if (pressed.current.has("KeyD") || pressed.current.has("ArrowRight")) delta.add(right);
    if (pressed.current.has("KeyA") || pressed.current.has("ArrowLeft")) delta.sub(right);
    if (delta.lengthSq() === 0) return;

    delta.normalize().multiplyScalar(dt * 3.2);
    const next = camera.position.clone().add(delta);
    next.x = THREE.MathUtils.clamp(next.x, -HALF_ROOM_WIDTH + 1.2, HALF_ROOM_WIDTH - 1.2);
    next.z = THREE.MathUtils.clamp(next.z, -HALF_ROOM_DEPTH + 1.2, HALF_ROOM_DEPTH - 1.35);
    delta.subVectors(next, camera.position);

    camera.position.add(delta);
    if (controls?.target) {
      controls.target.add(delta);
      controls.update();
    }
  });

  return null;
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function isWalkKey(code: string) {
  return (
    code === "KeyW" ||
    code === "KeyA" ||
    code === "KeyS" ||
    code === "KeyD" ||
    code === "ArrowUp" ||
    code === "ArrowDown" ||
    code === "ArrowLeft" ||
    code === "ArrowRight"
  );
}
