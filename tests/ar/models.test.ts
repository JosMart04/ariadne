/**
 * The AR models are measured on every push: "real size" on a phone is only as true as these files (FR-55).
 * Each file is opened as plain binary glTF, every vertex is put where the file says it goes, and the result is compared
 * with the dimension NASA publishes (`src/screens/ar/sizes.ts`). No browser and no 3D library needed: the files carry
 * no Draco, which is itself one of the things checked.
 */
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MACHINES, MINIATURE } from '../../src/screens/ar/sizes.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODELS = join(ROOT, 'src', 'screens', 'ar', 'models');

type Node = { name?: string; children?: number[]; mesh?: number; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] };
type Gltf = {
  extensionsRequired?: string[];
  extensionsUsed?: string[];
  images?: { mimeType?: string }[];
  scenes: { nodes: number[] }[];
  nodes: Node[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  accessors: { bufferView: number; byteOffset?: number; count: number }[];
  bufferViews: { byteOffset?: number; byteStride?: number }[];
};
type Cloud = { path: string; points: Vector3[] };

/** Every vertex of a binary glTF, in metres, grouped by the mesh it belongs to. */
function open(file: string): { json: Gltf; clouds: Cloud[] } {
  const b = readFileSync(join(MODELS, file));
  const jsonLength = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLength).toString('utf8')) as Gltf;
  const bin = b.subarray(20 + jsonLength + 8);
  const clouds: Cloud[] = [];
  const walk = (index: number, parent: Matrix4, path: string) => {
    const n = json.nodes[index];
    const local = n.matrix
      ? new Matrix4().fromArray(n.matrix)
      : new Matrix4().compose(new Vector3(...(n.translation ?? [0, 0, 0])), new Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new Vector3(...(n.scale ?? [1, 1, 1])));
    const world = parent.clone().multiply(local);
    const here = `${path}/${n.name ?? ''}`;
    if (n.mesh !== undefined) {
      const points: Vector3[] = [];
      for (const p of json.meshes[n.mesh].primitives) {
        const a = json.accessors[p.attributes.POSITION];
        const view = json.bufferViews[a.bufferView];
        const start = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
        const stride = view.byteStride ?? 12;
        for (let i = 0; i < a.count; i++) points.push(new Vector3(bin.readFloatLE(start + i * stride), bin.readFloatLE(start + i * stride + 4), bin.readFloatLE(start + i * stride + 8)).applyMatrix4(world));
      }
      clouds.push({ path: here, points });
    }
    for (const c of n.children ?? []) walk(c, world, here);
  };
  for (const r of json.scenes[0].nodes) walk(r, new Matrix4(), '');
  return { json, clouds };
}

function box(points: Vector3[]) {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of points) {
    min.min(p);
    max.max(p);
  }
  return { min, max, size: max.clone().sub(min) };
}

/** Twice the distance from the upright line through the middle of a part to its farthest vertex: a rotor's span. */
function span(points: Vector3[]) {
  const b = box(points);
  const cx = (b.min.x + b.max.x) / 2;
  const cz = (b.min.z + b.max.z) / 2;
  return 2 * Math.max(...points.map((p) => Math.hypot(p.x - cx, p.z - cz)));
}

const report = JSON.parse(readFileSync(join(MODELS, 'models.report.json'), 'utf8')) as Record<string, { sourceSha256: string }>;

describe.each(MACHINES)('AR model of $id', (m) => {
  const real = open(`${m.id}-1to1.glb`);
  const mini = open(`${m.id}-mini.glb`);
  const all = (g: typeof real) => g.clouds.flatMap((c) => c.points);
  const measured = (g: typeof real) => {
    const size = box(all(g)).size;
    if (m.reference.kind === 'height') return size.y;
    if (m.reference.kind === 'width') return Math.max(size.x, size.z);
    // Each rotor is measured on its own: the two together are no wider than one.
    const rotors = new Map<string, Vector3[]>();
    for (const c of g.clouds) {
      const name = c.path.split('/').find((s) => s.includes(m.reference.part!));
      if (name) rotors.set(name, [...(rotors.get(name) ?? []), ...c.points]);
    }
    expect(rotors.size, `parts named *${m.reference.part}*`).toBeGreaterThan(0);
    return Math.max(...[...rotors.values()].map(span));
  };

  it(`is at real size: ${m.reference.metres} m, the figure NASA publishes`, () => {
    expect(Math.abs(measured(real) - m.reference.metres) / m.reference.metres).toBeLessThan(0.01);
  });

  it('has a miniature that is the same machine, smaller by the factor the screen states', () => {
    expect(measured(mini) / measured(real)).toBeCloseTo(MINIATURE[m.id], 3);
  });

  it('stands on the ground, in the middle', () => {
    for (const g of [real, mini]) {
      const b = box(all(g));
      expect(Math.abs(b.min.y)).toBeLessThan(0.002);
      expect(Math.abs(b.min.x + b.max.x)).toBeLessThan(0.004);
      expect(Math.abs(b.min.z + b.max.z)).toBeLessThan(0.004);
    }
  });

  it('is a file every AR viewer can open: no Draco, no WebP, under 5 MB', () => {
    for (const [g, file] of [
      [real, `${m.id}-1to1.glb`],
      [mini, `${m.id}-mini.glb`],
    ] as const) {
      expect(g.json.extensionsRequired ?? []).toEqual([]);
      expect(g.json.extensionsUsed ?? []).not.toContain('KHR_draco_mesh_compression');
      for (const image of g.json.images ?? []) expect(['image/jpeg', 'image/png']).toContain(image.mimeType);
      expect(statSync(join(MODELS, file)).size).toBeLessThan(5_000_000);
    }
  });

  it('was made from the model the game ships today', () => {
    const now = createHash('sha256').update(readFileSync(join(ROOT, 'public', 'assets', 'models', m.source))).digest('hex');
    expect(report[m.id].sourceSha256, 'run: npx tsx src/screens/ar/tools/derive-models.ts').toBe(now);
  });

  if (m.check)
    it('says how far its other dimensions are from the published ones (never more than 15 %)', () => {
      const size = box(all(real)).size;
      if (m.check!.depth) expect(Math.abs(Math.min(size.x, size.z) - m.check!.depth) / m.check!.depth).toBeLessThan(0.05);
      if (m.check!.height) expect(Math.abs(size.y - m.check!.height) / m.check!.height).toBeLessThan(0.15);
    });
});
