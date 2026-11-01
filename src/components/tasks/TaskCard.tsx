import { Check, Fire, Home, Pencil, Shirt, ShoppingCart, Sparkles, Undo } from 'pixelarticons/react';
import { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { Streak, Task, TaskCategory, TaskLog } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { StreakBadge } from './StreakBadge';

export const CATEGORY_ICONS: Record<TaskCategory, typeof Home> = {
  cleaning: Sparkles,
  cooking: Fire,
  shopping: ShoppingCart,
  laundry: Shirt,
  general: Home,
};

/** Completed rows keep a bar in the colour of who did the quest: knight red, mage purple, gold for both. */
const DONE_BAR = { husband: 'bg-brick-500', wife: 'bg-plum-500', both: 'bg-ember-500' } as const;

interface TaskCardProps {
  task: Task;
  /** The entry that marks it done in the view shown (today's, or yesterday's). */
  log?: TaskLog;
  /** "Yesterday's quests": 0 XP and half gold, unfinished rows look faded, finished ones are locked. */
  yesterday: boolean;
  /** Each player's live streak on this quest. */
  streaks: [Streak, Streak];
  /** Edit mode: the row's action opens the quest editor instead. */
  editing: boolean;
  canPlay: boolean;
  /** This player may fix (undo / re-assign) the entry. */
  canFix: boolean;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onFix: (log: TaskLog) => void;
}

const sameStreak = (a: Streak, b: Streak) => a.days === b.days && a.bonusGold === b.bonusGold && a.doneToday === b.doneToday;

/**
 * One quest on the board, as a compact row with its action on the right. Memoized: completing or fixing a quest
 * re-renders only the rows whose quest, entry or streaks changed, not the whole list (streaks are rebuilt each
 * render, so they're compared by value).
 */
export const TaskCard = memo(
  function TaskCard({ task, log, yesterday, streaks, editing, canPlay, canFix, onEdit, onComplete, onFix }: TaskCardProps) {
    const { t, language } = useLanguage();
    const done = !!log;
    return (
      <Card tone={log ? 'done' : yesterday ? 'past' : 'parchment'} className="relative flex items-center gap-2.5 !py-2 !pl-3 !pr-2">
        {log && <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${DONE_BAR[log.completedBy]}`} />}
        <span className={`${done ? 'px-slot-dark text-moss-400' : 'px-slot text-brick-600'} flex h-10 w-10 shrink-0 items-center justify-center`}>
          <Icon as={done ? Check : CATEGORY_ICONS[task.category]} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          {/* Name and streak chips share the first line; chips drop below only when it's too narrow. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className={`min-w-0 text-lg font-extrabold leading-tight [overflow-wrap:anywhere] ${done ? 'text-wood-700 line-through decoration-2' : ''}`}>
              {taskName(task, language)}
            </p>
            {streaks.map((streak) => (
              <StreakBadge key={streak.characterId} streak={streak} showAvatar />
            ))}
          </div>
          {log ? (
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-bold uppercase text-wood-700">
              <span className="flex shrink-0 items-end">
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
                {/* Effort picked for an intensity-enabled quest (Normal isn't mentioned). */}
                {log.intensity && ` · ${t(`intensity.${log.intensity}` as TranslationKey)}`}
              </span>
            </p>
          ) : (
            <div className="mt-0.5 flex min-w-0 items-center gap-x-2.5">
              {/* Late: no XP and half the (base) gold, as the reward preview details. */}
              <span className={`shrink-0 font-arcade text-[10px] ${yesterday ? 'text-wood-600' : 'text-moss-700'}`}>{yesterday ? '0XP' : `+${task.xp}XP`}</span>
              <GoldCounter amount={yesterday ? Math.floor(task.gold / 2) : task.gold} />
              <span className="min-w-0 truncate text-sm font-bold uppercase text-wood-600">
                {t(`group.short.${task.group}`)} · {t(`category.${task.category}` as TranslationKey)}
              </span>
            </div>
          )}
        </div>
        {editing ? (
          <IconButton icon={Pencil} align="right" label={t('tasks.edit')} onClick={() => onEdit(task)} />
        ) : log ? (
          // Yesterday's entries are locked: no fixing them.
          !yesterday && canFix && <IconButton icon={Undo} align="right" label={t('tasks.editLog')} onClick={() => onFix(log)} />
        ) : (
          <IconButton
            icon={Check}
            variant="moss"
            align="right"
            label={yesterday ? t('yesterday.complete') : t('tasks.complete')}
            disabled={!canPlay}
            onClick={() => onComplete(task)}
          />
        )}
      </Card>
    );
  },
  (prev, next) =>
    prev.task === next.task &&
    prev.log === next.log &&
    prev.yesterday === next.yesterday &&
    prev.editing === next.editing &&
    prev.canPlay === next.canPlay &&
    prev.canFix === next.canFix &&
    prev.onEdit === next.onEdit &&
    prev.onComplete === next.onComplete &&
    prev.onFix === next.onFix &&
    sameStreak(prev.streaks[0], next.streaks[0]) &&
    sameStreak(prev.streaks[1], next.streaks[1]),
);
