/**
 * The telescope of Knossos Station: the set of the finale (and of the prologue's midnight pulse).
 *
 * Three places share one camera:
 *  - `sky`  the night sky above the station: stars, Mars, a satellite, and the Moon at its true size and in
 *           tonight's phase. The telescope "zooms" the honest way, by narrowing the field of view.
 *  - `map`  the aiming map: the real, untouched orbital photograph of Tranquility Base (PIA12925).
 *           A telescope on Earth cannot see Apollo hardware; stations aim by coordinates. The map says what it is.
 *  - `beam` the Earth and the Moon, not to scale, with the light crossing in real time: 1.28 s out, 1.28 s back.
 *
 * The station itself is fiction and is drawn as fiction: dark shapes with amber edges, like its console.
 * The aiming logic is src/sim/ranging.ts.
 */
import * as THREE from 'three';
import { loadTexture } from '../../three/assets';
import type { SceneHost, SetController } from '../../three/host';
import { clamp, damp, rng } from '../../three/util';
import type { OutcomeOf } from '../../sim/outcomes';
import { AIMS, AIM_SITE, AIM_START, MAX_ZOOM, ROUND_TRIP, judge, slew, zoomTo, type Aim } from '../../sim/ranging';
import { ORTHO_BOUNDS, SITE } from '../../sim/tranquility';

type Place = 'sky' | 'map' | 'beam';
type Shot = {
  place: Place;
  /** Sky shots: what the camera looks at, and how wide. */
  look?: 'wide' | 'moon';
  fov: number;
  /** Field of view the shot slowly moves to, degrees. */
  fovTo?: number;
  targets?: boolean;
  marker?: boolean;
  pulse?: boolean;
  dim?: boolean;
};

const SHOTS: Record<string, Shot> = {
  sky: { place: 'sky', look: 'wide', fov: 54 },
  where: { place: 'sky', look: 'wide', fov: 54, targets: true },
  moon: { place: 'sky', look: 'moon', fov: 0.95 },
  aim: { place: 'map', fov: 40 },
  beam: { place: 'beam', fov: 38 },
  found: { place: 'sky', look: 'moon', fov: 0.8, marker: true },
  monologue: { place: 'sky', look: 'moon', fov: 3.4, fovTo: 1.3 },
  dim: { place: 'sky', look: 'wide', fov: 54, dim: true },
  pulse: { place: 'sky', look: 'wide', fov: 54, pulse: true },
};

const EYE = new THREE.Vector3(0, 1.7, 0);
const toMoon = new THREE.Vector3(0.3, 0.6, -0.74).normalize();
const toMars = new THREE.Vector3(-0.52, 0.4, -0.75).normalize();
const toWide = new THREE.Vector3(-0.08, 0.5, -0.86).normalize();
const FAR = 20000;
const MOON_R = FAR * Math.tan((0.26 * Math.PI) / 180);
/** Where the two other places live, far from the sky so nothing overlaps. */
const MAP_AT = new THREE.Vector3(0, -60000, 0);
const BEAM_AT = new THREE.Vector3(0, 60000, 0);
const MAP_HEIGHT = 560;
/** Seconds of the beam shot: a breath, the way out, the way back. */
const LAUNCH = 0.6;
const HALF = ROUND_TRIP / 2;

/** Days since the last new Moon, from the device date (or `?date=2026-11-18`). Good to a few hours. */
function moonAge(): number {
  const forced = /[?&]date=([0-9T:.\-Z]+)/.exec(location.search + location.hash)?.[1];
  const now = forced ? new Date(forced).getTime() : Date.now();
  const jd = now / 86400000 + 2440587.5;
  const synodic = 29.530588853;
  return (((jd - 2451550.1) % synodic) + synodic) % synodic;
}

export type RangingEnd = { outcome: OutcomeOf<'ranging'> | null };

export async function create(host: SceneHost): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1.05;
  const seeded = rng(1977);

  const [moonMap, earthMap, siteMap] = await Promise.all([loadTexture('tex/tex_moon_1k.webp'), loadTexture('tex/tex_earth_1k.webp'), loadTexture('img/img_e02_site_noon.webp')]);

  // ---------- Sunlight on the Moon: tonight's phase ----------
  const age = moonAge();
  const up = new THREE.Vector3(0, 1, 0);
  const moonUp = up.clone().addScaledVector(toMoon, -up.dot(toMoon)).normalize();
  const moonRight = new THREE.Vector3().crossVectors(toMoon, moonUp).normalize();
  const phase = (age / 29.530588853) * Math.PI * 2;
  // New Moon: the Sun is behind the Moon. Full Moon: behind the observer. Waxing: the lit edge is on the right.
  const toSun = toMoon.clone().multiplyScalar(Math.cos(phase)).addScaledVector(moonRight, Math.sin(phase)).normalize();
  const sun = new THREE.DirectionalLight(0xffffff, 3.1);
  sun.position.copy(toSun).multiplyScalar(1000);
  root.add(sun);

  // ---------- The sky ----------
  const sky = new THREE.Group();
  root.add(sky);

  const starCount = 1900;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const y = seeded() * 1.02 - 0.04;
    const a = seeded() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    starPos.set([Math.cos(a) * r * 30000, y * 30000, Math.sin(a) * r * 30000], i * 3);
    const b = 0.25 + Math.pow(seeded(), 3) * 0.75;
    starCol.set([b, b, b * (0.9 + seeded() * 0.2)], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  stars.frustumCulled = false;
  sky.add(stars);

  // The Moon, 0.52 degrees wide, near side toward us, north up, east on the right.
  const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_R, 96, 64), new THREE.MeshLambertMaterial({ map: moonMap }));
  const moonCentre = EYE.clone().addScaledVector(toMoon, FAR);
  moon.position.copy(moonCentre);
  const toUs = toMoon.clone().negate();
  moon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(toUs, moonUp, new THREE.Vector3().crossVectors(toUs, moonUp)));
  sky.add(moon);

  // Tranquility Base: 0.674 N, 23.473 E.
  const lat = (0.674 * Math.PI) / 180;
  const lon = (23.473 * Math.PI) / 180;
  const baseAt = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)).multiplyScalar(MOON_R * 1.002).applyQuaternion(moon.quaternion).add(moonCentre);
  const marker = new THREE.Mesh(new THREE.RingGeometry(MOON_R * 0.035, MOON_R * 0.05, 48), new THREE.MeshBasicMaterial({ color: 0xffc35a, side: THREE.DoubleSide, depthTest: false, transparent: true }));
  marker.position.copy(baseAt);
  marker.lookAt(EYE);
  marker.renderOrder = 5;
  sky.add(marker);

  const dot = (color: number) => new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color, sizeAttenuation: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  // At its true size the Moon is a few pixels wide in the wide shot. Its glare is what the eye finds first.
  const moonGlare = dot(0xdfe6f2);
  moonGlare.scale.setScalar(0.085);
  moonGlare.position.copy(moonCentre);
  sky.add(moonGlare);
  const mars = dot(0xff7a4a);
  mars.scale.setScalar(0.03);
  mars.position.copy(EYE).addScaledVector(toMars, FAR);
  sky.add(mars);
  const satellite = dot(0xffffff);
  satellite.scale.setScalar(0.018);
  sky.add(satellite);
  const flash = dot(0xffe2a0);
  flash.scale.setScalar(0);
  sky.add(flash);

  // The station: fiction, drawn as fiction. Dark shapes, amber edges.
  const station = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: 0x0b0906 });
  const edge = new THREE.LineBasicMaterial({ color: 0xb8782a, transparent: true, opacity: 0.9 });
  const solid = (geo: THREE.BufferGeometry) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, dark), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edge));
    return g;
  };
  const tube = solid(new THREE.CylinderGeometry(0.42, 0.5, 4.6, 14, 1, true));
  tube.quaternion.setFromUnitVectors(up, toMoon);
  tube.position.copy(EYE).add(new THREE.Vector3(0.95, -1.25, -0.9)).addScaledVector(toMoon, 2.6);
  const mount = solid(new THREE.BoxGeometry(1.1, 1.5, 1.1));
  mount.position.set(0.95, 0.75, -0.9);
  const wall = solid(new THREE.CylinderGeometry(7, 7, 1.15, 28, 1, true));
  wall.position.y = 0.58;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 28), dark);
  floor.rotation.x = -Math.PI / 2;
  station.add(tube, mount, wall, floor);
  sky.add(station);

  // ---------- The aiming map ----------
  const map = new THREE.Group();
  map.position.copy(MAP_AT);
  root.add(map);
  const { minX, maxX, minZ, maxZ } = ORTHO_BOUNDS;
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshBasicMaterial({ map: siteMap }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  map.add(sheet);
  // The photograph ends; the Moon does not. A plain sheet in the photograph's average grey lies under it.
  const under = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshBasicMaterial({ color: 0x1d1d1d }));
  under.rotation.x = -Math.PI / 2;
  under.position.set((minX + maxX) / 2, -1, (minZ + maxZ) / 2);
  map.add(under);
  const spot = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40), new THREE.MeshBasicMaterial({ color: 0xff5544, side: THREE.DoubleSide, transparent: true, depthTest: false }));
  spot.rotation.x = -Math.PI / 2;
  spot.renderOrder = 5;
  spot.visible = false;
  map.add(spot);

  // ---------- The beam ----------
  const beam = new THREE.Group();
  beam.position.copy(BEAM_AT);
  root.add(beam);
  const earthBall = new THREE.Mesh(new THREE.SphereGeometry(62, 64, 48), new THREE.MeshLambertMaterial({ map: earthMap }));
  earthBall.position.set(-290, 0, 0);
  earthBall.rotation.y = 1.9;
  const moonBall = new THREE.Mesh(new THREE.SphereGeometry(62 * 0.2727, 48, 32), new THREE.MeshLambertMaterial({ map: moonMap }));
  moonBall.position.set(290, 0, 0);
  moonBall.rotation.y = Math.PI;
  beam.add(earthBall, moonBall);
  const from = new THREE.Vector3(-290 + 62, 4, 0);
  const to = new THREE.Vector3(290 - 62 * 0.2727, 0, 0);
  const OUT = 900;
  const BACK = 7;
  const photonPos = new Float32Array((OUT + BACK) * 3);
  const photonSeed = Array.from({ length: OUT + BACK }, () => ({ delay: seeded() * 0.16, a: seeded() * Math.PI * 2, r: Math.sqrt(seeded()) }));
  const photonGeo = new THREE.BufferGeometry();
  photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPos, 3));
  const photons = new THREE.Points(photonGeo, new THREE.PointsMaterial({ color: 0xffd98a, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  photons.frustumCulled = false;
  beam.add(photons);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.5 }));
  beam.add(line);

  const clockCanvas = document.createElement('canvas');
  clockCanvas.width = 512;
  clockCanvas.height = 128;
  const clockCtx = clockCanvas.getContext('2d')!;
  const clockTex = new THREE.CanvasTexture(clockCanvas);
  clockTex.colorSpace = THREE.SRGBColorSpace;
  const clock = new THREE.Sprite(new THREE.SpriteMaterial({ map: clockTex, transparent: true, depthTest: false }));
  clock.scale.set(300, 75, 1);
  clock.position.set(40, 74, 0);
  beam.add(clock);
  let clockShown = '';
  const drawClock = (seconds: number) => {
    const text = `${seconds.toFixed(2)} s`;
    if (text === clockShown) return;
    clockShown = text;
    clockCtx.clearRect(0, 0, 512, 128);
    clockCtx.font = '500 84px "IBM Plex Mono", ui-monospace, monospace';
    clockCtx.textAlign = 'center';
    clockCtx.textBaseline = 'middle';
    clockCtx.fillStyle = '#ffd98a';
    clockCtx.shadowColor = 'rgba(255, 190, 90, 0.8)';
    clockCtx.shadowBlur = 18;
    clockCtx.fillText(text, 256, 68);
    clockTex.needsUpdate = true;
  };

  // ---------- State ----------
  let cue = 'sky';
  let shot = SHOTS[cue];
  let cueTime = 0;
  let cut = true;
  let aim: Aim = AIM_SITE;
  /** A scripted slew: from, to, progress. */
  let run: { from: Aim; to: Aim; t: number; fired: number; done?: (e: RangingEnd) => void; outcome: OutcomeOf<'ranging'> } | null = null;
  /** The player is at the controls. */
  let player: { done: (e: RangingEnd) => void; fired: number } | null = null;
  let camFov = 54;
  const camDir = toWide.clone();
  const wantDir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  const fireAt = (a: Aim) => {
    spot.visible = true;
    spot.position.set(a.x, 0.5, a.z);
    spot.scale.setScalar(26 / a.zoom);
  };

  // ---------- The player's hands on the telescope: drag to slew, wheel to zoom ----------
  const el = host.canvas;
  const drag = { on: false, x: 0, y: 0 };
  const metresPerPixel = () => (2 * (MAP_HEIGHT / aim.zoom) * Math.tan((SHOTS.aim.fov * Math.PI) / 360)) / host.height;
  const onDown = (e: PointerEvent) => {
    if (!player || player.fired) return;
    drag.on = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.on || !player) return;
    const k = metresPerPixel();
    aim = slew(aim, -(e.clientX - drag.x) * k, -(e.clientY - drag.y) * k);
    drag.x = e.clientX;
    drag.y = e.clientY;
  };
  const onUp = () => {
    drag.on = false;
  };
  const onWheel = (e: WheelEvent) => {
    if (!player || player.fired) return;
    e.preventDefault();
    aim = zoomTo(aim, aim.zoom * (e.deltaY > 0 ? 0.87 : 1.15));
  };
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });

  const controller: SetController = {
    setCue(next, instant) {
      if (!SHOTS[next]) return;
      const same = next === cue;
      const moved = SHOTS[next].place !== shot.place;
      cue = next;
      shot = SHOTS[next];
      if (same && !instant) return;
      cueTime = 0;
      // Moving between the sky, the map and the beam is a cut: they are different places.
      // Inside the sky the telescope really turns and zooms.
      cut = !!instant || host.reduceMotion || moved || cut;
      if (shot.place !== 'map') spot.visible = false;
    },

    step(dt) {
      if (run) {
        if (run.t < 1) {
          run.t = Math.min(1, run.t + dt / 2.4);
          const k = run.t * run.t * (3 - 2 * run.t);
          aim = { x: run.from.x + (run.to.x - run.from.x) * k, z: run.from.z + (run.to.z - run.from.z) * k, zoom: run.from.zoom + (run.to.zoom - run.from.zoom) * k };
          if (run.t === 1) fireAt(aim);
        } else {
          run.fired += dt;
          if (run.fired > 1.1 && run.done) {
            const done = run.done;
            run.done = undefined;
            host.timeScale = 1;
            done({ outcome: run.outcome });
          }
        }
      }
      if (player?.fired) {
        player.fired += dt;
        if (player.fired > 0.9) {
          const done = player.done;
          player = null;
          done({ outcome: judge(aim) });
        }
      }
    },

    frame(dt, time) {
      cueTime += dt;
      const still = host.reduceMotion;
      // In the sky the Sun lights the Moon in tonight's phase; the beam diagram has its own plain front light.
      if (shot.place === 'beam') sun.position.set(-500, 350, 900);
      else sun.position.copy(toSun).multiplyScalar(1000);
      sky.visible = shot.place === 'sky';
      map.visible = shot.place === 'map';
      beam.visible = shot.place === 'beam';

      if (shot.place === 'sky') {
        wantDir.copy(shot.look === 'moon' ? toMoon : toWide);
        const wantFov = shot.fovTo && !still ? shot.fov + (shot.fovTo - shot.fov) * clamp(cueTime / 40, 0, 1) : (shot.fovTo ?? shot.fov);
        if (cut) {
          camDir.copy(wantDir);
          camFov = wantFov;
          cut = false;
        } else {
          camDir.lerp(wantDir, 1 - Math.exp(-2.2 * dt)).normalize();
          // Zoom is felt in ratios, so the field of view moves on a log scale.
          camFov = Math.exp(damp(Math.log(camFov), Math.log(wantFov), 1.6, dt));
        }
        camera.position.copy(EYE);
        camera.up.set(0, 1, 0);
        camera.lookAt(tmp.copy(EYE).add(camDir));
        camera.near = 0.2;
        camera.far = 70000;

        marker.visible = !!shot.marker;
        const pulse = still ? 1 : 0.75 + 0.25 * Math.sin(time * 2.4);
        marker.scale.setScalar(pulse);
        station.visible = camFov > 12;
        moonGlare.visible = camFov > 12;
        (moonGlare.material as THREE.SpriteMaterial).opacity = clamp((camFov - 12) / 20, 0, 0.8);
        stars.visible = camFov > 2;
        edge.opacity = shot.dim ? Math.max(0.12, 0.9 - (still ? 1 : cueTime * 0.11)) : 0.9;

        // A satellite crosses the sky slowly: it has batteries, and one day they run out.
        const s = still ? 0.4 : (time * 0.012) % 1;
        satellite.position.copy(EYE).addScaledVector(tmp.set(-0.75 + s * 0.9, 0.62 - s * 0.16, -0.55).normalize(), FAR);

        // The midnight pulse: a flash leaves the telescope, and 2.56 s later the Moon answers, faintly.
        if (shot.pulse) {
          const t = still ? 0 : cueTime % 9;
          const out = Math.max(0, 1 - Math.abs(t - 0.8) * 4);
          const back = Math.max(0, 1 - Math.abs(t - 0.8 - ROUND_TRIP) * 3.2) * 0.75;
          if (out > back) {
            flash.position.copy(tube.position).addScaledVector(toMoon, 2.4);
            flash.scale.setScalar(0.12 * out);
          } else {
            flash.position.copy(moonCentre);
            flash.scale.setScalar(0.05 * back);
          }
        } else flash.scale.setScalar(0);
      } else if (shot.place === 'map') {
        const h = MAP_HEIGHT / aim.zoom;
        camera.position.set(MAP_AT.x + aim.x, MAP_AT.y + h, MAP_AT.z + aim.z);
        camera.up.set(0, 0, -1);
        camera.lookAt(MAP_AT.x + aim.x, MAP_AT.y, MAP_AT.z + aim.z);
        camFov = SHOTS.aim.fov;
        camera.near = 1;
        camera.far = 4000;
        cut = false;
        if (spot.visible) (spot.material as THREE.MeshBasicMaterial).opacity = still ? 1 : 0.55 + 0.45 * Math.sin(time * 9);
      } else {
        camera.position.set(BEAM_AT.x, BEAM_AT.y + 40, BEAM_AT.z + 640);
        camera.up.set(0, 1, 0);
        camera.lookAt(BEAM_AT.x, BEAM_AT.y - 48, BEAM_AT.z);
        camFov = SHOTS.beam.fov;
        camera.near = 10;
        camera.far = 5000;
        cut = false;

        const t = still ? LAUNCH + ROUND_TRIP + 1 : cueTime;
        const flight = clamp(t - LAUNCH, 0, ROUND_TRIP);
        drawClock(flight);
        line.visible = still;
        photons.visible = !still;
        for (let i = 0; i < OUT + BACK; i++) {
          const p = photonSeed[i];
          const back = i >= OUT;
          // Outbound light spreads into a wide cone: by the Moon it is kilometres across. Almost none of it hits the mirror.
          const u = back ? (t - LAUNCH - HALF - p.delay * 0.3) / HALF : (t - LAUNCH - p.delay) / HALF;
          if (u < 0 || u > 1) {
            photonPos[i * 3 + 1] = 1e7;
            continue;
          }
          const k = back ? 1 - u : u;
          const spread = (back ? 2.5 : 26) * k * p.r;
          photonPos[i * 3] = from.x + (to.x - from.x) * k;
          photonPos[i * 3 + 1] = from.y + (to.y - from.y) * k + Math.sin(p.a) * spread;
          photonPos[i * 3 + 2] = Math.cos(p.a) * spread;
        }
        (photonGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        earthBall.rotation.y += still ? 0 : dt * 0.02;
      }

      if (Math.abs(camera.fov - camFov) > 1e-4) camera.fov = camFov;
      camera.updateProjectionMatrix();
    },

    hotspot(name) {
      if (name === 'moon') return moonCentre;
      if (name === 'mars') return mars.position;
      if (name === 'satellite') return satellite.position;
      if (name === 'base') return baseAt;
      if (name === 'mirror') return tmp.set(MAP_AT.x + SITE.lrrr.x, MAP_AT.y, MAP_AT.z + SITE.lrrr.z);
      if (name === 'stage') return tmp.set(MAP_AT.x + SITE.lm.x, MAP_AT.y, MAP_AT.z + SITE.lm.z);
      if (name === 'ground') return tmp.set(MAP_AT.x + AIMS['on-ground'].x, MAP_AT.y, MAP_AT.z + AIMS['on-ground'].z);
      return null;
    },

    act(name, arg) {
      if (name === 'fly') {
        const o = arg as { outcome?: OutcomeOf<'ranging'>; player?: boolean; speed?: number };
        controller.setCue('aim');
        spot.visible = false;
        if (o.player) {
          run = null;
          aim = AIM_START;
          return new Promise<RangingEnd>((resolve) => {
            player = { done: resolve, fired: 0 };
          });
        }
        const outcome = o.outcome ?? 'on-mirror';
        return new Promise<RangingEnd>((resolve) => {
          run = { from: aim, to: AIMS[outcome], t: host.reduceMotion ? 0.999 : 0, fired: 0, done: resolve, outcome };
        });
      }
      if (name === 'skip' && run) {
        run.t = 0.999;
        return;
      }
      if (name === 'slew' && player && !player.fired) {
        const d = arg as { dx: number; dz: number };
        const k = 60 / aim.zoom;
        aim = slew(aim, d.dx * k, d.dz * k);
        return;
      }
      if (name === 'zoom' && player && !player.fired) {
        aim = zoomTo(aim, aim.zoom * (arg as number));
        return;
      }
      if (name === 'fire' && player && !player.fired) {
        player.fired = 0.001;
        fireAt(aim);
        return;
      }
      if (name === 'reset') {
        run = null;
        player = null;
        aim = AIM_SITE;
        spot.visible = false;
        return;
      }
      if (name === 'state') {
        const onMirror = judge(aim);
        return { ...aim, maxZoom: MAX_ZOOM, flying: !!player, fired: !!player?.fired, lock: onMirror, age };
      }
      return undefined;
    },

    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      camera.up.set(0, 1, 0);
      scene.remove(root);
    },
  };

  controller.setCue('sky', true);
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
