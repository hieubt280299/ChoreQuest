import { APP_VERSION } from '../constants/patchNotes';

const KEY = 'chorequest.seenVersion';

/**
 * Whether this device last ran an older version, so "What's New" should show. Checked once at load, before the
 * app saves any settings: a device with no ChoreQuest data at all is a fresh install, which starts on the current
 * version without notes. Existing players (any saved settings) see the notes once after each update.
 */
function readPending(): boolean {
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === APP_VERSION) return false;
    if (seen !== null) return true;
    const existingPlayer = Object.keys(localStorage).some((key) => key.startsWith('chorequest.'));
    if (!existingPlayer) localStorage.setItem(KEY, APP_VERSION);
    return existingPlayer;
  } catch {
    // Storage unavailable: don't nag every launch.
    return false;
  }
}

let pending = typeof window !== 'undefined' ? readPending() : false;

/** "What's New" for this version hasn't been seen on this device yet. */
export function patchNotesPending(): boolean {
  return pending;
}

export function markPatchNotesSeen() {
  pending = false;
  try {
    localStorage.setItem(KEY, APP_VERSION);
  } catch {
    // Storage unavailable: it shows again next launch.
  }
}
