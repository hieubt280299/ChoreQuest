import { Fire } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import type { Streak } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

/**
 * "🔥 4-Day Streak (+1 G)" chip for a character's live streak on a quest. Shown from 2 days so players
 * see a streak building; the bonus is what today's completion earned (or would earn).
 */
export function StreakBadge({ streak, showAvatar }: { streak: Streak; showAvatar: boolean }) {
  const { t } = useLanguage();
  if (streak.days < 2) return null;
  const bonus = streak.bonusGold > 0 ? (streak.doneToday ? t('streak.bonus', { gold: streak.bonusGold }) : t('streak.next', { gold: streak.bonusGold })) : null;
  const label = `${t('streak.days', { days: streak.days })}${bonus ? ` (${bonus})` : ''}`;

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
