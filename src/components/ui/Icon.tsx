import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Pixelarticons are drawn on a 12px grid, so sizes should stay multiples of 12 to remain crisp. */
export function Icon({ as: Glyph, size = 24, className = '' }: { as: IconComponent; size?: 12 | 24 | 36 | 48; className?: string }) {
  return <Glyph width={size} height={size} shapeRendering="crispEdges" aria-hidden className={`shrink-0 ${className}`} />;
}
