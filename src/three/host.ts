/**
 * SceneHost: everything a 3D set needs around it (NFR-13, section 10.6.6).
 *  - fixed 60 Hz logic steps, independent of the frame rate, so simulations stay deterministic;
 *  - the browser pauses the loop when the tab is hidden; long gaps are clamped;
 *  - Auto quality lowers the render resolution first, then the tier, with hysteresis so it never flickers;
 *  - a lost WebGL context is reported, so the game can offer "Restart 3D" or go on in the text view;
 *  - reduced motion is a flag every set reads.
 *
 * It knows nothing about episodes or content. A set is any object that implements SetController.
 */
import * as THREE from 'three';

export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type Tier = 'low' | 'medium' | 'high';

export interface SetController {
  /** Show a named moment of the set. `instant` cuts instead of moving the camera. */
  setCue(cue: string, instant?: boolean): void;
  /** Logic, 60 times per simulated second. */
  step(dt: number): void;
  /** Once per drawn frame: cameras, interpolation, effects. */
  frame(dt: number, time: number): void;
  /** World position of a named hotspot, or null. Accessible targets are anchored to these. */
  hotspot(name: string): THREE.Vector3 | null;
  /** Set-specific commands, e.g. fly a scripted pilot. */
  act?(name: string, arg?: unknown): unknown;
  /** Called when Auto quality changes the tier. */
  onTier?(tier: Tier): void;
  dispose(): void;
}

export type SetFactory = (host: SceneHost) => Promise<SetController>;

export type HostOptions = {
  quality: Quality;
  reduceMotion: boolean;
  onContextLost?: () => void;
  onFps?: (fps: number, scale: number, tier: Tier) => void;
};

const STEP = 1 / 60;
const SCALES = [0.5, 0.62, 0.75, 0.88, 1];
const TIERS: Tier[] = ['low', 'medium', 'high'];

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export class SceneHost {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.3, 60000);
  reduceMotion: boolean;
  tier: Tier;
  /** Multiplier for the logic clock. A scripted flight can be shown faster; 0 freezes the set. */
  timeScale = 1;
  /** Fraction of the particle budget to use (10.3: fewer particles when the frame rate drops). */
  budget = 1;
  width = 1;
  height = 1;

  private set: SetController | null = null;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private time = 0;
  private running = false;
  private auto: boolean;
  private scaleIndex: number;
  private ema = 16;
  private slowFor = 0;
  private fastFor = 0;
  private fpsAt = 0;
  private observer: ResizeObserver;
  private readonly tmp = new THREE.Vector3();

  constructor(
    readonly canvas: HTMLCanvasElement,
    private opts: HostOptions,
  ) {
    this.auto = opts.quality === 'auto';
    this.tier = opts.quality === 'auto' ? 'high' : opts.quality;
    this.scaleIndex = opts.quality === 'low' ? 1 : SCALES.length - 1;
    this.reduceMotion = opts.reduceMotion;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = this.tier !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.background = new THREE.Color(0x000000);

    canvas.addEventListener('webglcontextlost', this.onLost);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.stop();
    this.opts.onContextLost?.();
  };

  use(set: SetController) {
    this.set = set;
    set.onTier?.(this.tier);
  }

  private resize() {
    const box = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    this.width = Math.max(1, Math.round(box.width));
    this.height = Math.max(1, Math.round(box.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * SCALES[this.scaleIndex];
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderOnce();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  renderOnce() {
    this.set?.frame(0, this.time);
    this.renderer.render(this.scene, this.camera);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = (now - this.last) / 1000;
    this.last = now;
    // A hidden tab or a breakpoint must not turn into a burst of catch-up steps.
    const dt = Math.min(raw, 0.1);

    this.acc += dt * this.timeScale;
    let steps = 0;
    while (this.acc >= STEP && steps < 12) {
      this.set?.step(STEP);
      this.acc -= STEP;
      steps++;
    }
    if (steps === 12) this.acc = 0;

    this.time += dt;
    this.set?.frame(dt, this.time);
    this.renderer.render(this.scene, this.camera);
    this.measure(raw * 1000, now);
  };

  /** Auto quality with hysteresis: slow for 1.5 s lowers it, fast for 5 s raises it. */
  private measure(ms: number, now: number) {
    if (ms > 250) return;
    this.ema += (ms - this.ema) * 0.06;
    if (now - this.fpsAt > 500) {
      this.fpsAt = now;
      this.opts.onFps?.(1000 / this.ema, SCALES[this.scaleIndex], this.tier);
    }
    if (!this.auto) return;
    if (this.ema > 24) {
      this.slowFor += ms;
      this.fastFor = 0;
    } else if (this.ema < 13) {
      this.fastFor += ms;
      this.slowFor = 0;
    } else {
      this.slowFor = 0;
      this.fastFor = 0;
    }
    if (this.slowFor > 1500) {
      this.slowFor = 0;
      if (this.scaleIndex > 0) this.setScale(this.scaleIndex - 1);
      else this.setTier(TIERS[Math.max(0, TIERS.indexOf(this.tier) - 1)]);
    }
    if (this.fastFor > 5000) {
      this.fastFor = 0;
      if (this.scaleIndex < SCALES.length - 1) this.setScale(this.scaleIndex + 1);
    }
  }

  private setScale(i: number) {
    this.scaleIndex = i;
    this.ema = 16;
    this.resize();
  }

  private setTier(tier: Tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.budget = tier === 'low' ? 0.35 : tier === 'medium' ? 0.65 : 1;
    this.renderer.shadowMap.enabled = tier !== 'low';
    this.set?.onTier?.(tier);
  }

  /** Screen position, in CSS pixels, of a point of the world. `visible` is false behind the camera or off screen. */
  project(world: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = this.tmp.copy(world).project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-v.y * 0.5 + 0.5) * this.height,
      visible: v.z < 1 && v.z > -1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05,
    };
  }

  dispose() {
    this.stop();
    this.observer.disconnect();
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.set?.dispose();
    this.set = null;
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      for (const one of Array.isArray(mat) ? mat : mat ? [mat] : []) {
        for (const v of Object.values(one)) if (v instanceof THREE.Texture) v.dispose();
        one.dispose();
      }
    });
    this.renderer.dispose();
  }
}
