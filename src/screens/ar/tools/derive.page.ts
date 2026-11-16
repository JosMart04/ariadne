/**
 * Browser half of the AR model derivation. `derive-models.ts` loads this module through the dev server and calls it;
 * nothing in the game imports it, so it is never part of the bundle.
 *
 * A model of the game is fitted to a stand and says nothing about size (the rover's file is about five times too
 * large). A derived model is what a phone's AR viewer needs: metres, standing on the ground, centred, with plain
 * geometry (no Draco) and plain textures (no WebP).
 */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { loadModel } from '../../../three/assets';

type V3 = [number, number, number];
export type Part = { name: string; size: V3; reach: number };
export type Measure = { size: V3; parts: Part[]; triangles: number };

const v3 = (v: THREE.Vector3): V3 => [+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5)];

/** The box of an object from its real vertices, not from the corners of looser boxes. */
function boxOf(o: THREE.Object3D): THREE.Box3 {
  o.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(o, true);
}

/** How far the farthest vertex of a mesh is from the upright line through the middle of its box: half a rotor's span. */
function reachOf(mesh: THREE.Mesh): number {
  const mid = boxOf(mesh).getCenter(new THREE.Vector3());
  const pos = mesh.geometry.getAttribute('position');
  const p = new THREE.Vector3();
  let far = 0;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    far = Math.max(far, Math.hypot(p.x - mid.x, p.z - mid.z));
  }
  return far;
}

function describe(root: THREE.Object3D): Measure {
  const parts: Part[] = [];
  let triangles = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
    // A mesh with several materials arrives as a group of meshes: the name that means something is the parent's.
    parts.push({ name: `${mesh.parent?.name ?? ''}/${mesh.name}`, size: v3(boxOf(mesh).getSize(new THREE.Vector3())), reach: +reachOf(mesh).toFixed(5) });
  });
  return { size: v3(boxOf(root).getSize(new THREE.Vector3())), parts, triangles: Math.round(triangles) };
}

/** The model as the game ships it, in its own units. */
export async function measure(file: string): Promise<Measure> {
  return describe((await loadModel(file)).scene);
}

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap', 'sheenColorMap', 'sheenRoughnessMap', 'specularColorMap', 'specularIntensityMap'] as const;

/**
 * Scales the model by `scale`, stands it on the ground in the middle, and returns it as a plain binary glTF (base64).
 * Textures are written as JPEG at most `texture` pixels wide (PNG where the material is see-through).
 */
export async function derive(file: string, scale: number, texture: number): Promise<{ glb: string; after: Measure }> {
  const root = (await loadModel(file)).scene;
  root.scale.multiplyScalar(scale);
  const box = boxOf(root);
  root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  root.updateWorldMatrix(true, true);

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mat = m as THREE.MeshPhysicalMaterial;
      for (const key of MAPS) {
        const tex = mat[key] as THREE.Texture | null | undefined;
        if (tex) tex.userData.mimeType = key === 'map' && (mat.transparent || mat.alphaTest > 0) ? 'image/png' : 'image/jpeg';
      }
    }
  });

  const out = (await new GLTFExporter().parseAsync(root, { binary: true, maxTextureSize: texture })) as ArrayBuffer;
  const bytes = new Uint8Array(out);
  let text = '';
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { glb: btoa(text), after: describe(root) };
}
