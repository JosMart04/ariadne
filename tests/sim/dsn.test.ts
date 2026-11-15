/**
 * The Deep Space Network simulation: every outcome can be reached, and the numbers it teaches are NASA's.
 */
import { describe, expect, it } from 'vitest';
import { LOCK, ONE_LIGHT_DAY_AT, PLANET, POINTINGS, POINT_START, VOYAGER, lightDayMoment, lightHours, listen, separation, signal, turn } from '../../src/sim/dsn';
import { SIM_OUTCOMES } from '../../src/sim/outcomes';

describe('deep space network', () => {
  it('has one scripted pointing per outcome', () => {
    expect(Object.keys(POINTINGS).sort()).toEqual([...SIM_OUTCOMES.dsn].sort());
  });

  it.each(SIM_OUTCOMES.dsn)('the "%s" pointing is heard as that outcome', (name) => {
    expect(listen(POINTINGS[name])).toBe(name);
  });

  it('the dish starts off target: the operator has to point it', () => {
    expect(listen(POINT_START)).toBe('on-empty');
  });

  it('Voyager and the planet cannot be confused', () => {
    expect(separation(VOYAGER, PLANET)).toBeGreaterThan(2 * LOCK);
  });

  it('the signal meter rises all the way to the lock', () => {
    expect(signal(VOYAGER)).toBe(1);
    expect(signal(POINT_START)).toBeLessThan(signal(turn(POINT_START, 20, -20)));
  });

  it('the dish never points below the horizon limit, and azimuth wraps', () => {
    expect(turn({ az: 350, el: 10 }, 20, -50)).toEqual({ az: 10, el: 6 });
  });

  it('on Nov. 18, 2026 a signal needs 24 hours, one way (NASA: one light-day)', () => {
    expect(lightHours(ONE_LIGHT_DAY_AT)).toBeCloseTo(24, 1);
    expect(lightHours(Date.UTC(2026, 10, 15))).toBeLessThan(24);
    expect(lightHours(Date.UTC(2027, 10, 18))).toBeGreaterThan(24.3);
  });

  it('the copy knows whether the day is still ahead, today, or behind us (A-D14)', () => {
    expect(lightDayMoment(Date.UTC(2026, 10, 15, 12))).toBe('before');
    expect(lightDayMoment(Date.UTC(2026, 10, 18, 12))).toBe('today');
    expect(lightDayMoment(Date.UTC(2026, 11, 25))).toBe('after');
  });
});
