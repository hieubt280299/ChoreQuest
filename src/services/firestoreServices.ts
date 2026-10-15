import { FirestoreError, runTransaction, updateDoc, type DocumentData, type DocumentReference, type UpdateData } from 'firebase/firestore';
import type { GameState } from '../types';
import { fromHouseholdDoc } from '../utils/gameState';
import type { TranslationKey } from '../utils/i18n';
import { applyOp, householdPatch, type GameOp, type OpResult } from '../utils/transactionUtils';

/** The op no longer applies to the latest server state (e.g. the quest was just logged by the other player). */
class OpRejected extends Error {
  constructor(readonly reason: TranslationKey) {
    super(reason);
  }
}

/** Errors that mean "no connection": the write is queued instead of run as a transaction. */
const OFFLINE_CODES = new Set(['unavailable', 'deadline-exceeded']);

/**
 * Saves one player action to the household document atomically:
 *
 * - **Online:** a Firestore transaction reads the latest document, re-applies the op on top of it and writes
 *   only the changed fields. If the other player wrote in between, Firestore retries with their data, so
 *   neither update is lost (wheel gold, tickets, XP and quest logs are recomputed on the fresh state rather
 *   than overwritten with a stale copy).
 * - **Offline** (transactions need the server): the op is applied to the last known state and written as a
 *   field-level update that Firestore queues until the connection is back.
 *
 * Resolves with the state the op produced, or the reason it was rejected.
 */
export async function commitOp(
  ref: DocumentReference<DocumentData>,
  op: GameOp,
  today: string,
  lastKnown: () => GameState | null,
): Promise<OpResult> {
  const queueOffline = (): OpResult => {
    const base = lastKnown();
    if (!base) return { ok: false, error: 'sync.error.saveFailed' };
    const result = applyOp(base, op, today);
    if (!result.ok) return result;
    const patch = householdPatch(base, result.state) as UpdateData<DocumentData>;
    // Not awaited: offline, the promise only settles once the server has the write.
    if (Object.keys(patch).length > 0) {
      updateDoc(ref, patch).catch((err) => console.error('ChoreQuest: failed to save household', err));
    }
    return result;
  };

  if (typeof navigator !== 'undefined' && navigator.onLine === false) return queueOffline();
  try {
    const state = await runTransaction(ref.firestore, async (tx) => {
      const snapshot = await tx.get(ref);
      const server = snapshot.exists() ? fromHouseholdDoc(snapshot.data(), today, false) : null;
      if (!server) throw new OpRejected('sync.error.saveFailed');
      const result = applyOp(server, op, today);
      if (!result.ok) throw new OpRejected(result.error);
      const patch = householdPatch(server, result.state) as UpdateData<DocumentData>;
      if (Object.keys(patch).length > 0) tx.update(ref, patch);
      return result.state;
    });
    return { ok: true, state };
  } catch (err) {
    if (err instanceof OpRejected) return { ok: false, error: err.reason };
    if (err instanceof FirestoreError && OFFLINE_CODES.has(err.code)) return queueOffline();
    console.error('ChoreQuest: failed to save household', err);
    return { ok: false, error: 'sync.error.saveFailed' };
  }
}
