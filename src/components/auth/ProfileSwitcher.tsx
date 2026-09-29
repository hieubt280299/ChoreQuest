import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';

export function ProfileSwitcher() {
  const { t } = useLanguage();
  const { state, setActiveCharacter } = useGame();

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-bold uppercase tracking-widest text-stone-400 sm:inline">
        {t('profile.playingAs')}
      </span>
      <div className="flex rounded-2xl bg-white/80 p-1 shadow-sm">
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const active = state.activeCharacter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCharacter(id)}
              className={`rounded-xl px-3 py-1.5 text-sm font-bold transition ${
                active ? 'bg-amber-700 text-white' : 'text-stone-500 hover:bg-white'
              }`}
            >
              {t(`character.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
