import { Check, Fire, Home, Pencil, Plus, Shirt, ShoppingCart, Sparkles, Undo } from 'pixelarticons/react';
import { useState } from 'react';
import { useGame, type ActionResult } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Completer, Task, TaskCategory, TaskLog } from '../../types';
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

function CompleterLabel({ who }: { who: Completer }) {
  const { t } = useLanguage();
  return <>{who === 'both' ? t('tasks.both') : t(`character.${who}`)}</>;
}

/** Character-select tiles for "Who did it?". */
function CompleterPicker({
  options,
  value,
  onChange,
}: {
  options: Completer[];
  value: Completer;
  onChange: (who: Completer) => void;
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
          </button>
        );
      })}
    </div>
  );
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
  const { t } = useLanguage();
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
      {enabled.length === 0 && <Card>{t('tasks.empty')}</Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {enabled.map((task) => {
          const log = getTodayLog(task.id);
          const done = !!log;
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

      <Modal open={!!pending} onClose={() => setPending(null)} title={t('tasks.who')}>
        <CompleterPicker options={completerOptions} value={completer} onChange={setCompleter} />
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
