import { GOLDEN_TICKET_MULTIPLIER, JACKPOT_BASE_GOLD, JACKPOT_MISS_BONUS, SKILL_POOL, skillLevel, WHEEL_PRIZES } from '../constants/gameRules';
import type { Character, CharacterId, GameEvent, GameState, WheelPrize, WheelSpinEvent, WheelState, WheelTicket } from '../types';

/** Uniform number in [0, 1) from the browser's crypto source (falls back to Math.random). */
export function secureRandom(): number {
  try {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / 2 ** 32;
  } catch {
    return Math.random();
  }
}

/** Picks a prize by the WHEEL_PRIZES weights (35 / 30 / 15 / 1 / 19). */
export function rollWheelPrize(random: () => number = secureRandom): WheelPrize {
  const total = WHEEL_PRIZES.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of WHEEL_PRIZES) {
    if (roll < entry.weight) return entry.prize;
    roll -= entry.weight;
  }
  return WHEEL_PRIZES[WHEEL_PRIZES.length - 1].prize;
}

/** Gold a prize pays right now (the jackpot includes everything misses have added). */
export function prizeGold(prize: WheelPrize, wheel: WheelState): number {
  if (prize === 'jackpot') return JACKPOT_BASE_GOLD + wheel.jackpotBonus;
  return WHEEL_PRIZES.find((entry) => entry.prize === prize)?.gold ?? 0;
}

/** The ticket the next spin uses: Golden Tickets are always spent first. */
export function nextTicket(character: Pick<Character, 'tickets' | 'goldenTickets'>): WheelTicket | null {
  if (character.goldenTickets > 0) return 'golden';
  return character.tickets > 0 ? 'normal' : null;
}

/**
 * Gold a prize pays this player. A Golden Ticket doubles it; with a Normal Ticket, Fortune's Favor adds
 * 25/50/75/100% instead (the jackpot included either way).
 */
export function wheelGoldFor(prize: WheelPrize, wheel: WheelState, character: Pick<Character, 'skills'>, ticket: WheelTicket = 'normal'): number {
  const gold = prizeGold(prize, wheel);
  if (ticket === 'golden') return gold * GOLDEN_TICKET_MULTIPLIER;
  const favor = SKILL_POOL.find((skill) => skill.id === 'fortunes-favor');
  const level = favor ? skillLevel(character, favor.id) : 0;
  const bonus = favor && level > 0 ? (favor.effect.gold?.[level - 1] ?? 0) : 0;
  return Math.round(gold * (1 + bonus));
}

/** Wheel state after a spin: a miss grows the jackpot, a jackpot empties it. */
export function nextWheelState(prize: WheelPrize, wheel: WheelState): WheelState {
  if (prize === 'none') return { jackpotBonus: wheel.jackpotBonus + JACKPOT_MISS_BONUS };
  if (prize === 'jackpot') return { jackpotBonus: 0 };
  return wheel;
}

/**
 * A spin applied to the game: spends the ticket (Golden first), pays the gold, grows or empties the jackpot and
 * logs the spin. A Golden Ticket miss refunds a Normal Ticket. `null` when the player has no ticket.
 */
export function spinOnState(
  state: GameState,
  characterId: CharacterId,
  prize: WheelPrize,
  meta: Pick<WheelSpinEvent, 'id' | 'date' | 'timestamp' | 'spinMs'>,
): { state: GameState; spin: WheelSpinEvent } | null {
  const character = state.characters[characterId];
  const ticket = nextTicket(character);
  if (!ticket) return null;
  const gold = wheelGoldFor(prize, state.wheel, character, ticket);
  const refunded = ticket === 'golden' && prize === 'none';
  const spin: WheelSpinEvent = {
    ...meta,
    type: 'spin',
    characterId,
    prize,
    gold,
    ticket,
    jackpotBefore: state.wheel.jackpotBonus,
    ...(refunded ? { refunded } : {}),
  };
  return {
    spin,
    state: {
      ...state,
      wheel: nextWheelState(prize, state.wheel),
      events: [spin, ...state.events],
      characters: {
        ...state.characters,
        [characterId]: {
          ...character,
          gold: character.gold + gold,
          goldenTickets: character.goldenTickets - (ticket === 'golden' ? 1 : 0),
          tickets: character.tickets - (ticket === 'normal' ? 1 : 0) + (refunded ? 1 : 0),
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Keeping a spouse's spin a surprise
// ---------------------------------------------------------------------------

/** The longest a wheel turns (the spinner picks 5-10 s), for spins from before `spinMs` was saved. */
export const LONGEST_SPIN_MS = 10_150;
/** Extra time after the spinner's wheel stops, for the save to reach the spouse and the result card to show. */
const REVEAL_MARGIN_MS = 1_000;
/** How far the two phones' clocks may disagree. */
export const CLOCK_SKEW_MS = 5_000;

/** How long after it arrives a spouse's spin stays hidden: until the spinner's wheel has stopped. */
export function spinRevealDelay(spin: Pick<WheelSpinEvent, 'spinMs'>): number {
  const turning = typeof spin.spinMs === 'number' && spin.spinMs > 0 ? Math.min(spin.spinMs, LONGEST_SPIN_MS) : LONGEST_SPIN_MS;
  return turning + REVEAL_MARGIN_MS;
}

/**
 * Whether a spouse's spin that just arrived may still be turning on their screen, judging by when it was made (with
 * some clock difference allowed). One seen later, e.g. on coming back to the app, shows straight away.
 */
export function isFreshSpin(spin: Pick<WheelSpinEvent, 'timestamp' | 'spinMs'>, now: number): boolean {
  return now - spin.timestamp < spinRevealDelay(spin) + CLOCK_SKEW_MS;
}

const isSpin = (event: GameEvent): event is WheelSpinEvent => event.type === 'spin';

/**
 * The state as it looked before these spins: what the spouse's screen shows while the spinner's wheel is still
 * turning, so the jackpot, the spinner's gold and tickets, the payout split and the day log don't give the result away.
 * Spins are undone newest first; the jackpot goes back to what it was before the oldest one.
 */
export function withoutSpins(state: GameState, spinIds: Iterable<string>): GameState {
  const hidden = new Set(spinIds);
  const spins = state.events.filter((event): event is WheelSpinEvent => isSpin(event) && hidden.has(event.id));
  if (spins.length === 0) return state;
  const characters = { ...state.characters };
  let { jackpotBonus } = state.wheel;
  for (const spin of spins) {
    const character = characters[spin.characterId];
    characters[spin.characterId] = {
      ...character,
      gold: character.gold - spin.gold,
      goldenTickets: character.goldenTickets + (spin.ticket === 'golden' ? 1 : 0),
      tickets: character.tickets + (spin.ticket === 'golden' ? 0 : 1) - (spin.refunded ? 1 : 0),
    };
    // Spins saved before `jackpotBefore` existed: a miss can still be undone; a jackpot's old pot is unknown.
    jackpotBonus = spin.jackpotBefore ?? (spin.prize === 'none' ? Math.max(0, jackpotBonus - JACKPOT_MISS_BONUS) : jackpotBonus);
  }
  return {
    ...state,
    characters,
    wheel: { ...state.wheel, jackpotBonus },
    events: state.events.filter((event) => !hidden.has(event.id)),
  };
}
