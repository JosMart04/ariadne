/**
 * What the AR gallery offers: one row per machine. Adding a machine is one row here, one row in `sizes.ts`, its texts
 * in `content/ui/shell.yaml` (`ar.<id>.*`) and a run of `tools/derive-models.ts`. The viewer has no code per machine.
 */
import report from './models/models.report.json';
import ingenuityMini from './models/ingenuity-mini.glb?url';
import ingenuityReal from './models/ingenuity-1to1.glb?url';
import opportunityMini from './models/opportunity-mini.glb?url';
import opportunityReal from './models/opportunity-1to1.glb?url';
import { MACHINES, MINIATURE, type MachineId, type MachineSize } from './sizes';

export type Scale = 'mini' | 'real';

export type ArMachine = {
  id: MachineId;
  /** The file of the game that tells this machine's story. */
  episode: string;
  models: Record<Scale, string>;
  size: MachineSize;
  /** Width, height and depth of the real-size model, metres, as measured by the tool that made it. */
  metres: [number, number, number];
  /** "1:4" */
  miniature: string;
  /** Where the camera goes for "Show me": the part the observation task is about (model-viewer's camera-orbit). */
  look: string;
  /**
   * Has a person placed this machine with a real phone and checked its size? Until then the screen says "not yet
   * tried on a phone" instead of promising. Filled from the table in README.md, never from a desktop capture.
   */
  tried: { android: boolean; ios: boolean };
};

type Report = Record<string, { files: Record<string, { metres: [number, number, number] }> }>;
const measured = (id: MachineId) => (report as unknown as Report)[id].files[`${id}-1to1.glb`].metres;
const size = (id: MachineId) => MACHINES.find((m) => m.id === id)!;

export const CATALOG: ArMachine[] = [
  {
    id: 'ingenuity',
    episode: 'e11-ingenuity',
    models: { mini: ingenuityMini, real: ingenuityReal },
    size: size('ingenuity'),
    metres: measured('ingenuity'),
    miniature: `1:${Math.round(1 / MINIATURE.ingenuity)}`,
    look: '25deg 48deg 1.6m',
    tried: { android: true, ios: false },
  },
  {
    id: 'opportunity',
    episode: 'e08-opportunity',
    models: { mini: opportunityMini, real: opportunityReal },
    size: size('opportunity'),
    metres: measured('opportunity'),
    miniature: `1:${Math.round(1 / MINIATURE.opportunity)}`,
    look: '-35deg 70deg 3.2m',
    tried: { android: true, ios: false },
  },
];

export const machineById = (id: string | undefined) => CATALOG.find((m) => m.id === id);

/**
 * The entries of the gallery (on the map, the list and the title). Open to everybody since Sun Nov 15, 21:25: the team
 * placed both machines, miniature and real size, with Android phones (task B-53; iPhone not tried).
 * `false` hides them again except with `?ar` in the address; the direct link `#ar` always opens the gallery.
 */
const OPEN_TO_ALL = true;
export const arEntryVisible = () => OPEN_TO_ALL || (typeof location !== 'undefined' && /[?&]ar\b/.test(location.search));
