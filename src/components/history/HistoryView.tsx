import { ChevronDown, Fire, Home } from 'pixelarticons/react';
import { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId } from '../../types';
import { formatDateRange, parseDateKey } from '../../utils/calculations';
import { questHistory, totalTally, type QuestTally } from '../../utils/history';
import type { TranslationKey } from '../../utils/i18n';
import { STREAK_MIN_DAYS } from '../../utils/streaks';
import { taskName } from '../../utils/taskNames';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { PageHeader } from '../ui/PageHeader';
import { CATEGORY_ICONS } from '../tasks/TasksView';

const other = (id: CharacterId): CharacterId => (id === 'husband' ? 'wife' : 'husband');

/** Two-colour bar showing how a total splits between the two players. */
function ShareBar({ label, mine, theirs, me, partner }: { label: string; mine: number; theirs: number; me: CharacterId; partner: CharacterId }) {
  const { name } = useCharacterName();
  const total = mine + theirs;
  const share = total > 0 ? Math.round((mine / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm font-extrabold uppercase text-wood-700">
        <span className="flex min-w-0 gap-1">
          <span className="max-w-[40%] truncate">{name(me)}</span> {share}%
        </span>
        <span>{label}</span>
        <span className="flex min-w-0 justify-end gap-1">
          <span className="max-w-[40%] truncate">{name(partner)}</span> {total > 0 ? 100 - share : 0}%
        </span>
      </div>
      <div className="flex h-4 bg-parchment-300 shadow-[0_0_0_3px_#2b1a12]" role="img" aria-label={`${label}: ${share}% / ${total > 0 ? 100 - share : 0}%`}>
        <div className="h-full bg-ember-500 shadow-[inset_0_-3px_0_0_#a44a14]" style={{ width: `${share}%` }} />
        <div className="h-full flex-1 bg-moss-500 shadow-[inset_0_-3px_0_0_#3f5a24]" style={{ display: total > 0 ? undefined : 'none' }} />
      </div>
    </div>
  );
}

function TallyRow({ id, tally }: { id: CharacterId; tally: QuestTally }) {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  return (
    <div className="px-slot flex flex-wrap items-center gap-3 p-2">
      <CharacterAvatar id={id} scale={2} framed={false} />
      <span className="min-w-20 flex-1 truncate text-base font-extrabold uppercase">{name(id)}</span>
      <span className="font-arcade text-[10px]">{t('history.times', { count: tally.count })}</span>
      <span className="font-arcade text-[10px] text-moss-700">+{Math.round(tally.xp)}XP</span>
      <GoldCounter amount={tally.gold} />
    </div>
  );
}

export function HistoryView() {
  const { t, language, locale } = useLanguage();
  const { name } = useCharacterName();
  const { state, today, activeCharacter, getStreak } = useGame();
  const [player, setPlayer] = useState<CharacterId>(activeCharacter);
  const [openTask, setOpenTask] = useState<string | null>(null);
  const partner = other(player);
  const { chronicle } = state;
  const end = today < chronicle.endDate ? today : chronicle.endDate;

  const entries = useMemo(() => questHistory(state.logs, player, chronicle.startDate, end), [state.logs, player, chronicle.startDate, end]);
  const counts = useMemo(
    () => ({
      husband: totalTally(questHistory(state.logs, 'husband', chronicle.startDate, end)).count,
      wife: totalTally(questHistory(state.logs, 'wife', chronicle.startDate, end)).count,
    }),
    [state.logs, chronicle.startDate, end],
  );
  const totals = totalTally(entries);
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('history.title')}
        subtitle={`${t('chronicle.label', { id: chronicle.id })} · ${formatDateRange(chronicle.startDate, end, locale)}`}
      />

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('profile.playingAs')}>
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const selected = player === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setPlayer(id);
                setOpenTask(null);
              }}
              className={`px-btn justify-start gap-2 py-1.5 pl-1.5 text-lg ${selected ? 'px-btn-primary' : ''}`}
            >
              <CharacterAvatar id={id} scale={2} framed={false} />
              <span className="min-w-0 flex-1 truncate text-left">{name(id)}</span>
              <span className="font-arcade text-[10px] normal-case">{t('history.times', { count: counts[id] })}</span>
            </button>
          );
        })}
      </div>

      {entries.length === 0 ? (
        <Card>
          <p className="text-lg">{t('history.empty')}</p>
        </Card>
      ) : (
        <Card className="p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-base font-extrabold uppercase text-wood-700">
            <span>{t('history.completed', { count: totals.count })}</span>
            <span className="font-arcade text-[10px] text-moss-700">+{Math.round(totals.xp)}XP</span>
            <GoldCounter amount={totals.gold} />
          </div>
          <ul className="space-y-3">
            {entries.map((entry) => {
              const task = state.tasks.find((item) => item.id === entry.taskId);
              const name = task ? taskName(task, language) : t('history.removedQuest');
              const streak = getStreak(entry.taskId, player);
              const open = openTask === entry.taskId;
              const panelId = `history-${entry.taskId}`;
              return (
                <li key={entry.taskId} className="px-slot">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenTask(open ? null : entry.taskId)}
                    className="px-focus flex w-full items-center gap-3 p-2 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center text-brick-600">
                      <Icon as={task ? CATEGORY_ICONS[task.category] : Home} size={24} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-lg font-extrabold leading-tight">{name}</span>
                      <span className="flex flex-wrap items-center gap-2 text-sm font-bold uppercase text-wood-600">
                        {task && t(`group.${task.group}` as TranslationKey)}
                        {entry.mine.lastDate && (
                          <span>· {t('history.lastDone', { date: dateFormat.format(parseDateKey(entry.mine.lastDate)) })}</span>
                        )}
                        {streak.days >= STREAK_MIN_DAYS && (
                          <span className="inline-flex items-center gap-1 bg-ember-400 px-1 text-ink shadow-[0_0_0_2px_#2b1a12]">
                            <Icon as={Fire} size={12} className="text-brick-700" />
                            {t('streak.days', { days: streak.days })}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="font-arcade text-sm text-ink" aria-label={t('history.completed', { count: entry.mine.count })}>
                      {t('history.times', { count: entry.mine.count })}
                    </span>
                    <Icon as={ChevronDown} size={24} className={`text-wood-600 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div id={panelId} className="space-y-3 border-t-[3px] border-ink/20 p-3">
                      <p className="text-sm font-extrabold uppercase text-brick-600">{t('history.earned')}</p>
                      <TallyRow id={player} tally={entry.mine} />
                      <TallyRow id={partner} tally={entry.partner} />
                      <ShareBar label={t('history.xpShare')} mine={entry.mine.xp} theirs={entry.partner.xp} me={player} partner={partner} />
                      <ShareBar label={t('history.goldShare')} mine={entry.mine.gold} theirs={entry.partner.gold} me={player} partner={partner} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
