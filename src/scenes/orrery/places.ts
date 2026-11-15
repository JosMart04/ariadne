/**
 * Where each of the sixteen machines rests today. Pure data: the Orrery set, the map screen and a test read it.
 * Keyed by the episode number, so renaming a file never loses a machine.
 */
export const PLACES = ['moon', 'mars', 'eros', 'ceres', 'kepler', 'pioneer', 'voyager'] as const;
export type Place = (typeof PLACES)[number];

const BY_EPISODE: Record<string, Place> = {
  // Four on the Moon.
  e01: 'moon',
  e02: 'moon',
  e03: 'moon',
  e04: 'moon',
  // Seven on Mars.
  e05: 'mars',
  e06: 'mars',
  e07: 'mars',
  e08: 'mars',
  e09: 'mars',
  e10: 'mars',
  e11: 'mars',
  // Pioneer 10 and 11 left in opposite directions; the map marks Pioneer 10.
  e12: 'pioneer',
  // NEAR Shoemaker rests on the asteroid Eros.
  e13: 'eros',
  // Kepler follows the Earth round the Sun, a little further behind every year.
  e14: 'kepler',
  // Dawn still goes round the dwarf planet Ceres.
  e15: 'ceres',
  e16: 'voyager',
};

export const placeOf = (episodeId: string): Place | undefined => BY_EPISODE[episodeId.slice(0, 3)];

/** A place whose position on the map is not computed from an ephemeris. The screen must say "approximate". */
export const APPROXIMATE: readonly Place[] = ['kepler', 'pioneer', 'voyager'];
