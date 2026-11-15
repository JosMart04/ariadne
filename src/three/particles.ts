/**
 * Particles that teach (section 10.3). Each effect exists because of a real physical fact,
 * uses a fixed seed (FR-21), never moves with reduced motion (AX-30, AC-11),
 * and spends less when the frame rate drops (`budget`).
 */
import * as THREE from 'three';
import { rng } from './util';

/**
 * Lunar dust under a descent engine.
 *
 * On the Moon there is no air, so dust does not billow or hang. Each grain leaves on a straight, flat
 * path and falls back in a clean arc. Armstrong called it "a transparent sheet of moving dust".
 * The grains follow real ballistics in lunar gravity; when the engine stops, the last ones land and all is still.
 */
export class DustSheet {
  readonly points: THREE.Points;
  private readonly n: number;
  private readonly pos: Float32Array;
  private readonly origin: Float32Array;
  private readonly vel: Float32Array;
  private readonly age: Float32Array;
  private readonly life: Float32Array;
  private readonly rand = rng(2069);
  private spawnAcc = 0;

  constructor(count = 1400, private gravity = 1.62) {
    this.n = count;
    this.pos = new Float32Array(count * 3);
    this.origin = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.age = new Float32Array(count).fill(1e9);
    this.life = new Float32Array(count).fill(0);
    for (let i = 0; i < count; i++) this.pos[i * 3 + 1] = -1000;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xe2dccf, size: 0.3, sizeAttenuation: true, transparent: true, opacity: 0.6, depthWrite: false }));
    this.points.frustumCulled = false;
  }

  /**
   * @param intensity 0 to 1: how hard the engine is blowing on the ground right now
   * @param x,y,z     the point on the ground under the engine
   * @param budget    fraction of the grains to use (lower on slow machines)
   */
  update(dt: number, intensity: number, x: number, y: number, z: number, budget = 1) {
    const live = Math.floor(this.n * Math.min(1, budget));
    // Launch new grains.
    this.spawnAcc += intensity * live * dt * 0.9;
    let next = 0;
    while (this.spawnAcc >= 1 && next < live) {
      const i = this.findFree(next, live);
      if (i < 0) break;
      next = i + 1;
      this.spawnAcc -= 1;
      const a = this.rand() * Math.PI * 2;
      const speed = 14 + this.rand() * 34;
      const up = (2 + this.rand() * 7) * (Math.PI / 180);
      const r0 = 1.5 + this.rand() * 2.5;
      this.origin[i * 3] = x + Math.cos(a) * r0;
      this.origin[i * 3 + 1] = y + 0.1;
      this.origin[i * 3 + 2] = z + Math.sin(a) * r0;
      this.vel[i * 3] = Math.cos(a) * speed * Math.cos(up);
      this.vel[i * 3 + 1] = speed * Math.sin(up);
      this.vel[i * 3 + 2] = Math.sin(a) * speed * Math.cos(up);
      this.age[i] = 0;
      this.life[i] = (2 * this.vel[i * 3 + 1]) / this.gravity;
    }
    if (this.spawnAcc > 4) this.spawnAcc = 4;

    // Ballistics. No drag: there is no air.
    for (let i = 0; i < this.n; i++) {
      const t = (this.age[i] += dt);
      if (t > this.life[i] || i >= live) {
        this.pos[i * 3 + 1] = -1000;
        continue;
      }
      this.pos[i * 3] = this.origin[i * 3] + this.vel[i * 3] * t;
      this.pos[i * 3 + 1] = this.origin[i * 3 + 1] + this.vel[i * 3 + 1] * t - 0.5 * this.gravity * t * t;
      this.pos[i * 3 + 2] = this.origin[i * 3 + 2] + this.vel[i * 3 + 2] * t;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private findFree(from: number, live: number): number {
    for (let i = from; i < live; i++) if (this.age[i] > this.life[i]) return i;
    return -1;
  }

  clear() {
    this.age.fill(1e9);
    for (let i = 0; i < this.n; i++) this.pos[i * 3 + 1] = -1000;
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
