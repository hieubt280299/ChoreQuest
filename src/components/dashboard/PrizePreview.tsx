import { Gift } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculatePayout, formatVnd } from '../../utils/calculations';
import { Card } from '../ui/Card';

export function PrizePreview() {
  const { t } = useLanguage();
  const { state } = useGame();
  const payout = calculatePayout(
    state.prizePool,
    state.characters.husband.gold,
    state.characters.wife.gold,
  );

  return (
    <Card className="bg-gradient-to-br from-white to-rose-soft">
      <div className="mb-3 flex items-center gap-2 text-rose-700">
        <Gift size={18} />
        <p className="text-xs font-bold uppercase tracking-widest">{t('dashboard.prizePool')}</p>
      </div>
      <p className="font-display text-2xl text-stone-800">{formatVnd(state.prizePool)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-stone-500">{t('character.husband')}</p>
          <p className="font-bold text-stone-800">{formatVnd(payout.husband)}</p>
        </div>
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-stone-500">{t('character.wife')}</p>
          <p className="font-bold text-stone-800">{formatVnd(payout.wife)}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">{t('dashboard.goldResets')}</p>
    </Card>
  );
}
