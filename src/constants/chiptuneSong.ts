// "Hearthside Stroll": an original cozy chiptune loop for ChoreQuest, synthesized live by
// utils/chiptune.ts, so there is no audio file to license, download or break.
//
// Each bar is 8 eighth-note steps. Melody tokens: a note (e.g. "C5", "Bb4"), "-" to hold the
// previous note, "." for a rest. Chords drive the bass and arpeggio voices.

export interface ChordShape {
  /** Bass root and fifth (octave 2-3). */
  bass: [root: string, fifth: string];
  /** Triad for the arpeggio (octave 4-5). */
  tones: [string, string, string];
}

export const CHORDS: Record<string, ChordShape> = {
  F: { bass: ['F2', 'C3'], tones: ['F4', 'A4', 'C5'] },
  Am: { bass: ['A2', 'E3'], tones: ['A4', 'C5', 'E5'] },
  Bb: { bass: ['Bb2', 'F3'], tones: ['Bb4', 'D5', 'F5'] },
  C: { bass: ['C3', 'G3'], tones: ['C5', 'E5', 'G5'] },
  Dm: { bass: ['D3', 'A3'], tones: ['D5', 'F5', 'A5'] },
};

export const SONG = {
  bpm: 100,
  stepsPerBar: 8,
  // A section: I - iii - IV - V, twice. B section: vi - IV - I - V, then home.
  chords: ['F', 'Am', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'F'],
  melody: [
    'C5 - A4 - C5 - F5 -',
    'E5 - C5 - E5 D5 C5 -',
    'D5 - Bb4 - D5 - F5 -',
    'E5 - D5 C5 G4 - . .',
    'C5 - A4 - C5 - F5 -',
    'A5 - G5 F5 E5 - C5 -',
    'D5 - F5 - Bb5 - A5 G5',
    'G5 - E5 - C5 - . .',
    'D5 - F5 - A5 - F5 -',
    'F5 - D5 - Bb4 - D5 -',
    'C5 - F5 - A5 - G5 F5',
    'E5 - G5 - C5 - . .',
    'F5 - E5 D5 A4 - D5 -',
    'D5 - C5 Bb4 F4 - Bb4 D5',
    'C5 - E5 - G5 - E5 -',
    'F5 - - - - - . .',
  ],
} as const;
