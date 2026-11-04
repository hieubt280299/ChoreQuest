import type { SkillDefinition, TaskCategory } from '../types';

/** Filter chips on the Skills page: a quest category, skills tied to task size (Quick / Moderate / Heavy), or everything else. */
export type SkillFilter = 'all' | Exclude<TaskCategory, 'general'> | 'size' | 'general';

export const SKILL_FILTERS: SkillFilter[] = ['all', 'cleaning', 'cooking', 'laundry', 'shopping', 'size', 'general'];

/**
 * Every skill sits under All and exactly one other filter. A category skill goes under its first category, so Errand
 * Runner (Shopping and General quests) is under Shopping; General holds the skills that aren't about one kind of quest.
 */
export function matchesSkillFilter(skill: SkillDefinition, filter: SkillFilter): boolean {
  if (filter === 'all') return true;
  const { kind, categories } = skill.effect;
  if (kind === 'category') return categories?.[0] === filter;
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
