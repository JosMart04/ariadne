/**
 * Tranquility Base, as numbers. Shared by the descent simulation and by the 3D set,
 * so what the player flies over is what the simulation judges.
 *
 * Frame: metres. Origin at Eagle's real landing point. +x is east, +z is south, +y is up.
 * Eagle arrives from the east and flies west (toward -x).
 *
 * Positions are measured on the Lunar Reconnaissance Orbiter image PIA12925
 * ("High Noon at Tranquility Base", NASA/GSFC/Arizona State University), whose scale bar
 * gives 0.533 m per pixel, and cross-checked on PIA12909. Depths are estimates:
 * the set is labelled "Terrain approximated from NASA imagery".
 */

/** The orbital image that is draped on the ground. */
export const ORTHO = {
  /** pixels */
  size: 1400,
  metresPerPixel: 200 / 375,
  /** pixel of the lunar module's descent stage */
  origin: { px: 148, py: 568 },
} as const;

export const pxToWorld = (px: number, py: number) => ({
  x: (px - ORTHO.origin.px) * ORTHO.metresPerPixel,
  z: (py - ORTHO.origin.py) * ORTHO.metresPerPixel,
});

/** World bounds of the orbital image. */
export const ORTHO_BOUNDS = {
  minX: pxToWorld(0, 0).x,
  maxX: pxToWorld(ORTHO.size, 0).x,
  minZ: pxToWorld(0, 0).z,
  maxZ: pxToWorld(0, ORTHO.size).z,
};

export type Crater = { name?: string; x: number; z: number; r: number; depth: number };

const fromPx = (px: number, py: number, rPx: number, depth: number, name?: string): Crater => ({
  ...pxToWorld(px, py),
  r: rPx * ORTHO.metresPerPixel,
  depth,
  name,
});

/** Craters that can be recognised on the image. West Crater is about 180 m across. */
export const CRATERS: Crater[] = [
  { name: 'West Crater', x: 523, z: 102, r: 90, depth: 28 },
  { name: 'Little West', x: 62, z: -2, r: 16, depth: 4 },
  fromPx(455, 170, 24, 5),
  fromPx(578, 490, 24, 5),
  fromPx(785, 378, 26, 5),
  fromPx(340, 430, 18, 3.5),
  fromPx(690, 170, 18, 3.5),
  fromPx(935, 250, 36, 7),
  fromPx(1020, 290, 16, 3),
  fromPx(275, 1050, 20, 4),
  fromPx(730, 1065, 22, 4),
  fromPx(105, 582, 12, 2),
  fromPx(105, 860, 14, 3),
  fromPx(495, 1190, 14, 3),
  fromPx(1215, 175, 20, 4),
  fromPx(575, 825, 12, 2.5),
  fromPx(400, 545, 10, 2),
];

/** Height of the ground in metres. Bowl plus a raised rim for every crater. Deterministic. */
export function groundAt(x: number, z: number): number {
  let y = 0;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) y -= c.depth * (1 - d * d);
    const rim = (d - 1) / 0.28;
    if (d < 2.2) y += c.depth * 0.14 * Math.exp(-rim * rim);
  }
  return y;
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The ground track of the final approach: it crosses the north half of West Crater and ends at the origin. */
export const trackZ = (x: number) => 60 * smooth(60, 420, x);

/** Ground height under the track. */
export const groundOnTrack = (x: number) => groundAt(x, trackZ(x));

/**
 * Stretches of the track where a lander must not touch down: the bowl and boulder apron of
 * West Crater, and Little West. Everything else in reach is smooth mare.
 */
export const ROUGH: { from: number; to: number; what: string }[] = [
  { from: 300, to: 800, what: 'West Crater and its boulder field' },
  { from: 44, to: 82, what: 'Little West crater' },
];

export const isRough = (x: number) => ROUGH.some((r) => x >= r.from && x <= r.to);

/** Where the experiments stand, measured on the same image. Used by the 3D set and the telescope. */
export const SITE = {
  lm: { x: 0, z: 0 },
  /** Laser Ranging Retroreflector */
  lrrr: pxToWorld(152, 607),
  /** Passive Seismic Experiment Package */
  psep: pxToWorld(150, 621),
  flag: { x: -6, z: -7 },
  tv: { x: -15, z: -9 },
} as const;
