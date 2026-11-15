/**
 * The solar system behind the shell screens: the title and the map share one set (`src/scenes/orrery/`).
 *
 * `Pin` anchors a piece of the page to a hotspot of the set. It is not `Anchor` of `src/episode/Set3D.tsx`: that one
 * keeps a large choice target away from the screen edges (it never goes past `width - 300px`), which would pull a small
 * marker off the world it marks. `Pin` uses the same public parts: `useStage`, `host.project` and `set.hotspot`.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { t } from '../content';
import { Set3D } from '../episode/Set3D';
import { showCue, useStage } from '../episode/setStore';
import { useGame } from '../engine/store';
import { lightHours } from '../sim/dsn';
import { minSec } from '../sim/meridiani';
import { AU_KM, distanceAu, lightMinutes, voyager1 } from '../sim/planets';
import './cosmos.css';

/** The date the map shows: now, or `?date=2026-11-18` for the team's video and for repeatable pictures. */
export function mapDate(): number {
  const m = /[?&]date=(\d{4}-\d{2}-\d{2})/.exec(location.search + location.hash);
  const forced = m ? Date.parse(`${m[1]}T12:00:00Z`) : NaN;
  return Number.isFinite(forced) ? forced : Date.now();
}

/** What the map says about its date. Every number is computed (`src/sim/planets.ts`) or NASA's (`src/sim/dsn.ts`). */
export function readouts(when: number) {
  const mars = distanceAu('earth', 'mars', when);
  return {
    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(when),
    marsKm: Math.round((mars * AU_KM) / 1e6),
    marsLight: minSec(lightMinutes(mars)),
    voyagerAu: Math.round(voyager1(when).au),
    voyagerHours: lightHours(when).toFixed(1),
  };
}

/** Size of a machine's marker on screen, pixels: it follows the text size the player chose. */
const pinSize = () => (typeof document === 'undefined' ? 32 : parseFloat(getComputedStyle(document.documentElement).fontSize) * 2);

export function Cosmos({ cue, when, thread, className = '', children }: { cue: 'title' | 'map' | 'far'; when: number; thread?: 'whole'; className?: string; children: ReactNode }) {
  const done = useGame((s) => s.progress.done);
  const scale = useGame((s) => s.settings.textScale);
  const context = useMemo(() => {
    const r = readouts(when);
    return {
      id: 'orrery',
      name: r.date,
      alt: t('map.mars', { km: r.marsKm, time: r.marsLight }),
      options: { when, done: Object.keys(done), thread, pin: pinSize() },
    };
    // `scale` is read through the document: a new text size moves the markers apart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when, done, thread, scale]);
  useEffect(() => showCue(cue), [cue]);
  return (
    <div className={`cosmos cosmos--${cue} ${className}`}>
      <Set3D scene="orrery" context={context} />
      {children}
    </div>
  );
}

/**
 * Pins its child to a hotspot of the set. With `edge`, a child whose hotspot is outside the picture waits at the edge
 * nearest to it, so a machine can always be reached; without it, the child is hidden while its hotspot is out of sight.
 * A child that waits at the edge steps aside from the parts of the page that `avoid` selects.
 */
export function Pin({ name, edge = false, avoid, className = '', children }: { name: string; edge?: boolean; avoid?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el) return;
      const { host, set } = useStage.getState();
      const p = host && set ? set.hotspot(name) : null;
      const s = p && host ? host.project(p) : null;
      if (!s || !host) return void (el.dataset.on = 'false');
      const M = 28;
      const inside = s.visible && s.x >= M && s.x <= host.width - M && s.y >= M + 44 && s.y <= host.height - M;
      if (!inside && !edge) return void (el.dataset.on = 'false');
      const x = Math.min(Math.max(s.x, M), host.width - M);
      let y = Math.min(Math.max(s.y, M + 44), host.height - M);
      if (!inside && avoid)
        for (const part of document.querySelectorAll(avoid)) {
          const r = part.getBoundingClientRect();
          if (x > r.left - M && x < r.right + M && y > r.top - M && y < r.bottom + M) y = r.top + r.height / 2 < host.height / 2 ? r.bottom + M : r.top - M;
        }
      el.dataset.on = 'true';
      el.dataset.edge = String(!inside);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [name, edge, avoid]);
  return (
    <div ref={ref} className={`pin ${className}`} data-on="false">
      {children}
    </div>
  );
}
