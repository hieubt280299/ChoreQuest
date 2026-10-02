import { JACKPOT_BASE_GOLD, JACKPOT_MISS_BONUS, WHEEL_PRIZES } from '../constants/gameRules';
import type { WheelPrize, WheelState } from '../types';

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

/** Wheel state after a spin: a miss grows the jackpot, a jackpot empties it. */
export function nextWheelState(prize: WheelPrize, wheel: WheelState): WheelState {
  if (prize === 'none') return { jackpotBonus: wheel.jackpotBonus + JACKPOT_MISS_BONUS };
  if (prize === 'jackpot') return { jackpotBonus: 0 };
  return wheel;
}
