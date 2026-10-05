import type { CharacterId, ChronicleResult, TaskLog } from '../types';
import { addDays, dayCount } from './calculations';
import { dayMvp } from './mvp';
import { involves } from './streaks';

const IDS: CharacterId[] = ['husband', 'wife'];

export interface PlayerChronicleStats {
  quests: number;
  /** Gold at the end of the chronicle (quests, wheel, interest): what the payout used. */
  gold: number;
  payout: number;
  avgQuests: number;
  avgGold: number;
  /** Longest run of consecutive days on one quest. */
  bestStreak: number;
  mvpDays: number;
}

export type ChronicleAward =
  | { kind: 'champion'; characterId: CharacterId; taskId: string; count: number }
  | { kind: 'streak'; characterId: CharacterId; days: number }
  | { kind: 'mvp'; characterId: CharacterId; days: number };

export interface ChronicleStats {
  days: number;
  /** False when the quest log for this period has been pruned: only the payout is known then. */
  hasLog: boolean;
  players: Record<CharacterId, PlayerChronicleStats>;
  awards: ChronicleAward[];
}

/** Whoever has strictly more, or null on a tie. */
function leader(values: Record<CharacterId, number>): CharacterId | null {
  if (values.husband === values.wife) return null;
  return values.husband > values.wife ? 'husband' : 'wife';
}

/** Longest run of consecutive dates in a sorted, de-duplicated list. */
function longestRun(dates: string[]): number {
  let best = 0;
  let run = 0;
  for (let index = 0; index < dates.length; index += 1) {
    run = index > 0 && addDays(dates[index - 1], 1) === dates[index] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** Stats and fun awards for a finished chronicle, from its payout record and the quest log. */
export function chronicleStats(result: ChronicleResult, allLogs: TaskLog[]): ChronicleStats {
  const days = dayCount(result.startDate, result.endDate);
  const logs = allLogs.filter((log) => log.date >= result.startDate && log.date <= result.endDate);
  const mvp: Record<CharacterId, number> = { husband: 0, wife: 0 };
  for (let day = result.startDate; day <= result.endDate; day = addDays(day, 1)) {
    const winner = dayMvp(logs, day);
    if (winner) mvp[winner] += 1;
  }

  const players = Object.fromEntries(
    IDS.map((id) => {
      const mine = logs.filter((log) => involves(log, id));
      const byTask = new Map<string, Set<string>>();
      for (const log of mine) byTask.set(log.taskId, (byTask.get(log.taskId) ?? new Set()).add(log.date));
      const bestStreak = Math.max(0, ...[...byTask.values()].map((dates) => longestRun([...dates].sort())));
      const gold = result.goldSnapshot[id];
      return [
        id,
        {
          quests: mine.length,
          gold,
          payout: result.payout[id],
          avgQuests: mine.length / days,
          avgGold: gold / days,
          bestStreak,
          mvpDays: mvp[id],
        },
      ];
    }),
  ) as Record<CharacterId, PlayerChronicleStats>;

  // Awards: champions of the three most-done quests, the longest streak (3+ days) and the most MVP days.
  const awards: ChronicleAward[] = [];
  const counts = new Map<string, Record<CharacterId, number>>();
  for (const log of logs) {
    const entry = counts.get(log.taskId) ?? { husband: 0, wife: 0 };
    for (const id of IDS) if (involves(log, id)) entry[id] += 1;
    counts.set(log.taskId, entry);
  }
  [...counts.entries()]
    .sort(([, a], [, b]) => b.husband + b.wife - (a.husband + a.wife))
    .slice(0, 3)
    .forEach(([taskId, entry]) => {
      const winner = leader(entry);
      if (winner) awards.push({ kind: 'champion', characterId: winner, taskId, count: entry[winner] });
    });
  const streakLeader = leader({ husband: players.husband.bestStreak, wife: players.wife.bestStreak });
  if (streakLeader && players[streakLeader].bestStreak >= 3) {
    awards.push({ kind: 'streak', characterId: streakLeader, days: players[streakLeader].bestStreak });
  }
  const mvpLeader = leader(mvp);
  if (mvpLeader) awards.push({ kind: 'mvp', characterId: mvpLeader, days: mvp[mvpLeader] });

  return { days, hasLog: logs.length > 0, players, awards };
}
