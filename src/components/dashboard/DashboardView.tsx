import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId } from '../../types';
import { endOfDayMs, formatCountdown, formatGold, getLevelFromXp } from '../../utils/calculations';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { CabinScene } from './CabinScene';
import { CharacterCard } from './CharacterCard';
import { MonthTimer } from './MonthTimer';
import { PrizePreview } from './PrizePreview';

export function DashboardView() {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  const { state, activeCharacter } = useGame();

  // Live party summary, e.g. "Chronicle 3 · 12 days left · 1,240 gold earned". Days match the countdown.
  const { days } = formatCountdown(Math.max(0, endOfDayMs(state.chronicle.endDate) - Date.now()));
  const gold = state.characters.husband.gold + state.characters.wife.gold;
  const subtitle = [
    t('chronicle.label', { id: state.chronicle.id }),
    days > 1 ? t('dashboard.daysLeft', { count: days }) : days === 1 ? t('dashboard.dayLeft') : t('dashboard.lastDay'),
    t('dashboard.goldEarned', { gold: formatGold(gold) }),
  ].join(' · ');

  const plate = (id: CharacterId) => (
    <span className="flex flex-col items-center gap-1">
      <span className="max-w-[9rem] truncate bg-ink/80 px-1.5 text-sm font-bold uppercase leading-tight text-parchment-50">
        {name(id)}
      </span>
      <LevelBadge level={getLevelFromXp(state.characters[id].xp)} />
    </span>
  );

  return (
    <section className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={subtitle} />
      <div className="px-panel px-panel-wood p-2">
        <CabinScene className="mx-auto max-w-2xl" labels={{ husband: plate('husband'), wife: plate('wife') }} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => (
          <CharacterCard
            key={id}
            character={state.characters[id]}
            active={activeCharacter === id}
          />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <MonthTimer />
        <PrizePreview />
      </div>
    </section>
  );
}
