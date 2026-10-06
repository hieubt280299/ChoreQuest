import { CAT } from '../../assets/sprites';
import { AnimatedSprite } from '../../components/ui/pixel/PixelSprite';
import { SCENE_H as H, SCENE_W as W } from '../scene';
import './theme.css';

// Whimsical Cottage: a soft painted meadow with a thatched cottage, a big tree, wildflowers and drifting
// chimney smoke, in pastel greens, sunlight yellow and floral pinks.
const GROUND_Y = 42;
const R = ({ x, y, w, h, f, className }: { x: number; y: number; w: number; h: number; f: string; className?: string }) => (
  <rect x={x} y={y} width={w} height={h} fill={f} className={className} />
);

function Sky({ hour }: { hour: number }) {
  const evening = hour >= 18 || hour < 6;
  const top = evening ? '#e7a7a0' : '#a9d8ec';
  const mid = evening ? '#f4cfa8' : '#cbe8f2';
  return (
    <g>
      <R x={0} y={0} w={W} h={H} f={mid} />
      <R x={0} y={0} w={W} h={10} f={top} />
      <R x={0} y={10} w={W} h={2} f={top} className="opacity-60" />
      {/* Sun */}
      <R x={96} y={5} w={8} h={8} f="#fff0a8" />
      <R x={95} y={6} w={10} h={6} f="#fff0a8" />
      <R x={98} y={7} w={4} h={4} f="#ffe27a" />
      {/* Soft clouds */}
      <R x={10} y={6} w={14} h={3} f="#ffffff" className="opacity-80" />
      <R x={13} y={4} w={8} h={2} f="#ffffff" className="opacity-80" />
      <R x={56} y={9} w={12} h={2} f="#ffffff" className="opacity-70" />
    </g>
  );
}

function Hills() {
  return (
    <g>
      <R x={0} y={30} w={40} h={12} f="#b3cf8c" />
      <R x={4} y={28} w={30} h={2} f="#b3cf8c" />
      <R x={70} y={32} w={50} h={10} f="#a3c47c" />
      <R x={78} y={30} w={36} h={2} f="#a3c47c" />
    </g>
  );
}

function Tree() {
  return (
    <g>
      <R x={8} y={24} w={4} h={GROUND_Y - 24} f="#7a5a3a" />
      <R x={9} y={24} w={1} h={GROUND_Y - 24} f="#9c7a52" />
      <R x={1} y={10} w={18} h={14} f="#6a8a4c" />
      <R x={3} y={7} w={14} h={3} f="#6a8a4c" />
      <R x={4} y={11} w={6} h={4} f="#8bab66" />
      <R x={12} y={15} w={5} h={3} f="#8bab66" />
      <R x={5} y={19} w={2} h={2} f="#eaa6bb" />
      <R x={14} y={11} w={2} h={2} f="#eaa6bb" />
    </g>
  );
}

function Cottage() {
  return (
    <g>
      {/* Chimney and smoke */}
      <R x={68} y={10} w={4} h={8} f="#b5607a" />
      <R x={67} y={9} w={6} h={2} f="#8e4a5e" />
      <R x={69} y={5} w={3} h={2} f="#ffffff" className="twinkle opacity-70" />
      <R x={71} y={2} w={3} h={2} f="#ffffff" className="twinkle opacity-60" />
      {/* Thatched roof */}
      <R x={40} y={16} w={40} h={2} f="#8a6a3a" />
      <R x={42} y={14} w={36} h={2} f="#c9a46a" />
      <R x={45} y={12} w={30} h={2} f="#d8b77c" />
      <R x={49} y={10} w={22} h={2} f="#c9a46a" />
      <R x={53} y={8} w={14} h={2} f="#d8b77c" />
      {/* Walls with timber frame */}
      <R x={44} y={18} w={32} h={GROUND_Y - 18} f="#fbf6e6" />
      <R x={44} y={18} w={32} h={1} f="#8c775a" />
      <R x={44} y={18} w={1} h={GROUND_Y - 18} f="#8c775a" />
      <R x={75} y={18} w={1} h={GROUND_Y - 18} f="#8c775a" />
      <R x={59} y={18} w={2} h={GROUND_Y - 18} f="#8c775a" />
      {/* Round-topped door */}
      <R x={56} y={30} w={8} h={GROUND_Y - 30} f="#8c5a3a" />
      <R x={57} y={29} w={6} h={1} f="#8c5a3a" />
      <R x={62} y={36} w={1} h={1} f="#ffe27a" />
      {/* Windows with flower boxes */}
      {[47, 66].map((x) => (
        <g key={x}>
          <R x={x} y={23} w={7} h={6} f="#8c775a" />
          <R x={x + 1} y={24} w={5} h={4} f="#cbe8f2" />
          <R x={x + 3} y={24} w={1} h={4} f="#8c775a" />
          <R x={x} y={29} w={7} h={2} f="#8c5a3a" />
          <R x={x + 1} y={28} w={1} h={1} f="#d4809a" />
          <R x={x + 3} y={28} w={1} h={1} f="#ffe27a" />
          <R x={x + 5} y={28} w={1} h={1} f="#d4809a" />
        </g>
      ))}
    </g>
  );
}

function Meadow() {
  const flowers: [number, number, string][] = [
    [6, 46, '#d4809a'], [18, 49, '#ffe27a'], [28, 45, '#ffffff'], [36, 50, '#d4809a'], [52, 47, '#ffe27a'],
    [70, 49, '#d4809a'], [80, 45, '#ffffff'], [90, 48, '#ffe27a'], [104, 46, '#d4809a'], [114, 50, '#ffffff'],
  ];
  return (
    <g>
      <R x={0} y={GROUND_Y} w={W} h={H - GROUND_Y} f="#8bab66" />
      <R x={0} y={GROUND_Y} w={W} h={1} f="#6a8a4c" />
      {/* Stone path to the door */}
      <R x={56} y={GROUND_Y + 1} w={8} h={2} f="#d8ccb0" />
      <R x={54} y={GROUND_Y + 4} w={10} h={2} f="#d8ccb0" />
      <R x={52} y={GROUND_Y + 8} w={12} h={2} f="#d8ccb0" />
      {flowers.map(([x, y, color]) => (
        <g key={`${x}-${y}`}>
          <R x={x} y={y + 1} w={1} h={2} f="#4f6b3a" />
          <R x={x - 1} y={y} w={3} h={1} f={color} />
        </g>
      ))}
    </g>
  );
}

export function SceneBack({ hour }: { hour: number }) {
  return (
    <>
      <Sky hour={hour} />
      <Hills />
      <Tree />
      <Cottage />
      <Meadow />
    </>
  );
}

/** The cat naps on the path. */
export function SceneFront() {
  return <AnimatedSprite frames={CAT} fps={2} sequence={[0, 0, 0, 0, 0, 1, 0, 1]} x={66} y={44} />;
}

export const sceneLabel = 'The two heroes outside a cosy cottage in a flowery meadow';
