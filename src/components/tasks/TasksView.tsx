import { Check, Fire, Home, Pencil, Plus, Shirt, ShoppingCart, Sparkles, Undo } from 'pixelarticons/react';
import { Fragment, useMemo, useState } from 'react';
import { TASK_GROUPS } from '../../constants/gameRules';
import { TASK_CATEGORIES, useGame, type ActionResult } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, Completer, RewardBreakdown, Task, TaskCategory, TaskLog } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { QuestViewControls, useQuestViewPrefs, type QuestViewPrefs } from './QuestViewControls';
import { RewardBreakdownTable } from './RewardBreakdownTable';
import { StreakBadge } from './StreakBadge';
import { TaskEditorModal } from './TaskEditorModal';

type Breakdown = Record<CharacterId, RewardBreakdown | null>;

export const CATEGORY_ICONS: Record<TaskCategory, typeof Home> = {
  cleaning: Sparkles,
  cooking: Fire,
  shopping: ShoppingCart,
  laundry: Shirt,
  general: Home,
};

function CompleterLabel({ who }: { who: Completer }) {
  const { t } = useLanguage();
  return <>{who === 'both' ? t('tasks.both') : t(`character.${who}`)}</>;
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
    upsertTask,
    removeTask,
  } = useGame();
  const [pending, setPending] = useState<Task | null>(null);
  const [completer, setCompleter] = useState<Completer>(activeCharacter);
  const [fixing, setFixing] = useState<TaskLog | null>(null);
  const [fixCompleter, setFixCompleter] = useState<Completer>('both');
  const [editing, setEditing] = useState<Task | undefined>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const enabled = state.tasks.filter((task) => task.enabled);
  // Sorted, then split into sections (a single untitled section when not grouping).
  const sections = useMemo(() => {
    const sorted = sortTasks(
      enabled,
      prefs,
      (task) => taskName(task, language),
      (task) => getStreak(task.id, activeCharacter).days,
      locale,
    );
    if (prefs.groupBy === 'none') return [{ key: 'all', title: null as string | null, tasks: sorted }];
    const keys: string[] = prefs.groupBy === 'group' ? TASK_GROUPS : TASK_CATEGORIES;
    return keys
      .map((key) => ({
        key,
        title: t((prefs.groupBy === 'group' ? `group.${key}` : `category.${key}`) as TranslationKey),
        tasks: sorted.filter((task) => (prefs.groupBy === 'group' ? task.group : task.category) === key),
      }))
      .filter((section) => section.tasks.length > 0);
  }, [enabled, prefs, language, locale, getStreak, activeCharacter, t]);

  const previews = useMemo(() => {
    if (!pending) return undefined;
    const result: Partial<Record<Completer, Breakdown | null>> = {};
    for (const who of completerOptions) result[who] = previewReward(pending.id, who);
    return result;
  }, [pending, completerOptions, previewReward]);
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
      <QuestViewControls prefs={prefs} onChange={setPrefs} />
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      {sections.map((section) => (
        <Fragment key={section.key}>
          {section.title && (
            <h2 className="px-title flex items-center gap-2 text-2xl">
              {section.title}
              <span className="font-arcade text-[10px] text-parchment-300">{section.tasks.length}</span>
            </h2>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            {section.tasks.map((task) => {
              const log = getTodayLog(task.id);
              const done = !!log;
              const streaks = (['husband', 'wife'] as CharacterId[]).map((id) => getStreak(task.id, id));
              return (
                <Card key={task.id} tone={done ? 'moss' : 'parchment'} className="p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`${done ? 'px-slot-dark text-moss-400' : 'px-slot text-brick-600'} flex h-12 w-12 items-center justify-center`}
                    >
                      <Icon as={done ? Check : CATEGORY_ICONS[task.category]} size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xl font-extrabold leading-tight ${done ? 'text-moss-700 line-through decoration-2' : ''}`}>
                        {taskName(task, language)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <span className="font-arcade text-[10px] text-moss-700">+{task.xp}XP</span>
                        <GoldCounter amount={task.gold} />
                        <span className="text-sm font-bold uppercase text-wood-500">
                          {t(`group.${task.group}`)} · {t(`category.${task.category}` as TranslationKey)}
                        </span>
                      </div>
                      {streaks.some((streak) => streak.days >= 2) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {streaks.map((streak) => (
                            <StreakBadge key={streak.characterId} streak={streak} showAvatar />
                          ))}
                        </div>
                      )}
                    </div>
                    {canEditSettings && (
                      <button
                        type="button"
                        className="px-focus p-1 text-wood-500 hover:text-brick-600"
                        onClick={() => setEditing(task)}
                        aria-label={t('tasks.edit')}
                      >
                        <Icon as={Pencil} size={24} />
                      </button>
                    )}
                  </div>
                  {log ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-base font-extrabold uppercase text-moss-700">
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
                        {t('tasks.doneBy', {
                          who: log.completedBy === 'both' ? t('tasks.both') : t(`character.${log.completedBy}`),
                        })}
                      </span>
                      {canManageLog(log) && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setError(null);
                            setFixCompleter(log.completedBy);
                            setFixing(log);
                          }}
                        >
                          <Icon as={Pencil} size={24} />
                          {t('tasks.editLog')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      className="mt-3 w-full"
                      variant="brick"
                      disabled={!canPlay}
                      onClick={() => {
                        setError(null);
                        setCompleter(completerOptions.includes(activeCharacter) ? activeCharacter : completerOptions[0]);
                        setPending(task);
                      }}
                    >
                      {t('tasks.complete')}
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
            handle(completeTask(pending.id, completer), () => setPending(null));
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
