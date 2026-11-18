import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import { Tooltip } from '../ui/Tooltip';

const highlight = 'font-extrabold text-moss-700 underline decoration-dotted decoration-2 underline-offset-2';

/** A fraction as a percent number with at most one decimal: 0.015 → 1.5, 0.375 → 37.5. */
const percentNumber = (fraction: number) => Math.round(fraction * 1000) / 10;

/**
 * "+1.5% per character level" in a skill description (Fast Learner), at the skill's current level (level 1 when
 * not learned). With a character level known, a tooltip shows the live total XP bonus, e.g. character lv. 5 with
 * the skill at lv. 2: 30% + 5 × 1.5% = "Current XP bonus: 37.5%".
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
  const skillLevel = Math.max(1, level);
  const perLevel = skill.effect.xpPerCharacterLevel?.[skillLevel - 1] ?? 0;
  const label = t('skills.perCharacterLevel', { value: percentNumber(perLevel) });
  if (!interactive || characterLevel === undefined) return <span className={interactive ? highlight : 'font-extrabold'}>{label}</span>;

  const total = percentNumber((skill.effect.xp?.[skillLevel - 1] ?? 0) + perLevel * characterLevel);
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

/** "Normal Tickets" / "Golden Tickets" in a skill description, explained in a tooltip. */
export function TicketTooltip({ kind, interactive }: { kind: 'normal' | 'golden'; interactive: boolean }) {
  const { t } = useLanguage();
  const label = t(kind === 'golden' ? 'skills.goldenTickets' : 'skills.normalTickets');
  if (!interactive) return <span className="font-extrabold">{label}</span>;
  return <Tooltip label={label} triggerClassName={highlight} content={t(kind === 'golden' ? 'skills.goldenTicketHelp' : 'skills.normalTicketHelp')} />;
}

/** The "MVP" keyword in a skill description, explained in a tooltip. */
export function MvpTooltip({ interactive }: { interactive: boolean }) {
  const { t } = useLanguage();
  if (!interactive) return <span className="font-extrabold">MVP</span>;
  return <Tooltip label="MVP" triggerClassName={highlight} content={t('skills.mvpHelp')} />;
}
