import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';

export type QuestSort = 'streak' | 'xp' | 'gold' | 'name';
export type QuestGrouping = 'group' | 'category' | 'none';
export interface QuestViewPrefs {
  sort: QuestSort;
  groupBy: QuestGrouping;
}

const STORAGE_KEY = 'chorequest.questView';
const SORTS: QuestSort[] = ['streak', 'xp', 'gold', 'name'];
const GROUPINGS: QuestGrouping[] = ['group', 'category', 'none'];
const DEFAULT_PREFS: QuestViewPrefs = { sort: 'streak', groupBy: 'group' };

function readPrefs(): QuestViewPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<QuestViewPrefs> | null;
    return {
      sort: SORTS.includes(saved?.sort as QuestSort) ? (saved!.sort as QuestSort) : DEFAULT_PREFS.sort,
      groupBy: GROUPINGS.includes(saved?.groupBy as QuestGrouping) ? (saved!.groupBy as QuestGrouping) : DEFAULT_PREFS.groupBy,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Sort/group choice for the quest board, remembered per device. */
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

export function QuestViewControls({ prefs, onChange }: { prefs: QuestViewPrefs; onChange: (next: QuestViewPrefs) => void }) {
  const { t } = useLanguage();
  const labelClass = 'flex min-w-0 flex-1 items-center gap-2 text-base font-extrabold uppercase text-parchment-100 sm:flex-none';

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      <label className={labelClass}>
        <span className="px-subtitle shrink-0">{t('tasks.sortBy')}</span>
        <select
          value={prefs.sort}
          onChange={(event) => onChange({ ...prefs, sort: event.target.value as QuestSort })}
          className="px-input w-full py-1 text-base sm:w-auto"
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {t(`tasks.sort.${sort}` as TranslationKey)}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        <span className="px-subtitle shrink-0">{t('tasks.groupBy')}</span>
        <select
          value={prefs.groupBy}
          onChange={(event) => onChange({ ...prefs, groupBy: event.target.value as QuestGrouping })}
          className="px-input w-full py-1 text-base sm:w-auto"
        >
          {GROUPINGS.map((grouping) => (
            <option key={grouping} value={grouping}>
              {t(`tasks.groupBy.${grouping}` as TranslationKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
