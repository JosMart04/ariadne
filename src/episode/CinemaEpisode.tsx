/**
 * The seven beats of an episode, played inside its 3D set (v1.1, section 6.2 and 10.6).
 *
 * Layout: the set fills the screen; the story is a lower third of captions with the speaker's name and the
 * REAL / IMAGINED tag; decisions are targets inside the scene. Nothing here should ever look like a form,
 * a quiz or a documentation page (the screenshot rule, AC-15).
 *
 * Episodes without a set still use EpisodePlayer's text layout.
 */
import { useEffect, useMemo, useState } from 'react';
import { asset } from '../content/assets';
import { nssdcaUrl, t } from '../content';
import type { EpisodeC, LineT } from '../content/schema';
import { announce } from '../engine/announce';
import { go } from '../engine/router';
import { useGame } from '../engine/store';
import { Badge, Btn, ClewCard, EpigraphView, FactView, LineView, Rich, useFocusOn } from '../ui/parts';
import { LinesBeat } from './beats';
import { PuzzleRunner } from './PuzzleRunner';
import { Set3D, SetLabels } from './Set3D';
import { showCue, useStage } from './setStore';

type BeatId = 'passage' | 'arrival' | 'operation' | 'discovery' | 'silence' | 'clew' | 'status' | 'file';

export function CinemaEpisode({ ep }: { ep: EpisodeC }) {
  const completeEpisode = useGame((s) => s.completeEpisode);
  const awardClew = useGame((s) => s.awardClew);
  const explorer = useGame((s) => s.settings.play !== 'accessible');
  const ready = useStage((s) => s.status === 'ready');
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
  const cueOf = (b: BeatId) => ep.cues[b] ?? b;
  const slate = `E${String(ep.num).padStart(2, '0')} · ${ep.name} · ${ep.slate.place} · ${ep.slate.year}`;

  // Beats that do not drive the camera line by line show their own cue.
  useEffect(() => {
    if (beat === 'passage' || beat === 'discovery' || beat === 'clew' || beat === 'status' || beat === 'file') showCue(cueOf(beat));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, ready]);

  const restore = () => {
    completeEpisode(ep.id, assisted);
    announce(`${t('ep.restored')}: ${ep.name}`);
  };

  const numbered = beats.filter((b) => b !== 'clew');
  const step: BeatId = beat === 'clew' ? 'silence' : beat;
  const beatName = beat === 'clew' ? t('clew.new') : t(`beat.${beat}`);

  return (
    <article className={`cinema act--${ep.act} cinema--${beat}`} aria-labelledby="ep-title">
      <Set3D scene={ep.set!.scene} />
      <div className="cinema__shade" aria-hidden="true" />

      <header className="cinema__top">
        <p className="slate">{slate}</p>
        <h1 id="ep-title" className="cinema__title">
          {ep.title}
        </h1>
        <ol className="pips" aria-label={t('ep.beat', { n: numbered.indexOf(step) + 1, total: numbered.length, name: beatName })}>
          {numbered.map((b) => (
            <li key={b} className={b === step ? 'is-current' : numbered.indexOf(b) < numbered.indexOf(step) ? 'is-done' : ''} aria-current={b === step ? 'step' : undefined}>
              <span>{t(`beat.${b}`)}</span>
            </li>
          ))}
        </ol>
      </header>

      <SetLabels labels={ep.set!.labels} />
      {explorer && ready && beat !== 'operation' && (
        <p className="cinema__look" aria-hidden="true">
          {t('set.look')}
        </p>
      )}

      <div className={`cinema__lower cinema__lower--${beat}`} key={beat}>
        {beat === 'passage' && <Passage ep={ep} onNext={next} />}

        {beat === 'arrival' && <LinesBeat lines={ep.arrival!} facts={ep.facts} machineName={ep.name} onDone={next} cue={cueOf('arrival')} />}

        {beat === 'operation' &&
          (ep.operation!.puzzle ? (
            <>
              {ep.operation!.title && <h2 className="cinema__op">{ep.operation!.title}</h2>}
              <PuzzleRunner
                scene
                cue={cueOf('operation')}
                consoleDef={ep.console}
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

        {beat === 'silence' && <Silence ep={ep} cue={cueOf('silence')} onCaught={restore} onNext={next} />}

        {beat === 'clew' && (
          <Frame
            onNext={() => {
              awardClew(ep.clew!.id);
              next();
            }}
          >
            <ClewCard clew={ep.clew!} />
          </Frame>
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

        {i > 0 && beat !== 'file' && (
          <button type="button" className="link cinema__back" onClick={() => setI(i - 1)}>
            ← {t('common.back')}
          </button>
        )}
      </div>
    </article>
  );
}

function Frame({ children, onNext, nextLabel, extra }: { children: React.ReactNode; onNext?: () => void; nextLabel?: string; extra?: React.ReactNode }) {
  return (
    <>
      <div className="beat__body">{children}</div>
      {(onNext || extra) && (
        <div className="actions">
          {onNext && <Btn onClick={onNext}>{nextLabel ?? t('common.continue')}</Btn>}
          {extra}
        </div>
      )}
    </>
  );
}

/** Beat 1. A title card over the first view of the place. */
function Passage({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  return (
    <Frame onNext={onNext}>
      <div className="titlecard" ref={region} tabIndex={-1}>
        <p className="titlecard__act">
          {t(`act.${ep.act}`)} · {t(`act.${ep.act}.place`)}
        </p>
        <p className="titlecard__name">{ep.name}</p>
        <p className="titlecard__place">
          {ep.slate.place} · {ep.slate.year}
        </p>
      </div>
    </Frame>
  );
}

function Explainer({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  const op = ep.operation!;
  return (
    <Frame onNext={onNext}>
      <div ref={region} tabIndex={-1}>
        <h2 className="cinema__op">{op.title ?? t('ep.howItWorked')}</h2>
        <ol className="explainer">
          {op.explainer.map((s, k) => (
            <li key={k}>{s.fact && ep.facts[s.fact] ? <FactView text={s.text} fact={ep.facts[s.fact]} /> : <Rich text={s.text} />}</li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

/** Groups the sentences of a story into captions short enough to read in one look. */
function captions(text: string, max = 150): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+["”]?s*/g) ?? [text];
  const out: string[] = [];
  for (const raw of sentences) {
    const one = raw.trim();
    const last = out[out.length - 1];
    if (last && last.length + one.length + 1 <= max) out[out.length - 1] = `${last} ${one}`;
    else out.push(one);
  }
  return out;
}

/**
 * Beat 4. The headline first. "Tell me more" plays the story as captions, one at a time, while the camera
 * visits what each one talks about; then the sources, then the myth check. Nothing here is a wall of text.
 */
function Discovery({ ep, onNext }: { ep: EpisodeC; onNext: () => void }) {
  const d = ep.discovery!;
  const parts = useMemo(() => (d.story ? captions(d.story.text) : []), [d.story]);
  /** -1 headline · 0..n-1 story captions · n myth check */
  const [k, setK] = useState(-1);
  const region = useFocusOn<HTMLDivElement>(k);
  const atMyth = k === parts.length;
  const lastStep = d.myth ? parts.length : parts.length - 1;

  useEffect(() => {
    if (k >= 0 && k < parts.length) showCue(d.story?.cues?.[Math.min(k, (d.story.cues?.length ?? 1) - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  if (k === -1)
    return (
      <Frame
        onNext={onNext}
        extra={
          parts.length ? (
            <Btn kind="ghost" onClick={() => setK(0)}>
              {t('ep.tellMore')}
            </Btn>
          ) : undefined
        }
      >
        <div className="headline" ref={region} tabIndex={-1}>
          <FactView text={d.headline.text} fact={ep.facts[d.headline.fact]} />
        </div>
      </Frame>
    );

  return (
    <Frame onNext={() => (k >= lastStep ? onNext() : setK(k + 1))}>
      <div className="lines" aria-live="polite" ref={region} tabIndex={-1}>
        {atMyth && d.myth ? (
          <div className="myth">
            <h3>{t('ep.myth')}</h3>
            <p className="myth__claim">
              <strong>{t('ep.myth.claim')}:</strong> {d.myth.claim}
            </p>
            <FactView text={`${t('ep.myth.truth')}: ${d.myth.truth}`} fact={ep.facts[d.myth.fact]} />
          </div>
        ) : (
          <div className="line line--real">
            <div className="line__head">
              <span className="line__who">{t('speaker.ariadne')}</span>
              <span className="chip chip--real" title={t('tag.REAL.help')}>
                <span aria-hidden="true">◆</span> {t('tag.REAL')}
              </span>
              <span className="line__count">{t('story.part', { n: k + 1, total: parts.length })}</span>
            </div>
            <p className="line__text">
              <Rich text={parts[k]} />
            </p>
            {k === parts.length - 1 && (
              <ul className="sources" aria-label={t('story.sources')}>
                {d.story!.facts.map((key) => {
                  const f = ep.facts[key];
                  return (
                    <li key={key}>
                      <a className="source" href={f.source} target="_blank" rel="noopener noreferrer" title={f.text}>
                        <span aria-hidden="true">↗ </span>
                        {f.host}
                        <span className="sr-only">: {f.text}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </Frame>
  );
}

/**
 * Beat 5. The lines before the silence, then the machine's real last message, then one single action:
 * "Catch it" (FR-04). What the film loses, the thread keeps.
 */
function Silence({ ep, cue, onCaught, onNext }: { ep: EpisodeC; cue: string; onCaught: () => void; onNext: () => void }) {
  const s = ep.silence!;
  const before: LineT[] = s.before ?? [];
  const [n, setN] = useState(0);
  const [caught, setCaught] = useState(false);
  const atLast = n >= before.length;
  const region = useFocusOn<HTMLDivElement>(`${n}-${caught}`);

  useEffect(() => {
    showCue((atLast ? s.last.cue : before[n].cue) ?? cue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, atLast]);

  if (!atLast)
    return (
      <Frame onNext={() => setN(n + 1)}>
        <div className="lines" aria-live="polite" ref={region} tabIndex={-1}>
          <LineView line={before[n]} facts={ep.facts} machineName={ep.name} />
        </div>
      </Frame>
    );

  return (
    <>
      <div className={`beat__body silence${caught ? ' silence--caught' : ''}`} ref={region} tabIndex={-1}>
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

/** Beat 6. Evidence: the real photograph, untouched, framed as an archive plate with its credit and source. */
function StatusNow({ ep, onEnter, onFile }: { ep: EpisodeC; onEnter: () => void; onFile: () => void }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  // Runs once when the beat appears. onEnter is idempotent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(onEnter, []);
  const img = ep.statusNow?.image ? ep.images[ep.statusNow.image] : undefined;
  return (
    <Frame
      onNext={() => go('map')}
      nextLabel={t('ep.toMap')}
      extra={
        <Btn kind="ghost" onClick={onFile}>
          {t('ep.openFile')}
        </Btn>
      }
    >
      <div className="status" ref={region} tabIndex={-1}>
        {img && (
          <figure className="plate">
            <img src={asset(`assets/img/${img.file}`)} alt={img.alt} />
            <figcaption>
              <span className="plate__kind">{t('evidence.photo')}</span>
              <span className="plate__credit">{img.credit}</span>
              <a className="source" href={img.source} target="_blank" rel="noopener noreferrer">
                ↗ {t('source.button')}
              </a>
            </figcaption>
          </figure>
        )}
        <div className="status__text">
          <p className="eyebrow">{t('ep.where')}</p>
          <p className="status__badge">
            <Badge id={ep.status.badge} help />
          </p>
          <p className="status__where">{ep.status.where}</p>
          {ep.statusNow && <FactView text={ep.statusNow.text} fact={ep.facts[ep.statusNow.fact]} />}
          {ep.epigraph && <EpigraphView e={ep.epigraph} />}
        </div>
      </div>
    </Frame>
  );
}

/** Beat 7. The archive sheet, beside the model turning on its stand. Optional, never blocks (section 6.2). */
function FieldFile({ ep }: { ep: EpisodeC }) {
  const region = useFocusOn<HTMLDivElement>(ep.id);
  const model = ep.set?.model ? ep.models[ep.set.model] : undefined;
  return (
    <Frame onNext={() => go('map')} nextLabel={t('ep.toMap')}>
      <div className="sheet" ref={region} tabIndex={-1}>
        <h2 className="sheet__title">
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
        {ep.console && (
          <>
            <h3>{ep.console.name}</h3>
            <ul className="sheet__controls">
              {Object.entries(ep.console.controls).map(([id, c]) => (
                <li key={id}>
                  {c.tag === 'REAL' && c.fact ? <FactView text={`${c.label}. ${c.does}`} fact={ep.facts[c.fact]} /> : <LineView line={{ who: 'narrator', tag: 'IMAGINED', text: `${c.label}. ${c.does}` }} facts={ep.facts} />}
                </li>
              ))}
            </ul>
          </>
        )}
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
        {model && (
          <p className="sheet__credit">
            3D model: {model.credit}. {model.license}.{' '}
            <a className="source" href={model.source} target="_blank" rel="noopener noreferrer">
              ↗ {t('source.button')}
            </a>
          </p>
        )}
      </div>
    </Frame>
  );
}
