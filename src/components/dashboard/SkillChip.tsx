import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { SkillDescription } from '../skills/SkillDescription';
import { SkillIcon } from '../ui/SkillIcon';
import { Tooltip } from '../ui/Tooltip';

/**
 * A learned skill on the character card, as plain text ("Heavy Lifter 1", no box). Hover, focus or tap shows a
 * tooltip with the description at its current level (upgrading happens on the Skills page, so no next level here).
 */
export function SkillChip({ skill, level }: { skill: SkillDefinition; level: number }) {
  const { t } = useLanguage();
  const name = t(skill.nameKey as TranslationKey);
  return (
    <Tooltip
      triggerClassName="inline-flex min-h-7 items-center gap-1 text-sm font-bold text-wood-800 hover:text-ink"
      label={
        <>
          <span className="text-wood-600">
            <SkillIcon icon={skill.icon} size={12} />
          </span>
          {name}
          <span className="font-arcade text-[9px] text-brick-600" aria-label={t('skills.levelShort', { level })}>
            {level}
          </span>
        </>
      }
      content={
        <>
          <span className="mb-1 block text-base font-extrabold leading-tight">
            {name} · {t('skills.levelShort', { level })}
          </span>
          <SkillDescription skill={skill} level={level} exact interactive={false} className="text-sm leading-snug text-wood-700" />
        </>
      }
    />
  );
}
