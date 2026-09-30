import type { CSSProperties } from 'react';

const fills = {
  xp: { '--fill': '#f7c548', '--fill-gap': '#c85f1f' },
  moss: { '--fill': '#86b049', '--fill-gap': '#4f7030' },
  ember: { '--fill': '#f39a3d', '--fill-gap': '#a44a14' },
} as const;

export function ProgressBar({
  percent,
  className = '',
  tone = 'xp',
  label,
}: {
  percent: number;
  className?: string;
  tone?: keyof typeof fills;
  label?: string;
}) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={`px-bar ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <div className="px-bar-fill" style={{ width: `${value}%`, ...fills[tone] } as CSSProperties} />
    </div>
  );
}
