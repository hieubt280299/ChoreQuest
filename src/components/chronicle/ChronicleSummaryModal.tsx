import { Crown, Trophy } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, ChronicleResult } from '../../types';
import { formatDateRange, formatVnd } from '../../utils/calculations';
import { chronicleSummary } from '../../utils/chronicleRewards';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { Vnd } from '../ui/Vnd';

const IDS: CharacterId[] = ['husband', 'wife'];

/**
 * The last chronicle's results, shown the first time the app opens during the next one: the winner, both players' gold and MVP days, and
 * how the prize pool was paid out by gold share. Players with an unlock to claim can jump to the Wardrobe.
 */
export function ChronicleSummaryModal({
  result,
  onClose,
  onOpenRewards,
}: {
  result: ChronicleResult | null;
  onClose: () => void;
  onOpenRewards: () => void;
}) {
  const { t, locale } = useLanguage();
  const { state, activeCharacter, canRename, pendingReward } = useGame();
  const summary = result ? chronicleSummary(result, state.logs) : null;
  const hasRewards = canRename(activeCharacter) && !!pendingReward(activeCharacter);

  return (
    <Modal open={!!summary} onClose={onClose} title={summary ? t('summary.title', { id: summary.chronicleId }) : ''}>
      {summary && (
        <div className="space-y-4">
          <p className="text-base text-wood-600">{formatDateRange(summary.startDate, summary.endDate, locale)}</p>

          {/* Winner banner. */}
          <div className="px-slot-dark flex items-center gap-3 px-3 py-2 text-flame-300">
            <Icon as={Crown} size={24} className="shrink-0" />
            <p className="min-w-0 text-lg font-extrabold uppercase leading-tight">
              {summary.winner
                ? spliceName(t('summary.winner', { who: NAME_SLOT }), <CharacterName id={summary.winner} />)
                : t('summary.tie')}
            </p>
          </div>

          {/* One column per player. */}
          <div className="grid grid-cols-2 gap-3">
            {IDS.map((id) => {
              const player = summary.players[id];
              const won = summary.winner === id;
              return (
                <div key={id} className={`px-slot flex flex-col items-center gap-2 p-3 ${won ? 'shadow-[0_0_0_3px_#ffd166]' : ''}`}>
                  <span className="flex h-12 items-end">
                    <CharacterAvatar id={id} scale={2} framed={false} />
                  </span>
                  <p className="flex max-w-full items-center gap-1 text-lg font-extrabold">
                    {won && <Icon as={Trophy} size={24} className="shrink-0 text-ember-600" />}
                    <span className="truncate">
                      <CharacterName id={id} />
                    </span>
                  </p>
                  <dl className="w-full space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.gold')}</dt>
                      <dd>
                        <GoldCounter amount={player.gold} />
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.mvp')}</dt>
                      <dd className="font-arcade text-[10px]">{player.mvpDays}</dd>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 border-t-2 border-ink/15 pt-1.5">
                      <dt className="self-start font-bold uppercase text-wood-600">{t('summary.prize')}</dt>
                      <dd className="text-[11px]">
                        <Vnd amount={player.payout} />
                      </dd>
                      <dd className="font-arcade text-[9px] text-moss-700">{Math.round(player.share * 100)}%</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-wood-600">{t('summary.split', { pool: formatVnd(summary.prizePool) })}</p>

          <div className="space-y-3">
            {hasRewards && (
              <Button className="w-full" variant="brick" onClick={onOpenRewards}>
                <Icon as={Trophy} size={24} />
                {t('summary.rewards')}
              </Button>
            )}
            <Button className="w-full" variant={hasRewards ? 'secondary' : 'primary'} onClick={onClose}>
              {t('summary.close')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
