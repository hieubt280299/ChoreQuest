import { Fire } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import type { Streak } from '../../types';
import { STREAK_MIN_DAYS } from '../../utils/streaks';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';

/**
 * Compact "🔥 4" chip for a character's live streak on a quest; the tooltip spells out "4-day streak".
 * Shown from day 3, when a streak starts counting; it turns ember while it pays bonus gold.
 */
export function StreakBadge({ streak, showAvatar }: { streak: Streak; showAvatar: boolean }) {
  const { t } = useLanguage();
  // Streaks only count (and pay) from day 3, so shorter runs aren't shown.
  if (streak.days < STREAK_MIN_DAYS) return null;
  const paying = streak.bonusGold > 0;

  return (
    <Tooltip
      align="right"
      label={
        <>
          {showAvatar && <CharacterAvatar id={streak.characterId} scale={1} framed={false} />}
          <Icon as={Fire} size={12} className={paying ? 'text-brick-700' : 'text-ember-600'} />
          <span className="font-arcade text-[9px]">{streak.days}</span>
          <span className="sr-only">{t('calendar.streak', { days: streak.days })}</span>
        </>
      }
      content={t('calendar.streak', { days: streak.days })}
      triggerClassName={`inline-flex items-center gap-1 px-1 py-0.5 leading-none shadow-[0_0_0_2px_#2b1a12] ${
        paying ? 'bg-ember-400 text-ink' : 'bg-parchment-200 text-wood-700'
      }`}
    />
  );
}
