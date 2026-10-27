import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useViewportClamp } from '../../hooks/useViewportClamp';
import type { SkillDefinition } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { SkillDescription } from '../skills/SkillDescription';
import { SkillIcon } from '../ui/SkillIcon';

/**
 * A learned skill on the character card, as plain text ("Heavy Lifter 1", no box). Hover, focus or tap shows a
 * tooltip with the full description and the current level's value highlighted; Escape or tapping elsewhere closes it.
 */
export function SkillChip({ skill, level }: { skill: SkillDefinition; level: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const bubble = useViewportClamp<HTMLSpanElement>(open);

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
        className="px-focus inline-flex min-h-7 items-center gap-1 text-sm font-bold text-wood-800 hover:text-ink"
      >
        <span className="text-wood-600">
          <SkillIcon icon={skill.icon} size={12} />
        </span>
        {t(skill.nameKey as TranslationKey)}
        <span className="font-arcade text-[9px] text-brick-600" aria-label={t('skills.levelShort', { level })}>
          {level}
        </span>
      </button>
      {open && (
        <span
          id={tooltipId}
          ref={bubble.ref}
          style={bubble.style}
          role="tooltip"
          className="px-panel px-tooltip absolute bottom-full left-0 z-30 mb-2 block w-max max-w-[min(16rem,calc(100vw-1rem))] px-2.5 py-2 text-left"
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
