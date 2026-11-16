/**
 * The AR gallery and its one shared viewer (FR-55): choose a machine, turn it in 3D, and, on a phone that can, place it
 * in your own room as a miniature or at real size.
 *
 * - One viewer for every machine: what changes is a row of `catalog.ts`.
 * - The 3D and AR engine is Google's <model-viewer>, loaded only when this screen opens.
 * - No AR on this device, a model that fails to load, no 3D at all: each has its own way out. Nothing here is a dead end.
 * - Looking at a machine never changes the game: no memory is restored, no clew is earned.
 * - Address: `#ar` opens the gallery, `#ar-opportunity` opens it on that machine. The browser's Back button works.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { episodeById, t } from '../../content';
import { go } from '../../engine/router';
import { useGame } from '../../engine/store';
import { Btn, useFocusOn } from '../../ui/parts';
import { CATALOG, machineById, type Scale } from './catalog';
import type { ModelViewerElement } from './model-viewer';
import './ar.css';

/** The 3D picture: still arriving, on screen, or not possible here. */
type Picture = 'loading' | 'ready' | 'failed';
/** What is known about placing the machine in the room. */
type Room = 'unknown' | 'can' | 'cannot' | 'started' | 'placed' | 'back' | 'failed' | 'blocked';
/**
 * Which AR viewer is asked first on Android. `phone` is Google's own viewer (Scene Viewer): it finds the floor and holds
 * the model still far better than AR drawn by the page. `browser` is AR inside Chrome (WebXR), for phones without it.
 */
type Via = 'phone' | 'browser';
const VIA_KEY = 'ariadne-ar-via';
const savedVia = (): Via => {
  try {
    return localStorage.getItem(VIA_KEY) === 'browser' ? 'browser' : 'phone';
  } catch {
    return 'phone';
  }
};
/**
 * The viewer writes this address for a moment when the phone's own AR viewer could not open, then steps back.
 * The gallery must stay on screen through it, with the same machine, and say what happened.
 */
const BLOCKED = '#model-viewer-no-ar-fallback';
let lastPicked: string | undefined;

const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb);
  return () => removeEventListener('hashchange', cb);
};
const picked = () => (location.hash === BLOCKED ? lastPicked : (lastPicked = /^#ar-([a-z0-9]+)/i.exec(location.hash)?.[1]?.toLowerCase()));
const fix = (v: number, digits = 2) => v.toFixed(digits);
/** Floor a machine needs at real size: its footprint and room to walk round it, to the next half metre. */
const floor = (m: number) => Math.ceil((m + 0.6) * 2) / 2;

export default function ArGallery() {
  const machine = machineById(useSyncExternalStore(subscribe, picked, () => undefined)) ?? CATALOG[0];
  const [scale, setScale] = useState<Scale>('mini');
  const [engine, setEngine] = useState<Picture>('loading');
  const [picture, setPicture] = useState<Picture>('loading');
  const [room, setRoom] = useState<Room>('unknown');
  const [answer, setAnswer] = useState(false);
  const [via, setVia] = useState<Via>(savedVia);
  const viewer = useRef<ModelViewerElement>(null);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  const head = useFocusOn<HTMLHeadingElement>('ar');
  const ep = episodeById(machine.episode);
  const name = ep?.name ?? machine.id;
  const [w, h, d] = machine.metres;
  const wide = Math.max(w, d);

  // The viewer's code arrives only now: the rest of the game never pays for it.
  useEffect(() => {
    let live = true;
    import('./vendor/model-viewer.min.js').then(
      () => live && setEngine('ready'),
      () => live && setEngine('failed'),
    );
    return () => {
      live = false;
    };
  }, []);

  // Another machine or another size is another model: what was known about the last one no longer holds.
  useEffect(() => {
    setPicture('loading');
    setRoom('unknown');
  }, [machine.id, scale]);
  useEffect(() => setAnswer(false), [machine.id]);

  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    // The viewer may still be asking the phone what it can do when the model arrives: ask again for a few seconds
    // before telling the player that this device cannot place the machine.
    let asking = 0;
    const onLoad = () => {
      setPicture('ready');
      let tries = 0;
      const ask = () => {
        if (el.canActivateAR) return setRoom('can');
        if (++tries > 12) return setRoom('cannot');
        asking = window.setTimeout(ask, 300);
      };
      ask();
    };
    const onError = () => setPicture('failed');
    const onRoom = (e: Event) => {
      const s = (e as CustomEvent<{ status: string }>).detail?.status;
      setRoom((was) => (s === 'session-started' ? 'started' : s === 'object-placed' ? 'placed' : s === 'failed' ? 'failed' : was === 'started' || was === 'placed' ? 'back' : was));
    };
    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);
    el.addEventListener('ar-status', onRoom);
    return () => {
      clearTimeout(asking);
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      el.removeEventListener('ar-status', onRoom);
    };
  }, [engine, machine.id, scale]);

  useEffect(() => {
    // The phone's own viewer did not open: say so, and the next press tries AR inside the browser.
    const onHash = () => {
      if (location.hash === BLOCKED) setRoom('blocked');
    };
    // The phone's own viewer is another app: the page learns that the player is back when it is on screen again.
    const onShow = () => {
      if (document.visibilityState === 'visible') setRoom((was) => (was === 'started' ? 'back' : was));
    };
    addEventListener('hashchange', onHash);
    document.addEventListener('visibilitychange', onShow);
    return () => {
      removeEventListener('hashchange', onHash);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);

  const other = () => {
    const next: Via = via === 'phone' ? 'browser' : 'phone';
    setVia(next);
    try {
      localStorage.setItem(VIA_KEY, next);
    } catch {
      // A browser that refuses storage still gets the choice for this visit.
    }
  };
  const place = () => {
    const el = viewer.current;
    if (!el?.canActivateAR) return setRoom('cannot');
    setRoom('started');
    el.activateAR().catch(() => setRoom('failed'));
  };
  const showMe = () => {
    setAnswer(true);
    const el = viewer.current;
    if (!el) return;
    el.cameraOrbit = machine.look;
    if (reduceMotion) el.jumpCameraToGoal();
  };

  // The station bar is taller on a narrow screen (it wraps): the gallery starts under it, whatever its height.
  const [bar, setBar] = useState(58);
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>('header.shell');
    if (!shell || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(() => setBar(shell.offsetHeight));
    watch.observe(shell);
    setBar(shell.offsetHeight);
    return () => watch.disconnect();
  }, []);

  const failed = engine === 'failed' || picture === 'failed';
  const untried = !machine.tried.android && !machine.tried.ios;

  return (
    <div className="cosmos cosmos--ar">
      <section className="arx" aria-labelledby="ar-title" style={{ paddingTop: bar }}>
        <header className="arx__head">
          <h1 id="ar-title" ref={head} tabIndex={-1}>
            {t('ar.title')}
          </h1>
          <p className="arx__intro">{t('ar.intro')}</p>
          <div className="arx__pick" role="group" aria-label={t('ar.pick')}>
            {CATALOG.map((m) => (
              <button key={m.id} type="button" className="arx__machine" aria-pressed={m.id === machine.id} data-scan="primary" onClick={() => go(`ar-${m.id}`)}>
                {episodeById(m.episode)?.name ?? m.id}
              </button>
            ))}
          </div>
        </header>

        <div className={`arx__stage arx__stage--${failed ? 'failed' : picture}`}>
          {engine === 'ready' && !failed && (
            <model-viewer
              key={`${machine.id}-${scale}`}
              ref={viewer}
              class="arx__viewer"
              src={machine.models[scale]}
              alt={t(`ar.${machine.id}.alt`)}
              camera-controls=""
              touch-action="pan-y"
              interaction-prompt="none"
              shadow-intensity="1"
              shadow-softness="0.9"
              exposure={1.15}
              camera-orbit="35deg 68deg auto"
              loading="eager"
              // A real `true`: React hands this to the element as a property, and an empty string there means "off".
              ar={true}
              ar-modes={via === 'phone' ? 'scene-viewer webxr quick-look' : 'webxr scene-viewer quick-look'}
              ar-placement="floor"
              // Both files are true to scale (1:1 and the stated miniature): the room never resizes them.
              ar-scale="fixed"
              {...(reduceMotion ? {} : { 'auto-rotate': '', 'rotation-per-second': '10deg', 'auto-rotate-delay': '2500' })}
            >
              {/* The gallery has its own button for the room; the viewer's built-in one stays out of the picture. */}
              <span slot="ar-button" hidden />
            </model-viewer>
          )}
          {!failed && picture === 'loading' && (
            <p className="arx__wait" role="status">
              {t('ar.loading', { name })}
            </p>
          )}
          {failed && (
            <div className="arx__plain" role="status">
              <p className="arx__alt">{t(`ar.${machine.id}.alt`)}</p>
              <p className="note">{t('ar.no3d')}</p>
            </div>
          )}
          {!failed && picture === 'ready' && (
            <p className="arx__hint" aria-hidden="true">
              {t('ar.turn')}
            </p>
          )}
        </div>

        <div className="arx__panel">
          <p className="arx__eyebrow">{ep ? `E${String(ep.num).padStart(2, '0')} · ${ep.slate.place}` : ''}</p>
          <h2 className="arx__name">{name}</h2>
          <p className="arx__size">
            {t(`ar.${machine.id}.size`, { h: fix(h), w: fix(wide, 1) })}{' '}
            <a className="source" href={machine.size.reference.url} target="_blank" rel="noopener noreferrer">
              {t('source.button')}
            </a>
          </p>

          <fieldset className="arx__scale">
            <legend>{t('ar.scale')}</legend>
            {(['mini', 'real'] as const).map((s) => (
              <label key={s} className="arx__option">
                <input type="radio" name="ar-scale" value={s} checked={scale === s} onChange={() => setScale(s)} />
                <span>
                  <b>{t(`ar.scale.${s}`)}</b>
                  <span className="arx__help">
                    {s === 'mini'
                      ? t('ar.scale.mini.help', { ratio: machine.miniature, cm: Math.round(wide * 100 * (1 / Number(machine.miniature.split(':')[1]))) })
                      : t('ar.scale.real.help', { a: fix(floor(w), 1), b: fix(floor(d), 1) })}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="actions">
            <Btn onClick={place} disabled={failed || picture !== 'ready' || room === 'cannot'}>
              {t('ar.place')}
            </Btn>
          </div>
          <p className="arx__room" role="status">
            {failed ? '' : room === 'cannot' ? t('ar.room.cannot') : room === 'blocked' ? t('ar.room.blocked') : room === 'started' || room === 'placed' ? t('ar.room.started') : room === 'back' ? t('ar.room.back') : room === 'failed' ? t('ar.room.failed') : untried ? t('ar.room.untried') : room === 'can' ? t('ar.room.tips') : ''}
          </p>
          {!failed && (room === 'back' || room === 'failed' || room === 'blocked' || room === 'started' || room === 'placed') && (
            <div className="arx__other">
              <p className="arx__help">{t('ar.other.why')}</p>
              <Btn kind="ghost" onClick={other}>
                {via === 'phone' ? t('ar.other.browser') : t('ar.other.phone')}
              </Btn>
            </div>
          )}

          <div className="arx__task">
            <p className="arx__eyebrow">{t('ar.task')}</p>
            <p>{t(`ar.${machine.id}.task`)}</p>
            {!answer ? (
              <Btn kind="ghost" onClick={showMe}>
                {t('ar.showme')}
              </Btn>
            ) : (
              <p className="arx__answer" role="status">
                {t(`ar.${machine.id}.answer`, { h: fix(h, 1) })}{' '}
                <a className="source" href={machine.size.id === 'opportunity' ? 'https://science.nasa.gov/mission/mer-opportunity/' : machine.size.reference.url} target="_blank" rel="noopener noreferrer">
                  {t('source.button')}
                </a>
              </p>
            )}
          </div>

          <div className="actions arx__out">
            {ep && (
              <Btn kind="ghost" onClick={() => go(ep.id)}>
                {t('ar.memory', { name })}
              </Btn>
            )}
            <Btn kind="ghost" onClick={() => go('map')}>
              {t('ar.back')}
            </Btn>
          </div>
        </div>
      </section>
    </div>
  );
}
