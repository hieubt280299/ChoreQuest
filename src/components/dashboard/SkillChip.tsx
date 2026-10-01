import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { SkillDescription } from '../skills/SkillDescription';
import { SkillIcon } from '../ui/SkillIcon';

/**
 * Learned-skill chip ("Heavy Lifter lv. 1"). Hover, focus or tap shows a tooltip with the full
 * description and the current level's value highlighted; Escape or tapping elsewhere closes it.
 */
export function SkillChip({ skill, level }: { skill: SkillDefinition; level: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="px-slot px-focus inline-flex items-center gap-1 px-2 py-0.5 text-sm font-bold text-wood-800"
      >
        <SkillIcon icon={skill.icon} size={12} />
        {t(skill.nameKey as TranslationKey)}
        <span className="text-sm font-extrabold text-brick-600">{t('skills.levelShort', { level })}</span>
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="px-panel absolute bottom-full left-0 z-30 mb-3 block w-64 max-w-[75vw] p-3 text-left"
        >
          <span className="mb-1 block text-base font-extrabold leading-tight">
            {t(skill.nameKey as TranslationKey)} · {t('skills.levelShort', { level })}
          </span>
          <SkillDescription skill={skill} level={level} interactive={false} className="text-sm leading-snug text-wood-700" />
        </span>
      )}
    </span>
  );
}
