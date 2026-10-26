import * as THREE from "three";
import { createPerson, type PersonOptions } from "./people";
import { batchStaticMeshes } from "./optimize";
import { block, createBase, glassWall, material, plant, planter, rug, sign, sphere, type Palette } from "./world";
import { cabinet, desk, diningTable, glassPod, kitchenCounter, labBench, labMachine, loungeChair, meetingTable, pendant, roundTable, shelf, sofa, tellerCounter, wallArt, whiteboard } from "./furniture";
export type OfficePreset = "software" | "bank" | "restaurant" | "semiconductor" | "creative";

export type BuiltOffice = {
  root: THREE.Group;
  people: THREE.Group[];
  update: (time: number) => void;
  palette: Palette;
};

const palettes: Record<OfficePreset, Palette> = {
  software: { floor: "wood", wall: "#f5e9d9", edge: "#9b765b", wood: "#d39b68", woodLight: "#f1c89c", dark: "#2f3e4b", accent: "#e3a864", secondary: "#737298", upholstery: "#344e72", metal: "#3c4449" },
  bank: { floor: "stone", wall: "#f4eee4", edge: "#8c755e", wood: "#c58f5f", woodLight: "#e5b887", dark: "#1c3041", accent: "#dba769", secondary: "#718d69", upholstery: "#829c69", metal: "#3f4d50" },
  restaurant: { floor: "terracotta", wall: "#efb990", edge: "#9b6047", wood: "#b46d46", woodLight: "#db9b65", dark: "#573f30", accent: "#e7af62", secondary: "#60865c", upholstery: "#8b5e4a", metal: "#4e5147" },
  semiconductor: { floor: "lab", wall: "#e1edf0", edge: "#7b939a", wood: "#a0bac0", woodLight: "#d5e5e6", dark: "#35566b", accent: "#68b9c1", secondary: "#6a92a6", upholstery: "#6d8ba1", metal: "#50646c" },
  creative: { floor: "wood", wall: "#f1e6dc", edge: "#ad8068", wood: "#d29b6d", woodLight: "#e7c096", dark: "#46495a", accent: "#e8a174", secondary: "#7b9f77", upholstery: "#9b809f", metal: "#4f5359" },
};

function addPerson(parent: THREE.Object3D, options: PersonOptions, updates: Array<(time: number) => void>): void {
  const person = createPerson(options);
  person.root.userData.characterIndex = updates.length;
  parent.add(person.root);
  updates.push(person.update);
}

function deskWithPerson(parent: THREE.Object3D, x: number, z: number, palette: Palette, options: { angle?: number; screen?: "code" | "chart" | "chat" | "product" | "lab"; dual?: boolean; clothing: string; skin?: string; hair?: string; chairColor?: string; width?: number }, updates: Array<(time: number) => void>): void {
  const angle = options.angle ?? 0;
  const group = desk(parent, x, z, palette, { angle, screen: options.screen, secondScreen: options.dual, chairColor: options.chairColor, width: options.width });
  addPerson(group, { x: 0, z: 1.04, rotation: Math.PI, clothing: options.clothing, skin: options.skin, hair: options.hair, pose: "seated", gesture: "typing" }, updates);
}

function bankMark(parent: THREE.Object3D, palette: Palette): void {
  block(parent, 4.65, 1.78, -4.88, 4.65, 2.8, .12, palette.dark);
  const ivory = material("#e7d0aa");
  const roof = new THREE.Mesh(new THREE.ConeGeometry(.47, .28, 3), ivory);
  roof.rotation.z = Math.PI;
  roof.position.set(4.62, 2.59, -4.79);
  parent.add(roof);
  for (const x of [4.28, 4.62, 4.96]) block(parent, x, 1.9, -4.78, .08, .76, .035, "#e7d0aa");
  block(parent, 4.62, 2.3, -4.78, 1.26, .09, .04, "#e7d0aa");
  block(parent, 4.62, 1.46, -4.78, 1.36, .09, .04, "#e7d0aa");
}

function sideWall(root: THREE.Group, z = 1.85): THREE.Group {
  const wall = new THREE.Group();
  wall.name = "cutaway-side-detail";
  wall.position.set(-6.84, 0, z);
  wall.rotation.y = Math.PI / 2;
  root.add(wall);
  return wall;
}

function sidePoster(root: THREE.Group, palette: Palette, title: string, accent: string, z = 1.85): void {
  const wall = sideWall(root, z);
  block(wall, 0, 1.76, 0, 2.48, 2.2, .085, palette.dark, .025);
  block(wall, 0, 1.76, .054, 2.23, 1.95, .018, accent);
  block(wall, -.64, 1.43, .073, .55, .53, .008, palette.woodLight);
  block(wall, .21, 1.43, .073, .83, .12, .008, palette.secondary);
  block(wall, .21, 1.24, .073, .83, .08, .008, palette.woodLight);
  sign(wall, title, 0, 2.3, .083, 2.02, "#fff7e8", accent);
}

function software(root: THREE.Group, palette: Palette, updates: Array<(time: number) => void>, companyName: string): void {
  createBase(root, palette, { slats: true });
  sidePoster(root, palette, "BUILD · SOLVE · LEARN", "#345d66", 2.1);
  rug(root, -4.25, -2.85, 3.8, 2.85, "#b9a9a4");
  sofa(root, -5.1, -3.55, palette, -.06, 2.15);
  shelf(root, -6.35, -1.65, palette, Math.PI / 2, 1.48);
  plant(root, -5.8, -4.42, 1.04);
  glassPod(root, -.36, -3.05, palette, 3.25, 2.65);
  meetingTable(root, -.38, -2.97, palette, 4, .12);
  pendant(root, -.4, -2.97, palette);
  planter(root, 1.3, -1.65, 1.65, palette, Math.PI / 2);
  rug(root, -3.88, 1.69, 4.15, 3.04, "#b8aca8");
  rug(root, 3.68, 1.29, 5.45, 3.65, "#7d7984");
  deskWithPerson(root, -4.15, 1.2, palette, { screen: "code", dual: true, clothing: "#2d5a99", skin: "#bd805e", hair: "#45342b", chairColor: "#3e4758" }, updates);
  deskWithPerson(root, -1.25, .35, palette, { screen: "chat", clothing: "#d09a34", skin: "#dc9b72", hair: "#33282b", chairColor: "#7d6a86" }, updates);
  deskWithPerson(root, 3.65, 1.5, palette, { screen: "product", clothing: "#6a59a5", skin: "#75482f", hair: "#242328", chairColor: "#3f4751" }, updates);
  deskWithPerson(root, 5.1, -.35, palette, { screen: "chart", dual: true, clothing: "#b37733", skin: "#bd8060", hair: "#29212a", chairColor: "#344655", width: 1.8 }, updates);
  whiteboard(root, 4.6, -4.7, palette, 0, 3.35, "notes");
  addPerson(root, { x: 2.52, z: -3.35, rotation: .23, clothing: "#5c9a55", skin: "#df9c6d", hair: "#6a392b", pose: "standing", gesture: "wave" }, updates);
  plant(root, 1.65, -4.42, 1.12);
  plant(root, 6.13, 4.1, .92);
  plant(root, -1.15, 3.63, .8);
  cabinet(root, 6.45, -3.82, palette, -Math.PI / 2, 1.28);
  sign(root, companyName, 4.59, 3.02, -4.78, 2.3, "#e9cba9", palette.dark);
}

function bank(root: THREE.Group, palette: Palette, updates: Array<(time: number) => void>, companyName: string): void {
  createBase(root, palette, { slats: true });
  sidePoster(root, palette, "HERE FOR YOU", "#2c5759", 2.0);
  block(root, -5.68, 1.65, -4.86, 2.32, 3.12, .11, "#233b47");
  for (let i = 0; i < 9; i++) block(root, -6.79 + i * .27, 1.65, -4.79, .085, 3.08, .08, i % 2 ? "#b58155" : "#d1a16d");
  bankMark(root, palette);
  sign(root, companyName, 4.62, 3.08, -4.79, 2.5, "#ead7b4", palette.dark);
  rug(root, -4.35, 2.53, 3.8, 2.4, "#727b82");
  tellerCounter(root, -4.55, -2.55, palette, 0, 3.5);
  addPerson(root, { x: -5.24, z: -3.42, rotation: 0, clothing: "#d6a546", skin: "#cf8b61", hair: "#332629", pose: "standing", gesture: "wave" }, updates);
  glassWall(root, -1.94, -2.46, 3.2, Math.PI / 2, 2.65, palette.dark);
  glassPod(root, .15, -2.83, palette, 2.8, 2.85);
  deskWithPerson(root, .12, -2.75, palette, { screen: "chart", clothing: "#2e69a2", skin: "#bd805e", hair: "#3c2f28", chairColor: "#394d5a" }, updates);
  deskWithPerson(root, 4.9, -2.15, palette, { screen: "chart", clothing: "#663e7d", skin: "#6d422f", hair: "#241e1d", chairColor: "#536574" }, updates);
  deskWithPerson(root, 4.85, 1.16, palette, { screen: "chat", clothing: "#d6a445", skin: "#db976e", hair: "#342626", chairColor: "#54685c" }, updates);
  loungeChair(root, -5.1, 2.7, palette, -Math.PI / 2);
  loungeChair(root, -2.75, 2.75, palette, Math.PI / 2);
  loungeChair(root, -4.04, 3.78, palette, Math.PI);
  roundTable(root, -4.0, 2.72, palette, .6);
  rug(root, .9, 2.6, 3.05, 2.12, "#b2bcaa");
  roundTable(root, .85, 2.35, palette, .52);
  loungeChair(root, -.45, 2.48, palette, -Math.PI / 2);
  loungeChair(root, 2.0, 2.48, palette, Math.PI / 2);
  block(root, -1.07, 1.12, 4.52, 1.3, 2.12, .29, palette.dark, .03);
  sign(root, "WELCOME", -1.07, 1.9, 4.69, 1.08, "#e7d4ad", palette.dark);
  addPerson(root, { x: -1.37, z: 1.21, rotation: -.28, clothing: "#579256", skin: "#de9b6b", hair: "#713b2d", pose: "standing", gesture: "present" }, updates);
  planter(root, 3.8, 4.43, 2.15, palette);
  plant(root, -6.15, -.32, 1.0);
  plant(root, 1.7, -4.35, .95);
  shelf(root, 6.27, -3.34, palette, -Math.PI / 2, 1.23);
  cabinet(root, 6.19, .13, palette, -Math.PI / 2, 1.3);
  wallArt(root, 6.46, -4.72, palette);
}

function restaurant(root: THREE.Group, palette: Palette, updates: Array<(time: number) => void>, companyName: string): void {
  createBase(root, palette, { slats: true });
  const menuWall = sideWall(root, 1.9);
  whiteboard(menuWall, 0, 0, palette, 0, 2.6, "menu");
  sign(menuWall, "TODAY'S MENU", 0, 2.39, .14, 2.22, "#f4d8ae", palette.dark);
  // An exposed kitchen line is visible above the service counter.
  block(root, 3.92, .71, -4.46, 4.9, 1.32, .62, "#b96e49", .035);
  block(root, 3.92, 1.39, -4.46, 5.04, .09, .72, "#ddd6c8", .025);
  for (const x of [2.21, 3.26, 4.31, 5.36]) {
    block(root, x, .68, -4.1, .88, .98, .035, "#ce855a", .012);
    block(root, x + .2, .7, -4.071, .095, .025, .025, "#684937", .008);
  }
  block(root, 4.11, 2.78, -4.68, 2.2, .28, .63, "#4c594c", .055);
  block(root, 4.11, 2.42, -4.68, 1.45, .49, .4, "#718276", .02);
  for (const x of [3.5, 4.02, 4.54]) {
    const hob = new THREE.Mesh(new THREE.TorusGeometry(.17, .025, 6, 16), material("#3f4642"));
    hob.rotation.x = Math.PI / 2;
    hob.position.set(x, 1.46, -4.4);
    root.add(hob);
  }
  block(root, 2.95, 2.11, -4.18, 2.47, .095, .42, "#8e5c3c", .016);
  for (const x of [2.28, 2.74, 3.2]) block(root, x, 2.32, -4.18, .23, .37, .22, x === 2.74 ? "#eac07d" : "#f3e9d4", .04);
  block(root, 5.91, 2.86, -4.88, 1.83, .74, .09, "#402f28");
  sign(root, companyName, 5.91, 2.86, -4.8, 1.65, "#f4dbb1", "#402f28");
  kitchenCounter(root, 3.79, -2.75, palette);
  for (const x of [2.4, 4.0, 5.6]) pendant(root, x, -1.9, palette, 2.55);
  shelf(root, 6.31, -3.8, palette, -Math.PI / 2, 1.4);
  block(root, 3.95, 1.78, -4.57, 3.5, .09, .37, palette.woodLight, .02);
  for (const x of [2.8, 3.5, 4.2, 4.9]) {
    cylinderDish(root, x, -4.3, palette);
  }
  addPerson(root, { x: 3.26, z: -3.65, rotation: .28, clothing: "#23648c", skin: "#845032", hair: "#211e1c", pose: "standing", gesture: "present" }, updates);
  addPerson(root, { x: -.75, z: -2.18, rotation: -.35, clothing: "#58935a", skin: "#e1a16b", hair: "#6d3c30", pose: "standing", gesture: "wave" }, updates);
  rug(root, -3.93, 1.39, 5.28, 5.65, "#c56a4b");
  for (const [x, z, a] of [[-5.13, -.1, .05], [-2.65, -.02, -.07], [-5.11, 2.67, .05], [-2.59, 2.71, -.07]] as const) diningTable(root, x, z, palette, a);
  diningTable(root, 3.38, 3.28, palette, .16);
  pendant(root, 3.38, 3.28, palette, 2.64);
  addPerson(root, { x: -4.98, z: .85, rotation: Math.PI, clothing: "#72559b", skin: "#673e2c", hair: "#241a1d", pose: "seated", gesture: "typing" }, updates);
  addPerson(root, { x: -2.55, z: 3.6, rotation: Math.PI, clothing: "#c49b42", skin: "#d48c60", hair: "#34231d", pose: "seated", gesture: "typing" }, updates);
  block(root, .63, .51, 2.88, 1.85, .94, .82, palette.wood, .04);
  block(root, .63, 1.0, 2.88, 1.97, .09, .92, palette.woodLight, .03);
  block(root, .63, 1.2, 2.63, .45, .32, .07, palette.dark, .015);
  addPerson(root, { x: .55, z: 1.9, rotation: 0, clothing: "#3c7457", skin: "#bd8059", hair: "#392421", pose: "standing", gesture: "present" }, updates);
  planter(root, -6.23, -1.9, 1.0, palette, Math.PI / 2);
  planter(root, 5.99, 4.33, 1.25, palette);
  plant(root, -6.2, 4.22, 1.05);
  plant(root, 6.43, -1.16, .78);
}

function cylinderDish(parent: THREE.Object3D, x: number, z: number, palette: Palette): void {
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(.18, .17, .025, 16), material("#f2ebdb"));
  plate.position.set(x, 1.89, z);
  parent.add(plate);
  sphere(parent, x, 1.94, z, .11, palette.accent, [1.1, .28, 1.1]);
}

function semiconductor(root: THREE.Group, palette: Palette, updates: Array<(time: number) => void>, companyName: string): void {
  createBase(root, palette, { lab: true });
  const labWall = sideWall(root, 1.9);
  whiteboard(labWall, 0, 0, palette, 0, 2.7, "chip");
  // Blue lower cabinetry, power rails and sample storage make the benches read as a working lab.
  block(root, -4.0, .55, -4.48, 3.4, 1.02, .66, "#648aa0", .03);
  for (const x of [-5.12, -4.39, -3.66, -2.93]) {
    block(root, x, .57, -4.12, .61, .84, .025, "#9ec0ce", .012);
    block(root, x, .57, -4.1, .17, .025, .022, "#3f6779", .008);
  }
  block(root, -4.0, 1.1, -4.48, 3.48, .1, .7, "#eaf2f0", .02);
  block(root, 4.88, 1.66, -4.89, 4.1, 2.44, .09, "#cfdee4");
  whiteboard(root, 4.65, -4.74, palette, 0, 3.28, "chip");
  sign(root, companyName, 4.76, 3.09, -4.79, 2.45, "#d5edf0", palette.dark);
  glassWall(root, -.2, -1.68, 6.15, 0, 2.77, palette.dark);
  glassWall(root, 2.84, -3.3, 3.25, Math.PI / 2, 2.77, palette.dark);
  labMachine(root, 1.2, -3.55, palette, 0);
  labMachine(root, -4.93, -3.23, palette, 0);
  labMachine(root, 5.95, -2.84, palette, -.18);
  cabinet(root, -2.75, -4.13, palette, 0, 1.55);
  labBench(root, -4.82, -.65, palette, .12, "microscope");
  labBench(root, -1.62, 1.83, palette, -.09, "screens");
  labBench(root, 2.16, 2.25, palette, .14, "wafer");
  labBench(root, 5.34, .59, palette, -.13, "screens");
  const cart = new THREE.Group();
  cart.position.set(.25, 0, 3.88);
  root.add(cart);
  for (const y of [.43, .88]) block(cart, 0, y, 0, 1.28, .075, .68, "#c7d8dc", .025);
  for (const x of [-.53, .53]) for (const z of [-.25, .25]) {
    block(cart, x, .49, z, .055, .85, .055, "#537383");
    sphere(cart, x, .07, z, .08, "#2f424c");
  }
  for (let i = 0; i < 5; i++) {
    block(cart, -.45 + i * .22, 1.02, 0, .13, .22, .13, i % 2 ? "#7dbac5" : "#d8e9e9", .02);
    block(cart, -.45 + i * .22, 1.14, 0, .075, .04, .075, "#3a6c7c");
  }
  for (const [x, z, a, clothing, skin] of [[-4.82, -.65, .12, "#d5a642", "#cf8e65"], [-1.62, 1.83, -.09, "#3775a2", "#c0805f"], [2.16, 2.25, .14, "#704c91", "#754a35"], [5.34, .59, -.13, "#397d91", "#d59976"]] as const) {
    const pX = x + Math.sin(a) * 1.03;
    const pZ = z + Math.cos(a) * 1.03;
    addPerson(root, { x: pX, z: pZ, rotation: a + Math.PI, clothing, skin, hair: "#302822", pose: "seated", gesture: "typing" }, updates);
  }
  addPerson(root, { x: 4.15, z: -2.52, rotation: -.18, clothing: "#64a454", skin: "#e1a27a", hair: "#694334", pose: "standing", gesture: "present" }, updates);
  addPerson(root, { x: 1.66, z: -2.64, rotation: .2, clothing: "#f3f5f3", skin: "#bd8064", hair: "#d9e5e5", pose: "standing", gesture: "present" }, updates);
  planter(root, -5.95, 4.3, 1.33, palette);
  plant(root, 6.3, 4.24, .85);
  plant(root, -6.03, -4.32, .85);
}

function creative(root: THREE.Group, palette: Palette, updates: Array<(time: number) => void>, companyName: string): void {
  createBase(root, palette, { slats: true });
  sidePoster(root, palette, "MAKE THINGS REAL", "#a66f79", 2.0);
  sign(root, companyName, 4.6, 3.05, -4.78, 2.5, "#f1dac0", palette.dark);
  shelf(root, -6.36, -3.25, palette, Math.PI / 2, 1.5);
  shelf(root, -6.36, -1.28, palette, Math.PI / 2, 1.5);
  rug(root, -3.93, -2.65, 4.58, 3.2, "#c3b1ae");
  rug(root, 2.2, 1.45, 6.1, 4.0, "#8f8391");
  sofa(root, -5.26, -3.35, palette, .02, 2.06);
  meetingTable(root, -2.16, -2.37, palette, 4, 0);
  pendant(root, -2.12, -2.48, palette);
  whiteboard(root, 4.95, -4.7, palette, 0, 3.36, "notes");
  deskWithPerson(root, -4.58, 1.75, palette, { screen: "code", dual: true, clothing: "#31629b", skin: "#bf805b", hair: "#3b2b24", chairColor: "#4d5670" }, updates);
  deskWithPerson(root, -.63, 1.39, palette, { screen: "chat", clothing: "#d5a449", skin: "#d59069", hair: "#29212b", chairColor: "#6b5573" }, updates);
  deskWithPerson(root, 3.49, 1.55, palette, { screen: "chart", dual: true, clothing: "#6a4e96", skin: "#764a33", hair: "#262126", chairColor: "#50566a" }, updates);
  deskWithPerson(root, 5.26, -.36, palette, { screen: "product", clothing: "#32618d", skin: "#ca8c65", hair: "#3b2a29", chairColor: "#566a72" }, updates);
  addPerson(root, { x: 2.79, z: -2.69, rotation: .08, clothing: "#6b9e61", skin: "#dc9871", hair: "#693931", pose: "standing", gesture: "wave" }, updates);
  planter(root, 1.18, 4.4, 1.92, palette);
  plant(root, -6.0, 4.25, 1.08);
  plant(root, 6.36, 4.18, .85);
  plant(root, 1.2, -4.22, .91);
  cabinet(root, 6.25, -3.41, palette, -Math.PI / 2, 1.29);
  wallArt(root, 6.47, -4.72, palette);
  // Tactile colored stools and a conversational circular table in the lounge.
  roundTable(root, -3.72, -1.17, palette, .45);
  loungeChair(root, -5.78, -.65, palette, -.45);
  for (const [x, z, color] of [[1.31, -1.2, "#e7a371"], [2.14, -1.05, "#8dad80"], [1.55, -.38, "#b899c5"]] as const) {
    const pouf = new THREE.Mesh(new THREE.CylinderGeometry(.35, .37, .4, 20), material(color));
    pouf.position.set(x, .21, z);
    pouf.castShadow = true;
    root.add(pouf);
  }
}

export function buildOffice(preset: OfficePreset, companyName?: string): BuiltOffice {
  const palette = palettes[preset];
  const root = new THREE.Group();
  root.name = `${preset}-office`;
  const updates: Array<(time: number) => void> = [];
  const signText = (companyName?.trim() || {
    software: "Aperture Studio", bank: "Northstar Bank", restaurant: "Sora Table",
    semiconductor: "Mesa Micro", creative: "Lumen Works",
  }[preset]).toUpperCase();
  if (preset === "software") software(root, palette, updates, signText);
  else if (preset === "bank") bank(root, palette, updates, signText);
  else if (preset === "restaurant") restaurant(root, palette, updates, signText);
  else if (preset === "semiconductor") semiconductor(root, palette, updates, signText);
  else creative(root, palette, updates, signText);
  batchStaticMeshes(root);
  root.updateMatrixWorld(true);
  const people: THREE.Group[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Group && object.name === "coworker") people.push(object);
  });
  people.sort((a, b) => Number(a.userData.characterIndex) - Number(b.userData.characterIndex));
  for (const person of people) {
    const position = person.getWorldPosition(new THREE.Vector3());
    const rotation = person.getWorldQuaternion(new THREE.Quaternion());
    person.parent?.remove(person);
    person.position.copy(position);
    person.quaternion.copy(rotation);
  }
  return { root, people, palette, update: (time) => updates.forEach((update) => update(time)) };
}
