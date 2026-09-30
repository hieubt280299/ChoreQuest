import { getXpProgress } from '../../utils/calculations';

// Dota-style level circle: the level number inside a disc, wrapped by an XP gauge that fills
// clockwise from 12 o'clock and resets on level up. Segmented to match the pixel theme.
const SEGMENTS = 20;
const GAP_DEG = 4;
const CENTER = 32;
const RING_R = 26;

function point(radius: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return `${(CENTER + radius * Math.sin(rad)).toFixed(2)} ${(CENTER - radius * Math.cos(rad)).toFixed(2)}`;
}

const segmentPaths = Array.from({ length: SEGMENTS }, (_, index) => {
  const span = 360 / SEGMENTS;
  const start = index * span + GAP_DEG / 2;
  const end = (index + 1) * span - GAP_DEG / 2;
  return `M ${point(RING_R, start)} A ${RING_R} ${RING_R} 0 0 1 ${point(RING_R, end)}`;
});

export function LevelRing({ xp, size = 56, label, className = '' }: { xp: number; size?: number; label?: string; className?: string }) {
  const { level, percent } = getXpProgress(xp);
  const filled = Math.floor((percent / 100) * SEGMENTS);
  const digits = String(level);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? `LV ${level} · ${Math.floor(percent)}%`}
      className={`shrink-0 ${className}`}
    >
      <circle cx={CENTER} cy={CENTER} r={31.5} fill="#2b1a12" />
      {segmentPaths.map((d, index) => (
        <path
          key={index}
          d={d}
          fill="none"
          strokeWidth={6}
          stroke={index < filled ? '#f7c548' : '#5a3621'}
          style={{ transition: `stroke 120ms steps(1) ${index * 35}ms` }}
        />
      ))}
      <circle cx={CENTER} cy={CENTER} r={21.5} fill="#1f130c" />
      <circle cx={CENTER} cy={CENTER} r={20} fill="#8f3a2c" />
      <circle cx={CENTER} cy={CENTER} r={18.5} fill="none" stroke="#6e2a22" strokeWidth={3} />
      <text
        x={CENTER + 1.5}
        y={CENTER + 1.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Press Start 2P', monospace"
        fontSize={digits.length > 1 ? 15 : 18}
        fill="#2b1a12"
      >
        {digits}
      </text>
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Press Start 2P', monospace"
        fontSize={digits.length > 1 ? 15 : 18}
        fill="#ffd166"
      >
        {digits}
      </text>
    </svg>
  );
}
