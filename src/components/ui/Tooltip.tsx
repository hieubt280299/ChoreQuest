import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { FloatingBubble } from './FloatingBubble';

/** Whether a focused element got there by keyboard (a tap or click focuses it too, but shouldn't open anything). */
export function focusedByKeyboard(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
}

/**
 * Inline trigger with a pixel tooltip. Opens on mouse hover, keyboard focus or a tap; a second tap, Escape or a tap
 * elsewhere closes it. Only a real mouse counts as hovering: a phone also reports "hover" and focus on a tap, which
 * would open the bubble just before the tap's click closed it again.
 */
export function Tooltip({
  label,
  content,
  triggerClassName = '',
  align = 'left',
  ariaLabel,
}: {
  /** The inline trigger content. */
  label: ReactNode;
  content: ReactNode;
  triggerClassName?: string;
  /** Line the bubble up with the trigger's left (default) or right edge, e.g. for triggers near the right of the screen. */
  align?: 'left' | 'right';
  /** The trigger's name for screen readers, when it's only an icon. */
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  // How the current press started: a mouse click keeps a hover-opened bubble open instead of toggling it.
  const pointer = useRef('');
  const tooltipId = useId();
  // A flex trigger (badge) sits in an inline-flex wrapper so it lines up with neighbouring badges.
  const flexTrigger = /(^|\s)(inline-)?flex(\s|$)/.test(triggerClassName);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === 'Escape') setOpen(false);
        return;
      }
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !bubble.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`relative ${flexTrigger ? 'inline-flex' : 'inline'}`}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onPointerDown={(event) => {
          pointer.current = event.pointerType;
        }}
        onClick={() => {
          const mouse = pointer.current === 'mouse';
          pointer.current = '';
          setOpen((value) => mouse || !value);
        }}
        onFocus={(event) => focusedByKeyboard(event.currentTarget) && setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`px-focus ${flexTrigger ? '' : 'inline'} ${triggerClassName}`}
      >
        {label}
      </button>
      {open && (
        <FloatingBubble
          id={tooltipId}
          role="tooltip"
          anchor={ref}
          bubbleRef={bubble}
          align={align}
          className="max-w-[min(15rem,calc(100vw-1rem))] px-2.5 py-1.5 text-left text-sm font-normal normal-case leading-snug text-ink"
        >
          {content}
        </FloatingBubble>
      )}
    </span>
  );
}
