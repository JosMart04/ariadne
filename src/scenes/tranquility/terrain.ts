/**
 * The ground of Tranquility Base.
 *
 * Colour: the real Lunar Reconnaissance Orbiter image of the site (PIA12925), draped at its true scale.
 * Relief: craters placed where the image shows them, with estimated depths, plus fine seeded noise.
 * That is why the set carries the label "Terrain approximated from NASA imagery" (10.6.1, C-D13).
 */
import * as THREE from 'three';
import { loadTexture } from '../../three/assets';
import { fbm, rng } from '../../three/util';
import { CRATERS, ORTHO_BOUNDS, groundAt, trackZ } from '../../sim/tranquility';

/** Width of the soft border of the photograph, as a fraction of its side. */
const FEATHER = 0.06;

/** Ground height including the fine relief the simulation ignores (centimetres, never more than 0.3 m). */
export function height(x: number, z: number): number {
  return groundAt(x, z) + (fbm(x * 0.05, z * 0.05, 3, 7) - 0.5) * 0.6;
}

/** A tileable grey noise texture: fine grain for the regolith when the camera is near the ground. */
function grainTexture(size = 256): THREE.DataTexture {
  const r = rng(1969);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = 110 + Math.floor(r() * 110);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** Large soft patches of slightly lighter and darker ground, around the photograph's average grey. */
function mottleTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      // Tileable: sample the noise on a torus.
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const n = fbm(Math.cos(u) * 1.6 + 5, Math.sin(u) * 1.6 + Math.cos(v) * 1.6, 4, 23) * 0.6 + fbm(Math.sin(v) * 3.1, Math.cos(u) * 3.1 + 9, 3, 41) * 0.4;
      const g = Math.round(78 + (n - 0.5) * 34);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = g;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 760, 1 / 760);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** White in the middle, fading to black at the edges: hides the border of the orbital image. */
function featherTexture(size = 256, edge = FEATHER): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = Math.min(x, size - 1 - x) / (size * edge);
      const v = Math.min(y, size - 1 - y) / (size * edge);
      const a = Math.max(0, Math.min(1, Math.min(u, v)));
      const s = Math.floor(a * a * (3 - 2 * a) * 255);
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = s;
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, size, size);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

export async function buildTerrain(): Promise<THREE.Group> {
  const group = new THREE.Group();
  const photo = await loadTexture('tex/tex_tranquility_ground.webp');
  const grain = grainTexture();

  // --- The photographed square, 747 m across ---
  const n = 300;
  const { minX, maxX, minZ, maxZ } = ORTHO_BOUNDS;
  const pos = new Float32Array((n + 1) * (n + 1) * 3);
  const uv = new Float32Array((n + 1) * (n + 1) * 2);
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const x = minX + ((maxX - minX) * i) / n;
      const z = minZ + ((maxZ - minZ) * j) / n;
      const k = j * (n + 1) + i;
      pos[k * 3] = x;
      pos[k * 3 + 1] = height(x, z);
      pos[k * 3 + 2] = z;
      uv[k * 2] = i / n;
      uv[k * 2 + 1] = 1 - j / n;
    }
  const index: number[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      index.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();

  const bump = grain.clone();
  bump.repeat.set(420, 420);
  bump.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({
    map: photo,
    bumpMap: bump,
    bumpScale: 0.3,
    roughness: 1,
    metalness: 0,
    alphaMap: featherTexture(),
    transparent: true,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  ground.renderOrder = 1;
  group.add(ground);

  // --- The plain beyond the photograph, out to the horizon ---
  // It has a hole under the photograph, or it would cover the inside of every crater deeper than itself.
  const shape = new THREE.Shape();
  shape.absarc((minX + maxX) / 2, -(minZ + maxZ) / 2, 26000, 0, Math.PI * 2, false);
  const inset = (maxX - minX) * FEATHER * 1.05;
  const hole = new THREE.Path();
  hole.moveTo(minX + inset, -(minZ + inset));
  hole.lineTo(minX + inset, -(maxZ - inset));
  hole.lineTo(maxX - inset, -(maxZ - inset));
  hole.lineTo(maxX - inset, -(minZ + inset));
  hole.closePath();
  shape.holes.push(hole);
  const far = new THREE.ShapeGeometry(shape, 96);
  far.rotateX(-Math.PI / 2);
  // ShapeGeometry writes metres into the UVs: the textures repeat per metre.
  const farBump = grain.clone();
  farBump.repeat.set(1 / 3, 1 / 3);
  farBump.needsUpdate = true;
  // Same average tone as the photograph (78 of 255), so the join does not show; mottled so it is not flat.
  const farMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mottleTexture(), roughness: 1, metalness: 0, bumpMap: farBump, bumpScale: 2 });
  const plain = new THREE.Mesh(far, farMat);
  plain.position.y = -0.35;
  plain.receiveShadow = true;
  group.add(plain);

  group.add(buildBoulders());
  return group;
}

/**
 * Boulders. The journal gives rocks "up to 2 to 3 meters in size" around West Crater, thrown out by the impact;
 * the rest of the plain has only small rocks. Positions are seeded, so every player sees the same field.
 */
function buildBoulders(): THREE.InstancedMesh {
  const r = rng(11);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.72 + 0.5 * fbm(p.getX(i) * 1.7 + 3, p.getY(i) * 1.7 + p.getZ(i), 2, 5);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.72, p.getZ(i) * k);
  }
  rock.computeVertexNormals();

  const west = CRATERS[0];
  const spots: { x: number; z: number; s: number }[] = [];
  // The boulder field: thick near the rim, thinning out to about two crater radii.
  for (let i = 0; i < 620; i++) {
    const a = r() * Math.PI * 2;
    const d = west.r * (0.55 + Math.pow(r(), 1.6) * 1.9);
    spots.push({ x: west.x + Math.cos(a) * d, z: west.z + Math.sin(a) * d, s: 0.25 + Math.pow(r(), 2.2) * 1.3 });
  }
  // A denser strip under the approach path, so the danger reads from the pilot's seat.
  for (let i = 0; i < 160; i++) {
    const x = 330 + r() * 470;
    spots.push({ x, z: trackZ(x) + (r() - 0.5) * 90, s: 0.3 + Math.pow(r(), 1.8) * 1.2 });
  }
  // Small rocks around the landing point.
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    const d = 6 + Math.pow(r(), 0.7) * 120;
    spots.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.08 + Math.pow(r(), 3) * 0.5 });
  }

  const mesh = new THREE.InstancedMesh(rock, new THREE.MeshStandardMaterial({ color: 0xb5b1aa, roughness: 0.95, metalness: 0 }), spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  spots.forEach((s, i) => {
    e.set(r() * 6.28, r() * 6.28, r() * 6.28);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(s.x, height(s.x, s.z) + s.s * 0.18, s.z), q, new THREE.Vector3(s.s, s.s, s.s));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
