import { Fire } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import type { Streak } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

/**
 * "🔥 4-Day Streak" chip for a character's live streak on a quest. Shown from 2 days so players see a
 * streak building; it turns ember once the streak pays bonus gold (amounts are in the reward preview).
 */
export function StreakBadge({ streak, showAvatar }: { streak: Streak; showAvatar: boolean }) {
  const { t } = useLanguage();
  if (streak.days < 2) return null;
  const label = t('streak.days', { days: streak.days });

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-sm font-extrabold uppercase leading-none shadow-[0_0_0_2px_#2b1a12] ${
        streak.bonusGold > 0 ? 'bg-ember-400 text-ink' : 'bg-parchment-200 text-wood-700'
      }`}
      title={t('streak.hint')}
      aria-label={label}
    >
      {showAvatar && <CharacterAvatar id={streak.characterId} scale={1} framed={false} />}
      <Icon as={Fire} size={12} className={streak.bonusGold > 0 ? 'text-brick-700' : 'text-ember-600'} />
      {label}
    </span>
  );
}
