/**
 * The episode template: seven beats, the same for every machine (section 6.2).
 * Passage, Arrival, The Operation, The Discovery, The Silence, Status Now, Field File.
 * Implemented once and fed with data. Beats a draft episode does not have yet are skipped.
 */
import { useEffect, useMemo, useState } from 'react';
import { nssdcaUrl, t } from '../content';
import type { EpisodeC } from '../content/schema';
import { announce } from '../engine/announce';
import { go } from '../engine/router';
import { useGame } from '../engine/store';
import { Badge, Btn, ClewCard, EpigraphView, FactView, LineView, Rich, useFocusOn } from '../ui/parts';
import { BeatFrame, LinesBeat } from './beats';
import { CinemaEpisode } from './CinemaEpisode';
import { PuzzleRunner } from './PuzzleRunner';

type BeatId = 'passage' | 'arrival' | 'operation' | 'discovery' | 'silence' | 'clew' | 'status' | 'file';

/** An episode with a 3D set plays in the cinema layout; the others keep the text layout until their set exists. */
export function EpisodePlayer({ ep }: { ep: EpisodeC }) {
  return ep.set ? <CinemaEpisode ep={ep} /> : <TextEpisode ep={ep} />;
}

function TextEpisode({ ep }: { ep: EpisodeC }) {
  const completeEpisode = useGame((s) => s.completeEpisode);
  const awardClew = useGame((s) => s.awardClew);
  const [assisted, setAssisted] = useState(false);

  const beats = useMemo<BeatId[]>(() => {
    const b: BeatId[] = ['passage'];
    if (ep.arrival) b.push('arrival');
    if (ep.operation) b.push('operation');
    if (ep.discovery) b.push('discovery');
    if (ep.silence) b.push('silence');
    if (ep.clew) b.push('clew');
    b.push('status', 'file');
    return b;
  }, [ep]);

  const [i, setI] = useState(0);
  const beat = beats[i];
  const next = () => setI((n) => Math.min(n + 1, beats.length - 1));
  const slate = `E${String(ep.num).padStart(2, '0')} · ${ep.name} · ${ep.slate.place} · ${ep.slate.year}`;

  /** The memory is restored when the last message is caught (or, for drafts without one, at Status Now). */
  const restore = () => {
    completeEpisode(ep.id, assisted);
    announce(`${t('ep.restored')}: ${ep.name}`);
  };

  // The clew is its own step, so the numbered beats stay the seven of the template.
  const numbered: BeatId[] = beats.filter((b) => b !== 'clew');
  const beatName = beat === 'clew' ? t('clew.new') : t(`beat.${beat}`);
  /** While the clew card is shown, The Silence stays highlighted as the current step. */
  const step: BeatId = beat === 'clew' ? 'silence' : beat;

  return (
    <article className={`episode act--${ep.act}`} aria-labelledby="ep-title">
      <header className="episode__head">
        <p className="slate">{slate}</p>
        <h1 id="ep-title">{ep.title}</h1>
        <ol className="steps" aria-label={t('ep.beat', { n: numbered.indexOf(step) + 1, total: numbered.length, name: beatName })}>
          {numbered.map((b) => (
            <li key={b} className={b === step ? 'is-current' : numbered.indexOf(b) < numbered.indexOf(step) ? 'is-done' : ''} aria-current={b === step ? 'step' : undefined}>
              {t(`beat.${b}`)}
            </li>
          ))}
        </ol>
      </header>

      <div className="beat" key={beat}>
        {beat === 'passage' && <Passage ep={ep} onNext={next} />}

        {beat === 'arrival' && <LinesBeat lines={ep.arrival!} facts={ep.facts} machineName={ep.name} onDone={next} />}

        {beat === 'operation' &&
          (ep.operation!.puzzle ? (
            <>
              {ep.operation!.title && <h2 className="beat__title">{ep.operation!.title}</h2>}
              <PuzzleRunner
                puzzle={ep.operation!.puzzle}
                facts={ep.facts}
                onSolved={(a) => {
                  setAssisted(a);
                  next();
                }}
              />
            </>
          ) : (
            <Explainer ep={ep} onNext={next} />
          ))}

        {beat === 'discovery' && <Discovery ep={ep} onNext={next} />}

        {beat === 'silence' && <Silence ep={ep} onCaught={restore} onNext={next} />}

        {beat === 'clew' && (
          <BeatFrame
            onNext={() => {
              awardClew(ep.clew!.id);
              next();
            }}
          >
            <ClewCard clew={ep.clew!} />
          </BeatFrame>
        )}

        {beat === 'status' && (
          <StatusNow
            ep={ep}
            onEnter={() => {
              if (!ep.silence) restore();
            }}
            onFile={next}
          />
        )}

        {beat === 'file' && <FieldFile ep={ep} />}
      </div>

      {i > 0 && beat !== 'file' && (
        <p className="episode__back">
          <button type="button" className="link" onClick={() => setI(i - 1)}>
            ← {t('common.back')}
          </button>
        </p>
      )}
    </article>
  );
}

/** Beat 1. The cinematic journey arrives in iteration 2; the slate card already frames the episode. */
function Passage({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  return (
    <BeatFrame onNext={onNext}>
      <div className="passage" ref={region} tabIndex={-1}>
        <p className="passage__act">
          {t(`act.${ep.act}`)} · {t(`act.${ep.act}.place`)}
        </p>
        <p className="passage__name">{ep.name}</p>
        {ep.draft && <p className="note">{t('ep.draft')}</p>}
      </div>
    </BeatFrame>
  );
}

/** Beat 3 without a puzzle yet: the real operation, explained step by step. */
function Explainer({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  const op = ep.operation!;
  return (
    <BeatFrame onNext={onNext}>
      <div ref={region} tabIndex={-1}>
        <h2 className="beat__title">{op.title ?? t('ep.howItWorked')}</h2>
        <ol className="explainer">
          {op.explainer.map((s, k) => (
            <li key={k}>{s.fact && ep.facts[s.fact] ? <FactView text={s.text} fact={ep.facts[s.fact]} /> : <Rich text={s.text} />}</li>
          ))}
        </ol>
      </div>
    </BeatFrame>
  );
}

/** Beat 4. Three layers of disclosure: headline, "Tell me more", and the Field File at the end. */
function Discovery({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const d = ep.discovery!;
  const [more, setMore] = useState(false);
  const region = useFocusOn<HTMLDivElement>(ep.id);
  return (
    <BeatFrame
      onNext={onNext}
      extra={
        d.story && !more ? (
          <Btn kind="ghost" onClick={() => setMore(true)}>
            {t('ep.tellMore')}
          </Btn>
        ) : undefined
      }
    >
      <div ref={region} tabIndex={-1}>
        <div className="headline">
          <FactView text={d.headline.text} fact={ep.facts[d.headline.fact]} />
        </div>
        {d.story && more && (
          <div className="story" aria-live="polite">
            <p>
              <Rich text={d.story.text} />
            </p>
            <ul className="story__sources">
              {d.story.facts.map((k) => (
                <li key={k}>
                  <FactView fact={ep.facts[k]} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {d.myth && (
          <aside className="myth" aria-label={t('ep.myth')}>
            <h3>{t('ep.myth')}</h3>
            <p>
              <strong>{t('ep.myth.claim')}:</strong> {d.myth.claim}
            </p>
            <FactView text={`${t('ep.myth.truth')}: ${d.myth.truth}`} fact={ep.facts[d.myth.fact]} />
          </aside>
        )}
      </div>
    </BeatFrame>
  );
}

/**
 * Beat 5. The machine's real last message, then one single action: "Catch it" (FR-04).
 * What the film loses, the thread keeps. The rain of light is layered on in iteration 2.
 */
function Silence({ ep, onCaught, onNext }: { ep: EpisodeC; onCaught: () => void; onNext: () => void }) {
  const s = ep.silence!;
  const [caught, setCaught] = useState(false);
  const region = useFocusOn<HTMLDivElement>(caught);
  return (
    <>
      <div className="beat__body silence" ref={region} tabIndex={-1}>
        {s.epigraph && <EpigraphView e={s.epigraph} />}
        <p className="eyebrow">{t('ep.lastMessage')}</p>
        <div className={caught ? 'last last--caught' : 'last'}>
          <LineView line={s.last} facts={ep.facts} machineName={ep.name} />
        </div>
        {s.lines?.map((l, k) => <LineView key={k} line={l} facts={ep.facts} machineName={ep.name} />)}
        {caught && (
          <p className="caught" role="status">
            {t('ep.caught')}
          </p>
        )}
      </div>
      <div className="actions">
        {caught ? (
          <Btn onClick={onNext}>{t('common.continue')}</Btn>
        ) : (
          <button
            type="button"
            className="btn btn--catch"
            data-scan="primary"
            onClick={() => {
              setCaught(true);
              onCaught();
            }}
          >
            {t('ep.catch')}
          </button>
        )}
      </div>
    </>
  );
}

/** Beat 6. Where the machine is today, with its badge. */
function StatusNow({ ep, onEnter, onFile }: { ep: EpisodeC; onEnter: () => void; onFile: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  // Runs once when the beat appears. onEnter is idempotent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(onEnter, []);
  return (
    <BeatFrame
      onNext={() => go('map')}
      nextLabel={t('ep.toMap')}
      extra={
        <Btn kind="ghost" onClick={onFile}>
          {t('ep.openFile')}
        </Btn>
      }
    >
      <div className="card status" ref={region} tabIndex={-1}>
        <p className="eyebrow">{t('ep.where')}</p>
        <p className="status__badge">
          <Badge id={ep.status.badge} help />
        </p>
        <p className="status__where">{ep.status.where}</p>
        {ep.statusNow && <FactView text={ep.statusNow.text} fact={ep.facts[ep.statusNow.fact]} />}
        {ep.epigraph && <EpigraphView e={ep.epigraph} />}
      </div>
    </BeatFrame>
  );
}

/** Beat 7. The complete documentary record: optional, never blocks (section 6.2). */
function FieldFile({ ep }: { ep: EpisodeC }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  return (
    <BeatFrame onNext={() => go('map')} nextLabel={t('ep.toMap')}>
      <div className="card file" ref={region} tabIndex={-1}>
        <h2 className="beat__title">
          {t('beat.file')}: {ep.name}
        </h2>
        <p>
          <Badge id={ep.status.badge} help />
        </p>
        <h3>{t('ep.serial')}</h3>
        <ul className="file__ids">
          {ep.nssdca.map((id) => (
            <li key={id}>
              <a className="source" href={nssdcaUrl(id)} target="_blank" rel="noopener noreferrer">
                {id}
                <span className="sr-only">. {t('source.opens', { host: 'nssdc.gsfc.nasa.gov' })}</span>
              </a>
            </li>
          ))}
        </ul>
        {ep.objectives && (
          <>
            <h3>{t('ep.objectives')}</h3>
            <ul>
              {ep.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </>
        )}
        <h3>{t('ep.facts')}</h3>
        <ul className="file__facts">
          {Object.values(ep.facts).map((f) => (
            <li key={f.id}>
              <FactView fact={f} />
            </li>
          ))}
        </ul>
      </div>
    </BeatFrame>
  );
}
