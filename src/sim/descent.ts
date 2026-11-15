/**
 * Eagle's final approach, as a pure, deterministic simulation (FR-21, FR-29, FR-63).
 *
 * It copies the real control loop of Apollo's last landing program, P66:
 *  - the pilot tilts the lander with the attitude controller to speed up or brake;
 *  - each click of the Rate Of Descent switch changes the commanded sink rate by 1 foot per second;
 *  - the computer works the throttle to hold that sink rate.
 *
 * No DOM, no three.js, no clock, no randomness: `step` is a function of (state, controls).
 * The same code runs the player's flight, the scripted pilots of the Accessible view,
 * "Let the machine show you", and the tests.
 */
import type { OutcomeOf } from './outcomes.ts';
import { groundOnTrack, isRough } from './tranquility.ts';

export const DT = 1 / 60;

/** Lunar gravity, m/s². */
export const G = 1.62;
/** One click of the Rate Of Descent switch: 1 ft/s. */
export const ROD_CLICK = 0.3048;
const MAX_PITCH = (18 * Math.PI) / 180;
/** The lunar module turns slowly: radians per second. */
const PITCH_RATE = (10 * Math.PI) / 180;
/** Gentle enough for the landing legs: metres per second. */
export const MAX_SINK = 3;
export const MAX_DRIFT = 2;

export type DescentControls = {
  /** -1 brakes (tilt back), +1 speeds up along the track (tilt forward). */
  pitch: number;
  /** Rate Of Descent clicks this step: +1 sinks faster, -1 sinks slower, 0 none. */
  rod: -1 | 0 | 1;
};

export type DescentPhase = 'flying' | 'landed' | 'rough' | 'hard' | 'empty';

export type DescentState = {
  /** seconds since the pilot took over */
  t: number;
  /** metres east of the real landing point; the flight goes toward smaller x */
  x: number;
  /** metres above the datum (not above the ground: see `altitude`) */
  y: number;
  /** m/s; negative is westward, along the track */
  vx: number;
  /** m/s; positive is up */
  vy: number;
  /** radians; positive tilts the engine to push the lander along the track */
  pitch: number;
  /** commanded sink rate, m/s, positive down */
  sink: number;
  /** seconds of hovering thrust left */
  fuel: number;
  /** thrust as a fraction of hover thrust, for the plume, the sound and the dust */
  thrust: number;
  phase: DescentPhase;
};

export const START: DescentState = {
  t: 0,
  x: 790,
  y: 150,
  vx: -14,
  vy: -3.4,
  pitch: 0,
  sink: 3.4,
  fuel: 112,
  thrust: 1,
  phase: 'flying',
};

/** Height above the ground right below the lander. */
export const altitude = (s: DescentState) => s.y - groundOnTrack(s.x);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function step(s: DescentState, c: DescentControls, dt = DT): DescentState {
  if (s.phase !== 'flying') return s;

  const sink = clamp(s.sink + c.rod * ROD_CLICK, -1.5, 6);
  const want = clamp(c.pitch, -1, 1) * MAX_PITCH;
  const pitch = s.pitch + clamp(want - s.pitch, -PITCH_RATE * dt, PITCH_RATE * dt);

  // The computer holds the commanded sink rate with the throttle.
  const ay = clamp((-sink - s.vy) * 1.4, -1.3, 2.2);
  const lift = G + ay;
  const ax = -lift * Math.tan(pitch);
  const thrust = lift / Math.cos(pitch) / G;

  const vx = s.vx + ax * dt;
  const vy = s.vy + ay * dt;
  const x = s.x + vx * dt;
  const y = s.y + vy * dt;
  const fuel = s.fuel - thrust * dt;
  const next: DescentState = { t: s.t + dt, x, y, vx, vy, pitch, sink, fuel, thrust, phase: 'flying' };

  const ground = groundOnTrack(x);
  if (y <= ground) {
    next.y = ground;
    next.thrust = 0;
    if (-vy > MAX_SINK || Math.abs(vx) > MAX_DRIFT) next.phase = 'hard';
    else next.phase = isRough(x) ? 'rough' : 'landed';
    next.vx = 0;
    next.vy = 0;
    return next;
  }
  if (fuel <= 0) {
    next.fuel = 0;
    next.thrust = 0;
    next.phase = 'empty';
  }
  return next;
}

/**
 * What the flight means for the puzzle. A touchdown that is too hard is not an outcome:
 * the view teaches the limit and lets the player try again from a point nearby (FR-29a).
 */
export function outcome(s: DescentState): OutcomeOf<'descent'> | null {
  if (s.phase === 'landed') return 'landed-safe';
  if (s.phase === 'rough') return 'rough-ground';
  if (s.phase === 'empty') return 'out-of-fuel';
  return null;
}

// ---------- Scripted pilots ----------

export type Pilot = (s: DescentState) => DescentControls;

/** One Rate Of Descent click at most every quarter of a second, so the scripts fly like a hand would. */
const clickNow = (s: DescentState) => Math.floor(s.t / 0.25) !== Math.floor((s.t - DT) / 0.25);

function flyTo(goalX: number, opts: { hover?: number; creep?: number } = {}): Pilot {
  return (s) => {
    const off = s.x - goalX;
    const ahead = Math.abs(off);
    // Close the distance at a speed that shrinks with it; a creeping pilot keeps drifting along the track.
    const wantVx = opts.creep !== undefined && off < 4 ? -opts.creep : -Math.sign(off) * Math.min(14, 0.075 * ahead);
    const pitch = clamp(-(wantVx - s.vx) * 0.55, -1, 1);

    const agl = altitude(s);
    const floor = opts.hover ?? 7;
    const path = Math.min(150, floor + 0.21 * ahead);
    const arrived = ahead < 5 && Math.abs(s.vx) < 0.9;
    // Until it is over the spot, the pilot holds the glide path. Then it lets the lander settle.
    const wantSink = opts.hover === undefined && arrived ? 0.9 : clamp((agl - path) * 0.4, -1.2, 4);

    let rod: -1 | 0 | 1 = 0;
    if (clickNow(s)) {
      if (wantSink - s.sink > 0.16) rod = 1;
      else if (wantSink - s.sink < -0.16) rod = -1;
    }
    return { pitch, rod };
  };
}

/**
 * The three ways the last minute could have gone. Each one is a choice of the puzzle,
 * and each one ends in the outcome the puzzle expects (checked by tests/sim).
 */
export const PILOTS = {
  /** What Armstrong did: fly long, over the crater, and land on the smooth ground beyond. */
  'landed-safe': flyTo(0),
  /** Stay on the computer's path: it ends just short of West Crater, in the boulder field. */
  'rough-ground': flyTo(640),
  /** Slow down and hunt for a gap among the rocks until the tanks run low. */
  'out-of-fuel': flyTo(318, { hover: 24, creep: 0.35 }),
} satisfies Record<OutcomeOf<'descent'>, Pilot>;

/** Runs a pilot to the end. Deterministic. `maxSeconds` only guards against a broken script. */
export function fly(pilot: Pilot, from: DescentState = START, maxSeconds = 240): DescentState {
  let s = from;
  for (let i = 0; i < maxSeconds / DT && s.phase === 'flying'; i++) s = step(s, pilot(s));
  return s;
}
