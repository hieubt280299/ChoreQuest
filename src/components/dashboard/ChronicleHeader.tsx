import { CircleInfo, Gift, Hourglass } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId } from '../../types';
import { calculatePayout, endOfDayMs, formatCountdown } from '../../utils/calculations';
import { CharacterName } from '../ui/CharacterName';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';
import { Vnd } from '../ui/Vnd';

const IDS: CharacterId[] = ['husband', 'wife'];
// Knight red and mage plum, as on the calendar pips.
const SPLIT_COLORS: Record<CharacterId, string> = {
  husband: 'bg-brick-500 shadow-[inset_0_-3px_0_0_#6e2a22]',
  wife: 'bg-plum-500 shadow-[inset_0_-3px_0_0_#5a3566]',
};

/** One banner for the running chronicle: number, time left, prize pool and the live payout split. */
export function ChronicleHeader() {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  const { state } = useGame();
  const { chronicle } = state;
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { days, hours, minutes } = formatCountdown(Math.max(0, endOfDayMs(chronicle.endDate) - now));
  const gold = { husband: state.characters.husband.gold, wife: state.characters.wife.gold };
  const payout = calculatePayout(state.prizePool, gold.husband, gold.wife);
  const share = state.prizePool > 0 ? Math.round((payout.husband / state.prizePool) * 100) : 50;
  const percent: Record<CharacterId, number> = { husband: share, wife: 100 - share };
  const digit = (value: number, unit: string) => (
    <span className="flex items-baseline gap-0.5">
      <span className="font-arcade text-sm text-flame-300">{String(value).padStart(2, '0')}</span>
      <span className="text-sm font-bold uppercase text-parchment-300">{unit}</span>
    </span>
  );

  return (
    <section className="px-panel px-panel-wood space-y-3 p-4 text-parchment-50" aria-label={t('chronicle.label', { id: chronicle.id })}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 text-xl font-extrabold uppercase leading-none text-flame-300">
          <Icon as={Hourglass} size={24} />
          {t('chronicle.label', { id: chronicle.id })}
          <Tooltip
            label={<Icon as={CircleInfo} size={24} className="text-parchment-300" />}
            content={t('dashboard.goldResets')}
            triggerClassName="align-middle"
          />
        </h2>
        <div
          className="px-slot-dark flex items-center gap-3 px-3 py-1.5"
          role="timer"
          aria-label={`${t('dashboard.monthTimer')}: ${t('dashboard.days', { days, hours, minutes })}`}
        >
          {digit(days, 'd')}
          {digit(hours, 'h')}
          {digit(minutes, 'm')}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-base font-extrabold uppercase text-parchment-300">
          <Icon as={Gift} size={24} className="text-flame-300" />
          {t('dashboard.prizePool')}
        </span>
        <Vnd amount={state.prizePool} className="text-base text-flame-300" />
      </div>

      {/* Live payout split: who would take how much if the chronicle ended now. */}
      <div>
        <div
          className="flex h-4 bg-wood-900 shadow-[0_0_0_3px_#1f130c]"
          role="img"
          aria-label={IDS.map((id) => `${name(id)} ${percent[id]}%`).join(' · ')}
        >
          {IDS.map((id) => (
            <div key={id} className={`h-full ${SPLIT_COLORS[id]}`} style={{ width: `${percent[id]}%` }} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {IDS.map((id) => (
            <div key={id} className={`flex min-w-0 items-center gap-2 ${id === 'wife' ? 'flex-row-reverse text-right' : ''}`}>
              <CharacterAvatar id={id} scale={1} framed={false} />
              <div className="min-w-0">
                <p
                  className={`flex min-w-0 items-baseline gap-1 text-sm font-extrabold uppercase leading-tight text-parchment-100 ${
                    id === 'wife' ? 'justify-end' : ''
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 ${SPLIT_COLORS[id]}`} aria-hidden />
                  <span className="min-w-0 truncate"><CharacterName id={id} /></span>
                  <span className="shrink-0 text-flame-300">{percent[id]}%</span>
                </p>
                <Vnd amount={payout[id]} className="text-[9px] text-parchment-50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
