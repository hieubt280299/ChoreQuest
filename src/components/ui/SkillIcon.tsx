import { Cake, Coins, Heart, Leaf, Moon, Shirt, ShoppingCart, Sparkles, Star, Sun } from 'pixelarticons/react';
import type { SkillDefinition } from '../../types';
import { Icon } from './Icon';

const icons = {
  sparkles: Sparkles,
  chef: Cake,
  coins: Coins,
  sun: Sun,
  hearts: Heart,
  shirt: Shirt,
  cart: ShoppingCart,
  leaf: Leaf,
  moon: Moon,
  clover: Star,
};

export function SkillIcon({ icon, size = 24 }: { icon: SkillDefinition['icon']; size?: 12 | 24 | 36 }) {
  return <Icon as={icons[icon]} size={size} />;
}
