/**
 * The laser ranging console of Knossos Station (10.6.2).
 *
 * The station is fiction, so its pointing and zoom controls are labelled IMAGINED. What it does is real:
 * stations on Earth fire short laser pulses at the reflectors left on the Moon and clock the light's return.
 *
 * Mouse or finger: drag the map to move the aim, wheel or the zoom keys to magnify, press FIRE.
 * Keyboard: arrows move, + and - zoom, Enter or Space fires. Every control is a native button (C-D06).
 */
import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { ConsoleT, FactC } from '../content/schema';
import { act } from '../episode/setStore';
import { TagChip } from '../ui/parts';

type Readout = { x: number; z: number; zoom: number; maxZoom: number; fired: boolean };

export function TelescopeConsole({ def }: { def?: ConsoleT; facts: Record<string, FactC> }) {
  const [r, setR] = useState<Readout | null>(null);
  const hold = useRef(0);

  useEffect(() => {
    const read = () => {
      const s = act<Readout>('state');
      if (s) setR(s);
    };
    read();
    const id = setInterval(read, 100);
    return () => clearInterval(id);
  }, []);

  // Keyboard: the same actions as the buttons.
  useEffect(() => {
    const KEYS: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in KEYS) {
        e.preventDefault();
        act('slew', { dx: KEYS[k][0] * 0.35, dz: KEYS[k][1] * 0.35 });
      } else if (k === '+' || k === '=') act('zoom', 1.25);
      else if (k === '-' || k === '_') act('zoom', 0.8);
    };
    addEventListener('keydown', down);
    return () => removeEventListener('keydown', down);
  }, []);

  /** A pointing key moves while it is held; one click is one step, so it also works with a switch or the keyboard. */
  const nudge = (dx: number, dz: number) => ({
    onPointerDown: () => {
      clearInterval(hold.current);
      hold.current = window.setInterval(() => act('slew', { dx: dx * 0.12, dz: dz * 0.12 }), 40);
    },
    onPointerUp: () => clearInterval(hold.current),
    onPointerLeave: () => clearInterval(hold.current),
    onClick: () => act('slew', { dx: dx * 0.3, dz: dz * 0.3 }),
  });
  useEffect(() => () => clearInterval(hold.current), []);

  const ctl = def?.controls ?? {};
  const tag = (id: string) => (ctl[id] ? <TagChip tag={ctl[id].tag} /> : null);
  const east = r ? Math.round(r.x) : 0;
  const south = r ? Math.round(r.z) : 0;

  return (
    <div className="scope" role="group" aria-label={def?.name ?? t('beat.operation')}>
      <div className="reticle" aria-hidden="true" />
      <dl className="tapes" aria-live="off">
        <div className="tape">
          <dt>{t('scope.zoom')}</dt>
          <dd>
            ×{r ? r.zoom.toFixed(1) : '1.0'}
            <span className="tape__unit"> / {r?.maxZoom ?? 9}</span>
          </dd>
        </div>
        <div className="tape">
          <dt>{t('scope.aim')}</dt>
          <dd className="tape__small">
            {Math.abs(east)} m {east >= 0 ? t('scope.east') : t('scope.west')} · {Math.abs(south)} m {south >= 0 ? t('scope.south') : t('scope.north')}
          </dd>
          <dd className="tape__note">{t('scope.from')}</dd>
        </div>
      </dl>

      <div className="scope__controls">
        <div className="control">
          <span className="control__label">
            {ctl.slew?.label ?? t('scope.point')} {tag('slew')}
          </span>
          <div className="dpad">
            <button type="button" className="dpad__btn dpad__btn--up" aria-label={t('scope.north')} {...nudge(0, -1)}>
              ▲
            </button>
            <button type="button" className="dpad__btn dpad__btn--left" aria-label={t('scope.west')} {...nudge(-1, 0)}>
              ◀
            </button>
            <button type="button" className="dpad__btn dpad__btn--right" aria-label={t('scope.east')} {...nudge(1, 0)}>
              ▶
            </button>
            <button type="button" className="dpad__btn dpad__btn--down" aria-label={t('scope.south')} {...nudge(0, 1)}>
              ▼
            </button>
          </div>
        </div>
        <div className="control">
          <span className="control__label">
            {ctl.zoom?.label ?? t('scope.zoom')} {tag('zoom')}
          </span>
          <div className="rod">
            <button type="button" className="rod__btn" onClick={() => act('zoom', 1.35)}>
              + {t('scope.closer')}
            </button>
            <button type="button" className="rod__btn" onClick={() => act('zoom', 0.74)}>
              − {t('scope.wider')}
            </button>
          </div>
        </div>
        <div className="control">
          <span className="control__label">
            {ctl.laser?.label ?? t('scope.laser')} {tag('laser')}
          </span>
          <button type="button" className="fire" data-scan="primary" disabled={!!r?.fired} onClick={() => (audio.play('laser'), act('fire'))}>
            {t('scope.fire')}
          </button>
        </div>
      </div>
      <p className="lmpanel__keys">{t('scope.keys')}</p>
    </div>
  );
}
