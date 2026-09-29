import { ChefHat, Clover, Coins, Heart, Leaf, Moon, Shirt, ShoppingCart, Sparkles, Sun } from 'lucide-react';
import type { SkillDefinition } from '../../types';

const icons = {
  sparkles: Sparkles,
  chef: ChefHat,
  coins: Coins,
  sun: Sun,
  hearts: Heart,
  shirt: Shirt,
  cart: ShoppingCart,
  leaf: Leaf,
  moon: Moon,
  clover: Clover,
};

export function SkillIcon({ icon, size = 18 }: { icon: SkillDefinition['icon']; size?: number }) {
  const Icon = icons[icon];
  return <Icon size={size} />;
}
