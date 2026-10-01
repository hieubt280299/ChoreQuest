// "Brickroad Bounce": an original ChoreQuest loop in the style of classic NES platformer overworld
// themes (fast, bouncy, staccato; two square-wave voices, a triangle bass and noise percussion only).
// The melody is our own; no existing game music is reproduced. Synthesized live by utils/chiptune.ts,
// so there is no audio file to license, download or break.
//
// Each bar is 8 eighth-note steps. Melody tokens: a note (e.g. "C6", "F#5"), "-" to hold the previous
// note, "." for a rest. Chords drive the bass; drums use step indexes within a bar.

export interface ChordShape {
  /** Bass root and fifth (octave 2-3). */
  bass: [root: string, fifth: string];
}

export const CHORDS: Record<string, ChordShape> = {
  C: { bass: ['C3', 'G3'] },
  F: { bass: ['F2', 'C3'] },
  G: { bass: ['G2', 'D3'] },
  Am: { bass: ['A2', 'E3'] },
  Dm: { bass: ['D3', 'A3'] },
  Em: { bass: ['E2', 'B2'] },
};

export const SONG = {
  bpm: 190,
  stepsPerBar: 8,
  /** Key used to build the harmony voice (C major). */
  scale: [0, 2, 4, 5, 7, 9, 11],
  /** Fraction of a single step a lone note sounds for: short and bouncy. */
  articulation: 0.55,
  /** Second square voice a diatonic third below the lead, NES style. */
  harmony: 'thirdBelow' as const,
  /**
   * Triangle bass per bar: R = root, F = fifth, O = root an octave up, "." = rest.
   * A syncopated 3+3+2 (calypso / tresillo) bounce.
   */
  bassPattern: 'R..F..O.',
  // A: I - I - IV - V, I - vi - ii - V. B: IV - V - iii - vi, ii - V - I - I.
  chords: ['C', 'C', 'F', 'G', 'C', 'Am', 'Dm', 'G', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'C'],
  melody: [
    'C5 . E5 G5 . E5 G5 .',
    'C6 . . B5 A5 . G5 .',
    'A5 . F5 A5 . C6 . .',
    'B5 . A5 G5 . D5 . .',
    'E5 . G5 C6 . G5 E5 .',
    'A5 . . G5 E5 . C5 .',
    'D5 . F5 A5 . F5 D5 .',
    'G5 . . . B5 . D6 .',
    'C6 . A5 . F5 A5 . C6',
    'D6 . B5 . G5 B5 . D6',
    'E6 . D6 B5 . G5 . .',
    'C6 . B5 A5 . E5 . .',
    'F5 . A5 . D6 . C6 B5',
    'A5 . G5 . F5 . D5 .',
    'E5 G5 C6 . G5 E5 C5 .',
    'C5 . . . . . G4 .',
  ],
  drums: {
    // Noise channel only (the triangle bass carries the low end, as on the NES).
    kick: [] as number[],
    snare: [2, 6],
    hat: [0, 1, 3, 4, 5, 7],
    /** Bars (0-based) ending a phrase get a snare roll. */
    fillBars: [7, 15],
    fill: [4, 5, 6, 7],
  },
};
