import { Trophy } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { calculatePayout, daysInMonth, localDateKey, monthLabel } from '../../utils/calculations';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { Vnd } from '../ui/Vnd';

export function CalendarView() {
  const { t, locale, language } = useLanguage();
  const { state } = useGame();
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const days = daysInMonth(year, monthIndex);
  const today = localDateKey();
  const payout = calculatePayout(state.prizePool, state.characters.husband.gold, state.characters.wife.gold);
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  return (
    <section className="space-y-6">
      <PageHeader title={t('calendar.title')} subtitle={monthLabel(state.activeMonth, locale)} />
      <Card className="p-3 sm:p-5">
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-sm font-extrabold uppercase text-wood-500">
          {(language === 'vi'
            ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          ).map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {Array.from({ length: firstWeekday }).map((_, index) => (
            <div key={`pad-${index}`} />
          ))}
          {Array.from({ length: days }).map((_, index) => {
            const day = index + 1;
            const date = `${state.activeMonth}-${String(day).padStart(2, '0')}`;
            const count = state.logs.filter((log) => log.date === date).length;
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`flex min-h-14 flex-col justify-between p-1.5 sm:min-h-16 ${
                  isToday ? 'bg-ember-400 shadow-[inset_-3px_-3px_0_0_#c85f1f,inset_3px_3px_0_0_#f7b76a,0_0_0_3px_#2b1a12]' : 'px-slot'
                }`}
                aria-current={isToday ? 'date' : undefined}
              >
                <p className="font-arcade text-[9px] text-ink">{day}</p>
                {count > 0 && (
                  <p className="self-end bg-moss-500 px-1 font-arcade text-[8px] leading-[14px] text-parchment-50 shadow-[0_0_0_2px_#2b1a12]">
                    {count}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center gap-2 text-brick-600">
          <Icon as={Trophy} size={24} />
          <h2 className="text-2xl font-extrabold uppercase">{t('calendar.share')}</h2>
        </div>
        {state.characters.husband.gold + state.characters.wife.gold === 0 && (
          <p className="mb-3 text-base text-wood-600">{t('calendar.noGold')}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['husband', 'wife'] as CharacterId[]).map((id) => (
            <div key={id} className="px-slot flex items-center gap-3 p-3">
              <CharacterAvatar id={id} scale={2} framed={false} />
              <div>
                <p className="text-base font-bold uppercase text-wood-600">{t(`calendar.${id}Share`)}</p>
                <Vnd amount={payout[id]} className="text-sm text-ink" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      {state.prizeHistory.length > 0 && (
        <Card>
          <h2 className="mb-3 text-2xl font-extrabold uppercase">{t('calendar.history')}</h2>
          <div className="space-y-3">
            {state.prizeHistory.map((entry) => (
              <div key={entry.month} className="px-slot flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span className="text-lg font-extrabold">{monthLabel(entry.month, locale)}</span>
                <span className="flex flex-wrap items-center gap-3 text-base font-bold text-wood-700">
                  {t('character.husband')} <Vnd amount={entry.payout?.husband ?? 0} className="text-[10px] text-ink" />
                  {t('character.wife')} <Vnd amount={entry.payout?.wife ?? 0} className="text-[10px] text-ink" />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
