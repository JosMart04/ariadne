/**
 * The Orrery: the solar system as it is today, and the map of the game (FR-01, FR-70 to FR-73, AC-18).
 *
 * What is real: the direction of every planet, of Eros and of Ceres on the given date (`src/sim/planets.ts`), the shape
 * of every orbit, and how far Voyager 1 is.
 * What is not, and the screen says so:
 *  - distances are compressed (`compress`), or the Earth would be two pixels from the Sun;
 *  - sizes are not to scale, and the Moon is drawn far from the Earth to be seen;
 *  - Kepler, Pioneer 10 and Voyager 1 are approximate.
 *
 * Options read from `SetContext.options`:
 *   when    the date to show, milliseconds since 1970 (default: now)
 *   done    ids of the episodes already restored: their part of the thread shines
 *   thread  'whole' draws the whole thread bright (the title screen)
 *   pin     size of a machine's marker on screen, pixels (it grows with the text size): the fans open to fit it
 *
 * Hotspots: a world by its name (`earth`, `moon`, `voyager`...) and a machine by its episode id. Machines that share
 * a world open in a fan around it, with the same spacing on screen at every zoom.
 */
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { content } from '../../content';
import { PLANETS, compress, heliocentric, kepler, moonLongitude, onMap, orbitOf, pathOf, pioneer10, positionOn, smallOrbit, voyager1, type Planet, type Vec3 } from '../../sim/planets';
import type { SceneHost, SetContext, SetController, Tier } from '../../three/host';
import { clamp, damp, fbm, rng } from '../../three/util';
import { PLACES, placeOf, type Place } from './places';

/** Map coordinates (plane of the planets, z north) to the scene (y up). Seen from the north, planets go anticlockwise. */
const toScene = (p: Vec3) => new THREE.Vector3(p[0], p[2], -p[1]);

type Shot = { yaw: number; pitch: number; dist: number; fov: number; drift?: number; shift?: [number, number]; lift?: number };
const SHOTS: Record<string, Shot> = {
  // Low over the plane, the Sun off to the right: the words of the title sit on the left.
  title: { yaw: 0.9, pitch: 0.3, dist: 6.4, fov: 36, drift: 0.01, shift: [-0.17, 0.1], lift: 0.25 },
  // From above, the Earth toward the player.
  map: { yaw: 0, pitch: 0.95, dist: 9.6, fov: 36 },
  // Turned, in `create`, so that Pioneer 10 and Voyager 1 are at the two sides of the picture.
  far: { yaw: 0, pitch: 0.5, dist: 14.5, fov: 36, lift: 1.1 },
};
/** Nearer than this, the Earth and Mars would not both fit in the picture with their machines. */
const NEAR = 5.6;
const FAR = 30;

/** Radius of each body on the map. Not to scale: Jupiter would be 11 Earths wide, the Sun 109. */
const SIZE: Record<Planet, number> = { mercury: 0.042, venus: 0.062, earth: 0.066, mars: 0.054, jupiter: 0.14, saturn: 0.116, uranus: 0.086, neptune: 0.084 };
const SUN = 0.17;
/** The Moon is drawn this far from the Earth, map units. In truth it would be inside the Earth's own dot. */
const MOON_AWAY = 0.17;

type Paint = (u: number, v: number) => [number, number, number];
/** A texture made here, from noise with a fixed seed: no file to download, the same picture on every machine. */
function texture(size: number, paint: Paint): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) {
      const [r, gr, b] = paint(x / c.width, y / c.height);
      const k = (y * c.width + x) * 4;
      img.data[k] = clamp(r, 0, 1) * 255;
      img.data[k + 1] = clamp(gr, 0, 1) * 255;
      img.data[k + 2] = clamp(b, 0, 1) * 255;
      img.data[k + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/** Noise that joins up round the sphere. */
const wrap = (u: number, v: number, f: number, seed: number, oct = 4) => fbm(Math.cos(u * Math.PI * 2) * f + 7.3, Math.sin(u * Math.PI * 2) * f + v * f * 2.2 + 3.1, oct, seed);
const mix = (a: number[], b: number[], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const bands = (a: number[], b: number[], n: number, wobble: number, seed: number): Paint => (u, v) => mix(a, b, 0.5 + 0.5 * Math.sin(v * n + (wrap(u, v, 1.6, seed) - 0.5) * wobble));

const LOOKS: Record<Planet | 'moon' | 'sun' | 'rock', Paint> = {
  sun: (u, v) => mix([1, 0.74, 0.3], [1, 0.97, 0.82], wrap(u, v, 5, 11, 5)),
  mercury: (u, v) => mix([0.34, 0.32, 0.3], [0.66, 0.63, 0.58], wrap(u, v, 4, 21)),
  venus: bands([0.9, 0.8, 0.58], [0.78, 0.64, 0.4], 9, 5, 22),
  earth: (u, v) => {
    const pole = Math.abs(v - 0.5) * 2;
    const land = wrap(u, v, 2.3, 23, 5);
    const cloud = wrap(u + 0.37, v, 4.2, 24, 4);
    let c = land > 0.56 ? mix([0.16, 0.36, 0.14], [0.5, 0.42, 0.24], clamp((land - 0.56) * 6, 0, 1)) : mix([0.03, 0.12, 0.36], [0.06, 0.26, 0.56], land * 1.6);
    if (pole > 0.84) c = [0.92, 0.95, 0.98];
    return mix(c, [1, 1, 1], clamp((cloud - 0.56) * 4, 0, 0.85));
  },
  mars: (u, v) => {
    const pole = Math.abs(v - 0.5) * 2;
    const c = mix([0.78, 0.4, 0.22], [0.42, 0.2, 0.12], clamp((wrap(u, v, 2.6, 25) - 0.42) * 3, 0, 1));
    return pole > 0.9 ? [0.95, 0.92, 0.9] : c;
  },
  jupiter: bands([0.86, 0.74, 0.58], [0.6, 0.4, 0.26], 34, 2.6, 26),
  saturn: bands([0.9, 0.82, 0.62], [0.78, 0.68, 0.48], 26, 1.4, 27),
  uranus: bands([0.62, 0.86, 0.88], [0.54, 0.78, 0.84], 8, 1, 28),
  neptune: bands([0.2, 0.36, 0.86], [0.14, 0.26, 0.7], 12, 2.4, 29),
  moon: (u, v) => mix([0.36, 0.36, 0.37], [0.74, 0.73, 0.71], wrap(u, v, 3.4, 30)),
  rock: (u, v) => mix([0.3, 0.28, 0.26], [0.6, 0.56, 0.5], wrap(u, v, 3, 31)),
};

function glow(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.25, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function create(host: SceneHost, ctx: SetContext): Promise<SetController> {
  const { scene, camera } = host;
  const root = new THREE.Group();
  scene.add(root);
  host.renderer.toneMappingExposure = 1;
  scene.background = new THREE.Color(0x02030a);
  const opt = ctx.options as { when?: number; done?: string[]; thread?: string; pin?: number };
  const PIN = clamp(Number(opt.pin) || 32, 24, 80);
  const when = typeof opt.when === 'number' && Number.isFinite(opt.when) ? opt.when : Date.now();
  const done = new Set(opt.done ?? []);
  const low = host.tier === 'low';
  const TEX = low ? 64 : 128;
  const SEG = low ? 20 : 40;

  // ---------- The sky ----------
  const seeded = rng(20261115);
  const starField = (count: number, size: number, opacity: number) => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const z = seeded() * 2 - 1;
      const a = seeded() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      pos.set([r * Math.cos(a) * 320, z * 320, r * Math.sin(a) * 320], i * 3);
      const warm = seeded();
      const lum = 0.55 + seeded() * 0.45;
      col.set([lum * (0.8 + warm * 0.2), lum * 0.88, lum * (1 - warm * 0.25)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity, depthWrite: false }));
  };
  root.add(starField(Math.round(2600 * host.budget), 1.3, 0.75), starField(Math.round(260 * host.budget), 2.4, 0.95));

  // ---------- The Sun ----------
  const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN, SEG, SEG / 2), new THREE.MeshBasicMaterial({ map: texture(TEX, LOOKS.sun), toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,236,190,1)', 'rgba(255,170,60,0.45)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.setScalar(SUN * 9);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,200,120,0.35)', 'rgba(255,150,60,0.12)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  corona.scale.setScalar(SUN * 30);
  const light = new THREE.PointLight(0xfff2dc, 2.8, 0, 0);
  root.add(sun, halo, corona, light, new THREE.AmbientLight(0x2a3550, 0.9));

  // ---------- Worlds, each where it is on this date ----------
  /** World position of every named place. */
  const where: Record<string, THREE.Vector3> = { sun: new THREE.Vector3() };
  const spinning: THREE.Object3D[] = [sun];
  const orbitLine = (points: Vec3[], color: number, opacity: number, dashed = false) => {
    const geo = new THREE.BufferGeometry().setFromPoints([...points, points[0]].map((p) => toScene(onMap(p))));
    const mat = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.05, gapSize: 0.05, depthWrite: false })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const line = new THREE.Line(geo, mat);
    if (dashed) line.computeLineDistances();
    return line;
  };

  for (const p of PLANETS) {
    const orbit = orbitOf(p, when);
    const pos = toScene(onMap(positionOn(orbit)));
    where[p] = pos;
    const look = texture(TEX, LOOKS[p]);
    // A little of its own light, so a world between the camera and the Sun is not a black disc.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(SIZE[p], SEG, SEG / 2), new THREE.MeshStandardMaterial({ map: look, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: look, emissiveIntensity: 0.3 }));
    ball.position.copy(pos);
    ball.rotation.z = p === 'uranus' ? 1.4 : 0.3;
    spinning.push(ball);
    root.add(ball, orbitLine(pathOf(orbit, low ? 120 : 240), p === 'earth' ? 0x7fa8ff : p === 'mars' ? 0xe08a5c : 0x6f7c9c, p === 'earth' || p === 'mars' ? 0.7 : 0.42));
    if (p === 'saturn') {
      for (const [inner, outer, opacity] of [
        [1.25, 1.55, 0.5],
        [1.6, 2.05, 0.75],
        [2.1, 2.3, 0.35],
      ]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(SIZE.saturn * inner, SIZE.saturn * outer, 72), new THREE.MeshBasicMaterial({ color: 0xd9c9a0, side: THREE.DoubleSide, transparent: true, opacity, depthWrite: false }));
        ring.position.copy(pos);
        ring.rotation.set(-Math.PI / 2 + 0.47, 0, 0.2);
        root.add(ring);
      }
    }
  }

  // The Moon, on the side of the Earth where it is today (mean longitude), far enough to be seen.
  const moonAngle = (moonLongitude(when) * Math.PI) / 180;
  where.moon = where.earth.clone().add(new THREE.Vector3(Math.cos(moonAngle), 0, -Math.sin(moonAngle)).multiplyScalar(MOON_AWAY));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.02, 20, 10), new THREE.MeshStandardMaterial({ map: texture(64, LOOKS.moon), roughness: 1 }));
  moon.position.copy(where.moon);
  const moonPath = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, k) => where.earth.clone().add(new THREE.Vector3(Math.cos((k / 64) * Math.PI * 2), 0, Math.sin((k / 64) * Math.PI * 2)).multiplyScalar(MOON_AWAY)))),
    new THREE.LineBasicMaterial({ color: 0xaab4c8, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  root.add(moon, moonPath);

  // Eros and Ceres: small worlds with a machine each.
  for (const s of ['eros', 'ceres'] as const) {
    const orbit = smallOrbit(s, when);
    where[s] = toScene(onMap(positionOn(orbit)));
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s === 'ceres' ? 0.026 : 0.02, s === 'ceres' ? 2 : 0), new THREE.MeshStandardMaterial({ map: texture(64, LOOKS.rock), roughness: 1, flatShading: s === 'eros' }));
    rock.position.copy(where[s]);
    if (s === 'eros') rock.scale.set(1.7, 0.8, 0.8);
    spinning.push(rock);
    root.add(rock, orbitLine(pathOf(orbit, 160), 0x8d8a80, 0.4, true));
  }

  // The belt between Mars and Jupiter, as dust. Decoration: no single rock here is a real one.
  const BELT = Math.round(700 * host.budget);
  const beltPos = new Float32Array(BELT * 3);
  for (let i = 0; i < BELT; i++) {
    const a = seeded() * Math.PI * 2;
    const r = compress(2.15 + seeded() * 1.1);
    beltPos.set([Math.cos(a) * r, (seeded() - 0.5) * 0.08, Math.sin(a) * r], i * 3);
  }
  const beltGeo = new THREE.BufferGeometry();
  beltGeo.setAttribute('position', new THREE.BufferAttribute(beltPos, 3));
  root.add(new THREE.Points(beltGeo, new THREE.PointsMaterial({ color: 0x8f8b84, size: 1.2, sizeAttenuation: false, transparent: true, opacity: 0.45, depthWrite: false })));

  // Three machines on no world. Approximate: the screen says so.
  where.kepler = toScene(onMap(kepler(when).pos));
  where.pioneer = toScene(onMap(pioneer10(when).pos));
  where.voyager = toScene(onMap(voyager1(when).pos));
  const spark = glow('rgba(255,244,214,1)', 'rgba(255,196,90,0.5)');
  for (const name of ['kepler', 'pioneer', 'voyager'] as const) {
    const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: spark, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    dot.scale.setScalar(0.14);
    dot.position.copy(where[name]);
    root.add(dot);
    if (name === 'kepler') continue;
    // The way out from the Sun, and how far the probe is above or below the plane of the planets.
    const foot = new THREE.Vector3(where[name].x, 0, where[name].z);
    const way = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), where[name]]), new THREE.LineDashedMaterial({ color: 0xcfd6e6, transparent: true, opacity: 0.4, dashSize: 0.07, gapSize: 0.07, depthWrite: false }));
    way.computeLineDistances();
    const drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([where[name], foot]), new THREE.LineBasicMaterial({ color: 0xcfd6e6, transparent: true, opacity: 0.28, depthWrite: false }));
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.058, 40), new THREE.MeshBasicMaterial({ color: 0xcfd6e6, side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthWrite: false }));
    mark.rotation.x = -Math.PI / 2;
    mark.position.copy(foot);
    root.add(way, drop, mark);
  }

  // ---------- The sixteen machines ----------
  const order = content.threadOrder.filter((id) => placeOf(id));
  const byPlace = new Map<Place, string[]>();
  for (const id of order) byPlace.set(placeOf(id)!, [...(byPlace.get(placeOf(id)!) ?? []), id]);
  const pins: Record<string, THREE.Vector3> = Object.fromEntries(order.map((id) => [id, new THREE.Vector3()]));
  /** Middle of each fan, to keep the fans away from each other. */
  const centre = Object.fromEntries(PLACES.map((p) => [p, new THREE.Vector3(1e6, 1e6, 1e6)])) as Record<Place, THREE.Vector3>;

  // A thin line from each machine to its world.
  const leaderGeo = new THREE.BufferGeometry();
  const leaderPos = new Float32Array(order.length * 6);
  const leaderCol = new Float32Array(order.length * 6);
  order.forEach((id, k) => {
    const c = done.has(id) ? [1, 0.78, 0.36] : [0.62, 0.68, 0.8];
    leaderCol.set([...c, ...c], k * 6);
  });
  leaderGeo.setAttribute('position', new THREE.BufferAttribute(leaderPos, 3));
  leaderGeo.setAttribute('color', new THREE.BufferAttribute(leaderCol, 3));
  const leaders = new THREE.LineSegments(leaderGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, depthTest: false }));
  leaders.frustumCulled = false;
  root.add(leaders);

  // ---------- The golden thread, in launch order ----------
  const threadMats: LineMaterial[] = [];
  const strand = (points: THREE.Vector3[], width: number, opacity: number, color: number, dashed = false) => {
    const geo = new LineGeometry();
    geo.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    const mat = new LineMaterial({ color, linewidth: width, transparent: true, opacity, depthWrite: false, dashed, dashSize: 0.06, gapSize: 0.05, blending: dashed ? THREE.NormalBlending : THREE.AdditiveBlending, toneMapped: false });
    mat.resolution.set(host.width, host.height);
    threadMats.push(mat);
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.frustumCulled = false;
    return line;
  };
  /** Strands between the worlds of a list of machines, in order. Each new strand to the same world climbs a little higher. */
  const weave = (ids: string[], base: number, draw: (points: THREE.Vector3[]) => void) => {
    const visits = new Map<string, number>();
    for (let k = 0; k + 1 < ids.length; k++) {
      const a = placeOf(ids[k])!;
      const b = placeOf(ids[k + 1])!;
      if (a === b) continue;
      const n = visits.get(b) ?? 0;
      visits.set(b, n + 1);
      const from = where[a];
      const to = where[b];
      const mid = from.clone().add(to).multiplyScalar(0.5);
      mid.y += base + n * 0.09 + from.distanceTo(to) * 0.1;
      draw(new THREE.QuadraticBezierCurve3(from, mid, to).getPoints(low ? 24 : 48));
    }
  };
  const whole = opt.thread === 'whole';
  // The whole path, faint: where the thread will go.
  if (!whole) weave(order, 0.1, (points) => root.add(strand(points, 1.4, 0.5, 0xb08a40, true)));
  // The thread woven so far: it joins the restored machines, in launch order.
  weave(whole ? order : order.filter((id) => done.has(id)), whole ? 0.1 : 0.17, (points) => root.add(strand(points, 7, 0.16, 0xffb84a), strand(points, 2.2, 0.95, 0xffd27a)));

  // ---------- State ----------
  /** The Earth toward the player in the map view. */
  const home = Math.atan2(where.earth.x, where.earth.z);
  const across = where.pioneer.clone().sub(where.voyager).setY(0);
  const side = new THREE.Vector3(-across.z, 0, across.x);
  if (side.dot(where.earth) < 0) side.negate();
  const shots: Record<string, Shot> = { ...SHOTS, far: { ...SHOTS.far, yaw: Math.atan2(side.x, side.z) - home } };
  /** Coming closer, the camera turns toward the middle of the Earth and Mars: eleven of the sixteen machines are there. */
  const focus = where.earth.clone().add(where.mars).multiplyScalar(0.5);
  const look = new THREE.Vector3();
  let cue = 'map';
  let shot = shots[cue];
  let cueTime = 0;
  let cut = true;
  const now = { yaw: 0, pitch: 0, dist: 0, fov: 36, sx: 0, sy: 0, lift: 0 };
  const view = { yaw: 0, pitch: 0, zoom: 1, dragging: false, x: 0, y: 0 };
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const lab = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  const seen = new THREE.Vector3();
  const anchor = new THREE.Vector3();

  // ---------- Looking around ----------
  const el = host.canvas;
  const zoomBy = (steps: number) => {
    view.zoom = clamp(view.zoom * 0.82 ** steps, NEAR / shot.dist, FAR / shot.dist);
  };
  const onDown = (e: PointerEvent) => {
    view.dragging = true;
    view.x = e.clientX;
    view.y = e.clientY;
    el.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!view.dragging) return;
    view.yaw -= (e.clientX - view.x) * 0.005;
    view.pitch = clamp(view.pitch + (e.clientY - view.y) * 0.004, 0.14 - shot.pitch, 1.5 - shot.pitch);
    view.x = e.clientX;
    view.y = e.clientY;
  };
  const onUp = () => {
    view.dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomBy(-Math.sign(e.deltaY) * 0.6);
  };
  const KEYS: Record<string, [number, number, number]> = {
    arrowleft: [-1, 0, 0],
    a: [-1, 0, 0],
    arrowright: [1, 0, 0],
    d: [1, 0, 0],
    arrowup: [0, 1, 0],
    w: [0, 1, 0],
    arrowdown: [0, -1, 0],
    s: [0, -1, 0],
    '+': [0, 0, 1],
    '=': [0, 0, 1],
    '-': [0, 0, -1],
  };
  const held = new Set<string>();
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (!(k in KEYS) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    held.add(k);
  };
  const onKeyUp = (e: KeyboardEvent) => void held.delete(e.key.toLowerCase());
  const onBlur = () => held.clear();
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  addEventListener('blur', onBlur);

  /** Which way each fan opened last frame, in quarter turns from "away from the Sun". Kept unless another way is clearly better. */
  const turned = new Map<Place, number>();
  const crowd = [...PLANETS, 'moon', 'eros', 'ceres', 'kepler', 'sun'] as const;
  /** How large the markers are right now: from far away they shrink to dots, and their fans with them. */
  let pinNow = 1;
  /**
   * Puts every machine around its world, the same distance apart on screen whatever the zoom, on the side with most room.
   * A world that is outside the picture keeps its fan whole at the nearest edge, so no machine is ever out of reach and
   * no two markers ever lie on each other.
   */
  const fan = () => {
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    ahead.setFromMatrixColumn(camera.matrixWorld, 2).negate();
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const P = PIN * pinNow;
    let k = 0;
    for (const place of PLACES) {
      const ids = byPlace.get(place);
      if (!ids) continue;
      const body = where[place];
      const radius = P * (ids.length > 4 ? 2.45 : ids.length > 1 ? 1.8 : 1.3);
      // Where the world is on screen, in pixels from the middle (x right, y up).
      seen.copy(body).applyMatrix4(camera.matrixWorldInverse);
      const depth = Math.max(0.4, -seen.z);
      const scale = (depth * 2 * half) / host.height;
      const sx = seen.x / scale;
      const sy = seen.y / scale;
      // The part of the picture where a whole fan fits: clear of the station bar above and of the keys below.
      const reach = radius + P * 0.75;
      const fitX = host.width / 2 - reach;
      const fitUp = host.height / 2 - reach - 52;
      const fitDown = host.height / 2 - reach - 96;
      const t = Math.min(1, fitX / Math.max(1, Math.abs(sx)), (sy > 0 ? fitUp : fitDown) / Math.max(1, Math.abs(sy)));
      /** The middle of the fan: the world itself, or the point of the edge nearest to it. */
      anchor.copy(camera.position).addScaledVector(ahead, depth).addScaledVector(right, sx * t * scale).addScaledVector(up, sy * t * scale);
      if (t >= 1) anchor.copy(body);

      // "Away from the Sun" on screen, then the quarter turn that leaves the fan farthest from every other world.
      const out = Math.atan2(body.dot(up), body.dot(right));
      const room = (quarter: number) => {
        const a = out + (quarter * Math.PI) / 2;
        tmp.copy(anchor).addScaledVector(right, Math.cos(a) * radius * scale).addScaledVector(up, Math.sin(a) * radius * scale);
        let least = Infinity;
        for (const other of crowd) {
          if (other !== place && !(place === 'moon' && other === 'earth')) least = Math.min(least, tmp.distanceTo(where[other]) / scale);
          // The name of a world hangs under it (the Moon's sits above).
          if (other === 'sun' || other === 'kepler') continue;
          lab.copy(where[other]).addScaledVector(up, (other === 'moon' ? 24 : -20) * scale);
          least = Math.min(least, (tmp.distanceTo(lab) / scale) * 1.15);
        }
        for (const p of turned.keys()) if (p !== place) least = Math.min(least, tmp.distanceTo(centre[p]) / scale - P * 1.2);
        return least;
      };
      let best = turned.get(place) ?? 0;
      let bestRoom = room(best) * 1.25;
      for (let q = 0; q < 4; q++) {
        const r = room(q);
        if (r > bestRoom) {
          best = q;
          bestRoom = r;
        }
      }
      turned.set(place, best);
      // At the edge the fan opens back toward the middle of the picture, where there is room for it.
      const base = t < 1 ? Math.atan2(-sy, -sx) : out + (best * Math.PI) / 2;
      const spread = t < 1 && ids.length > 1 ? 0 : 1;
      centre[place].copy(anchor).addScaledVector(right, Math.cos(base) * radius * scale * spread).addScaledVector(up, Math.sin(base) * radius * scale * spread);
      const step = ids.length > 1 ? (P * 1.14) / radius : 0;
      ids.forEach((id, n) => {
        // At the edge the fan closes into a full ring round its anchor, which is already a fan's reach from the edge.
        const a = t < 1 && ids.length > 1 ? (n / ids.length) * Math.PI * 2 : base + (n - (ids.length - 1) / 2) * step;
        const r = t < 1 && ids.length > 1 ? Math.max(P * 0.9, (P * 1.14 * ids.length) / (Math.PI * 2)) : t < 1 ? 0 : radius;
        pins[id].copy(anchor).addScaledVector(right, Math.cos(a) * r * scale).addScaledVector(up, Math.sin(a) * r * scale);
        const at = order.indexOf(id) * 6;
        tmp.copy(pins[id]).sub(body).multiplyScalar(0.8).add(body);
        leaderPos.set([body.x, body.y, body.z, tmp.x, tmp.y, tmp.z], at);
        k++;
      });
    }
    if (k) leaderGeo.attributes.position.needsUpdate = true;
  };

  const controller: SetController = {
    setCue(next, instant) {
      if (!shots[next]) return;
      const same = next === cue;
      cue = next;
      shot = shots[next];
      if (same && !instant) return;
      cueTime = 0;
      view.yaw = 0;
      view.pitch = 0;
      view.zoom = 1;
      cut = !!instant || host.reduceMotion || cut;
    },

    step(dt) {
      if (host.reduceMotion) return;
      for (const o of spinning) o.rotation.y += dt * 0.12;
    },

    frame(dt) {
      cueTime += dt;
      const still = host.reduceMotion;
      for (const k of held) {
        const [yaw, pitch, zoom] = KEYS[k];
        view.yaw += yaw * dt * 1.2;
        view.pitch = clamp(view.pitch + pitch * dt * 0.8, 0.14 - shot.pitch, 1.5 - shot.pitch);
        if (zoom) zoomBy(zoom * dt * 3);
      }
      const want = {
        yaw: home + shot.yaw + view.yaw + (still ? 0 : (shot.drift ?? 0) * cueTime),
        pitch: clamp(shot.pitch + view.pitch, 0.14, 1.5),
        dist: clamp(shot.dist * view.zoom, NEAR, FAR),
        fov: shot.fov,
        sx: shot.shift?.[0] ?? 0,
        sy: shot.shift?.[1] ?? 0,
        lift: shot.lift ?? 0,
      };
      if (cut || still) {
        Object.assign(now, want);
        cut = false;
      } else {
        for (const key of Object.keys(want) as (keyof typeof want)[]) now[key] = damp(now[key], want[key], 5, dt);
      }
      const c = Math.cos(now.pitch);
      const closer = cue === 'title' ? 0 : clamp((SHOTS.map.dist - now.dist) / (SHOTS.map.dist - NEAR), 0, 1);
      look.set(focus.x * closer, now.lift, focus.z * closer);
      camera.position.set(look.x + Math.sin(now.yaw) * c * now.dist, look.y + Math.sin(now.pitch) * now.dist, look.z + Math.cos(now.yaw) * c * now.dist);
      camera.up.set(0, 1, 0);
      camera.lookAt(look);
      camera.near = 0.1;
      camera.far = 900;
      if (Math.abs(camera.fov - now.fov) > 0.01) camera.fov = now.fov;
      if (Math.abs(now.sx) > 0.002 || Math.abs(now.sy) > 0.002) camera.setViewOffset(host.width, host.height, now.sx * host.width, now.sy * host.height, host.width, host.height);
      else if (camera.view) camera.clearViewOffset();
      camera.updateProjectionMatrix();
      leaders.visible = cue !== 'title';
      pinNow = still ? (cue === 'far' ? 0.46 : 1) : damp(pinNow, cue === 'far' ? 0.46 : 1, 5, dt);
      for (const m of threadMats) m.resolution.set(host.width, host.height);
      fan();
    },

    hotspot(name) {
      return pins[name] ?? where[name] ?? null;
    },

    act(name, arg) {
      // The on-screen keys of the map: closer, farther, back to the first view.
      if (name === 'zoom') zoomBy((arg as { by?: number } | undefined)?.by ?? 1);
      if (name === 'reset') {
        view.yaw = 0;
        view.pitch = 0;
        view.zoom = 1;
      }
      return undefined;
    },

    onTier(_tier: Tier) {},

    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      removeEventListener('keydown', onKeyDown);
      removeEventListener('keyup', onKeyUp);
      removeEventListener('blur', onBlur);
      camera.clearViewOffset();
      camera.up.set(0, 1, 0);
      scene.remove(root);
    },
  };

  controller.setCue('map', true);
  return controller;
}
