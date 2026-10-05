import { HUSBAND_AVATAR_ROWS, WIFE_AVATAR_ROWS } from '../../assets/avatarSprites';
import { KNIGHT, MAGE, withBlink, type Sprite } from '../../assets/sprites';
import { useActiveAvatar } from '../../context/GameContext';
import type { AvatarId, CharacterId } from '../../types';
import { PixelSprite } from './pixel/PixelSprite';

const framesOf = (table: Record<string, readonly string[]>) =>
  Object.fromEntries(Object.entries(table).map(([id, rows]) => [id, withBlink(rows, 7)])) as Partial<Record<AvatarId, Sprite[]>>;

/** Sprite frames per character and avatar: husband avatars on the knight's 16 px grid, wife's on the mage's 18 px one. */
export const AVATAR_SPRITES: Record<CharacterId, Partial<Record<AvatarId, Sprite[]>>> = {
  husband: { knight: KNIGHT, ...framesOf(HUSBAND_AVATAR_ROWS) },
  wife: { mage: MAGE, ...framesOf(WIFE_AVATAR_ROWS) },
};

/** Frames for a character's avatar (the default if unknown). */
export function avatarFrames(characterId: CharacterId, avatar: AvatarId): Sprite[] {
  return AVATAR_SPRITES[characterId][avatar] ?? (characterId === 'husband' ? KNIGHT : MAGE);
}
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
  avatar,
}: {
  id: CharacterId;
  /** Show this avatar instead of the one the character wears (picker previews). */
  avatar?: AvatarId;
  scale?: number;
  framed?: boolean;
  className?: string;
}) {
  const worn = useActiveAvatar(id);
  const sprite = <PixelSprite frames={avatarFrames(id, avatar ?? worn)} scale={scale} fps={4} sequence={BLINK[id]} />;
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
