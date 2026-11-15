/**
 * Lunar laser ranging, as a pure, deterministic simulation (FR-21, FR-29).
 *
 * The real experiment: aim a laser at a reflector on the Moon and clock how long the light takes to come back.
 * Only a retroreflector sends light back toward where it came from; foil, metal and dust scatter it.
 * The clock reads about 2.5 seconds, and distance = speed of light × time ÷ 2.
 *
 * The aim point is in metres on the orbital image of Tranquility Base (same frame as src/sim/tranquility.ts).
 * No DOM, no three.js, no clock, no randomness.
 */
import type { OutcomeOf } from './outcomes.ts';
import { ORTHO_BOUNDS, SITE } from './tranquility.ts';

/** km/s */
export const LIGHT_SPEED = 299_792.458;
/** Mean distance from the Earth to the Moon, km. */
export const MOON_DISTANCE = 384_400;
/** Seconds for light to go to the Moon and come back. */
export const ROUND_TRIP = (2 * MOON_DISTANCE) / LIGHT_SPEED;

/** What the player measures: distance = c × t ÷ 2. */
export const distanceFor = (seconds: number) => (LIGHT_SPEED * seconds) / 2;

export type Aim = {
  /** metres east of Eagle's descent stage */
  x: number;
  /** metres south of Eagle's descent stage */
  z: number;
  /** magnification, 1 to MAX_ZOOM */
  zoom: number;
};

export const MAX_ZOOM = 9;
/** The telescope starts on the whole site: West Crater in view, the hardware too small to tell apart. */
export const AIM_START: Aim = { x: 260, z: 60, zoom: 1 };
/** The view of the decision: close on the site, so the three places a player can choose are far apart on screen. */
export const AIM_SITE: Aim = { x: 30, z: 8, zoom: 4.2 };
/** How close to a target the laser must point, metres. The mirror and the descent stage are 21 m apart. */
export const HIT_RADIUS = 7;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Moves the aim. `dx`, `dz` are in metres; a higher zoom makes the same hand movement finer. */
export function slew(aim: Aim, dx: number, dz: number): Aim {
  return {
    ...aim,
    x: clamp(aim.x + dx, ORTHO_BOUNDS.minX + 20, ORTHO_BOUNDS.maxX - 20),
    z: clamp(aim.z + dz, ORTHO_BOUNDS.minZ + 20, ORTHO_BOUNDS.maxZ - 20),
  };
}

export const zoomTo = (aim: Aim, zoom: number): Aim => ({ ...aim, zoom: clamp(zoom, 1, MAX_ZOOM) });

/** What the laser hit. Every shot is one of the three outcomes of the puzzle. */
export function judge(aim: Aim): OutcomeOf<'ranging'> {
  if (Math.hypot(aim.x - SITE.lrrr.x, aim.z - SITE.lrrr.z) <= HIT_RADIUS) return 'on-mirror';
  if (Math.hypot(aim.x - SITE.lm.x, aim.z - SITE.lm.z) <= HIT_RADIUS) return 'on-stage';
  return 'on-ground';
}

/** One aim per outcome: what the scripted operator points at in the Accessible view. */
export const AIMS: Record<OutcomeOf<'ranging'>, Aim> = {
  'on-mirror': { x: SITE.lrrr.x, z: SITE.lrrr.z, zoom: 7 },
  'on-stage': { x: SITE.lm.x, z: SITE.lm.z, zoom: 7 },
  // Little West, the small crater Armstrong walked to: bare ground.
  'on-ground': { x: 62, z: -2, zoom: 5 },
};
