"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  ContactShadows,
  RoundedBox,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  SoftShadows,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import LabModel from "./models";
import SampleA12, { A12_PIN_POS } from "./SampleA12";
import SampleC17 from "./SampleC17";
import Pin from "./Pin";
import { useLabStore } from "@/store/labStore";
import {
  LAB_OBJECTS,
  OBJECT_POS,
  SAMPLE_LOCATION_POS,
  SAMPLE_STATUS_TONE,
  type Tone,
  type Vec3,
} from "@/lib/labObjects";
import {
  floorNormalTexture,
  floorRoughnessTexture,
  gradientTexture,
  nameplateTexture,
  signTexture,
  wallNormalTexture,
} from "@/lib/labTextures";

// Soft pastel accent stripe colors (cool cold-zone → warm prep-zone), kept light + inviting.
const ACCENT_STOPS = ["#a9d4ff", "#bfe8dd", "#d8e8ff", "#ffe2c2", "#ffd0e0"];
import type { LabViewPreset, SampleStatus } from "@/types/lab";

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
      flat
      camera={{ position: [0, 2.15, -7.2], fov: 54 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => setSelectedPin(null)}
    >
      <color attach="background" args={["#e7eef7"]} />
      <fog attach="fog" args={["#dde7f2", 30, 62]} />

      <SoftShadows size={22} samples={9} focus={0.65} />

      {/* IBL + reflections — fully procedural, no HDR download. The Lightformer
          banks are what glass/metal actually reflect, and they fill the room. */}
      <LabEnvironment />

      {/* Ambient/hemisphere are now just a low floor of fill — the Environment
          carries most of the soft light; the directional is the shaping key. */}
      <ambientLight intensity={0.16} />
      <hemisphereLight args={["#eaf2ff", "#aeb8c4", 0.32]} />
      <directionalLight
        position={[8.5, 13, 6.5]}
        intensity={2.3}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <pointLight position={[-6.4, 3.4, 4.6]} intensity={0.7} color="#69b6ff" distance={16} decay={1.2} />
      <pointLight position={[6.2, 3.2, -2.8]} intensity={0.5} color="#54e0bb" distance={14} decay={1.2} />

      <LabRoom />
      <Grid
        position={[0, 0.045, 0]}
        args={[ROOM_WIDTH, ROOM_DEPTH]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#9fb2c8"
        sectionSize={5}
        sectionThickness={0.6}
        sectionColor="#7e93ad"
        fadeDistance={30}
        fadeStrength={1.4}
        infiniteGrid={false}
        followCamera={false}
      />
      <ContactShadows position={[0, 0.05, 0]} opacity={0.5} scale={34} blur={2.4} far={9} color="#384450" />
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
        tone={SAMPLE_STATUS_TONE[sample.status]}
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

      <Effects />
    </Canvas>
  );
}

/* Procedural studio environment: ceiling banks + side strips become the
   reflections you see in vials, cabinets, and the floor. Baked once. */
function LabEnvironment() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      {/* dark surround so reflections have contrast instead of washing out */}
      <color attach="background" args={["#0c1118"]} />
      {/* main ceiling banks (overhead) */}
      <Lightformer form="rect" intensity={3.4} color="#ffffff" position={[0, 8, 1]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 8, 1]} />
      <Lightformer form="rect" intensity={2.2} color="#cfe4ff" position={[-7, 7, -5]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
      <Lightformer form="rect" intensity={2.2} color="#fff0d6" position={[7, 7, -5]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
      <Lightformer form="rect" intensity={1.8} color="#eaf4ff" position={[-6, 7, 7]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
      <Lightformer form="rect" intensity={1.8} color="#eaf4ff" position={[6, 7, 7]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
      {/* side strips → vertical streak highlights on stainless / glass */}
      <Lightformer form="rect" intensity={1.3} color="#ffffff" position={[-13, 3.5, 0]} rotation={[0, Math.PI / 2, 0]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={1.3} color="#ffffff" position={[13, 3.5, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={1.0} color="#bcd4ff" position={[0, 3, 12]} rotation={[0, Math.PI, 0]} scale={[14, 3, 1]} />
    </Environment>
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom mipmapBlur luminanceThreshold={0.62} luminanceSmoothing={0.2} intensity={0.55} radius={0.7} />
      <Vignette eskil={false} offset={0.22} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

function LabRoom() {
  const benches = [
    [-14.1, 0.72, 10.2, 2.2, 1.05, 0.45],
    [5.2, 0.72, 10.2, 5.2, 1.05, 0.45],
  ] as const;

  const wallNormal = wallNormalTexture(5);

  return (
    <group>
      {/* polished epoxy floor (mirror-ish), with seam normals + smudge roughness */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <MeshReflectorMaterial
          resolution={1024}
          mirror={0.34}
          mixStrength={0.85}
          mixBlur={1.4}
          blur={[320, 110]}
          minDepthThreshold={0.85}
          maxDepthThreshold={1.1}
          depthScale={0.5}
          metalness={0.3}
          roughness={0.95}
          roughnessMap={floorRoughnessTexture(5)}
          normalMap={floorNormalTexture(7)}
          normalScale={new THREE.Vector2(0.28, 0.28)}
          color="#93a2b6"
        />
      </mesh>

      {/* walls (front -Z open for the entry shot) */}
      <mesh position={[0, ROOM_HEIGHT / 2, HALF_ROOM_DEPTH + 0.05]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, 0.18]} />
        <meshStandardMaterial color="#d7e3f0" roughness={0.92} metalness={0.0} normalMap={wallNormal} normalScale={new THREE.Vector2(0.4, 0.4)} />
      </mesh>
      <mesh position={[-HALF_ROOM_WIDTH + 0.05, ROOM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[0.18, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#e2ecf6" roughness={0.92} normalMap={wallNormal} normalScale={new THREE.Vector2(0.4, 0.4)} />
      </mesh>
      <mesh position={[HALF_ROOM_WIDTH - 0.05, ROOM_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[0.18, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#dbe6f2" roughness={0.92} normalMap={wallNormal} normalScale={new THREE.Vector2(0.4, 0.4)} />
      </mesh>
      {/* ceiling — kept a touch darker so the light fixtures read as bright */}
      <mesh position={[0, ROOM_HEIGHT + 0.02, 0]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.16, ROOM_DEPTH]} />
        <meshStandardMaterial color="#e6edf4" roughness={0.96} />
      </mesh>

      {/* wall base / skirting for a finished edge */}
      <mesh position={[0, 0.12, HALF_ROOM_DEPTH - 0.02]}>
        <boxGeometry args={[ROOM_WIDTH, 0.24, 0.06]} />
        <meshStandardMaterial color="#b6c5d6" roughness={0.6} metalness={0.2} />
      </mesh>

      <WallPanels />
      <AccentStripes />
      <CeilingFixtures />
      <Windows />

      {benches.map(([x, y, z, w, h, d]) => (
        <RoundedBox key={x} position={[x, y, z]} args={[w, h, d]} radius={0.03} castShadow receiveShadow>
          <meshStandardMaterial color="#c8d4e0" metalness={0.4} roughness={0.32} />
        </RoundedBox>
      ))}

      {/* cable tray / floor channel along the back */}
      <mesh position={[0, 0.08, HALF_ROOM_DEPTH - 0.2]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH - 0.2, 0.16, 0.28]} />
        <meshStandardMaterial color="#9fb0c2" roughness={0.5} metalness={0.25} />
      </mesh>
    </group>
  );
}

function WallPanels() {
  const panelXs = [-12.8, -9.6, -6.4, -3.2, 0, 3.2, 6.4, 9.6, 12.8];
  const panelZ = HALF_ROOM_DEPTH - 0.06;
  const signZ = HALF_ROOM_DEPTH - 0.1;
  const readableFromInside: [number, number, number] = [0, Math.PI, 0];

  const coldSign = signTexture({ title: "COLD CHAIN ZONE", subtitle: "−80 °C STORAGE · AUTHORIZED PERSONNEL", bg: "#1f5fa8", accent: "#7ec8ff" });
  const prepSign = signTexture({ title: "PREP & IMAGING", subtitle: "BSL-2 · PPE REQUIRED BEYOND THIS POINT", bg: "#1c7a60", accent: "#67e3bd" });

  return (
    <group>
      {/* acoustic wall panels, lightly tinted by zone (cool cold-chain ← → mint prep) */}
      {panelXs.map((x) => (
        <mesh key={x} position={[x, 2.55, panelZ]}>
          <boxGeometry args={[1.75, 1.05, 0.04]} />
          <meshStandardMaterial color={x < -0.5 ? "#dcebff" : x > 0.5 ? "#dcf6ec" : "#eaf1fb"} roughness={0.7} metalness={0.04} />
        </mesh>
      ))}
      {/* printed signage (real text rendered to a texture) */}
      <group position={[-9.1, 4.35, signZ]} rotation={readableFromInside}>
        <mesh>
          <planeGeometry args={[5.4, 1.0]} />
          <meshStandardMaterial map={coldSign} roughness={0.5} metalness={0.05} toneMapped />
        </mesh>
      </group>
      <group position={[6.2, 4.35, signZ]} rotation={readableFromInside}>
        <mesh>
          <planeGeometry args={[6.0, 1.0]} />
          <meshStandardMaterial map={prepSign} roughness={0.5} metalness={0.05} toneMapped />
        </mesh>
      </group>
    </group>
  );
}

// Soft glowing pastel accent line wrapping the three walls — modern, inviting, light.
function AccentStripes() {
  const grad = gradientTexture(ACCENT_STOPS, true);
  const gradV = gradientTexture(ACCENT_STOPS, false);
  const y = 3.5;
  const h = 0.22;
  return (
    <group>
      {/* back wall */}
      <mesh position={[0, y, HALF_ROOM_DEPTH - 0.08]}>
        <boxGeometry args={[ROOM_WIDTH - 0.6, h, 0.03]} />
        <meshStandardMaterial map={grad} emissiveMap={grad} emissive="#ffffff" emissiveIntensity={0.95} toneMapped={false} roughness={0.4} />
      </mesh>
      {/* left + right walls */}
      <mesh position={[-HALF_ROOM_WIDTH + 0.08, y, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_DEPTH - 0.6, h, 0.03]} />
        <meshStandardMaterial map={gradV} emissiveMap={gradV} emissive="#ffffff" emissiveIntensity={0.95} toneMapped={false} roughness={0.4} />
      </mesh>
      <mesh position={[HALF_ROOM_WIDTH - 0.08, y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[ROOM_DEPTH - 0.6, h, 0.03]} />
        <meshStandardMaterial map={gradV} emissiveMap={gradV} emissive="#ffffff" emissiveIntensity={0.95} toneMapped={false} roughness={0.4} />
      </mesh>
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
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.4} toneMapped={false} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.04, 0]}>
            <boxGeometry args={[3.85, 0.05, 0.88]} />
            <meshStandardMaterial color="#c2d0df" metalness={0.5} roughness={0.4} />
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
          {/* bright exterior behind the glass */}
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[1.75, 1.4, 0.02]} />
            <meshStandardMaterial color="#dff0ff" emissive="#cfe6ff" emissiveIntensity={0.8} toneMapped={false} />
          </mesh>
          {/* glass */}
          <mesh>
            <boxGeometry args={[1.6, 1.25, 0.04]} />
            <meshPhysicalMaterial color="#cfe7f6" transparent opacity={0.3} roughness={0.05} metalness={0} transmission={0.6} thickness={0.1} clearcoat={1} clearcoatRoughness={0.04} />
          </mesh>
          {/* aluminium frame */}
          <mesh position={[0, 0, -0.02]}>
            <boxGeometry args={[1.78, 1.42, 0.04]} />
            <meshStandardMaterial color="#aab6c4" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.05, 1.3, 0.06]} />
            <meshStandardMaterial color="#9aa7b6" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function NamePlate({ label, code, size }: { label: string; code: string; size: Vec3 }) {
  const frontZ = size[2] / 2 + 0.07;
  const y = -size[1] / 2 + 0.26;
  const width = Math.min(1.5, Math.max(0.82, (code.length + label.length) * 0.052));
  const tex = nameplateTexture(code, label);

  return (
    <group position={[0, y, frontZ]}>
      {/* metal backing with a slight bevel */}
      <mesh>
        <boxGeometry args={[width + 0.04, 0.26, 0.02]} />
        <meshStandardMaterial color="#aeb8c6" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, 0.21]} />
        <meshStandardMaterial map={tex} roughness={0.42} metalness={0.3} />
      </mesh>
    </group>
  );
}

function StateGlows({ sampleStatus, messageStatus }: { sampleStatus: SampleStatus; messageStatus: string }) {
  const benchAlert = sampleStatus === "warning" || sampleStatus === "critical";
  const benchColor = sampleStatus === "critical" ? "#ff3b5c" : "#ffb020";
  const messageActive = messageStatus === "draft" || sampleStatus === "critical";

  // anchor to the live data positions instead of hardcoded coordinates
  const bench = SAMPLE_LOCATION_POS["Bench 2"];
  const msg = OBJECT_POS["pi_postdoc"] ?? [7, 0.9, 0];

  return (
    <group>
      {benchAlert && (
        <>
          <pointLight position={[bench[0], 1.8, bench[2]]} intensity={sampleStatus === "critical" ? 2.6 : 1.55} color={benchColor} distance={6} decay={1.4} />
          <mesh position={[bench[0], 0.06, bench[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.9, 2.25, 48]} />
            <meshBasicMaterial color={benchColor} transparent opacity={sampleStatus === "critical" ? 0.4 : 0.26} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </>
      )}
      {messageActive && (
        <>
          <pointLight position={[msg[0], 1.65, msg[2]]} intensity={1.5} color="#ff5ca8" distance={5} decay={1.4} />
          <mesh position={[msg[0], 0.07, msg[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.78, 1.05, 42]} />
            <meshBasicMaterial color="#ff5ca8" transparent opacity={0.3} side={THREE.DoubleSide} toneMapped={false} />
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

// First-person-ish walking with momentum (ease-in / glide-out), Shift to run, and a
// subtle vertical head-bob while moving. Bob is applied to camera AND orbit target by
// the same amount so it survives OrbitControls.update().
function KeyboardWalkControls({ controlsRef }: { controlsRef: MutableRefObject<any> }) {
  const { camera } = useThree();
  const pressed = useRef(new Set<string>());
  const velocity = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);
  const bobY = useRef(0);
  const lastBob = useRef(0);

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

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05); // clamp huge frames (tab refocus) so we don't lurch
    const controls = controlsRef.current;
    const keys = pressed.current;

    // desired horizontal direction from keys, relative to where we're looking
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const dir = new THREE.Vector3();
    if (keys.has("KeyW") || keys.has("ArrowUp")) dir.add(forward);
    if (keys.has("KeyS") || keys.has("ArrowDown")) dir.sub(forward);
    if (keys.has("KeyD") || keys.has("ArrowRight")) dir.add(right);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) dir.sub(right);
    const moving = dir.lengthSq() > 0;
    if (moving) dir.normalize();

    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const maxSpeed = sprint ? 8.8 : 5.2;

    // momentum: ease velocity toward the target (quick to start, gentle glide to stop)
    const targetVel = dir.multiplyScalar(maxSpeed);
    velocity.current.lerp(targetVel, Math.min(1, dt * (moving ? 11 : 7)));
    if (velocity.current.lengthSq() < 1e-4) velocity.current.set(0, 0, 0);
    const speed = velocity.current.length();

    // head-bob driven by actual speed
    if (speed > 0.06) bobPhase.current += dt * (sprint ? 13 : 9.5);
    const amp = THREE.MathUtils.clamp(speed / maxSpeed, 0, 1) * (sprint ? 0.06 : 0.04);
    const targetBob = Math.sin(bobPhase.current) * amp;
    bobY.current += (targetBob - bobY.current) * Math.min(1, dt * 12);

    const moveDelta = velocity.current.clone().multiplyScalar(dt); // horizontal (y=0)
    const bobDelta = bobY.current - lastBob.current;
    lastBob.current = bobY.current;

    if (moveDelta.lengthSq() === 0 && Math.abs(bobDelta) < 1e-6) return;

    // clamp horizontal travel to the room
    const next = camera.position.clone().add(moveDelta);
    next.x = THREE.MathUtils.clamp(next.x, -HALF_ROOM_WIDTH + 1.2, HALF_ROOM_WIDTH - 1.2);
    next.z = THREE.MathUtils.clamp(next.z, -HALF_ROOM_DEPTH + 1.2, HALF_ROOM_DEPTH - 1.35);
    const applied = next.sub(camera.position); // post-clamp horizontal delta
    applied.y += bobDelta;

    camera.position.add(applied);
    if (controls?.target) {
      controls.target.x += applied.x;
      controls.target.z += applied.z;
      controls.target.y += bobDelta;
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
    code === "ArrowRight" ||
    code === "ShiftLeft" ||
    code === "ShiftRight"
  );
}
