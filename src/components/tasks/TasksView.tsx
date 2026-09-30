import { Check, Fire, Home, Pencil, Plus, Shirt, ShoppingCart, Sparkles } from 'pixelarticons/react';
import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Completer, Task, TaskCategory } from '../../types';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { TaskEditorModal } from './TaskEditorModal';

export const CATEGORY_ICONS: Record<TaskCategory, typeof Home> = {
  cleaning: Sparkles,
  cooking: Fire,
  shopping: ShoppingCart,
  laundry: Shirt,
  general: Home,
};

function taskLabel(nameKey: string, t: (key: TranslationKey) => string) {
  return nameKey in translations.en ? t(nameKey as TranslationKey) : nameKey;
}

export function TasksView() {
  const { t } = useLanguage();
  const { state, completeTask, isTaskDoneToday, upsertTask, removeTask } = useGame();
  const [pending, setPending] = useState<Task | null>(null);
  const [completer, setCompleter] = useState<Completer>(state.activeCharacter);
  const [editing, setEditing] = useState<Task | undefined>();
  const [creating, setCreating] = useState(false);

  const enabled = state.tasks.filter((task) => task.enabled);

  return (
    <section className="space-y-6">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        action={
          <Button onClick={() => setCreating(true)}>
            <Icon as={Plus} size={24} />
            {t('tasks.create')}
          </Button>
        }
      />
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {enabled.map((task) => {
          const done = isTaskDoneToday(task.id);
          return (
            <Card key={task.id} tone={done ? 'moss' : 'parchment'} className="p-4">
              <div className="flex items-center gap-3">
                <span className={`${done ? 'px-slot-dark text-moss-400' : 'px-slot text-brick-600'} flex h-12 w-12 items-center justify-center`}>
                  <Icon as={done ? Check : CATEGORY_ICONS[task.category]} size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xl font-extrabold leading-tight ${done ? 'text-moss-700 line-through decoration-2' : ''}`}>
                    {taskLabel(task.nameKey, t)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="font-arcade text-[10px] text-moss-700">+{task.xp}XP</span>
                    <GoldCounter amount={task.gold} />
                    <span className="text-sm font-bold uppercase text-wood-500">
                      {t(`category.${task.category}` as TranslationKey)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-focus p-1 text-wood-500 hover:text-brick-600"
                  onClick={() => setEditing(task)}
                  aria-label={t('tasks.edit')}
                >
                  <Icon as={Pencil} size={24} />
                </button>
              </div>
              <Button
                className="mt-3 w-full"
                disabled={done}
                variant={done ? 'moss' : 'brick'}
                onClick={() => {
                  setCompleter(state.activeCharacter);
                  setPending(task);
                }}
              >
                {done && <Icon as={Check} size={24} />}
                {done ? t('tasks.alreadyDone') : t('tasks.complete')}
              </Button>
            </Card>
          );
        })}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} title={t('tasks.who')}>
        <div className="mb-5 grid grid-cols-3 gap-3" role="radiogroup" aria-label={t('tasks.who')}>
          {(['husband', 'wife', 'both'] as Completer[]).map((who) => {
            const selected = completer === who;
            return (
              <button
                key={who}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCompleter(who)}
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
                {who === 'both' ? t('tasks.both') : t(`character.${who}`)}
              </button>
            );
          })}
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!pending) return;
            const taskId = pending.id;
            setPending(null);
            completeTask(taskId, completer);
          }}
        >
          {t('common.confirm')}
        </Button>
      </Modal>

      <TaskEditorModal
        key={editing?.id ?? (creating ? 'create' : 'closed')}
        open={creating || !!editing}
        initial={editing}
        onClose={() => {
          setCreating(false);
          setEditing(undefined);
        }}
        onSave={upsertTask}
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
