// "Over the Hill Road": an original, lively chiptune loop for ChoreQuest in the spirit of a classic
// 16-bit JRPG world map. Synthesized live by utils/chiptune.ts, so there is no audio file to
// license, download or break.
//
// Each bar is 8 eighth-note steps. Melody tokens: a note (e.g. "D5", "F#5"), "-" to hold the
// previous note, "." for a rest. Chords drive the bass and arpeggio voices; drums use step indexes.

export interface ChordShape {
  /** Bass root and fifth (octave 2-3). */
  bass: [root: string, fifth: string];
  /** Triad for the arpeggio. */
  tones: [string, string, string];
}

export const CHORDS: Record<string, ChordShape> = {
  G: { bass: ['G2', 'D3'], tones: ['G4', 'B4', 'D5'] },
  D: { bass: ['D3', 'A3'], tones: ['D4', 'F#4', 'A4'] },
  Em: { bass: ['E2', 'B2'], tones: ['E4', 'G4', 'B4'] },
  C: { bass: ['C3', 'G3'], tones: ['C4', 'E4', 'G4'] },
};

export const SONG = {
  bpm: 132,
  stepsPerBar: 8,
  // A: I - V - vi - IV, I - V - IV - V (heroic theme). B: vi - IV - I - V, IV - V - V7 - I (climb and home).
  chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'Em', 'C', 'G', 'D', 'C', 'D', 'D', 'G'],
  melody: [
    'D5 - G5 - B5 - A5 G5',
    'F#5 - D5 - A4 - D5 -',
    'E5 - G5 - B5 - G5 E5',
    'C5 - E5 G5 C6 - B5 A5',
    'B5 - - A5 G5 - D5 -',
    'A5 - - G5 F#5 - D5 -',
    'E5 - G5 - C6 - B5 A5',
    'A5 - - - . . D5 E5',
    'G5 - F#5 E5 B4 - E5 -',
    'E5 - D5 C5 G4 - C5 -',
    'D5 - G5 - B5 - D6 -',
    'C6 - B5 A5 F#5 - A5 -',
    'E5 - G5 C6 E6 - D6 C6',
    'B5 - A5 G5 F#5 - E5 F#5',
    'D5 - F#5 - A5 - C6 -',
    'B5 - - - G5 - . .',
  ],
  drums: {
    kick: [0, 3, 4],
    snare: [2, 6],
    hat: [1, 3, 5, 7],
    /** Bars (0-based) ending a phrase get a snare fill. */
    fillBars: [7, 15],
    fill: [5, 6, 7],
  },
} as const;
