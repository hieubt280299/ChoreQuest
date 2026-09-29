import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { CharacterCard } from './CharacterCard';
import { MonthTimer } from './MonthTimer';
import { PrizePreview } from './PrizePreview';

export function DashboardView() {
  const { t } = useLanguage();
  const { state, setActiveCharacter } = useGame();

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-stone-800">{t('app.name')}</h1>
        <p className="text-stone-500">{t('app.tagline')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CharacterCard
          character={state.characters.husband}
          accent="rose"
          active={state.activeCharacter === 'husband'}
          onSelect={() => setActiveCharacter('husband')}
        />
        <CharacterCard
          character={state.characters.wife}
          accent="sage"
          active={state.activeCharacter === 'wife'}
          onSelect={() => setActiveCharacter('wife')}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MonthTimer />
        <PrizePreview />
      </div>
    </section>
  );
}
