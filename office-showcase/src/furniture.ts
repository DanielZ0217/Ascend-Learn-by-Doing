import * as THREE from "three";
import { block, cylinder, glassWall, material, plant, sphere, type Palette } from "./world";

function local(parent: THREE.Object3D, x: number, z: number, angle = 0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = angle;
  parent.add(group);
  return group;
}

function screenTexture(kind: "code" | "chart" | "chat" | "product" | "lab" = "code"): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = kind === "chart" ? "#eef4f6" : kind === "product" ? "#2f2a4d" : "#182b35";
  ctx.fillRect(0, 0, 512, 320);
  if (kind === "chart" || kind === "lab") {
    ctx.strokeStyle = "#d0dfe3";
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(40, 35 + i * 45); ctx.lineTo(470, 35 + i * 45); ctx.stroke(); }
    const values = [154, 126, 145, 100, 118, 72, 91, 49, 62];
    ctx.lineWidth = 6;
    ctx.strokeStyle = kind === "lab" ? "#61c9c2" : "#4f83b5";
    ctx.beginPath();
    values.forEach((v, i) => i ? ctx.lineTo(42 + i * 51, v) : ctx.moveTo(42, v));
    ctx.stroke();
    ctx.fillStyle = kind === "lab" ? "#98dcd5" : "#e7ad68";
    for (let i = 0; i < 5; i++) ctx.fillRect(52 + i * 83, 219 - i * 13, 32, 48 + i * 13);
  } else if (kind === "chat") {
    ctx.fillStyle = "#2b554d"; ctx.fillRect(18, 18, 476, 48);
    ctx.fillStyle = "#f0f8f1"; ctx.font = "bold 25px Arial"; ctx.fillText("CUSTOMER CHAT", 39, 51);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? "#3b7465" : "#536772";
      ctx.fillRect(26 + (i % 2) * 80, 85 + i * 55, 360, 37);
      ctx.fillStyle = "#a7bec0";
      ctx.fillRect(46 + (i % 2) * 80, 97 + i * 55, 180 + i * 19, 8);
    }
  } else if (kind === "product") {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = ["#e9ab71", "#bd9ed4", "#8fc6c1"][i % 3];
      ctx.fillRect(45 + (i % 3) * 145, 52 + Math.floor(i / 3) * 112, 105, 76);
    }
  } else {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = ["#8dcdb3", "#c9a6d8", "#d5ad6a", "#7caad7"][i % 4];
      ctx.fillRect(30 + (i % 3) * 16, 30 + i * 23, 130 + (i * 41) % 180, 5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const screens = new Map<string, THREE.CanvasTexture>();
function monitor(parent: THREE.Group, x: number, z: number, kind: "code" | "chart" | "chat" | "product" | "lab", width = .8): void {
  block(parent, x, 1.17, z, width + .08, .57, .075, "#27333a", .035);
  let texture = screens.get(kind);
  if (!texture) { texture = screenTexture(kind); screens.set(kind, texture); }
  const display = new THREE.Mesh(new THREE.PlaneGeometry(width, .48), new THREE.MeshBasicMaterial({ map: texture }));
  display.position.set(x, 1.17, z + .041);
  parent.add(display);
  block(parent, x, .91, z - .045, .055, .15, .08, "#5e6464");
  block(parent, x, .83, z - .02, .33, .025, .19, "#5e6464", .01);
}

export function officeChair(parent: THREE.Object3D, x: number, z: number, color: string, angle = 0): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .47, 0, .58, .16, .56, color, .12);
  block(group, 0, .85, -.26, .61, .69, .17, color, .13);
  block(group, -.31, .61, 0, .07, .13, .42, "#384448", .035);
  block(group, .31, .61, 0, .07, .13, .42, "#384448", .035);
  cylinder(group, 0, .26, 0, .045, .05, .4, "#454d50", 10, .45);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    const spoke = block(group, Math.sin(a) * .18, .075, Math.cos(a) * .18, .07, .035, .38, "#434b4f", .012);
    spoke.rotation.y = a;
    cylinder(group, Math.sin(a) * .33, .045, Math.cos(a) * .33, .045, .045, .09, "#34383a", 8);
  }
  return group;
}

export function desk(parent: THREE.Object3D, x: number, z: number, palette: Palette, options: { angle?: number; screen?: "code" | "chart" | "chat" | "product" | "lab"; secondScreen?: boolean; chair?: boolean; chairColor?: string; width?: number } = {}): THREE.Group {
  const group = local(parent, x, z, options.angle);
  const width = options.width ?? 1.95;
  block(group, 0, .78, 0, width, .13, 1.04, palette.wood, .055);
  block(group, 0, .72, -.44, width - .12, .025, .075, palette.woodLight, .012);
  block(group, -width / 2 + .13, .39, -.37, .11, .75, .13, palette.metal, .02, .35);
  block(group, width / 2 - .13, .39, -.37, .11, .75, .13, palette.metal, .02, .35);
  block(group, -width / 2 + .13, .39, .37, .11, .75, .13, palette.metal, .02, .35);
  block(group, width / 2 - .13, .39, .37, .11, .75, .13, palette.metal, .02, .35);
  block(group, -width / 2 + .38, .4, .02, .48, .7, .71, palette.dark, .035);
  for (const y of [.22, .44, .66]) {
    block(group, -width / 2 + .38, y, .386, .39, .17, .02, palette.metal, .015);
    block(group, -width / 2 + .38, y, .402, .12, .025, .024, palette.woodLight, .008);
  }
  monitor(group, options.secondScreen ? -.27 : 0, -.23, options.screen ?? "code", .76);
  if (options.secondScreen) monitor(group, .55, -.23, options.screen === "chart" ? "chart" : "product", .72);
  block(group, .2, .865, .2, .58, .025, .19, "#ddd7cb", .02);
  for (let i = 0; i < 7; i++) block(group, -.03 + i * .076, .88, .2, .045, .004, .12, "#a9aaa5");
  block(group, width / 2 - .31, .855, .27, .35, .027, .27, "#f7ead4", .01);
  cylinder(group, width / 2 - .33, .94, -.22, .09, .075, .19, "#eee6d7", 12);
  sphere(group, width / 2 - .55, 1.03, -.27, .13, "#62946b", [.85, 1.05, .8]);
  if (options.chair !== false) officeChair(group, 0, 1.03, options.chairColor ?? palette.upholstery, Math.PI);
  return group;
}

export function meetingTable(parent: THREE.Object3D, x: number, z: number, palette: Palette, chairs = 4, angle = 0): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .76, 0, 2.75, .13, 1.22, palette.wood, .09);
  for (const sx of [-1, 1]) block(group, sx * 1.1, .37, 0, .13, .72, .9, palette.dark, .03);
  cylinder(group, 0, .88, 0, .17, .19, .07, "#f6f0e5", 18);
  block(group, .54, .85, -.17, .48, .025, .34, "#f7f0e3", .015);
  block(group, -.74, .85, .22, .36, .025, .29, palette.secondary, .015);
  officeChair(group, -.78, -1.0, palette.upholstery);
  officeChair(group, .78, -1.0, palette.upholstery);
  officeChair(group, -.78, 1.0, palette.secondary, Math.PI);
  officeChair(group, .78, 1.0, palette.secondary, Math.PI);
  if (chairs > 4) {
    officeChair(group, -1.82, 0, palette.upholstery, -Math.PI / 2);
    officeChair(group, 1.82, 0, palette.upholstery, Math.PI / 2);
  }
  return group;
}

export function diningTable(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .74, 0, 1.35, .11, .91, palette.wood, .055);
  block(group, 0, .37, 0, .11, .7, .11, palette.dark);
  block(group, 0, .06, 0, .61, .075, .4, palette.dark, .02);
  cylinder(group, 0, .82, 0, .11, .11, .08, "#f2ead6", 12);
  block(group, -.42, .815, -.25, .2, .015, .11, "#f4e4cf");
  block(group, .38, .815, .22, .2, .015, .11, "#f4e4cf");
  diningChair(group, 0, -.77, palette.secondary, 0);
  diningChair(group, 0, .77, palette.secondary, Math.PI);
  return group;
}

function diningChair(parent: THREE.Object3D, x: number, z: number, color: string, angle: number): void {
  const group = local(parent, x, z, angle);
  block(group, 0, .45, 0, .5, .11, .47, color, .08);
  block(group, 0, .8, -.2, .5, .68, .1, color, .09);
  for (const sx of [-.19, .19]) for (const sz of [-.16, .16]) block(group, sx, .22, sz, .055, .43, .055, "#6c5846", .018);
}

export function sofa(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, width = 2.15): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .47, 0, width, .33, .82, palette.upholstery, .16);
  block(group, 0, .85, -.34, width, .68, .2, palette.upholstery, .13);
  block(group, -width / 2 + .1, .63, 0, .22, .47, .77, palette.upholstery, .11);
  block(group, width / 2 - .1, .63, 0, .22, .47, .77, palette.upholstery, .11);
  for (let i = 0; i < 3; i++) block(group, (i - 1) * .61, .64, -.16, .55, .35, .25, palette.secondary, .12);
  block(group, -.56, .82, .02, .38, .2, .35, palette.accent, .09);
  for (const sx of [-width / 2 + .22, width / 2 - .22]) for (const sz of [-.28, .28]) block(group, sx, .16, sz, .09, .27, .09, palette.dark);
  return group;
}

export function loungeChair(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .43, 0, .83, .3, .75, palette.upholstery, .18);
  block(group, 0, .83, -.29, .81, .78, .2, palette.upholstery, .17);
  block(group, -.35, .62, 0, .18, .42, .7, palette.upholstery, .09);
  block(group, .35, .62, 0, .18, .42, .7, palette.upholstery, .09);
  for (const sx of [-.3, .3]) for (const sz of [-.28, .28]) block(group, sx, .15, sz, .07, .28, .07, palette.dark);
  return group;
}

export function roundTable(parent: THREE.Object3D, x: number, z: number, palette: Palette, radius = .61): THREE.Group {
  const group = local(parent, x, z);
  cylinder(group, 0, .52, 0, radius, radius, .11, palette.wood, 24);
  cylinder(group, 0, .26, 0, .08, .11, .46, palette.dark, 12);
  cylinder(group, 0, .06, 0, .35, .35, .06, palette.dark, 18);
  cylinder(group, 0, .64, 0, .13, .15, .12, "#eee5d7", 12);
  sphere(group, 0, .74, 0, .13, "#5d9665", [1.15, .85, 1.1]);
  return group;
}

export function shelf(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, width = 1.55): THREE.Group {
  const group = local(parent, x, z, angle);
  for (const sx of [-width / 2, width / 2]) block(group, sx, 1.16, 0, .12, 2.32, .49, palette.wood, .02);
  for (const y of [.12, .64, 1.18, 1.72, 2.27]) block(group, 0, y, 0, width, .09, .52, palette.woodLight, .018);
  for (let i = 0; i < 8; i++) block(group, -width / 2 + .21 + i * .14, .4 + (i % 2) * .03, .02, .11, .4, .33, [palette.accent, palette.dark, palette.secondary, "#d7d0bd"][i % 4], .01);
  for (let i = 0; i < 6; i++) block(group, -width / 2 + .25 + i * .18, .92, .02, .12, .38 + (i % 3) * .03, .32, ["#a9696b", palette.secondary, "#e3c68b"][i % 3], .01);
  cylinder(group, .36, 1.31, .05, .14, .11, .19, "#f7eee0", 12);
  sphere(group, .36, 1.56, .05, .22, "#658b5b", [1, .83, .9]);
  return group;
}

export function cabinet(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, width = 1.45): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .61, 0, width, 1.16, .62, palette.wood, .035);
  block(group, 0, 1.23, 0, width + .09, .08, .7, palette.woodLight, .025);
  for (const side of [-1, 1]) {
    block(group, side * width / 4, .64, .32, width / 2 - .06, 1.02, .035, palette.woodLight, .012);
    block(group, side * .11, .65, .348, .025, .17, .018, palette.dark, .008);
  }
  return group;
}

export function whiteboard(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, width = 2.9, variant: "notes" | "menu" | "chip" = "notes"): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, 1.83, 0, width + .13, 1.7, .1, variant === "menu" ? palette.dark : "#e6e4dd", .02);
  block(group, 0, 1.83, .055, width, 1.56, .02, variant === "menu" ? "#303b39" : "#faf8f2");
  if (variant === "chip") {
    block(group, 0, 1.85, .075, .65, .63, .008, palette.dark);
    for (let i = -3; i <= 3; i++) {
      block(group, i * .15, 2.32, .085, .055, .22, .01, palette.accent);
      block(group, i * .15, 1.38, .085, .055, .22, .01, palette.accent);
    }
    for (const side of [-1, 1]) block(group, side * .88, 1.84, .08, .51, .04, .01, palette.secondary);
  } else {
    const colors = variant === "menu" ? ["#f4daae", "#e9aa77", "#f1e7d0"] : ["#f3a4a8", "#f7ca6a", "#9acfe4", "#c7a0dc", "#acd09e"];
    for (let i = 0; i < (variant === "menu" ? 6 : 11); i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      block(group, -width / 2 + .38 + col * (width - .6) / 4, 2.21 - row * .38, .086, .34, .29, .012, colors[i % colors.length]);
    }
  }
  block(group, 0, 1.03, .12, width * .7, .045, .16, palette.metal, .01);
  return group;
}

export function pendant(parent: THREE.Object3D, x: number, z: number, palette: Palette, y = 2.58): THREE.Group {
  const group = local(parent, x, z);
  block(group, 0, (3.32 + y) / 2, 0, .025, 3.32 - y, .025, palette.dark);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.32, .38, 24, 1, true), new THREE.MeshStandardMaterial({ color: palette.dark, roughness: .55, side: THREE.DoubleSide }));
  shade.position.y = y;
  shade.rotation.z = Math.PI;
  shade.castShadow = true;
  group.add(shade);
  sphere(group, 0, y - .2, 0, .12, "#ffe3a7");
  return group;
}

export function tellerCounter(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, width = 4): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .56, 0, width, 1.05, .82, "#f0e8da", .045);
  block(group, 0, 1.13, 0, width + .12, .1, .94, palette.woodLight, .035);
  for (let i = 0; i < Math.floor(width / .16); i++) block(group, -width / 2 + .11 + i * .16, .55, .42, .065, 1.05, .045, palette.wood, .012);
  for (const offset of [-.92, .92]) monitor(group, offset, -.2, "chat", .65);
  return group;
}

export function labBench(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0, variant: "microscope" | "wafer" | "screens" = "microscope"): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, .77, 0, 2.25, .12, 1.05, "#f6f8f7", .04);
  for (const side of [-1, 1]) {
    block(group, side * .82, .37, 0, .49, .7, .83, palette.woodLight, .025);
    for (const y of [.23, .43, .63]) block(group, side * .82, y, .43, .36, .13, .025, palette.secondary, .01);
  }
  if (variant === "microscope") {
    cylinder(group, -.3, .86, -.05, .22, .22, .05, palette.dark, 18);
    cylinder(group, -.3, 1.14, -.07, .09, .14, .5, "#d4e4e6", 14);
    block(group, -.17, 1.35, -.04, .36, .15, .2, palette.dark, .055);
    cylinder(group, .48, .88, .05, .22, .22, .1, palette.accent, 20, .4);
  } else if (variant === "wafer") {
    cylinder(group, -.34, .87, .04, .33, .33, .04, palette.dark, 24);
    cylinder(group, -.34, .9, .04, .25, .25, .02, palette.accent, 24, .5);
    block(group, .4, 1.08, -.2, .73, .52, .1, palette.dark, .02);
    block(group, .4, 1.08, -.14, .61, .4, .01, "#73c4cf");
  } else {
    monitor(group, -.42, -.22, "lab", .76);
    monitor(group, .48, -.22, "chart", .76);
  }
  officeChair(group, 0, 1.03, palette.secondary, Math.PI);
  return group;
}

export function labMachine(parent: THREE.Object3D, x: number, z: number, palette: Palette, angle = 0): THREE.Group {
  const group = local(parent, x, z, angle);
  block(group, 0, 1.18, 0, 1.4, 2.28, .95, "#dce9ec", .055);
  block(group, 0, 1.34, .495, .84, .78, .025, palette.dark, .012);
  block(group, 0, 1.34, .515, .66, .55, .015, "#80c0c3", .012);
  for (let i = 0; i < 3; i++) block(group, -.42 + i * .42, .53, .5, .27, .1, .025, palette.secondary, .01);
  block(group, 0, 2.36, 0, 1.3, .11, .9, palette.woodLight, .02);
  sphere(group, .49, 2.47, .22, .08, "#62c7bb");
  return group;
}

export function kitchenCounter(parent: THREE.Object3D, x: number, z: number, palette: Palette): THREE.Group {
  const group = local(parent, x, z);
  block(group, 0, .69, 0, 4.8, 1.25, .94, palette.wood, .055);
  block(group, 0, 1.36, 0, 4.96, .12, 1.05, "#ead0ae", .035);
  for (let i = 0; i < 24; i++) block(group, -2.28 + i * .198, .69, .475, .09, 1.26, .05, i % 3 ? palette.woodLight : palette.wood, .012);
  block(group, -.68, 1.48, -.19, 1.08, .08, .48, "#f1eee4", .035);
  for (const offset of [-.78, .05, .84]) cylinder(group, offset, 1.47, -.05, .14, .14, .055, "#fff6e4", 16);
  return group;
}

export function glassPod(parent: THREE.Object3D, x: number, z: number, palette: Palette, width = 3, depth = 2.6): void {
  glassWall(parent, x, z + depth / 2, width, 0, 2.55, palette.dark);
  glassWall(parent, x - width / 2, z, depth, Math.PI / 2, 2.55, palette.dark);
  block(parent, x, 2.56, z + depth / 2, width, .07, .14, palette.dark);
}

export function wallArt(parent: THREE.Object3D, x: number, z: number, palette: Palette): void {
  block(parent, x, 1.78, z, 1.16, 1.31, .07, palette.woodLight, .025);
  block(parent, x, 1.78, z + .04, 1.02, 1.17, .01, "#f2d5b7");
  sphere(parent, x + .17, 1.75, z + .062, .28, palette.accent, [1.2, .7, .1]);
  block(parent, x - .16, 1.53, z + .065, .37, .42, .008, palette.secondary);
}

export function deskPlant(parent: THREE.Object3D, x: number, z: number): void {
  plant(parent, x, z, .45, "#ece4d6", "#557f60");
}
