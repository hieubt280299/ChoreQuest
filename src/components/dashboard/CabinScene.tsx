import { useEffect, useState, type ReactNode } from 'react';
import { useActiveAvatar } from '../../context/GameContext';
import { useTheme } from '../../hooks/useTheme';
import { useThemeModule } from '../../themes';
import * as hearth from '../../themes/hearth';
import { SCENE_H as H, SCENE_W as W } from '../../themes/scene';
import type { ThemeId } from '../../types';
import { avatarFrames } from '../ui/CharacterAvatar';
import { AnimatedSprite } from '../ui/pixel/PixelSprite';

// The heroes' scene: each theme draws its own setting (src/themes/<id>), lazily loaded; the two heroes
// always stand at the same spots on the 120x54 stage, so name plates line up in every theme.

function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return hour;
}

export function CabinScene({
  labels,
  className = '',
  theme,
}: {
  /** Optional name plates rendered above the knight and the mage. */
  labels?: { husband: ReactNode; wife: ReactNode };
  className?: string;
  /** Draw this theme's scene instead of the player's current one. */
  theme?: ThemeId;
}) {
  const hour = useHour();
  const { theme: current } = useTheme();
  // Until a theme's chunk arrives, keep showing the hearth so the stage never flashes empty.
  const scene = useThemeModule(theme ?? current) ?? hearth;
  const husbandAvatar = useActiveAvatar('husband');
  const wifeAvatar = useActiveAvatar('wife');
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="pixelated block h-auto w-full"
        shapeRendering="crispEdges"
        role="img"
        aria-label={scene.sceneLabel}
      >
        <scene.SceneBack hour={hour} />
        {/* Soft shadows, then characters */}
        <rect x={18} y={50} width={14} height={2} fill="#000" opacity={0.25} />
        <rect x={87} y={50} width={14} height={2} fill="#000" opacity={0.25} />
        <g className="bob">
          <AnimatedSprite frames={avatarFrames('husband', husbandAvatar)} fps={4} sequence={[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]} x={17} y={34} />
        </g>
        <g className="bob bob-delay">
          <AnimatedSprite frames={avatarFrames('wife', wifeAvatar)} fps={4} sequence={[0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]} x={86} y={34} />
        </g>
        {scene.SceneFront && <scene.SceneFront hour={hour} />}
      </svg>
      {labels && (
        <>
          <div className="pointer-events-none absolute left-[20.8%] top-[60%] -translate-x-1/2 -translate-y-full">
            {labels.husband}
          </div>
          <div className="pointer-events-none absolute left-[79%] top-[60%] -translate-x-1/2 -translate-y-full">
            {labels.wife}
          </div>
        </>
      )}
    </div>
  );
}
