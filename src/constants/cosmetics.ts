import type { AvatarId, CharacterId, Cosmetics, ThemeId } from '../types';

/** App themes. Cozy Hearth is always available; the others are chronicle-winner rewards. */
export const THEMES: ThemeId[] = ['hearth', 'mushroom', 'cottage', 'forest'];
export const DEFAULT_THEME: ThemeId = 'hearth';


/** Avatars per character, the default first. */
export const AVATARS: Record<CharacterId, AvatarId[]> = {
  husband: ['knight', 'forester', 'harvester', 'wayfarer', 'artificer', 'spellsmith', 'botanist', 'troubadour', 'dreamer', 'scrapper', 'voyager', 'courier', 'monk', 'fisherman', 'merchant', 'ranger', 'sailor'],
  wife: ['mage', 'baker', 'florist', 'herbalist', 'apothecary', 'beastmaster', 'ranger', 'courier', 'explorer', 'dancer', 'acrobat', 'puppeteer', 'storyteller', 'mechanic', 'tailor', 'cartographer', 'captain'],
};
export const DEFAULT_AVATAR: Record<CharacterId, AvatarId> = { husband: 'knight', wife: 'mage' };

export function defaultCosmetics(): Cosmetics {
  return {
    themes: [],
    avatars: { husband: [], wife: [] },
    activeAvatar: { ...DEFAULT_AVATAR },
    rewards: [],
  };
}

export const isThemeId = (value: unknown): value is ThemeId => THEMES.includes(value as ThemeId);
export const isAvatarFor = (characterId: CharacterId, value: unknown): value is AvatarId =>
  AVATARS[characterId].includes(value as AvatarId);
