/**
 * Talking to Voyager 1 through a 70-metre antenna of the Deep Space Network, as a pure, deterministic
 * simulation (FR-21, FR-29, FR-60).
 *
 * The real control loop: the antenna is pointed with predicted coordinates (azimuth and elevation), it locks on a
 * signal that left the spacecraft almost a day ago, and every command takes almost a day to arrive.
 * Nobody steers Voyager with a joystick.
 *
 * The coordinates here are illustrative (the real ones change every minute with the Earth's rotation); the
 * distance and the light time are the real ones.
 */
import type { OutcomeOf } from './outcomes.ts';

/** Where the dish points, in degrees. Azimuth: 0 north, 90 east. Elevation: 0 horizon, 90 straight up. */
export type Pointing = { az: number; el: number };

/** The predicted position of Voyager 1 in tonight's sky of the game. */
export const VOYAGER: Pointing = { az: 214, el: 38 };
/** A bright planet: easy to see, and silent on Voyager's frequency. */
export const PLANET: Pointing = { az: 148, el: 54 };
/** Where the dish rests when the operator sits down. */
export const POINT_START: Pointing = { az: 180, el: 72 };
/** How close the dish must point to hear Voyager, degrees. The real beam is far narrower; this is a game tolerance. */
export const LOCK = 4;

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Unit vector of a pointing. x east, y up, z south (north is -z), the frame of every set. */
export function direction(p: Pointing): [number, number, number] {
  const c = Math.cos(rad(p.el));
  return [Math.sin(rad(p.az)) * c, Math.sin(rad(p.el)), -Math.cos(rad(p.az)) * c];
}

/** Angle between two pointings, degrees. */
export function separation(a: Pointing, b: Pointing): number {
  const u = direction(a);
  const v = direction(b);
  return (Math.acos(clamp(u[0] * v[0] + u[1] * v[1] + u[2] * v[2], -1, 1)) * 180) / Math.PI;
}

/** Turns the dish. It cannot point below 6 degrees or past straight up. */
export function turn(p: Pointing, dAz: number, dEl: number): Pointing {
  return { az: (((p.az + dAz) % 360) + 360) % 360, el: clamp(p.el + dEl, 6, 88) };
}

/** Signal strength, 0 to 1: rises as the dish closes on Voyager. What the console's meter shows. */
export const signal = (p: Pointing) => clamp(1 - separation(p, VOYAGER) / 30, 0, 1);

/** What the dish hears. Every pointing is one of the three outcomes of the puzzle. */
export function listen(p: Pointing): OutcomeOf<'dsn'> {
  if (separation(p, VOYAGER) <= LOCK) return 'on-voyager';
  if (separation(p, PLANET) <= LOCK) return 'on-planet';
  return 'on-empty';
}

/** One pointing per outcome: what the scripted operator does in the Accessible view. */
export const POINTINGS: Record<OutcomeOf<'dsn'>, Pointing> = {
  'on-voyager': VOYAGER,
  'on-planet': PLANET,
  'on-empty': { az: 262, el: 64 },
};

// ---------- Distance is time ----------

/** km/s */
const LIGHT_SPEED = 299_792.458;
/** NASA: on Nov. 18, 2026, at 10:16 UTC, Voyager 1 is 25.902 billion km from Earth: one light-day. */
export const ONE_LIGHT_DAY_AT = Date.UTC(2026, 10, 18, 10, 16);
export const ONE_LIGHT_DAY_KM = 25.902e9;
/** Voyager 1 recedes at about 17 km/s. The Earth's own orbit adds a yearly wobble that this ignores. */
const RECEDING = 17;

/** Distance from Earth, km, for a date. Good to about one percent. */
export const distanceKm = (when: number) => ONE_LIGHT_DAY_KM + ((when - ONE_LIGHT_DAY_AT) / 1000) * RECEDING;

/** Hours a radio signal needs, one way, on that date. */
export const lightHours = (when: number) => distanceKm(when) / LIGHT_SPEED / 3600;

/** Where today falls around the day Voyager 1 reaches one light-day: the copy changes with it (A-D14). */
export function lightDayMoment(when: number): 'before' | 'today' | 'after' {
  const days = (when - ONE_LIGHT_DAY_AT) / 86_400_000;
  return days < -0.5 ? 'before' : days > 0.5 ? 'after' : 'today';
}
