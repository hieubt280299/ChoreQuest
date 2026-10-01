import type { LanguageCode, Task } from '../types';
import { translations } from './i18n';

// Quest names: players type natural-language names per language (`task.names`); the `nameKey`
// code is generated behind the scenes. Built-in quests fall back to the app translations, and
// older custom quests stored their only name directly in `nameKey`.

type NamedTask = Pick<Task, 'nameKey' | 'names'>;

const LANGUAGES: LanguageCode[] = ['en', 'vi'];

function builtInName(nameKey: string, language: LanguageCode): string | undefined {
  return (translations[language] as Partial<Record<string, string>>)[nameKey];
}

/** Display name in `language`, falling back to the other language, then the code itself. */
export function taskName(task: NamedTask, language: LanguageCode): string {
  const other: LanguageCode = language === 'en' ? 'vi' : 'en';
  return (
    task.names?.[language]?.trim() ||
    builtInName(task.nameKey, language) ||
    task.names?.[other]?.trim() ||
    builtInName(task.nameKey, other) ||
    task.nameKey
  );
}

/** Starting values for the editor's EN/VI name fields. */
export function editableTaskNames(task?: NamedTask): Record<LanguageCode, string> {
  if (!task) return { en: '', vi: '' };
  const isCode = task.nameKey.startsWith('task.');
  const pick = (language: LanguageCode) =>
    task.names?.[language] ?? builtInName(task.nameKey, language) ?? (isCode ? '' : task.nameKey);
  return { en: pick('en'), vi: pick('vi') };
}

/**
 * Trims both names and fills a blank one with the other, so every quest has a name in both
 * languages until players translate it themselves. Returns null when both are blank.
 */
export function completeTaskNames(names: Record<LanguageCode, string>): Record<LanguageCode, string> | null {
  const en = names.en.trim();
  const vi = names.vi.trim();
  if (!en && !vi) return null;
  return { en: en || vi, vi: vi || en };
}

/** "Water the plants" -> "task.waterThePlants" (accents removed), made unique among `taken`. */
export function generateTaskKey(name: string, taken: Iterable<string>): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const camel = words.map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1))).join('') || 'quest';
  const used = new Set(taken);
  LANGUAGES.forEach((language) => Object.keys(translations[language]).forEach((key) => used.add(key)));
  const base = `task.${camel.slice(0, 40)}`;
  let key = base;
  for (let suffix = 2; used.has(key); suffix += 1) key = `${base}${suffix}`;
  return key;
}
