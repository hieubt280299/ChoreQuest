import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculatePayout, daysInMonth, formatVnd, localDateKey, monthLabel } from '../../utils/calculations';
import { Card } from '../ui/Card';

export function CalendarView() {
  const { t, locale, language } = useLanguage();
  const { state } = useGame();
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const days = daysInMonth(year, monthIndex);
  const today = localDateKey();
  const payout = calculatePayout(
    state.prizePool,
    state.characters.husband.gold,
    state.characters.wife.gold,
  );
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-stone-800">{t('calendar.title')}</h1>
        <p className="text-stone-500">{monthLabel(state.activeMonth, locale)}</p>
      </div>
      <Card>
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-stone-400">
          {(language === 'vi'
            ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          ).map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
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
                className={`min-h-16 rounded-2xl p-2 text-sm ${
                  isToday ? 'bg-amber-warm' : 'bg-stone-50'
                }`}
              >
                <p className="font-bold text-stone-700">{day}</p>
                {count > 0 && (
                  <p className="mt-1 rounded-full bg-emerald-100 px-2 text-xs font-bold text-emerald-800">
                    {count}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-rose-soft to-white">
        <h2 className="mb-3 font-display text-xl">{t('calendar.share')}</h2>
        {state.characters.husband.gold + state.characters.wife.gold === 0 && (
          <p className="mb-3 text-sm text-stone-500">{t('calendar.noGold')}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/80 p-4">
            <p className="text-sm text-stone-500">{t('calendar.husbandShare')}</p>
            <p className="font-display text-2xl">{formatVnd(payout.husband)}</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4">
            <p className="text-sm text-stone-500">{t('calendar.wifeShare')}</p>
            <p className="font-display text-2xl">{formatVnd(payout.wife)}</p>
          </div>
        </div>
      </Card>
      {state.prizeHistory.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-xl">{t('calendar.history')}</h2>
          <div className="space-y-2">
            {state.prizeHistory.map((entry) => (
              <div key={entry.month} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-stone-50 px-3 py-2 text-sm">
                <span className="font-bold">{monthLabel(entry.month, locale)}</span>
                <span>
                  {t('character.husband')}: {formatVnd(entry.payout?.husband ?? 0)} · {t('character.wife')}:{' '}
                  {formatVnd(entry.payout?.wife ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
