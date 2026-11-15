/**
 * What stands on Tranquility Base.
 *  - Eagle: NASA's official Apollo Lunar Module model (NASA 3D Resources), split into its two stages.
 *  - The flag and the two experiments: simple reconstructions from NASA photographs. The set says so
 *    on screen ("Reconstruction"), as pillar 6 asks.
 */
import * as THREE from 'three';
import { loadModel } from '../../three/assets';

/** Real height of the lunar module on its legs, metres. */
const LM_HEIGHT = 7.04;

export type Eagle = {
  root: THREE.Group;
  ascent: THREE.Group;
  descent: THREE.Group;
  plume: THREE.Mesh;
  /** Height of the split between the two stages, metres above the footpads. */
  splitY: number;
};

export async function buildEagle(): Promise<Eagle> {
  const gltf = await loadModel('mdl_apollo_lm.glb');
  const model = gltf.scene;
  model.updateMatrixWorld(true);

  // Scale to the real height and stand the footpads on y = 0, centred.
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = LM_HEIGHT / size.y;
  const centre = box.getCenter(new THREE.Vector3());
  model.scale.setScalar(k);
  model.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
  model.updateMatrixWorld(true);

  // The model is one piece. The ascent stage is everything whose centre sits above the descent stage's deck.
  const splitY = LM_HEIGHT * 0.47;
  const ascent = new THREE.Group();
  const descent = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  model.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  const b = new THREE.Box3();
  const c = new THREE.Vector3();
  for (const m of meshes) {
    m.castShadow = true;
    m.receiveShadow = true;
    b.setFromObject(m).getCenter(c);
    const target = c.y > splitY && b.min.y > splitY * 0.72 ? ascent : descent;
    target.attach(m);
  }

  // Descent engine plume. In vacuum it is almost invisible: a faint, wide, pale cone.
  const cone = new THREE.ConeGeometry(1.5, 5.5, 24, 1, true);
  cone.translate(0, -2.75, 0);
  const plume = new THREE.Mesh(
    cone,
    new THREE.MeshBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  plume.position.y = 1.5;
  descent.add(plume);

  const root = new THREE.Group();
  root.add(descent, ascent);
  return { root, ascent, descent, plume, splitY };
}

const metal = (color: number, roughness = 0.5, metalness = 0.6) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });
  return o;
}

/**
 * Laser Ranging Retroreflector: a square tray of 100 corner-cube mirrors, 46 cm across,
 * tilted toward the Earth on a simple pallet. No power, no cable.
 */
export function buildLrrr(): THREE.Group {
  const g = new THREE.Group();
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.05, 0.62), metal(0x9a9a98, 0.7, 0.3));
  pallet.position.y = 0.06;
  g.add(pallet);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), metal(0xb9b9b6));
  leg.position.set(0, 0.2, -0.24);
  g.add(leg);

  const tray = new THREE.Group();
  tray.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.46), metal(0xd9d9d4, 0.35, 0.8)));
  // 10 x 10 mirrors, drawn as one instanced set of small dark glass discs.
  const mirror = new THREE.CylinderGeometry(0.017, 0.017, 0.012, 12);
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.05, metalness: 1 });
  const mirrors = new THREE.InstancedMesh(mirror, glass, 100);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 100; i++) {
    m.makeTranslation(-0.2025 + (i % 10) * 0.045, 0.03, -0.2025 + Math.floor(i / 10) * 0.045);
    mirrors.setMatrixAt(i, m);
  }
  tray.add(mirrors);
  tray.position.y = 0.3;
  tray.rotation.x = -0.42;
  g.add(tray);
  return shadowed(g);
}

/** Passive Seismic Experiment Package: a low box, two solar panels, an antenna. It ran on sunlight. */
export function buildPsep(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.42, 20), new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.6, metalness: 0.2 }));
  body.position.y = 0.3;
  g.add(body);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.7), metal(0x9c9c98, 0.7, 0.3));
  base.position.y = 0.06;
  g.add(base);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1b2a55, roughness: 0.3, metalness: 0.6 });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.02, 0.5), panelMat);
    panel.position.set(side * 0.82, 0.42, 0);
    panel.rotation.z = side * 0.42;
    g.add(panel);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), metal(0xcfcfcf));
  mast.position.set(0, 0.95, 0.2);
  g.add(mast);
  return shadowed(g);
}

/** The flag assembly: a pole and a cloth held out by a rod, because there is no wind on the Moon. */
export function buildFlag(): { root: THREE.Group; pivot: THREE.Group } {
  const canvas = document.createElement('canvas');
  canvas.width = 190;
  canvas.height = 100;
  const ctx = canvas.getContext('2d')!;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
    ctx.fillRect(0, (i * 100) / 13, 190, 100 / 13 + 1);
  }
  ctx.fillStyle = '#3c3b6e';
  ctx.fillRect(0, 0, 76, (100 * 7) / 13);
  ctx.fillStyle = '#ffffff';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) ctx.fillRect(6 + c * 12, 5 + r * 10, 2, 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const pivot = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.1, 8), metal(0xd0d0d0, 0.4, 0.8));
  pole.position.y = 1.05;
  pivot.add(pole);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 6), metal(0xd0d0d0, 0.4, 0.8));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0.75, 2.08, 0);
  pivot.add(rod);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9, 10, 4), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
  // Permanent creases from the folded cloth: it never waved.
  const p = cloth.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.03 * (1 - (p.getY(i) + 0.45)));
  cloth.geometry.computeVertexNormals();
  cloth.position.set(0.75, 1.62, 0);
  pivot.add(cloth);

  const root = new THREE.Group();
  root.add(shadowed(pivot));
  return { root, pivot };
}

/** A flat ring on the ground that marks a place the player can choose. Drawn with icon and label in the DOM too. */
export function buildMarker(radius: number, color: number): THREE.Mesh {
  const ring = new THREE.RingGeometry(radius * 0.86, radius, 64);
  ring.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 3;
  return m;
}
