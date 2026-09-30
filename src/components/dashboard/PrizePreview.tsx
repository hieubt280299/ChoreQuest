import { Gift } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { calculatePayout } from '../../utils/calculations';
import { Card } from '../ui/Card';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Vnd } from '../ui/Vnd';

export function PrizePreview() {
  const { t } = useLanguage();
  const { state } = useGame();
  const payout = calculatePayout(state.prizePool, state.characters.husband.gold, state.characters.wife.gold);

  return (
    <Card>
      <div className="mb-2 flex items-center gap-2 text-brick-600">
        <Icon as={Gift} size={24} />
        <p className="text-lg font-extrabold uppercase tracking-wide">{t('dashboard.prizePool')}</p>
      </div>
      <Vnd amount={state.prizePool} className="text-lg text-ink" />
      <div className="mt-4 grid grid-cols-2 gap-4">
        {(['husband', 'wife'] as CharacterId[]).map((id) => (
          <div key={id} className="px-slot flex items-center gap-2 p-2">
            <CharacterAvatar id={id} scale={2} framed={false} />
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase text-wood-600">{t(`character.${id}`)}</p>
              <Vnd amount={payout[id]} className="block truncate text-[10px] text-ink" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-base text-wood-600">{t('dashboard.goldResets')}</p>
    </Card>
  );
}
