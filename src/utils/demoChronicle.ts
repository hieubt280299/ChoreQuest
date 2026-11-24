// Demo only: "Finish this Chronicle" fills the last month with sample quests for both players and ends the chronicle,
// so the results (pop-up, gold race, awards, crown, wins and rewards) can be tried without waiting a month.

import type { CharacterId, Completer, GameState, TaskLog } from '../types';
import { addDays, computeRewardBreakdown, endOfDayMs, grantRewards, splitFromBreakdown } from './calculations';
import { SKILL_POOL } from '../constants/gameRules';
import { advanceDays } from './gameState';
import { luckyBase, luckyQuestId } from './lucky';

/** Days of sample play before today. */
export const DEMO_CHRONICLE_DAYS = 30;

/** A small seeded random generator (mulberry32), so the same demo day gives the same month. */
function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How often a quest of each size gets done on a sample day. */
const DAILY_CHANCE = { quick: 0.65, main: 0.55, heavy: 0.2 } as const;

/**
 * The current chronicle, moved back to the last `DEMO_CHRONICLE_DAYS` days and filled with sample quests for both
 * players (rewards through the normal reward code, Lucky Quests included), then ended: the usual rollover saves its
 * results and starts a new chronicle today. The sample month is the whole chronicle: it starts from 0 gold and
 * replaces anything dated from its first day on (an earlier run used the same days, and its quests would otherwise
 * count twice in the stats and the gold race). XP and levels are kept.
 */
export function finishDemoChronicle(state: GameState, today: string): GameState {
  const startDate = addDays(today, -DEMO_CHRONICLE_DAYS);
  const endDate = addDays(today, -1);
  const random = seeded(state.chronicle.id * 7919 + Number(today.split('-').join('')));
  const tasks = state.tasks.filter((task) => task.enabled);
  const before = addDays(startDate, -1);
  const earlier = <T extends { date: string }>(items: T[]) => items.filter((item) => item.date < startDate);
  let characters = (['husband', 'wife'] as CharacterId[]).reduce(
    (all, id) => ({ ...all, [id]: { ...all[id], gold: 0, mvpDays: 0 } }),
    state.characters,
  );
  const logs: TaskLog[] = [];
  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    const lucky = luckyQuestId(state.tasks, day);
    for (const task of tasks) {
      if (random() >= DAILY_CHANCE[task.group]) continue;
      const roll = random();
      // The wife does a little more, so there's a winner to crown.
      const completedBy: Completer = roll < 0.42 ? 'husband' : roll < 0.9 ? 'wife' : 'both';
      const base = luckyBase(task, task.id === lucky);
      const split = splitFromBreakdown(computeRewardBreakdown(base, completedBy, characters, SKILL_POOL));
      characters = grantRewards(characters, split).characters;
      logs.push({
        id: `demo-${task.id}-${day}`,
        taskId: task.id,
        date: day,
        completedBy,
        xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
        goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
        timestamp: Date.parse(`${day}T12:00:00`),
        baseXp: base.xp,
        baseGold: base.gold,
        category: task.category,
        group: task.group,
        ...(task.id === lucky ? { lucky: true } : {}),
      });
    }
  }
  const moved: GameState = {
    ...state,
    chronicle: { ...state.chronicle, startDate, endDate, endsAtMs: endOfDayMs(endDate) },
    logs: [...logs.reverse(), ...earlier(state.logs)],
    events: earlier(state.events),
    hearts: earlier(state.hearts),
    freezes: earlier(state.freezes),
    // Settle the sample month's MVP days and Streak Freezes like real days.
    mvpSettledOn: before,
    freezesSettledOn: before,
    characters,
  };
  return advanceDays(moved, today);
}
