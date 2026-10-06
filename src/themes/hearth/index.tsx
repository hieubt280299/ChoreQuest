import type { ReactNode } from 'react';
import { CANDLE, CAT, FIRE, HEART, POTION } from '../../assets/sprites';
import { AnimatedSprite, PixelRects } from '../../components/ui/pixel/PixelSprite';
import { SCENE_H as H, SCENE_W as W, skyFor, type Sky, type SceneProps } from '../scene';

// Cozy Hearth (default theme): a wood-plank cabin with a stone fireplace, a window on the sky and a banner.
// Its palette lives in index.css, so this module is part of the main bundle.
const FLOOR_Y = 40;

function Wall() {
  const rows: ReactNode[] = [];
  for (let y = 0, row = 0; y < FLOOR_Y; y += 6, row += 1) {
    rows.push(<rect key={`seam-${y}`} x={0} y={y + 5} width={W} height={1} fill="#3d2518" />);
    rows.push(<rect key={`hi-${y}`} x={0} y={y} width={W} height={1} fill="#6e4429" />);
    // Staggered plank joints.
    for (let x = (row * 37) % 29; x < W; x += 41) {
      rows.push(<rect key={`j-${y}-${x}`} x={x} y={y} width={1} height={5} fill="#3d2518" />);
    }
  }
  return (
    <g>
      <rect width={W} height={FLOOR_Y} fill="#5a3621" />
      {rows}
    </g>
  );
}

function Floor() {
  return (
    <g>
      <rect y={FLOOR_Y} width={W} height={H - FLOOR_Y} fill="#4a2c1a" />
      <rect y={FLOOR_Y} width={W} height={2} fill="#2b1a12" />
      {[45, 50].map((y) => (
        <rect key={y} y={y} width={W} height={1} fill="#3a2214" />
      ))}
      {/* Rug */}
      <rect x={34} y={46} width={52} height={6} fill="#8f3a2c" />
      <rect x={32} y={47} width={56} height={4} fill="#8f3a2c" />
      <rect x={36} y={47} width={48} height={1} fill="#f2b233" />
      <rect x={36} y={50} width={48} height={1} fill="#f2b233" />
      <rect x={38} y={48} width={44} height={2} fill="#b04a34" />
    </g>
  );
}

function Fireplace() {
  const stones: ReactNode[] = [];
  const shades = ['#9a8a74', '#8a7a66', '#a89880', '#7d6f5d'];
  for (let y = 0, row = 0; y < FLOOR_Y; y += 4, row += 1) {
    const offset = row % 2 ? 3 : 0;
    for (let x = 42 - offset, i = 0; x < 78; x += 7, i += 1) {
      const left = Math.max(42, x);
      const width = Math.min(78, x + 6) - left;
      if (width > 0) {
        stones.push(
          <rect key={`${y}-${x}`} x={left} y={y} width={width} height={3} fill={shades[(row * 3 + i) % shades.length]} />,
        );
      }
    }
  }
  return (
    <g>
      <rect x={41} y={0} width={38} height={FLOOR_Y} fill="#4f443a" />
      {stones}
      {/* Firebox opening with a stepped arch */}
      <rect x={50} y={24} width={20} height={FLOOR_Y - 24} fill="#1a0f0a" />
      <rect x={52} y={22} width={16} height={2} fill="#1a0f0a" />
      <rect x={55} y={21} width={10} height={1} fill="#1a0f0a" />
      <rect x={49} y={24} width={1} height={FLOOR_Y - 24} fill="#2b1a12" />
      <rect x={70} y={24} width={1} height={FLOOR_Y - 24} fill="#2b1a12" />
      <AnimatedSprite frames={FIRE} fps={6} x={52} y={FLOOR_Y - 14} />
      {/* Mantel */}
      <rect x={38} y={15} width={44} height={4} fill="#7a4a2a" />
      <rect x={38} y={15} width={44} height={1} fill="#9c6337" />
      <rect x={38} y={18} width={44} height={1} fill="#4a2c1a" />
      <AnimatedSprite frames={CANDLE} fps={3} x={43} y={8} />
      <PixelRects sprite={HEART[0]} x={57} y={9} />
      <PixelRects sprite={POTION[0]} x={72} y={9} />
    </g>
  );
}

function Window({ sky }: { sky: Sky }) {
  return (
    <g>
      <rect x={6} y={5} width={22} height={18} fill="#2b1a12" />
      <rect x={7} y={6} width={20} height={16} fill="#9c6337" />
      <rect x={9} y={8} width={16} height={12} fill={sky.sky} />
      <rect x={9} y={8} width={16} height={3} fill={sky.glow} opacity={0.5} />
      {sky.night ? (
        <g>
          <rect x={20} y={9} width={3} height={3} fill="#ffe08a" />
          <rect x={21} y={9} width={2} height={2} fill={sky.sky} />
          {[
            [10, 9],
            [13, 11],
            [11, 17],
            [21, 18],
            [23, 16],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} className="twinkle" x={x} y={y} width={1} height={1} fill="#fff4d6" />
          ))}
        </g>
      ) : (
        <g>
          <rect x={20} y={9} width={3} height={3} fill="#ffe08a" />
          <rect x={10} y={17} width={5} height={2} fill="#fff4d6" />
          <rect x={11} y={16} width={3} height={1} fill="#fff4d6" />
        </g>
      )}
      {/* Mullions and sill */}
      <rect x={16} y={8} width={2} height={12} fill="#9c6337" />
      <rect x={9} y={13} width={16} height={2} fill="#9c6337" />
      <rect x={5} y={22} width={24} height={2} fill="#7a4a2a" />
    </g>
  );
}

function Banner() {
  return (
    <g>
      <rect x={93} y={4} width={18} height={1} fill="#2b1a12" />
      <rect x={95} y={5} width={14} height={16} fill="#8f3a2c" />
      <rect x={95} y={21} width={4} height={2} fill="#8f3a2c" />
      <rect x={105} y={21} width={4} height={2} fill="#8f3a2c" />
      <rect x={95} y={5} width={1} height={18} fill="#6e2a22" />
      <rect x={108} y={5} width={1} height={18} fill="#6e2a22" />
      <rect x={97} y={7} width={10} height={1} fill="#f2b233" />
      <PixelRects sprite={HEART[0].map((row) => row.replace(/X/g, 'Y'))} x={98} y={10} />
    </g>
  );
}

export function SceneBack({ hour }: SceneProps) {
  const sky = skyFor(hour);
  return (
    <>
      <defs>
        <radialGradient id="hearth-glow" cx="60" cy="32" r="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f39a3d" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f39a3d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Wall />
      <Window sky={sky} />
      <Banner />
      <Floor />
      <Fireplace />
    </>
  );
}

/** The cat by the fire, the firelight and sparks, drawn over the heroes. */
export function SceneFront() {
  return (
    <>
      <AnimatedSprite frames={CAT} fps={2} sequence={[0, 0, 0, 0, 0, 1, 0, 1]} x={51} y={43} />
      <rect className="hearth-flicker" width={W} height={H} fill="url(#hearth-glow)" />
      {[56, 60, 64].map((x, index) => (
        <rect key={x} className={`spark spark-${index}`} x={x} y={25} width={1} height={1} fill="#ffd166" />
      ))}
    </>
  );
}

export const sceneLabel = 'The two heroes warming up by the cabin fire';
