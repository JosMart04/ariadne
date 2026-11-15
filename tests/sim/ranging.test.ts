/**
 * Laser ranging: every outcome the puzzle offers can be reached, and the numbers the game teaches are the real ones.
 */
import { describe, expect, it } from 'vitest';
import { SIM_OUTCOMES } from '../../src/sim/outcomes';
import { AIMS, AIM_START, HIT_RADIUS, MAX_ZOOM, ROUND_TRIP, distanceFor, judge, slew, zoomTo } from '../../src/sim/ranging';
import { SITE } from '../../src/sim/tranquility';

describe('laser ranging', () => {
  it('has one scripted aim per outcome', () => {
    expect(Object.keys(AIMS).sort()).toEqual([...SIM_OUTCOMES.ranging].sort());
  });

  it.each(SIM_OUTCOMES.ranging)('the "%s" aim is judged as that outcome', (name) => {
    expect(judge(AIMS[name])).toBe(name);
  });

  it('the starting aim hits bare ground: the player has to find the mirror', () => {
    expect(judge(AIM_START)).toBe('on-ground');
  });

  it('the mirror and the descent stage cannot be confused', () => {
    const gap = Math.hypot(SITE.lrrr.x - SITE.lm.x, SITE.lrrr.z - SITE.lm.z);
    expect(gap).toBeGreaterThan(2 * HIT_RADIUS);
  });

  it('light takes about 2.5 seconds to the Moon and back, and that time gives 384,400 km', () => {
    expect(ROUND_TRIP).toBeGreaterThan(2.5);
    expect(ROUND_TRIP).toBeLessThan(2.6);
    expect(Math.round(distanceFor(ROUND_TRIP))).toBe(384_400);
    // The two wrong answers of the finale are ten times too near and ten times too far.
    expect(distanceFor(ROUND_TRIP / 10)).toBeCloseTo(38_440, 0);
  });

  it('the aim stays on the image and the zoom stays in range', () => {
    const far = slew(AIM_START, 1e6, -1e6);
    expect(Number.isFinite(far.x) && Number.isFinite(far.z)).toBe(true);
    expect(judge(far)).toBe('on-ground');
    expect(zoomTo(AIM_START, 99).zoom).toBe(MAX_ZOOM);
    expect(zoomTo(AIM_START, 0).zoom).toBe(1);
  });
});
