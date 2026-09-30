import { COIN } from '../../assets/sprites';
import { formatGold } from '../../utils/calculations';
import { PixelSprite } from './pixel/PixelSprite';

export function GoldCounter({
  amount,
  className = '',
  spin = false,
  size = 'sm',
}: {
  amount: number;
  className?: string;
  /** Animate the coin; keep for hero spots so long lists stay calm. */
  spin?: boolean;
  size?: 'sm' | 'lg';
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-arcade text-ink ${size === 'lg' ? 'text-[14px]' : 'text-[10px]'} ${className}`}
    >
      <PixelSprite frames={spin ? COIN : [COIN[0]]} fps={6} scale={size === 'lg' ? 3 : 2} />
      {formatGold(amount)}
    </span>
  );
}
