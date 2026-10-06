import { Crown, Fire, Flag, Gift, Moon, Script, Star, TrendingUp } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, GameEvent, TaskLog, WheelSpinEvent } from '../../types';
import { formatDay, formatGold, localDateKey, parseDateKey } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { STREAK_MIN_DAYS } from '../../utils/streaks';
import { dayMvp } from '../../utils/mvp';
import { taskName } from '../../utils/taskNames';
import { CharacterName } from '../ui/CharacterName';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { Ticket } from '../ui/pixel/TicketIcon';
import { Tooltip } from '../ui/Tooltip';

const IDS: CharacterId[] = ['husband', 'wife'];

type Entry = { kind: 'quest'; log: TaskLog } | { kind: 'spin'; spin: WheelSpinEvent };
const entryTime = (entry: Entry) => (entry.kind === 'quest' ? entry.log.timestamp : entry.spin.timestamp);

/**
 * The chronicle's page for one day: quests and wheel spins, what they paid, and who carried the day.
 * Interest gold is shown apart as a badge, since it never counts for the payout or the MVP.
 */
export function DayLog({
  date,
  logs,
  events,
  bestDay,
}: {
  date: string;
  logs: TaskLog[];
  events: GameEvent[];
  bestDay: string | null;
}) {
  const { t, language, locale } = useLanguage();
  const { state } = useGame();
  const today = localDateKey();
  const isFinal = date === state.chronicle.endDate;
  const spins = events.filter((event): event is WheelSpinEvent => event.type === 'spin');
  const entries: Entry[] = [
    ...logs.map((log): Entry => ({ kind: 'quest', log })),
    ...spins.map((spin): Entry => ({ kind: 'spin', spin })),
  ].sort((a, b) => entryTime(a) - entryTime(b));
  const totals = Object.fromEntries(
    IDS.map((id) => [
      id,
      {
        // Quest gold decides the day's MVP; wheel and interest gold count for the payout but not here.
        gold: logs.reduce((sum, log) => sum + (log.goldAwarded[id] ?? 0), 0),
        xp: logs.reduce((sum, log) => sum + (log.xpAwarded[id] ?? 0), 0),
        wheel: spins.reduce((sum, spin) => sum + (spin.characterId === id ? spin.gold : 0), 0),
        interest: events.reduce((sum, event) => sum + (event.type === 'interest' && event.characterId === id ? event.gold : 0), 0),
      },
    ]),
  ) as Record<CharacterId, { gold: number; xp: number; wheel: number; interest: number }>;
  const bonus = (id: CharacterId) => totals[id].wheel + totals[id].interest;
  // MVP: whoever earned more gold that day (no crown on a tie).
  // Locked at midnight: wheel, interest and late (next-morning) quest gold don't count.
  const mvp = dayMvp(logs, date);

  const tags: { key: TranslationKey; icon: typeof Star; className: string }[] = [];
  if (date === today) tags.push({ key: 'calendar.tag.today', icon: Star, className: 'bg-ember-400 text-ink' });
  if (date === bestDay) tags.push({ key: 'calendar.tag.best', icon: Crown, className: 'bg-flame-300 text-ink' });
  if (isFinal) tags.push({ key: 'calendar.tag.final', icon: Flag, className: 'bg-brick-500 text-parchment-50' });
  if (date < today && entries.length === 0) tags.push({ key: 'calendar.tag.rest', icon: Moon, className: 'bg-plum-500 text-parchment-50' });
  if (date > today) tags.push({ key: 'calendar.tag.upcoming', icon: Script, className: 'bg-wood-500 text-parchment-50' });

  const empty = date > today ? 'calendar.blankPage' : date === today ? 'calendar.todayEmpty' : 'calendar.restDay';
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(parseDateKey(date));

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-2xl font-extrabold uppercase leading-none text-brick-600">
          {weekday}
          <span className="ml-2 text-lg text-wood-600">{formatDay(date, locale)}</span>
        </h2>
        {tags.map((tag) => (
          <span
            key={tag.key}
            className={`inline-flex items-center gap-1 px-1.5 text-sm font-extrabold uppercase leading-tight shadow-[0_0_0_2px_#2b1a12] ${tag.className}`}
          >
            <Icon as={tag.icon} size={12} />
            {t(tag.key)}
          </span>
        ))}
      </div>

      {/* Summary when anything paid out that day (a day with only interest still shows it). */}
      {(entries.length > 0 || bonus('husband') + bonus('wife') > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {IDS.map((id) => (
            <div key={id} className={`px-slot relative flex items-center gap-2 p-2 ${mvp === id ? 'shadow-[0_0_0_3px_#ffd166]' : ''}`}>
              <CharacterAvatar id={id} scale={2} className="shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-extrabold uppercase leading-none"><CharacterName id={id} /></p>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <GoldCounter amount={totals[id].gold} />
                  {bonus(id) > 0 && (
                    <Tooltip
                      align={id === 'wife' ? 'right' : 'left'}
                      label={
                        <span className="inline-flex items-center gap-0.5 font-arcade text-[9px] text-plum-600">
                          <Icon as={Gift} size={12} />+{formatGold(bonus(id))}
                        </span>
                      }
                      content={
                        <>
                          {totals[id].interest > 0 && (
                            <span className="flex items-center gap-1 font-extrabold">
                              <Icon as={TrendingUp} size={12} />
                              {t('interest.today', { gold: formatGold(totals[id].interest) })}
                            </span>
                          )}
                          {totals[id].wheel > 0 && (
                            <span className="flex items-center gap-1 font-extrabold">
                              <Icon as={Ticket} size={12} />
                              {t('wheel.today', { gold: formatGold(totals[id].wheel) })}
                            </span>
                          )}
                          <span className="mt-1 block text-wood-700">{t('bonus.notMvp')}</span>
                        </>
                      }
                    />
                  )}
                </span>
                <p className="font-arcade text-[9px] text-moss-700">+{Math.round(totals[id].xp)} XP</p>
              </div>
              {mvp === id && (
                <span
                  className="absolute -right-1 -top-2 inline-flex items-center gap-0.5 bg-flame-300 px-1 text-xs font-extrabold uppercase leading-tight text-ink shadow-[0_0_0_2px_#2b1a12]"
                  title={t('calendar.mvp')}
                >
                  <Icon as={Crown} size={12} className="text-brick-700" />
                  MVP
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Busy days scroll inside the card (about five entries visible) instead of stretching the page. */}
      {entries.length === 0 ? (
        <p className="px-slot px-3 py-4 text-center text-base font-bold text-wood-600">{t(empty)}</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label={t('calendar.questList')}>
          {entries.map((entry) => {
            if (entry.kind === 'spin') {
              const { spin } = entry;
              return (
                <li key={spin.id} className="px-slot flex items-center gap-3 px-3 py-2">
                  <span className="shrink-0 font-arcade text-[9px] text-wood-600">{time.format(spin.timestamp)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-base font-extrabold leading-tight text-plum-600">
                      <Icon as={Ticket} size={24} />
                      {t('wheel.title')}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold uppercase text-wood-600">
                      <span className="max-w-[10rem] truncate"><CharacterName id={spin.characterId} /></span>
                      {spin.gold === 0 && <span>· {t('wheel.prize.none')}</span>}
                    </p>
                  </div>
                  <GoldCounter amount={spin.gold} className="shrink-0" />
                </li>
              );
            }
            const { log } = entry;
            const task = state.tasks.find((item) => item.id === log.taskId);
            const streak = Math.max(0, ...Object.values(log.streakDays ?? {}).map((days) => days ?? 0));
            const gold = (log.goldAwarded.husband ?? 0) + (log.goldAwarded.wife ?? 0);
            return (
              <li key={log.id} className="px-slot flex items-center gap-3 px-3 py-2">
                <span className="shrink-0 font-arcade text-[9px] text-wood-600">{time.format(log.timestamp)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-extrabold leading-tight">
                    {task ? taskName(task, language) : t('history.removedQuest')}
                    {log.late && (
                      <span className="ml-1.5 bg-wood-500 px-1 align-middle text-xs font-extrabold uppercase text-parchment-50">
                        {t('yesterday.lateTag')}
                      </span>
                    )}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold uppercase text-wood-600">
                    <span className="max-w-[10rem] truncate">{log.completedBy === 'both' ? t('tasks.both') : <CharacterName id={log.completedBy} />}</span>
                    {streak >= STREAK_MIN_DAYS && (
                      <span className="inline-flex items-center gap-0.5 text-ember-600">
                        <Icon as={Fire} size={12} />
                        {t('calendar.streak', { days: streak })}
                      </span>
                    )}
                  </p>
                </div>
                <GoldCounter amount={gold} className="shrink-0" />
              </li>
            );
          })}
        </ul>
      )}
      {isFinal && <p className="mt-3 text-base font-bold text-brick-600">{t('calendar.finalNote')}</p>}
    </Card>
  );
}
