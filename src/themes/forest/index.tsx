import { SCENE_H as H, SCENE_W as W } from '../scene';
import './theme.css';

// Enchanted Forest: a moonlit clearing between ancient trunks, with a glowing rune stone, bioluminescent
// mushrooms and drifting fireflies, in deep emeralds and earthy browns.
const GROUND_Y = 42;
const R = ({ x, y, w, h, f, className, opacity }: { x: number; y: number; w: number; h: number; f: string; className?: string; opacity?: number }) => (
  <rect x={x} y={y} width={w} height={h} fill={f} className={className} opacity={opacity} />
);

function Canopy() {
  return (
    <g>
      <R x={0} y={0} w={W} h={H} f="#10241b" />
      {/* Moon glow through the leaves */}
      <R x={56} y={4} w={8} h={8} f="#dcffbe" opacity={0.85} />
      <R x={55} y={5} w={10} h={6} f="#dcffbe" opacity={0.85} />
      <R x={50} y={0} w={20} h={18} f="#6fe0d0" opacity={0.08} />
      {/* Distant tree silhouettes */}
      {[8, 22, 38, 74, 90, 104].map((x, index) => (
        <g key={x}>
          <R x={x} y={12 + (index % 3) * 3} w={10} h={GROUND_Y} f="#162b22" />
          <R x={x - 3} y={8 + (index % 3) * 3} w={16} h={8} f="#1f3d2e" />
        </g>
      ))}
      {/* Leafy top band */}
      <R x={0} y={0} w={W} h={5} f="#0b1712" />
      {[0, 14, 30, 46, 70, 86, 102].map((x) => (
        <R key={x} x={x} y={4} w={12} h={3} f="#0b1712" />
      ))}
    </g>
  );
}

function Trunk({ x }: { x: number }) {
  return (
    <g>
      <R x={x} y={0} w={9} h={GROUND_Y + 2} f="#3e2616" />
      <R x={x + 1} y={0} w={2} h={GROUND_Y + 2} f="#5e3a22" />
      <R x={x + 6} y={10} w={1} h={8} f="#2a180c" />
      <R x={x - 2} y={GROUND_Y - 2} w={13} h={4} f="#3e2616" />
      {/* Moss */}
      <R x={x} y={18} w={3} h={4} f="#3f7a36" />
      <R x={x + 5} y={30} w={4} h={3} f="#3f7a36" />
    </g>
  );
}

function RuneStone() {
  return (
    <g>
      <R x={55} y={22} w={10} h={GROUND_Y - 22} f="#5f7a4e" />
      <R x={56} y={21} w={8} h={1} f="#5f7a4e" />
      <R x={56} y={22} w={2} h={GROUND_Y - 22} f="#8aa274" />
      {/* Glowing rune */}
      <g className="twinkle">
        <R x={59} y={26} w={2} h={8} f="#6fe0d0" />
        <R x={57} y={28} w={6} h={1} f="#6fe0d0" />
        <R x={58} y={32} w={4} h={1} f="#6fe0d0" />
        <R x={52} y={24} w={16} h={14} f="#2cc4b4" opacity={0.12} />
      </g>
    </g>
  );
}

function Mushroom({ x, y, big }: { x: number; y: number; big?: boolean }) {
  const w = big ? 6 : 4;
  return (
    <g>
      <R x={x - 2} y={y - 3} w={w + 4} h={6} f="#2cc4b4" opacity={0.18} />
      <R x={x + w / 2 - 1} y={y} w={2} h={3} f="#e2ecd6" />
      <R x={x} y={y - 2} w={w} h={2} f="#2cc4b4" />
      <R x={x + 1} y={y - 3} w={w - 2} h={1} f="#2cc4b4" />
      <R x={x + 1} y={y - 2} w={1} h={1} f="#a8f0e4" />
    </g>
  );
}

function Ground() {
  return (
    <g>
      <R x={0} y={GROUND_Y} w={W} h={H - GROUND_Y} f="#1f3d2e" />
      <R x={0} y={GROUND_Y} w={W} h={1} f="#3f7a36" />
      {[6, 20, 34, 48, 66, 80, 96, 110].map((x) => (
        <R key={x} x={x} y={GROUND_Y + 1} w={3} h={1} f="#56a046" />
      ))}
      {/* Mossy path */}
      <R x={44} y={GROUND_Y + 5} w={32} h={2} f="#2b553f" />
      <R x={40} y={GROUND_Y + 9} w={40} h={2} f="#2b553f" />
    </g>
  );
}

export function SceneBack() {
  return (
    <>
      <Canopy />
      <Trunk x={0} />
      <Trunk x={111} />
      <RuneStone />
      <Ground />
      <Mushroom x={30} y={GROUND_Y + 1} big />
      <Mushroom x={36} y={GROUND_Y + 2} />
      <Mushroom x={78} y={GROUND_Y + 1} />
      <Mushroom x={84} y={GROUND_Y + 2} big />
    </>
  );
}

/** Fireflies drift in front of everything. */
export function SceneFront() {
  const flies: [number, number][] = [[14, 20], [28, 12], [44, 30], [70, 16], [92, 26], [104, 12], [62, 8], [36, 38]];
  return (
    <g>
      {flies.map(([x, y], index) => (
        <g key={`${x}-${y}`} className="twinkle" style={{ animationDelay: `${-index * 0.4}s` }}>
          <R x={x - 1} y={y - 1} w={3} h={3} f="#dcff8a" opacity={0.25} />
          <R x={x} y={y} w={1} h={1} f="#ecffbe" />
        </g>
      ))}
    </g>
  );
}

export const sceneLabel = 'The two heroes in a glowing forest clearing by a rune stone';
