import { Check, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Completer, Task } from '../../types';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GoldCounter } from '../ui/GoldCounter';
import { Modal } from '../ui/Modal';
import { TaskEditorModal } from './TaskEditorModal';

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
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-stone-800">{t('tasks.title')}</h1>
          <p className="text-stone-500">{t('tasks.subtitle')}</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          {t('tasks.create')}
        </Button>
      </div>
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      <div className="grid gap-3">
        {enabled.map((task) => {
          const done = isTaskDoneToday(task.id);
          return (
            <Card key={task.id} className={done ? 'opacity-70' : ''}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="font-bold text-stone-800">{taskLabel(task.nameKey, t)}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {t(`category.${task.category}` as TranslationKey)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-emerald-700">+{task.xp} XP</span>
                  <GoldCounter amount={task.gold} />
                  <button
                    type="button"
                    className="rounded-full p-2 text-stone-400 hover:bg-white"
                    onClick={() => setEditing(task)}
                    aria-label={t('tasks.edit')}
                  >
                    <Pencil size={16} />
                  </button>
                  <Button
                    disabled={done}
                    variant={done ? 'secondary' : 'rose'}
                    onClick={() => {
                      setCompleter(state.activeCharacter);
                      setPending(task);
                    }}
                  >
                    {done ? <Check size={16} /> : null}
                    {done ? t('tasks.alreadyDone') : t('tasks.complete')}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} title={t('tasks.who')}>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(['husband', 'wife', 'both'] as Completer[]).map((who) => (
            <button
              key={who}
              type="button"
              onClick={() => setCompleter(who)}
              className={`rounded-2xl px-3 py-3 text-sm font-bold ${
                completer === who ? 'bg-amber-700 text-white' : 'bg-white text-stone-600'
              }`}
            >
              {who === 'both' ? t('tasks.both') : t(`character.${who}`)}
            </button>
          ))}
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
