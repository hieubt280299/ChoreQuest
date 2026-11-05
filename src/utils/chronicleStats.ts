import type { CharacterId, ChronicleAward, ChronicleResult, ChronicleStatsSnapshot, Heart, StreakFreeze, TaskLog } from '../types';
import { addDays, dayCount } from './calculations';
import { dayMvp } from './mvp';
import { buildStreakIndex, involves, longestStreak } from './streaks';

const IDS: CharacterId[] = ['husband', 'wife'];

export interface PlayerChronicleStats {
  quests: number;
  /** Gold at the end of the chronicle (quests, wheel, interest): what the payout used. */
  gold: number;
  payout: number;
  avgQuests: number;
  avgGold: number;
  /** Longest run of consecutive days on one quest (Streak Freezes and Tag Team covers bridge a day). */
  bestStreak: number;
  mvpDays: number;
  /** Hearts received from the partner. */
  hearts: number;
}

export type { ChronicleAward };

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

/**
 * Computes a finished chronicle's archive snapshot from the quest log (plus the hearts and Streak Freezes of that
 * period), or null when the log for that period isn't (fully) there any more.
 */
export function snapshotChronicle(
  result: ChronicleResult,
  allLogs: TaskLog[],
  allHearts: Heart[],
  allFreezes: StreakFreeze[],
): ChronicleStatsSnapshot | null {
  const inPeriod = (item: { date: string }) => item.date >= result.startDate && item.date <= result.endDate;
  const logs = allLogs.filter(inPeriod);
  if (logs.length === 0) return null;
  const hearts = allHearts.filter(inPeriod);
  const mvp: Record<CharacterId, number> = { husband: 0, wife: 0 };
  for (let day = result.startDate; day <= result.endDate; day = addDays(day, 1)) {
    const winner = dayMvp(logs, day);
    if (winner) mvp[winner] += 1;
  }
  const index = buildStreakIndex(logs, undefined, allFreezes.filter(inPeriod));
  const players = Object.fromEntries(
    IDS.map((id) => [
      id,
      {
        quests: logs.filter((log) => involves(log, id)).length,
        bestStreak: longestStreak(index, id),
        mvpDays: mvp[id],
        hearts: hearts.filter((heart) => heart.to === id).length,
      },
    ]),
  ) as ChronicleStatsSnapshot['players'];

  // Awards: champions of the three most-done quests, the longest streak (3+ days), the most MVP days and the most
  // hearts received.
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
  const heartsLeader = leader({ husband: players.husband.hearts ?? 0, wife: players.wife.hearts ?? 0 });
  if (heartsLeader) awards.push({ kind: 'hearts', characterId: heartsLeader, count: players[heartsLeader].hearts ?? 0 });
  return { players, awards };
}

/**
 * Stats and fun awards for a finished chronicle: from the snapshot saved when it ended, or (for chronicles
 * from before snapshots) from the quest log while it's still kept.
 */
export function chronicleStats(
  result: ChronicleResult,
  allLogs: TaskLog[],
  allHearts: Heart[] = [],
  allFreezes: StreakFreeze[] = [],
): ChronicleStats {
  const days = dayCount(result.startDate, result.endDate);
  const snapshot = result.stats ?? snapshotChronicle(result, allLogs, allHearts, allFreezes);
  const players = Object.fromEntries(
    IDS.map((id) => {
      const gold = result.goldSnapshot[id];
      const counted = snapshot?.players[id] ?? { quests: 0, bestStreak: 0, mvpDays: 0 };
      return [
        id,
        {
          ...counted,
          hearts: counted.hearts ?? 0,
          gold,
          payout: result.payout[id],
          avgQuests: counted.quests / days,
          avgGold: gold / days,
        },
      ];
    }),
  ) as Record<CharacterId, PlayerChronicleStats>;
  return { days, hasLog: !!snapshot, players, awards: snapshot?.awards ?? [] };
}
