import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useViewportClamp } from '../../hooks/useViewportClamp';

/**
 * Inline trigger with a pixel tooltip. Opens on hover, keyboard focus or tap (mobile); Escape or a
 * tap elsewhere closes it.
 */
export function Tooltip({
  label,
  content,
  triggerClassName = '',
  align = 'left',
}: {
  /** The inline trigger content. */
  label: ReactNode;
  content: ReactNode;
  triggerClassName?: string;
  /** Anchor the bubble to the trigger's left (default) or right edge, e.g. for triggers near the right of the screen. */
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const bubble = useViewportClamp<HTMLSpanElement>(open);
  // A flex trigger (badge) sits in an inline-flex wrapper so it lines up with neighbouring badges.
  const flexTrigger = /(^|\s)(inline-)?flex(\s|$)/.test(triggerClassName);

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
    <span ref={ref} className={`relative ${flexTrigger ? 'inline-flex' : 'inline'}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`px-focus ${flexTrigger ? '' : 'inline'} ${triggerClassName}`}
      >
        {label}
      </button>
      {open && (
        <span
          id={tooltipId}
          ref={bubble.ref}
          style={bubble.style}
          role="tooltip"
          className={`px-panel px-tooltip absolute bottom-full ${align === 'right' ? 'right-0' : 'left-0'} z-30 mb-2 block w-max max-w-[min(15rem,calc(100vw-1rem))] px-2.5 py-1.5 text-left text-sm font-normal normal-case leading-snug text-ink`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
