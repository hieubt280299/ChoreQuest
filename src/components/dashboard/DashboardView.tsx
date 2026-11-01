import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { AppView, CharacterId } from '../../types';
import { formatGold, getLevelFromXp } from '../../utils/calculations';
import { CharacterName } from '../ui/CharacterName';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { CabinScene } from './CabinScene';
import { CharacterCard } from './CharacterCard';
import { ChronicleHeader } from './ChronicleHeader';
import { TodayCard } from './TodayCard';
import { WheelOfFortune } from './WheelOfFortune';

export function DashboardView({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  const { t } = useLanguage();
  const { state, today, activeCharacter } = useGame();

  // Party summary for today, e.g. "Today: 3 quests · 120 gold" (the chronicle banner below has the time left).
  const logsToday = state.logs.filter((log) => log.date === today);
  const goldToday = logsToday.reduce((sum, log) => sum + log.goldAwarded.husband + log.goldAwarded.wife, 0);
  const subtitle =
    logsToday.length === 1
      ? t('dashboard.todayOne', { gold: formatGold(goldToday) })
      : t('dashboard.today', { quests: logsToday.length, gold: formatGold(goldToday) });

  // Phones already show names and levels on the cards below, so the scene stays clean there.
  const plate = (id: CharacterId) => (
    <span className="hidden flex-col items-center gap-1 md:flex">
      <span className="max-w-[9rem] truncate bg-ink/80 px-1.5 text-sm font-bold uppercase leading-tight text-parchment-50">
        <CharacterName id={id} />
      </span>
      <LevelBadge level={getLevelFromXp(state.characters[id].xp)} />
    </span>
  );

  return (
    <section className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={subtitle} />
      <TodayCard onNavigate={onNavigate} />
      <div className="px-panel px-panel-wood p-2">
        <CabinScene className="mx-auto max-w-2xl" labels={{ husband: plate('husband'), wife: plate('wife') }} />
      </div>
      <ChronicleHeader />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => (
          // On phones your own card comes first.
          <div key={id} className={activeCharacter === id ? 'order-first md:order-none' : ''}>
            <CharacterCard character={state.characters[id]} active={activeCharacter === id} />
          </div>
        ))}
      </div>
      <WheelOfFortune />
    </section>
  );
}
