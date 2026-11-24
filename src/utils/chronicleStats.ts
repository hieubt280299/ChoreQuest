import type {
  BonusXpEvent,
  Character,
  CharacterId,
  ChronicleAward,
  ChronicleResult,
  ChronicleStatsSnapshot,
  GameEvent,
  Heart,
  StreakFreeze,
  TaskLog,
  XpRescale,
} from '../types';
import { XP_CURVE, XP_CURVE_V18 } from '../constants/gameRules';
import { addDays, dayCount, getLevelFromXp, goldForLevelRange, parseDateKey } from './calculations';
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
  /** Lucky Quests done on time (0 for chronicles from before v1.9 without a log). */
  lucky: number;
}

export type { ChronicleAward };

export interface ChronicleStats {
  days: number;
  /** False when the quest log for this period has been pruned: only the payout is known then. */
  hasLog: boolean;
  players: Record<CharacterId, PlayerChronicleStats>;
  awards: ChronicleAward[];
  /** Quests finished, a "Both" quest counted once; null when unknown. */
  totalQuests: number | null;
  /** Each player's gold at the end of each day (the gold race); null when it can't be rebuilt. */
  goldByDay: Record<CharacterId, number[]> | null;
}

/** Whoever has strictly more, or null on a tie. */
function leader(values: Record<CharacterId, number>): CharacterId | null {
  if (values.husband === values.wife) return null;
  return values.husband > values.wife ? 'husband' : 'wife';
}

/**
 * Each player's gold at the end of each day of a chronicle: quest gold (with skills and streaks), wheel and interest
 * gold, and level-up bonus gold, rebuilt from the quest log and events. `xpNow` is each character's XP today (owed XP
 * taken off), so the XP at the chronicle's start is worked back from every log since then. Rounded to whole gold.
 * With the v1.9 XP move (`rescale`) after the chronicle began, levels follow the old curve until then, and the XP it
 * added is neither quest XP nor a level-up. XP for daily actions (`xp` events: daily ticket, heart sent) counts like
 * quest XP.
 */
export function goldRace(
  result: Pick<ChronicleResult, 'startDate' | 'endDate'>,
  allLogs: TaskLog[],
  allEvents: GameEvent[],
  xpNow: Record<CharacterId, number>,
  rescale?: XpRescale,
): Record<CharacterId, number[]> {
  const movedDuring = !!rescale && rescale.at >= parseDateKey(result.startDate).getTime();
  const race = { husband: [] as number[], wife: [] as number[] };
  for (const id of IDS) {
    // Everything that gave this player XP since the chronicle began, in time order: quests and daily-action XP.
    const gains = [
      ...allLogs.map((log) => ({ date: log.date, timestamp: log.timestamp, xp: log.xpAwarded[id] ?? 0, gold: log.goldAwarded[id] ?? 0 })),
      ...allEvents
        .filter((event): event is BonusXpEvent => event.type === 'xp' && event.characterId === id)
        .map((event) => ({ date: event.date, timestamp: event.timestamp, xp: event.xp, gold: 0 })),
    ]
      .filter((gain) => gain.date >= result.startDate)
      .sort((a, b) => a.timestamp - b.timestamp);
    const moveXp = movedDuring ? rescale!.delta[id] : 0;
    let xp = Math.max(0, xpNow[id] - moveXp - gains.reduce((sum, gain) => sum + gain.xp, 0));
    let oldCurve = movedDuring;
    let gold = 0;
    for (let day = result.startDate; day <= result.endDate; day = addDays(day, 1)) {
      for (const gain of gains.filter((entry) => entry.date === day)) {
        if (oldCurve && gain.timestamp >= rescale!.at) {
          xp += moveXp;
          oldCurve = false;
        }
        const curve = oldCurve ? XP_CURVE_V18 : XP_CURVE;
        const from = getLevelFromXp(xp, curve);
        xp += gain.xp;
        gold += gain.gold + goldForLevelRange(from, getLevelFromXp(xp, curve));
      }
      gold += allEvents.filter((event) => event.date === day && event.characterId === id).reduce((sum, event) => sum + event.gold, 0);
      race[id].push(Math.round(gold));
    }
  }
  return race;
}

/**
 * Whether a gold race ends at each player's final gold (within rounding). A race that doesn't (quests of another
 * chronicle on the same days, or a log no longer complete) is never shown: the chart must agree with the results.
 */
export function raceMatchesGold(race: Record<CharacterId, number[]>, gold: Record<CharacterId, number>): boolean {
  return IDS.every((id) => race[id].length > 0 && Math.abs(race[id][race[id].length - 1] - gold[id]) <= 1);
}

/** Who won a chronicle: most gold, a tie counting for both; nobody when nobody earned gold. */
export function chronicleWinners(result: Pick<ChronicleResult, 'goldSnapshot'>): CharacterId[] {
  const top = Math.max(result.goldSnapshot.husband, result.goldSnapshot.wife);
  return top > 0 ? IDS.filter((id) => result.goldSnapshot[id] === top) : [];
}

/** A character's XP without what it owes after a fixed entry (`xpDebt`). */
export const effectiveXp = (character: Pick<Character, 'xp' | 'xpDebt'>) => character.xp - (character.xpDebt ?? 0);

/**
 * Computes a finished chronicle's archive snapshot from the quest log (plus the hearts, Streak Freezes and wheel and
 * interest events of that period), or null when the log for that period isn't (fully) there any more. With `xpNow`
 * it also saves the gold race.
 */
export function snapshotChronicle(
  result: ChronicleResult,
  allLogs: TaskLog[],
  allHearts: Heart[],
  allFreezes: StreakFreeze[],
  allEvents: GameEvent[] = [],
  xpNow?: Record<CharacterId, number>,
  rescale?: XpRescale,
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
        lucky: logs.filter((log) => log.lucky && involves(log, id)).length,
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
  const race = xpNow ? goldRace(result, allLogs, allEvents, xpNow, rescale) : null;
  return {
    players,
    awards,
    totalQuests: logs.length,
    ...(race && raceMatchesGold(race, result.goldSnapshot) ? { goldByDay: race } : {}),
  };
}

/**
 * Stats and fun awards for a finished chronicle: from the snapshot saved when it ended, or (for chronicles
 * from before snapshots) from the quest log while it's still kept. The gold race of a chronicle from before v1.9 is
 * rebuilt from the log when `events` and `characters` are given and the log is still there.
 */
export function chronicleStats(
  result: ChronicleResult,
  allLogs: TaskLog[],
  allHearts: Heart[] = [],
  allFreezes: StreakFreeze[] = [],
  allEvents?: GameEvent[],
  characters?: Record<CharacterId, Pick<Character, 'xp' | 'xpDebt'>>,
  rescale?: XpRescale,
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
          lucky: counted.lucky ?? 0,
          gold,
          payout: result.payout[id],
          avgQuests: counted.quests / days,
          avgGold: gold / days,
        },
      ];
    }),
  ) as Record<CharacterId, PlayerChronicleStats>;
  const inPeriod = allLogs.filter((log) => log.date >= result.startDate && log.date <= result.endDate);
  const rebuildable = !!allEvents && !!characters && inPeriod.length > 0;
  const race =
    snapshot?.goldByDay ??
    (rebuildable
      ? goldRace(result, allLogs, allEvents!, { husband: effectiveXp(characters!.husband), wife: effectiveXp(characters!.wife) }, rescale)
      : null);
  const goldByDay = race && raceMatchesGold(race, result.goldSnapshot) ? race : null;
  return {
    days,
    hasLog: !!snapshot,
    players,
    awards: snapshot?.awards ?? [],
    totalQuests: snapshot?.totalQuests ?? (inPeriod.length > 0 ? inPeriod.length : null),
    goldByDay,
  };
}
