import { useState } from 'react';
import { TASK_GROUPS } from '../../constants/gameRules';
import { TASK_CATEGORIES, useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { LanguageCode, Task, TaskCategory, TaskGroup } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { completeTaskNames, editableTaskNames, generateTaskKey } from '../../utils/taskNames';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const NAME_FIELDS: { language: LanguageCode; label: TranslationKey }[] = [
  { language: 'en', label: 'tasks.nameEn' },
  { language: 'vi', label: 'tasks.nameVi' },
];

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
  const { t, language } = useLanguage();
  const { state } = useGame();
  const [names, setNames] = useState(() => editableTaskNames(initial));
  const [nameError, setNameError] = useState(false);
  const [xp, setXp] = useState(initial?.xp ?? 20);
  const [gold, setGold] = useState(initial?.gold ?? 15);
  const [category, setCategory] = useState<TaskCategory>(initial?.category ?? 'general');
  const [group, setGroup] = useState<TaskGroup>(initial?.group ?? 'main');
  // Show the field for the current language first.
  const fields = [...NAME_FIELDS].sort((a, b) => Number(b.language === language) - Number(a.language === language));

  return (
    <Modal open={open} onClose={onClose} title={initial ? t('tasks.edit') : t('tasks.create')}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const complete = completeTaskNames(names);
          if (!complete) {
            setNameError(true);
            return;
          }
          // Built-in and existing quests keep their code; new quests get one generated from the name.
          const nameKey =
            initial?.nameKey ??
            generateTaskKey(complete.en, state.tasks.map((task) => task.nameKey));
          onSave({
            id: initial?.id ?? `custom-${Date.now()}`,
            nameKey,
            names: complete,
            xp: Number(xp),
            gold: Number(gold),
            category,
            group,
            enabled: initial?.enabled ?? true,
          });
          onClose();
        }}
      >
        {fields.map(({ language: fieldLanguage, label }) => (
          <label key={fieldLanguage} className="block text-base font-extrabold uppercase tracking-wide text-wood-700">
            {t(label)}
            <input
              lang={fieldLanguage}
              value={names[fieldLanguage]}
              onChange={(event) => {
                setNames((prev) => ({ ...prev, [fieldLanguage]: event.target.value }));
                setNameError(false);
              }}
              aria-invalid={nameError}
              aria-describedby="task-name-hint"
              className="px-input mt-2 normal-case tracking-normal"
            />
          </label>
        ))}
        <p
          id="task-name-hint"
          role={nameError ? 'alert' : undefined}
          className={`text-base ${nameError ? 'font-bold text-brick-600' : 'text-wood-600'}`}
        >
          {nameError ? t('tasks.error.name') : t('tasks.nameHint')}
        </p>
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
          {t('tasks.group')}
          <select value={group} onChange={(event) => setGroup(event.target.value as TaskGroup)} className="px-input mt-2">
            {TASK_GROUPS.map((item) => (
              <option key={item} value={item}>
                {t(`group.${item}`)}
              </option>
            ))}
          </select>
        </label>
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
