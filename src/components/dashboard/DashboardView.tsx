import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { formatGold, getLevelFromXp } from '../../utils/calculations';
import { CharacterName } from '../ui/CharacterName';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { CabinScene } from './CabinScene';
import { CharacterCard } from './CharacterCard';
import { ChronicleHeader } from './ChronicleHeader';
import { WheelOfFortune } from './WheelOfFortune';

export function DashboardView() {
  const { t } = useLanguage();
  const { state, today, activeCharacter } = useGame();

  // Party summary, e.g. "3 quests today · 1,240 gold earned" (the chronicle banner below has the time left).
  const questsToday = state.logs.filter((log) => log.date === today).length;
  const gold = state.characters.husband.gold + state.characters.wife.gold;
  const subtitle = [
    questsToday === 1 ? t('dashboard.questsTodayOne') : t('dashboard.questsToday', { count: questsToday }),
    t('dashboard.goldEarned', { gold: formatGold(gold) }),
  ].join(' · ');

  const plate = (id: CharacterId) => (
    <span className="flex flex-col items-center gap-1">
      <span className="max-w-[9rem] truncate bg-ink/80 px-1.5 text-sm font-bold uppercase leading-tight text-parchment-50">
        <CharacterName id={id} />
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
      <ChronicleHeader />
      <div className="grid gap-6 md:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => (
          <CharacterCard
            key={id}
            character={state.characters[id]}
            active={activeCharacter === id}
          />
        ))}
      </div>
      <WheelOfFortune />
    </section>
  );
}
