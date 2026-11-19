import type { Task } from '../types';

/** The Lucky Quest pays this many times its base gold (before skills, streaks and the "Both" split). */
export const LUCKY_GOLD_MULTIPLIER = 2;

/** FNV-1a: a small, stable string hash, so every device picks the same quest for a day. */
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193) >>> 0;
  }
  return value;
}

/**
 * The day's Lucky Quest: one enabled quest, the same for both players, picked from the date. Quests are sorted by id
 * first, so the order they're listed in doesn't matter. `null` when no quest is enabled.
 */
export function luckyQuestId(tasks: Pick<Task, 'id' | 'enabled'>[], date: string): string | null {
  const ids = tasks
    .filter((task) => task.enabled)
    .map((task) => task.id)
    .sort();
  return ids.length > 0 ? ids[hash(date) % ids.length] : null;
}

/** A quest's base reward with the Lucky Quest's gold applied (XP is unchanged). */
export function luckyBase<T extends Pick<Task, 'gold'>>(base: T, lucky: boolean): T {
  return lucky ? { ...base, gold: base.gold * LUCKY_GOLD_MULTIPLIER } : base;
}
