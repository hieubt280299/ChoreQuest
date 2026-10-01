import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { useLanguage } from '../context/LanguageContext';
import type { CharacterId } from '../types';

/**
 * Display name for a character: the player's chosen name, or the role ("Husband" / "Chồng") when unset.
 * Use `role(id)` where the role itself must show (e.g. the "You are" switcher or a role subheader).
 */
export function useCharacterName() {
  const { t } = useLanguage();
  const { state } = useGame();
  const role = useCallback((id: CharacterId) => t(`character.${id}`), [t]);
  const name = useCallback((id: CharacterId) => state.characters[id].customName || role(id), [state.characters, role]);
  const hasCustomName = useCallback((id: CharacterId) => !!state.characters[id].customName, [state.characters]);
  return { name, role, hasCustomName };
}
