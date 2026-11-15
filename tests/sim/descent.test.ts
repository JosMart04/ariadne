/**
 * The descent simulation is deterministic, and every outcome the puzzle offers can really be flown
 * (FR-21, FR-29, NFR-05). The same scripted pilots fly the Accessible view and "Let the machine show you".
 */
import { describe, expect, it } from 'vitest';
import { DT, MAX_DRIFT, MAX_SINK, PILOTS, START, STEADY_BELOW, altitude, fly, outcome, step, type DescentState } from '../../src/sim/descent';
import { SIM_OUTCOMES } from '../../src/sim/outcomes';
import { groundAt, isRough } from '../../src/sim/tranquility';

describe('descent simulation', () => {
  it('has one scripted pilot per outcome', () => {
    expect(Object.keys(PILOTS).sort()).toEqual([...SIM_OUTCOMES.descent].sort());
  });

  it.each(SIM_OUTCOMES.descent)('the "%s" pilot ends in that outcome', (name) => {
    const end = fly(PILOTS[name]);
    expect(end.phase).not.toBe('flying');
    expect(outcome(end)).toBe(name);
  });

  it('is deterministic: the same inputs give the same flight', () => {
    const a = fly(PILOTS['landed-safe']);
    const b = fly(PILOTS['landed-safe']);
    expect(a).toEqual(b);
  });

  it('the machine lands the way Armstrong did: gently, beyond the crater, with fuel to spare', () => {
    const end = fly(PILOTS['landed-safe']);
    expect(Math.abs(end.x)).toBeLessThan(12);
    expect(isRough(end.x)).toBe(false);
    expect(end.fuel).toBeGreaterThan(15);
    expect(end.fuel).toBeLessThan(80);
    expect(end.t).toBeGreaterThan(40);
    expect(end.t).toBeLessThan(95);
  });

  it('never touches down faster than the legs allow when the machine flies', () => {
    let s: DescentState = START;
    let last = s;
    while (s.phase === 'flying') {
      last = s;
      s = step(s, PILOTS['landed-safe'](s));
    }
    expect(-last.vy).toBeLessThanOrEqual(MAX_SINK);
    expect(Math.abs(last.vx)).toBeLessThanOrEqual(MAX_DRIFT);
  });

  it('a hard touchdown is not an outcome: the view teaches and retries (FR-29a)', () => {
    let s: DescentState = { ...START, sink: 6, vy: -6 };
    while (s.phase === 'flying') s = step(s, { pitch: 0, rod: 1 }, DT);
    expect(s.phase).toBe('hard');
    expect(s.miss).toBe('sink');
    expect(s.hitSink).toBeGreaterThan(MAX_SINK);
    expect(outcome(s)).toBeNull();
  });

  it('says why: soft but still moving over the ground is "drift", not "sink"', () => {
    // The player who does nothing at all: a gentle descent, but 14 m/s forward.
    let s: DescentState = START;
    while (s.phase === 'flying') s = step(s, { pitch: 0, rod: 0 }, DT);
    expect(s.phase).toBe('hard');
    expect(s.miss).toBe('drift');
    expect(s.hitSink).toBeLessThanOrEqual(MAX_SINK);
  });

  it('can be won by a beginner: wait past the crater, hold the brake, let go', () => {
    // No descent-rate clicks at all. Brake only when the smooth ground is ahead; the computer steadies the rest.
    let s: DescentState = START;
    while (s.phase === 'flying') s = step(s, { pitch: s.x < 300 && Math.abs(s.vx) > STEADY_BELOW - 0.4 ? -1 : 0, rod: 0 }, DT);
    expect(s.phase).toBe('landed');
    expect(outcome(s)).toBe('landed-safe');
  });

  it('the starting descent is inside the limit: doing nothing never breaks the legs by itself', () => {
    expect(START.sink).toBeLessThan(MAX_SINK);
    expect(-START.vy).toBeLessThan(MAX_SINK);
  });

  it('starts high above the ground, east of West Crater', () => {
    expect(altitude(START)).toBeGreaterThan(100);
    expect(groundAt(523, 102)).toBeLessThan(-20);
  });
});
