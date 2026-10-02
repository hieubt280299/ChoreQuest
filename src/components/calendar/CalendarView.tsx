import { Crown, Flag, Gift, Trophy } from 'pixelarticons/react';
import { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, GameEvent, TaskLog } from '../../types';
import {
  addDays,
  calculatePayout,
  dayCount,
  formatDateRange,
  formatDay,
  getXpProgress,
  localDateKey,
  parseDateKey,
} from '../../utils/calculations';
import { CharacterName } from '../ui/CharacterName';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelRing } from '../ui/LevelRing';
import { PageHeader } from '../ui/PageHeader';
import { Vnd } from '../ui/Vnd';
import { DayLog } from './DayLog';

export function CalendarView() {
  const { t, locale, language } = useLanguage();
  const { state } = useGame();
  const { chronicle } = state;
  const today = localDateKey();
  const payout = calculatePayout(state.prizePool, state.characters.husband.gold, state.characters.wife.gold);
  // The grid spans the chronicle itself, which may cross month boundaries.
  const days = Array.from({ length: dayCount(chronicle.startDate, chronicle.endDate) }, (_, index) =>
    addDays(chronicle.startDate, index),
  );
  const firstWeekday = parseDateKey(chronicle.startDate).getDay();
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' });
  const [selected, setSelected] = useState(() =>
    today >= chronicle.startDate && today <= chronicle.endDate ? today : chronicle.startDate,
  );
  // Keep the selection inside the chronicle when it rolls over or its end date moves.
  const selectedDay = selected >= chronicle.startDate && selected <= chronicle.endDate ? selected : chronicle.startDate;

  const logsByDay = useMemo(() => {
    const map = new Map<string, TaskLog[]>();
    for (const log of state.logs) map.set(log.date, [...(map.get(log.date) ?? []), log]);
    return map;
  }, [state.logs]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, GameEvent[]>();
    for (const event of state.events) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [state.events]);
  // Best day: the most quest gold earned in one day (like the day's MVP, wheel and interest gold don't
  // count), once there are at least two active days to compare.
  const bestDay = useMemo(() => {
    const active = days
      .map((date) => ({
        date,
        gold: (logsByDay.get(date) ?? []).reduce((sum, log) => sum + log.goldAwarded.husband + log.goldAwarded.wife, 0),
      }))
      .filter((day) => day.gold > 0);
    if (active.length < 2) return null;
    return active.reduce((best, day) => (day.gold > best.gold ? day : best)).date;
  }, [days, logsByDay]);

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('calendar.title')}
        subtitle={`${t('chronicle.label', { id: chronicle.id })} · ${formatDateRange(chronicle.startDate, chronicle.endDate, locale)}`}
      />
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
          {days.map((date, index) => {
            const day = parseDateKey(date).getDate();
            const dayLogs = logsByDay.get(date) ?? [];
            const count = dayLogs.length;
            const isToday = date === today;
            const isSelected = date === selectedDay;
            // A pip per character who did something that day: knight red, mage plum.
            const pips = (['husband', 'wife'] as CharacterId[]).filter((id) =>
              dayLogs.some((log) => log.completedBy === id || log.completedBy === 'both'),
            );
            // Label the month on the first cell and wherever a new month starts.
            const showMonth = index === 0 || day === 1;
            return (
              <button
                type="button"
                key={date}
                onClick={() => setSelected(date)}
                className={`px-focus relative flex min-h-14 flex-col justify-between p-1.5 text-left sm:min-h-16 ${
                  isToday ? 'bg-ember-400 shadow-[inset_-3px_-3px_0_0_#c85f1f,inset_3px_3px_0_0_#f7b76a,0_0_0_3px_#2b1a12]' : 'px-slot'
                } ${date > today && !isSelected ? 'opacity-70' : ''} ${
                  isSelected ? 'z-10 outline outline-[3px] outline-offset-2 outline-flame-300' : 'hover:brightness-105'
                }`}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isSelected}
                aria-label={t('calendar.tileLabel', { date: formatDay(date, locale), count })}
              >
                {date === bestDay && (
                  <Icon as={Crown} size={12} className="absolute -right-1 -top-1.5 text-flame-300 drop-shadow-[1px_1px_0_#2b1a12]" />
                )}
                {date === chronicle.endDate && date !== bestDay && (
                  <Icon as={Flag} size={12} className="absolute -right-1 -top-1.5 text-brick-500 drop-shadow-[1px_1px_0_#2b1a12]" />
                )}
                <p className="font-arcade text-[9px] text-ink">
                  {day}
                  {showMonth && (
                    <span className="ml-1 font-sans text-xs font-extrabold uppercase text-brick-600">{monthShort.format(parseDateKey(date))}</span>
                  )}
                </p>
                {count > 0 && (
                  <span className="flex items-end justify-between gap-0.5">
                    <span className="flex gap-0.5">
                      {pips.map((id) => (
                        <span key={id} className={`h-1.5 w-1.5 ${id === 'husband' ? 'bg-brick-500' : 'bg-plum-500'} shadow-[0_0_0_1px_#2b1a12]`} />
                      ))}
                    </span>
                    <span className="bg-moss-500 px-1 font-arcade text-[8px] leading-[14px] text-parchment-50 shadow-[0_0_0_2px_#2b1a12]">
                      {count}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>
      <DayLog
        date={selectedDay}
        logs={logsByDay.get(selectedDay) ?? []}
        events={eventsByDay.get(selectedDay) ?? []}
        bestDay={bestDay}
      />
      <Card>
        <div className="mb-3 flex items-center gap-2 text-brick-600">
          <Icon as={Trophy} size={24} />
          <h2 className="text-2xl font-extrabold uppercase">{t('calendar.share')}</h2>
        </div>
        <div className="px-slot-dark mb-4 flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="flex items-center gap-2 text-lg font-extrabold uppercase text-parchment-300">
            <Icon as={Gift} size={24} className="text-flame-300" />
            {t('dashboard.prizePool')}
          </span>
          <Vnd amount={state.prizePool} className="text-base text-flame-300" />
        </div>
        {state.characters.husband.gold + state.characters.wife.gold === 0 && (
          <p className="mb-3 text-base text-wood-600">{t('calendar.noGold')}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {(['husband', 'wife'] as CharacterId[]).map((id) => {
            const character = state.characters[id];
            const progress = getXpProgress(character.xp);
            return (
              <div key={id} className="px-slot flex items-center gap-4 p-3">
                {/* Portrait with the level circle overlapping its corner, Dota-style */}
                <div className="relative shrink-0 pb-4 pl-4">
                  <CharacterAvatar id={id} scale={4} className="w-[84px]" />
                  <LevelRing
                    xp={character.xp}
                    size={44}
                    className="absolute bottom-0 left-0"
                    label={`${t('character.level', { level: progress.level })} · ${
                      progress.needed
                        ? t('character.xp', { current: Math.round(progress.currentInLevel), needed: progress.needed })
                        : t('character.maxLevel')
                    }`}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-xl font-extrabold uppercase leading-none"><CharacterName id={id} /></p>
                  <p className="flex items-center gap-2 text-sm font-bold uppercase text-wood-600">
                    {t('character.gold')}
                    <GoldCounter amount={character.gold} />
                  </p>
                  <div>
                    <p className="text-sm font-bold uppercase text-wood-600">{t('calendar.payout')}</p>
                    <Vnd amount={payout[id]} className="text-sm text-ink" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {state.prizeHistory.length > 0 && (
        <Card>
          <h2 className="mb-3 text-2xl font-extrabold uppercase">{t('calendar.history')}</h2>
          <div className="space-y-3">
            {state.prizeHistory.map((entry) => (
              <div
                key={`${entry.chronicleId}-${entry.startDate}`}
                className="px-slot flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="text-lg font-extrabold">
                  {entry.chronicleId > 0 && `${t('chronicle.label', { id: entry.chronicleId })} · `}
                  <span className="text-base font-bold text-wood-600">{formatDateRange(entry.startDate, entry.endDate, locale)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-3 text-base font-bold text-wood-700">
                  <CharacterName id={'husband'} /> <Vnd amount={entry.payout.husband} className="text-[10px] text-ink" />
                  <CharacterName id={'wife'} /> <Vnd amount={entry.payout.wife} className="text-[10px] text-ink" />
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
