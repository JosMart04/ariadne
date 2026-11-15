/**
 * The positions the Orrery draws, checked against published events and distances (FR-70 to FR-73, AC-18).
 * Every expected value is a date or a distance that an observatory or NASA published; none comes from this code.
 */
import { describe, expect, it } from 'vitest';
import content from '../../src/generated/content.json';
import sheet from '../../src/scenes/orrery/cues.json';
import { PLACES, placeOf } from '../../src/scenes/orrery/places.ts';
import { ONE_LIGHT_DAY_AT, ONE_LIGHT_DAY_KM } from '../../src/sim/dsn.ts';
import { marsDistanceKm } from '../../src/sim/meridiani.ts';
import {
  AU_KM,
  PLANETS,
  compress,
  distanceAu,
  fromEarthKm,
  heliocentric,
  kepler,
  keplerLag,
  length,
  lightMinutes,
  lightSeconds,
  longitude,
  moonLongitude,
  onMap,
  orbitOf,
  pathOf,
  pioneer10,
  positionOn,
  smallOrbit,
  sub,
  voyager1,
  type Vec3,
} from '../../src/sim/planets.ts';

const at = (iso: string) => Date.parse(iso);
const angle = (a: Vec3, b: Vec3) => (Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (length(a) * length(b)))) * 180) / Math.PI;
/** Smallest difference between two longitudes, degrees. */
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const TODAY = at('2026-11-15T22:00Z');

describe('planets: the Earth', () => {
  it('is closest to the Sun in early January and farthest in early July', () => {
    // 2026: perihelion Jan. 3, 0.98330 au; aphelion Jul. 6, 1.01664 au.
    expect(length(heliocentric('earth', at('2026-01-03T17:16Z')))).toBeCloseTo(0.9833, 3);
    expect(length(heliocentric('earth', at('2026-07-06T17:31Z')))).toBeCloseTo(1.01664, 3);
  });

  it('goes round the Sun once a year', () => {
    const a = longitude(heliocentric('earth', TODAY));
    const b = longitude(heliocentric('earth', TODAY + 365.256 * 86_400_000));
    expect(apart(a, b)).toBeLessThan(0.05);
  });
});

describe('planets: published events', () => {
  it('Mars, Aug. 27, 2003: the closest in 60,000 years, 55.76 million km', () => {
    const km = distanceAu('earth', 'mars', at('2003-08-27T09:51Z')) * AU_KM;
    expect(Math.abs(km - 55_758_006) / 55_758_006).toBeLessThan(0.01);
  });

  it('Venus, Jun. 6, 2012: in line between the Sun and the Earth (the transit)', () => {
    const t = at('2012-06-06T01:29Z');
    expect(apart(longitude(heliocentric('venus', t)), longitude(heliocentric('earth', t)))).toBeLessThan(0.3);
  });

  it('Jupiter and Saturn, Dec. 21, 2020: a tenth of a degree apart in the sky of the Earth', () => {
    const t = at('2020-12-21T18:20Z');
    const earth = heliocentric('earth', t);
    expect(angle(sub(heliocentric('jupiter', t), earth), sub(heliocentric('saturn', t), earth))).toBeLessThan(0.5);
  });

  it('Eros, Jan. 15, 2019: 0.21 au from the Earth', () => {
    const t = at('2019-01-15T06:00Z');
    expect(length(sub(positionOn(smallOrbit('eros', t)), heliocentric('earth', t)))).toBeCloseTo(0.2086, 2);
  });

  it('Ceres, Oct. 2, 2025: opposite the Sun in the sky of the Earth', () => {
    const t = at('2025-10-02T12:00Z');
    expect(apart(longitude(positionOn(smallOrbit('ceres', t))), longitude(heliocentric('earth', t)))).toBeLessThan(1);
  });
});

describe('planets: one table, two copies', () => {
  it('gives the same distance to Mars as the planning station of E08', () => {
    for (const day of ['2004-01-25', '2018-06-10', '2026-11-15', '2027-02-19', '2035-09-15']) {
      const t = at(`${day}T12:00Z`);
      expect(distanceAu('earth', 'mars', t) * AU_KM).toBeCloseTo(marsDistanceKm(t), 0);
    }
  });

  it('light crosses 1 au in 8.3 minutes', () => {
    expect(lightMinutes(1)).toBeCloseTo(8.317, 2);
  });
});

describe('planets: every world stays on its orbit', () => {
  it('keeps each planet between its nearest and farthest point', () => {
    for (const p of PLANETS) {
      const o = orbitOf(p, TODAY);
      const r = length(heliocentric(p, TODAY));
      expect(r).toBeGreaterThanOrEqual(o.a * (1 - o.e) - 1e-9);
      expect(r).toBeLessThanOrEqual(o.a * (1 + o.e) + 1e-9);
    }
  });

  it('draws an orbit that passes through the planet', () => {
    for (const p of PLANETS) {
      const o = orbitOf(p, TODAY);
      const here = positionOn(o);
      const nearest = Math.min(...pathOf(o, 720).map((q) => length(sub(q, here))));
      expect(nearest).toBeLessThan(o.a * 0.01);
    }
  });

  it('is deterministic', () => {
    expect(heliocentric('mars', TODAY)).toEqual(heliocentric('mars', TODAY));
  });

  it('keeps the Moon on a circle of 360 degrees', () => {
    const lon = moonLongitude(TODAY);
    expect(lon).toBeGreaterThanOrEqual(0);
    expect(lon).toBeLessThan(360);
    // One lap against the stars: 27.32 days.
    expect(apart(lon, moonLongitude(TODAY + 27.321661 * 86_400_000))).toBeLessThan(0.01);
  });
});

describe('planets: three machines that are on no world (approximate)', () => {
  it('puts Voyager 1 one light-day away on Nov. 18, 2026, 35 degrees north of the planets', () => {
    const v = voyager1(ONE_LIGHT_DAY_AT);
    expect(v.au * AU_KM).toBeCloseTo(ONE_LIGHT_DAY_KM, -3);
    expect((Math.asin(v.pos[2] / length(v.pos)) * 180) / Math.PI).toBeCloseTo(35, 5);
    expect(v.approximate).toBe(true);
  });

  it('puts Pioneer 10 where NASA last heard it in 2003, and farther every year', () => {
    expect(pioneer10(Date.UTC(2003, 0, 23)).au * AU_KM).toBeCloseTo(12.2e9, -8);
    expect(pioneer10(TODAY).au).toBeGreaterThan(130);
    expect(pioneer10(TODAY).au).toBeLessThan(voyager1(TODAY).au);
  });

  it('puts Kepler on the path of the Earth, behind it, a little further every year', () => {
    expect(kepler(TODAY).au).toBeCloseTo(length(heliocentric('earth', TODAY)), 6);
    expect(keplerLag(TODAY)).toBeGreaterThan(110);
    expect(keplerLag(TODAY)).toBeLessThan(140);
    expect(keplerLag(TODAY + 365.25 * 86_400_000) - keplerLag(TODAY)).toBeCloseTo(7, 0);
  });
});

describe('planets: the scale of the map', () => {
  it('never draws a farther body nearer', () => {
    let last = -1;
    for (const au of [0, 0.1, 0.39, 1, 1.52, 2.77, 5.2, 9.5, 19.2, 30, 140, 173]) {
      expect(compress(au)).toBeGreaterThan(last);
      last = compress(au);
    }
  });

  it('keeps every body in its true direction', () => {
    const p = heliocentric('jupiter', TODAY);
    expect(angle(onMap(p), p)).toBeLessThan(1e-6);
    expect(length(onMap(p))).toBeCloseTo(compress(length(p)), 9);
  });
});

describe('the map: where the sixteen machines rest', () => {
  const ids = (content as { threadOrder: string[] }).threadOrder;

  it('gives every machine a place, so none is missing from the map', () => {
    expect(ids).toHaveLength(16);
    for (const id of ids) expect(placeOf(id), id).toBeDefined();
  });

  it('puts four on the Moon, seven on Mars, and one at each of the other five places', () => {
    const count = (place: string) => ids.filter((id) => placeOf(id) === place).length;
    expect(count('moon')).toBe(4);
    expect(count('mars')).toBe(7);
    for (const place of PLACES) if (place !== 'moon' && place !== 'mars') expect(count(place), place).toBe(1);
  });

  it('declares every machine and every place as a hotspot of the Orrery', () => {
    for (const name of [...ids, ...PLACES]) expect(sheet.hotspots, name).toContain(name);
  });
});

describe('planets: how far from home', () => {
  it('gives Mars the same distance as the planning station of E08', () => {
    expect(fromEarthKm('mars', TODAY)).toEqual({ km: distanceAu('earth', 'mars', TODAY) * AU_KM, kind: 'computed' });
    expect(fromEarthKm('mars', TODAY).km).toBeCloseTo(marsDistanceKm(TODAY), 0);
  });

  it('gives the Moon its average distance and says it is an average', () => {
    expect(fromEarthKm('moon', TODAY)).toEqual({ km: 384_400, kind: 'average' });
    expect(lightSeconds(384_400)).toBeCloseTo(1.28, 2);
  });

  it('gives Voyager 1 the distance of NASA: one light-day on Nov. 18, 2026', () => {
    const v = fromEarthKm('voyager', ONE_LIGHT_DAY_AT);
    expect(v.kind).toBe('nasa');
    expect(lightSeconds(v.km) / 3600).toBeCloseTo(24, 1);
  });

  it('keeps every other place within what its orbit allows, and marks the guesses', () => {
    const au = (place: Parameters<typeof fromEarthKm>[0]) => fromEarthKm(place, TODAY).km / AU_KM;
    expect(au('eros')).toBeGreaterThan(0.1);
    expect(au('eros')).toBeLessThan(2.8);
    expect(au('ceres')).toBeGreaterThan(1.5);
    expect(au('ceres')).toBeLessThan(4.1);
    expect(au('kepler')).toBeLessThan(2.04);
    expect(fromEarthKm('kepler', TODAY).kind).toBe('approximate');
    expect(fromEarthKm('pioneer', TODAY).kind).toBe('approximate');
  });
});
