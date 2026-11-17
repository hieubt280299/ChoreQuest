import { useLayoutEffect, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { anchorInView, placeBubble, placeTail, type BubbleAlign, type BubbleAnchor } from '../../utils/placeBubble';

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

/** The boxes around an element that cut off what's outside them: scroll areas and other clipped boxes. */
function clipBoxes(element: HTMLElement): BubbleAnchor[] {
  const boxes: BubbleAnchor[] = [];
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') boxes.push(node.getBoundingClientRect());
  }
  return boxes;
}

/**
 * A tooltip bubble drawn at the top level of the page, over everything else (cards, the top bar, dialogs), so no other
 * part of the app can cover it or cut it off. It sits next to `anchor` (see `utils/placeBubble`), with a pointer at it,
 * and follows it while the page or a scroll area moves; while the anchor is scrolled out of sight, it's hidden.
 *
 * Its frame has a light outline and the pointer (`.px-tooltip`), so even when its edge lands right on a card's edge it
 * reads as lying on top of the card, never as cut off by it.
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
      const size = bubble.getBoundingClientRect();
      const area = visibleArea();
      const spot = placeBubble(box, size, area, align);
      // The pointer aims at the line next to the bubble: the first above it, the last below it.
      const line = spot.side === 'above' ? first : last;
      const tail = placeTail({ top: box.top, bottom: box.bottom, left: line.left, right: line.right }, spot, size);
      bubble.style.top = `${spot.top}px`;
      bubble.style.left = `${spot.left}px`;
      bubble.style.setProperty('--tail-x', `${tail.x}px`);
      bubble.dataset.side = spot.side;
      bubble.dataset.tail = tail.show ? 'on' : 'off';
      bubble.style.visibility = anchorInView(box, area, clipBoxes(target)) ? '' : 'hidden';
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
      {/* The pointer, drawn pointing down (flipped when the bubble is below its trigger). Its light cells open the
          bubble's frame where it joins, so bubble and pointer are one shape. */}
      <svg className="px-tooltip-tail" width="20" height="18" viewBox="0 0 20 18" aria-hidden focusable="false">
        <path className="px-tooltip-tail-fill" d="M4 0h12v10h-2v2h-2v2H8v-2H6v-2H4z" />
        <path
          className="px-tooltip-tail-ink"
          d="M0 8h4v2h2v2h2v2h4v-2h2v-2h2V8h4v2h-2v2h-2v2h-2v2h-2v2H8v-2H6v-2H4v-2H2v-2H0z"
        />
      </svg>
    </span>,
    document.body,
  );
}
