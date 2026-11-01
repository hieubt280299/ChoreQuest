import type { Character, Streak, Task, TaskLog } from '../types';
import { getLevelFromXp, skillPointsAvailable } from './calculations';
import { STREAK_MIN_DAYS } from './streaks';

/** What a player can do right now, for the Today card on Home. */
export interface TodayStatus {
  questsDone: number;
  questsTotal: number;
  /** Quests with a counting streak that nobody has logged yet today. */
  streaksAtRisk: number;
  ticketReady: boolean;
  skillPoints: number;
  /** Normal and Golden Tickets ready to spin. */
  tickets: number;
}

export function todayStatus(
  character: Character,
  tasks: Task[],
  today: string,
  doneToday: (taskId: string) => boolean,
  streak: (taskId: string) => Streak,
): TodayStatus {
  const enabled = tasks.filter((task) => task.enabled);
  return {
    questsDone: enabled.filter((task) => doneToday(task.id)).length,
    questsTotal: enabled.length,
    streaksAtRisk: enabled.filter((task) => streak(task.id).days >= STREAK_MIN_DAYS && !doneToday(task.id)).length,
    ticketReady: character.ticketClaimedOn !== today,
    skillPoints: skillPointsAvailable(getLevelFromXp(character.xp), character.skills),
    tickets: character.tickets + character.goldenTickets,
  };
}

/** A new player's checklist. The Today card shows it until they have learned a skill, the last step. */
export function firstSteps(character: Character, logs: TaskLog[]) {
  return {
    quest: logs.some((log) => log.completedBy === character.id || log.completedBy === 'both'),
    ticket: !!character.ticketClaimedOn,
    skill: character.skills.length > 0,
  };
}
