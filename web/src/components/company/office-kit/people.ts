import * as THREE from "three";
import { batchAnimatedParts } from "./optimize";

export type PersonOptions = {
  x: number;
  z: number;
  rotation?: number;
  clothing: string;
  skin?: string;
  hair?: string;
  pose?: "seated" | "standing";
  gesture?: "typing" | "wave" | "present";
};

const round = new THREE.SphereGeometry(1, 16, 12);
const softCylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const unit = new THREE.Vector3(0, 1, 0);

function material(color: string, roughness = .9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function ellipsoid(parent: THREE.Object3D, name: string, mat: THREE.Material, at: [number, number, number], scale: [number, number, number]) {
  const mesh = new THREE.Mesh(round, mat);
  mesh.name = name;
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function segment(parent: THREE.Object3D, name: string, mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  const mesh = new THREE.Mesh(softCylinder, mat);
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(unit, b.clone().sub(a).normalize());
  mesh.scale.set(radius, a.distanceTo(b), radius);
  mesh.castShadow = true;
  parent.add(mesh);
  ellipsoid(parent, `${name}-joint`, mat, [b.x, b.y, b.z], [radius, radius, radius]);
  return mesh;
}

function darker(hex: string, factor: number) {
  return `#${new THREE.Color(hex).multiplyScalar(factor).getHexString()}`;
}

function hairStyle(head: THREE.Group, hairMat: THREE.Material, variant: number) {
  // The roots overlap the scalp and cheek so the silhouette still reads at isometric scale.
  ellipsoid(head, "hair-cap", hairMat, [0, .095, -.018], [.222, .20, .205]);
  if (variant === 0) {
    ellipsoid(head, "side-fringe", hairMat, [-.105, .17, .105], [.135, .105, .12]);
    ellipsoid(head, "curl-front", hairMat, [.075, .22, .13], [.105, .085, .10]);
  } else if (variant === 1) {
    ellipsoid(head, "long-hair-left", hairMat, [-.19, -.1, -.035], [.1, .27, .15]);
    ellipsoid(head, "long-hair-right", hairMat, [.19, -.1, -.035], [.1, .27, .15]);
    ellipsoid(head, "swept-fringe", hairMat, [.06, .2, .095], [.17, .085, .13]);
  } else if (variant === 2) {
    for (const [x, y, z] of [[-.14, .22, .02], [.02, .255, .07], [.16, .2, .045], [-.18, .08, .10], [.17, .08, .11]]) {
      ellipsoid(head, "hair-curl", hairMat, [x, y, z], [.095, .09, .095]);
    }
  } else {
    ellipsoid(head, "hair-bun", hairMat, [0, .13, -.23], [.14, .14, .14]);
    ellipsoid(head, "hair-part", hairMat, [-.08, .19, .095], [.14, .09, .12]);
  }
}

export function createPerson(options: PersonOptions): { root: THREE.Group; update: (time: number) => void } {
  const pose = options.pose ?? "seated";
  const gesture = options.gesture ?? (pose === "seated" ? "typing" : "present");
  const skin = material(options.skin ?? "#c78760", .94);
  const hair = material(options.hair ?? "#302620", .98);
  const top = material(options.clothing, .91);
  const topShade = material(darker(options.clothing, .74), .93);
  const pants = material("#2b3540", .94);
  const shoes = material("#242b32", .9);
  const whites = material("#fff7e7", .97);
  const eye = material("#25201e", .75);
  const lip = material("#85494a", .95);
  const cheeks = material("#d99382", 1);
  const root = new THREE.Group();
  root.name = "coworker";
  root.position.set(options.x, 0, options.z);
  root.rotation.y = options.rotation ?? 0;
  let leftArm: THREE.Group | undefined;
  let rightArm: THREE.Group | undefined;
  let walking = false;

  const hipY = pose === "seated" ? .55 : .91;
  const torso = new THREE.Group();
  torso.name = "animated-torso";
  torso.position.y = hipY;
  root.add(torso);

  // Slightly shaped torso, open collar and jacket edge carry more character than a box body.
  ellipsoid(torso, "shirt-torso", top, [0, .28, 0], [.285, .39, .19]);
  ellipsoid(torso, "shirt-hem", topShade, [0, .02, 0], [.25, .1, .19]);
  ellipsoid(torso, "neck", skin, [0, .63, .005], [.085, .11, .083]);
  ellipsoid(torso, "collar-left", whites, [-.085, .58, .115], [.09, .09, .028]);
  ellipsoid(torso, "collar-right", whites, [.085, .58, .115], [.09, .09, .028]);
  ellipsoid(torso, "shirt-detail", topShade, [0, .28, .175], [.018, .18, .012]);

  const head = new THREE.Group();
  head.name = "animated-head";
  head.position.set(0, .8, .015);
  torso.add(head);
  ellipsoid(head, "face", skin, [0, 0, 0], [.205, .245, .195]);
  ellipsoid(head, "left-ear", skin, [-.205, -.015, -.005], [.05, .075, .04]);
  ellipsoid(head, "right-ear", skin, [.205, -.015, -.005], [.05, .075, .04]);
  ellipsoid(head, "nose", skin, [0, -.035, .19], [.045, .055, .055]);
  for (const sign of [-1, 1]) {
    ellipsoid(head, `${sign}-eye-white`, whites, [sign * .083, .015, .178], [.052, .038, .021]);
    ellipsoid(head, `${sign}-pupil`, eye, [sign * .083, .016, .196], [.023, .027, .014]);
    const brow = ellipsoid(head, `${sign}-brow`, hair, [sign * .085, .092, .174], [.066, .014, .013]);
    brow.rotation.z = sign * -.12;
    ellipsoid(head, `${sign}-cheek`, cheeks, [sign * .13, -.085, .145], [.055, .026, .012]);
  }
  const smile = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.07, -.13, .176),
    new THREE.Vector3(0, -.148, .199),
    new THREE.Vector3(.07, -.13, .176),
  ]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(smile, 8, .007, 5, false), lip);
  mouth.name = "smile";
  head.add(mouth);
  const variety = Math.abs(Math.round((options.x * 17 + options.z * 23) * 10)) % 4;
  hairStyle(head, hair, variety);

  for (const sign of [-1, 1]) {
    const shoulderX = sign * .295;
    const pivot = new THREE.Group();
    pivot.name = sign < 0 ? "left-arm" : "right-arm";
    pivot.position.set(shoulderX, .53, 0);
    torso.add(pivot);
    const isRaised = sign > 0 && (gesture === "wave" || gesture === "present");
    const elbow = new THREE.Vector3(sign * .17, isRaised ? .17 : -.24, isRaised ? .06 : .12);
    const wrist = isRaised
      ? new THREE.Vector3(sign * .21, gesture === "wave" ? .48 : .30, .22)
      : new THREE.Vector3(sign * .15, -.29, .42);
    segment(pivot, "upper-sleeve", top, new THREE.Vector3(), elbow, .105);
    segment(pivot, "forearm", topShade, elbow, wrist, .079);
    ellipsoid(pivot, "hand", skin, [wrist.x, wrist.y, wrist.z], [.078, .09, .058]);
    if (sign < 0) leftArm = pivot;
    else rightArm = pivot;
  }

  const seatedLegs = new THREE.Group();
  const standingLegs = new THREE.Group();
  root.add(seatedLegs, standingLegs);
  standingLegs.visible = pose === "standing";
  if (pose === "seated") {
    ellipsoid(seatedLegs, "lap", pants, [0, .50, .12], [.245, .14, .24]);
    for (const sign of [-1, 1]) {
      const x = sign * .13;
      segment(seatedLegs, "seated-thigh", pants, new THREE.Vector3(x, .48, .11), new THREE.Vector3(x, .45, .41), .095);
      segment(seatedLegs, "seated-shin", pants, new THREE.Vector3(x, .43, .41), new THREE.Vector3(x, .115, .42), .077);
      ellipsoid(seatedLegs, "shoe", shoes, [x, .07, .49], [.1, .068, .16]);
    }
  }
  ellipsoid(standingLegs, "hips", pants, [0, .88, 0], [.245, .16, .18]);
  for (const sign of [-1, 1]) {
    const x = sign * .125;
    segment(standingLegs, "standing-leg", pants, new THREE.Vector3(x, .83, 0), new THREE.Vector3(x * 1.1, .12, .025), .105);
    ellipsoid(standingLegs, "shoe", shoes, [x * 1.1, .07, .095], [.11, .07, .18]);
  }

  root.userData.setWalking = (value: boolean) => {
    walking = value;
    seatedLegs.visible = pose === "seated" && !value;
    standingLegs.visible = pose === "standing" || value;
  };

  const phase = options.x * 1.3 + options.z * .7;
  function update(time: number) {
    const t = time + phase;
    head.rotation.y = Math.sin(t * .8) * .065;
    head.rotation.z = Math.sin(t * .55) * .02;
    torso.rotation.z = Math.sin(t * .73) * .017;
    torso.position.y = walking ? .91 : hipY;
    if (walking) {
      if (leftArm) leftArm.rotation.x = Math.sin(t * 8) * .34;
      if (rightArm) rightArm.rotation.x = -Math.sin(t * 8) * .34;
    } else if (gesture === "typing") {
      if (leftArm) leftArm.rotation.x = Math.sin(t * 6.4) * .055;
      if (rightArm) rightArm.rotation.x = Math.sin(t * 6.4 + Math.PI) * .055;
    } else if (gesture === "wave") {
      if (rightArm) {
        rightArm.rotation.z = Math.sin(t * 2.3) * .14;
        rightArm.rotation.x = Math.sin(t * 1.3) * .06;
      }
    } else {
      if (rightArm) rightArm.rotation.x = Math.sin(t * 1.5) * .11;
      if (leftArm) leftArm.rotation.z = Math.sin(t) * .025;
    }
  }

  batchAnimatedParts(root);
  return { root, update };
}
