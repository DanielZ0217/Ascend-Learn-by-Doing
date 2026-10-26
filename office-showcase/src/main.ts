import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildOffice, type BuiltOffice } from "./scenes";
import { mountUI, type Preset } from "./ui";

const host = document.querySelector<HTMLElement>("#scene");
if (!host) throw new Error("The 3D scene mount is missing");

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xffffff, 0);
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-12, 12, 8, -8, .1, 100);
const target = new THREE.Vector3(0, .74, 0);
const initialPosition = new THREE.Vector3(17.5, 15.2, 19.5);
camera.position.copy(initialPosition);
camera.lookAt(target);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(target);
controls.enableDamping = true;
controls.dampingFactor = .085;
controls.enablePan = false;
controls.minPolarAngle = .42;
controls.maxPolarAngle = 1.32;
controls.minZoom = .75;
controls.maxZoom = 1.85;
controls.rotateSpeed = .64;
controls.zoomSpeed = .8;
controls.update();
controls.saveState();

scene.add(new THREE.HemisphereLight(0xfff4de, 0x94a4a2, 1.35));
const sunlight = new THREE.DirectionalLight(0xffdfb2, 3.25);
sunlight.position.set(-6, 12, 9);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(2048, 2048);
sunlight.shadow.camera.left = -12;
sunlight.shadow.camera.right = 12;
sunlight.shadow.camera.top = 12;
sunlight.shadow.camera.bottom = -12;
sunlight.shadow.camera.near = 1;
sunlight.shadow.camera.far = 35;
sunlight.shadow.bias = -.00017;
sunlight.shadow.normalBias = .035;
sunlight.shadow.radius = 3;
scene.add(sunlight);
const fill = new THREE.DirectionalLight(0xe4edf5, .75);
fill.position.set(8, 6, -7);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ color: 0x897766, opacity: .21 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -.61;
ground.receiveShadow = true;
scene.add(ground);

const presets: Preset[] = ["software", "bank", "restaurant", "semiconductor", "creative"];
const offices = new Map<Preset, BuiltOffice>();
for (const preset of presets) {
  const office = buildOffice(preset);
  office.root.visible = preset === "software";
  offices.set(preset, office);
  scene.add(office.root);
}
let active: Preset = "software";
let paused = false;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function select(preset: Preset): void {
  if (active === preset) return;
  offices.get(active)!.root.visible = false;
  active = preset;
  offices.get(active)!.root.visible = true;
  resetView();
}

function resetView(): void {
  controls.reset();
}

const ui = mountUI({
  onSelect: select,
  onReset: resetView,
  onToggleOrbit: (enabled) => { controls.autoRotate = enabled && !reducedMotion; controls.autoRotateSpeed = .5; },
});

function resize(): void {
  const width = host!.clientWidth;
  const height = host!.clientHeight;
  const aspect = width / height;
  const vertical = width < 760 ? Math.max(17, 16 / aspect) : 16.1;
  camera.left = -vertical * aspect / 2;
  camera.right = vertical * aspect / 2;
  camera.top = vertical / 2;
  camera.bottom = -vertical / 2;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.5 : 2));
  renderer.setSize(width, height, false);
}
resize();
const observer = new ResizeObserver(resize);
observer.observe(host);

const clock = new THREE.Clock();
function frame(): void {
  requestAnimationFrame(frame);
  controls.update();
  if (!paused && !reducedMotion) offices.get(active)?.update(clock.getElapsedTime());
  renderer.render(scene, camera);
}
frame();

type TestHooks = {
  setState: (name: string) => Promise<{ state: string }>;
  setPausedForScreenshot: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  hideDebugUi: () => void;
};

Object.assign(window, {
  __THREE_GAME_DIAGNOSTICS__: {
    renderer: {
      get calls() { return renderer.info.render.calls; },
      get triangles() { return renderer.info.render.triangles; },
      get geometries() { return renderer.info.memory.geometries; },
      get textures() { return renderer.info.memory.textures; },
      get render() { return renderer.info.render; },
      get memory() { return renderer.info.memory; },
    },
    get state() { return { preset: active, offices: presets.length, reducedMotion, paused }; },
    get camera() { return { position: camera.position.toArray(), zoom: camera.zoom, autoRotate: controls.autoRotate }; },
  },
  __THREE_GAME_TEST_HOOKS__: {
    async setState(name: string) {
      if (!presets.includes(name as Preset)) throw new Error(`Unknown office: ${name}`);
      select(name as Preset);
      ui.setActive(name as Preset);
      renderer.render(scene, camera);
      return { state: name };
    },
    setPausedForScreenshot(value: boolean) { paused = value; },
    setReducedMotion(value: boolean) { paused = value; },
    hideDebugUi() {},
  } satisfies TestHooks,
});

ui.setLoading(false);
