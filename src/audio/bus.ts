/**
 * AudioBus (FR-33, FR-34, A-D15).
 *
 *  - Four channels (voice, music, sfx, ambience), each with its own volume, plus a mono option.
 *  - Nothing sounds before the player's first interaction: browsers forbid it, and so does good manners.
 *  - A missing voice file never blocks anything: the caption is already on screen.
 *  - Every effect is synthesised with Web Audio. No recordings, no licences, no downloads.
 *
 * On the lunar surface there is silence. Sound only exists where there was air or a radio:
 * inside the cabin, on the loop with Mission Control, inside Knossos Station.
 */
import { asset } from '../content/assets';

export type Channel = 'voice' | 'music' | 'sfx' | 'ambience';
export type AudioSettings = { sound: boolean; narration: boolean; mono: boolean };

/** Named effects that content can ask for with `sfx: <name>`. Checked by the content compiler. */
export const SFX = ['key', 'confirm', 'wrong', 'alarm', 'quindar', 'contact', 'catch', 'pulse', 'echo', 'laser', 'daisy', 'static'] as const;
export type SfxName = (typeof SFX)[number];

const VOLUME: Record<Channel, number> = { voice: 1, music: 0.45, sfx: 0.7, ambience: 0.5 };

class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private gain = {} as Record<Channel, GainNode>;
  private settings: AudioSettings = { sound: true, narration: true, mono: false };
  private unlocked = false;
  private voice: HTMLAudioElement | null = null;
  private engineGain: GainNode | null = null;
  private engineSrc: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;
  private music: GainNode | null = null;

  /** Call on the first click or key press. Safe to call many times. */
  unlock() {
    this.unlocked = true;
    const ctx = this.context();
    if (ctx?.state === 'suspended') void ctx.resume();
  }

  configure(s: AudioSettings) {
    this.settings = s;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(s.sound ? 1 : 0, this.ctx.currentTime, 0.05);
      this.master.channelCount = s.mono ? 1 : 2;
      this.master.channelCountMode = s.mono ? 'explicit' : 'max';
    }
    if (!s.sound || !s.narration) this.stopVoice();
    if (!s.sound) this.engine(0);
  }

  private context(): AudioContext | null {
    if (!this.unlocked || !this.settings.sound) return this.ctx;
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.connect(ctx.destination);
      for (const c of Object.keys(VOLUME) as Channel[]) {
        const g = ctx.createGain();
        g.gain.value = VOLUME[c];
        g.connect(master);
        this.gain[c] = g;
      }
      this.ctx = ctx;
      this.master = master;
      this.configure(this.settings);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private whiteNoise(ctx: AudioContext): AudioBuffer {
    if (this.noise) return this.noise;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // A fixed sequence: the same noise on every device.
    let a = 12345;
    for (let i = 0; i < d.length; i++) {
      a = (a * 1664525 + 1013904223) >>> 0;
      d[i] = (a / 4294967296) * 2 - 1;
    }
    return (this.noise = buf);
  }

  private tone(freq: number, at: number, dur: number, level: number, type: OscillatorType = 'sine', channel: Channel = 'sfx') {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.012);
    g.gain.setValueAtTime(level, at + Math.max(0.012, dur - 0.03));
    g.gain.linearRampToValueAtTime(0, at + dur);
    o.connect(g).connect(this.gain[channel]);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private burst(at: number, dur: number, level: number, lowpass: number, highpass = 20) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.whiteNoise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = lowpass;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = highpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(lp).connect(hp).connect(g).connect(this.gain.sfx);
    src.start(at, (at * 0.37) % 1.5);
    src.stop(at + dur + 0.02);
  }

  /** Plays a named effect. Unknown names and a locked or muted bus are ignored. */
  play(name: SfxName | string) {
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'key': // a console key: a dry tick
        this.burst(t, 0.04, 0.22, 5200, 1400);
        this.tone(190, t, 0.035, 0.08, 'square');
        break;
      case 'confirm':
        this.tone(660, t, 0.09, 0.09);
        this.tone(990, t + 0.09, 0.14, 0.08);
        break;
      case 'wrong': // soft and low: failing teaches, it does not punish
        this.tone(196, t, 0.22, 0.1, 'triangle');
        this.tone(147, t + 0.12, 0.3, 0.09, 'triangle');
        break;
      case 'alarm': // master alarm: a warbling tone, four times
        for (let i = 0; i < 4; i++) {
          this.tone(750, t + i * 0.42, 0.2, 0.07, 'square');
          this.tone(1100, t + i * 0.42 + 0.2, 0.2, 0.06, 'square');
        }
        break;
      case 'quindar': // the two beeps that open and close a transmission from Mission Control
        this.tone(2525, t, 0.25, 0.05);
        this.burst(t + 0.25, 0.9, 0.035, 2600, 500);
        this.tone(2475, t + 1.2, 0.25, 0.05);
        break;
      case 'contact':
        this.burst(t, 0.5, 0.5, 160);
        this.tone(55, t, 0.5, 0.25);
        break;
      case 'catch': // the thread: rising fifths
        [392, 587, 784, 1175].forEach((f, i) => this.tone(f, t + i * 0.16, 1.4 - i * 0.2, 0.06, 'sine', 'music'));
        break;
      case 'pulse': // the midnight pulse: one clear note, then its echo 2.5 s later is played by the scene
        this.tone(880, t, 0.5, 0.12);
        this.tone(1760, t, 0.3, 0.04);
        break;
      case 'echo': // the answer: the same note, fainter
        this.tone(880, t, 0.5, 0.045);
        this.tone(1760, t, 0.3, 0.015);
        break;
      case 'laser': // the station's laser: a short charge, then a click
        this.tone(220, t, 0.35, 0.05, 'sawtooth');
        this.tone(1320, t + 0.35, 0.12, 0.08);
        this.burst(t + 0.35, 0.08, 0.2, 6000, 2000);
        break;
      case 'daisy':
        this.daisy(t);
        break;
      case 'static':
        this.burst(t, 0.7, 0.08, 4000, 800);
        break;
    }
  }

  /**
   * "Daisy Bell" (Harry Dacre, 1892, public domain), hummed by ARIADNE as she shuts down: each note a little
   * longer and a little lower than the last. Our own synthesis; no recording of any kind is used (15.3).
   * In 1961 an IBM 7094 sang this song: the first song ever performed by a computer.
   */
  private daisy(start: number) {
    const ctx = this.ctx!;
    // "Dai-sy, Dai-sy, give me your an-swer, do": note (Hz) and length in beats, in G major, three beats to the bar.
    const tune: [number, number][] = [
      [587.33, 3], [493.88, 3], [392.0, 3], [293.66, 3],
      [329.63, 1], [369.99, 1], [392.0, 1], [329.63, 2], [392.0, 1], [293.66, 5],
    ];
    const bus = ctx.createGain();
    bus.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    bus.connect(lp).connect(this.gain.music);
    this.music = bus;
    let at = start + 0.2;
    let beat = 0.42;
    let droop = 1;
    for (const [freq, beats] of tune) {
      const dur = beats * beat;
      for (const [mult, level, type] of [[1, 0.11, 'sine'], [2, 0.02, 'triangle']] as [number, number, OscillatorType][]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq * droop * mult, at);
        // The voice sags within each note, like a tape slowing down.
        o.frequency.linearRampToValueAtTime(freq * droop * mult * 0.985, at + dur);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(level, at + 0.08);
        g.gain.setValueAtTime(level, at + dur * 0.75);
        g.gain.linearRampToValueAtTime(0, at + dur);
        o.connect(g).connect(bus);
        o.start(at);
        o.stop(at + dur + 0.05);
      }
      at += dur;
      beat *= 1.09;
      droop *= 0.972;
    }
  }

  /** Stops a tune that is still playing (the player moved on). */
  stopMusic() {
    if (this.music && this.ctx) {
      this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      this.music = null;
    }
  }

  /** The descent engine as the crew felt it in the cabin: a low rumble. `level` is 0 to 1. */
  engine(level: number) {
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    if (!this.engineSrc && level > 0) {
      const src = ctx.createBufferSource();
      src.buffer = this.whiteNoise(ctx);
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 150;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(lp).connect(g).connect(this.gain.ambience);
      src.start();
      this.engineSrc = src;
      this.engineGain = g;
    }
    this.engineGain?.gain.setTargetAtTime(Math.max(0, Math.min(1, level)) * 0.9, ctx.currentTime, 0.25);
    if (level <= 0 && this.engineSrc) {
      const src = this.engineSrc;
      this.engineSrc = null;
      setTimeout(() => {
        try {
          src.stop();
        } catch {
          /* already stopped */
        }
      }, 1200);
    }
  }

  /**
   * Speaks a line by its id: public/assets/vo/vo_<id>_en.mp3. If the file is missing, or narration is off,
   * nothing happens and nothing waits (FR-34).
   */
  speak(id: string | undefined) {
    this.stopVoice();
    if (!id || !this.unlocked || !this.settings.sound || !this.settings.narration) return;
    const el = new Audio(asset(`assets/vo/vo_${id}_en.mp3`));
    el.volume = VOLUME.voice;
    el.addEventListener('error', () => {
      if (this.voice === el) this.voice = null;
    });
    this.voice = el;
    void el.play().catch(() => {});
  }

  stopVoice() {
    if (this.voice) {
      this.voice.pause();
      this.voice = null;
    }
  }
}

export const audio = new AudioBus();
