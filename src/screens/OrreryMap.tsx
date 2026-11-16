/**
 * The map of the game: the solar system of today, with the sixteen machines marked where they rest (FR-01, FR-02).
 * Every machine is a real button pinned to its place; the list of cards (`MapList`) is one click away and is the
 * default for Accessible play and for devices without 3D.
 */
import { useEffect, useMemo, useState } from 'react';
import { content, episodeById, episodes, keyEpisodes, t } from '../content';
import type { EpisodeC } from '../content/schema';
import { act, useStage } from '../episode/setStore';
import { go } from '../engine/router';
import { finaleOpen, nextKeyEpisode, useGame } from '../engine/store';
import { APPROXIMATE, placeOf } from '../scenes/orrery/places';
import { Badge, Btn, useFocusOn } from '../ui/parts';
import { Cosmos, Pin, journey, mapDate, readouts } from './Cosmos';
import { arEntryVisible } from './ar/catalog';

/** Worlds that carry a name on the map. The three probes are their own marker: their name hangs from it. */
const WORLDS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon', 'eros', 'ceres'] as const;
const num = (ep: EpisodeC) => String(ep.num).padStart(2, '0');

export function OrreryMap({ onList }: { onList: () => void }) {
  const progress = useGame((s) => s.progress);
  const [seen, setSeen] = useState<string | null>(null);
  const [wide, setWide] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const reduceMotion = useGame((s) => s.settings.reduceMotion);
  /** The machine the camera is flying to: the journey from the Earth plays before its file opens. */
  const [trip, setTrip] = useState<EpisodeC | null>(null);
  const enter = (ep: EpisodeC) => {
    if (reduceMotion || trip || useStage.getState().status !== 'ready') return go(ep.id);
    setTrip(ep);
  };
  useEffect(() => {
    if (!trip) return;
    let live = true;
    const arrive = () => {
      if (!live) return;
      live = false;
      go(trip.id);
    };
    // The file opens when the camera arrives, when the 3D view stops, or after six seconds, whichever is first.
    const timer = setTimeout(arrive, 6000);
    void Promise.resolve(act('travel', { to: placeOf(trip.id) })).then(arrive);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [trip]);

  const head = useFocusOn<HTMLHeadingElement>('map');
  const when = useMemo(mapDate, []);
  const r = useMemo(() => readouts(when), [when]);
  const way = useMemo(() => (trip ? journey(placeOf(trip.id)!, when) : null), [trip, when]);
  const machines = useMemo(() => content.threadOrder.map((id) => episodeById(id)).filter((e): e is EpisodeC => !!e && !!placeOf(e.id)), []);

  const doneCount = Object.keys(progress.done).length;
  const open = finaleOpen(progress);
  const nextKey = nextKeyEpisode(progress);
  /** The machine the card describes: the one under the pointer or the focus, or the next one on the thread. */
  const shown = (seen && episodeById(seen)) || (progress.prologueDone ? nextKey : undefined);

  return (
    <Cosmos cue={wide ? 'far' : 'map'} when={when}>
      <section className={`omap${trip ? ' omap--trip' : ''}`} aria-labelledby="map-title">
        <header className="omap__head">
          <h1 id="map-title" ref={head} tabIndex={-1}>
            {t('map.title')}
          </h1>
          <p className="omap__thread" role="status">
            {t('map.thread', { done: doneCount, total: episodes.length })}
          </p>
        </header>

        <div className="omap__worlds" aria-hidden="true">
          {WORLDS.map((w) => (
            <Pin key={w} name={w} className="pin--world">
              <span className={`world world--${w}`}>{t(`world.${w}`)}</span>
            </Pin>
          ))}
        </div>

        <ol className="omap__machines" aria-label={t('map.machines')}>
          {machines.map((ep) => {
            const done = !!progress.done[ep.id];
            const next = nextKey?.id === ep.id && progress.prologueDone;
            const place = placeOf(ep.id)!;
            /** A probe that is on no world: its position is approximate, and its marker always says so. */
            const probe = APPROXIMATE.includes(place);
            return (
              <li key={ep.id}>
                <Pin name={ep.id} edge avoid=".omap__head, .omap__tools, .omap__lower, .omap__labels" className="pin--machine">
                  <button
                    type="button"
                    className={`machine${done ? ' machine--done' : ''}${ep.key ? ' machine--key' : ''}${next ? ' machine--next' : ''}${seen === ep.id ? ' machine--seen' : ''}${probe ? ' machine--probe' : ''}`}
                    data-scan="primary"
                    aria-label={t('map.pin', { num: num(ep), name: ep.name, place: t(`place.${place}`) }) + (probe ? `, ${t('map.approximate')}` : '') + (ep.key ? `, ${t('map.key')}` : '') + (done ? `, ${t('map.restored')}` : '')}
                    onClick={() => enter(ep)}
                    onFocus={() => setSeen(ep.id)}
                    onPointerEnter={() => setSeen(ep.id)}
                  >
                    <span className="machine__num">{num(ep)}</span>
                    {(done || ep.key) && (
                      <span className="machine__mark" aria-hidden="true">
                        {done ? '✓' : '★'}
                      </span>
                    )}
                    <span className="machine__name" aria-hidden="true">
                      {probe ? t(`world.${place}`) : ep.name}
                    </span>
                  </button>
                </Pin>
              </li>
            );
          })}
        </ol>

        <div className="omap__lower">
          {shown ? (
            <div className="omap__card" aria-live="polite">
              <p className="omap__eyebrow">
                E{num(shown)} · {t(`place.${placeOf(shown.id)}`)} · {shown.slate.year}
              </p>
              <p className="omap__name">{shown.name}</p>
              <p className="omap__title">{shown.title}</p>
              <p className="omap__meta">
                <Badge id={shown.status.badge} />
                {shown.key && <span className="omap__flag">★ {t('map.key')}</span>}
                {progress.done[shown.id] && <span className="omap__flag omap__flag--done">✓ {t('map.restored')}</span>}
              </p>
            </div>
          ) : (
            <p className="omap__intro">{t('map.intro')}</p>
          )}

          <div className="actions">
            {!progress.prologueDone ? (
              <Btn onClick={() => go('prologue')}>{t('title.begin')}</Btn>
            ) : nextKey ? (
              <Btn onClick={() => enter(nextKey)}>{t('map.follow', { name: nextKey.name })}</Btn>
            ) : (
              <Btn onClick={() => go('finale')}>{t('map.center')}</Btn>
            )}
            {seen && seen !== nextKey?.id && (
              <Btn kind="ghost" onClick={() => enter(episodeById(seen)!)}>
                {t('map.open', { name: episodeById(seen)?.name ?? '' })}
              </Btn>
            )}
            {!open &&
              (!confirmSkip ? (
                <Btn kind="ghost" onClick={() => setConfirmSkip(true)}>
                  {t('map.skipFinale')}
                </Btn>
              ) : (
                <span className="confirm" role="group" aria-label={t('map.skipFinale.confirm')}>
                  {t('map.skipFinale.confirm')}{' '}
                  <Btn kind="ghost" onClick={() => go('finale')}>
                    {t('common.yes')}
                  </Btn>
                  <Btn kind="ghost" onClick={() => setConfirmSkip(false)}>
                    {t('common.no')}
                  </Btn>
                </span>
              ))}
          </div>
          {!open && (
            <p className="omap__locked">
              {t('map.center.locked')} ({keyEpisodes.filter((e) => progress.done[e.id]).length}/{keyEpisodes.length})
            </p>
          )}
        </div>

        <div className="omap__tools" role="group" aria-label={t('map.view')}>
          <button type="button" className="tool" data-scan="ghost" onClick={() => act('zoom', { by: 1 })} aria-label={t('map.zoom.in')} title={t('map.zoom.in')}>
            +
          </button>
          <button type="button" className="tool" data-scan="ghost" onClick={() => act('zoom', { by: -1 })} aria-label={t('map.zoom.out')} title={t('map.zoom.out')}>
            −
          </button>
          <button type="button" className="tool tool--text" data-scan="ghost" aria-pressed={wide} onClick={() => setWide((v) => !v)}>
            {wide ? t('map.zoom.inner') : t('map.zoom.whole')}
          </button>
          <button type="button" className="tool tool--text" data-scan="ghost" onClick={onList}>
            {t('map.view.list')}
          </button>
          {arEntryVisible() && (
            <button type="button" className="tool tool--text" data-scan="ghost" onClick={() => go('ar')}>
              {t('ar.entry.short')}
            </button>
          )}
        </div>

        <p className="omap__today">
          <span className="omap__date">{r.date}</span>
          {t('map.mars', { km: r.marsKm, time: r.marsLight })}
        </p>
        <ul className="omap__labels" aria-label={t('map.about')}>
          <li>{t('map.scale.sizes')}</li>
          <li>{t('map.scale.distances')}</li>
          <li>{t('map.scale.probes')}</li>
          <li>{t('map.source')}</li>
        </ul>
        <p className="omap__look" aria-hidden="true">
          {t('map.look')}
        </p>

        {trip && way && (
          <div className="omap__trip" role="status">
            <p className="omap__eyebrow">{t('travel.from', { place: t(`travel.to.${placeOf(trip.id)}`) })}</p>
            <p className="omap__far">{way.km}</p>
            <p className="omap__light">
              {t('travel.light', { time: way.light })} {t(`travel.kind.${way.kind}`)}
            </p>
            <div className="actions">
              <Btn kind="ghost" onClick={() => go(trip.id)} autoFocus>
                {t('travel.skip', { name: trip.name })}
              </Btn>
            </div>
          </div>
        )}
      </section>
    </Cosmos>
  );
}
