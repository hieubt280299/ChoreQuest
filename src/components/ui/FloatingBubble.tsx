import { useLayoutEffect, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { placeBubble, type BubbleAlign } from '../../utils/placeBubble';

/** The part of the screen between the app's fixed top bar and the phone's bottom navigation (`data-app-bar`). */
function visibleArea() {
  let top = 0;
  let bottom = window.innerHeight;
  for (const bar of document.querySelectorAll<HTMLElement>('[data-app-bar]')) {
    const rect = bar.getBoundingClientRect();
    if (rect.height === 0) continue; // Hidden, like the phone navigation on a big screen.
    if (rect.top <= 0) top = Math.max(top, rect.bottom);
    else bottom = Math.min(bottom, rect.top);
  }
  return { width: document.documentElement.clientWidth, height: window.innerHeight, top, bottom };
}

/**
 * A tooltip bubble drawn at the top level of the page, over everything else (cards, the top bar, dialogs), so no other
 * part of the app can cover it or cut it off. It sits next to `anchor` (see `utils/placeBubble`) and follows it while the
 * page or a scroll area moves.
 */
export function FloatingBubble({
  anchor,
  bubbleRef,
  align = 'left',
  className = '',
  children,
  ...props
}: Omit<HTMLAttributes<HTMLSpanElement>, 'style'> & {
  anchor: RefObject<HTMLElement>;
  bubbleRef: RefObject<HTMLSpanElement>;
  align?: BubbleAlign;
  children: ReactNode;
}) {
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    let frame = 0;
    const place = () => {
      const target = anchor.current;
      if (!target) return;
      // A trigger inside a sentence can wrap onto two lines: line up with its first line, and go below its last.
      const lines = target.getClientRects();
      const first = lines[0] ?? target.getBoundingClientRect();
      const last = lines[lines.length - 1] ?? first;
      const box = { top: first.top, left: first.left, right: first.right, bottom: last.bottom };
      const { top, left } = placeBubble(box, bubble.getBoundingClientRect(), visibleArea(), align);
      bubble.style.top = `${top}px`;
      bubble.style.left = `${left}px`;
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    place();
    // Capture, so scrolling inside a dialog or another scroll area moves it too.
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [anchor, bubbleRef, align]);

  return createPortal(
    <span ref={bubbleRef} className={`px-panel px-tooltip fixed left-0 top-0 z-[100] block w-max ${className}`} {...props}>
      {children}
    </span>,
    document.body,
  );
}
