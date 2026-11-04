import { HEART_TICKETS } from '../constants/gameRules';
import type { CharacterId, GameState } from '../types';
import type { TranslationKey } from './i18n';

const spouseOf = (id: CharacterId): CharacterId => (id === 'husband' ? 'wife' : 'husband');

/** Whether a player has sent their heart on this local day (one a day). */
export function heartSentOn(state: Pick<GameState, 'hearts'>, from: CharacterId, date: string): boolean {
  return state.hearts.some((heart) => heart.from === from && heart.date === date);
}

/** A player sends their spouse a heart: recorded once a day, and the spouse gets a Normal Ticket. */
export function sendHeartOnState(state: GameState, from: CharacterId, date: string, now: number): GameState | TranslationKey {
  if (heartSentOn(state, from, date)) return 'hearts.error.sent';
  const to = spouseOf(from);
  const partner = state.characters[to];
  return {
    ...state,
    hearts: [{ id: `heart-${from}-${date}`, from, to, date, timestamp: now }, ...state.hearts],
    characters: { ...state.characters, [to]: { ...partner, tickets: partner.tickets + HEART_TICKETS } },
  };
}
