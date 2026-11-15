/**
 * Mounts a 3D set behind the story. three.js and the set load on demand, so the first paint stays light (NFR-03).
 *
 * If the device has no WebGL, or the context is lost, nothing breaks: the same beats and the same puzzle
 * graph go on in the text view, and the player can try "Restart 3D" (10.6.6, NFR-04).
 * Every cue has a written description for screen readers (AX-32).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../content';
import type { LabelId } from '../content/schema';
import { useGame } from '../engine/store';
import type { SetContext, SetFactory } from '../three/host';
import { useStage } from './setStore';

const SETS = import.meta.glob<{ create: SetFactory }>('../scenes/*/index.ts');
const SHEETS = import.meta.glob<{ cues: Record<string, string> }>('../scenes/*/cues.json', { eager: true, import: 'default' });

/** A set that serves many files writes `{name}` and `{alt}` in its descriptions; the episode fills them in. */
const fill = (text: string, ctx?: SetContext) => text.replace(/{(name|alt)}/g, (_, k: 'name' | 'alt') => ctx?.[k] ?? '');

export const describeCue = (scene: string, cue: string | null, ctx?: SetContext) => (cue ? fill(SHEETS[`../scenes/${scene}/cues.json`]?.cues[cue] ?? '', ctx) : '');

export function Set3D({ scene, context }: { scene: string; context?: SetContext }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const saved = useGame((s) => s.settings.quality);
  // `?q=high` forces a quality tier: used for captures and by judges on a strong machine.
  const forced = typeof location !== 'undefined' ? /[?&]q=(low|medium|high)/.exec(location.search + location.hash)?.[1] : undefined;
  const quality = (forced as typeof saved | undefined) ?? saved;
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const status = useStage((s) => s.status);
  const cue = useStage((s) => s.cue);
  const fps = useStage((s) => s.fps);
  const [attempt, setAttempt] = useState(0);
  const [textOnly, setTextOnly] = useState(false);
  const showFps = typeof location !== 'undefined' && /[?&]fps\b/.test(location.search + location.hash);

  useEffect(() => {
    if (textOnly) return;
    let dead = false;
    let dispose = () => {};
    useStage.setState({ status: 'loading', host: null, set: null });
    (async () => {
      try {
        const load = SETS[`../scenes/${scene}/index.ts`];
        if (!load) throw new Error(`no set "${scene}"`);
        const [{ SceneHost, webglAvailable }, mod] = await Promise.all([import('../three/host'), load()]);
        if (dead) return;
        if (!webglAvailable() || !canvas.current) throw new Error('WebGL is not available');
        const host = new SceneHost(canvas.current, {
          quality,
          reduceMotion: useGame.getState().settings.reduceMotion,
          onContextLost: () => useStage.setState({ status: 'lost', host: null, set: null }),
          onFps: (v) => showFps && useStage.setState({ fps: Math.round(v) }),
        });
        dispose = () => host.dispose();
        const set = await mod.create(host, context ?? { id: scene, options: {} });
        if (dead) return host.dispose();
        host.use(set);
        const now = useStage.getState().cue;
        if (now) set.setCue(now, true);
        host.start();
        useStage.setState({ status: 'ready', host, set });
      } catch (e) {
        console.warn('[set3d]', e);
        if (!dead) useStage.setState({ status: 'failed', host: null, set: null });
      }
    })();
    return () => {
      dead = true;
      dispose();
      useStage.setState({ status: 'idle', host: null, set: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, quality, attempt, textOnly, context?.id]);

  // Reduced motion can change while the set is on screen.
  useEffect(() => {
    const host = useStage.getState().host;
    if (host) host.reduceMotion = reduceMotion;
  }, [reduceMotion, status]);

  const off = textOnly || status === 'failed' || status === 'lost';
  return (
    <div className={`set3d set3d--${off ? 'off' : status}`}>
      {!textOnly && <canvas ref={canvas} aria-hidden="true" />}
      <p className="sr-only" role="img" aria-label={`${t('set.scene')}: ${describeCue(scene, cue, context)}`} />
      {status === 'loading' && !textOnly && (
        <p className="set3d__note" role="status">
          {t('set.loading')}
        </p>
      )}
      {off && (
        <div className="set3d__fallback" role="status">
          <p className="set3d__desc">{describeCue(scene, cue, context)}</p>
          <p className="note">{status === 'lost' ? t('set.lost') : textOnly ? '' : t('set.none')}</p>
          {(status === 'lost' || textOnly) && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                setTextOnly(false);
                setAttempt((n) => n + 1);
              }}
            >
              {t('set.restart')}
            </button>
          )}
          {status === 'lost' && !textOnly && (
            <button type="button" className="btn btn--ghost" onClick={() => setTextOnly(true)}>
              {t('set.textOnly')}
            </button>
          )}
        </div>
      )}
      {showFps && status === 'ready' && <p className="set3d__fps">{fps} fps</p>}
    </div>
  );
}

/** What is simulated, reconstructed or not to scale says so on screen (CR-13, FR-61). */
export function SetLabels({ labels }: { labels: LabelId[] }) {
  if (!labels.length) return null;
  return (
    <ul className="cinema__labels" aria-label="About this scene">
      {labels.map((l) => (
        <li key={l}>{t(`label.${l}`)}</li>
      ))}
    </ul>
  );
}

/**
 * Pins its child to a hotspot of the 3D set (AX-10: the choice is a large target inside the scene).
 * When the hotspot is off screen, or there is no 3D, the child simply stays where the layout puts it,
 * so a choice can never disappear.
 */
export function Anchor({ name, children, className = '' }: { name?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!name) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      const { host, set } = useStage.getState();
      if (!el) return;
      const p = host && set ? set.hotspot(name) : null;
      const s = p && host ? host.project(p) : null;
      if (s && s.visible) {
        // Keep the whole target on screen.
        const x = Math.min(Math.max(s.x, 48), host!.width - 300);
        const y = Math.min(Math.max(s.y, 130), host!.height - 150);
        el.dataset.anchored = 'true';
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      } else if (el.dataset.anchored) {
        delete el.dataset.anchored;
        el.style.transform = '';
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [name]);
  return (
    <li ref={ref} className={`anchor ${className}`}>
      {children}
    </li>
  );
}
