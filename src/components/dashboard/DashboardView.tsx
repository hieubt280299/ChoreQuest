import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { getLevelFromXp } from '../../utils/calculations';
import { LevelBadge } from '../ui/LevelBadge';
import { PageHeader } from '../ui/PageHeader';
import { CabinScene } from './CabinScene';
import { CharacterCard } from './CharacterCard';
import { MonthTimer } from './MonthTimer';
import { PrizePreview } from './PrizePreview';

export function DashboardView() {
  const { t } = useLanguage();
  const { state, setActiveCharacter } = useGame();

  const plate = (id: CharacterId) => (
    <span className="flex flex-col items-center gap-1">
      <span className="bg-ink/80 px-1.5 text-sm font-bold uppercase leading-tight text-parchment-50">
        {t(`character.${id}`)}
      </span>
      <LevelBadge level={getLevelFromXp(state.characters[id].xp)} />
    </span>
  );

  return (
    <section className="space-y-6">
      <PageHeader title={t('dashboard.title')} subtitle={t('app.tagline')} />
      <div className="px-panel px-panel-wood p-2">
        <CabinScene className="mx-auto max-w-2xl" labels={{ husband: plate('husband'), wife: plate('wife') }} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(['husband', 'wife'] as CharacterId[]).map((id) => (
          <CharacterCard
            key={id}
            character={state.characters[id]}
            active={state.activeCharacter === id}
            onSelect={() => setActiveCharacter(id)}
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
