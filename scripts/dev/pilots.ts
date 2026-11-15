/** Dev helper: prints how each scripted pilot of the descent ends. Run: npx tsx scripts/dev/pilots.ts */
import { PILOTS, fly } from '../../src/sim/descent.ts';

for (const [name, pilot] of Object.entries(PILOTS)) {
  const e = fly(pilot);
  console.log(name.padEnd(13), e.phase.padEnd(7), 't', e.t.toFixed(1), 'x', e.x.toFixed(1), 'fuel', e.fuel.toFixed(1));
}
