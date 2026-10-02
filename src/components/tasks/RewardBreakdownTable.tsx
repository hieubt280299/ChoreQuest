import { Fire } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, RewardBreakdown } from '../../types';
import { STREAK_MIN_DAYS } from '../../utils/streaks';
import { CharacterName } from '../ui/CharacterName';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

const fmt = (value: number) => Math.round(value);

/** Base + skill + streak bonuses for each recipient of a completion. */
export function RewardBreakdownTable({ breakdown }: { breakdown: Record<CharacterId, RewardBreakdown | null> }) {
  const { t } = useLanguage();
  const recipients = (['husband', 'wife'] as CharacterId[]).filter((id) => breakdown[id]);

  const row = (label: string, render: (part: RewardBreakdown) => string, highlight = false) => (
    <tr className={highlight ? 'border-t-2 border-ink font-extrabold' : ''}>
      <th scope="row" className="py-1 pr-2 text-left text-sm font-extrabold uppercase text-wood-700">
        {label}
      </th>
      {recipients.map((id) => (
        <td key={id} className="py-1 text-right font-arcade text-[9px] leading-relaxed text-ink">
          {render(breakdown[id]!)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="px-slot mb-5 p-3">
      <p className="mb-2 text-base font-extrabold uppercase text-brick-600">{t('reward.preview')}</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <td />
            {recipients.map((id) => (
              <th key={id} scope="col" className="pb-1 text-right text-sm font-extrabold uppercase text-wood-700">
                <span className="inline-flex items-end gap-1">
                  <CharacterAvatar id={id} scale={1} framed={false} />
                  <span className="max-w-[7rem] truncate"><CharacterName id={id} /></span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row(t('reward.base'), (part) => `+${fmt(part.baseXp)}XP ${fmt(part.baseGold)}G`)}
          {row(t('reward.skills'), (part) => `+${fmt(part.skillXp)}XP +${fmt(part.skillGold)}G`)}
          <tr>
            <th scope="row" className="py-1 pr-2 text-left text-sm font-extrabold uppercase text-wood-700">
              <span className="inline-flex items-center gap-1">
                <Icon as={Fire} size={12} className="text-ember-600" />
                {t('reward.streak')}
              </span>
            </th>
            {recipients.map((id) => {
              const part = breakdown[id]!;
              return (
                <td key={id} className="py-1 text-right font-arcade text-[9px] leading-relaxed text-ink">
                  {part.streakDays >= STREAK_MIN_DAYS && <span className="mr-1 font-sans text-sm font-bold text-wood-600">{t('streak.days', { days: part.streakDays })}</span>}
                  +{fmt(part.streakGold)}G
                </td>
              );
            })}
          </tr>
          {row(t('reward.total'), (part) => `+${fmt(part.xp)}XP ${fmt(part.gold)}G`, true)}
        </tbody>
      </table>
    </div>
  );
}
