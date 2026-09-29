import { Coins } from 'lucide-react';
import { formatGold } from '../../utils/calculations';

export function GoldCounter({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-warm px-3 py-1 text-sm font-extrabold text-amber-800 ${className}`}
    >
      <Coins size={14} className="text-amber-600" />
      {formatGold(amount)}
    </span>
  );
}
