import type { SkillDefinition, TaskCategory } from '../types';

/** Filter chips on the Skills page: a quest category, skills tied to quest effort, or everything else. */
export type SkillFilter = 'all' | Exclude<TaskCategory, 'general'> | 'effort' | 'general';

export const SKILL_FILTERS: SkillFilter[] = ['all', 'cleaning', 'cooking', 'laundry', 'shopping', 'effort', 'general'];

export function matchesSkillFilter(skill: SkillDefinition, filter: SkillFilter): boolean {
  if (filter === 'all') return true;
  const { kind, category } = skill.effect;
  if (kind === 'category') return category === filter;
  return filter === (kind === 'group' ? 'effort' : 'general');
}
