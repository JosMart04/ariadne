/**
 * Meridiani Planum: the 3D set of E08, Opportunity.
 *
 * One place, by day: a plain of dark sand, a crater with a bright rim, and the rover (NASA's official model, at its
 * real size). The ground is built from `height` in src/sim/meridiani.ts and its shadows are baked from `shadowed`,
 * so what the player sees is what the simulation judges. It is a reconstruction, and the set says so on screen.
 *
 * Operational fidelity (FR-60, FR-62): nobody drives the rover. An operator on Earth places a waypoint and sends one
 * sequence. Then three things happen, each with its name on screen: the command travels, the rover drives on its own,
 * the telemetry travels back. The waits are compressed and can be skipped; the outcome is fixed when the sequence is sent.
 * No human ever appears here. The dust storm is an event the player watches: there is no control for it.
 */
import * as THREE from 'three';
import { loadModel } from '../../three/assets';
import type { SceneHost, SetController, Tier } from '../../three/host';
import { clamp, damp, lerp, noise2, rng } from '../../three/util';
import { CRATER, NEED, PLAN_START, ROVER_START, SPOTS, TO_SUN, distance, height, lightMinutes, move, normal, park, shadowed, sunlight, tiltToSun, type Spot } from '../../sim/meridiani';
import type { OutcomeOf } from '../../sim/outcomes';

type V3 = [number, number, number];
/** `follow`: `pos` and `look` are measured from the rover. `dust`: 0 clear sky, 1 the storm of June 2018. */
type Shot = { pos: V3; look: V3; fov: number; follow?: boolean; orbit?: number; shift?: number; targets?: boolean; dust?: number; near?: number; mast?: boolean };

/** Where the rover is on sol 1, about 100 m from where it plans the winter. */
const SOL1: Spot = { x: 95, z: 85 };
const ROCK: Spot = { x: SOL1.x + 3.1, z: SOL1.z + 3.1 };
/** Where the rover stops to study the rock: an arm's length from it. */
const AT_ROCK: Spot = { x: SOL1.x + 1.7, z: SOL1.z + 1.7 };
/** The place the sol-1 drive is aimed at, as a target in the scene. */
const AHEAD: Spot = { x: SOL1.x - 8, z: SOL1.z - 16 };

const SHOTS: Record<string, Shot> = {
  passage: { pos: [SOL1.x - 14, 2.2, SOL1.z - 20], look: [SOL1.x + 1.5, 2.6, SOL1.z - 6], fov: 36, orbit: 0.006 },
  arrival: { follow: true, pos: [5.6, 1.9, 4.4], look: [0, 0.75, 0], fov: 36, orbit: 0.03 },
  sol1: { follow: true, pos: [-5.5, 5.6, 13.5], look: [-1.2, 0.2, -2.5], fov: 44, targets: true },
  drive: { follow: true, pos: [7.5, 2.6, -3.5], look: [0, 0.7, 0], fov: 40 },
  science: { follow: true, pos: [-1.6, 1.15, 4.6], look: [0.9, 0.35, 0.8], fov: 36 },
  rest: { follow: true, pos: [-4.4, 1.3, 5.2], look: [0, 0.8, 0], fov: 36, orbit: 0.012 },
  wind: { follow: true, pos: [-7, 2.6, 9.5], look: [-2.5, 2.2, 0], fov: 42 },
  plan: { pos: [-138, 96, -8], look: [-14, -4, -63], fov: 37, targets: true },
  parked: { follow: true, pos: [5.4, 2.3, 6.2], look: [0, 0.7, 0], fov: 38, orbit: 0.012 },
  storm: { follow: true, mast: true, pos: [0, 1.55, 0], look: [0, 0, 0], fov: 52, dust: 1 },
  dark: { follow: true, pos: [5.2, 1.5, 6.4], look: [0, 0.8, 0], fov: 38, dust: 1 },
  berries: { pos: [ROCK.x - 0.3, 0.2, ROCK.z - 0.55], look: [ROCK.x + 0.05, 0.04, ROCK.z + 0.1], fov: 30, near: 0.02 },
  rim: { pos: [70, 9, -22], look: [-4, -5, -78], fov: 44, orbit: 0.01 },
  clew: { follow: true, pos: [-20, 5, 28], look: [0, 1.5, 0], fov: 30, dust: 0.6, orbit: 0.01 },
  status: { follow: true, pos: [4.4, 1.9, 5.4], look: [0, 0.75, 0], fov: 36, dust: 0.16, orbit: -0.02 },
  file: { follow: true, pos: [3.6, 1.7, 4.3], look: [0, 0.7, 0], fov: 36, orbit: 0.14, shift: 0.2 },
};

/** Cues that put the rover on its sol-1 site, on its planning site, or leave it where the last sequence sent it. */
const AT_SOL1 = new Set(['passage', 'arrival', 'sol1', 'science', 'rest', 'berries']);
const AT_PLAN = new Set(['plan']);
/** After the winter plan, the rover is on its slope: where the storm finds it, and where it rests today. */
const AT_HAVEN = new Set(['storm', 'dark', 'clew', 'status']);
/** Dust lies on the solar panels in these cues; in every other one they are clean. */
const DUSTY = new Set(['rest', 'storm', 'dark', 'clew', 'status']);

/** Presentation seconds of each phase of a sequence. The real waits are minutes: the set is labelled "Time compressed". */
const SUNLIGHT = 4.6;
const SKYLIGHT = 0.62;
const UPLINK = 3.4;
const DOWNLINK = 3.0;

export type PlanEnd = { outcome: OutcomeOf<'traverse'> | null; cancelled?: boolean };
type Phase = 'uplink' | 'drive' | 'downlink';
type Run = { phase: Phase; t: number; to: Spot; outcome: OutcomeOf<'traverse'>; done?: (e: PlanEnd) => void; rate: number };

export async function create(host: SceneHost): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1.0;
  const seeded = rng(2004_01_25);
  const toSun = new THREE.Vector3(...TO_SUN);

  const roverFile = await loadModel('mdl_mer_b.glb');

  // ---------- Sky, haze and light: all of them follow one number, the dust in the air ----------
  const SKY = { top: new THREE.Color(0x7d5b3e), horizon: new THREE.Color(0xcfa77c), stormTop: new THREE.Color(0x100905), stormHorizon: new THREE.Color(0x2a1a0f) };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTop: { value: SKY.top.clone() }, uHorizon: { value: SKY.horizon.clone() }, uSun: { value: toSun.clone() }, uGlow: { value: 1 }, uDisc: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform float uGlow; uniform float uDisc; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = mix(uHorizon, uTop, pow(clamp(d.y, 0.0, 1.0), 0.5));
        if (d.y < 0.0) c = uHorizon;
        float s = max(dot(d, uSun), 0.0);
        // On Mars the sky near the Sun is pale and bluish: the dust scatters blue light forward.
        c += vec3(0.78, 0.86, 1.0) * (pow(s, 2600.0) * 7.0 * uDisc + (pow(s, 120.0) * 0.3 + pow(s, 10.0) * 0.045) * uGlow);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  root.add(sky);
  const fog = new THREE.FogExp2(SKY.horizon.getHex(), 0.0014);
  scene.fog = fog;
  scene.background = SKY.horizon.clone();

  const sun = new THREE.DirectionalLight(0xfff0dc, SUNLIGHT);
  sun.castShadow = host.tier !== 'low';
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  sun.shadow.camera.near = 5;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.04;
  const skylight = new THREE.HemisphereLight(0xe6c8a4, 0x4a2f20, SKYLIGHT);
  root.add(sun, sun.target, skylight);

  // ---------- The ground: the simulation's own heights, with its own shadows baked in ----------
  const SIZE = 640;
  const SEG = 256;
  const groundGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  groundGeo.rotateX(-Math.PI / 2);
  groundGeo.translate(20, 0, -10);
  const gp = groundGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(gp.count * 3);
  const sand = new THREE.Color(0x6e4a34);
  const sandDark = new THREE.Color(0x543726);
  const rock = new THREE.Color(0xcaa884);
  const c = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i);
    const z = gp.getZ(i);
    gp.setY(i, height(x, z));
    const r = Math.hypot(x - CRATER.x, z - CRATER.z);
    // Bare, pale rock on the rim and the walls; sand on the plain and on the crater floor.
    const bare = clamp(1 - Math.abs(r - CRATER.r + 6) / 22, 0, 1) * (0.65 + 0.35 * noise2(x * 0.3, z * 0.3, 5));
    const streak = noise2(x * 0.05, z * 0.22, 9);
    c.copy(sand).lerp(sandDark, streak * 0.8).lerp(rock, bare * 0.9);
    const grain = 0.9 + 0.2 * noise2(x * 1.7, z * 1.7, 3);
    // Only places near the crater can be in its shadow.
    const dark = r < CRATER.r + 30 && shadowed({ x, z }) ? 0.3 : 1;
    colors.set([c.r * grain * dark, c.g * grain * dark, c.b * grain * dark * (dark < 1 ? 1.12 : 1)], i * 3);
  }
  groundGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  ground.receiveShadow = true;
  root.add(ground);
  // Beyond the modelled ground the plain goes on to the horizon, as flat as the real Meridiani.
  // It is a ring, so it never covers the crater, whose floor lies below the plain.
  const far = new THREE.Mesh(new THREE.RingGeometry(300, 9000, 64), new THREE.MeshStandardMaterial({ color: 0x61412e, roughness: 1 }));
  far.rotation.x = -Math.PI / 2;
  far.position.set(20, -0.35, -10);
  root.add(far);

  const at = (p: Spot, lift = 0) => new THREE.Vector3(p.x, height(p.x, p.z) + lift, p.z);

  // ---------- A pale rock and the "blueberries": tiny gray spheres, a few millimetres wide ----------
  const rocks = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xc9ab8a, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const slab = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + seeded() * 0.3, 0), rockMat);
    slab.position.set(ROCK.x + (seeded() - 0.5) * 1.5, height(ROCK.x, ROCK.z) + 0.01, ROCK.z + (seeded() - 0.5) * 1.5);
    slab.scale.set(1.5, 0.18 + seeded() * 0.14, 1.2);
    slab.rotation.y = seeded() * 6;
    slab.castShadow = slab.receiveShadow = true;
    rocks.add(slab);
  }
  root.add(rocks);
  const berryCount = Math.round(900 * host.budget);
  const berries = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 8, 6), new THREE.MeshStandardMaterial({ color: 0x70757c, roughness: 0.55, metalness: 0.2 }), berryCount);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < berryCount; i++) {
    const a = seeded() * Math.PI * 2;
    const d = Math.pow(seeded(), 0.7) * 1.1;
    const x = ROCK.x + Math.cos(a) * d;
    const z = ROCK.z + Math.sin(a) * d;
    const s = 0.7 + seeded() * 0.9;
    m4.makeScale(s, s, s).setPosition(x, height(x, z) + 0.004 * s + (d < 0.5 ? 0.045 * seeded() : 0), z);
    berries.setMatrixAt(i, m4);
  }
  berries.castShadow = true;
  root.add(berries);

  // ---------- The rover: NASA's model, 2.3 m across its solar panels ----------
  const model = roverFile.scene;
  // NASA's model looks along its own +z. Our headings look along -z.
  model.rotation.y = Math.PI;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  model.scale.multiplyScalar(2.3 / Math.max(size.x, size.z));
  box.setFromObject(model);
  const mid = box.getCenter(new THREE.Vector3());
  model.position.x -= mid.x;
  model.position.z -= mid.z;
  model.position.y -= box.min.y;
  const mats: { panels?: THREE.MeshStandardMaterial } = {};
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (mat.name === 'SolarArrays') mats.panels = mat as THREE.MeshStandardMaterial;
  });
  const panelClean = new THREE.Color(0x24244b);
  const panelDusty = new THREE.Color(0x8d6c4e);
  const rig = new THREE.Group();
  rig.add(model);
  root.add(rig);

  // ---------- Wheel tracks ----------
  const TRACKS = 1400;
  const tracks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, 0.62).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x3a2518, transparent: true, opacity: 0.4, depthWrite: false }), TRACKS);
  tracks.count = 0;
  tracks.frustumCulled = false;
  root.add(tracks);
  let trackAt = 0;
  let sinceTrack = 0;
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const layTracks = (p: Spot, yaw: number) => {
    for (const side of [-0.61, 0.61]) {
      const x = p.x + Math.cos(yaw) * side;
      const z = p.z + Math.sin(yaw) * side;
      m4.makeRotationFromQuaternion(q.setFromAxisAngle(up, -yaw)).setPosition(x, height(x, z) + 0.025, z);
      tracks.setMatrixAt(trackAt % TRACKS, m4);
      trackAt++;
    }
    tracks.count = Math.min(trackAt, TRACKS);
    tracks.instanceMatrix.needsUpdate = true;
  };

  // ---------- The waypoint and the planned route ----------
  const gold = new THREE.MeshBasicMaterial({ color: 0xffc35a, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 48).rotateX(-Math.PI / 2), gold);
  ring.renderOrder = 5;
  root.add(ring);
  const here = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.9, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false }));
  here.renderOrder = 5;
  root.add(here);
  const ROUTE = 40;
  const routeGeo = new THREE.BufferGeometry();
  routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ROUTE * 3), 3));
  const route = new THREE.Line(routeGeo, new THREE.LineDashedMaterial({ color: 0xffc35a, dashSize: 2.2, gapSize: 1.6, transparent: true, opacity: 0.9, depthTest: false }));
  route.renderOrder = 5;
  route.frustumCulled = false;
  root.add(route);

  // ---------- The whirlwind that cleaned the panels ----------
  const DEVIL = Math.round(260 * host.budget);
  const devilGeo = new THREE.BufferGeometry();
  const devilSeed = new Float32Array(DEVIL * 3);
  for (let i = 0; i < DEVIL; i++) devilSeed.set([seeded(), seeded() * Math.PI * 2, 0.6 + seeded() * 0.8], i * 3);
  devilGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DEVIL * 3), 3));
  const devil = new THREE.Points(devilGeo, new THREE.PointsMaterial({ map: glow(), color: 0xd9b993, size: 3.4, sizeAttenuation: true, transparent: true, opacity: 0.22, depthWrite: false }));
  devil.frustumCulled = false;
  devil.visible = false;
  root.add(devil);

  // ---------- State ----------
  let cue = 'passage';
  let shot = SHOTS[cue];
  let cueTime = 0;
  let cut = true;
  const rover = { x: SOL1.x, z: SOL1.z, yaw: 2.2, goal: null as Spot | null, speed: 0 };
  let waypoint: Spot = PLAN_START;
  let run: Run | null = null;
  let player: { done: (e: PlanEnd) => void } | null = null;
  /** 0 clear, 1 the storm. It moves toward what the cue asks for. */
  let dust = 0;
  /** 0 clean panels, 1 covered. */
  let grime = 0;
  let windT = 0;
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let camFov = 40;
  let shiftNow = 0;
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const side = new THREE.Vector3();
  const basis = new THREE.Matrix4();

  const place = (p: Spot, yaw: number) => {
    rover.x = p.x;
    rover.z = p.z;
    rover.yaw = yaw;
    rover.goal = null;
  };
  /** Heading that makes the rover face a place. Yaw 0 looks along -z (north); it grows clockwise seen from above. */
  const facing = (from: Spot, to: Spot) => Math.atan2(to.x - from.x, -(to.z - from.z));
  const settle = (e: PlanEnd) => {
    const r = run;
    run = null;
    const p = player;
    player = null;
    r?.done?.(e);
    if (p && p.done !== r?.done) p.done(e);
  };

  // ---------- Looking around, and moving the waypoint ----------
  const view = { yaw: 0, pitch: 0, dragging: false, x: 0, y: 0 };
  const el = host.canvas;
  /** Moves the waypoint in the directions of the screen: right is right, up is away from the camera. */
  const nudge = (right: number, away: number) => {
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
    side.set(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
    waypoint = move(waypoint, side.x * right + fwd.x * away, side.z * right + fwd.z * away);
  };
  const planning = () => !!player && !run;
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
    // At the planning station, dragging moves the waypoint. Anywhere else it turns the camera.
    if (planning()) nudge(dx * 0.3, -dy * 0.42);
    else if (!player) {
      view.yaw = clamp(view.yaw - dx * 0.005, -2.6, 2.6);
      view.pitch = clamp(view.pitch + dy * 0.004, -0.5, 0.7);
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
    turning = [...held].reduce((sum, key) => sum + TURN[key], 0);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (held.delete(e.key.toLowerCase())) turning = [...held].reduce((sum, key) => sum + TURN[key], 0);
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
      const before = shot;
      cue = next;
      shot = SHOTS[next];
      if (same && !instant) return;
      cueTime = 0;
      view.yaw = 0;
      view.pitch = 0;
      // A change of place or of scale is a cut, like a film; so is anything with reduced motion.
      cut = !!instant || host.reduceMotion || !!before.follow !== !!shot.follow || !!before.mast !== !!shot.mast || !!before.near !== !!shot.near || cut;
      if (!run && !player) {
        if (AT_SOL1.has(next) && Math.hypot(rover.x - SOL1.x, rover.z - SOL1.z) > 8) {
          place(SOL1, facing(SOL1, ROCK));
          cut = true;
        }
        if (AT_PLAN.has(next) && Math.hypot(rover.x - ROVER_START.x, rover.z - ROVER_START.z) > 1) {
          place(ROVER_START, facing(ROVER_START, CRATER));
          cut = true;
        }
        const haven = SPOTS['on-slope'];
        if (AT_HAVEN.has(next) && Math.hypot(rover.x - haven.x, rover.z - haven.z) > 1) {
          place(haven, facing(ROVER_START, haven));
          cut = true;
        }
        if (next === 'science' && !host.reduceMotion) {
          rover.goal = AT_ROCK;
          rover.speed = 0.7;
        }
        if (next === 'drive') {
          // Sol 1, "Drive": about 100 m across the plain, to where the winter will be planned.
          if (host.reduceMotion) place(ROVER_START, facing(SOL1, ROVER_START));
          else {
            rover.goal = ROVER_START;
            rover.speed = 9;
          }
        }
      }
      if (next === 'wind') windT = host.reduceMotion ? 1 : 0;
      if (instant || host.reduceMotion) {
        dust = shot.dust ?? 0;
        grime = DUSTY.has(next) ? 1 : 0;
      }
    },

    step(dt) {
      // The rover drives on its own toward wherever the sequence sent it.
      if (rover.goal) {
        const dx = rover.goal.x - rover.x;
        const dz = rover.goal.z - rover.z;
        const d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, -dz);
        let turn = want - rover.yaw;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        rover.yaw += clamp(turn, -2.2 * dt, 2.2 * dt);
        const go = Math.min(d, rover.speed * dt * (Math.abs(turn) > 0.5 ? 0.25 : 1));
        if (d < 0.05) {
          rover.x = rover.goal.x;
          rover.z = rover.goal.z;
          rover.goal = null;
        } else {
          rover.x += (dx / d) * go;
          rover.z += (dz / d) * go;
          sinceTrack += go;
          if (sinceTrack > 0.45) {
            sinceTrack = 0;
            layTracks(rover, rover.yaw);
          }
        }
      }

      if (run) {
        run.t += dt * run.rate;
        if (run.phase === 'uplink' && run.t >= UPLINK) {
          run.phase = 'drive';
          run.t = 0;
          if (host.reduceMotion) place(run.to, facing(rover, run.to));
          // (with reduced motion the rover is simply shown where the sequence sent it)
          else {
            rover.goal = run.to;
            rover.speed = Math.max(9, Math.hypot(run.to.x - rover.x, run.to.z - rover.z) / 5.5) * run.rate;
          }
        } else if (run.phase === 'drive' && !rover.goal) {
          run.phase = 'downlink';
          run.t = 0;
        } else if (run.phase === 'downlink' && run.t >= DOWNLINK) settle({ outcome: run.outcome });
      }

      // Dust in the air and on the panels moves toward what the cue asks for. The storm takes its time.
      const wantDust = shot.dust ?? 0;
      dust += clamp(wantDust - dust, -dt / 2.5, dt / (cue === 'storm' ? 9 : 3));
      if (cue === 'wind') {
        windT = Math.min(1, windT + dt / 9);
        grime = windT < 0.5 ? 1 : Math.max(0, 1 - (windT - 0.5) * 6);
      } else grime += clamp((DUSTY.has(cue) ? 1 : 0) - grime, -dt / 1.5, dt / 1.5);
    },

    frame(dt, time) {
      cueTime += dt;
      const still = host.reduceMotion;

      // Sky, haze and light.
      const k = clamp(dust, 0, 1);
      (skyMat.uniforms.uTop.value as THREE.Color).copy(SKY.top).lerp(SKY.stormTop, k);
      (skyMat.uniforms.uHorizon.value as THREE.Color).copy(SKY.horizon).lerp(SKY.stormHorizon, k);
      // Sunlight falls off quickly with dust: at tau 10.8 almost none of the direct beam is left.
      const beam = Math.exp(-k * 7);
      skyMat.uniforms.uGlow.value = beam;
      // NASA's last pictures from the rover still show the Sun, as a faint dot.
      skyMat.uniforms.uDisc.value = lerp(1, 0.035, k);
      fog.color.copy(skyMat.uniforms.uHorizon.value as THREE.Color);
      (scene.background as THREE.Color).copy(fog.color);
      fog.density = lerp(0.0014, 0.028, k * k);
      sun.intensity = SUNLIGHT * beam;
      skylight.intensity = lerp(SKYLIGHT, 0.14, k);
      sky.position.copy(camera.position);

      // The rover stands on the ground and leans with it.
      const y = height(rover.x, rover.z);
      const nn = normal(rover.x, rover.z);
      n.set(nn[0], nn[1], nn[2]);
      fwd.set(Math.sin(rover.yaw), 0, -Math.cos(rover.yaw));
      side.crossVectors(fwd, n).normalize();
      fwd.crossVectors(n, side).normalize();
      basis.makeBasis(side, n, v.copy(fwd).negate());
      rig.quaternion.setFromRotationMatrix(basis);
      rig.position.set(rover.x, y, rover.z);
      sun.target.position.copy(rig.position);
      sun.position.copy(rig.position).addScaledVector(toSun, 60);
      mats.panels?.color.copy(panelClean).lerp(panelDusty, grime);

      // Waypoint and route, while a sol is being planned or carried out.
      const showPlan = (!!player || !!run || cue === 'plan') && !!shot.targets;
      ring.visible = route.visible = showPlan && (!!player || !!run);
      here.visible = cue === 'plan';
      here.position.set(rover.x, y + 0.3, rover.z);
      if (ring.visible) {
        ring.position.copy(at(waypoint, 0.25));
        ring.scale.setScalar(still || run ? 1 : 1 + 0.07 * Math.sin(time * 3));
        const rp = routeGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < ROUTE; i++) {
          const f = i / (ROUTE - 1);
          const x = lerp(rover.x, waypoint.x, f);
          const z = lerp(rover.z, waypoint.z, f);
          rp.setXYZ(i, x, height(x, z) + 0.3, z);
        }
        rp.needsUpdate = true;
        route.computeLineDistances();
      }

      // The whirlwind crosses the plain and passes over the rover.
      devil.visible = cue === 'wind' && (!still || windT < 1) && windT > 0 && windT < 1;
      if (devil.visible) {
        const cx = rover.x + lerp(-70, 70, windT);
        const cz = rover.z + lerp(26, -22, windT);
        const dp = devilGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < DEVIL; i++) {
          const h = devilSeed[i * 3];
          const a = devilSeed[i * 3 + 1] + time * (0.9 - h * 0.5);
          const r = (3 + h * 16) * devilSeed[i * 3 + 2];
          dp.setXYZ(i, cx + Math.cos(a) * r * 1.6, y + 0.3 + h * h * 9 + Math.sin(a * 2 + h * 9) * 0.6, cz + Math.sin(a) * r);
        }
        dp.needsUpdate = true;
      }

      // Camera.
      const t = still ? 0 : cueTime;
      if (turning) view.yaw = clamp(view.yaw + turning * dt * 1.3, -2.6, 2.6);
      const base = shot.follow ? rig.position : v.set(0, 0, 0);
      wantLook.set(...shot.look).add(base);
      wantPos.set(...shot.pos).add(base);
      if (shot.mast) {
        // Through the rover's own camera mast, toward the Sun. A step forward keeps the deck out of the picture.
        wantPos.addScaledVector(toSun, 1.4).setY(y + shot.pos[1]);
        wantLook.copy(wantPos).addScaledVector(toSun, 100);
        wantLook.y -= 14;
      }
      offset.copy(wantPos).sub(wantLook);
      spherical.setFromVector3(offset);
      spherical.theta += (shot.orbit ?? 0) * t + (shot.mast ? -view.yaw : view.yaw);
      spherical.phi = clamp(spherical.phi - view.pitch, 0.08, 3.0);
      if (shot.mast) wantLook.copy(wantPos).sub(offset.setFromSpherical(spherical));
      else wantPos.copy(wantLook).add(offset.setFromSpherical(spherical));
      const floor = height(wantPos.x, wantPos.z) + (shot.near ? 0.06 : 0.5);
      if (wantPos.y < floor) wantPos.y = floor;

      if (cut) {
        camPos.copy(wantPos);
        camLook.copy(wantLook);
        camFov = shot.fov;
        shiftNow = shot.shift ?? 0;
        cut = false;
      } else {
        // A camera that rides with the rover keeps up with it; the others move like a crane.
        const s = shot.follow ? 5 : 1.8;
        camPos.set(damp(camPos.x, wantPos.x, s, dt), damp(camPos.y, wantPos.y, s, dt), damp(camPos.z, wantPos.z, s, dt));
        camLook.set(damp(camLook.x, wantLook.x, s, dt), damp(camLook.y, wantLook.y, s, dt), damp(camLook.z, wantLook.z, s, dt));
        camFov = damp(camFov, shot.fov, 2, dt);
        shiftNow = damp(shiftNow, shot.shift ?? 0, 2, dt);
      }
      camera.position.copy(camPos);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook);
      camera.near = shot.near ?? 0.3;
      camera.far = 30000;
      if (Math.abs(camera.fov - camFov) > 0.01) camera.fov = camFov;
      if (Math.abs(shiftNow) > 0.002) camera.setViewOffset(host.width, host.height, shiftNow * host.width, 0, host.width, host.height);
      else if (camera.view) camera.clearViewOffset();
      camera.updateProjectionMatrix();
    },

    hotspot(name) {
      if (name === 'slope') return at(SPOTS['on-slope'], 1);
      if (name === 'flat') return at(SPOTS['on-flat'], 1);
      if (name === 'shadow') return at(SPOTS['in-shadow'], 1);
      if (name === 'plain') return at(AHEAD, 0.5);
      if (name === 'rock') return at(ROCK, 0.3);
      if (name === 'waypoint') return at(waypoint, 1);
      if (name === 'rover') return v.copy(rig.position).setY(rig.position.y + 1.4).clone();
      return null;
    },

    act(name, arg) {
      if (name === 'fly') {
        const o = arg as { outcome?: OutcomeOf<'traverse'>; player?: boolean; speed?: number };
        settle({ outcome: null, cancelled: true });
        place(ROVER_START, facing(ROVER_START, CRATER));
        controller.setCue('plan');
        if (o.player) {
          waypoint = PLAN_START;
          return new Promise<PlanEnd>((resolve) => {
            player = { done: resolve };
          });
        }
        const outcome = o.outcome ?? 'on-slope';
        waypoint = SPOTS[outcome];
        return new Promise<PlanEnd>((resolve) => {
          run = { phase: 'uplink', t: 0, to: waypoint, outcome, done: resolve, rate: host.reduceMotion ? 4 : (o.speed ?? 1) > 1 ? 1.5 : 1 };
        });
      }
      if (name === 'skip' && run) {
        // Skipping only shortens the show. Where the rover ends, and what that means, were fixed when the sequence left.
        place(run.to, Math.hypot(run.to.x - rover.x, run.to.z - rover.z) > 0.5 ? facing(rover, run.to) : rover.yaw);
        settle({ outcome: run.outcome });
        return;
      }
      if (name === 'slew' && planning()) {
        const d = arg as { dx: number; dz: number };
        nudge(d.dx * 26, -d.dz * 26);
        return;
      }
      if (name === 'fire' && planning() && player) {
        // The sequence leaves the Earth. From here on the waypoint cannot change.
        run = { phase: 'uplink', t: 0, to: waypoint, outcome: park(waypoint), done: player.done, rate: host.reduceMotion ? 4 : 1 };
        return;
      }
      if (name === 'reset') {
        settle({ outcome: null, cancelled: true });
        waypoint = PLAN_START;
        return;
      }
      if (name === 'state') {
        const phase = run?.phase ?? (player ? 'plan' : 'idle');
        const length = run ? (run.phase === 'uplink' ? UPLINK : run.phase === 'downlink' ? DOWNLINK : 0) : 0;
        return {
          phase,
          /** 0 to 1 through the current wait; the drive reports how far the rover has come. */
          progress: run ? (length ? clamp(run.t / length, 0, 1) : clamp(1 - Math.hypot(run.to.x - rover.x, run.to.z - rover.z) / Math.max(1, distance(run.to)), 0, 1)) : 0,
          distance: distance(waypoint),
          tilt: tiltToSun(waypoint),
          light: sunlight(waypoint),
          need: NEED,
          shadow: shadowed(waypoint),
          enough: park(waypoint) === 'on-slope',
          minutes: lightMinutes(Date.now()),
          tau: 1 + (10.8 - 1) * clamp(dust, 0, 1),
          flying: !!player,
        };
      }
      return undefined;
    },

    onTier(tier: Tier) {
      sun.castShadow = tier !== 'low';
    },

    dispose() {
      settle({ outcome: null, cancelled: true });
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      camera.clearViewOffset();
      camera.up.set(0, 1, 0);
      scene.fog = null;
      scene.remove(root);
    },
  };

  place(SOL1, facing(SOL1, ROCK));
  controller.setCue('passage', true);
  return controller;
}

let glowTex: THREE.CanvasTexture | null = null;
/** A soft round puff. */
function glow(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
