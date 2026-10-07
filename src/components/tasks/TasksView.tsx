import { Check, Fire, Home, Pencil, Plus, Search, Shirt, ShoppingCart, Sparkles, Undo } from 'pixelarticons/react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { TASK_GROUPS } from '../../constants/gameRules';
import { TASK_CATEGORIES, useGame, type ActionResult } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, Completer, RewardBreakdown, Task, TaskCategory, TaskLog } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { fuzzyScoreAny } from '../../utils/fuzzy';
import { addDays, localDateKey } from '../../utils/calculations';
import { taskName } from '../../utils/taskNames';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { DEFAULT_PREFS, QuestViewControls, useQuestViewPrefs, type QuestViewPrefs } from './QuestViewControls';
import { RewardBreakdownTable } from './RewardBreakdownTable';
import { StreakBadge } from './StreakBadge';
import { TaskEditorModal } from './TaskEditorModal';
import { useMinuteNow, YesterdaysQuestsBanner } from './YesterdaysQuestsBanner';

type Breakdown = Record<CharacterId, RewardBreakdown | null>;

export const CATEGORY_ICONS: Record<TaskCategory, typeof Home> = {
  cleaning: Sparkles,
  cooking: Fire,
  shopping: ShoppingCart,
  laundry: Shirt,
  general: Home,
};

/** Completed cards are tinted by who did the quest: knight red, mage purple, gold for both. */
const COMPLETED_TONE = { husband: 'knight', wife: 'mage', both: 'coop' } as const;

function CompleterLabel({ who }: { who: Completer }) {
  const { t } = useLanguage();
  return <span className="block max-w-full truncate">{who === 'both' ? t('tasks.both') : <CharacterName id={who} />}</span>;
}

/** Character-select tiles for "Who did it?". */
function CompleterPicker({
  options,
  value,
  onChange,
  previews,
}: {
  options: Completer[];
  value: Completer;
  onChange: (who: Completer) => void;
  /** Live reward per option, summed over recipients, shown under each tile. */
  previews?: Partial<Record<Completer, Breakdown | null>>;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={`mb-5 grid gap-3 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
      role="radiogroup"
      aria-label={t('tasks.who')}
    >
      {options.map((who) => {
        const selected = value === who;
        return (
          <button
            key={who}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(who)}
            className={`px-btn flex-col gap-2 px-1 py-3 ${selected ? 'px-btn-primary -translate-y-1' : ''}`}
          >
            <span className="flex h-[52px] items-end">
              {who === 'both' ? (
                <>
                  <CharacterAvatar id="husband" scale={2} framed={false} />
                  <CharacterAvatar id="wife" scale={2} framed={false} />
                </>
              ) : (
                <CharacterAvatar id={who} scale={3} framed={false} />
              )}
            </span>
            <CompleterLabel who={who} />
            {previews?.[who] && <OptionTotal breakdown={previews[who]!} />}
          </button>
        );
      })}
    </div>
  );
}

/** Compact reward total under a "Who did it?" tile: one of the few spots short enough on space for "G". */
function OptionTotal({ breakdown }: { breakdown: Breakdown }) {
  const parts = Object.values(breakdown).filter((part): part is RewardBreakdown => !!part);
  const xp = Math.round(parts.reduce((sum, part) => sum + part.xp, 0));
  const gold = Math.round(parts.reduce((sum, part) => sum + part.gold, 0));
  const streak = parts.some((part) => part.streakGold > 0);
  return (
    <span className="flex items-center gap-1 font-arcade text-[8px] normal-case leading-tight">
      +{xp}XP {gold}G
      {streak && <Icon as={Fire} size={12} className="text-brick-700" />}
    </span>
  );
}

function sortTasks(
  tasks: Task[],
  prefs: QuestViewPrefs,
  name: (task: Task) => string,
  streakDays: (task: Task) => number,
  locale: string,
): Task[] {
  const byName = (a: Task, b: Task) => name(a).localeCompare(name(b), locale);
  const compare: Record<QuestViewPrefs['sort'], (a: Task, b: Task) => number> = {
    streak: (a, b) => streakDays(b) - streakDays(a) || byName(a, b),
    xp: (a, b) => b.xp - a.xp || byName(a, b),
    gold: (a, b) => b.gold - a.gold || byName(a, b),
    name: byName,
  };
  return [...tasks].sort(compare[prefs.sort]);
}

function ErrorNote({ error }: { error: TranslationKey | null }) {
  const { t } = useLanguage();
  if (!error) return null;
  return (
    <p className="mb-4 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
      {t(error)}
    </p>
  );
}

export function TasksView() {
  const { t, language, locale } = useLanguage();
  const [prefs, setPrefs] = useQuestViewPrefs();
  const [query, setQuery] = useState('');
  const {
    state,
    activeCharacter,
    canPlay,
    canEditSettings,
    completerOptions,
    canManageLog,
    completeTask,
    undoLog,
    reassignLog,
    getTodayLog,
    getStreak,
    previewReward,
    yesterdayOpen,
    yesterdayQuests,
    upsertTask,
    removeTask,
  } = useGame();
  const [pending, setPending] = useState<Task | null>(null);
  // "Yesterday's quests" view: every quest with yesterday's state; unfinished ones can be completed late (no XP,
  // half gold), finished ones are locked.
  const [yesterdayView, setYesterdayView] = useState(false);
  const now = useMinuteNow();
  const graceOpen = yesterdayOpen(now);
  const lateQuests = graceOpen ? yesterdayQuests() : [];
  const showingYesterday = yesterdayView && graceOpen && lateQuests.length > 0;
  const [completer, setCompleter] = useState<Completer>(activeCharacter);
  const [fixing, setFixing] = useState<TaskLog | null>(null);
  const [fixCompleter, setFixCompleter] = useState<Completer>('both');
  const [editing, setEditing] = useState<Task | undefined>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const enabled = state.tasks.filter((task) => task.enabled);
  const yesterdayKey = addDays(localDateKey(now), -1);
  const yesterdayLogs = useMemo(
    () => new Map(state.logs.filter((log) => log.date === yesterdayKey).map((log) => [log.taskId, log])),
    [state.logs, yesterdayKey],
  );
  // The log that marks a quest done in the view being shown (today's, or yesterday's).
  const logFor = useCallback(
    (taskId: string) => (showingYesterday ? yesterdayLogs.get(taskId) : getTodayLog(taskId)),
    [showingYesterday, yesterdayLogs, getTodayLog],
  );
  // Filtered by "Show" and the search, sorted (best matches first while searching), then split into
  // sections (a single untitled section when not grouping).
  const sections = useMemo(() => {
    const searching = query.trim().length > 0;
    // Search both languages' names whatever the app language is.
    const score = (task: Task) => fuzzyScoreAny(query, [taskName(task, 'en'), taskName(task, 'vi')]);
    const shown = enabled.filter((task) => {
      if (searching && score(task) <= 0) return false;
      if (prefs.show === 'all') return true;
      const done = !!logFor(task.id);
      return prefs.show === 'completed' ? done : !done;
    });
    const sortedByPrefs = sortTasks(
      shown,
      prefs,
      (task) => taskName(task, language),
      (task) => getStreak(task.id, activeCharacter).days,
      locale,
    );
    const sorted = searching ? [...sortedByPrefs].sort((a, b) => score(b) - score(a)) : sortedByPrefs;
    if (prefs.groupBy === 'none') return [{ key: 'all', title: null as string | null, tasks: sorted }];
    const keys: string[] = prefs.groupBy === 'group' ? TASK_GROUPS : TASK_CATEGORIES;
    return keys
      .map((key) => ({
        key,
        title: t((prefs.groupBy === 'group' ? `group.${key}` : `category.${key}`) as TranslationKey),
        tasks: sorted.filter((task) => (prefs.groupBy === 'group' ? task.group : task.category) === key),
      }))
      .filter((section) => section.tasks.length > 0);
  }, [enabled, prefs, query, language, locale, getStreak, logFor, activeCharacter, t]);

  const previews = useMemo(() => {
    if (!pending) return undefined;
    const result: Partial<Record<Completer, Breakdown | null>> = {};
    for (const who of completerOptions) result[who] = previewReward(pending.id, who, { late: showingYesterday });
    return result;
  }, [pending, completerOptions, previewReward, showingYesterday]);
  const handle = (result: ActionResult, onOk: () => void) => {
    if (result.ok) {
      setError(null);
      onOk();
    } else {
      setError(result.error);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        action={
          canEditSettings && (
            <Button onClick={() => setCreating(true)}>
              <Icon as={Plus} size={24} />
              {t('tasks.create')}
            </Button>
          )
        }
      />
      {!pending && !fixing && <ErrorNote error={error} />}
      {graceOpen && lateQuests.length > 0 && (
        <YesterdaysQuestsBanner active={showingYesterday} count={lateQuests.length} onToggle={() => {
            // Each view starts from the default sort, grouping and filter.
            setPrefs(DEFAULT_PREFS);
            setYesterdayView((value) => !value);
          }}
        />
      )}
      <label className="relative block">
        <span className="sr-only">{t('tasks.search')}</span>
        <Icon as={Search} size={24} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-wood-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('tasks.searchPlaceholder')}
          className="px-input py-1.5 pl-10"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <QuestViewControls prefs={prefs} onChange={setPrefs} />
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      {enabled.length > 0 && sections.length === 0 && (
        <Card>
          {query.trim()
            ? t('tasks.noMatches', { query: query.trim() })
            : t(prefs.show === 'completed' ? 'tasks.noneCompleted' : 'tasks.allCompleted')}
        </Card>
      )}
      {sections.map((section) => (
        <Fragment key={section.key}>
          {section.title && (
            <h2 className="px-title flex items-center gap-2 text-2xl">
              {section.title}
              <span className="font-arcade text-[10px] text-parchment-300">{section.tasks.length}</span>
            </h2>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {section.tasks.map((task) => {
              const log = logFor(task.id);
              const done = !!log;
              const streaks = (['husband', 'wife'] as CharacterId[]).map((id) => getStreak(task.id, id));
              return (
                <Card key={task.id} tone={log ? COMPLETED_TONE[log.completedBy] : showingYesterday ? 'past' : 'parchment'} className="p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`${done ? 'px-slot-dark text-moss-400' : 'px-slot text-brick-600'} flex h-10 w-10 shrink-0 items-center justify-center`}
                    >
                      <Icon as={done ? Check : CATEGORY_ICONS[task.category]} size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Name and streak chips share the first line; chips drop below only when it's too narrow. */}
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <p className={`min-w-0 text-xl font-extrabold leading-tight [overflow-wrap:anywhere] ${done ? 'text-wood-700 line-through decoration-2' : ''}`}>
                          {taskName(task, language)}
                        </p>
                        {streaks.map((streak) => (
                          <StreakBadge key={streak.characterId} streak={streak} showAvatar />
                        ))}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {/* Late: no XP and half the (base) gold, as the reward preview details. */}
                        <span className={`font-arcade text-[10px] ${showingYesterday ? 'text-wood-600' : 'text-moss-700'}`}>
                          {showingYesterday ? '0XP' : `+${task.xp}XP`}
                        </span>
                        <GoldCounter amount={showingYesterday ? Math.floor(task.gold / 2) : task.gold} />
                        <span className="text-sm font-bold uppercase text-wood-500">
                          {t(`group.short.${task.group}`)} · {t(`category.${task.category}` as TranslationKey)}
                        </span>
                      </div>
                    </div>
                    {canEditSettings && !showingYesterday && (
                      <IconButton icon={Pencil} variant="ghost" align="right" label={t('tasks.edit')} onClick={() => setEditing(task)} />
                    )}
                  </div>
                  {log ? (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-base font-extrabold uppercase text-moss-700">
                        <span className="flex items-end">
                          {log.completedBy === 'both' ? (
                            <>
                              <CharacterAvatar id="husband" scale={1} framed={false} />
                              <CharacterAvatar id="wife" scale={1} framed={false} />
                            </>
                          ) : (
                            <CharacterAvatar id={log.completedBy} scale={1} framed={false} />
                          )}
                        </span>
                        <span className="min-w-0 truncate">
                          {log.completedBy === 'both'
                            ? t('tasks.doneBy', { who: t('tasks.both') })
                            : spliceName(t('tasks.doneBy', { who: NAME_SLOT }), <CharacterName id={log.completedBy} />)}
                        </span>
                      </span>
                      {/* Yesterday's entries are locked: no fixing them. */}
                      {!showingYesterday && canManageLog(log) && (
                        <IconButton
                          icon={Undo}
                          align="right"
                          label={t('tasks.editLog')}
                          onClick={() => {
                            setError(null);
                            setFixCompleter(log.completedBy);
                            setFixing(log);
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <Button
                      className="mt-2.5 w-full"
                      variant="brick"
                      disabled={!canPlay}
                      onClick={() => {
                        setError(null);
                        setCompleter(completerOptions.includes(activeCharacter) ? activeCharacter : completerOptions[0]);
                        setPending(task);
                      }}
                    >
                      {showingYesterday ? t('yesterday.complete') : t('tasks.complete')}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </Fragment>
      ))}

      <Modal open={!!pending} onClose={() => setPending(null)} title={t('tasks.who')}>
        <CompleterPicker options={completerOptions} value={completer} onChange={setCompleter} previews={previews} />
        {previews?.[completer] && <RewardBreakdownTable breakdown={previews[completer]!} />}
        <ErrorNote error={error} />
        <Button
          className="w-full"
          onClick={() => {
            if (!pending) return;
            handle(completeTask(pending.id, completer, { late: showingYesterday }), () => setPending(null));
          }}
        >
          {t('common.confirm')}
        </Button>
      </Modal>

      <Modal open={!!fixing} onClose={() => setFixing(null)} title={t('tasks.editLog')}>
        {fixing && (
          <>
            <p className="mb-4 text-base text-wood-600">{t('tasks.editLogHint')}</p>
            <p className="mb-3 text-base font-extrabold uppercase text-wood-700">{t('tasks.who')}</p>
            <CompleterPicker options={['husband', 'wife', 'both']} value={fixCompleter} onChange={setFixCompleter} />
            <ErrorNote error={error} />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="brick"
                onClick={() => handle(undoLog(fixing.id), () => setFixing(null))}
              >
                <Icon as={Undo} size={24} />
                {t('tasks.undo')}
              </Button>
              <Button
                className="ml-auto"
                disabled={fixCompleter === fixing.completedBy}
                onClick={() => handle(reassignLog(fixing.id, fixCompleter), () => setFixing(null))}
              >
                {t('tasks.save')}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <TaskEditorModal
        key={editing?.id ?? (creating ? 'create' : 'closed')}
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false);
          setEditing(undefined);
        }}
        onSave={(task) => void upsertTask(task)}
        onDelete={
          editing
            ? () => {
                removeTask(editing.id);
                setEditing(undefined);
              }
            : undefined
        }
      />
    </section>
  );
}
