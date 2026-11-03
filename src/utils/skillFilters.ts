import type { SkillDefinition, TaskCategory } from '../types';

/** Filter chips on the Skills page: a quest category, skills tied to task size (Quick / Moderate / Heavy), or everything else. */
export type SkillFilter = 'all' | Exclude<TaskCategory, 'general'> | 'size' | 'general';

export const SKILL_FILTERS: SkillFilter[] = ['all', 'cleaning', 'cooking', 'laundry', 'shopping', 'size', 'general'];

export function matchesSkillFilter(skill: SkillDefinition, filter: SkillFilter): boolean {
  if (filter === 'all') return true;
  const { kind, category } = skill.effect;
  if (kind === 'category') return category === filter;
  return filter === (kind === 'group' ? 'size' : 'general');
}

/**
 * The filters worth showing for these (unlearned) skills: All, plus each one that still has a skill in it. Just All
 * means there's nothing to narrow down, so no chips at all.
 */
export function availableSkillFilters(skills: SkillDefinition[]): SkillFilter[] {
  const filters = SKILL_FILTERS.filter((filter) => filter === 'all' || skills.some((skill) => matchesSkillFilter(skill, filter)));
  return filters.length > 1 ? filters : [];
}
