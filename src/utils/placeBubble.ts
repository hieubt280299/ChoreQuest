/**
 * Space between a bubble and its trigger (filled by the bubble's pointer), and the least space it keeps from the
 * screen's edges.
 */
export const BUBBLE_GAP = 16;
export const BUBBLE_MARGIN = 8;
/** The pointer: how far its tip reaches from the bubble's edge (through the 4px frame), and how wide it is. */
export const BUBBLE_TAIL = 14;
export const BUBBLE_TAIL_WIDTH = 20;
/** The pointer keeps this far from the bubble's ends, clear of its pixel corners. */
const TAIL_INSET = 6;

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
 * bars). Horizontally it lines up with the trigger's left edge, right edge or centre (reaching a little past a small
 * trigger's edge, so its pointer can sit under the trigger's middle) and is kept inside the screen.
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
  // Lined up with the trigger's edge, or reaching a little past a small one so the pointer can sit under its middle.
  const middle = (anchor.left + anchor.right) / 2;
  const reach = TAIL_INSET + BUBBLE_TAIL_WIDTH / 2;
  const preferred =
    align === 'right'
      ? Math.max(anchor.right, middle + reach) - size.width
      : align === 'center'
        ? middle - size.width / 2
        : Math.min(anchor.left, middle - reach);
  const left = Math.max(BUBBLE_MARGIN, Math.min(preferred, area.width - BUBBLE_MARGIN - size.width));
  return { top: Math.round(top), left: Math.round(left), side };
}

/**
 * The bubble's pointer: where along the bubble it sits (`x`, from the bubble's left) so it points at the middle of the
 * trigger, and whether it's shown. It's left out when the bubble had to cover its trigger (no room on either side),
 * where it would point at the wrong thing.
 */
export function placeTail(
  anchor: BubbleAnchor,
  spot: { top: number; left: number; side: 'above' | 'below' },
  size: { width: number; height: number },
): { x: number; show: boolean } {
  const middle = (anchor.left + anchor.right) / 2 - spot.left - BUBBLE_TAIL_WIDTH / 2;
  const x = Math.round(Math.max(TAIL_INSET, Math.min(middle, size.width - TAIL_INSET - BUBBLE_TAIL_WIDTH)));
  const show = spot.side === 'above' ? spot.top + size.height + BUBBLE_TAIL <= anchor.top : spot.top - BUBBLE_TAIL >= anchor.bottom;
  return { x, show };
}

/**
 * Whether the middle of a trigger can be seen: inside the part of the screen between the bars and inside every scroll
 * area or clipped box around it (`clips`). A bubble whose trigger has scrolled out of sight is hidden until it's back.
 */
export function anchorInView(anchor: BubbleAnchor, area: { top: number; bottom: number }, clips: BubbleAnchor[]): boolean {
  const x = (anchor.left + anchor.right) / 2;
  const y = (anchor.top + anchor.bottom) / 2;
  if (y < area.top || y > area.bottom) return false;
  return clips.every((clip) => x >= clip.left && x <= clip.right && y >= clip.top && y <= clip.bottom);
}
