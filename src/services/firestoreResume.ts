import { disableNetwork, enableNetwork, type Firestore } from 'firebase/firestore';
import { savesInFlight } from '../utils/savesInFlight';

/** Time in the background after which coming back restarts the connection (the OS may have frozen the app). */
export const RECONNECT_AFTER_HIDDEN_MS = 5_000;

/** Whether coming back after this long in the background should restart the connection to Firestore. */
export function shouldReconnect(hiddenForMs: number): boolean {
  return hiddenForMs >= RECONNECT_AFTER_HIDDEN_MS;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Keeps the household live after the app comes back to the screen. Phones freeze an installed app in the background,
 * and Firestore's live connection can die there without the SDK noticing, so the screen kept showing old data
 * (the partner's hearts, spins and quests) until the app was closed and reopened. Coming back after a few seconds
 * away, or from the back/forward cache, restarts the connection, which fetches the latest data at once. Returns a
 * function that stops listening.
 */
export function reconnectOnResume(db: Firestore): () => void {
  let hiddenAt: number | null = document.visibilityState === 'hidden' ? Date.now() : null;
  let running = false;

  const reconnect = async () => {
    if (running) return;
    running = true;
    try {
      // A save in progress is a transaction, which needs the connection: let it finish first (it's quick).
      for (let tries = 0; tries < 40 && savesInFlight(); tries += 1) await wait(250);
      await disableNetwork(db);
      await enableNetwork(db);
    } catch (err) {
      console.warn('ChoreQuest: could not reconnect', err);
    } finally {
      running = false;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
      return;
    }
    const away = hiddenAt === null ? 0 : Date.now() - hiddenAt;
    hiddenAt = null;
    if (shouldReconnect(away)) void reconnect();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) void reconnect();
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
  };
}
