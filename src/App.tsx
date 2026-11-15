import { useCallback, useEffect, useRef } from 'react';
import { content, episodeById, t } from './content';
import { EpisodePlayer } from './episode/EpisodePlayer';
import { audio } from './audio/bus';
import { announce, mountAnnouncer } from './engine/announce';
import { useScanning } from './engine/input/scan';
import { useRoute } from './engine/router';
import { dawnClock, useGame } from './engine/store';
import { Credits, Finale, MapScreen, Prologue, Setup, Title } from './screens/screens';
import { ClewCard } from './ui/parts';

/** Clews by id, gathered from every place that can award one. */
const ALL_CLEWS = [
  ...[...content.prologue.beats, ...content.finale.beats].flatMap((b) => (b.kind === 'clew' ? [b.clew] : [])),
  ...content.episodes.flatMap((e) => (e.clew ? [e.clew] : [])),
].sort((a, b) => a.id.localeCompare(b.id));

function Logbook() {
  const ref = useRef<HTMLDialogElement>(null);
  const clews = useGame((s) => s.progress.clews);
  const earned = ALL_CLEWS.filter((c) => clews.includes(c.id));
  return (
    <>
      <button type="button" className="chrome" onClick={() => ref.current?.showModal()}>
        {t('shell.logbook')} <span className="chrome__count">{earned.length}</span>
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby="logbook-title">
        <h2 id="logbook-title">{t('shell.logbook')}</h2>
        <p className="note">{t('logbook.mystery')}</p>
        {earned.length === 0 ? <p>{t('logbook.empty')}</p> : earned.map((c) => <ClewCard key={c.id} clew={c} />)}
        <form method="dialog" className="actions">
          <button className="btn btn--primary">{t('common.close')}</button>
        </form>
      </dialog>
    </>
  );
}

export function App() {
  const route = useRoute();
  const settings = useGame((s) => s.settings);
  const progress = useGame((s) => s.progress);
  const set = useGame((s) => s.set);

  // One-button mode. Escape always returns to mouse and keyboard, so nobody can get trapped in it.
  const scanning = settings.play === 'accessible' && settings.input === 'switch';
  const leaveScanning = useCallback(() => {
    set({ input: 'pointer' });
    announce(t('scan.left'));
  }, [set]);
  useScanning(scanning, settings.scanSpeed, leaveScanning);

  // Accessibility settings become attributes that the stylesheet reads (AX-30, AX-34).
  useEffect(() => {
    const el = document.documentElement;
    el.style.setProperty('--scale', String(settings.textScale));
    el.dataset.motion = settings.reduceMotion ? 'reduce' : 'full';
    el.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    el.dataset.input = settings.input;
    el.dataset.play = settings.play;
  }, [settings]);

  // Sound starts only after the first interaction (FR-33). Every button answers with a small key click.
  useEffect(() => {
    audio.configure({ sound: settings.sound, narration: settings.narration, mono: settings.mono });
  }, [settings.sound, settings.narration, settings.mono]);
  useEffect(() => {
    const wake = () => audio.unlock();
    const click = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest?.('button, a.chrome, a.node')) audio.play('key');
    };
    addEventListener('pointerdown', wake, true);
    addEventListener('keydown', wake, true);
    addEventListener('click', click, true);
    return () => {
      removeEventListener('pointerdown', wake, true);
      removeEventListener('keydown', wake, true);
      removeEventListener('click', click, true);
    };
  }, []);

  useEffect(() => {
    scrollTo(0, 0);
  }, [route.name, route.name === 'episode' ? route.id : '']);

  const ep = route.name === 'episode' ? episodeById(route.id) : undefined;
  /** A 3D set fills the screen and the station bar floats over it. */
  const cinema = !!ep?.set || (route.name === 'finale' && !!content.finale.set) || (route.name === 'prologue' && !!content.prologue.set);

  return (
    <div className={`app route--${route.name}${cinema ? ' app--cinema' : ''}`}>
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        {t('shell.skip')}
      </a>
      <header className="shell">
        <a className="shell__brand" href="#">
          {t('title.name')}
        </a>
        <span className="shell__dawn" title={t('shell.dawn.help')}>
          {t('shell.dawn', { time: dawnClock(progress) })}
        </span>
        <nav className="shell__nav" aria-label="Station">
          <a className="chrome" href="#map">
            {t('shell.map')}
          </a>
          <Logbook />
          <a className="chrome" href="#setup">
            {t('shell.settings')}
          </a>
        </nav>
      </header>

      {scanning && (
        <p className="scanbar" role="status">
          {t('scan.bar')}
        </p>
      )}

      <main id="main" tabIndex={-1}>
        {route.name === 'title' && <Title />}
        {route.name === 'setup' && <Setup />}
        {route.name === 'prologue' && <Prologue />}
        {route.name === 'map' && <MapScreen />}
        {route.name === 'episode' && ep && <EpisodePlayer key={ep.id} ep={ep} />}
        {route.name === 'finale' && <Finale />}
        {route.name === 'credits' && <Credits />}
      </main>

      <div className="sr-only" aria-live="polite" ref={mountAnnouncer} />
    </div>
  );
}
