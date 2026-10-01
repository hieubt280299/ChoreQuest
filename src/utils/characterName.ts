/** Longest allowed character name, in Unicode characters. */
export const CHARACTER_NAME_MAX = 16;

// Letters (any script, incl. Vietnamese with combining marks), digits and spaces.
const ALLOWED = /^[\p{L}\p{M}\p{N} ]*$/u;

/**
 * Caps typed text at CHARACTER_NAME_MAX real characters (NFC code points, so a Vietnamese letter with
 * accents counts once). Spaces are kept so typing isn't disturbed; normalizeCharacterName trims later.
 */
export function clampCharacterName(raw: string): string {
  const composed = raw.normalize('NFC');
  const chars = Array.from(composed);
  return chars.length > CHARACTER_NAME_MAX ? chars.slice(0, CHARACTER_NAME_MAX).join('') : composed;
}

/**
 * Cleans a typed name: NFC-normalised, trimmed, inner runs of spaces collapsed. Returns '' for a
 * blank name (= show the role), the cleaned name when valid, or null when it's too long or uses
 * other characters.
 */
export function normalizeCharacterName(raw: string): string | null {
  const value = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!ALLOWED.test(value)) return null;
  if (Array.from(value).length > CHARACTER_NAME_MAX) return null;
  return value;
}
