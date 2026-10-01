import type { CharacterId, Streak, TaskLog } from '../types';
import { addDays } from './calculations';

// Consecutive-day quest streaks. They're derived from the quest log rather than stored, so undoing or
// re-assigning an entry automatically fixes them and there's nothing to keep in sync.

/** Bonus gold for streak days 3..10 (Fibonacci); longer streaks stay at the day-10 value. */
export const STREAK_BONUS_GOLD = [1, 1, 2, 3, 5, 8, 13, 21] as const;
export const STREAK_MIN_DAYS = 3;
export const STREAK_MAX_DAYS = STREAK_MIN_DAYS + STREAK_BONUS_GOLD.length - 1;

/** Gold a completion earns on the given day of a streak (0 before day 3). */
export function streakBonusGold(days: number): number {
  if (days < STREAK_MIN_DAYS) return 0;
  return STREAK_BONUS_GOLD[Math.min(days, STREAK_MAX_DAYS) - STREAK_MIN_DAYS];
}

/** A completion counts toward a character's streak if they did it alone or together ("both"). */
export function involves(log: Pick<TaskLog, 'completedBy'>, characterId: CharacterId): boolean {
  return log.completedBy === characterId || log.completedBy === 'both';
}

/** Dates on which each character completed each quest: taskId -> characterId -> dates. */
export type StreakIndex = Map<string, Record<CharacterId, Set<string>>>;

export function buildStreakIndex(logs: TaskLog[], excludeLogId?: string): StreakIndex {
  const index: StreakIndex = new Map();
  for (const log of logs) {
    if (log.id === excludeLogId) continue;
    let entry = index.get(log.taskId);
    if (!entry) {
      entry = { husband: new Set(), wife: new Set() };
      index.set(log.taskId, entry);
    }
    for (const id of ['husband', 'wife'] as CharacterId[]) {
      if (involves(log, id)) entry[id].add(log.date);
    }
  }
  return index;
}

/** Consecutive days ending on `endDate` (inclusive) that the character completed the quest. */
export function streakEndingOn(index: StreakIndex, taskId: string, characterId: CharacterId, endDate: string): number {
  const dates = index.get(taskId)?.[characterId];
  if (!dates) return 0;
  let count = 0;
  for (let date = endDate; dates.has(date); date = addDays(date, -1)) count += 1;
  return count;
}

/** Streak length a completion on `date` would give the character (yesterday's run + today). */
export function streakIfCompletedOn(index: StreakIndex, taskId: string, characterId: CharacterId, date: string): number {
  return streakEndingOn(index, taskId, characterId, addDays(date, -1)) + 1;
}

/** The character's live streak for a quest as of `today`. */
export function currentStreak(index: StreakIndex, taskId: string, characterId: CharacterId, today: string): Streak {
  const doneToday = index.get(taskId)?.[characterId]?.has(today) ?? false;
  const days = streakEndingOn(index, taskId, characterId, doneToday ? today : addDays(today, -1));
  return {
    taskId,
    characterId,
    days,
    doneToday,
    bonusGold: streakBonusGold(doneToday ? days : days + 1),
  };
}
