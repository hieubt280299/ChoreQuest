import { COIN } from '../../assets/sprites';
import { AnimatedSprite } from '../../components/ui/pixel/PixelSprite';
import { SCENE_H as H, SCENE_W as W } from '../scene';
import './theme.css';

// Mushroom Kingdom: a side-scrolling level under a #5C94FC sky, with brick ground (#C84C0C), green hills
// and a warp pipe (#00A800), floating brick and question blocks and a spinning coin (#F8B800).
const GROUND_Y = 48;
const SKY = '#5c94fc';
const GREEN = '#00a800';
const DARK_GREEN = '#005800';
const LIGHT_GREEN = '#58d854';
const BRICK = '#c84c0c';
const GOLD = '#f8b800';
const INK = '#000000';

const R = ({ x, y, w, h, f }: { x: number; y: number; w: number; h: number; f: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={f} />
);

function Cloud({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <R x={x + 3} y={y} w={6} h={1} f={INK} />
      <R x={x + 1} y={y + 1} w={10} h={1} f={INK} />
      <R x={x} y={y + 2} w={14} h={4} f={INK} />
      <R x={x + 3} y={y + 1} w={6} h={1} f="#fcfcfc" />
      <R x={x + 1} y={y + 2} w={12} h={3} f="#fcfcfc" />
      <R x={x + 1} y={y + 4} w={12} h={1} f="#a4e4fc" />
    </g>
  );
}

function Hill({ x, width, height }: { x: number; width: number; height: number }) {
  // Stepped dome of green with a dark outline and two spots.
  const steps = [];
  for (let row = 0; row < height; row += 1) {
    const inset = Math.max(0, Math.round((height - row) * (width / (2.6 * height))) - 1);
    steps.push(<R key={row} x={x + inset} y={GROUND_Y - height + row} w={width - inset * 2} h={1} f={row === 0 ? DARK_GREEN : GREEN} />);
  }
  return (
    <g>
      {steps}
      <R x={x + width / 2 - 4} y={GROUND_Y - height + 4} w={2} h={3} f={DARK_GREEN} />
      <R x={x + width / 2 + 3} y={GROUND_Y - height + 6} w={2} h={3} f={DARK_GREEN} />
    </g>
  );
}

function BrickBlock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <R x={x} y={y} w={8} h={8} f={BRICK} />
      <R x={x} y={y} w={8} h={1} f="#fcbcb0" />
      <R x={x} y={y + 3} w={8} h={1} f={INK} />
      <R x={x} y={y + 7} w={8} h={1} f={INK} />
      <R x={x + 3} y={y + 1} w={1} h={2} f={INK} />
      <R x={x + 6} y={y + 4} w={1} h={3} f={INK} />
      <R x={x + 1} y={y + 4} w={1} h={3} f={INK} />
    </g>
  );
}

function QuestionBlock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <R x={x} y={y} w={8} h={8} f={INK} />
      <R x={x + 1} y={y + 1} w={6} h={6} f={GOLD} />
      <R x={x + 1} y={y + 1} w={6} h={1} f="#fcd87c" />
      {/* "?" */}
      <R x={x + 3} y={y + 2} w={2} h={1} f="#a85000" />
      <R x={x + 5} y={y + 3} w={1} h={1} f="#a85000" />
      <R x={x + 4} y={y + 4} w={1} h={1} f="#a85000" />
      <R x={x + 4} y={y + 6} w={1} h={1} f="#a85000" />
    </g>
  );
}

function Pipe({ x, top }: { x: number; top: number }) {
  return (
    <g>
      <R x={x} y={top} w={14} h={5} f={INK} />
      <R x={x + 1} y={top + 1} w={12} h={3} f={GREEN} />
      <R x={x + 2} y={top + 1} w={2} h={3} f={LIGHT_GREEN} />
      <R x={x + 1} y={top + 5} w={12} h={GROUND_Y - top - 5} f={INK} />
      <R x={x + 2} y={top + 5} w={10} h={GROUND_Y - top - 5} f={GREEN} />
      <R x={x + 3} y={top + 5} w={2} h={GROUND_Y - top - 5} f={LIGHT_GREEN} />
      <R x={x + 10} y={top + 5} w={1} h={GROUND_Y - top - 5} f={DARK_GREEN} />
    </g>
  );
}

function Ground() {
  const blocks = [];
  for (let x = 0; x < W; x += 8) {
    blocks.push(
      <g key={x}>
        <R x={x} y={GROUND_Y} w={8} h={H - GROUND_Y} f={BRICK} />
        <R x={x} y={GROUND_Y} w={8} h={1} f="#fcbcb0" />
        <R x={x + 7} y={GROUND_Y} w={1} h={H - GROUND_Y} f={INK} />
        <R x={x} y={GROUND_Y + 3} w={8} h={1} f={INK} />
      </g>,
    );
  }
  return <g>{blocks}</g>;
}

export function SceneBack() {
  return (
    <>
      <R x={0} y={0} w={W} h={H} f={SKY} />
      <Cloud x={6} y={5} />
      <Cloud x={74} y={3} />
      <Hill x={26} width={30} height={12} />
      <Hill x={62} width={18} height={7} />
      {/* Bushes */}
      <R x={4} y={GROUND_Y - 3} w={10} h={3} f={GREEN} />
      <R x={6} y={GROUND_Y - 4} w={6} h={1} f={GREEN} />
      <BrickBlock x={44} y={18} />
      <QuestionBlock x={52} y={18} />
      <BrickBlock x={60} y={18} />
      <AnimatedSprite frames={COIN} fps={6} x={52} y={8} />
      <Pipe x={102} top={30} />
      <Ground />
    </>
  );
}

export const sceneLabel = 'The two heroes on a sunny Mushroom Kingdom level';
