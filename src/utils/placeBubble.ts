/** Space between a bubble and its trigger, and the least space it keeps from the screen's edges. */
export const BUBBLE_GAP = 8;
export const BUBBLE_MARGIN = 8;

export type BubbleAlign = 'left' | 'center' | 'right';

export interface BubbleAnchor {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Where a tooltip bubble goes: above its trigger when it fits below the app's top bar, otherwise below the trigger when
 * it fits above the bottom bar, otherwise on whichever side has more room (still on screen, since it's drawn over the
 * bars). Horizontally it lines up with the trigger's left edge, right edge or centre and is kept inside the screen.
 * `area` is the screen (`width`, `height`) and the part of it between the bars (`top`, `bottom`).
 */
export function placeBubble(
  anchor: BubbleAnchor,
  size: { width: number; height: number },
  area: { width: number; height: number; top: number; bottom: number },
  align: BubbleAlign = 'left',
): { top: number; left: number; side: 'above' | 'below' } {
  const above = anchor.top - BUBBLE_GAP - size.height;
  const below = anchor.bottom + BUBBLE_GAP;
  let top: number;
  let side: 'above' | 'below';
  if (above >= area.top + BUBBLE_MARGIN) {
    [top, side] = [above, 'above'];
  } else if (below + size.height <= area.bottom - BUBBLE_MARGIN) {
    [top, side] = [below, 'below'];
  } else if (anchor.top - area.top >= area.bottom - anchor.bottom) {
    [top, side] = [Math.max(BUBBLE_MARGIN, above), 'above'];
  } else {
    [top, side] = [Math.max(BUBBLE_MARGIN, Math.min(below, area.height - BUBBLE_MARGIN - size.height)), 'below'];
  }
  const preferred =
    align === 'right' ? anchor.right - size.width : align === 'center' ? (anchor.left + anchor.right - size.width) / 2 : anchor.left;
  const left = Math.max(BUBBLE_MARGIN, Math.min(preferred, area.width - BUBBLE_MARGIN - size.width));
  return { top: Math.round(top), left: Math.round(left), side };
}
