/**
 * Planning one sol of Opportunity from Earth, as a pure, deterministic simulation (FR-21, FR-29, FR-60).
 *
 * The real control loop: nobody drove the rover with a joystick. The team planned the sol, sent one sequence of
 * commands, and the rover carried it out on its own. The answer came back minutes later, at the speed of light.
 *
 * What is real here and what is not:
 *  - The loop (plan, send once, wait, read the telemetry) is real.
 *  - The light time is an ESTIMATE for a given date, from JPL's approximate planet positions (good to well under 1%).
 *  - The ground is a reconstruction: a plain, a crater with a raised rim. It is not an elevation model of a real place.
 *  - The height of the Sun (20 degrees) is illustrative: it makes slope and shadow easy to read. The lesson it carries is
 *    real: a solar rover survives winter by leaning its panels toward the Sun.
 *
 * The 3D set builds its ground from `height` and bakes its shadows from `shadowed`, so what the player sees is what
 * this file judges.
 */
import type { OutcomeOf } from './outcomes.ts';

/** A place on the ground, metres. x east, z south (north is -z): the frame of every set. */
export type Spot = { x: number; z: number };

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

// ---------- The ground ----------

/** One crater on the plain: a bowl with a raised rim. */
export const CRATER = { x: 0, z: -70, r: 42, depth: 9, rim: 4.5, rimWidth: 13 };
/** Where the rover waits for its plan. */
export const ROVER_START: Spot = { x: 25, z: 15 };
/** How far one sequence may send the rover, metres from where it stands. A game limit. */
export const REACH = 150;

/** Height of the ground, metres. Low ripples of sand on the plain, like the real Meridiani; a bowl; a rim. */
export function height(x: number, z: number): number {
  const r = Math.hypot(x - CRATER.x, z - CRATER.z);
  const bowl = r < CRATER.r ? -CRATER.depth * (1 - (r / CRATER.r) ** 2) : 0;
  const lip = CRATER.rim * Math.exp(-(((r - CRATER.r) / CRATER.rimWidth) ** 2));
  // Ripples fade out near the crater, where the rock is bare.
  const sand = clamp((r - CRATER.r - 10) / 30, 0, 1);
  const ripples = 0.11 * Math.sin(x * 0.42 + Math.sin(z * 0.11) * 1.3) + 0.07 * Math.sin(z * 0.23 + x * 0.05);
  return bowl + lip + ripples * sand;
}

/** Slope of the ground along x and z (rise per metre). */
export function gradient(x: number, z: number): [number, number] {
  const e = 0.25;
  return [(height(x + e, z) - height(x - e, z)) / (2 * e), (height(x, z + e) - height(x, z - e)) / (2 * e)];
}

/** Unit vector that points straight out of the ground. */
export function normal(x: number, z: number): [number, number, number] {
  const [gx, gz] = gradient(x, z);
  const l = Math.hypot(gx, 1, gz);
  return [-gx / l, 1 / l, -gz / l];
}

// ---------- The winter Sun ----------

/** Low in the north-northwest. Azimuth: 0 north, 90 east. Illustrative (see the header). */
export const SUN = { az: 330, el: 20 };
/** Unit vector toward the Sun. */
export const TO_SUN: [number, number, number] = [Math.sin(rad(SUN.az)) * Math.cos(rad(SUN.el)), Math.sin(rad(SUN.el)), -Math.cos(rad(SUN.az)) * Math.cos(rad(SUN.el))];
/** The solar panels sit about this high above the ground, metres. */
const DECK = 0.8;

/** True when the ground between this place and the Sun hides the Sun. */
export function shadowed(p: Spot): boolean {
  const base = height(p.x, p.z) + DECK;
  const hx = Math.sin(rad(SUN.az));
  const hz = -Math.cos(rad(SUN.az));
  const rise = Math.tan(rad(SUN.el));
  for (let t = 1.5; t <= 170; t += 1.5) if (height(p.x + hx * t, p.z + hz * t) > base + t * rise) return true;
  return false;
}

/** How many degrees the ground leans toward the Sun here. Negative: it leans away. */
export function tiltToSun(p: Spot): number {
  const [gx, gz] = gradient(p.x, p.z);
  // The ground leans toward the Sun when it goes down in the Sun's direction.
  const down = -(gx * Math.sin(rad(SUN.az)) + gz * -Math.cos(rad(SUN.az)));
  return (Math.atan(down) * 180) / Math.PI;
}

/** Sunlight on panels that lie flat on the rover deck, 0 to 1. 1 would be panels that face the Sun squarely. */
export function sunlight(p: Spot): number {
  if (shadowed(p)) return 0;
  const n = normal(p.x, p.z);
  return clamp(n[0] * TO_SUN[0] + n[1] * TO_SUN[1] + n[2] * TO_SUN[2], 0, 1);
}

/** The lean that counts as "a slope facing the Sun", degrees. */
export const SLOPE_MIN = 8;
/** The sunlight the rover needs to get through the winter, 0 to 1. A game value, between flat ground and a good slope. */
export const NEED = 0.45;

/** Where the rover ends the sol. Every place on the ground is one of the three outcomes of the puzzle. */
export function park(p: Spot): OutcomeOf<'traverse'> {
  if (shadowed(p)) return 'in-shadow';
  return tiltToSun(p) >= SLOPE_MIN && sunlight(p) >= NEED ? 'on-slope' : 'on-flat';
}

/** Moves the waypoint. It stays within one sequence's reach of the rover. */
export function move(p: Spot, dx: number, dz: number): Spot {
  const x = p.x + dx - ROVER_START.x;
  const z = p.z + dz - ROVER_START.z;
  const d = Math.hypot(x, z);
  const k = d > REACH ? REACH / d : 1;
  return { x: ROVER_START.x + x * k, z: ROVER_START.z + z * k };
}

/** Metres from the rover to a waypoint. */
export const distance = (p: Spot) => Math.hypot(p.x - ROVER_START.x, p.z - ROVER_START.z);

/** Where the planner's waypoint starts: on the open plain, so the operator has to plan. */
export const PLAN_START: Spot = { x: 60, z: -20 };

/** One waypoint per outcome: what the scripted operator sends in the Accessible view, and where its targets stand. */
export const SPOTS: Record<OutcomeOf<'traverse'>, Spot> = {
  // The near wall of the crater: it faces the Sun.
  'on-slope': { x: CRATER.x + 10.5, z: CRATER.z + 18.2 },
  // The open plain.
  'on-flat': { x: 78, z: -28 },
  // The foot of the far wall: the rim hides the Sun.
  'in-shadow': { x: CRATER.x - 10, z: CRATER.z - 17.3 },
};

// ---------- Distance is time: how long a command takes to reach Mars ----------

/** km/s */
const LIGHT_SPEED = 299_792.458;
const AU_KM = 149_597_870.7;

/**
 * Keplerian elements and their change per century, from JPL, "Approximate Positions of the Planets", table 1
 * (valid 1800 to 2050): a (au), e, I, L, long. of perihelion, long. of ascending node (degrees).
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 */
const EARTH = [
  [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
];
const MARS = [
  [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
];

/** Position around the Sun, au, in the plane of the Earth's orbit. */
function heliocentric(el: number[][], when: number): [number, number, number] {
  const T = (when / 86_400_000 + 2440587.5 - 2451545) / 36525;
  const [a, e, I, L, peri, node] = el[0].map((v, i) => v + el[1][i] * T);
  const w = rad(peri - node);
  const O = rad(node);
  const i = rad(I);
  const M = rad(((((L - peri) % 360) + 540) % 360) - 180);
  let E = M;
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const px = a * (Math.cos(E) - e);
  const py = a * Math.sqrt(1 - e * e) * Math.sin(E);
  return [
    (Math.cos(w) * Math.cos(O) - Math.sin(w) * Math.sin(O) * Math.cos(i)) * px + (-Math.sin(w) * Math.cos(O) - Math.cos(w) * Math.sin(O) * Math.cos(i)) * py,
    (Math.cos(w) * Math.sin(O) + Math.sin(w) * Math.cos(O) * Math.cos(i)) * px + (-Math.sin(w) * Math.sin(O) + Math.cos(w) * Math.cos(O) * Math.cos(i)) * py,
    Math.sin(w) * Math.sin(i) * px + Math.cos(w) * Math.sin(i) * py,
  ];
}

/** Estimated distance between the Earth and Mars on a date (milliseconds since 1970), km. */
export function marsDistanceKm(when: number): number {
  const e = heliocentric(EARTH, when);
  const m = heliocentric(MARS, when);
  return Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]) * AU_KM;
}

/** Estimated minutes a radio signal needs, one way, between the Earth and Mars on that date. */
export const lightMinutes = (when: number) => marsDistanceKm(when) / LIGHT_SPEED / 60;

/** "9 min 40 s" */
export function minSec(minutes: number): string {
  const s = Math.round(minutes * 60);
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
