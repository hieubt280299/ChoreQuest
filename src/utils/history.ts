import type { CharacterId, TaskLog } from '../types';
import { involves } from './streaks';

/** One character's results on one quest over a period. */
export interface QuestTally {
  count: number;
  xp: number;
  gold: number;
  lastDate: string | null;
}

export interface QuestHistoryEntry {
  taskId: string;
  /** The selected player's results. */
  mine: QuestTally;
  /** The other player's results on the same quest, for comparison. */
  partner: QuestTally;
}

const emptyTally = (): QuestTally => ({ count: 0, xp: 0, gold: 0, lastDate: null });

function add(tally: QuestTally, log: TaskLog, id: CharacterId) {
  tally.count += 1;
  tally.xp += log.xpAwarded[id] ?? 0;
  tally.gold += log.goldAwarded[id] ?? 0;
  if (!tally.lastDate || log.date > tally.lastDate) tally.lastDate = log.date;
}

/**
 * Quests `characterId` completed between `startDate` and `endDate` (inclusive), most completed first.
 * "Both" completions count for each partner with their own share of the rewards.
 */
export function questHistory(logs: TaskLog[], characterId: CharacterId, startDate: string, endDate: string): QuestHistoryEntry[] {
  const partnerId: CharacterId = characterId === 'husband' ? 'wife' : 'husband';
  const byTask = new Map<string, QuestHistoryEntry>();
  for (const log of logs) {
    if (log.date < startDate || log.date > endDate) continue;
    let entry = byTask.get(log.taskId);
    if (!entry) {
      entry = { taskId: log.taskId, mine: emptyTally(), partner: emptyTally() };
      byTask.set(log.taskId, entry);
    }
    if (involves(log, characterId)) add(entry.mine, log, characterId);
    if (involves(log, partnerId)) add(entry.partner, log, partnerId);
  }
  return [...byTask.values()]
    .filter((entry) => entry.mine.count > 0)
    .sort((a, b) => b.mine.count - a.mine.count || (b.mine.lastDate ?? '').localeCompare(a.mine.lastDate ?? ''));
}

/** Totals over all of a player's quests. */
export function totalTally(entries: QuestHistoryEntry[]): Omit<QuestTally, 'lastDate'> {
  return entries.reduce((sum, entry) => ({ count: sum.count + entry.mine.count, xp: sum.xp + entry.mine.xp, gold: sum.gold + entry.mine.gold }), {
    count: 0,
    xp: 0,
    gold: 0,
  });
}
