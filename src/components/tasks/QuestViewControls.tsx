import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';

export type QuestSort = 'streak' | 'xp' | 'gold' | 'name';
export type QuestGrouping = 'none' | 'group' | 'category';
export type QuestShow = 'all' | 'incomplete' | 'completed';
export interface QuestViewPrefs {
  sort: QuestSort;
  groupBy: QuestGrouping;
  show: QuestShow;
}

// v2: new defaults (no grouping) and the "Show" filter. Each list starts with its default option.
const STORAGE_KEY = 'chorequest.questView.v2';
const SORTS: QuestSort[] = ['streak', 'xp', 'gold', 'name'];
const GROUPINGS: QuestGrouping[] = ['none', 'group', 'category'];
const SHOWS: QuestShow[] = ['all', 'incomplete', 'completed'];
export const DEFAULT_PREFS: QuestViewPrefs = { sort: SORTS[0], groupBy: GROUPINGS[0], show: SHOWS[0] };

function pick<T extends string>(options: T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function readPrefs(): QuestViewPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<QuestViewPrefs> | null;
    return {
      sort: pick(SORTS, saved?.sort, DEFAULT_PREFS.sort),
      groupBy: pick(GROUPINGS, saved?.groupBy, DEFAULT_PREFS.groupBy),
      show: pick(SHOWS, saved?.show, DEFAULT_PREFS.show),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Sort / group / show choice for the quest board, remembered per device. */
export function useQuestViewPrefs(): [QuestViewPrefs, (next: QuestViewPrefs) => void] {
  const [prefs, setPrefs] = useState<QuestViewPrefs>(readPrefs);
  const update = (next: QuestViewPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: the choice applies for this session only.
    }
  };
  return [prefs, update];
}

function Select<T extends string>({
  label,
  value,
  options,
  optionLabel,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  optionLabel: (option: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-extrabold uppercase text-parchment-100 sm:flex-row sm:items-center sm:gap-2 sm:text-base">
      <span className="px-subtitle shrink-0">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="px-input w-full min-w-0 px-1.5 py-1 text-sm sm:w-auto sm:px-3 sm:text-base">
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Three compact dropdowns: one row of three on phones (label above), inline on wider screens. */
export function QuestViewControls({ prefs, onChange }: { prefs: QuestViewPrefs; onChange: (next: QuestViewPrefs) => void }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:gap-x-6">
      <Select
        label={t('tasks.sortBy')}
        value={prefs.sort}
        options={SORTS}
        optionLabel={(sort) => t(`tasks.sort.${sort}` as TranslationKey)}
        onChange={(sort) => onChange({ ...prefs, sort })}
      />
      <Select
        label={t('tasks.groupBy')}
        value={prefs.groupBy}
        options={GROUPINGS}
        optionLabel={(grouping) => t(`tasks.groupBy.${grouping}` as TranslationKey)}
        onChange={(groupBy) => onChange({ ...prefs, groupBy })}
      />
      <Select
        label={t('tasks.showBy')}
        value={prefs.show}
        options={SHOWS}
        optionLabel={(show) => t(`tasks.show.${show}` as TranslationKey)}
        onChange={(show) => onChange({ ...prefs, show })}
      />
    </div>
  );
}
