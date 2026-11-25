import { Crown, Heart, Star, Sword, Trophy } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, ChronicleResult } from '../../types';
import { formatDateRange, formatGold, formatVnd } from '../../utils/calculations';
import { chronicleSummary } from '../../utils/chronicleRewards';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { Vnd } from '../ui/Vnd';
import { ChronicleAwards } from './ChronicleAwards';
import { GoldRaceChart } from './GoldRaceChart';

const IDS: CharacterId[] = ['husband', 'wife'];

/** "+12%" / "−8%" for a gold change against the chronicle before. */
const percent = (change: number) => `${change >= 0 ? '+' : '−'}${Math.round(Math.abs(change) * 100)}%`;

/**
 * A chronicle's results: the winner and by how much, both players' gold (and its change since the chronicle
 * before), MVP days, hearts, Lucky Quests and prize, the gold race, the quests done together and the awards. Shown the
 * first time the app opens during the next chronicle (with a shortcut to that chronicle's rewards), and again from
 * History (`reopened`).
 */
export function ChronicleSummaryModal({
  result,
  reopened = false,
  onClose,
  onOpenRewards,
}: {
  result: ChronicleResult | null;
  /** Opened again from History: just a Close button, no rewards shortcut. */
  reopened?: boolean;
  onClose: () => void;
  onOpenRewards: () => void;
}) {
  const { t, locale } = useLanguage();
  const { state, activeCharacter, canRename, pendingReward } = useGame();
  const summary = result ? chronicleSummary(result, state) : null;
  const hasRewards = !reopened && canRename(activeCharacter) && !!pendingReward(activeCharacter);

  return (
    <Modal open={!!summary} onClose={onClose} title={summary ? t('summary.title', { id: summary.chronicleId }) : ''}>
      {summary && (
        <div className="space-y-4">
          <p className="text-base text-wood-600">{formatDateRange(summary.startDate, summary.endDate, locale)}</p>

          {/* Winner banner, and by how much. */}
          <div className="px-slot-dark flex items-center gap-3 px-3 py-2 text-flame-300">
            <Icon as={Crown} size={24} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold uppercase leading-tight">
                {summary.winner
                  ? spliceName(t('summary.winner', { who: NAME_SLOT }), <CharacterName id={summary.winner} />)
                  : t('summary.tie')}
              </p>
              {summary.winner && (
                <p className="text-sm font-bold text-parchment-100">{t('summary.margin', { gold: formatGold(summary.margin) })}</p>
              )}
            </div>
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
                    <div className="flex items-start justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.gold')}</dt>
                      <dd className="flex flex-col items-end gap-0.5">
                        <GoldCounter amount={player.gold} />
                        {/* Change since the chronicle before. */}
                        {player.goldChange !== null && summary.previousId !== null && (
                          <span
                            className={`font-arcade text-[9px] ${player.goldChange >= 0 ? 'text-moss-700' : 'text-brick-600'}`}
                            title={t('summary.change', { id: summary.previousId })}
                          >
                            {percent(player.goldChange)}
                            <span className="sr-only"> {t('summary.change', { id: summary.previousId })}</span>
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.mvp')}</dt>
                      <dd className="font-arcade text-[10px]">{player.mvpDays}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.hearts')}</dt>
                      <dd className="inline-flex items-center gap-1 font-arcade text-[10px]">
                        <Icon as={Heart} size={12} className="text-brick-600" />
                        {player.hearts}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="font-bold uppercase text-wood-600">{t('summary.lucky')}</dt>
                      <dd className="inline-flex items-center gap-1 font-arcade text-[10px]">
                        <Icon as={Star} size={12} className="text-ember-600" />
                        {player.lucky}
                      </dd>
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

          {/* The story: quests done together, the race, the awards. */}
          {summary.totalQuests !== null && (
            <p className="flex items-center gap-2 text-base font-extrabold">
              <Icon as={Sword} size={24} className="shrink-0 text-brick-600" />
              {t('summary.together', { count: summary.totalQuests })}
            </p>
          )}
          {summary.goldByDay && <GoldRaceChart goldByDay={summary.goldByDay} />}
          <ChronicleAwards awards={summary.awards} />

          <p className="text-sm text-wood-600">{t('summary.split', { pool: formatVnd(summary.prizePool) })}</p>

          <div className="space-y-3">
            {hasRewards && (
              <Button className="w-full" onClick={onOpenRewards}>
                <Icon as={Trophy} size={24} />
                {t('summary.rewards')}
              </Button>
            )}
            <Button className="w-full" variant={hasRewards ? 'secondary' : 'primary'} onClick={onClose}>
              {t(reopened ? 'summary.done' : 'summary.close')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
