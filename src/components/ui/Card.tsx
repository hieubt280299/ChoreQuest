import type { ReactNode } from 'react';

const tones = {
  parchment: 'px-panel',
  wood: 'px-panel px-panel-wood',
  ember: 'px-panel px-panel-ember',
  moss: 'px-panel px-panel-moss',
  // Completed-quest tints by who did it.
  knight: 'px-panel px-panel-knight',
  mage: 'px-panel px-panel-mage',
  coop: 'px-panel px-panel-coop',
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
