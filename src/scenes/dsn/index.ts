/**
 * The Deep Space Network and Voyager 1: the 3D set of E16.
 *
 * Three places share one camera:
 *  - `earth`    a 70-metre antenna at night (NASA's official model, at its real size). The player turns it in
 *               azimuth and elevation to the predicted position of Voyager 1, the way the real antennas are pointed.
 *  - `space`    Voyager 1 (NASA's official model). The Sun behind it is only a bright star, as it is from there.
 *  - `portrait` the view back toward home: the Sun and the planets as dots. An artistic view of the real
 *               "family portrait" that Voyager 1 took as its last pictures.
 *
 * Operational fidelity (FR-60): nobody flies Voyager. The only thing an operator moves is the antenna on Earth,
 * and every command takes almost a day to arrive. The pointing logic is src/sim/dsn.ts.
 */
import * as THREE from 'three';
import { loadModel } from '../../three/assets';
import type { SceneHost, SetController } from '../../three/host';
import { clamp, damp, rng } from '../../three/util';
import { PLANET, POINTINGS, POINT_START, VOYAGER, direction, listen, signal, turn, type Pointing } from '../../sim/dsn';
import type { OutcomeOf } from '../../sim/outcomes';

type Place = 'earth' | 'space' | 'portrait';
type V3 = [number, number, number];
type Shot = { place: Place; pos: V3; look: V3; fov: number; orbit?: number; shift?: number; targets?: boolean };

const SHOTS: Record<string, Shot> = {
  passage: { place: 'space', pos: [60, 14, 90], look: [0, 0, 0], fov: 30, orbit: 0.01 },
  voyager: { place: 'space', pos: [9, 3.5, 13], look: [0, 0.6, 0], fov: 36, orbit: 0.05 },
  dish: { place: 'earth', pos: [120, 9, 150], look: [0, 36, 0], fov: 42, orbit: 0.012 },
  aim: { place: 'earth', pos: [64, 12, -128], look: [-58, 88, 86], fov: 64, targets: true },
  listen: { place: 'earth', pos: [64, 12, -128], look: [-58, 88, 86], fov: 64 },
  portrait: { place: 'portrait', pos: [0, 0, 60], look: [0, 0, 0], fov: 30 },
  clew: { place: 'space', pos: [22, 5, 30], look: [0, 0, 0], fov: 30, orbit: 0.03 },
  status: { place: 'space', pos: [-10, 2.5, 12], look: [0, 0.6, 0], fov: 36, orbit: -0.04 },
  file: { place: 'space', pos: [10, 3, 12], look: [0, 0.6, 0], fov: 36, orbit: 0.14, shift: 0.2 },
};

const SPACE_AT = new THREE.Vector3(0, 50000, 0);
const PORTRAIT_AT = new THREE.Vector3(0, -50000, 0);
/** The antenna's elevation axis is 33.9 m above the ground in NASA's model. */
const PIVOT = new THREE.Vector3(0, 33.9, 0);
const SKY = 5000;

export type DsnEnd = { outcome: OutcomeOf<'dsn'> | null };

export async function create(host: SceneHost): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1.1;
  const seeded = rng(1977_09_05);

  const [dishFile, probeFile] = await Promise.all([loadModel('mdl_dsn_70m.glb'), loadModel('mdl_voyager.glb')]);

  const stars = (count: number, radius: number, all: boolean) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const y = all ? seeded() * 2 - 1 : seeded() * 1.02 - 0.03;
      const a = seeded() * Math.PI * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      pos.set([Math.cos(a) * r * radius, y * radius, Math.sin(a) * r * radius], i * 3);
      const b = 0.25 + Math.pow(seeded(), 3) * 0.75;
      col.set([b, b, b * (0.9 + seeded() * 0.2)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
    p.frustumCulled = false;
    return p;
  };
  const dot = (color: number, size: number) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size);
    return s;
  };

  // ---------- Earth: the antenna at night ----------
  const earth = new THREE.Group();
  root.add(earth);
  earth.add(stars(1700, 30000, false));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4000, 48), new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  earth.add(ground);
  const dish = dishFile.scene;
  earth.add(dish);
  const azimuth = dish.getObjectByName('azimuth');
  const elevation = dish.getObjectByName('elevation');
  // Moonlight from above and behind, and the warm work lights of the station at its feet.
  const moonlight = new THREE.DirectionalLight(0xbfd0ff, 1.5);
  moonlight.position.set(-300, 500, -200);
  earth.add(moonlight, new THREE.HemisphereLight(0x1b2540, 0x0c0a08, 0.9));
  for (const [x, z] of [[46, 40], [-44, 42], [40, -46], [-42, -40]] as [number, number][]) {
    const lamp = new THREE.PointLight(0xffb060, 9000, 170, 2);
    lamp.position.set(x, 7, z);
    earth.add(lamp);
  }
  const skyAt = (p: Pointing) => {
    const d = direction(p);
    return new THREE.Vector3(d[0], d[1], d[2]).multiplyScalar(SKY).add(PIVOT);
  };
  const planet = dot(0xfff0c8, 0.03);
  planet.position.copy(skyAt(PLANET));
  earth.add(planet);
  // Voyager is far too faint to see. The ring marks where the predictions say it is.
  const predicted = new THREE.Mesh(new THREE.RingGeometry(SKY * 0.016, SKY * 0.02, 40), new THREE.MeshBasicMaterial({ color: 0xffc35a, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthTest: false }));
  predicted.position.copy(skyAt(VOYAGER));
  predicted.lookAt(PIVOT);
  earth.add(predicted);
  const emptyAt = skyAt(POINTINGS['on-empty']);

  // ---------- Space: Voyager 1 ----------
  const space = new THREE.Group();
  space.position.copy(SPACE_AT);
  root.add(space);
  space.add(stars(2600, 30000, true));
  const probe = probeFile.scene;
  // The model is a few centimetres across; Voyager's dish is 3.7 m wide and its arm 13 m long.
  const box = new THREE.Box3().setFromObject(probe);
  const size = box.getSize(new THREE.Vector3());
  probe.scale.setScalar(11 / Math.max(size.x, size.y, size.z));
  box.setFromObject(probe);
  probe.position.sub(box.getCenter(new THREE.Vector3()));
  const probeRig = new THREE.Group();
  probeRig.add(probe);
  space.add(probeRig);
  // From here the Sun is a star: bright, and no wider than a point.
  const toSun = new THREE.Vector3(-0.72, 0.18, -0.67).normalize();
  const sunStar = dot(0xfff6e0, 0.05);
  sunStar.position.copy(toSun).multiplyScalar(20000);
  space.add(sunStar);
  const sunlight = new THREE.DirectionalLight(0xfff2dc, 2.4);
  sunlight.position.copy(toSun).multiplyScalar(100);
  space.add(sunlight, sunlight.target, new THREE.AmbientLight(0x30364a, 0.55));

  // ---------- The portrait: looking back toward home ----------
  const portrait = new THREE.Group();
  portrait.position.copy(PORTRAIT_AT);
  root.add(portrait);
  portrait.add(stars(1500, 30000, true));
  const home = dot(0xfff6e0, 0.07);
  portrait.add(home);
  // Six planets were in the real portrait: Venus, Earth, Jupiter, Saturn, Uranus, Neptune. Colours and spacing are artistic.
  const PLANETS: [number, number, number, number][] = [
    [-1.6, 0.3, 0xf2e6c0, 0.01],
    [2.3, -0.5, 0x9db8ff, 0.011],
    [-7.5, 1.3, 0xf0c8a0, 0.016],
    [11.5, -2.1, 0xeed9a8, 0.014],
    [-17, 3.2, 0xb8e6ee, 0.009],
    [22, -4.3, 0x8fa8ff, 0.009],
  ];
  const earthDot = new THREE.Vector3();
  PLANETS.forEach(([x, y, color, s], i) => {
    const p = dot(color, s);
    p.position.set(x, y, 0);
    portrait.add(p);
    if (i === 1) earthDot.set(x, y, 0).add(PORTRAIT_AT);
  });

  // ---------- State ----------
  let cue = 'passage';
  let shot = SHOTS[cue];
  let cueTime = 0;
  let cut = true;
  let point: Pointing = POINT_START;
  /** Where the dish really is: it turns slowly toward `point`, like 3,000 tons of steel. */
  let shown: Pointing = POINT_START;
  let run: { from: Pointing; to: Pointing; t: number; held: number; done?: (e: DsnEnd) => void; outcome: OutcomeOf<'dsn'> } | null = null;
  let player: { done: (e: DsnEnd) => void; held: number } | null = null;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let camFov = 40;
  let shiftNow = 0;
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  const tmp = new THREE.Vector3();
  const origin = (p: Place) => (p === 'space' ? SPACE_AT : p === 'portrait' ? PORTRAIT_AT : new THREE.Vector3());

  // ---------- Looking around, and turning the dish ----------
  const view = { yaw: 0, pitch: 0, dragging: false, x: 0, y: 0 };
  const el = host.canvas;
  const onDown = (e: PointerEvent) => {
    view.dragging = true;
    view.x = e.clientX;
    view.y = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!view.dragging) return;
    const dx = e.clientX - view.x;
    const dy = e.clientY - view.y;
    view.x = e.clientX;
    view.y = e.clientY;
    // At the controls, dragging turns the dish. Anywhere else it turns the camera.
    if (player && !player.held) point = turn(point, dx * 0.12, -dy * 0.1);
    else if (!player) {
      view.yaw = clamp(view.yaw - dx * 0.005, -2.6, 2.6);
      view.pitch = clamp(view.pitch + dy * 0.004, -0.5, 0.9);
    }
  };
  const onUp = () => {
    view.dragging = false;
  };
  let turning = 0;
  const TURN: Record<string, number> = { arrowleft: -1, a: -1, arrowright: 1, d: 1 };
  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!(k in TURN) || player || e.ctrlKey || e.metaKey || e.altKey) return;
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
      const moved = SHOTS[next].place !== shot.place;
      cue = next;
      shot = SHOTS[next];
      if (same && !instant) return;
      cueTime = 0;
      view.yaw = 0;
      view.pitch = 0;
      cut = !!instant || host.reduceMotion || moved || cut;
    },

    step(dt) {
      if (run) {
        if (run.t < 1) {
          run.t = Math.min(1, run.t + dt / 3.4);
          const k = run.t * run.t * (3 - 2 * run.t);
          point = { az: run.from.az + (run.to.az - run.from.az) * k, el: run.from.el + (run.to.el - run.from.el) * k };
        } else {
          run.held += dt;
          if (run.held > 1.3 && run.done) {
            const done = run.done;
            run.done = undefined;
            done({ outcome: run.outcome });
          }
        }
      }
      if (player?.held) {
        player.held += dt;
        if (player.held > 1.1) {
          const done = player.done;
          player = null;
          done({ outcome: listen(point) });
        }
      }
      // The dish follows the command at a few degrees per second.
      const rate = 26 * dt;
      let dAz = point.az - shown.az;
      if (dAz > 180) dAz -= 360;
      if (dAz < -180) dAz += 360;
      shown = host.reduceMotion ? point : turn(shown, clamp(dAz, -rate, rate), clamp(point.el - shown.el, -rate, rate));
    },

    frame(dt, time) {
      cueTime += dt;
      const still = host.reduceMotion;
      earth.visible = shot.place === 'earth';
      space.visible = shot.place === 'space';
      portrait.visible = shot.place === 'portrait';

      // The antenna: azimuth turns the whole upper structure, elevation tips the dish from straight up.
      if (azimuth) azimuth.rotation.y = -(shown.az * Math.PI) / 180;
      if (elevation) elevation.rotation.x = -((90 - shown.el) * Math.PI) / 180;
      predicted.visible = !!shot.targets || !!player || !!run;
      (predicted.material as THREE.MeshBasicMaterial).opacity = still ? 0.9 : 0.55 + 0.35 * Math.sin(time * 2.2);
      if (!still) probeRig.rotation.y = time * 0.02;

      const at = origin(shot.place);
      const t = still ? 0 : cueTime;
      if (turning) view.yaw = clamp(view.yaw + turning * dt * 1.3, -2.6, 2.6);
      wantLook.set(...shot.look).add(at);
      wantPos.set(...shot.pos).add(at);
      offset.copy(wantPos).sub(wantLook);
      spherical.setFromVector3(offset);
      spherical.theta += (shot.orbit ?? 0) * t + view.yaw;
      spherical.phi = clamp(spherical.phi - view.pitch, 0.08, 3.0);
      wantPos.copy(wantLook).add(offset.setFromSpherical(spherical));
      if (shot.place === 'earth' && wantPos.y < 2) wantPos.y = 2;
      if (shot.place === 'portrait' && !still) wantPos.z -= Math.min(30, t * 0.6);

      if (cut) {
        camPos.copy(wantPos);
        camLook.copy(wantLook);
        camFov = shot.fov;
        shiftNow = shot.shift ?? 0;
        cut = false;
      } else {
        camPos.set(damp(camPos.x, wantPos.x, 1.8, dt), damp(camPos.y, wantPos.y, 1.8, dt), damp(camPos.z, wantPos.z, 1.8, dt));
        camLook.set(damp(camLook.x, wantLook.x, 1.8, dt), damp(camLook.y, wantLook.y, 1.8, dt), damp(camLook.z, wantLook.z, 1.8, dt));
        camFov = damp(camFov, shot.fov, 2, dt);
        shiftNow = damp(shiftNow, shot.shift ?? 0, 2, dt);
      }
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook);
      camera.near = 0.5;
      camera.far = 80000;
      if (Math.abs(camera.fov - camFov) > 0.01) camera.fov = camFov;
      if (Math.abs(shiftNow) > 0.002) camera.setViewOffset(host.width, host.height, shiftNow * host.width, 0, host.width, host.height);
      else if (camera.view) camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },

    hotspot(name) {
      if (name === 'voyager') return predicted.position;
      if (name === 'planet') return planet.position;
      if (name === 'empty') return emptyAt;
      if (name === 'earth') return earthDot;
      return null;
    },

    act(name, arg) {
      if (name === 'fly') {
        const o = arg as { outcome?: OutcomeOf<'dsn'>; player?: boolean };
        controller.setCue('aim');
        if (o.player) {
          run = null;
          return new Promise<DsnEnd>((resolve) => {
            player = { done: resolve, held: 0 };
          });
        }
        const outcome = o.outcome ?? 'on-voyager';
        return new Promise<DsnEnd>((resolve) => {
          run = { from: point, to: POINTINGS[outcome], t: host.reduceMotion ? 0.999 : 0, held: 0, done: resolve, outcome };
        });
      }
      if (name === 'skip' && run) {
        run.t = 0.999;
        return;
      }
      if (name === 'slew' && player && !player.held) {
        const d = arg as { dx: number; dz: number };
        point = turn(point, d.dx * 9, -d.dz * 7);
        return;
      }
      if (name === 'fire' && player && !player.held) {
        player.held = 0.001;
        return;
      }
      if (name === 'reset') {
        run = null;
        player = null;
        point = POINT_START;
        return;
      }
      if (name === 'state') return { az: point.az, el: point.el, signal: signal(shown), want: VOYAGER, flying: !!player, listening: !!player?.held };
      return undefined;
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

  void tmp;
  controller.setCue('passage', true);
  return controller;
}

let glowTex: THREE.CanvasTexture | null = null;
/** A soft round point of light. */
function glow(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
