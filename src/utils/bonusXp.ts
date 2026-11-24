import { DAILY_TICKET_XP } from '../constants/gameRules';
import type { BonusXpEvent, CharacterId, GameState } from '../types';
import { grantRewards } from './calculations';
import type { TranslationKey } from './i18n';

/**
 * XP for a daily action that isn't a quest (claiming the daily ticket, sending a heart), given like quest XP: owed XP
 * is paid back first, and a level-up pays its gold, tickets and skill point. It's recorded as an `xp` event, so the
 * gold race can replay it (its level-ups pay gold).
 */
export function grantBonusXp(
  state: GameState,
  characterId: CharacterId,
  source: BonusXpEvent['source'],
  xp: number,
  date: string,
  now: number,
): GameState {
  const other: CharacterId = characterId === 'husband' ? 'wife' : 'husband';
  const { characters } = grantRewards(state.characters, {
    [characterId]: { xp, gold: 0 },
    [other]: { xp: 0, gold: 0 },
  } as Record<CharacterId, { xp: number; gold: number }>);
  const event: BonusXpEvent = { id: `xp-${source}-${characterId}-${date}`, type: 'xp', characterId, date, timestamp: now, source, xp, gold: 0 };
  return { ...state, characters, events: [event, ...state.events] };
}

/** The free daily Normal Ticket, once a local day, with `DAILY_TICKET_XP`. */
export function claimDailyTicketOnState(state: GameState, characterId: CharacterId, date: string, now: number): GameState | TranslationKey {
  const character = state.characters[characterId];
  if (character.ticketClaimedOn === date) return 'wheel.error.claimed';
  const claimed: GameState = {
    ...state,
    characters: { ...state.characters, [characterId]: { ...character, tickets: character.tickets + 1, ticketClaimedOn: date } },
  };
  return grantBonusXp(claimed, characterId, 'ticket', DAILY_TICKET_XP, date, now);
}
