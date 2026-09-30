import type { ReactNode } from 'react';

const tones = {
  parchment: 'px-panel',
  wood: 'px-panel px-panel-wood',
  ember: 'px-panel px-panel-ember',
  moss: 'px-panel px-panel-moss',
};

export function Card({
  children,
  className = '',
  tone = 'parchment',
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof tones;
}) {
  return <div className={`${tones[tone]} p-5 ${className}`}>{children}</div>;
}
