/**
 * Plays a free-form scene (prologue, finale): a list of beats declared in content.
 *
 * A scene with a 3D `set` plays in the cinema layout, like an episode: the set fills the screen and every beat
 * is a caption, a decision inside the scene, or a set piece. A scene without a set keeps the text layout.
 */
import { useEffect, useState } from 'react';
import { audio } from '../audio/bus';
import { t } from '../content';
import type { BeatT, SceneC } from '../content/schema';
import { voiceId } from '../content/voice';
import { announce } from '../engine/announce';
import { useGame } from '../engine/store';
import { Btn, ClewCard, ClewReveal, FactView, LineView, useFocusOn } from '../ui/parts';
import { BeatFrame, FactsBeat, LinesBeat } from './beats';
import { PuzzleRunner } from './PuzzleRunner';
import { Set3D, SetLabels } from './Set3D';
import { showCue } from './setStore';

type Props = { scene: SceneC; onDone: () => void };

export function ScenePlayer(props: Props) {
  return props.scene.set ? <CinemaScene {...props} /> : <TextScene {...props} />;
}

/** A set piece with nothing to show yet is skipped, so no placeholder ever reaches the player. */
const empty = (b: BeatT) => b.kind === 'special' && !b.text;

function CinemaScene({ scene, onDone }: Props) {
  const [i, setI] = useState(0);
  const awardClew = useGame((s) => s.awardClew);
  const beat = scene.beats[i];
  const next = () => {
    let n = i + 1;
    while (n < scene.beats.length && empty(scene.beats[n])) n++;
    if (n < scene.beats.length) setI(n);
    else onDone();
  };

  return (
    <article className={`cinema cinema--scene cinema--${beat.kind}`} aria-labelledby="scene-title">
      <Set3D scene={scene.set!.scene} />
      <div className="cinema__shade" aria-hidden="true" />
      <header className="cinema__top">
        <p className="slate">{t('scene.station')}</p>
        <h1 id="scene-title" className="cinema__title">
          {scene.title}
        </h1>
      </header>
      <SetLabels labels={scene.set!.labels} />
      <div className={`cinema__lower cinema__lower--${beat.kind}`} key={i}>
        <CinemaBeat
          beat={beat}
          index={i}
          scene={scene}
          onNext={next}
          onClew={(id, title) => {
            awardClew(id);
            announce(`${t('clew.new')}: ${title}`);
          }}
        />
      </div>
    </article>
  );
}

function CinemaBeat({ beat, index, scene, onNext, onClew }: { beat: BeatT; index: number; scene: SceneC; onNext: () => void; onClew: (id: string, title: string) => void }) {
  switch (beat.kind) {
    case 'lines':
      return <LinesBeat lines={beat.lines} facts={scene.facts} onDone={onNext} cue={beat.cue} />;
    case 'puzzle':
      return (
        <>
          {beat.title && <h2 className="cinema__op">{beat.title}</h2>}
          <PuzzleRunner scene cue={beat.cue} puzzle={beat.puzzle} facts={scene.facts} consoleDef={scene.console} voice={`${scene.id}.b${index}`} onSolved={onNext} />
        </>
      );
    case 'facts':
      return <FactsPager beat={beat} scene={scene} onDone={onNext} />;
    case 'clew':
      return <ClewBeat beat={beat} onNext={onNext} onClew={onClew} />;
    case 'special':
      return <SetPiece beat={beat} id={voiceId.special(scene.id, index)} onNext={onNext} />;
  }
}

/** REAL facts, one at a time, as captions with their source. */
function FactsPager({ beat, scene, onDone }: { beat: Extract<BeatT, { kind: 'facts' }>; scene: SceneC; onDone: () => void }) {
  const [k, setK] = useState(0);
  const region = useFocusOn<HTMLDivElement>(k);
  useEffect(() => {
    showCue(beat.cue);
    audio.stopVoice();
  }, [beat.cue]);
  const fact = scene.facts[beat.facts[k]];
  const last = k >= beat.facts.length - 1;
  return (
    <>
      <div className="beat__body" ref={region} tabIndex={-1} aria-live="polite">
        {beat.title && <h2 className="cinema__op">{beat.title}</h2>}
        <div className="headline">{fact && <FactView fact={fact} />}</div>
      </div>
      <div className="actions">
        <Btn onClick={() => (last ? onDone() : setK(k + 1))}>{t('common.continue')}</Btn>
      </div>
    </>
  );
}

function ClewBeat({ beat, onNext, onClew }: { beat: Extract<BeatT, { kind: 'clew' }>; onNext: () => void; onClew: (id: string, title: string) => void }) {
  const region = useFocusOn<HTMLDivElement>(beat.clew.id);
  useEffect(() => {
    showCue(beat.cue);
    audio.speak(voiceId.clew(beat.clew.id), beat.clew.line, 'ariadne');
  }, [beat]);
  return (
    <>
      <div className="beat__body" ref={region} tabIndex={-1}>
        <ClewReveal clew={beat.clew} />
      </div>
      <div className="actions">
        <Btn
          onClick={() => {
            onClew(beat.clew.id, beat.clew.title);
            onNext();
          }}
        >
          {t('common.continue')}
        </Btn>
      </div>
    </>
  );
}

/**
 * Engine-provided set pieces. The words are always on screen; the set and the sound add to them (AX-32).
 *  - `pulse`      a pulse of light leaves; 2.5 seconds later the answer comes back
 *  - `daisy-bell` ARIADNE hums "Daisy Bell" (1892, public domain), slower and slower. Our own synthesis.
 */
function SetPiece({ beat, id, onNext }: { beat: Extract<BeatT, { kind: 'special' }>; id: string; onNext: () => void }) {
  const region = useFocusOn<HTMLDivElement>(id);
  useEffect(() => {
    showCue(beat.cue ?? (beat.name === 'pulse' ? 'pulse' : undefined));
    // The words first; the pulse and the song come in under them.
    audio.speak(id, beat.text, 'narrator');
    const timers: number[] = [];
    if (beat.name === 'pulse') {
      timers.push(window.setTimeout(() => audio.play('pulse'), 800));
      timers.push(window.setTimeout(() => audio.play('echo'), 800 + 2560));
    } else if (beat.name === 'daisy-bell') timers.push(window.setTimeout(() => audio.play('daisy'), 4200));
    return () => {
      timers.forEach(clearTimeout);
      audio.stopMusic();
    };
  }, [beat, id]);
  return (
    <>
      <div className="lines" ref={region} tabIndex={-1}>
        <LineView line={{ who: 'narrator', tag: 'IMAGINED', text: beat.text ?? '' }} facts={{}} />
      </div>
      <div className="actions">
        <Btn onClick={onNext}>{t('common.continue')}</Btn>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Text layout (scenes without a set)

function TextScene({ scene, onDone }: Props) {
  const [i, setI] = useState(0);
  const awardClew = useGame((s) => s.awardClew);
  const beat = scene.beats[i];
  const next = () => (i + 1 < scene.beats.length ? setI(i + 1) : onDone());

  return (
    <section className="scene" aria-labelledby="scene-title">
      <header className="scene__head">
        <p className="eyebrow">{t('scene.station')}</p>
        <h1 id="scene-title">{scene.title}</h1>
      </header>
      <BeatView key={i} beat={beat} scene={scene} onNext={next} onClew={(id, title) => (awardClew(id), announce(`${t('clew.new')}: ${title}`))} />
    </section>
  );
}

function BeatView({ beat, scene, onNext, onClew }: { beat: BeatT; scene: SceneC; onNext: () => void; onClew: (id: string, title: string) => void }) {
  const region = useFocusOn<HTMLDivElement>(beat);
  switch (beat.kind) {
    case 'lines':
      return <LinesBeat lines={beat.lines} facts={scene.facts} onDone={onNext} />;
    case 'puzzle':
      return (
        <div className="beat">
          {beat.title && <h2 className="beat__title">{beat.title}</h2>}
          <PuzzleRunner puzzle={beat.puzzle} facts={scene.facts} onSolved={onNext} />
        </div>
      );
    case 'facts':
      return <FactsBeat title={beat.title} keys={beat.facts} facts={scene.facts} onDone={onNext} />;
    case 'clew':
      return (
        <BeatFrame
          onNext={() => {
            onClew(beat.clew.id, beat.clew.title);
            onNext();
          }}
        >
          <div ref={region} tabIndex={-1}>
            <ClewCard clew={beat.clew} />
          </div>
        </BeatFrame>
      );
    case 'special':
      // The text description is always shown, so the scene is complete without the set piece (AX-32).
      return (
        <BeatFrame onNext={onNext}>
          <div className={`special special--${beat.name}`} ref={region} tabIndex={-1}>
            {beat.name === 'pulse' && (
              <div className="pulse" aria-hidden="true">
                <span className="pulse__dot" />
                <span className="pulse__dot pulse__dot--echo" />
              </div>
            )}
            <p className="special__text">{beat.text ?? t('special.pending')}</p>
          </div>
        </BeatFrame>
      );
  }
}
