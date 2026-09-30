import { useState } from 'react';
import { TASK_CATEGORIES } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { Task, TaskCategory } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function TaskEditorModal({
  open,
  onClose,
  initial,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Task;
  onSave: (task: Task) => void;
  onDelete?: () => void;
}) {
  const { t } = useLanguage();
  const [nameKey, setNameKey] = useState(initial?.nameKey ?? '');
  const [xp, setXp] = useState(initial?.xp ?? 20);
  const [gold, setGold] = useState(initial?.gold ?? 15);
  const [category, setCategory] = useState<TaskCategory>(initial?.category ?? 'general');

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('tasks.edit') : t('tasks.create')}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const id = initial?.id ?? `custom-${Date.now()}`;
          onSave({
            id,
            nameKey: nameKey.trim() || id,
            xp: Number(xp),
            gold: Number(gold),
            category,
            enabled: initial?.enabled ?? true,
          });
          onClose();
        }}
      >
        <label className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
          {t('tasks.name')}
          <input
            value={nameKey}
            onChange={(event) => setNameKey(event.target.value)}
            className="px-input mt-2"
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
            {t('tasks.xp')}
            <input
              type="number"
              min={1}
              value={xp}
              onChange={(event) => setXp(Number(event.target.value))}
              className="px-input mt-2"
            />
          </label>
          <label className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
            {t('tasks.gold')}
            <input
              type="number"
              min={0}
              value={gold}
              onChange={(event) => setGold(Number(event.target.value))}
              className="px-input mt-2"
            />
          </label>
        </div>
        <label className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
          {t('tasks.category')}
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as TaskCategory)}
            className="px-input mt-2"
          >
            {TASK_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {t(`category.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3 pt-3">
          {onDelete && (
            <Button type="button" variant="ghost" className="text-brick-600" onClick={onDelete}>
              {t('tasks.delete')}
            </Button>
          )}
          <Button type="button" variant="secondary" className="ml-auto" onClick={onClose}>
            {t('tasks.cancel')}
          </Button>
          <Button type="submit">{t('tasks.save')}</Button>
        </div>
      </form>
    </Modal>
  );
}
