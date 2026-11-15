/**
 * The diorama: one set for every machine that has no place of its own (requirements 10.6.1, "the rest of the cast").
 *
 * An archive hall in the dark, one lamp, a round stand. On the stand is whatever the file hands over (`SetContext`):
 *  - `model`: an official NASA model, fitted to the stand, turning slowly so every side can be seen; or
 *  - `image`: a real NASA photograph, untouched, shown as an archive plate.
 * The same eight cues serve the seven beats of every file, so **a new file is one YAML and one manifest row**.
 *
 * Options a file may set in `set.options`:
 *   yaw    degrees the model is turned at the start (default 0)
 *   size   how much of the stand the model fills, 0.5 to 1.4 (default 1)
 *   float  true for spacecraft that never stood on anything: the model hangs above the stand
 *
 * Nothing here is to scale with anything else, and the hall does not exist: files that use it carry their label.
 */
import * as THREE from 'three';
import { loadModel, loadTexture } from '../../three/assets';
import type { SceneHost, SetContext, SetController, Tier } from '../../three/host';
import { clamp, damp, rng } from '../../three/util';

type V3 = [number, number, number];
/** `dim`: how much of the lamp is left, 0 to 1. */
type Shot = { pos: V3; fov: number; orbit?: number; shift?: number; dim?: number };

/** The middle of the hero, above the floor. Every camera looks at it. */
const MID = 2.1;
const RIM = 0.8;
const FILL = 0.5;
const SOFT = 1.3;
const SHOTS: Record<string, Shot> = {
  passage: { pos: [0, 3.4, 18], fov: 30, orbit: 0.012 },
  arrival: { pos: [6.4, 3.2, 7.6], fov: 34, orbit: 0.03 },
  operation: { pos: [-8.6, 2.6, 3.6], fov: 34, orbit: -0.03 },
  discovery: { pos: [3.6, 7.2, 5.8], fov: 34, orbit: 0.03 },
  silence: { pos: [0, 2.8, 13.5], fov: 30, dim: 0.16 },
  clew: { pos: [-9, 4.2, 13.5], fov: 30, dim: 0.5, orbit: 0.012 },
  status: { pos: [-5.6, 2.8, 7.8], fov: 34, orbit: -0.025 },
  file: { pos: [5.4, 3.0, 7.4], fov: 34, orbit: 0.1, shift: 0.2 },
};

export async function create(host: SceneHost, ctx: SetContext): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1.05;
  scene.background = new THREE.Color(0x040302);
  const opt = ctx.options as { yaw?: number; size?: number; float?: boolean };
  /** A photograph is looked at from the front; a model from every side. */
  const plate = !ctx.model && !!ctx.image;

  // ---------- The hall: a floor that fades into the dark, a stand, one lamp ----------
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 64), new THREE.MeshStandardMaterial({ color: 0x070605, roughness: 1, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.7, 0.16, 72), new THREE.MeshStandardMaterial({ color: 0x1d1a15, roughness: 0.55, metalness: 0.5 }));
  stand.position.y = 0.08;
  stand.receiveShadow = true;
  const edge = new THREE.Mesh(new THREE.TorusGeometry(3.52, 0.018, 8, 120), new THREE.MeshBasicMaterial({ color: 0xffc35a }));
  edge.rotation.x = Math.PI / 2;
  edge.position.y = 0.165;
  root.add(floor, stand, edge);

  const lamp = new THREE.SpotLight(0xfff0dc, 1500, 70, 0.5, 0.85, 2);
  lamp.position.set(5.5, 13, 8);
  lamp.target.position.set(0, MID, 0);
  lamp.castShadow = host.tier !== 'low';
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight(0x9db8ff, RIM);
  rim.position.set(-7, 5, -9);
  const fill = new THREE.HemisphereLight(0x4a5262, 0x100c08, FILL);
  // A soft second light from the other side, so no camera ever looks at an unlit hero.
  const soft = new THREE.DirectionalLight(0xffe6c8, SOFT);
  soft.position.set(-7, 6, 9);
  root.add(lamp, lamp.target, rim, fill, soft);

  // A little dust in the lamp's beam. It does not move with reduced motion.
  const seeded = rng([...ctx.id].reduce((n, ch) => n * 31 + ch.charCodeAt(0), 7) >>> 0);
  const MOTES = Math.round(140 * host.budget);
  const motesGeo = new THREE.BufferGeometry();
  const motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) motePos.set([(seeded() - 0.5) * 12, 0.4 + seeded() * 7, (seeded() - 0.5) * 12], i * 3);
  motesGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: 0xffe2b0, size: 0.03, sizeAttenuation: true, transparent: true, opacity: 0.5, depthWrite: false }));
  root.add(motes);

  // ---------- The hero ----------
  const turn = new THREE.Group();
  root.add(turn);
  if (ctx.model) {
    const model = (await loadModel(ctx.model.file)).scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.multiplyScalar((4.4 * clamp(opt.size ?? 1, 0.5, 1.4)) / Math.max(size.x, size.y, size.z));
    box.setFromObject(model);
    const mid = box.getCenter(new THREE.Vector3());
    model.position.x -= mid.x;
    model.position.z -= mid.z;
    // On its feet on the stand, or hanging above it.
    model.position.y += opt.float ? MID + 0.5 - mid.y : 0.17 - box.min.y;
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
    });
    turn.add(model);
    turn.rotation.y = ((opt.yaw ?? 0) * Math.PI) / 180;
  } else if (ctx.image) {
    const tex = await loadTexture(`img/${ctx.image.file}`);
    const img = tex.image as { width: number; height: number };
    const aspect = img.width / img.height;
    const h = Math.min(3.5, 6.4 / aspect);
    const w = h * aspect;
    // The photograph itself is never lit, tinted or tone-mapped: it is evidence.
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    const mount = new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, h + 0.36, 0.08), new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 0.7, metalness: 0.3 }));
    mount.position.z = -0.05;
    mount.castShadow = true;
    const line = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(w + 0.16, h + 0.16)), new THREE.LineBasicMaterial({ color: 0xffc35a }));
    line.position.z = 0.002;
    const plateRig = new THREE.Group();
    plateRig.add(mount, photo, line);
    plateRig.position.set(0, MID + 0.25, 0);
    plateRig.rotation.x = -0.05;
    turn.add(plateRig);
  }

  // ---------- State ----------
  let cue = 'passage';
  let shot = SHOTS[cue];
  let cueTime = 0;
  let cut = true;
  let dim = 1;
  const camPos = new THREE.Vector3();
  let camFov = 34;
  let shiftNow = 0;
  const look = new THREE.Vector3(0, MID, 0);
  const wantPos = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();

  // ---------- Looking around ----------
  const view = { yaw: 0, pitch: 0, dragging: false, x: 0, y: 0 };
  /** A photograph has no back: the camera stays in front of it. */
  const YAW = plate ? 0.75 : 2.9;
  const el = host.canvas;
  const onDown = (e: PointerEvent) => {
    view.dragging = true;
    view.x = e.clientX;
    view.y = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!view.dragging) return;
    view.yaw = clamp(view.yaw - (e.clientX - view.x) * 0.005, -YAW, YAW);
    view.pitch = clamp(view.pitch + (e.clientY - view.y) * 0.004, -0.35, 0.8);
    view.x = e.clientX;
    view.y = e.clientY;
  };
  const onUp = () => {
    view.dragging = false;
  };
  let turning = 0;
  const TURN: Record<string, number> = { arrowleft: -1, a: -1, arrowright: 1, d: 1 };
  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!(k in TURN) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    held.add(k);
    turning = [...held].reduce((n, key) => n + TURN[key], 0);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (held.delete(e.key.toLowerCase())) turning = [...held].reduce((n, key) => n + TURN[key], 0);
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);

  const controller: SetController = {
    setCue(next, instant) {
      if (!SHOTS[next]) return;
      const same = next === cue;
      cue = next;
      shot = SHOTS[next];
      if (same && !instant) return;
      cueTime = 0;
      view.yaw = 0;
      view.pitch = 0;
      cut = !!instant || host.reduceMotion || cut;
      if (instant || host.reduceMotion) dim = shot.dim ?? 1;
    },

    step(dt) {
      dim += clamp((shot.dim ?? 1) - dim, -dt / 2.2, dt / 1.2);
      if (!host.reduceMotion && !plate) turn.rotation.y += dt * 0.1;
    },

    frame(dt, time) {
      cueTime += dt;
      const still = host.reduceMotion;
      lamp.intensity = 1500 * dim;
      rim.intensity = RIM * (0.3 + 0.7 * dim);
      fill.intensity = FILL * (0.35 + 0.65 * dim);
      soft.intensity = SOFT * dim;
      motes.visible = !still;
      if (!still) motes.rotation.y = time * 0.01;

      if (turning) view.yaw = clamp(view.yaw + turning * dt * 1.3, -YAW, YAW);
      const t = still ? 0 : cueTime;
      // In front of a photograph the camera keeps to a narrow arc.
      wantPos.set(shot.pos[0] * (plate ? 0.42 : 1), shot.pos[1], plate ? Math.abs(shot.pos[2]) + 2 : shot.pos[2]);
      offset.copy(wantPos).sub(look);
      spherical.setFromVector3(offset);
      spherical.theta += (shot.orbit ?? 0) * t * (plate ? 0.25 : 1) + view.yaw;
      spherical.phi = clamp(spherical.phi - view.pitch, 0.2, 1.52);
      wantPos.copy(look).add(offset.setFromSpherical(spherical));

      if (cut) {
        camPos.copy(wantPos);
        camFov = shot.fov;
        shiftNow = shot.shift ?? 0;
        cut = false;
      } else {
        camPos.set(damp(camPos.x, wantPos.x, 1.8, dt), damp(camPos.y, wantPos.y, 1.8, dt), damp(camPos.z, wantPos.z, 1.8, dt));
        camFov = damp(camFov, shot.fov, 2, dt);
        shiftNow = damp(shiftNow, shot.shift ?? 0, 2, dt);
      }
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(look);
      camera.near = 0.2;
      camera.far = 400;
      if (Math.abs(camera.fov - camFov) > 0.01) camera.fov = camFov;
      if (Math.abs(shiftNow) > 0.002) camera.setViewOffset(host.width, host.height, shiftNow * host.width, 0, host.width, host.height);
      else if (camera.view) camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },

    hotspot() {
      return null;
    },

    onTier(tier: Tier) {
      lamp.castShadow = tier !== 'low';
    },

    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      camera.clearViewOffset();
      camera.up.set(0, 1, 0);
      scene.remove(root);
    },
  };

  controller.setCue('passage', true);
  return controller;
}
