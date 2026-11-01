import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, newest last: only the top one reacts to the keyboard.
const stack: symbol[] = [];

/**
 * Keyboard behaviour shared by every dialog: Escape closes it, Tab stays inside it, and focus goes back to where it
 * was on close. The panel needs `tabIndex={-1}`. It takes focus itself rather than its first field, so a phone's
 * keyboard doesn't pop up; a field with `autoFocus` keeps it.
 */
export function useDialogA11y(open: boolean, panel: RefObject<HTMLElement>, onClose?: () => void) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const id = Symbol('dialog');
    stack.push(id);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !panel.current) return;
      if (event.key === 'Escape') {
        // An open tooltip closes first (it listens for Escape itself).
        if (!panel.current.querySelector('[role="tooltip"]')) close.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!first) {
        event.preventDefault();
      } else if (!panel.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, panel]);
}
