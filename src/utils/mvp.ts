import type { CharacterId, TaskLog } from '../types';

/** Quest gold each character earned on a day (wheel and interest gold don't count). */
export function questGoldOn(logs: TaskLog[], date: string): Record<CharacterId, number> {
  const gold: Record<CharacterId, number> = { husband: 0, wife: 0 };
  for (const log of logs) {
    if (log.date !== date) continue;
    gold.husband += log.goldAwarded.husband ?? 0;
    gold.wife += log.goldAwarded.wife ?? 0;
  }
  return gold;
}

/** The day's MVP: whoever earned more quest gold that day (no MVP on a tie or an empty day). */
export function dayMvp(logs: TaskLog[], date: string): CharacterId | null {
  const gold = questGoldOn(logs, date);
  if (gold.husband === gold.wife) return null;
  return gold.husband > gold.wife ? 'husband' : 'wife';
}
