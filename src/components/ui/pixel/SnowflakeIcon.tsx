import type { SVGProps } from 'react';

/** Pixel snowflake in the pixelarticons style (24px grid, 2px strokes), for Streak Freezes; the set has none. */
export function Snowflake(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="11" y="2" width="2" height="20" />
      <rect x="2" y="11" width="20" height="2" />
      <rect x="9" y="3" width="2" height="2" />
      <rect x="13" y="3" width="2" height="2" />
      <rect x="9" y="19" width="2" height="2" />
      <rect x="13" y="19" width="2" height="2" />
      <rect x="3" y="9" width="2" height="2" />
      <rect x="3" y="13" width="2" height="2" />
      <rect x="19" y="9" width="2" height="2" />
      <rect x="19" y="13" width="2" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="17" y="5" width="2" height="2" />
      <rect x="15" y="7" width="2" height="2" />
      <rect x="5" y="17" width="2" height="2" />
      <rect x="7" y="15" width="2" height="2" />
      <rect x="17" y="17" width="2" height="2" />
      <rect x="15" y="15" width="2" height="2" />
    </svg>
  );
}
