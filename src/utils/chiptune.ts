import { CHORDS, SONG } from '../constants/chiptuneSong';

// Tiny Web Audio chiptune synth: NES-style pulse/triangle/noise voices, a look-ahead
// sequencer for the background loop, and one-shot sound effects. No audio files.

type AudioContextCtor = typeof AudioContext;

const AudioCtor: AudioContextCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);

export const audioSupported = Boolean(AudioCtor);

const NOTE_OFFSETS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" -> 60, "Bb4" -> 70, "F#3" -> 54 */
export function noteToMidi(note: string): number {
  const match = /^([A-G])(#|b)?(-?\d)$/.exec(note);
  if (!match) throw new Error(`Bad note: ${note}`);
  const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return 12 * (Number(match[3]) + 1) + NOTE_OFFSETS[match[1]] + accidental;
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

type Voice = 'lead' | 'harmony' | 'bass' | 'hat' | 'kick' | 'snare';
interface NoteEvent {
  voice: Voice;
  midi: number;
  /** Length in steps. */
  steps: number;
}

/** The note a diatonic third below `midi` in the given scale (pitch classes), or null if outside it. */
function thirdBelow(midi: number, scale: readonly number[]): number | null {
  const index = scale.indexOf(midi % 12);
  if (index < 0) return null;
  const target = index - 2;
  const octaveShift = target < 0 ? -12 : 0;
  return midi - (midi % 12) + scale[(target + scale.length) % scale.length] + octaveShift;
}

/** Flattens the song into per-step events. Exported for validation. */
export function compileSong(): NoteEvent[][] {
  const { stepsPerBar, chords, melody } = SONG;
  if (chords.length !== melody.length) throw new Error('Song: chords and melody bar counts differ');
  const total = chords.length * stepsPerBar;
  const steps: NoteEvent[][] = Array.from({ length: total }, () => []);

  const leadTokens = melody.flatMap((bar, index) => {
    const tokens = bar.split(/\s+/);
    if (tokens.length !== stepsPerBar) throw new Error(`Song: bar ${index + 1} has ${tokens.length} steps`);
    return tokens;
  });
  leadTokens.forEach((token, step) => {
    if (token === '-' || token === '.') return;
    let length = 1;
    while (leadTokens[(step + length) % total] === '-' && length < total) length += 1;
    const midi = noteToMidi(token);
    steps[step].push({ voice: 'lead', midi, steps: length });
    // Second square voice a diatonic third below the lead.
    const harmony = thirdBelow(midi, SONG.scale);
    if (harmony !== null) steps[step].push({ voice: 'harmony', midi: harmony, steps: length });
  });

  const { drums } = SONG;
  chords.forEach((name, bar) => {
    const chord = CHORDS[name];
    if (!chord) throw new Error(`Song: unknown chord ${name}`);
    const base = bar * stepsPerBar;
    const [root, fifth] = chord.bass.map(noteToMidi);
    // Triangle bass following the song's per-bar pattern (each hit lasts until the next).
    const pattern = SONG.bassPattern.split('');
    pattern.forEach((symbol, step) => {
      if (symbol === '.') return;
      const midi = symbol === 'F' ? fifth : symbol === 'O' ? root + 12 : root;
      let length = 1;
      while (step + length < pattern.length && pattern[step + length] === '.') length += 1;
      steps[base + step].push({ voice: 'bass', midi, steps: length });
    });
    // Drums, with a snare fill closing each phrase.
    const fill = (drums.fillBars as readonly number[]).includes(bar);
    drums.kick.forEach((step) => steps[base + step].push({ voice: 'kick', midi: 0, steps: 1 }));
    (fill ? drums.fill : drums.snare).forEach((step) => steps[base + step].push({ voice: 'snare', midi: 0, steps: 1 }));
    drums.hat.forEach((step) => steps[base + step].push({ voice: 'hat', midi: 0, steps: 1 }));
  });
  return steps;
}

const MIX: Record<Voice, number> = { lead: 0.12, harmony: 0.055, bass: 0.3, hat: 0.018, kick: 0.45, snare: 0.06 };
const LOOKAHEAD_S = 0.15;
const TICK_MS = 25;

export class ChiptuneEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmBus!: GainNode;
  private sfxBus!: GainNode;
  private waves!: Record<'pulse25' | 'pulse50', PeriodicWave>;
  private noise!: AudioBuffer;
  private readonly song = compileSong();
  private readonly stepSeconds = 60 / SONG.bpm / 2;
  private timer: number | undefined;
  private stopTimer: number | undefined;
  private step = 0;
  private nextStepTime = 0;
  private muted = true;
  private bgmVolume = 0.3;
  private sfxVolume = 0.5;

  get running() {
    return this.ctx?.state === 'running';
  }

  /** Creates/resumes the AudioContext. Browsers only allow this inside a user gesture. */
  unlock() {
    if (!AudioCtor) return;
    if (!this.ctx) this.init(new AudioCtor());
    if (!this.muted && !document.hidden) void this.ctx?.resume();
  }

  private init(ctx: AudioContext) {
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // Music goes through a gentle low-pass so square waves stay bright but never harsh.
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 5000;
    warmth.connect(this.master);
    this.bgmBus = ctx.createGain();
    this.bgmBus.gain.value = 0;
    this.bgmBus.connect(warmth);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxVolume;
    this.sfxBus.connect(this.master);

    this.waves = {
      pulse25: this.pulseWave(0.25),
      pulse50: this.pulseWave(0.5),
    };
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }

  /** Band-limited NES-style pulse wave with the given duty cycle. */
  private pulseWave(duty: number): PeriodicWave {
    const harmonics = 48;
    const real = new Float32Array(harmonics);
    const imag = new Float32Array(harmonics);
    for (let n = 1; n < harmonics; n += 1) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return this.ctx!.createPeriodicWave(real, imag);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    const ctx = this.ctx;
    if (!ctx) return;
    this.master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    if (muted) window.setTimeout(() => this.muted && void ctx.suspend(), 150);
    else if (!document.hidden) void ctx.resume();
  }

  setBgmVolume(volume: number) {
    this.bgmVolume = volume;
    const playing = this.timer !== undefined && this.stopTimer === undefined;
    if (this.ctx && playing) this.bgmBus.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(volume: number) {
    this.sfxVolume = volume;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
  }

  /** Pause everything (e.g. tab hidden) without changing settings. */
  suspend() {
    void this.ctx?.suspend();
  }

  resume() {
    if (!this.muted) void this.ctx?.resume();
  }

  startBgm() {
    const ctx = this.ctx;
    if (!ctx) return;
    window.clearTimeout(this.stopTimer);
    this.stopTimer = undefined;
    if (this.timer === undefined) {
      this.step = 0;
      this.nextStepTime = ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), TICK_MS);
    }
    this.bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    this.bgmBus.gain.setTargetAtTime(this.bgmVolume, ctx.currentTime, 0.4);
  }

  stopBgm() {
    const ctx = this.ctx;
    if (!ctx || this.timer === undefined || this.stopTimer !== undefined) return;
    this.bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    this.bgmBus.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    this.stopTimer = window.setTimeout(() => {
      window.clearInterval(this.timer);
      this.timer = undefined;
      this.stopTimer = undefined;
    }, 600);
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    // If the main thread stalled, skip ahead instead of firing a burst of late notes.
    if (this.nextStepTime < ctx.currentTime - 0.2) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + LOOKAHEAD_S) {
      for (const event of this.song[this.step]) this.playEvent(event, this.nextStepTime);
      this.nextStepTime += this.stepSeconds;
      this.step = (this.step + 1) % this.song.length;
    }
  }

  private playEvent(event: NoteEvent, when: number) {
    const length = event.steps * this.stepSeconds;
    // Lone notes are short and bouncy; held notes ring for most of their length.
    const articulated = event.steps === 1 ? this.stepSeconds * SONG.articulation : length * 0.9;
    switch (event.voice) {
      case 'lead':
        this.tone({ bus: this.bgmBus, wave: this.waves.pulse50, midi: event.midi, when, dur: articulated, gain: MIX.lead, vibrato: event.steps >= 3 });
        break;
      case 'harmony':
        this.tone({ bus: this.bgmBus, wave: this.waves.pulse25, midi: event.midi, when, dur: articulated, gain: MIX.harmony });
        break;
      case 'bass':
        this.tone({ bus: this.bgmBus, wave: 'triangle', midi: event.midi, when, dur: length * 0.7, gain: MIX.bass });
        break;
      case 'hat':
        this.hat(when, MIX.hat);
        break;
      case 'kick':
        this.kick(when, MIX.kick);
        break;
      case 'snare':
        this.snare(when, MIX.snare);
        break;
    }
  }

  private tone({
    bus,
    wave,
    midi,
    when,
    dur,
    gain,
    vibrato = false,
    slideTo,
  }: {
    bus: GainNode;
    wave: PeriodicWave | OscillatorType;
    midi: number;
    when: number;
    dur: number;
    gain: number;
    vibrato?: boolean;
    slideTo?: number;
  }) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (wave instanceof PeriodicWave) osc.setPeriodicWave(wave);
    else osc.type = wave;
    osc.frequency.setValueAtTime(midiToFreq(midi), when);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(midiToFreq(slideTo), when + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(gain, when + 0.006);
    env.gain.setTargetAtTime(gain * 0.55, when + 0.02, dur * 0.6);
    env.gain.setTargetAtTime(0, when + dur, 0.03);
    osc.connect(env).connect(bus);

    let lfo: OscillatorNode | undefined;
    if (vibrato) {
      // Delayed, gentle vibrato on held notes, a classic RPG-town touch.
      lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(midiToFreq(midi) * 0.012, when + Math.min(0.35, dur));
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(when);
      lfo.stop(when + dur + 0.2);
    }
    osc.start(when);
    osc.stop(when + dur + 0.2);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
      lfo?.disconnect();
    };
  }

  /** Punchy pitch-drop kick. */
  private kick(when: number, gain: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.11);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
    osc.connect(env).connect(this.bgmBus);
    osc.start(when);
    osc.stop(when + 0.16);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  }

  /** NES-style snare: band-passed noise burst plus a short tonal body. */
  private snare(when: number, gain: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
    source.connect(band).connect(env).connect(this.bgmBus);
    source.start(when);
    source.stop(when + 0.14);
    source.onended = () => {
      source.disconnect();
      band.disconnect();
      env.disconnect();
    };
    this.tone({ bus: this.bgmBus, wave: 'triangle', midi: noteToMidi('G3'), when, dur: 0.04, gain: gain * 0.8 });
  }

  private hat(when: number, gain: number) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
    source.connect(filter).connect(env).connect(this.bgmBus);
    source.start(when);
    source.stop(when + 0.05);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  }

  private sfxReady(): boolean {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  /** Subtle retro button tick. */
  playClick() {
    if (!this.sfxReady()) return;
    const t = this.ctx!.currentTime + 0.005;
    this.tone({ bus: this.sfxBus, wave: this.waves.pulse50, midi: noteToMidi('A6'), when: t, dur: 0.025, gain: 0.12 });
  }

  /** Classic two-note coin pickup. */
  playCoin(delay = 0) {
    if (!this.sfxReady()) return;
    const t = this.ctx!.currentTime + 0.01 + delay;
    this.tone({ bus: this.sfxBus, wave: this.waves.pulse50, midi: noteToMidi('B5'), when: t, dur: 0.07, gain: 0.22 });
    this.tone({ bus: this.sfxBus, wave: this.waves.pulse50, midi: noteToMidi('E6'), when: t + 0.07, dur: 0.32, gain: 0.22 });
  }

  /** Rising arpeggio into a held major chord, with the music ducked underneath. */
  playLevelUp(delay = 0) {
    if (!this.sfxReady()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01 + delay;
    ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((note, index) =>
      this.tone({ bus: this.sfxBus, wave: this.waves.pulse25, midi: noteToMidi(note), when: t + index * 0.07, dur: 0.08, gain: 0.2 }),
    );
    const hold = t + 0.45;
    ['C6', 'E6', 'G6'].forEach((note) =>
      this.tone({ bus: this.sfxBus, wave: this.waves.pulse25, midi: noteToMidi(note), when: hold, dur: 0.7, gain: 0.11, vibrato: true }),
    );
    this.tone({ bus: this.sfxBus, wave: 'triangle', midi: noteToMidi('C4'), when: hold, dur: 0.7, gain: 0.3 });
    this.tone({ bus: this.sfxBus, wave: 'triangle', midi: noteToMidi('G3'), when: t, dur: 0.4, gain: 0.25, slideTo: noteToMidi('C4') });

    if (this.timer !== undefined) {
      this.bgmBus.gain.setTargetAtTime(this.bgmVolume * 0.3, t, 0.05);
      this.bgmBus.gain.setTargetAtTime(this.bgmVolume, t + 1.3, 0.3);
    }
  }

  /** Grand ~3s mastery fanfare: snare roll, three rising arpeggios, then a held chord over the bass. */
  playMastery(delay = 0) {
    if (!this.sfxReady()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.01 + delay;
    const roll = this.snareRollAt(t);
    const phrases: [string[], number][] = [
      [['C5', 'E5', 'G5', 'C6'], roll],
      [['F5', 'A5', 'C6', 'F6'], roll + 0.42],
      [['G5', 'B5', 'D6', 'G6'], roll + 0.84],
    ];
    for (const [notes, start] of phrases) {
      notes.forEach((note, index) =>
        this.tone({ bus: this.sfxBus, wave: this.waves.pulse50, midi: noteToMidi(note), when: start + index * 0.09, dur: 0.1, gain: 0.18 }),
      );
      this.tone({ bus: this.sfxBus, wave: 'triangle', midi: noteToMidi(notes[0]) - 24, when: start, dur: 0.36, gain: 0.3 });
    }
    const hold = roll + 1.3;
    ['C6', 'E6', 'G6', 'C7'].forEach((note) =>
      this.tone({ bus: this.sfxBus, wave: this.waves.pulse25, midi: noteToMidi(note), when: hold, dur: 1.4, gain: 0.09, vibrato: true }),
    );
    this.tone({ bus: this.sfxBus, wave: 'triangle', midi: noteToMidi('C3'), when: hold, dur: 1.4, gain: 0.35 });

    if (this.timer !== undefined) {
      this.bgmBus.gain.setTargetAtTime(this.bgmVolume * 0.15, t, 0.05);
      this.bgmBus.gain.setTargetAtTime(this.bgmVolume, hold + 1.6, 0.4);
    }
  }

  /** Quick snare roll on the effects bus; returns when it ends. */
  private snareRollAt(when: number): number {
    const ctx = this.ctx!;
    for (let index = 0; index < 6; index += 1) {
      const at = when + index * 0.05;
      const source = ctx.createBufferSource();
      source.buffer = this.noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 2000;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.05 + index * 0.02, at);
      env.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
      source.connect(band).connect(env).connect(this.sfxBus);
      source.start(at);
      source.stop(at + 0.07);
      source.onended = () => {
        source.disconnect();
        band.disconnect();
        env.disconnect();
      };
    }
    return when + 0.32;
  }
}
