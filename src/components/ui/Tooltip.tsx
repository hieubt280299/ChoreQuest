import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * Inline trigger with a pixel tooltip. Opens on hover, keyboard focus or tap (mobile); Escape or a
 * tap elsewhere closes it.
 */
export function Tooltip({
  label,
  content,
  triggerClassName = '',
}: {
  /** The inline trigger content. */
  label: ReactNode;
  content: ReactNode;
  triggerClassName?: string;
}) {
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
    <span ref={ref} className="relative inline" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`px-focus inline ${triggerClassName}`}
      >
        {label}
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="px-panel absolute bottom-full left-0 z-30 mb-3 block w-60 max-w-[70vw] p-3 text-left text-sm font-normal normal-case leading-snug text-ink"
        >
          {content}
        </span>
      )}
    </span>
  );
}
