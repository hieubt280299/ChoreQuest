/** Lowercase, accents removed ("Đổ rác" → "do rac"), so Vietnamese can be typed with or without diacritics. */
export function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Typo-tolerant match of one query word (4+ letters) against the words of the text: the word's letters in
 * order, starting at the start of a text word, with at most one letter skipped ("vacum" → "vacuum"). 0 if no
 * match. Short words must match exactly, so "bat" doesn't loosely match unrelated quests.
 */
function looseWordScore(word: string, text: string): number {
  if (word.length < 4) return 0;
  for (const candidate of text.split(/\s+/)) {
    if (candidate[0] !== word[0]) continue;
    let position = 1;
    let gaps = 0;
    let ok = true;
    for (const char of word.slice(1)) {
      const found = candidate.indexOf(char, position);
      if (found < 0) {
        ok = false;
        break;
      }
      gaps += found - position;
      position = found + 1;
    }
    if (ok && gaps <= 1) return 30 - gaps * 10;
  }
  return 0;
}

/**
 * How well `query` matches `text` (0 = no match). Every word of the query must match: as a substring (best,
 * especially at the start of a word) or, for longer words, with a small typo.
 */
export function fuzzyScore(query: string, text: string): number {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;
  const haystack = foldText(text);
  let total = 0;
  for (const word of words) {
    const index = haystack.indexOf(word);
    if (index >= 0) {
      const wordStart = index === 0 || haystack[index - 1] === ' ';
      total += 100 + (wordStart ? 50 : 0) - Math.min(index, 40);
      continue;
    }
    const loose = looseWordScore(word, haystack);
    if (!loose) return 0;
    total += loose;
  }
  return total;
}

/** Best score of `query` against any of the texts (e.g. a quest's English and Vietnamese names). */
export function fuzzyScoreAny(query: string, texts: string[]): number {
  return Math.max(0, ...texts.map((text) => fuzzyScore(query, text)));
}
