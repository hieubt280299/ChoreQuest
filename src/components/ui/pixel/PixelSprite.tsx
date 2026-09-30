import { memo } from 'react';
import { PIXEL_PALETTE, type Sprite } from '../../../assets/sprites';
import { useSpriteFrame } from './useSpriteClock';

/** Renders one sprite frame as SVG rects, merging horizontal runs of the same colour. */
export const PixelRects = memo(function PixelRects({
  sprite,
  x = 0,
  y = 0,
  flip = false,
}: {
  sprite: Sprite;
  x?: number;
  y?: number;
  flip?: boolean;
}) {
  const width = sprite[0]?.length ?? 0;
  const rects: JSX.Element[] = [];
  sprite.forEach((row, rowIndex) => {
    let col = 0;
    while (col < row.length) {
      const char = row[col];
      let end = col + 1;
      while (end < row.length && row[end] === char) end += 1;
      const fill = PIXEL_PALETTE[char];
      if (char !== '.' && fill) {
        const left = flip ? width - end : col;
        rects.push(<rect key={`${rowIndex}-${col}`} x={x + left} y={y + rowIndex} width={end - col} height={1} fill={fill} />);
      }
      col = end;
    }
  });
  return <g>{rects}</g>;
});

/** Animated sprite for use inside a larger pixel SVG scene. */
export function AnimatedSprite({
  frames,
  fps = 4,
  offset = 0,
  sequence,
  ...rest
}: {
  frames: Sprite[];
  fps?: number;
  offset?: number;
  /** Optional frame order, e.g. [0,0,0,0,0,0,1] for an occasional blink. */
  sequence?: number[];
  x?: number;
  y?: number;
  flip?: boolean;
}) {
  const order = sequence ?? frames.map((_, index) => index);
  const step = useSpriteFrame(order.length, fps, offset);
  return <PixelRects sprite={frames[order[step]] ?? frames[0]} {...rest} />;
}

/** Standalone sprite scaled to `scale` CSS pixels per art pixel. */
export function PixelSprite({
  frames,
  scale = 4,
  fps,
  sequence,
  offset,
  flip,
  className = '',
  title,
}: {
  frames: Sprite[];
  scale?: number;
  fps?: number;
  sequence?: number[];
  offset?: number;
  flip?: boolean;
  className?: string;
  title?: string;
}) {
  const width = frames[0][0].length;
  const height = frames[0].length;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={`pixelated ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <AnimatedSprite frames={frames} fps={fps} sequence={sequence} offset={offset} flip={flip} />
    </svg>
  );
}
