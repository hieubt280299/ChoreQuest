import type { SVGProps } from 'react';

/** A solid pixel heart (24px grid), for the hearts that float up when one is sent; pixelarticons only has an outline. */
export function FilledHeart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="4" width="6" height="2" />
      <rect x="14" y="4" width="6" height="2" />
      <rect x="2" y="6" width="20" height="6" />
      <rect x="4" y="12" width="16" height="2" />
      <rect x="6" y="14" width="12" height="2" />
      <rect x="8" y="16" width="8" height="2" />
      <rect x="10" y="18" width="4" height="2" />
    </svg>
  );
}
