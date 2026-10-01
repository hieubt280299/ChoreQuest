import { Fragment } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';

/** Bonus at each skill level, e.g. 0.08 per level -> ["8%", "16%", "24%", "32%"]. */
export function skillLevelValues(skill: SkillDefinition): string[] {
  return Array.from({ length: skill.maxLevel }, (_, index) => `${Math.round(skill.effect.perLevel * (index + 1) * 100)}%`);
}

/**
 * Dota-style description listing every level's value, with the current level highlighted:
 * "Gain 8% / 16% / **24%** / 32% more XP from cleaning quests."
 */
export function SkillDescription({
  skill,
  level,
  className = '',
}: {
  skill: SkillDefinition;
  /** Current skill level (0 = not learned). */
  level: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const [before, after = ''] = t(skill.descriptionKey as TranslationKey).split('{{values}}');
  const values = skillLevelValues(skill);

  return (
    <p className={className}>
      {before}
      {values.map((value, index) => (
        <Fragment key={value}>
          {index > 0 && ' / '}
          {index + 1 === level ? (
            <strong className="font-extrabold text-brick-600 underline decoration-2 underline-offset-2">{value}</strong>
          ) : (
            value
          )}
        </Fragment>
      ))}
      {after}
    </p>
  );
}
