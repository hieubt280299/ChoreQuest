import { KNIGHT, MAGE } from '../../assets/sprites';
import type { CharacterId } from '../../types';
import { PixelSprite } from './pixel/PixelSprite';

// Husband is the knight, wife is the mage. Swap here to change who is who.
export const CHARACTER_SPRITES = { husband: KNIGHT, wife: MAGE } as const;
const BLINK: Record<CharacterId, number[]> = {
  husband: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  wife: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
};

/** Character sprite inside a sunken inventory-style frame. */
export function CharacterAvatar({
  id,
  scale = 3,
  framed = true,
  className = '',
}: {
  id: CharacterId;
  scale?: number;
  framed?: boolean;
  className?: string;
}) {
  const sprite = <PixelSprite frames={CHARACTER_SPRITES[id]} scale={scale} fps={4} sequence={BLINK[id]} />;
  if (!framed) return sprite;
  return (
    <span
      className={`px-slot-dark inline-flex items-end justify-center p-1.5 ${className}`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(243,154,61,0.35), transparent 70%)' }}
    >
      {sprite}
    </span>
  );
}
