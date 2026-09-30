import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';

export function ProfileSwitcher() {
  const { t } = useLanguage();
  const { state, setActiveCharacter } = useGame();

  return (
    <div className="flex items-center gap-3">
      <span className="px-subtitle hidden text-sm font-bold uppercase tracking-widest sm:inline">
        {t('profile.playingAs')}
      </span>
      <div className="flex gap-2" role="group" aria-label={t('profile.playingAs')}>
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const active = state.activeCharacter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCharacter(id)}
              aria-pressed={active}
              className={`px-btn gap-1 py-1 pl-1 pr-3 text-lg ${active ? 'px-btn-primary' : ''}`}
            >
              <CharacterAvatar id={id} scale={2} framed={false} />
              {t(`character.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
