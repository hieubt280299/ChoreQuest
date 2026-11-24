import { Check, Lock } from 'pixelarticons/react';
import type { ReactNode } from 'react';
import { Icon } from '../ui/Icon';

/**
 * A theme or avatar tile. In the Wardrobe it is active, owned or locked; in the reward dialog every tile is a reward
 * to pick ("pick"), highlighted once selected.
 */
export function Tile({
  label,
  state,
  selected,
  onClick,
  children,
}: {
  label: string;
  state: 'active' | 'owned' | 'locked' | 'pick';
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const disabled = state === 'locked';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state === 'active' || selected}
      className={`px-slot px-focus relative flex min-w-0 flex-col items-center gap-1.5 p-2 text-center ${
        state === 'active' || selected ? 'shadow-[0_0_0_3px_#ffd166]' : ''
      } ${disabled ? 'cursor-not-allowed opacity-70 saturate-50' : 'cursor-pointer hover:brightness-105'}`}
    >
      {children}
      <span className="w-full break-words text-sm font-extrabold uppercase leading-tight">{label}</span>
      {(state === 'active' || selected) && <Icon as={Check} size={24} className="absolute right-0.5 top-0.5 text-moss-600" />}
      {state === 'locked' && <Icon as={Lock} size={12} className="absolute right-1 top-1 text-wood-600" />}
    </button>
  );
}
