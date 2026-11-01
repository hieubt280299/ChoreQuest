import { Fragment } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { taskName } from '../../utils/taskNames';
import { Tooltip } from '../ui/Tooltip';
import { FastLearnerTooltip, MvpTooltip, TicketTooltip } from './FastLearnerTooltip';

type ValueField = 'xp' | 'gold' | 'values';

/**
 * A skill's value at each level as display text: XP and gold bonuses and interest as percentages
 * (["8%", "16%", "24%", "32%"]), ticket counts as plain numbers.
 */
export function skillLevelValues(skill: SkillDefinition, field: ValueField = 'values'): string[] {
  const list = skill.effect[field] ?? [];
  const asCount = field === 'values' && (skill.effect.kind === 'chronicle_tickets' || skill.effect.kind === 'mvp_tickets');
  return list.map((value) => (asCount ? String(value) : `${Math.round(value * 100)}%`));
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
 * A skill's description with only the values that matter, and the category/group it applies to highlighted:
 * level 1's value before it's learned, then the current value and the next ("**24%** → 32%"), or the final value:
 * "Gain **24%** → 32% more XP and **12%** → 16% more gold from _Cleaning_ quests."
 */
export function SkillDescription({
  skill,
  level,
  className = '',
  interactive = true,
  characterLevel,
  exact = false,
}: {
  skill: SkillDefinition;
  /** Current skill level (0 = not learned). */
  level: number;
  className?: string;
  /** Set false where the description already sits inside a tooltip. */
  interactive?: boolean;
  /** The character's level, for bonuses that grow with it (Fast Learner's live total). */
  characterLevel?: number;
  /** Show only this level's values, with no next step (what spending a point buys). */
  exact?: boolean;
}) {
  const { t } = useLanguage();
  const parts = t(skill.descriptionKey as TranslationKey).split(/(\{\{(?:values|xp|gold|target|levelBonus|mvp|normalTickets|goldenTickets)\}\})/);

  return (
    <p className={className}>
      {parts.map((part, partIndex) => {
        if (part === '{{target}}') return <SkillTarget key={partIndex} skill={skill} interactive={interactive} />;
        if (part === '{{levelBonus}}') {
          return <FastLearnerTooltip key={partIndex} skill={skill} level={level} characterLevel={characterLevel} interactive={interactive} />;
        }
        if (part === '{{mvp}}') return <MvpTooltip key={partIndex} interactive={interactive} />;
        if (part === '{{normalTickets}}') return <TicketTooltip key={partIndex} kind="normal" interactive={interactive} />;
        if (part === '{{goldenTickets}}') return <TicketTooltip key={partIndex} kind="golden" interactive={interactive} />;
        const field = part === '{{xp}}' ? 'xp' : part === '{{gold}}' ? 'gold' : part === '{{values}}' ? 'values' : null;
        if (!field) return <Fragment key={partIndex}>{part}</Fragment>;
        const values = skillLevelValues(skill, field);
        const current = values[level - 1];
        const next = exact ? undefined : values[level];
        return (
          <Fragment key={partIndex}>
            {current && <strong className="font-extrabold text-brick-600">{current}</strong>}
            {current && next && ' → '}
            {next}
          </Fragment>
        );
      })}
    </p>
  );
}
