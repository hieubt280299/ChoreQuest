import { Cake, Clock, Coins, Heart, Lightbulb, Shield, Shirt, ShoppingCart, Sparkles, Zap } from 'pixelarticons/react';
import type { SkillDefinition } from '../../types';
import { Icon } from './Icon';

const icons = {
  sparkles: Sparkles,
  chef: Cake,
  coins: Coins,
  zap: Zap,
  hearts: Heart,
  shirt: Shirt,
  cart: ShoppingCart,
  lightbulb: Lightbulb,
  shield: Shield,
  clock: Clock,
};

export function SkillIcon({ icon, size = 24 }: { icon: SkillDefinition['icon']; size?: 12 | 24 | 36 }) {
  return <Icon as={icons[icon]} size={size} />;
}
