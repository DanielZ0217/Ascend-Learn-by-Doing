"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { type RoleId } from "@/lib/contracts";
import { createPerson } from "./office-kit/people";
import { buildOffice, type BuiltOffice, type OfficePreset } from "./office-kit/scenes";

type Vec3 = [number, number, number];
type Preset = OfficePreset | "custom";
type OfficeSceneProps = {
  preset?: Preset;
  companyName?: string;
  preview?: boolean;
  previewRole?: RoleId;
  selectedRole?: RoleId | null;
  enteringRole?: boolean;
  returnFromRole?: RoleId | null;
  reducedMotion?: boolean;
  meetingProgress?: number;
  resetSignal?: number;
  onOrbitAngleChange?: (angle: number) => void;
  onPreviewRole?: (role: RoleId) => void;
  onSelectRole?: (role: RoleId) => void;
};

const homeTarget = new THREE.Vector3(0, .7, 0);
const homePosition = new THREE.Vector3(15.2, 14.5, 16.1);
const closeOffset = new THREE.Vector3(3.5, 4.4, 4.8);
const roleOrder: Record<OfficePreset, Array<RoleId | null>> = {
  software: ["software-engineer", "sales-marketing", "customer-support", "data-analyst", "product-manager"],
  bank: ["customer-support", "software-engineer", "data-analyst", "sales-marketing", "product-manager"],
  restaurant: ["software-engineer", "sales-marketing", "data-analyst", "product-manager", "customer-support"],
  semiconductor: ["software-engineer", "sales-marketing", "customer-support", "data-analyst", "product-manager", null],
  creative: ["software-engineer", "sales-marketing", "customer-support", "data-analyst", "product-manager"],
};
const meetingPlaces: Record<OfficePreset, Vec3> = {
  software: [-.4, 0, -2.7],
  bank: [-4, 0, 2.7],
  restaurant: [-3.7, 0, 1.35],
  semiconductor: [0, 0, .15],
  creative: [-2.1, 0, -2.1],
};
const meetingWaypoints: Record<OfficePreset, Vec3> = {
  software: [.4, 0, 1.5],
  bank: [-2, 0, 1.1],
  restaurant: [-1.1, 0, 2.7],
  semiconductor: [0, 0, 1.55],
  creative: [-.3, 0, .8],
};
const skies: Record<OfficePreset, string> = {
  software: "#f3eee5",
  bank: "#f3eee5",
  restaurant: "#f5eee6",
  semiconductor: "#edf3f2",
  creative: "#f4eee7",
};

function choosePreset(preset: Preset | undefined): OfficePreset {
  return preset === "custom" || !preset ? "creative" : preset;
}

function lerpPoint(from: Vec3, to: Vec3, alpha: number): Vec3 {
  return [THREE.MathUtils.lerp(from[0], to[0], alpha), 0, THREE.MathUtils.lerp(from[2], to[2], alpha)];
}

function meetingPosition(station: Vec3, preset: OfficePreset, progress: number): Vec3 {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  return t < .55
    ? lerpPoint(station, meetingWaypoints[preset], t / .55)
    : lerpPoint(meetingWaypoints[preset], meetingPlaces[preset], (t - .55) / .45);
}

function positionsFor(office: BuiltOffice, preset: OfficePreset): Record<RoleId, Vec3> {
  const stations = {} as Record<RoleId, Vec3>;
  office.people.forEach((person, index) => {
    const role = roleOrder[preset][index];
    if (role) stations[role] = [person.position.x, 0, person.position.z];
  });
  return stations;
}

function CameraController({ preview, selectedRole, enteringRole, returnFromRole, reducedMotion, meetingProgress = 0, resetSignal = 0, compact, onOrbitAngleChange, preset, stations }: OfficeSceneProps & {
  compact: boolean;
  preset: OfficePreset;
  stations: Record<RoleId, Vec3>;
}) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const mode = useRef<"idle" | "enter" | "return">("idle");
  const didInitialize = useRef(false);
  const lastReset = useRef(resetSignal);
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const scale = compact && !preview ? 1.43 : preview ? 1.2 : 1;
  const homeAngle = Math.round(THREE.MathUtils.radToDeg(Math.atan2(homePosition.x, homePosition.z)));

  useEffect(() => {
    if (preview || !controls.current || didInitialize.current) return;
    didInitialize.current = true;
    camera.position.copy(homePosition).multiplyScalar(scale);
    controls.current.target.copy(homeTarget);
    controls.current.update();
    controls.current.saveState();
    if (returnFromRole && !reducedMotion) {
      const station = stations[returnFromRole];
      const person = returnFromRole === "sales-marketing" || returnFromRole === "customer-support"
        ? meetingPosition(station, preset, 1) : station;
      camera.position.set(person[0] + closeOffset.x, closeOffset.y, person[2] + closeOffset.z);
      controls.current.target.set(person[0], .8, person[2]);
      controls.current.update();
      mode.current = "return";
    }
  }, [camera, preview, reducedMotion, returnFromRole, scale, preset, stations]);

  useEffect(() => {
    if (!preview && enteringRole && selectedRole && !reducedMotion) mode.current = "enter";
  }, [preview, enteringRole, selectedRole, reducedMotion]);

  useEffect(() => {
    if (resetSignal === lastReset.current) return;
    lastReset.current = resetSignal;
    controls.current?.reset();
    onOrbitAngleChange?.(homeAngle);
    mode.current = "idle";
  }, [homeAngle, onOrbitAngleChange, resetSignal]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit || preview || reducedMotion || mode.current === "idle") return;
    if (mode.current === "enter" && selectedRole) {
      const station = stations[selectedRole];
      const person = selectedRole === "sales-marketing" || selectedRole === "customer-support"
        ? meetingPosition(station, preset, meetingProgress) : station;
      desiredPosition.current.set(person[0], person[1], person[2]).add(closeOffset);
      desiredTarget.current.set(person[0], .8, person[2]);
    } else {
      desiredPosition.current.copy(homePosition).multiplyScalar(scale);
      desiredTarget.current.copy(homeTarget);
    }
    const alpha = 1 - Math.exp(-4.6 * Math.min(delta, .05));
    camera.position.lerp(desiredPosition.current, alpha);
    orbit.target.lerp(desiredTarget.current, alpha);
    orbit.update();
    if (mode.current === "return" && camera.position.distanceTo(desiredPosition.current) < .035) {
      mode.current = "idle";
      onOrbitAngleChange?.(homeAngle);
    }
  });

  if (preview) return null;
  return <OrbitControls ref={controls} target={homeTarget.toArray()} enablePan={false}
    enableRotate={!enteringRole} enableZoom={!enteringRole}
    minDistance={compact ? 20 : 15} maxDistance={compact ? 42 : 35}
    minPolarAngle={.38} maxPolarAngle={1.42} rotateSpeed={.7} zoomSpeed={.8}
    enableDamping={!reducedMotion} dampingFactor={.09}
    onStart={() => { if (mode.current !== "enter") mode.current = "idle"; }}
    onEnd={() => {
      if (!controls.current) return;
      const degrees = Math.round(THREE.MathUtils.radToDeg(controls.current.getAzimuthalAngle()));
      onOrbitAngleChange?.(((degrees % 360) + 360) % 360);
    }}/>
}

function Coworker({ object, role, station, preset, selected, highlighted, preview, meetingProgress, reducedMotion, onPreviewRole, onSelectRole }: {
  object: THREE.Group;
  role: RoleId | null;
  station: Vec3;
  preset: OfficePreset;
  selected: boolean;
  highlighted: boolean;
  preview: boolean;
  meetingProgress: number;
  reducedMotion: boolean;
  onPreviewRole?: (role: RoleId) => void;
  onSelectRole?: (role: RoleId) => void;
}) {
  const pointerDown = useRef<{ x: number; y: number } | null>(null);
  const halo = useRef<THREE.Mesh>(null);
  const figure = useRef(object);
  const startingRotation = useRef(object.rotation.y);
  const traveling = selected && (role === "sales-marketing" || role === "customer-support") && meetingProgress > .01;

  useEffect(() => {
    figure.current = object;
    startingRotation.current = object.rotation.y;
  }, [object]);

  useFrame((_, delta) => {
    const person = figure.current;
    const goal = traveling ? meetingPosition(station, preset, meetingProgress) : station;
    person.position.set(goal[0], 0, goal[2]);
    person.userData.setWalking?.(traveling);
    person.rotation.y = traveling ? Math.atan2(meetingWaypoints[preset][0] - station[0], meetingWaypoints[preset][2] - station[2]) : startingRotation.current;
    const targetScale = highlighted && !preview ? 1.06 : 1;
    person.scale.setScalar(reducedMotion ? targetScale : THREE.MathUtils.damp(person.scale.x, targetScale, 10, delta));
    if (halo.current) {
      const target = selected || highlighted ? 1 : .001;
      halo.current.scale.setScalar(reducedMotion ? target : THREE.MathUtils.damp(halo.current.scale.x, target, 12, delta));
    }
  });

  function select(event: ThreeEvent<MouseEvent>) {
    if (!role || preview) return;
    event.stopPropagation();
    if (pointerDown.current && Math.hypot(event.clientX - pointerDown.current.x, event.clientY - pointerDown.current.y) > 5) return;
    onSelectRole?.(role);
  }

  return <primitive object={object}
    onPointerDown={(event: ThreeEvent<PointerEvent>) => { pointerDown.current = { x: event.clientX, y: event.clientY }; }}
    onClick={select}
    onPointerOver={(event: ThreeEvent<PointerEvent>) => {
      if (!role || preview) return;
      event.stopPropagation();
      document.body.style.cursor = "pointer";
      onPreviewRole?.(role);
    }}
    onPointerOut={() => { document.body.style.cursor = "auto"; }}>
    {role && <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]} position={[0, .045, 0]} scale={.001}>
      <ringGeometry args={[.43, .62, 32]}/>
      <meshBasicMaterial color={selected ? "#e7a866" : "#fff2bf"} transparent opacity={.93} depthWrite={false}/>
    </mesh>}
    {role && !preview && <mesh position={[0, .95, 0]} onClick={select}>
      <cylinderGeometry args={[.43, .43, 1.9, 12]}/>
      <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>}
  </primitive>;
}

function Guest({ progress, preset, reducedMotion }: { progress: number; preset: OfficePreset; reducedMotion: boolean }) {
  const guest = useMemo(() => createPerson({ x: 0, z: 0, clothing: "#37586e", skin: "#bf886b", hair: "#342820", pose: "standing", gesture: "wave" }), []);
  useFrame(({ clock }) => {
    const t = THREE.MathUtils.clamp((progress - .2) / .8, 0, 1);
    const start: Vec3 = [-6.3, 0, 4.55];
    const mid: Vec3 = [-4.9, 0, 3.75];
    const point = t < .45 ? lerpPoint(start, mid, t / .45) : lerpPoint(mid, meetingPlaces[preset], (t - .45) / .55);
    guest.root.position.set(point[0], 0, point[2]);
    guest.update(reducedMotion ? 0 : clock.elapsedTime);
  });
  return <primitive object={guest.root}/>;
}

function Interior(props: OfficeSceneProps & { compact: boolean }) {
  const preset = choosePreset(props.preset);
  const office = useMemo(() => buildOffice(preset, props.companyName), [preset, props.companyName]);
  const stations = useMemo(() => positionsFor(office, preset), [office, preset]);
  const room = useRef(office);
  const { preview, previewRole, selectedRole, reducedMotion = false, meetingProgress = 0, onPreviewRole, onSelectRole } = props;

  useFrame(({ camera, clock }) => {
    const model = room.current;
    model.update(reducedMotion || preview ? 0 : clock.elapsedTime);
    const backWall = model.root.getObjectByName("cutaway-back");
    if (backWall) backWall.visible = camera.position.z >= 0;
    for (const wall of model.root.children) {
      if (wall.name === "cutaway-side" || wall.name === "cutaway-side-detail") wall.visible = camera.position.x >= 0;
    }
  });

  return <>
    <color attach="background" args={[skies[preset]]}/>
    <hemisphereLight args={["#fff4de", "#94a4a2", 1.35]}/>
    <directionalLight position={[-6, 12, 9]} intensity={3.25} color="#ffdfb2" castShadow
      shadow-mapSize={[2048, 2048]} shadow-bias={-.00017} shadow-normalBias={.035} shadow-radius={3}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}/>
    <directionalLight position={[8, 6, -7]} intensity={.75} color="#e4edf5"/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.61, 0]} receiveShadow>
      <planeGeometry args={[100, 100]}/>
      <shadowMaterial color="#897766" opacity={.21}/>
    </mesh>
    <CameraController {...props} preset={preset} stations={stations}/>
    <primitive object={office.root}/>
    {office.people.map((person, index) => {
      const role = roleOrder[preset][index] ?? null;
      const station: Vec3 = role ? stations[role] : [person.position.x, 0, person.position.z];
      return <Coworker key={index} object={person} role={role} station={station} preset={preset}
        selected={selectedRole === role && role !== null} highlighted={previewRole === role && role !== null}
        preview={Boolean(preview)} reducedMotion={reducedMotion} meetingProgress={meetingProgress}
        onPreviewRole={onPreviewRole} onSelectRole={onSelectRole}/>;
    })}
    {selectedRole && meetingProgress > .2 && (selectedRole === "sales-marketing" || selectedRole === "customer-support") &&
      <Guest progress={meetingProgress} preset={preset} reducedMotion={reducedMotion}/>}
  </>;
}

export function OfficeScene(props: OfficeSceneProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const updateCompact = () => setCompact(window.innerWidth < 650);
    updateCompact();
    window.addEventListener("resize", updateCompact);
    const frame = requestAnimationFrame(() => {
      try { const canvas = document.createElement("canvas"); setWebgl(Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"))); }
      catch { setWebgl(false); }
    });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", updateCompact); };
  }, []);

  if (webgl !== true) return <div className="scene-fallback" role="img" aria-label="Illustration of a connected workplace with meeting and work areas">
    <div className="fallback-floor"><span className="fallback-room r1">WORKSPACE</span><span className="fallback-room r2">MEETING</span><span className="fallback-room r3">LOUNGE</span><span className="fallback-desk d1"/><span className="fallback-desk d2"/><span className="fallback-desk d3"/><span className="fallback-person p1"/><span className="fallback-person p2"/><span className="fallback-person p3"/><span className="fallback-person p4"/><span className="fallback-person p5"/></div>
    <span className="fallback-caption">{webgl === null ? "Preparing the workplace…" : "Interactive scene unavailable on this device. Choose a coworker from the list."}</span>
  </div>;

  const scale = compact && !props.preview ? 1.43 : props.preview ? 1.2 : 1;
  return <Canvas className="office-webgl" shadows dpr={[1, 1.6]}
    camera={{ position: homePosition.clone().multiplyScalar(scale).toArray(), fov: props.preview ? 33 : 30 }}
    gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
    onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.12; gl.shadowMap.type = THREE.PCFShadowMap; }}
    fallback={<div className="scene-fallback">Interactive scene unavailable. Choose a coworker from the list.</div>}>
    <Interior key={`${props.preset ?? "custom"}:${props.companyName ?? ""}`} {...props} compact={compact}/>
  </Canvas>;
}
