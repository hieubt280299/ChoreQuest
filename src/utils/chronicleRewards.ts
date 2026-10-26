import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, THEMES } from '../constants/cosmetics';
import type { CharacterId, ChronicleResult, GameState, TaskLog } from '../types';
import { chronicleStats } from './chronicleStats';

const IDS: CharacterId[] = ['husband', 'wife'];

/** Chronicle rewards a character can still claim: which kinds of unlock are left, and whether they won. */
export interface RewardOffer {
  chronicleId: number;
  winner: boolean;
  /** An avatar of their own to unlock (both players). */
  avatar: boolean;
  /** A theme to unlock for the household (the winner). */
  theme: boolean;
}

/**
 * Chronicle rewards, offered from Day 1 of the next chronicle while it runs: both players unlock 1 avatar, and
 * the winner (most gold; ties: both) also unlocks 1 theme. Each kind is claimed once; nothing is offered for a
 * chronicle nobody earned gold in, or when there's nothing of that kind left to unlock.
 */
export function rewardOffer(state: GameState, characterId: CharacterId): RewardOffer | null {
  const last = state.prizeHistory[0];
  if (!last || state.chronicle.id !== last.chronicleId + 1) return null;
  const gold = last.goldSnapshot;
  const top = Math.max(gold.husband, gold.wife);
  if (top <= 0) return null;
  const winner = gold[characterId] === top;
  const claimed = (kind: 'theme' | 'avatar') =>
    state.cosmetics.rewards.some((reward) => reward.chronicleId === last.chronicleId && reward.characterId === characterId && reward.kind === kind);
  const lockedThemes = THEMES.some((theme) => theme !== DEFAULT_THEME && !state.cosmetics.themes.includes(theme));
  const lockedAvatars = AVATARS[characterId].some(
    (avatar) => avatar !== DEFAULT_AVATAR[characterId] && !state.cosmetics.avatars[characterId].includes(avatar),
  );
  const avatar = lockedAvatars && !claimed('avatar');
  const theme = winner && lockedThemes && !claimed('theme');
  if (!avatar && !theme) return null;
  return { chronicleId: last.chronicleId, winner, avatar, theme };
}

/** A finished chronicle's results, for the summary shown when the next one starts. */
export interface ChronicleSummary {
  chronicleId: number;
  startDate: string;
  endDate: string;
  prizePool: number;
  /** Most gold; `null` on a tie (including nobody earning anything). */
  winner: CharacterId | null;
  players: Record<CharacterId, { gold: number; mvpDays: number; payout: number; /** Share of the prize pool, 0-1. */ share: number }>;
}

export function chronicleSummary(result: ChronicleResult, logs: TaskLog[]): ChronicleSummary {
  const stats = chronicleStats(result, logs);
  const { husband, wife } = result.goldSnapshot;
  const total = result.payout.husband + result.payout.wife;
  const players = Object.fromEntries(
    IDS.map((id) => [
      id,
      {
        gold: result.goldSnapshot[id],
        mvpDays: stats.players[id].mvpDays,
        payout: result.payout[id],
        share: total > 0 ? result.payout[id] / total : 0,
      },
    ]),
  ) as ChronicleSummary['players'];
  return {
    chronicleId: result.chronicleId,
    startDate: result.startDate,
    endDate: result.endDate,
    prizePool: result.prizePool,
    winner: husband === wife ? null : husband > wife ? 'husband' : 'wife',
    players,
  };
}

/**
 * The summary waiting to be shown, if any: from Chronicle 2 on, the one that just ended, any day while the next
 * one runs (the caller shows it once, on the first launch). Older results aren't shown.
 */
export function chronicleSummaryDue(state: Pick<GameState, 'chronicle' | 'prizeHistory'>): ChronicleResult | null {
  const last = state.prizeHistory[0];
  if (state.chronicle.id < 2 || !last || last.chronicleId !== state.chronicle.id - 1) return null;
  return last;
}
