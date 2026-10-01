import { Fragment } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Tooltip } from '../ui/Tooltip';

/** Bonus at each skill level, e.g. 0.08 per level -> ["8%", "16%", "24%", "32%"]. */
export function skillLevelValues(skill: SkillDefinition): string[] {
  return Array.from({ length: skill.maxLevel }, (_, index) => `${Math.round(skill.effect.perLevel * (index + 1) * 100)}%`);
}

/** Highlighted category/group name with a tooltip listing the active quests it covers. */
function SkillTarget({ skill, interactive }: { skill: SkillDefinition; interactive: boolean }) {
  const { t, language } = useLanguage();
  const { state } = useGame();
  const { category, group } = skill.effect;
  const label = category ? t(`category.${category}` as TranslationKey) : group ? t(`group.${group}` as TranslationKey) : '';
  const highlight = 'font-extrabold text-moss-700 underline decoration-dotted decoration-2 underline-offset-2';
  if (!interactive) return <span className={highlight}>{label}</span>;

  const quests = state.tasks.filter((task) => task.enabled && (category ? task.category === category : task.group === group));
  const summary =
    quests.length === 0
      ? t('skills.targetNone', { target: label })
      : quests.length === 1
        ? t('skills.targetCountOne', { target: label })
        : t('skills.targetCount', { target: label, count: quests.length });

  return (
    <Tooltip
      label={label}
      triggerClassName={highlight}
      content={
        <>
          <span className="block font-extrabold">{summary}</span>
          {quests.length > 0 && (
            <span className="mt-1 block text-wood-700">{quests.map((task) => taskName(task, language)).join(', ')}</span>
          )}
        </>
      }
    />
  );
}

/**
 * Dota-style description listing every level's value, with the current level highlighted, and the
 * category/group it applies to capitalized and highlighted:
 * "Gain 8% / 16% / **24%** / 32% more XP from _Cleaning_ quests."
 */
export function SkillDescription({
  skill,
  level,
  className = '',
  interactive = true,
}: {
  skill: SkillDefinition;
  /** Current skill level (0 = not learned). */
  level: number;
  className?: string;
  /** Set false where the description already sits inside a tooltip. */
  interactive?: boolean;
}) {
  const { t } = useLanguage();
  const parts = t(skill.descriptionKey as TranslationKey).split(/(\{\{values\}\}|\{\{target\}\})/);
  const values = skillLevelValues(skill);

  return (
    <p className={className}>
      {parts.map((part, partIndex) => {
        if (part === '{{target}}') return <SkillTarget key={partIndex} skill={skill} interactive={interactive} />;
        if (part !== '{{values}}') return <Fragment key={partIndex}>{part}</Fragment>;
        return (
          <Fragment key={partIndex}>
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
          </Fragment>
        );
      })}
    </p>
  );
}
