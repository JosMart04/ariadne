/**
 * The real size of each machine of the AR gallery, with the page that says so. Pure data: the tool that makes the AR
 * models scales by it, the test measures the models against it, and the viewer shows it.
 *
 * One published dimension sets the scale (`reference`); the others (`check`) are only compared, and the difference is
 * reported on screen, never hidden: a model can be right in one dimension and off in another.
 * Every figure below was read on its page on Nov. 15, 2026.
 */
export type MachineId = 'ingenuity' | 'opportunity';

export type MachineSize = {
  id: MachineId;
  /** The model the game ships, in public/assets/models/. Read, never written. */
  source: string;
  /** The dimension that sets the scale. `part`: what the names of the measured parts contain, for `span`. */
  reference: { kind: 'span' | 'height' | 'width'; part?: string; metres: number; says: string; url: string };
  /** Other published dimensions, compared only. `depth` is the shorter side of the footprint. */
  check?: { height?: number; depth?: number; says: string; url: string };
};

export const MACHINES: MachineSize[] = [
  {
    id: 'ingenuity',
    source: 'mdl_ingenuity.glb',
    reference: {
      kind: 'span',
      part: 'rotors',
      metres: 1.2,
      says: 'Total length of rotors: approximately 4 feet (approximately 1.2 meters) tip to tip',
      url: 'https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/',
    },
  },
  {
    id: 'opportunity',
    source: 'mdl_mer_b.glb',
    reference: {
      kind: 'width',
      metres: 2.3,
      says: 'Quick Facts, rover dimensions: 4.9 feet high by 7.5 feet (2.3 meters) wide by 5.2 feet long',
      url: 'https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf',
    },
    check: {
      height: 1.5,
      depth: 1.6,
      says: 'Quick Facts, rover dimensions: 4.9 feet (1.5 meters) high, 5.2 feet (1.6 meters) long',
      url: 'https://www.jpl.nasa.gov/news/press_kits/merlandings.pdf',
    },
  },
];

/** How much smaller the miniature is: it has to fit on a table. */
export const MINIATURE: Record<MachineId, number> = { ingenuity: 1 / 4, opportunity: 1 / 10 };
