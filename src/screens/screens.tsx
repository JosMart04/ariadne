/** Top-level screens: Title, Setup ("How do you want to play?"), Map, Prologue, Finale, Credits. */
import { useState } from 'react';
import { content, episodes, keyEpisodes, t } from '../content';
import type { Act, EpisodeC } from '../content/schema';
import { ACTS } from '../content/schema';
import { ScenePlayer } from '../episode/ScenePlayer';
import { announce } from '../engine/announce';
import { go } from '../engine/router';
import { finaleOpen, nextKeyEpisode, useGame, type InputMode } from '../engine/store';
import { Badge, Btn, useFocusOn } from '../ui/parts';

// ---------------------------------------------------------------- Title

export function Title() {
  const { settings, progress } = useGame();
  const started = progress.prologueDone;
  const begin = () => go(!settings.setupDone ? 'setup' : started ? 'map' : 'prologue');
  return (
    <section className="title" aria-labelledby="title-name">
      <p className="eyebrow">Knossos Station · Archive</p>
      <h1 id="title-name" className="title__name">
        {t('title.name')}
        <span className="title__sub">{t('title.sub')}</span>
      </h1>
      <p className="title__motto">{t('title.motto')}</p>
      <p className="title__logline">{t('title.logline')}</p>
      <div className="actions actions--center">
        <Btn onClick={begin} autoFocus>
          {started ? t('title.resume') : t('title.begin')}
        </Btn>
        <Btn kind="ghost" onClick={() => go('map')}>
          {t('title.labyrinth')}
        </Btn>
      </div>
      <p className="title__credit">{t('title.credit')}</p>
    </section>
  );
}

// ---------------------------------------------------------------- Setup (AX-01)

const INPUTS: InputMode[] = ['pointer', 'keyboard', 'switch', 'head'];
const SCALES = [1, 1.25, 1.5, 2];
/** Seconds per target in one-button scanning (AX-14: 0.8 to 3 s). Radios, so the choice never needs a drag. */
const SPEEDS: [string, number][] = [
  ['slow', 3],
  ['medium', 1.6],
  ['fast', 0.8],
];

function Toggle({ label, help, value, onChange }: { label: string; help?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__label">
        {label}
        {help && <span className="toggle__help">{help}</span>}
      </span>
    </label>
  );
}

export function Setup() {
  const { settings, progress, set, reset } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const head = useFocusOn<HTMLHeadingElement>('setup');
  const start = () => {
    set({ setupDone: true });
    go(progress.prologueDone ? 'map' : 'prologue');
  };
  return (
    <section className="setup" aria-labelledby="setup-title">
      <h1 id="setup-title" ref={head} tabIndex={-1}>
        {t('setup.title')}
      </h1>
      <p className="note">{t('setup.intro')}</p>

      <fieldset>
        <legend>{t('setup.input')}</legend>
        <div className="options">
          {INPUTS.map((m) => (
            <label key={m} className={`option${m === 'head' ? ' option--soon' : ''}`}>
              <input type="radio" name="input" value={m} checked={settings.input === m} disabled={m === 'head'} onChange={() => set({ input: m })} />
              <span className="option__label">
                {t(`input.${m}`)}
                <span className="option__help">{t(`input.${m}.help`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {settings.input === 'switch' && (
        <fieldset>
          <legend>{t('setup.scanSpeed')}</legend>
          <div className="options options--row">
            {SPEEDS.map(([id, s]) => (
              <label key={id} className="option">
                <input type="radio" name="speed" checked={settings.scanSpeed === s} onChange={() => set({ scanSpeed: s })} />
                <span className="option__label">
                  {t(`scan.${id}`)}
                  <span className="option__help">{s} s</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>{t('setup.textSize')}</legend>
        <div className="options options--row">
          {SCALES.map((s) => (
            <label key={s} className="option">
              <input type="radio" name="scale" checked={settings.textScale === s} onChange={() => set({ textScale: s })} />
              <span className="option__label">{Math.round(s * 100)}%</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('shell.settings')}</legend>
        <Toggle label={t('setup.captions')} value={settings.captions} onChange={(v) => set({ captions: v })} />
        <Toggle label={t('setup.narration')} value={settings.narration} onChange={(v) => set({ narration: v })} />
        <Toggle label={t('setup.motion')} value={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        <Toggle label={t('setup.contrast')} value={settings.highContrast} onChange={(v) => set({ highContrast: v })} />
        <Toggle label={t('setup.story')} help={t('setup.story.help')} value={settings.storyMode} onChange={(v) => set({ storyMode: v })} />
      </fieldset>

      <div className="actions">
        <Btn onClick={start}>{t('setup.start')}</Btn>
        {!confirmReset ? (
          <Btn kind="ghost" onClick={() => setConfirmReset(true)}>
            {t('setup.reset')}
          </Btn>
        ) : (
          <span className="confirm" role="group" aria-label={t('setup.reset.confirm')}>
            {t('setup.reset.confirm')}{' '}
            <Btn
              kind="ghost"
              onClick={() => {
                reset();
                setConfirmReset(false);
                announce(t('setup.reset.done'));
              }}
            >
              {t('common.yes')}
            </Btn>
            <Btn kind="ghost" onClick={() => setConfirmReset(false)}>
              {t('common.no')}
            </Btn>
          </span>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Map (the labyrinth hub)

function Node({ ep, done }: { ep: EpisodeC; done: boolean }) {
  return (
    <li>
      <a className={`node${done ? ' node--done' : ''}${ep.key ? ' node--key' : ''}`} href={`#${ep.id}`} data-scan="primary">
        <span className="node__num">E{String(ep.num).padStart(2, '0')}</span>
        <span className="node__name">{ep.name}</span>
        <span className="node__title">{ep.title}</span>
        <span className="node__meta">
          <Badge id={ep.status.badge} />
          {ep.key && <span className="node__flag">★ {t('map.key')}</span>}
          {done && <span className="node__flag node__flag--done">✓ {t('map.restored')}</span>}
        </span>
      </a>
    </li>
  );
}

export function MapScreen() {
  const progress = useGame((s) => s.progress);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const head = useFocusOn<HTMLHeadingElement>('map');
  const doneCount = Object.keys(progress.done).length;
  const open = finaleOpen(progress);
  const nextKey = nextKeyEpisode(progress);
  const byAct = (act: Act) => episodes.filter((e) => e.act === act);

  return (
    <section className="map" aria-labelledby="map-title">
      <h1 id="map-title" ref={head} tabIndex={-1}>
        {t('map.title')}
      </h1>
      <p className="note">{t('map.intro')}</p>
      <p className="map__thread" role="status">
        {t('map.thread', { done: doneCount, total: episodes.length })}
      </p>

      <div className="actions">
        {!progress.prologueDone ? (
          <Btn onClick={() => go('prologue')}>{t('title.begin')}</Btn>
        ) : nextKey ? (
          <Btn onClick={() => go(nextKey.id)}>{t('map.follow', { name: nextKey.name })}</Btn>
        ) : (
          <Btn onClick={() => go('finale')}>{t('map.center')}</Btn>
        )}
      </div>
      {open && doneCount < episodes.length && <p className="note">{t('map.more', { n: episodes.length - doneCount })}</p>}

      {ACTS.map((act) => (
        <section key={act} className={`act act--${act}`} aria-labelledby={`act-${act}`}>
          <h2 id={`act-${act}`}>
            {t(`act.${act}`)} <span className="act__place">{t(`act.${act}.place`)}</span>
          </h2>
          <ul className="nodes">
            {byAct(act).map((ep) => (
              <Node key={ep.id} ep={ep} done={!!progress.done[ep.id]} />
            ))}
          </ul>
        </section>
      ))}

      <section className="center" aria-labelledby="center-title">
        <h2 id="center-title">{t('map.center')}</h2>
        {open ? (
          <div className="actions">
            <Btn onClick={() => go('finale')}>{t('map.center.open')}</Btn>
          </div>
        ) : (
          <>
            <p className="note">
              {t('map.center.locked')} ({keyEpisodes.filter((e) => progress.done[e.id]).length}/{keyEpisodes.length})
            </p>
            <div className="actions">
              {!confirmSkip ? (
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
              )}
            </div>
          </>
        )}
      </section>
    </section>
  );
}

// ---------------------------------------------------------------- Prologue / Finale / Credits

export function Prologue() {
  const completePrologue = useGame((s) => s.completePrologue);
  return (
    <ScenePlayer
      scene={content.prologue}
      onDone={() => {
        completePrologue();
        go('map');
      }}
    />
  );
}

export function Finale() {
  const completeFinale = useGame((s) => s.completeFinale);
  return (
    <ScenePlayer
      scene={content.finale}
      onDone={() => {
        completeFinale();
        go('credits');
      }}
    />
  );
}

export function Credits() {
  const head = useFocusOn<HTMLHeadingElement>('credits');
  const s = content.stats;
  const hosts = [...new Set([...episodes.flatMap((e) => Object.values(e.facts)), ...Object.values(content.finale.facts)].map((f) => f.host))].sort();
  return (
    <section className="credits" aria-labelledby="credits-title">
      <h1 id="credits-title" ref={head} tabIndex={-1}>
        {t('credits.title')}
      </h1>
      <p className="credits__counter">{t('credits.counter', { facts: s.facts, sources: s.sources })}</p>
      <p className="credits__honor">{t('credits.honor')}</p>
      <p>{t('credits.nasa')}</p>
      <p>{t('credits.ai')}</p>
      <p>{t('credits.title.allusion')}</p>
      <h2>{t('source.button')}</h2>
      <ul className="credits__hosts">
        {hosts.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <div className="actions">
        <Btn onClick={() => go('map')}>{t('shell.map')}</Btn>
        <Btn kind="ghost" onClick={() => go('')}>
          {t('title.name')}
        </Btn>
      </div>
    </section>
  );
}
