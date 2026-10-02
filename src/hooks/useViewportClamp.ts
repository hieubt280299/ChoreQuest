import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Keeps an absolutely positioned popover (tooltip bubble) inside the viewport horizontally: once it
 * opens, it is measured and shifted left or right just enough to leave a small margin, so it never
 * pokes past the screen edge and makes the page scroll sideways.
 */
export function useViewportClamp<T extends HTMLElement>(open: boolean, margin = 8) {
  const ref = useRef<T>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!open || !element) {
      setShift(0);
      return;
    }
    // Measure where it would sit unshifted.
    element.style.transform = 'none';
    const rect = element.getBoundingClientRect();
    element.style.transform = '';
    const viewport = document.documentElement.clientWidth;
    let dx = 0;
    if (rect.right > viewport - margin) dx = viewport - margin - rect.right;
    if (rect.left + dx < margin) dx = margin - rect.left;
    setShift(Math.round(dx));
  }, [open, margin]);

  const style: CSSProperties | undefined = shift ? { transform: `translateX(${shift}px)` } : undefined;
  return { ref, style };
}
