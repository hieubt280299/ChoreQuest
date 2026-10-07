import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import { Tooltip } from '../ui/Tooltip';

const highlight = 'font-extrabold text-moss-700 underline decoration-dotted decoration-2 underline-offset-2';

/**
 * "+1% per character level" in a skill description (Fast Learner). With a character level known, a tooltip
 * shows the live total XP bonus, e.g. character lv. 5 with the skill at lv. 2: 60% + 5% = "Current XP bonus: 65%".
 * An unlearned skill shows what it would give at skill level 1.
 */
export function FastLearnerTooltip({
  skill,
  level,
  characterLevel,
  interactive,
}: {
  skill: SkillDefinition;
  /** Skill level (0 = not learned). */
  level: number;
  characterLevel?: number;
  interactive: boolean;
}) {
  const { t } = useLanguage();
  const perLevel = skill.effect.xpPerCharacterLevel ?? 0;
  const label = t('skills.perCharacterLevel', { value: Math.round(perLevel * 100) });
  if (!interactive || characterLevel === undefined) return <span className={interactive ? highlight : 'font-extrabold'}>{label}</span>;

  const skillLevel = Math.max(1, level);
  const total = Math.round(((skill.effect.xp?.[skillLevel - 1] ?? 0) + perLevel * characterLevel) * 100);
  return (
    <Tooltip
      label={label}
      triggerClassName={highlight}
      content={
        <>
          <span className="block font-extrabold">{t(level > 0 ? 'skills.currentXpBonus' : 'skills.xpBonusAtLevel1', { value: total })}</span>
          <span className="mt-1 block text-wood-700">{t('skills.characterLevelNote', { level: characterLevel })}</span>
        </>
      }
    />
  );
}

/** The "MVP" keyword in a skill description, explained in a tooltip. */
export function MvpTooltip({ interactive }: { interactive: boolean }) {
  const { t } = useLanguage();
  if (!interactive) return <span className="font-extrabold">MVP</span>;
  return <Tooltip label="MVP" triggerClassName={highlight} content={t('skills.mvpHelp')} />;
}
