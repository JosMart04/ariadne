/** Prints the numbers of the Meridiani simulation: npx tsx scripts/dev/meridiani.ts */
import { PLAN_START, ROVER_START, SPOTS, distance, height, lightMinutes, marsDistanceKm, minSec, park, sunlight, tiltToSun } from '../../src/sim/meridiani.ts';

for (const [name, p] of Object.entries({ ...SPOTS, start: ROVER_START, plan: PLAN_START }))
  console.log(name.padEnd(10), `h=${height(p.x, p.z).toFixed(1)} m`, `tilt=${tiltToSun(p).toFixed(1)}°`, `light=${Math.round(sunlight(p) * 100)}%`, `dist=${Math.round(distance(p))} m`, park(p));
for (const d of ['2018-06-10', '2026-11-15', '2026-11-18', '2027-02-19', '2027-12-01'])
  console.log(d, `${(marsDistanceKm(Date.parse(d)) / 1e6).toFixed(1)} million km`, minSec(lightMinutes(Date.parse(d))));
