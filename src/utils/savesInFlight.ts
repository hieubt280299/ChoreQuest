// Player actions sent to the household that the server hasn't confirmed yet. A reload in between would lose them
// (offline saves are different: they're queued in Firestore's local cache, which survives a reload).
let pending = 0;

/** Counts `save` as in flight until it settles. */
export function trackSave<T>(save: Promise<T>): Promise<T> {
  pending += 1;
  return save.finally(() => {
    pending -= 1;
  });
}

export function savesInFlight(): boolean {
  return pending > 0;
}
