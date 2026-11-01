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
    <label className="block text-base font-extrabold uppercase text-wood-700">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className="px-input mt-2">
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The sort, group and show dropdowns, in the quest board's Filter dialog. */
export function QuestViewControls({ prefs, onChange }: { prefs: QuestViewPrefs; onChange: (next: QuestViewPrefs) => void }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
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
