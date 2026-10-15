import type { GameState } from '../types';
import type { TranslationKey } from './i18n';
import { advanceDays, pruneLogs, toHouseholdSections } from './gameState';

/**
 * One player action as a pure function of the game state. It may run several times (optimistically on this
 * device, again on each new server snapshot while it's pending, and inside a Firestore transaction that
 * retries on contention), so it must not read clocks, roll dice or cause side effects: anything like that is
 * decided once, before the op is built.
 */
export interface GameOp {
  /**
   * Idempotency key. Applied ops are remembered in `appliedOps`, so an op that already reached the server is
   * never applied twice (e.g. a snapshot arriving before its transaction resolves). Omit it for upkeep that is
   * naturally idempotent (settling days), so it doesn't record anything.
   */
  id?: string;
  /** The new state, or the reason it can't be applied (e.g. the quest was just done by the other player). */
  update: (current: GameState) => GameState | TranslationKey;
}

export type OpResult = { ok: true; state: GameState } | { ok: false; error: TranslationKey };

/** How many op ids are remembered: far more than can be in flight from two players at once. */
export const APPLIED_OPS_LIMIT = 40;

/** Settles any days that passed, then trims old logs and events. */
export function settle(state: GameState, today: string): GameState {
  const settled = advanceDays(state, today);
  const logs = pruneLogs(settled.logs, today);
  const events = pruneLogs(settled.events, today);
  // Same object when nothing was due, so callers can tell whether there is anything to save.
  if (logs.length === settled.logs.length && events.length === settled.events.length) return settled;
  return { ...settled, logs, events };
}

/** Applies an op on top of `state` (settled to `today` first), at most once per op id. */
export function applyOp(state: GameState, op: GameOp, today: string): OpResult {
  const base = settle(state, today);
  if (op.id && base.appliedOps?.includes(op.id)) return { ok: true, state: base };
  const next = op.update(base);
  if (typeof next === 'string') return { ok: false, error: next };
  const recorded = op.id ? { ...next, appliedOps: [op.id, ...(next.appliedOps ?? [])].slice(0, APPLIED_OPS_LIMIT) } : next;
  return { ok: true, state: settle(recorded, today) };
}

/** The server state with every still-pending op replayed on top (ops that no longer apply are skipped). */
export function replayOps(server: GameState, ops: GameOp[], today: string): GameState {
  return ops.reduce((state, op) => {
    const result = applyOp(state, op, today);
    return result.ok ? result.state : state;
  }, settle(server, today));
}

/**
 * Field-path patch (`updateDoc` / `transaction.update`) with only what changed between two states. Each
 * player's character is its own path (`game.characters.husband` / `game.characters.wife`), so one player's
 * write never carries the other's character, and moderator-only `settings` are only written when changed.
 */
export function householdPatch(prev: GameState, next: GameState): Record<string, unknown> {
  const before = toHouseholdSections(prev);
  const after = toHouseholdSections(next);
  const fields: Record<string, [unknown, unknown]> = {
    'settings.tasks': [before.settings.tasks, after.settings.tasks],
    'settings.prizePool': [before.settings.prizePool, after.settings.prizePool],
    chronicle: [before.chronicle, after.chronicle],
    'game.characters.husband': [before.game.characters.husband, after.game.characters.husband],
    'game.characters.wife': [before.game.characters.wife, after.game.characters.wife],
    'game.logs': [before.game.logs, after.game.logs],
    'game.prizeHistory': [before.game.prizeHistory, after.game.prizeHistory],
    'game.wheel': [before.game.wheel, after.game.wheel],
    'game.events': [before.game.events, after.game.events],
    'game.cosmetics': [before.game.cosmetics, after.game.cosmetics],
    'game.mvpSettledOn': [before.game.mvpSettledOn, after.game.mvpSettledOn],
    'game.levelResetAt': [before.game.levelResetAt, after.game.levelResetAt],
    'game.appliedOps': [before.game.appliedOps, after.game.appliedOps],
  };
  const patch: Record<string, unknown> = {};
  for (const [path, [a, b]] of Object.entries(fields)) {
    // These optional markers are only ever set, never cleared.
    if (b === undefined) continue;
    if (JSON.stringify(a) !== JSON.stringify(b)) patch[path] = b;
  }
  return patch;
}
