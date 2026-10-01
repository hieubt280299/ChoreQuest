import { Crown, Fire, Flag, Moon, Script, Star } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId, TaskLog } from '../../types';
import { formatDay, localDateKey, parseDateKey } from '../../utils/calculations';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';

const IDS: CharacterId[] = ['husband', 'wife'];

/** The chronicle's page for one day: who did what, what it paid, and who carried the day. */
export function DayLog({ date, logs, bestDay }: { date: string; logs: TaskLog[]; bestDay: string | null }) {
  const { t, language, locale } = useLanguage();
  const { name } = useCharacterName();
  const { state } = useGame();
  const today = localDateKey();
  const isFinal = date === state.chronicle.endDate;
  const entries = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const totals = Object.fromEntries(
    IDS.map((id) => [
      id,
      {
        gold: entries.reduce((sum, log) => sum + (log.goldAwarded[id] ?? 0), 0),
        xp: entries.reduce((sum, log) => sum + (log.xpAwarded[id] ?? 0), 0),
      },
    ]),
  ) as Record<CharacterId, { gold: number; xp: number }>;
  // MVP: whoever earned more gold that day (no crown on a tie).
  const mvp =
    totals.husband.gold === totals.wife.gold ? null : totals.husband.gold > totals.wife.gold ? 'husband' : 'wife';

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

      {entries.length === 0 ? (
        <p className="px-slot px-3 py-4 text-center text-base font-bold text-wood-600">{t(empty)}</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            {IDS.map((id) => (
              <div key={id} className={`px-slot relative flex items-center gap-2 p-2 ${mvp === id ? 'shadow-[0_0_0_3px_#ffd166]' : ''}`}>
                <CharacterAvatar id={id} scale={2} className="shrink-0" />
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-base font-extrabold uppercase leading-none">{name(id)}</p>
                  <GoldCounter amount={totals[id].gold} />
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
          {/* Busy days scroll inside the card (about five quests visible) instead of stretching the page. */}
          <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1" tabIndex={0} aria-label={t('calendar.questList')}>
            {entries.map((log) => {
              const task = state.tasks.find((item) => item.id === log.taskId);
              const streak = Math.max(0, ...Object.values(log.streakDays ?? {}).map((days) => days ?? 0));
              const gold = (log.goldAwarded.husband ?? 0) + (log.goldAwarded.wife ?? 0);
              return (
                <li key={log.id} className="px-slot flex items-center gap-3 px-3 py-2">
                  <span className="shrink-0 font-arcade text-[9px] text-wood-600">{time.format(log.timestamp)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-extrabold leading-tight">
                      {task ? taskName(task, language) : t('history.removedQuest')}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-sm font-bold uppercase text-wood-600">
                      <span className="max-w-[10rem] truncate">{log.completedBy === 'both' ? t('tasks.both') : name(log.completedBy)}</span>
                      {streak >= 2 && (
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
        </>
      )}
      {isFinal && <p className="mt-3 text-base font-bold text-brick-600">{t('calendar.finalNote')}</p>}
    </Card>
  );
}
