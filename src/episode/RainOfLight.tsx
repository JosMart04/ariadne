/**
 * The Silence (FR-04, section 4.3): the machine's last message falls like rain, in threads of light.
 * "Catch it" gathers every drop into one golden thread. What the film loses, the thread keeps.
 *
 * Decorative: the caption and the button say the same thing in words. With reduced motion nothing falls;
 * the thread simply appears (AX-30). The drops use a fixed seed (FR-21).
 */
import { useEffect, useRef } from 'react';
import { useGame } from '../engine/store';

/** Small seeded generator, so the rain is the same on every device. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THREAD_Y = 0.57;

export function RainOfLight({ caught }: { caught: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useGame((s) => s.settings.reduceMotion);
  const caughtRef = useRef(caught);
  caughtRef.current = caught;

  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const size = () => {
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const observer = new ResizeObserver(size);
    observer.observe(c);

    const thread = (k: number, wobble: number) => {
      g.save();
      g.shadowColor = 'rgba(245, 201, 106, 0.95)';
      g.shadowBlur = 16;
      g.strokeStyle = `rgba(255, 222, 150, ${0.25 + 0.75 * k})`;
      g.lineWidth = 1.4 + k * 1.2;
      g.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * w * k;
        const y = THREAD_Y * h + Math.sin(i * 0.45 + wobble) * 3 * (1 - k * 0.7);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
      g.restore();
    };

    if (reduce) {
      g.clearRect(0, 0, w, h);
      if (caughtRef.current) thread(1, 0);
      return () => observer.disconnect();
    }

    const r = seeded(77);
    const drops = Array.from({ length: 240 }, () => ({ x: r(), y: r() * 1.2 - 0.2, v: 0.05 + r() * 0.13, len: 0.025 + r() * 0.06, a: 0.25 + r() * 0.6 }));
    let last = performance.now();
    let caughtAt = 0;
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, w, h);
      const held = caughtRef.current;
      if (held && !caughtAt) caughtAt = now;
      const k = held ? Math.min(1, (now - caughtAt) / 1500) : 0;
      g.lineCap = 'round';
      g.lineWidth = 1.6;
      for (const d of drops) {
        if (!held) {
          d.y += d.v * dt;
          if (d.y - d.len > 1) d.y = -0.02;
        } else {
          d.y += (THREAD_Y - d.y) * Math.min(1, dt * 3.4);
          d.len *= 1 - Math.min(1, dt * 2.6);
        }
        if (d.len < 0.002) continue;
        const x = d.x * w;
        const y = d.y * h;
        const top = y - d.len * h;
        const grad = g.createLinearGradient(x, top, x, y);
        grad.addColorStop(0, 'rgba(245, 201, 106, 0)');
        grad.addColorStop(1, `rgba(255, 228, 165, ${d.a})`);
        g.strokeStyle = grad;
        g.beginPath();
        g.moveTo(x, top);
        g.lineTo(x, y);
        g.stroke();
      }
      if (held) thread(k, now / 900);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // In reduced motion the canvas is static, so it is redrawn when the message is caught.
  }, [reduce, reduce ? caught : false]);

  return <canvas ref={ref} className="rain" aria-hidden="true" />;
}
