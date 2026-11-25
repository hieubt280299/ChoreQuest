import { Trophy } from 'pixelarticons/react';
import { useState } from 'react';
import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, THEMES } from '../../constants/cosmetics';
import { WINNER_GOLDEN_TICKETS } from '../../constants/gameRules';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../hooks/useTheme';
import type { AvatarId, CharacterId, ThemeId } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { rewardCopy } from './rewardCopy';
import { ThemePreview } from './ThemePreview';
import { Tile } from './Tile';

/**
 * Wardrobe: pick your theme (this device only) and your character's avatar (seen by your spouse too), from what is
 * unlocked. Chronicle rewards are picked in their own dialog (RewardPickerModal); a reward still to pick shows a
 * shortcut to it here.
 */
export function CosmeticPicker({ open, onClose, onOpenRewards }: { open: boolean; onClose: () => void; onOpenRewards: () => void }) {
  const { t } = useLanguage();
  const { state, activeCharacter, canRename, pendingReward, setAvatar } = useGame();
  const { theme, setTheme } = useTheme();
  const [error, setError] = useState<TranslationKey | null>(null);
  const me: CharacterId = activeCharacter;
  const { cosmetics } = state;
  const reward = canRename(me) ? pendingReward(me) : null;
  // Two tabs keep the dialog short.
  const [tab, setTab] = useState<'themes' | 'avatars'>('themes');

  const themeOwned = (item: ThemeId) => item === DEFAULT_THEME || cosmetics.themes.includes(item);
  const avatarOwned = (item: AvatarId) => item === DEFAULT_AVATAR[me] || cosmetics.avatars[me].includes(item);

  return (
    <Modal open={open} onClose={onClose} title={t('cosmetics.title')}>
      <div className="space-y-5">
        {reward && (
          <div className="px-slot-dark flex flex-wrap items-center gap-3 p-3 text-parchment-50">
            <Icon as={Trophy} size={24} className="shrink-0 text-flame-300" />
            <div className="min-w-[10rem] flex-1">
              <p className="text-base font-extrabold uppercase leading-tight text-flame-300">
                {t(rewardCopy(reward).title, { id: reward.chronicleId })}
              </p>
              <p className="text-sm text-parchment-100">{t(rewardCopy(reward).hint, { count: WINNER_GOLDEN_TICKETS })}</p>
            </div>
            <Button className="w-full sm:w-auto" onClick={onOpenRewards}>
              {t('cosmetics.choose')}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3" role="tablist" aria-label={t('cosmetics.title')}>
          {(['themes', 'avatars'] as const).map((key) => {
            const selected = tab === key;
            return (
              <Button
                key={key}
                role="tab"
                id={`wardrobe-tab-${key}`}
                aria-selected={selected}
                aria-controls={`wardrobe-panel-${key}`}
                variant={selected ? 'primary' : 'secondary'}
                onClick={() => setTab(key)}
              >
                {t(key === 'themes' ? 'cosmetics.themes' : 'cosmetics.avatars')}
              </Button>
            );
          })}
        </div>

        {tab === 'themes' && (
          <section id="wardrobe-panel-themes" role="tabpanel" aria-labelledby="wardrobe-tab-themes">
            <p className="mb-3 text-sm text-wood-600">{t('cosmetics.themesHint')}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {THEMES.map((item) => {
                const owned = themeOwned(item);
                return (
                  <Tile
                    key={item}
                    label={t(`theme.${item}` as TranslationKey)}
                    state={item === theme ? 'active' : owned ? 'owned' : 'locked'}
                    onClick={() => setTheme(item)}
                  >
                    <ThemePreview theme={item} />
                  </Tile>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'avatars' && (
          <section id="wardrobe-panel-avatars" role="tabpanel" aria-labelledby="wardrobe-tab-avatars">
            <p className="mb-3 text-sm text-wood-600">{t('cosmetics.avatarsHint')}</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {AVATARS[me].map((item) => {
                const owned = avatarOwned(item);
                return (
                  <Tile
                    key={item}
                    label={t(`avatar.${item}` as TranslationKey)}
                    state={item === cosmetics.activeAvatar[me] ? 'active' : owned ? 'owned' : 'locked'}
                    onClick={() => {
                      const result = setAvatar(me, item);
                      setError(result.ok ? null : result.error);
                    }}
                  >
                    <span className="flex h-14 items-end">
                      <CharacterAvatar id={me} avatar={item} scale={3} framed={false} />
                    </span>
                  </Tile>
                );
              })}
            </div>
          </section>
        )}

        {error && (
          <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50" role="alert">
            {t(error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
