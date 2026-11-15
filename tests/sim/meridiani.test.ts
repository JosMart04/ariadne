/**
 * Planning a sol of Opportunity: every outcome can be reached by the same rule in every way of playing,
 * and the light time it shows agrees with distances NASA has published.
 */
import { describe, expect, it } from 'vitest';
import { NEED, PLAN_START, REACH, ROVER_START, SLOPE_MIN, SPOTS, distance, height, lightMinutes, marsDistanceKm, minSec, move, park, shadowed, sunlight, tiltToSun } from '../../src/sim/meridiani';
import { SIM_OUTCOMES } from '../../src/sim/outcomes';

describe('meridiani: where the rover parks', () => {
  it('has one scripted waypoint per outcome', () => {
    expect(Object.keys(SPOTS).sort()).toEqual([...SIM_OUTCOMES.traverse].sort());
  });

  it.each(SIM_OUTCOMES.traverse)('the "%s" waypoint is judged as that outcome, and one sequence can reach it', (name) => {
    expect(park(SPOTS[name])).toBe(name);
    expect(distance(SPOTS[name])).toBeLessThan(REACH);
  });

  it('the scripted waypoints are not on a knife edge: a few metres around them give the same outcome', () => {
    for (const name of SIM_OUTCOMES.traverse)
      for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) expect(park({ x: SPOTS[name].x + dx, z: SPOTS[name].z + dz })).toBe(name);
  });

  it('the rover and the first waypoint are on the open plain: the operator has to plan', () => {
    expect(park(ROVER_START)).toBe('on-flat');
    expect(park(PLAN_START)).toBe('on-flat');
  });

  it('a slope that faces the Sun gets clearly more light than flat ground, and enough for the winter', () => {
    const slope = sunlight(SPOTS['on-slope']);
    const flat = sunlight(SPOTS['on-flat']);
    expect(tiltToSun(SPOTS['on-slope'])).toBeGreaterThan(SLOPE_MIN);
    expect(slope).toBeGreaterThan(NEED);
    expect(flat).toBeLessThan(NEED);
    expect(slope / flat).toBeGreaterThan(1.4);
  });

  it('in the shadow of the crater wall there is no light at all', () => {
    expect(shadowed(SPOTS['in-shadow'])).toBe(true);
    expect(sunlight(SPOTS['in-shadow'])).toBe(0);
  });

  it('every place within reach is one of the three outcomes (FR-29)', () => {
    const seen = new Set<string>();
    for (let x = -130; x <= 180; x += 7) for (let z = -140; z <= 170; z += 7) seen.add(park(move({ x, z }, 0, 0)));
    expect([...seen].sort()).toEqual([...SIM_OUTCOMES.traverse].sort());
  });

  it('a waypoint never leaves the reach of one sequence', () => {
    expect(distance(move(PLAN_START, 900, -900))).toBeCloseTo(REACH, 5);
    expect(move(PLAN_START, 5, -5)).toEqual({ x: PLAN_START.x + 5, z: PLAN_START.z - 5 });
  });

  it('the crater is a bowl with a raised rim', () => {
    expect(height(0, -70)).toBeCloseTo(-9, 0);
    expect(height(42, -70)).toBeGreaterThan(3);
    expect(Math.abs(height(160, 100))).toBeLessThan(0.3);
  });
});

describe('meridiani: distance is time', () => {
  // Close approaches of Mars, as NASA publishes them (science.nasa.gov, "Mars Close Approach").
  // The estimate uses JPL's approximate elements, so 1.5 % is a generous but honest tolerance.
  it.each([
    ['2003-08-27', 55.76e6],
    ['2018-07-31', 57.6e6],
    ['2020-10-06', 62.07e6],
    ['2022-12-01', 81.5e6],
  ])('on %s Mars was about %d km away', (day, km) => {
    const got = marsDistanceKm(Date.parse(`${day}T12:00:00Z`));
    expect(Math.abs(got - km) / km).toBeLessThan(0.015);
  });

  // Away from close approach: one-way light times NASA gave for its own landings.
  it.each([
    ['2012-08-06', 13.8, 'Curiosity'],
    ['2018-11-26', 8.1, 'InSight'],
    ['2021-02-18', 11.37, 'Perseverance'],
  ])('on %s a signal needed about %d minutes (%s landing)', (day, minutes) => {
    expect(Math.abs(lightMinutes(Date.parse(`${day}T20:00:00Z`)) - minutes) / minutes).toBeLessThan(0.02);
  });

  it('the wait is always minutes, never seconds and never hours', () => {
    for (let d = Date.UTC(2026, 0, 1); d < Date.UTC(2029, 0, 1); d += 86_400_000 * 11) {
      const m = lightMinutes(d);
      expect(m).toBeGreaterThan(3);
      expect(m).toBeLessThan(22.5);
    }
  });

  it('prints a wait people can read', () => {
    expect(minSec(9.5)).toBe('9 min 30 s');
    expect(minSec(11.37)).toBe('11 min 22 s');
  });
});
