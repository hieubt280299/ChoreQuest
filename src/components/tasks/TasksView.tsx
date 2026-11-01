import { Check, ChevronDown, Filter, Pencil, Plus, Search, Undo } from 'pixelarticons/react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { intensityApplies, TASK_GROUPS } from '../../constants/gameRules';
import { TASK_CATEGORIES, useGame, type ActionResult } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Completer, Task, TaskIntensity, TaskLog } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { fuzzyScoreAny } from '../../utils/fuzzy';
import { addDays, localDateKey } from '../../utils/calculations';
import { taskName } from '../../utils/taskNames';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { TEXT_ACTION } from '../ui/textAction';
import { DEFAULT_PREFS, QuestViewControls, useQuestViewPrefs, type QuestViewPrefs } from './QuestViewControls';
import { QuestToast } from './QuestToast';
import { TaskCard } from './TaskCard';
import { TaskEditorModal } from './TaskEditorModal';
import { CompleterPicker, WhoDidItModal } from './WhoDidItModal';
import { useMinuteNow, YesterdaysQuestsBanner } from './YesterdaysQuestsBanner';

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
    yesterdayOpen,
    yesterdayQuests,
    upsertTask,
    removeTask,
    clearReward,
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [showDone, setShowDone] = useState(false);
  // Edit mode swaps each row's action for its editor and brings out "New quest".
  const [editMode, setEditMode] = useState(false);

  // The quest toast belongs to this page: leaving it ends the notice (level-up cards don't depend on it).
  useEffect(() => clearReward, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enabled = state.tasks.filter((task) => task.enabled);
  const doneToday = enabled.filter((task) => getTodayLog(task.id));
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
  const searching = query.trim().length > 0;
  // By default finished quests leave the list for the collapsed "Done today" section. Searching, filtering by
  // "Show", editing and yesterday's view all keep them in place.
  const splitDone = prefs.show === 'all' && !searching && !editMode && !showingYesterday;
  // Filtered by "Show" and the search, sorted (best matches first while searching), then split into
  // sections (a single untitled section when not grouping).
  const sections = useMemo(() => {
    // Search both languages' names whatever the app language is.
    const score = (task: Task) => fuzzyScoreAny(query, [taskName(task, 'en'), taskName(task, 'vi')]);
    const shown = enabled.filter((task) => {
      if (searching && score(task) <= 0) return false;
      const done = !!logFor(task.id);
      if (splitDone) return !done;
      if (prefs.show === 'all') return true;
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
    if (prefs.groupBy === 'none') return sorted.length > 0 ? [{ key: 'all', title: null as string | null, tasks: sorted }] : [];
    const keys: string[] = prefs.groupBy === 'group' ? TASK_GROUPS : TASK_CATEGORIES;
    return keys
      .map((key) => ({
        key,
        title: t((prefs.groupBy === 'group' ? `group.${key}` : `category.${key}`) as TranslationKey),
        tasks: sorted.filter((task) => (prefs.groupBy === 'group' ? task.group : task.category) === key),
      }))
      .filter((section) => section.tasks.length > 0);
  }, [enabled, prefs, query, searching, splitDone, language, locale, getStreak, logFor, activeCharacter, t]);

  // A failed one-tap completion has no dialog to show its error in, so it shows like a toast and clears itself.
  useEffect(() => {
    if (!error || pending || fixing) return;
    const id = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(id);
  }, [error, pending, fixing]);

  const handle = useCallback((result: ActionResult, onOk: () => void) => {
    if (result.ok) {
      setError(null);
      onOk();
    } else {
      setError(result.error);
    }
  }, []);

  // Stable handlers, so the memoized quest rows don't all re-render on every change.
  const startCompleting = useCallback(
    (task: Task) => {
      setError(null);
      const who = completerOptions.includes(activeCharacter) ? activeCharacter : completerOptions[0];
      // One tap credits this player; the toast offers Undo and Change. Only effort and late quests need a dialog.
      if (!showingYesterday && !intensityApplies(task)) {
        handle(completeTask(task.id, who), () => undefined);
        return;
      }
      setCompleter(who);
      setPending(task);
    },
    [completerOptions, activeCharacter, showingYesterday, completeTask, handle],
  );
  const startFixing = useCallback((log: TaskLog) => {
    setError(null);
    setFixCompleter(log.completedBy);
    setFixing(log);
  }, []);

  const filtered = prefs.sort !== DEFAULT_PREFS.sort || prefs.groupBy !== DEFAULT_PREFS.groupBy || prefs.show !== DEFAULT_PREFS.show;
  const questRow = (task: Task) => {
    const log = logFor(task.id);
    return (
      <TaskCard
        key={task.id}
        task={task}
        log={log}
        yesterday={showingYesterday}
        streaks={[getStreak(task.id, 'husband'), getStreak(task.id, 'wife')]}
        editing={editMode && canEditSettings && !showingYesterday}
        canPlay={canPlay}
        canFix={!!log && canManageLog(log)}
        onEdit={setEditing}
        onComplete={startCompleting}
        onFix={startFixing}
      />
    );
  };

  return (
    <section className="space-y-4">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.progress', { done: doneToday.length, total: enabled.length })}
        action={
          canEditSettings && (
            <IconButton
              icon={editMode ? Check : Pencil}
              variant={editMode ? 'primary' : 'secondary'}
              align="right"
              label={t(editMode ? 'tasks.editModeDone' : 'tasks.editMode')}
              aria-pressed={editMode}
              onClick={() => setEditMode((value) => !value)}
            />
          )
        }
      />
      {!pending && !fixing && error && (
        <div className="fixed inset-x-4 bottom-24 z-[55] mx-auto max-w-md md:bottom-6">
          <ErrorNote error={error} />
        </div>
      )}
      {graceOpen && lateQuests.length > 0 && (
        <YesterdaysQuestsBanner active={showingYesterday} count={lateQuests.length} onToggle={() => {
            // Each view starts from the default sort, grouping and filter.
            setPrefs(DEFAULT_PREFS);
            setYesterdayView((value) => !value);
          }}
        />
      )}
      {editMode && canEditSettings && (
        <Button className="w-full" onClick={() => setCreating(true)}>
          <Icon as={Plus} size={24} />
          {t('tasks.create')}
        </Button>
      )}
      <div className="flex items-center gap-3">
        <label className="relative block min-w-0 flex-1">
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
        <span className="relative shrink-0">
          <IconButton icon={Filter} align="right" label={t('tasks.filter')} aria-haspopup="dialog" onClick={() => setFilterOpen(true)} />
          {filtered && <span aria-hidden className="absolute -right-1 -top-1 h-2.5 w-2.5 bg-brick-500 shadow-[0_0_0_2px_#2b1a12]" />}
        </span>
      </div>
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      {enabled.length > 0 && sections.length === 0 && (
        <Card>
          {searching
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
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{section.tasks.map(questRow)}</div>
        </Fragment>
      ))}
      {splitDone && doneToday.length > 0 && (
        <>
          <Button variant="secondary" className="w-full" aria-expanded={showDone} onClick={() => setShowDone((value) => !value)}>
            <Icon as={ChevronDown} size={24} className={showDone ? 'rotate-180' : ''} />
            {t('tasks.doneSection', { count: doneToday.length })}
          </Button>
          {showDone && <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{doneToday.map(questRow)}</div>}
        </>
      )}

      <QuestToast onChange={startFixing} />

      <Modal open={filterOpen} onClose={() => setFilterOpen(false)} title={t('tasks.filter')}>
        <QuestViewControls prefs={prefs} onChange={setPrefs} />
        {filtered && (
          <div className="mt-2">
            <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={() => setPrefs(DEFAULT_PREFS)}>
              {t('tasks.filterReset')}
            </button>
          </div>
        )}
      </Modal>

      <WhoDidItModal
        task={pending}
        late={showingYesterday}
        initialCompleter={completer}
        error={pending ? error : null}
        onClose={() => setPending(null)}
        onConfirm={(who: Completer, intensity: TaskIntensity) => {
          if (!pending) return;
          handle(completeTask(pending.id, who, { late: showingYesterday, intensity }), () => setPending(null));
        }}
      />

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
