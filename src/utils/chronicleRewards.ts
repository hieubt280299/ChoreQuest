import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, isThemeId, THEMES } from '../constants/cosmetics';
import { WINNER_GOLDEN_TICKETS } from '../constants/gameRules';
import type { AvatarId, CharacterId, ChronicleAward, ChronicleResult, GameState, ThemeId } from '../types';
import { chronicleStats, chronicleWinners } from './chronicleStats';
import type { TranslationKey } from './i18n';

const IDS: CharacterId[] = ['husband', 'wife'];

/** Chronicle rewards a character can still claim: which kinds are left, and whether they won. */
export interface RewardOffer {
  chronicleId: number;
  winner: boolean;
  /** An avatar of their own to unlock (both players). */
  avatar: boolean;
  /** The winner's reward is still to pick, and a theme is one of the choices (some are still locked). */
  theme: boolean;
  /** The winner's reward is still to pick, and Golden Tickets are one of the choices (always, while unpicked). */
  tickets: boolean;
}

/**
 * Chronicle rewards, offered from Day 1 of the next chronicle while it runs: both players unlock 1 avatar, and the
 * winner (most gold; ties: both) picks either 1 theme for the household or `WINNER_GOLDEN_TICKETS` Golden Tickets
 * (only the tickets once every theme is unlocked). Each is claimed once; nothing is offered for a chronicle nobody
 * earned gold in.
 */
export function rewardOffer(state: GameState, characterId: CharacterId): RewardOffer | null {
  const last = state.prizeHistory[0];
  if (!last || state.chronicle.id !== last.chronicleId + 1) return null;
  const winners = chronicleWinners(last);
  if (winners.length === 0) return null;
  const winner = winners.includes(characterId);
  const claimed = (kind: 'theme' | 'avatar' | 'tickets') =>
    state.cosmetics.rewards.some((reward) => reward.chronicleId === last.chronicleId && reward.characterId === characterId && reward.kind === kind);
  const lockedThemes = THEMES.some((theme) => theme !== DEFAULT_THEME && !state.cosmetics.themes.includes(theme));
  const lockedAvatars = AVATARS[characterId].some(
    (avatar) => avatar !== DEFAULT_AVATAR[characterId] && !state.cosmetics.avatars[characterId].includes(avatar),
  );
  const avatar = lockedAvatars && !claimed('avatar');
  const winnerPick = winner && !claimed('theme') && !claimed('tickets');
  const theme = winnerPick && lockedThemes;
  const tickets = winnerPick;
  if (!avatar && !tickets) return null;
  return { chronicleId: last.chronicleId, winner, avatar, theme, tickets };
}

/**
 * Claims a chronicle reward: an avatar (put on right away), a theme for the household, or the winner's Golden
 * Tickets. Returns the new state, or why it can't be claimed.
 */
export function claimRewardOnState(
  state: GameState,
  characterId: CharacterId,
  kind: 'theme' | 'avatar' | 'tickets',
  item?: ThemeId | AvatarId,
): GameState | TranslationKey {
  const reward = rewardOffer(state, characterId);
  if (!reward || !reward[kind]) return 'cosmetics.error.noReward';
  const { cosmetics } = state;
  const record = (entry: ThemeId | AvatarId | 'goldenTickets') => [
    ...cosmetics.rewards,
    { chronicleId: reward.chronicleId, characterId, kind, item: entry },
  ];
  if (kind === 'tickets') {
    const character = state.characters[characterId];
    return {
      ...state,
      characters: { ...state.characters, [characterId]: { ...character, goldenTickets: character.goldenTickets + WINNER_GOLDEN_TICKETS } },
      cosmetics: { ...cosmetics, rewards: record('goldenTickets') },
    };
  }
  if (kind === 'theme') {
    if (!isThemeId(item) || item === DEFAULT_THEME || cosmetics.themes.includes(item)) return 'cosmetics.error.locked';
    return { ...state, cosmetics: { ...cosmetics, themes: [...cosmetics.themes, item], rewards: record(item) } };
  }
  const avatar = item as AvatarId;
  if (!AVATARS[characterId].includes(avatar) || cosmetics.avatars[characterId].includes(avatar)) return 'cosmetics.error.locked';
  return {
    ...state,
    cosmetics: {
      ...cosmetics,
      avatars: { ...cosmetics.avatars, [characterId]: [...cosmetics.avatars[characterId], avatar] },
      // A new avatar is put on right away.
      activeAvatar: { ...cosmetics.activeAvatar, [characterId]: avatar },
      rewards: record(avatar),
    },
  };
}

/**
 * The reigning champions: the last chronicle's winners (a tie crowns both), for the whole of the chronicle after it.
 * Empty when nobody earned gold, or before the first chronicle has ended.
 */
export function reigningChampions(state: Pick<GameState, 'chronicle' | 'prizeHistory'>): CharacterId[] {
  const last = state.prizeHistory[0];
  if (!last || state.chronicle.id !== last.chronicleId + 1) return [];
  return chronicleWinners(last);
}

/** A finished chronicle's results and story, for the results pop-up (when the next one starts, or from History). */
export interface ChronicleSummary {
  chronicleId: number;
  startDate: string;
  endDate: string;
  prizePool: number;
  /** Most gold; `null` on a tie (including nobody earning anything). */
  winner: CharacterId | null;
  /** Received the most hearts; `null` on a tie (including no hearts at all). */
  mostHearts: CharacterId | null;
  /** How much more gold the winner had (0 on a tie). */
  margin: number;
  /** Quests finished together in the chronicle ("Both" counted once); null when unknown. */
  totalQuests: number | null;
  /** The chronicle before it, when known, for "+12% gold vs Chronicle 1". */
  previousId: number | null;
  awards: ChronicleAward[];
  /** Each player's gold at the end of each day; null when it can't be rebuilt. */
  goldByDay: Record<CharacterId, number[]> | null;
  players: Record<
    CharacterId,
    {
      gold: number;
      mvpDays: number;
      hearts: number;
      lucky: number;
      payout: number;
      /** Share of the prize pool, 0-1. */
      share: number;
      /** Gold compared with the chronicle before (+0.12 = 12% more); null without one or when it had no gold. */
      goldChange: number | null;
    }
  >;
}

export function chronicleSummary(
  result: ChronicleResult,
  state: Partial<Pick<GameState, 'logs' | 'hearts' | 'freezes' | 'events' | 'characters' | 'prizeHistory'>> = {},
): ChronicleSummary {
  const stats = chronicleStats(result, state.logs ?? [], state.hearts ?? [], state.freezes ?? [], state.events, state.characters);
  const { husband, wife } = result.goldSnapshot;
  const total = result.payout.husband + result.payout.wife;
  const previous = (state.prizeHistory ?? []).find((entry) => entry.chronicleId === result.chronicleId - 1) ?? null;
  const players = Object.fromEntries(
    IDS.map((id) => {
      const before = previous?.goldSnapshot[id] ?? 0;
      return [
        id,
        {
          gold: result.goldSnapshot[id],
          mvpDays: stats.players[id].mvpDays,
          hearts: stats.players[id].hearts,
          lucky: stats.players[id].lucky,
          payout: result.payout[id],
          share: total > 0 ? result.payout[id] / total : 0,
          goldChange: previous && before > 0 ? result.goldSnapshot[id] / before - 1 : null,
        },
      ];
    }),
  ) as ChronicleSummary['players'];
  return {
    chronicleId: result.chronicleId,
    startDate: result.startDate,
    endDate: result.endDate,
    prizePool: result.prizePool,
    winner: husband === wife ? null : husband > wife ? 'husband' : 'wife',
    mostHearts: players.husband.hearts === players.wife.hearts ? null : players.husband.hearts > players.wife.hearts ? 'husband' : 'wife',
    margin: Math.abs(husband - wife),
    totalQuests: stats.totalQuests,
    previousId: previous?.chronicleId ?? null,
    awards: stats.awards,
    goldByDay: stats.goldByDay,
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
