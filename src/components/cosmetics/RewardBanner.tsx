import { Trophy } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { rewardCopy } from './rewardCopy';

/** From Day 1 of a new chronicle, each player is invited to pick their unlocks (an avatar; the winner also a theme). */
export function RewardBanner({ onOpen }: { onOpen: () => void }) {
  const { t } = useLanguage();
  const { activeCharacter, canRename, pendingReward } = useGame();
  const reward = canRename(activeCharacter) ? pendingReward(activeCharacter) : null;
  if (!reward) return null;
  const copy = rewardCopy(reward);

  return (
    <Card tone="ember" className="flex flex-wrap items-center gap-3 p-4">
      <Icon as={Trophy} size={36} className="px-blink text-brick-700" />
      <div className="min-w-[12rem] flex-1">
        <p className="text-lg font-extrabold uppercase leading-tight">
          {t(copy.title, { id: reward.chronicleId })}
        </p>
        <p className="text-base">{t(copy.hint)}</p>
      </div>
      <Button variant="brick" className="w-full sm:w-auto" onClick={onOpen}>
        {t('cosmetics.choose')}
      </Button>
    </Card>
  );
}
