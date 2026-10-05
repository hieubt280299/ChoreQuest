import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import type { CharacterId, LevelUpReward } from '../types';
import { getLevelFromXp, goldForLevelRange, skillPointsEarned } from '../utils/calculations';
import { useThemeScope } from './useTheme';

const keyFor = (scope: string, characterId: CharacterId) => `chorequest.seenLevel.${scope}.${characterId}`;

function readSeen(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeSeen(key: string, level: number) {
  try {
    localStorage.setItem(key, String(level));
  } catch {
    // Storage unavailable: the card may show again after a reload.
  }
}

/**
 * Level-ups of this player's own character not yet celebrated on this device, compared with the last level
 * it showed. The first run just records the current level (no card for old levels), and a level reset
 * ("new legend") lowers the record without a card.
 */
export function useOwnLevelUp(characterId: CharacterId): { pending: LevelUpReward | null; acknowledge: () => void } {
  const { state, canActAs } = useGame();
  const scope = useThemeScope();
  const key = scope ? keyFor(scope, characterId) : null;
  const level = getLevelFromXp(state.characters[characterId].xp);
  const [seen, setSeen] = useState<number | null>(() => (key ? readSeen(key) : null));

  useEffect(() => {
    if (!key) return;
    const stored = readSeen(key);
    if (stored === null || stored > level) {
      writeSeen(key, level);
      setSeen(level);
    } else {
      setSeen(stored);
    }
    // Re-read when switching character or household; level changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (key && seen !== null && level < seen) {
      writeSeen(key, level);
      setSeen(level);
    }
  }, [key, level, seen]);

  const acknowledge = useCallback(() => {
    if (!key) return;
    writeSeen(key, level);
    setSeen(level);
  }, [key, level]);

  const from = seen ?? level;
  const pending: LevelUpReward | null =
    key && canActAs(characterId) && level > from
      ? {
          characterId,
          from,
          to: level,
          bonusGold: goldForLevelRange(from, level),
          tickets: level - from,
          skillPoints: skillPointsEarned(level) - skillPointsEarned(from),
        }
      : null;
  return { pending, acknowledge };
}
