// Hand-made pixel art. Each sprite is a list of rows; every character is one pixel looked up in PIXEL_PALETTE
// ('.' = transparent). Keep rows of a sprite the same width.

export const PIXEL_PALETTE: Record<string, string> = {
  k: '#2b1a12', // outline / ink
  w: '#fff4d6', // hot white / highlight
  F: '#f2c29b', // skin
  f: '#d9936a', // skin shade
  // knight
  S: '#d6dbe3',
  s: '#9aa3b2',
  d: '#5f6878',
  R: '#c0412f',
  r: '#7e2a21',
  Y: '#f7c548',
  y: '#b7791f',
  B: '#7a4a2a',
  b: '#4a2c1a',
  // mage
  P: '#8a5a9c',
  p: '#5a3566',
  A: '#c0562c',
  a: '#7a3420',
  O: '#ffe08a',
  o: '#f39a3d',
  W: '#9c6337',
  // fire
  Q: '#ffd166',
  E: '#f39a3d',
  X: '#d9502f',
  x: '#8f2f22',
  // stone
  g: '#9a8a74',
  G: '#6b5d4d',
  // cat
  C: '#e8a55a',
  c: '#b8702f',
};

export type Sprite = readonly string[];

export const KNIGHT: Sprite[] = [
  [
    '......RRr.......',
    '.....RRRRr......',
    '....kkkkkkkk....',
    '...kSSSSSSssk...',
    '...kSSSSSSssk...',
    '...kddddddddk...',
    '...kdFFFFFFdk...',
    '...kdFkFFkFdk...',
    '...kdFFFFffdk...',
    '...kSSSSSSssk...',
    '....kkkkkkkk....',
    '..kRRSSYYSsRRk..',
    '..kRSSSYYSSsRk..',
    '..kFSSSSSSSsFk..',
    '..kkBBByBBBBkk..',
    '...kdsskkssdk...',
    '...kkkk..kkkk...',
  ],
];
// Blink frame: eyes closed.
KNIGHT.push(KNIGHT[0].map((row, i) => (i === 7 ? '...kdFfFFfFdk...' : row)));

export const MAGE: Sprite[] = [
  [
    '........kkk....kk.',
    '.......kPPk...kOOk',
    '......kPPPpk..kOok',
    '.....kPPPPpk...kk.',
    '....kPPPPPPpk..W..',
    '..kYYYYYYYYYYk.W..',
    '...kkAAAAAAAkk.W..',
    '...kAFFFFFFFAk.W..',
    '...kAFkFFFkFAk.W..',
    '...kAFFFfFFFAk.W..',
    '...kaAFFFFFAak.W..',
    '...kakkPPPkkak.W..',
    '..kPPPPPYPPPPPkF..',
    '..kpPPPPYPPPPpkW..',
    '..kpPPPPYPPPPpkW..',
    '..kppPPPYPPPppkW..',
    '...kkkkkkkkkkk.W..',
  ],
];
MAGE.push(MAGE[0].map((row, i) => (i === 8 ? '...kAFfFFFfFAk.W..' : row)));

const LOGS = ['..bBBBXQQXBBBb..', '..gbbBBBBBBbbg..', '.gGgBBbbbbBBgGg.', '..gGgGgGgGgGgG..'];

export const FIRE: Sprite[] = [
  [
    '.......X........',
    '......XEX.......',
    '......XEX...X...',
    '.....XEQEX..XX..',
    '..X..XEQEX.XEX..',
    '..XX.XQQQEXXEX..',
    '..XEXQQwQQEEX...',
    '...XEQQwwQQEX...',
    '...XEQwwwwQEX...',
    '....XQQwwQQX....',
    ...LOGS,
  ],
  [
    '........X.......',
    '........XX......',
    '...X...XEX......',
    '..XX...XEEX.....',
    '..XEX.XEQEX..X..',
    '...XEXXEQQEX.XX.',
    '...XEEQQwQQEXX..',
    '...XEQQwwQQEX...',
    '...XEQwwwwQEX...',
    '....XQQwwQQX....',
    ...LOGS,
  ],
  [
    '......X.........',
    '......XX....X...',
    '.....XEX...XEX..',
    '.....XEEX..XEX..',
    '.X...XEQEX..X...',
    '.XX..XQQQEX.X...',
    '..XEXQQwQQEEXX..',
    '...XEQQwwQQEX...',
    '...XEQwwwwQEX...',
    '....XQQwwQQX....',
    ...LOGS,
  ],
];

export const COIN: Sprite[] = [
  ['..kkkk..', '.kQQQYk.', 'kQQwQQYk', 'kQwQQQYk', 'kQQQQQYk', 'kQQQQYyk', '.kyyyyk.', '..kkkk..'],
  ['...kk...', '..kQYk..', '.kQwQYk.', '.kQQQYk.', '.kQQQYk.', '.kQQYyk.', '..kyyk..', '...kk...'],
  ['...kk...', '...Yk...', '...Yk...', '...Yk...', '...Yk...', '...yk...', '...yk...', '...kk...'],
  ['...kk...', '..kYQk..', '.kYQwQk.', '.kYQQQk.', '.kYQQQk.', '.kyYQQk.', '..kyyk..', '...kk...'],
];

export const CAT: Sprite[] = [
  [
    '..k...k..........',
    '.kCk.kCk.........',
    '.kCCkCCkkkkk.....',
    'kCCCCCCCCCCCk....',
    'kCkkCCCCCcCCCk...',
    'kCCCCCCCCccCCCkk.',
    '.kkkkkkkkkkkkcCCk',
    '.............kkk.',
  ],
  [
    '..k...k..........',
    '.kCk.kCk.........',
    '.kCCkCCkkkkk.....',
    'kCCCCCCCCCCCk....',
    'kCkkCCCCCcCCCk.kk',
    'kCCCCCCCCccCCCkCk',
    '.kkkkkkkkkkkkkkk.',
    '.................',
  ],
];

// Small props for the hearth scene.
export const CANDLE: Sprite[] = [
  ['.Q.', 'QEQ', '.w.', 'kwk', 'kwk', 'kwk', 'kyk'],
  ['..Q', '.EQ', '.w.', 'kwk', 'kwk', 'kwk', 'kyk'],
];

export const POTION: Sprite[] = [['.kk.', '.bb.', 'kPPk', 'kPwk', 'kPPk', '.kk.']];

export const HEART: Sprite[] = [['.XX.XX.', 'XwXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']];

