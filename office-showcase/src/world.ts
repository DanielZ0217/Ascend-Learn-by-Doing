import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type Surface = "wood" | "terracotta" | "stone" | "lab";
export type Palette = {
  floor: Surface;
  wall: string;
  edge: string;
  wood: string;
  woodLight: string;
  dark: string;
  accent: string;
  secondary: string;
  upholstery: string;
  metal: string;
};

const materialCache = new Map<string, THREE.MeshStandardMaterial>();
const geometryCache = new Map<string, THREE.BufferGeometry>();

export function material(color: string, roughness = .76, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${roughness}:${metalness}`;
  let value = materialCache.get(key);
  if (!value) {
    value = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materialCache.set(key, value);
  }
  return value;
}

export function block(parent: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, radius = 0, metalness = 0): THREE.Mesh {
  const key = `${w}:${h}:${d}:${radius}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = radius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
    geometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material(color, metalness ? .38 : .75, metalness));
  mesh.position.set(x, y, z);
  mesh.castShadow = h > .08;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(parent: THREE.Object3D, x: number, y: number, z: number, top: number, bottom: number, height: number, color: string, sides = 16, metalness = 0): THREE.Mesh {
  const key = `c:${top}:${bottom}:${height}:${sides}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(top, bottom, height, sides);
    geometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material(color, metalness ? .42 : .75, metalness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function sphere(parent: THREE.Object3D, x: number, y: number, z: number, radius: number, color: string, scale: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const key = `s:${radius}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(radius, 16, 12);
    geometryCache.set(key, geometry);
  }
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
}

function floorTexture(surface: Surface): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext("2d")!;
  const rand = seeded(surface === "wood" ? 45 : surface === "terracotta" ? 61 : 92);
  const background = surface === "wood" ? "#ddbb91" : surface === "terracotta" ? "#c87050" : surface === "lab" ? "#e8eef0" : "#e4dacb";
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (surface === "wood") {
    for (let row = 0; row < 27; row++) {
      const y = row * 29;
      for (let col = -1; col < 7; col++) {
        const x = col * 188 + ((row % 3) * 57);
        ctx.fillStyle = ["#c99a6d", "#d1a579", "#dfb68a", "#d6aa7d"][Math.floor(rand() * 4)];
        ctx.fillRect(x + 2, y + 2, 184, 25);
        ctx.strokeStyle = "rgba(91,54,30,.12)";
        ctx.lineWidth = 1;
        for (let streak = 0; streak < 4; streak++) {
          ctx.beginPath();
          const sx = x + 10 + rand() * 140;
          const sy = y + 5 + rand() * 18;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 14 + rand() * 26, sy + (rand() - .5) * 2);
          ctx.stroke();
        }
      }
    }
  } else {
    const size = surface === "terracotta" ? 64 : 96;
    for (let y = 0; y < canvas.height; y += size) for (let x = 0; x < canvas.width; x += size) {
      ctx.fillStyle = surface === "terracotta" ? ["#cd7757", "#d98662", "#b9674e", "#da8e6c"][Math.floor(rand() * 4)] : surface === "lab" ? ["#e8eff1", "#dce7eb", "#f1f4f2"][Math.floor(rand() * 3)] : ["#e9ddcf", "#d9ccbb", "#e3d5c3"][Math.floor(rand() * 3)];
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function treeWindowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#f6ddaf");
  sky.addColorStop(.56, "#ffe6b2");
  sky.addColorStop(1, "#b9c4a4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 768, 512);
  const rand = seeded(93);
  for (let i = 0; i < 19; i++) {
    const x = i * 43 + rand() * 25;
    const width = 4 + rand() * 9;
    ctx.fillStyle = `rgba(67,70,51,${.19 + rand() * .18})`;
    ctx.fillRect(x, 0, width, 512);
    const crownY = 105 + rand() * 125;
    for (let leaf = 0; leaf < 24; leaf++) {
      const px = x + (rand() - .5) * 120;
      const py = crownY + (rand() - .5) * 190;
      const radius = 8 + rand() * 21;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = ["rgba(238,169,55,.56)", "rgba(213,147,42,.49)", "rgba(134,159,76,.49)", "rgba(255,213,109,.53)"][Math.floor(rand() * 4)];
      ctx.fill();
    }
  }
  const wash = ctx.createLinearGradient(0, 0, 768, 0);
  wash.addColorStop(0, "rgba(255,249,214,.3)");
  wash.addColorStop(.5, "rgba(255,255,239,.08)");
  wash.addColorStop(1, "rgba(255,246,209,.36)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 768, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

const windowTexture = typeof document === "undefined" ? null : treeWindowTexture();

export function createBase(parent: THREE.Group, palette: Palette, options: { slats?: boolean; lab?: boolean } = {}): void {
  block(parent, 0, -.29, 0, 14.45, .52, 10.45, palette.edge, .08);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14.16, 10.16), new THREE.MeshStandardMaterial({ map: floorTexture(palette.floor), roughness: .88 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.015;
  floor.receiveShadow = true;
  parent.add(floor);
  block(parent, 0, 1.65, -5.12, 14.15, 3.35, .16, palette.wall);
  block(parent, -7.03, 1.65, 0, .16, 3.35, 10.15, palette.wall);
  block(parent, 0, 3.33, -5.02, 14.2, .12, .27, palette.woodLight, .025);
  block(parent, -6.94, 3.33, 0, .25, .12, 10.2, palette.woodLight, .025);
  block(parent, 0, .12, 5.1, 14.2, .24, .18, palette.wood);
  block(parent, 7.11, .12, 0, .18, .24, 10.2, palette.wood);
  // The window picture is behind physical panes and frames, so orbiting preserves depth.
  const windowPanel = new THREE.Mesh(new THREE.PlaneGeometry(7.3, 2.72), new THREE.MeshBasicMaterial({ map: windowTexture, color: options.lab ? "#d6ebf5" : "#ffffff", side: THREE.DoubleSide }));
  windowPanel.position.set(-1.6, 1.76, -5.015);
  parent.add(windowPanel);
  block(parent, -1.6, 3.14, -4.98, 7.43, .09, .1, palette.dark);
  block(parent, -1.6, .39, -4.98, 7.43, .1, .12, palette.dark);
  for (const x of [-5.32, -2.84, -.38, 2.1]) block(parent, x, 1.77, -4.97, .085, 2.73, .1, palette.dark);
  block(parent, -1.6, 1.65, -4.96, 7.4, .065, .09, palette.dark);
  const sideWindow = new THREE.Group();
  sideWindow.position.set(-6.88, 0, -2.73);
  sideWindow.rotation.y = Math.PI / 2;
  parent.add(sideWindow);
  const sidePicture = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 2.54), new THREE.MeshBasicMaterial({ map: windowTexture, color: options.lab ? "#d8eaf1" : "#fff5df", side: THREE.DoubleSide }));
  sidePicture.position.y = 1.83;
  sideWindow.add(sidePicture);
  for (const x of [-1.72, 0, 1.72]) block(sideWindow, x, 1.83, .04, .07, 2.58, .1, palette.dark);
  for (const y of [.53, 1.76, 3.1]) block(sideWindow, 0, y, .04, 3.5, .07, .1, palette.dark);
  if (options.slats) for (let i = 0; i < 21; i++) block(parent, 3.55 + i * .17, 1.65, -4.99, .075, 3.24, .1, i % 3 ? palette.wood : palette.woodLight);
  // Corner trim and a readable plinth keep the cutaway feeling architectural.
  block(parent, -6.91, 1.65, -5.05, .14, 3.3, .14, palette.wood);
  block(parent, -6.91, 1.65, 5.0, .14, 3.3, .14, palette.wood);
}

export function rug(parent: THREE.Object3D, x: number, z: number, w: number, d: number, color: string, angle = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  parent.add(group);
  block(group, 0, .018, 0, w, .035, d, color, .05);
  block(group, 0, .04, -d / 2 + .12, w - .24, .005, .025, "#f2e8d9");
  block(group, 0, .04, d / 2 - .12, w - .24, .005, .025, "#f2e8d9");
  return group;
}

export function glassWall(parent: THREE.Object3D, x: number, z: number, width: number, angle = 0, height = 2.65, frame = "#34474c"): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  parent.add(group);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(width - .12, height - .16), new THREE.MeshPhysicalMaterial({ color: "#d8eceb", transparent: true, opacity: .16, roughness: .07, metalness: .02, side: THREE.DoubleSide, depthWrite: false }));
  pane.position.y = height / 2;
  group.add(pane);
  for (const edgeX of [-width / 2, width / 2]) block(group, edgeX, height / 2, 0, .06, height, .07, frame);
  for (const edgeY of [.04, height / 2, height - .04]) block(group, 0, edgeY, 0, width, .055, .07, frame);
  return group;
}

export function plant(parent: THREE.Object3D, x: number, z: number, scale = 1, potColor = "#f4efe6", leafColor = "#4d8062"): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  cylinder(group, 0, .25, 0, .25, .19, .48, potColor, 12);
  cylinder(group, 0, .51, 0, .25, .25, .055, "#514534", 12);
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const length = .69 + (i % 3) * .16;
    const stem = cylinder(group, Math.cos(angle) * .09, .52 + length / 2, Math.sin(angle) * .09, .012, .02, length, "#456f4a", 6);
    stem.rotation.z = Math.cos(angle) * .36;
    stem.rotation.x = -Math.sin(angle) * .36;
    for (let j = 0; j < 3; j++) {
      const t = .36 + j * .21;
      const leaf = sphere(group, Math.cos(angle) * (.13 + t * .34), .55 + length * t, Math.sin(angle) * (.13 + t * .34), .22, j % 2 ? leafColor : "#76a66d", [.54, 1.45, .45]);
      leaf.rotation.z = -Math.cos(angle) * .46;
      leaf.rotation.x = Math.sin(angle) * .46;
    }
  }
  return group;
}

export function planter(parent: THREE.Object3D, x: number, z: number, width: number, palette: Palette, angle = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  parent.add(group);
  block(group, 0, .26, 0, width, .51, .47, "#eee9de", .04);
  block(group, 0, .53, 0, width - .06, .04, .4, "#58483b");
  for (let i = 0; i < Math.max(2, Math.floor(width / .45)); i++) {
    const px = -width / 2 + .3 + i * ((width - .6) / Math.max(1, Math.floor(width / .45) - 1));
    sphere(group, px, .78 + (i % 2) * .08, 0, .3, i % 2 ? "#689262" : palette.secondary, [.85, .9, .8]);
    sphere(group, px + .12, .92, -.08, .22, "#87a970", [.85, 1.1, .7]);
  }
  return group;
}

export function labelTexture(title: string, color = "#263e43", background = "#f7f2e8"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 180;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 640, 180);
  ctx.fillStyle = color;
  ctx.font = "700 60px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 320, 92, 560);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function sign(parent: THREE.Object3D, title: string, x: number, y: number, z: number, width: number, color: string, background: string): void {
  const texture = labelTexture(title, color, background);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * .281), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z);
  parent.add(mesh);
}
