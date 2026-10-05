import { Check, Lock, Trophy } from 'pixelarticons/react';
import { useState, type ReactNode } from 'react';
import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, THEMES } from '../../constants/cosmetics';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../hooks/useTheme';
import type { AvatarId, CharacterId, ThemeId } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { ThemePreview } from './ThemePreview';

type Choice = { kind: 'theme'; item: ThemeId } | { kind: 'avatar'; item: AvatarId };

/** A selectable tile: active, owned, locked, or (with a reward to claim) claimable. */
function Tile({
  label,
  state,
  selected,
  onClick,
  children,
}: {
  label: string;
  state: 'active' | 'owned' | 'locked' | 'claimable';
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const disabled = state === 'locked';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'active' || selected}
      className={`px-slot px-focus relative flex min-w-0 flex-col items-center gap-1.5 p-2 text-center ${
        state === 'active' || selected ? 'shadow-[0_0_0_3px_#ffd166]' : ''
      } ${disabled ? 'cursor-not-allowed opacity-70 saturate-50' : 'cursor-pointer hover:brightness-105'}`}
    >
      {children}
      <span className="w-full break-words text-sm font-extrabold uppercase leading-tight">{label}</span>
      {state === 'active' && <Icon as={Check} size={24} className="absolute right-0.5 top-0.5 text-moss-600" />}
      {(state === 'locked' || state === 'claimable') && (
        <Icon as={Lock} size={12} className={`absolute right-1 top-1 ${state === 'claimable' ? 'text-ember-600' : 'text-wood-600'}`} />
      )}
    </button>
  );
}

/**
 * Wardrobe: pick your theme (this device only) and your character's avatar (seen by your spouse too). A
 * chronicle winner also picks one locked theme or avatar to unlock for the household.
 */
export function CosmeticPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { state, activeCharacter, canRename, pendingReward, claimReward, setAvatar } = useGame();
  const { theme, setTheme } = useTheme();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const me: CharacterId = activeCharacter;
  const { cosmetics } = state;
  const reward = canRename(me) ? pendingReward(me) : null;

  const themeOwned = (item: ThemeId) => item === DEFAULT_THEME || cosmetics.themes.includes(item);
  const avatarOwned = (item: AvatarId) => item === DEFAULT_AVATAR[me] || cosmetics.avatars[me].includes(item);
  const isChoice = (kind: Choice['kind'], item: string) => choice?.kind === kind && choice.item === item;

  const claim = () => {
    if (!choice) return;
    const result = claimReward(me, choice.kind, choice.item);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (choice.kind === 'theme') setTheme(choice.item);
    setChoice(null);
    setError(null);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('cosmetics.title')}>
      <div className="space-y-5">
        {reward && (
          <div className="px-slot-dark flex items-start gap-3 p-3 text-parchment-50">
            <Icon as={Trophy} size={24} className="mt-0.5 text-flame-300" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold uppercase leading-tight text-flame-300">
                {t('cosmetics.rewardTitle', { id: reward.chronicleId })}
              </p>
              <p className="text-base text-parchment-100">{t('cosmetics.rewardHint')}</p>
            </div>
          </div>
        )}

        <section>
          <h3 className="mb-1 text-lg font-extrabold uppercase text-brick-600">{t('cosmetics.themes')}</h3>
          <p className="mb-3 text-sm text-wood-600">{t('cosmetics.themesHint')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEMES.map((item) => {
              const owned = themeOwned(item);
              const state = item === theme ? 'active' : owned ? 'owned' : reward ? 'claimable' : 'locked';
              return (
                <Tile
                  key={item}
                  label={t(`theme.${item}` as TranslationKey)}
                  state={state}
                  selected={isChoice('theme', item)}
                  onClick={() => (owned ? setTheme(item) : setChoice({ kind: 'theme', item }))}
                >
                  <ThemePreview theme={item} />
                </Tile>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-lg font-extrabold uppercase text-brick-600">{t('cosmetics.avatars')}</h3>
          <p className="mb-3 text-sm text-wood-600">{t('cosmetics.avatarsHint')}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {AVATARS[me].map((item) => {
              const owned = avatarOwned(item);
              const state = item === cosmetics.activeAvatar[me] ? 'active' : owned ? 'owned' : reward ? 'claimable' : 'locked';
              return (
                <Tile
                  key={item}
                  label={t(`avatar.${item}` as TranslationKey)}
                  state={state}
                  selected={isChoice('avatar', item)}
                  onClick={() => {
                    if (!owned) setChoice({ kind: 'avatar', item });
                    else {
                      const result = setAvatar(me, item);
                      setError(result.ok ? null : result.error);
                    }
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

        {error && (
          <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50" role="alert">
            {t(error)}
          </p>
        )}
        {reward && (
          <Button className="w-full" variant="brick" disabled={!choice} onClick={claim}>
            <Icon as={Trophy} size={24} />
            {choice
              ? t('cosmetics.claim', { item: t(`${choice.kind === 'theme' ? 'theme' : 'avatar'}.${choice.item}` as TranslationKey) })
              : t('cosmetics.pickReward')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
