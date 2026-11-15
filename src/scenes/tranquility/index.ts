/**
 * Tranquility Base: the 3D set of E02 Apollo 11 (and the place the finale aims at).
 *
 * Light as it was on July 20, 1969: one hard Sun, 10.8 degrees above the eastern horizon; no air, so a black
 * sky and no haze; the Earth high in the west. The only fill light is sunlight bouncing off the ground.
 * There are no stars: with the surface this bright, neither eyes nor cameras could see them.
 *
 * Every cue of cues.json is one row of SHOTS. The flight is the pure simulation of src/sim/descent.ts,
 * flown either by the player's controls or by a scripted pilot.
 *
 * Frame: +x east (toward the Sun), +z south, +y up. Cameras stay on the sunlit side unless a shot wants a silhouette.
 */
import * as THREE from 'three';
import { loadTexture } from '../../three/assets';
import type { SceneHost, SetController, Tier } from '../../three/host';
import { clamp, damp } from '../../three/util';
import { controls, playerPilot } from '../../input/controls';
import { PILOTS, START, altitude, outcome, step as simStep, type DescentState, type Pilot } from '../../sim/descent';
import type { OutcomeOf } from '../../sim/outcomes';
import { SITE, trackZ } from '../../sim/tranquility';
import { buildEagle, buildFlag, buildLrrr, buildMarker, buildPsep } from './props';
import { buildTerrain, height } from './terrain';

type V3 = [number, number, number];
type Shot = {
  pos: V3;
  look: V3;
  fov?: number;
  /** Camera drift in metres per second: the slow push of a documentary. */
  drift?: V3;
  /** Slow orbit around the look point, radians per second. */
  orbit?: number;
  /** `pos` and `look` are relative to Eagle. */
  follow?: boolean;
  /** Slides the picture sideways, as a fraction of its width, to leave room for a panel. Positive moves the subject left. */
  shift?: number;
  eagle: 'hidden' | 'flying' | 'landed' | 'stage';
  flag?: 'up' | 'down';
  gear?: boolean;
  markers?: boolean;
  liftoff?: boolean;
};

const lrrr = SITE.lrrr;
const psep = SITE.psep;

const SHOTS: Record<string, Shot> = {
  passage: { pos: [560, 760, 520], look: [170, 0, 70], fov: 34, drift: [-9, -3, -4], eagle: 'hidden' },
  // From below, against the black sky, with the Earth above: no ground in frame, so no false sense of height.
  arrival: { pos: [14, -6.5, 7], look: [0, 3.6, 0], fov: 44, orbit: 0.02, follow: true, eagle: 'flying' },
  alarm: { pos: [10, -3.5, 9], look: [0, 3.8, 0], fov: 38, orbit: 0.025, follow: true, eagle: 'flying' },
  boulders: { pos: [86, 38, -8], look: [-300, -132, 6], fov: 52, follow: true, shift: -0.17, eagle: 'flying', markers: true },
  flight: { pos: [40, 17, -22], look: [-70, -36, 16], fov: 50, follow: true, eagle: 'flying' },
  touchdown: { pos: [15, 2.4, 16], look: [0, 3.2, 0], fov: 40, orbit: 0.02, follow: true, eagle: 'flying' },
  landed: { pos: [16, 1.7, 15], look: [0, 3.4, 0], fov: 40, drift: [-0.1, 0.01, -0.1], eagle: 'landed', flag: 'up' },
  discovery: { pos: [9.5, 1.8, 36.5], look: [0, 2.0, 10], fov: 42, drift: [-0.06, 0, -0.05], eagle: 'landed', flag: 'up', gear: true },
  stage: { pos: [9.5, 2.4, 8], look: [0, 2, 0], fov: 38, orbit: 0.03, eagle: 'landed', flag: 'up', gear: true },
  lrrr: { pos: [lrrr.x - 2.3, 1.45, lrrr.z + 1.7], look: [lrrr.x, 0.34, lrrr.z], fov: 34, orbit: 0.03, eagle: 'landed', flag: 'up', gear: true },
  psep: { pos: [psep.x + 3.1, 1.5, psep.z + 3.2], look: [psep.x, 0.42, psep.z], fov: 36, orbit: -0.03, eagle: 'landed', flag: 'up', gear: true },
  liftoff: { pos: [23, 2.2, 20], look: [0, 7, 0], fov: 46, eagle: 'landed', flag: 'up', gear: true, liftoff: true },
  desolation: { pos: [19, 2.4, 22], look: [0, 2.3, 0], fov: 40, drift: [0.2, 0.03, 0.25], eagle: 'stage', flag: 'down', gear: true },
  clew: { pos: [lrrr.x - 1.35, 0.95, lrrr.z + 1.0], look: [lrrr.x, 0.32, lrrr.z], fov: 32, orbit: 0.04, eagle: 'stage', flag: 'down', gear: true },
  status: { pos: [70, 620, 30.5], look: [70, 0, 30], fov: 38, drift: [0, -6, 0], eagle: 'stage', flag: 'down', gear: true },
  file: { pos: [11, 3.4, 11], look: [0, 1.9, 0], fov: 36, orbit: 0.12, shift: 0.2, eagle: 'stage', flag: 'down', gear: true },
};

/** Places the player can choose on the approach, in metres along the track (see src/sim/descent.ts PILOTS). */
const ZONES: Record<string, number> = { target: 640, search: 318, beyond: 0 };

const SUN_ELEVATION = (10.8 * Math.PI) / 180;
const toSun = new THREE.Vector3(Math.cos(SUN_ELEVATION), Math.sin(SUN_ELEVATION), -0.2).normalize();
/** The Earth, seen from 23.5 degrees east of the Moon's centre: high in the western sky. */
const toEarth = new THREE.Vector3(-Math.sin(0.41), Math.cos(0.41), 0.02).normalize();

/** How high the ascent stage climbs during the liftoff shot, metres. */
const ASCENT_RISE = 150;

/** How a flight ended: the outcome the puzzle understands, or null for a touchdown that was too hard (retry). */
export type FlightEnd = { state: DescentState; outcome: OutcomeOf<'descent'> | null };

export async function create(host: SceneHost): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1.15;

  // ---------- Light ----------
  const sun = new THREE.DirectionalLight(0xfff4e6, 6.2);
  sun.castShadow = host.tier !== 'low';
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.25;
  root.add(sun, sun.target);
  // Sunlight bounced by the ground is the only fill light on the Moon.
  root.add(new THREE.HemisphereLight(0x000000, 0xa39c90, 0.85));

  // ---------- World ----------
  const [terrain, eagle, earthMap] = await Promise.all([buildTerrain(), buildEagle(), loadTexture('tex/tex_earth_1k.webp')]);
  root.add(terrain);

  const eagleRig = new THREE.Group();
  // Eagle landed facing west, with the Sun behind it: the ladder was in shadow.
  eagle.root.rotation.y = -Math.PI / 2;
  eagleRig.add(eagle.root);
  root.add(eagleRig);

  const groundY = (x: number, z: number) => height(x, z);
  const lrrrMesh = buildLrrr(toEarth);
  lrrrMesh.position.set(lrrr.x, groundY(lrrr.x, lrrr.z), lrrr.z);
  const psepMesh = buildPsep();
  psepMesh.position.set(psep.x, groundY(psep.x, psep.z), psep.z);
  psepMesh.rotation.y = 0.5;
  const flag = buildFlag();
  flag.root.position.set(SITE.flag.x, groundY(SITE.flag.x, SITE.flag.z), SITE.flag.z);
  flag.root.rotation.y = 0.9;
  const gear = new THREE.Group();
  gear.add(lrrrMesh, psepMesh);
  root.add(gear, flag.root);

  const markers = new THREE.Group();
  const markerAt: Record<string, THREE.Vector3> = {};
  for (const [name, x] of Object.entries(ZONES)) {
    const z = trackZ(x);
    const m = buildMarker(name === 'beyond' ? 30 : 26, 0xffb648);
    (m.material as THREE.MeshBasicMaterial).depthTest = false;
    m.position.set(x, groundY(x, z) + 1, z);
    markers.add(m);
    markerAt[name] = m.position.clone();
  }
  root.add(markers);

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshLambertMaterial({ map: earthMap }));
  const EARTH_DISTANCE = 30000;
  // True angular size: the Earth is 1.9 degrees wide in the lunar sky.
  earth.scale.setScalar(EARTH_DISTANCE * Math.tan((0.95 * Math.PI) / 180));
  earth.rotation.set(0.3, 2.2, 0.1);
  root.add(earth);

  const sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true }));
  sunDisc.scale.setScalar(6500);
  root.add(sunDisc);

  // ---------- State ----------
  let cue = 'passage';
  let shot = SHOTS[cue];
  let cueTime = 0;
  let cut = true;
  let flight: { pilot: Pilot; state: DescentState; done?: (end: FlightEnd) => void; hold: number } | null = null;
  let rest: DescentState = START;
  /** States saved every few seconds of a player's flight, so a hard touchdown retries from a point nearby (FR-29a). */
  let trail: DescentState[] = [];
  let retryFrom: DescentState = START;
  /** 0 = Eagle whole, 1 = the ascent stage has left. */
  let lift = 0;
  let flagDown = 0;
  let shiftNow = 0;

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let camFov = 40;
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  const eaglePos = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const spherical = new THREE.Spherical();
  const spot = new THREE.Vector3();

  // ---------- Looking around (Explorer): drag to orbit, wheel to move closer ----------
  const view = { yaw: 0, pitch: 0, zoom: 1, dragging: false, x: 0, y: 0 };
  const el = host.canvas;
  const onDown = (e: PointerEvent) => {
    view.dragging = true;
    view.x = e.clientX;
    view.y = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!view.dragging) return;
    view.yaw = clamp(view.yaw - (e.clientX - view.x) * 0.005, -2.6, 2.6);
    view.pitch = clamp(view.pitch + (e.clientY - view.y) * 0.004, -0.5, 0.9);
    view.x = e.clientX;
    view.y = e.clientY;
  };
  const onUp = () => {
    view.dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    view.zoom = clamp(view.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.45, 2.2);
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });

  const flightState = () => flight?.state ?? rest;

  function placeEagle() {
    if (shot.eagle === 'flying') {
      const s = flightState();
      const z = trackZ(s.x);
      eaglePos.set(s.x, s.phase === 'flying' ? s.y : groundY(s.x, z), z);
      eagleRig.rotation.z = s.pitch;
      eagle.plume.visible = s.thrust > 0.02;
      (eagle.plume.material as THREE.MeshBasicMaterial).opacity = 0.025 + 0.045 * Math.min(1.6, s.thrust);
    } else {
      eaglePos.set(SITE.lm.x, groundY(SITE.lm.x, SITE.lm.z), SITE.lm.z);
      eagleRig.rotation.z = 0;
      eagle.plume.visible = false;
    }
    eagleRig.position.copy(eaglePos);
    eagleRig.visible = shot.eagle !== 'hidden';

    const gone = shot.eagle === 'stage' ? 1 : lift;
    eagle.ascent.visible = gone < 1;
    eagle.ascent.position.y = gone * gone * ASCENT_RISE;
    eagle.ascent.position.x = gone * gone * -24;

    gear.visible = !!shot.gear;
    flag.root.visible = !!shot.flag;
    const down = shot.flag === 'down' ? 1 : flagDown;
    flag.pivot.rotation.z = -down * 1.46;
    markers.visible = !!shot.markers;
  }

  const controller: SetController = {
    setCue(next, instant) {
      if (!SHOTS[next]) return;
      const same = next === cue;
      cue = next;
      shot = SHOTS[next];
      if (same && !instant) return;
      cueTime = 0;
      cut = !!instant || host.reduceMotion || cut;
      view.yaw = 0;
      view.pitch = 0;
      view.zoom = 1;
      if (shot.liftoff) {
        lift = host.reduceMotion ? 1 : 0;
        flagDown = host.reduceMotion ? 1 : 0;
      } else if (shot.eagle !== 'stage') {
        lift = 0;
        flagDown = 0;
      }
    },

    step(dt) {
      if (flight && flight.state.phase === 'flying') {
        const before = flight.state;
        flight.state = simStep(before, flight.pilot(before), dt);
        if (Math.floor(flight.state.t / 4) !== Math.floor(before.t / 4)) trail.push(before);
        if (flight.state.phase !== 'flying') {
          flight.hold = 1.4;
          // Go back about ten seconds, to a moment when there was still height to work with.
          retryFrom = [...trail].reverse().find((s) => s.t <= before.t - 9 && altitude(s) > 25) ?? START;
        }
      } else if (flight && flight.done) {
        flight.hold -= dt;
        if (flight.hold <= 0) {
          const done = flight.done;
          flight.done = undefined;
          host.timeScale = 1;
          done({ state: flight.state, outcome: outcome(flight.state) });
        }
      }
      if (shot.liftoff && cueTime > 1.6) {
        lift = Math.min(1, lift + dt / 11);
        flagDown = Math.min(1, flagDown + dt / 0.9);
      }
    },

    frame(dt) {
      cueTime += dt;
      placeEagle();

      // Where the camera wants to be.
      const still = host.reduceMotion;
      const t = still ? 0 : cueTime;
      wantLook.set(...shot.look);
      wantPos.set(...shot.pos);
      if (shot.drift && !still) {
        wantPos.x += shot.drift[0] * t;
        wantPos.y += shot.drift[1] * t;
        wantPos.z += shot.drift[2] * t;
      }
      if (shot.follow) {
        wantLook.add(eaglePos);
        wantPos.add(eaglePos);
      }
      // The camera tilts up to follow the ascent stage for a while, then lets it go.
      if (shot.liftoff) wantLook.y += Math.min(lift * lift * ASCENT_RISE * 0.75, 38);
      // Orbit: the documentary camera circles slowly; the player's drag adds to it.
      offset.copy(wantPos).sub(wantLook);
      spherical.setFromVector3(offset);
      spherical.theta += (shot.orbit ?? 0) * t + view.yaw;
      spherical.phi = clamp(spherical.phi - view.pitch, 0.08, 3.0);
      spherical.radius *= view.zoom;
      wantPos.copy(wantLook).add(offset.setFromSpherical(spherical));
      const floor = groundY(wantPos.x, wantPos.z) + 0.5;
      if (wantPos.y < floor) wantPos.y = floor;

      const wantFov = shot.fov ?? 40;
      if (cut) {
        camPos.copy(wantPos);
        camLook.copy(wantLook);
        camFov = wantFov;
        shiftNow = shot.shift ?? 0;
        cut = false;
      } else {
        // A followed subject is tracked tightly; a new place is approached slowly.
        const k = shot.follow ? 6 : 1.7;
        camPos.set(damp(camPos.x, wantPos.x, k, dt), damp(camPos.y, wantPos.y, k, dt), damp(camPos.z, wantPos.z, k, dt));
        camLook.set(damp(camLook.x, wantLook.x, k, dt), damp(camLook.y, wantLook.y, k, dt), damp(camLook.z, wantLook.z, k, dt));
        camFov = damp(camFov, wantFov, 2, dt);
        shiftNow = damp(shiftNow, shot.shift ?? 0, 2, dt);
      }
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      if (Math.abs(camera.fov - camFov) > 0.01) camera.fov = camFov;
      if (Math.abs(shiftNow) > 0.002) camera.setViewOffset(host.width, host.height, shiftNow * host.width, 0, host.width, host.height);
      else if (camera.view) camera.clearViewOffset();
      camera.updateProjectionMatrix();

      // The sky is infinitely far: it moves with the camera.
      earth.position.copy(camPos).addScaledVector(toEarth, EARTH_DISTANCE);
      sunDisc.position.copy(camPos).addScaledVector(toSun, 42000);
      // Shadows follow whatever the shot is about.
      const focus = shot.eagle === 'hidden' ? camLook : eaglePos;
      sun.target.position.copy(focus);
      sun.position.copy(focus).addScaledVector(toSun, 420);
    },

    hotspot(name) {
      if (markerAt[name]) return markerAt[name];
      if (name === 'stage') return spot.set(SITE.lm.x, 2.2, SITE.lm.z);
      if (name === 'lrrr') return spot.set(lrrr.x, 0.5, lrrr.z);
      if (name === 'psep') return spot.set(psep.x, 0.6, psep.z);
      if (name === 'flag') return spot.set(SITE.flag.x, 1.6, SITE.flag.z);
      return null;
    },

    act(name, arg) {
      if (name === 'fly') {
        const o = arg as { outcome?: OutcomeOf<'descent'>; player?: boolean; retry?: boolean; speed?: number };
        const pilot = o.player ? playerPilot : PILOTS[o.outcome ?? 'landed-safe'];
        // A scripted flight may be shown faster, and is skipped with reduced motion. The player always flies in real time.
        host.timeScale = o.player || host.reduceMotion ? 1 : (o.speed ?? 1);
        controller.setCue('flight');
        if (o.player) controls.reset();
        trail = [];
        return new Promise<FlightEnd>((resolve) => {
          flight = { pilot, state: o.player && o.retry ? retryFrom : START, done: resolve, hold: 0 };
          if (host.reduceMotion && !o.player) controller.act!('skip');
        });
      }
      if (name === 'skip' && flight) {
        while (flight.state.phase === 'flying') flight.state = simStep(flight.state, flight.pilot(flight.state));
        flight.hold = 0.6;
        host.timeScale = 1;
        return;
      }
      if (name === 'reset') {
        flight = null;
        rest = START;
        host.timeScale = 1;
        return;
      }
      if (name === 'state') {
        const s = flightState();
        return { ...s, agl: altitude(s), flying: !!flight && flight.state.phase === 'flying' };
      }
      return undefined;
    },

    onTier(tier: Tier) {
      sun.castShadow = tier !== 'low';
    },

    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      camera.clearViewOffset();
      scene.remove(root);
    },
  };

  controller.setCue('passage', true);
  return controller;
}

/** The Sun: a small hard disc, half a degree wide, and the glare around it. */
function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.05, 'rgba(255,253,245,1)');
  grad.addColorStop(0.09, 'rgba(255,244,220,0.55)');
  grad.addColorStop(0.3, 'rgba(255,236,200,0.14)');
  grad.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
