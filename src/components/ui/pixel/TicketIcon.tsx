import type { SVGProps } from 'react';

/**
 * Pixel wheel ticket in the pixelarticons style (24px grid, 2px strokes), which has no ticket glyph:
 * notched sides and a perforated stub.
 */
export function Ticket(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="5" width="20" height="2" />
      <rect x="2" y="17" width="20" height="2" />
      <rect x="2" y="7" width="2" height="3" />
      <rect x="2" y="14" width="2" height="3" />
      <rect x="4" y="10" width="2" height="4" />
      <rect x="20" y="7" width="2" height="3" />
      <rect x="20" y="14" width="2" height="3" />
      <rect x="18" y="10" width="2" height="4" />
      <rect x="14" y="8" width="2" height="2" />
      <rect x="14" y="11" width="2" height="2" />
      <rect x="14" y="14" width="2" height="2" />
    </svg>
  );
}
