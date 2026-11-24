import { ChartLine, ChevronDown, Script, Trophy } from 'pixelarticons/react';
import { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId, ChronicleResult } from '../../types';
import { formatDateRange, formatGold } from '../../utils/calculations';
import { chronicleStats } from '../../utils/chronicleStats';
import type { TranslationKey } from '../../utils/i18n';
import { Card } from '../ui/Card';
import { ChronicleAwards } from '../chronicle/ChronicleAwards';
import { ChronicleSummaryModal } from '../chronicle/ChronicleSummaryModal';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';
import { Vnd } from '../ui/Vnd';

const IDS: CharacterId[] = ['husband', 'wife'];

/** Finished chronicles, newest first: payouts, per-player stats and fun awards, and the results pop-up again. */
export function PastChronicles() {
  const { t, locale } = useLanguage();
  const { state } = useGame();
  const [open, setOpen] = useState<number | null>(null);
  // A chronicle's results pop-up, reopened from here.
  const [results, setResults] = useState<ChronicleResult | null>(null);
  const entries = useMemo(
    () => state.prizeHistory.map((result) => ({ result, stats: chronicleStats(result, state.logs, state.hearts, state.freezes) })),
    [state.prizeHistory, state.logs, state.hearts, state.freezes],
  );
  if (entries.length === 0) return null;

  const rows: { key: string; value: (id: CharacterId, index: number) => string }[] = [
    { key: 'archive.quests', value: (id, index) => String(entries[index].stats.players[id].quests) },
    { key: 'archive.avgQuests', value: (id, index) => entries[index].stats.players[id].avgQuests.toFixed(1) },
    { key: 'archive.gold', value: (id, index) => formatGold(entries[index].stats.players[id].gold) },
    { key: 'archive.avgGold', value: (id, index) => formatGold(entries[index].stats.players[id].avgGold) },
    { key: 'archive.bestStreak', value: (id, index) => String(entries[index].stats.players[id].bestStreak) },
    { key: 'archive.mvpDays', value: (id, index) => String(entries[index].stats.players[id].mvpDays) },
    { key: 'archive.hearts', value: (id, index) => String(entries[index].stats.players[id].hearts) },
  ];

  return (
    <section className="space-y-4" aria-label={t('archive.title')}>
      <h2 className="px-title flex items-center gap-2 text-2xl">
        <Icon as={Script} size={24} />
        {t('archive.title')}
      </h2>
      {entries.map(({ result, stats }, index) => {
        const expanded = open === index;
        const winner = result.goldSnapshot.husband === result.goldSnapshot.wife ? null : result.goldSnapshot.husband > result.goldSnapshot.wife ? 'husband' : 'wife';
        const panelId = `archive-${result.chronicleId}-${result.startDate}`;
        return (
          <Card key={panelId} className="p-0">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(expanded ? null : index)}
              className="px-focus flex w-full items-center gap-3 p-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold leading-tight">
                  {result.chronicleId > 0 ? t('chronicle.label', { id: result.chronicleId }) : t('archive.earlier')}
                </span>
                <span className="block text-sm font-bold text-wood-600">{formatDateRange(result.startDate, result.endDate, locale)}</span>
                {winner && (
                  <span className="mt-0.5 flex items-center gap-1 text-sm font-extrabold uppercase text-ember-700">
                    <Icon as={Trophy} size={12} />
                    {spliceName(t('archive.winner', { name: NAME_SLOT }), <CharacterName id={winner} />)}
                  </span>
                )}
              </span>
              <Icon as={ChevronDown} size={24} className={`shrink-0 text-wood-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
              <div id={panelId} className="space-y-4 border-t-[3px] border-ink/20 p-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1.5 text-base">
                  <span />
                  {IDS.map((id) => (
                    <span key={id} className="flex max-w-[6.5rem] items-center justify-end gap-1 text-sm font-extrabold uppercase">
                      <CharacterAvatar id={id} scale={1} framed={false} />
                      <span className="truncate">
                        <CharacterName id={id} />
                      </span>
                    </span>
                  ))}
                  <span className="text-sm font-bold leading-tight text-wood-700">{t('archive.payout')}</span>
                  {IDS.map((id) => (
                    <Vnd key={id} amount={result.payout[id]} className="justify-self-end text-[9px] text-ink" />
                  ))}
                  {stats.hasLog &&
                    rows.map((row) => (
                      <div key={row.key} className="contents">
                        <span className="text-sm font-bold leading-tight text-wood-700">{t(row.key as TranslationKey)}</span>
                        {IDS.map((id) => (
                          <span key={id} className="justify-self-end font-arcade text-[10px]">
                            {row.value(id, index)}
                          </span>
                        ))}
                      </div>
                    ))}
                </div>
                {stats.hasLog ? <ChronicleAwards awards={stats.awards} /> : <p className="text-sm text-wood-600">{t('archive.noLog')}</p>}
                <Button className="w-full" variant="secondary" onClick={() => setResults(result)}>
                  <Icon as={ChartLine} size={24} />
                  {t('archive.seeResults')}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
      <ChronicleSummaryModal result={results} reopened onClose={() => setResults(null)} onOpenRewards={() => setResults(null)} />
    </section>
  );
}
