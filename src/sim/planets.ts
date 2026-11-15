/**
 * Where everything in the solar system is on a given date, as pure, deterministic functions (FR-70 to FR-73).
 * No DOM, no three.js: the Orrery set draws what this file computes.
 *
 * How good each position is:
 *  - The eight planets: JPL's approximate elements, good to a small fraction of a degree between 1800 and 2050.
 *  - Eros and Ceres: two-body motion from JPL's elements of June 2026. Good to well under a degree for a few years.
 *  - The Moon: its mean longitude only. Good to about 7 degrees; on the map it is drawn far from the Earth to be seen.
 *  - Kepler, Pioneer 10 and Voyager 1: APPROXIMATE. Their directions are not computed from an ephemeris here.
 *    Every screen that shows them must say so.
 *
 * Frame: the plane of the Earth's orbit (J2000 ecliptic), x toward the equinox, z toward the north. Units: au.
 */
import { distanceKm as voyagerDistanceKm } from './dsn.ts';

export type Vec3 = [number, number, number];

export const AU_KM = 149_597_870.7;
/** km/s */
export const LIGHT_SPEED = 299_792.458;

const rad = (d: number) => (d * Math.PI) / 180;
const DAY = 86_400_000;
/** Julian date of a moment given in milliseconds since 1970. */
export const julian = (when: number) => when / DAY + 2440587.5;

// ---------- The planets ----------

export const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
export type Planet = (typeof PLANETS)[number];

/**
 * Keplerian elements and their change per century, from JPL, "Approximate Positions of the Planets", table 1
 * (valid 1800 to 2050): a (au), e, I, L, longitude of perihelion, longitude of the ascending node (degrees).
 * The row for the Earth is the Earth-Moon barycenter. Read on Nov. 15, 2026.
 * https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * The rows for the Earth and Mars are also in `src/sim/meridiani.ts`; a test keeps the two copies equal.
 */
export const ELEMENTS: Record<Planet, number[][]> = {
  mercury: [
    [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593],
    [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  ],
  venus: [
    [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255],
    [0.0000039, -0.00004107, -0.0007889, 58517.81538729, 0.00268329, -0.27769418],
  ],
  earth: [
    [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
    [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  ],
  mars: [
    [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  ],
  jupiter: [
    [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
    [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  ],
  saturn: [
    [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
    [-0.0012506, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
  ],
  uranus: [
    [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503],
    [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
  ],
  neptune: [
    [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
    [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
  ],
};

/** An orbit at one moment: size, shape, tilt, and where the body is on it. Angles in radians. */
export type Orbit = { a: number; e: number; i: number; node: number; peri: number; M: number };

/** The orbit of a planet on a date. */
export function orbitOf(planet: Planet, when: number): Orbit {
  const el = ELEMENTS[planet];
  const T = (julian(when) - 2451545) / 36525;
  const [a, e, I, L, peri, node] = el[0].map((v, k) => v + el[1][k] * T);
  return { a, e, i: rad(I), node: rad(node), peri: rad(peri - node), M: rad(((((L - peri) % 360) + 540) % 360) - 180) };
}

/** Solves Kepler's equation for the eccentric anomaly. */
function eccentric(M: number, e: number): number {
  let E = M;
  for (let k = 0; k < 10; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

/** Position on an orbit for an eccentric anomaly. */
function place(o: Orbit, E: number): Vec3 {
  const px = o.a * (Math.cos(E) - o.e);
  const py = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  const cw = Math.cos(o.peri);
  const sw = Math.sin(o.peri);
  const cO = Math.cos(o.node);
  const sO = Math.sin(o.node);
  const ci = Math.cos(o.i);
  const si = Math.sin(o.i);
  return [(cw * cO - sw * sO * ci) * px + (-sw * cO - cw * sO * ci) * py, (cw * sO + sw * cO * ci) * px + (-sw * sO + cw * cO * ci) * py, sw * si * px + cw * si * py];
}

/** Where a body on this orbit is. */
export const positionOn = (o: Orbit): Vec3 => place(o, eccentric(o.M, o.e));

/** The whole orbit as a closed line of `n` points, to draw it. */
export function pathOf(o: Orbit, n = 180): Vec3[] {
  return Array.from({ length: n }, (_, k) => place(o, (k / n) * Math.PI * 2));
}

/** Position of a planet around the Sun on a date. */
export const heliocentric = (planet: Planet, when: number): Vec3 => positionOn(orbitOf(planet, when));

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const length = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);
/** Longitude around the Sun, degrees, 0 to 360, counted the way the planets go round. */
export const longitude = (v: Vec3) => ((Math.atan2(v[1], v[0]) * 180) / Math.PI + 360) % 360;

/** Distance between two planets on a date, au. */
export const distanceAu = (a: Planet, b: Planet, when: number) => length(sub(heliocentric(a, when), heliocentric(b, when)));

/** Minutes a radio signal needs to cross a distance given in au. */
export const lightMinutes = (au: number) => (au * AU_KM) / LIGHT_SPEED / 60;

// ---------- Two small worlds with a machine on them ----------

type Osculating = { epoch: number; a: number; e: number; i: number; node: number; w: number; M: number };

/**
 * Elements from JPL's Small-Body Database, epoch JD 2461200.5 (June 2026), read on Nov. 15, 2026.
 * https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=433 and https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=1
 */
export const SMALL = {
  /** 433 Eros: NEAR Shoemaker has rested on it since 2001. */
  eros: { epoch: 2461200.5, a: 1.458244, e: 0.222878, i: 10.828544, node: 304.267971, w: 178.918132, M: 62.511455 },
  /** 1 Ceres: Dawn is still in orbit around it, silent since 2018. */
  ceres: { epoch: 2461200.5, a: 2.765553, e: 0.079692, i: 10.588028, node: 80.248627, w: 73.294215, M: 274.419346 },
} satisfies Record<string, Osculating>;
export type Small = keyof typeof SMALL;

/** Gauss's constant: mean motion in radians per day is K / a^1.5, with a in au. */
const K = 0.01720209895;

/** The orbit of a small world on a date: the same ellipse, with the body moved along it (two-body motion). */
export function smallOrbit(body: Small, when: number): Orbit {
  const s: Osculating = SMALL[body];
  const M = rad(s.M) + (K / s.a ** 1.5) * (julian(when) - s.epoch);
  return { a: s.a, e: s.e, i: rad(s.i), node: rad(s.node), peri: rad(s.w), M: ((((M + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI };
}

// ---------- The Moon ----------

/**
 * Mean longitude of the Moon as seen from the Earth, degrees (Meeus, Astronomical Algorithms, chapter 47: L').
 * The true Moon strays up to about 7 degrees from it. Enough to draw the Moon on the right side of the Earth.
 */
export const moonLongitude = (when: number) => (((218.3164477 + 13.17639648 * (julian(when) - 2451545)) % 360) + 360) % 360;

// ---------- Three machines that are not on any world: APPROXIMATE ----------

export type Probe = { pos: Vec3; au: number; approximate: true };

const toward = (lonDeg: number, latDeg: number, r: number): Vec3 => [r * Math.cos(rad(latDeg)) * Math.cos(rad(lonDeg)), r * Math.cos(rad(latDeg)) * Math.sin(rad(lonDeg)), r * Math.sin(rad(latDeg))];

/**
 * Voyager 1. The distance from the Earth is NASA's (`src/sim/dsn.ts`); from so far it is also the distance from the Sun,
 * to within 1 au. The direction is fixed and approximate: NASA says it climbs about 35 degrees north of the plane of the
 * planets, toward Ophiuchus (https://science.nasa.gov/mission/voyager/frequently-asked-questions/); the longitude is that
 * of this heading.
 */
export function voyager1(when: number): Probe {
  const au = voyagerDistanceKm(when) / AU_KM;
  return { pos: toward(255, 35, au), au, approximate: true };
}

/**
 * Pioneer 10. Approximate in distance and in direction. NASA's last contact was on Jan. 23, 2003, at about 80 au
 * ("12.2 billion km"), heading toward Aldebaran in Taurus (https://science.nasa.gov/mission/pioneer-10/).
 * It leaves at about 2.5 au per year. Nobody has measured where it is since.
 */
export function pioneer10(when: number): Probe {
  const LAST = Date.UTC(2003, 0, 23);
  const au = 81.5 + (2.54 * (when - LAST)) / (365.25 * DAY);
  return { pos: toward(70, -5, au), au, approximate: true };
}

/**
 * Kepler. Approximate. It goes round the Sun on the Earth's own path, a little more slowly: one lap in 372.5 days
 * (NASA NSSDCA: "Earth-trailing heliocentric orbit of period 372.5 days",
 * https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-011A), so it falls about 7 degrees further behind the
 * Earth every year since its launch on Mar. 7, 2009.
 */
export function kepler(when: number): Probe {
  const LAUNCH = Date.UTC(2009, 2, 7);
  const years = (when - LAUNCH) / (365.25 * DAY);
  const behind = 360 * (1 - 365.25 / 372.5) * years;
  const earth = heliocentric('earth', when);
  const lon = longitude(earth) - behind;
  const r = length(earth);
  return { pos: toward(lon, 0, r), au: r, approximate: true };
}

/** How far behind the Earth Kepler is, degrees, 0 to 360. */
export function keplerLag(when: number): number {
  return (((longitude(heliocentric('earth', when)) - longitude(kepler(when).pos)) % 360) + 360) % 360;
}

// ---------- How far from home ----------

/**
 * Average distance from the Earth to the Moon, km (NASA: https://science.nasa.gov/moon/facts/). The real distance swings
 * between about 363,000 and 405,500 km every month; this file does not compute it, and the screen says "on average".
 */
export const MOON_KM = 384_400;

/** How a distance was obtained: the screen tells the player. */
export type DistanceKind = 'computed' | 'average' | 'nasa' | 'approximate';

/** How far a place of the map is from the Earth on a date, km. */
export function fromEarthKm(place: 'moon' | 'mars' | 'eros' | 'ceres' | 'kepler' | 'pioneer' | 'voyager', when: number): { km: number; kind: DistanceKind } {
  const earth = heliocentric('earth', when);
  const to = (p: Vec3) => length(sub(p, earth)) * AU_KM;
  switch (place) {
    case 'moon':
      return { km: MOON_KM, kind: 'average' };
    case 'mars':
      return { km: to(heliocentric('mars', when)), kind: 'computed' };
    case 'eros':
    case 'ceres':
      return { km: to(positionOn(smallOrbit(place, when))), kind: 'computed' };
    case 'kepler':
      return { km: to(kepler(when).pos), kind: 'approximate' };
    case 'pioneer':
      return { km: to(pioneer10(when).pos), kind: 'approximate' };
    case 'voyager':
      // NASA gives this one from the Earth already.
      return { km: voyagerDistanceKm(when), kind: 'nasa' };
  }
}

/** Seconds a radio signal needs to cross a distance in km. */
export const lightSeconds = (km: number) => km / LIGHT_SPEED;

// ---------- The scale of the map ----------

/**
 * The map cannot be drawn to scale: if Voyager 1 were at the edge of a screen, the Earth would be two pixels from the
 * Sun. So the map compresses distance: every body stays in its true direction, and a body that is farther away is
 * always drawn farther away. The screen says "distances compressed".
 */
export const compress = (au: number) => Math.log(1 + au / 0.25);

/** A position on the map: true direction, compressed distance. */
export function onMap(p: Vec3): Vec3 {
  const r = length(p);
  if (r < 1e-9) return [0, 0, 0];
  const k = compress(r) / r;
  return [p[0] * k, p[1] * k, p[2] * k];
}
