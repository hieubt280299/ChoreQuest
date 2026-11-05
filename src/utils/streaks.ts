import type { CharacterId, Streak, StreakFreeze, TaskLog } from '../types';
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

type ByCharacter = Record<CharacterId, Set<string>>;
const emptyByCharacter = (): ByCharacter => ({ husband: new Set(), wife: new Set() });

/**
 * Everything a streak is made of: the dates each character completed each quest, and the days that keep a streak
 * going without being a day of it. A player's Streak Freezes keep all their streaks as they were; a day their spouse
 * did one of their streak quests alone (Tag Team) keeps that streak but takes a day off it, so covering can't be
 * farmed for long.
 */
export interface StreakIndex {
  /** taskId -> characterId -> dates completed. */
  done: Map<string, ByCharacter>;
  /** characterId -> days a Streak Freeze kept all their streaks. */
  frozen: ByCharacter;
  /** taskId -> characterId -> days the spouse covered that quest: the streak goes on, one day shorter. */
  covered: Map<string, ByCharacter>;
}

export function buildStreakIndex(logs: TaskLog[], excludeLogId?: string, freezes: StreakFreeze[] = []): StreakIndex {
  const index: StreakIndex = { done: new Map(), frozen: emptyByCharacter(), covered: new Map() };
  const entry = (map: Map<string, ByCharacter>, taskId: string) => {
    let found = map.get(taskId);
    if (!found) {
      found = emptyByCharacter();
      map.set(taskId, found);
    }
    return found;
  };
  for (const log of logs) {
    if (log.id === excludeLogId) continue;
    const done = entry(index.done, log.taskId);
    for (const id of ['husband', 'wife'] as CharacterId[]) {
      if (involves(log, id)) done[id].add(log.date);
    }
    if (log.coveredFor) entry(index.covered, log.taskId)[log.coveredFor].add(log.date);
  }
  for (const freeze of freezes) index.frozen[freeze.characterId]?.add(freeze.date);
  return index;
}

const frozen = (index: StreakIndex, characterId: CharacterId, date: string) => index.frozen[characterId].has(date);
const covered = (index: StreakIndex, taskId: string, characterId: CharacterId, date: string) =>
  index.covered.get(taskId)?.[characterId].has(date) ?? false;

/** A day that keeps the character's streak on the quest going (a freeze, or a cover that takes a day off it). */
function kept(index: StreakIndex, taskId: string, characterId: CharacterId, date: string): boolean {
  return frozen(index, characterId, date) || covered(index, taskId, characterId, date);
}

/**
 * Consecutive days ending on `endDate` (inclusive) that the character completed the quest. Frozen days bridge a gap;
 * covered days bridge it too but take a day off the streak each.
 */
export function streakEndingOn(index: StreakIndex, taskId: string, characterId: CharacterId, endDate: string): number {
  const dates = index.done.get(taskId)?.[characterId];
  if (!dates) return 0;
  let count = 0;
  let covers = 0;
  for (let date = endDate; ; date = addDays(date, -1)) {
    if (dates.has(date)) count += 1;
    else if (covered(index, taskId, characterId, date)) covers += 1;
    else if (!frozen(index, characterId, date)) break;
  }
  return Math.max(0, count - covers);
}

/** Streak length a completion on `date` would give the character (yesterday's run + today). */
export function streakIfCompletedOn(index: StreakIndex, taskId: string, characterId: CharacterId, date: string): number {
  return streakEndingOn(index, taskId, characterId, addDays(date, -1)) + 1;
}

/** The character's live streak for a quest as of `today`. */
export function currentStreak(index: StreakIndex, taskId: string, characterId: CharacterId, today: string): Streak {
  const doneToday = index.done.get(taskId)?.[characterId]?.has(today) ?? false;
  const days = streakEndingOn(index, taskId, characterId, doneToday ? today : addDays(today, -1));
  return {
    taskId,
    characterId,
    days,
    doneToday,
    bonusGold: streakBonusGold(doneToday ? days : days + 1),
  };
}

/** The character's longest streak on any quest in the index (kept days bridge gaps; covered ones take a day off). */
export function longestStreak(index: StreakIndex, characterId: CharacterId): number {
  let best = 0;
  for (const [taskId, byCharacter] of index.done) {
    const dates = [...byCharacter[characterId]].sort();
    let run = 0;
    for (let i = 0; i < dates.length; i += 1) {
      let bridged = i > 0;
      let covers = 0;
      if (bridged) {
        for (let day = addDays(dates[i - 1], 1); day < dates[i]; day = addDays(day, 1)) {
          if (covered(index, taskId, characterId, day)) covers += 1;
          else if (!frozen(index, characterId, day)) {
            bridged = false;
            break;
          }
        }
      }
      run = bridged ? Math.max(1, run + 1 - covers) : 1;
      best = Math.max(best, run);
    }
  }
  return best;
}

/**
 * Whether ending `date` with nothing done would break one of the character's streaks: a quest with a streak (3+ days,
 * the ones the app shows) up to the day before that isn't logged, even late, on `date`. A Streak Freeze is only
 * used when it saves one.
 */
export function streakWouldBreak(index: StreakIndex, characterId: CharacterId, date: string): boolean {
  const before = addDays(date, -1);
  for (const [taskId, byCharacter] of index.done) {
    if (byCharacter[characterId].has(date) || kept(index, taskId, characterId, date)) continue;
    if (streakEndingOn(index, taskId, characterId, before) >= STREAK_MIN_DAYS) return true;
  }
  return false;
}
