import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Each body pivot still moves independently. Only parts fixed to the same
// pivot are combined, so faces and hands keep their animation.
export function batchAnimatedParts(root: THREE.Group): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Group)) return;
    const buckets = new Map<string, THREE.Mesh[]>();
    for (const child of object.children) {
      if (!(child instanceof THREE.Mesh) || !(child.material instanceof THREE.Material)) continue;
      const attributes = Object.keys(child.geometry.attributes).sort().join(",");
      const key = `${child.material.uuid}:${child.geometry.index ? "indexed" : "plain"}:${attributes}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(child);
      buckets.set(key, bucket);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const geometry = mergeGeometries(parts);
      parts.forEach((part) => part.dispose());
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, meshes[0].material);
      merged.castShadow = true;
      merged.receiveShadow = true;
      meshes.forEach((mesh) => object.remove(mesh));
      object.add(merged);
    }
  });
}

// Furniture and architecture do not animate. Baking their transforms into a
// few shared-material meshes keeps the detailed rooms affordable to orbit.
export function batchStaticMeshes(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const buckets = new Map<string, THREE.Mesh[]>();
  const visit = (object: THREE.Object3D, insidePerson = false, insideCutaway = false): void => {
    const animated = insidePerson || object.name === "coworker";
    const cutaway = insideCutaway || object.name.startsWith("cutaway-");
    if (!animated && !cutaway && object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial && !object.material.transparent && !object.material.map) {
      const attributes = Object.keys(object.geometry.attributes).sort().join(",");
      const key = `${object.material.uuid}:${object.geometry.index ? "indexed" : "plain"}:${attributes}`;
      const bucket = buckets.get(key) ?? [];
      bucket.push(object);
      buckets.set(key, bucket);
    }
    for (const child of object.children) visit(child, animated, cutaway);
  };
  visit(root);
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const transformed = meshes.map((mesh) => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const merged = mergeGeometries(transformed);
    if (!merged) {
      transformed.forEach((geometry) => geometry.dispose());
      continue;
    }
    transformed.forEach((geometry) => geometry.dispose());
    const result = new THREE.Mesh(merged, meshes[0].material);
    result.castShadow = true;
    result.receiveShadow = true;
    root.add(result);
    for (const mesh of meshes) mesh.parent?.remove(mesh);
  }
}
