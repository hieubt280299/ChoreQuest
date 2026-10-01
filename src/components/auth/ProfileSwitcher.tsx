import { Crown } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

/**
 * Demo: switch which character you play. Household: each account is bound to its own
 * character, so this just shows who you are (and a crown for moderators).
 */
export function ProfileSwitcher() {
  const { t } = useLanguage();
  const { activeCharacter, setActiveCharacter, canSwitchCharacter } = useGame();
  const { status, isModerator } = useHousehold();

  if (!canSwitchCharacter) {
    return (
      <div className="flex items-center gap-3">
        <span className="px-subtitle hidden text-sm font-bold uppercase tracking-widest sm:inline">{t('household.youAre')}</span>
        <span className="px-btn px-btn-primary cursor-default gap-1 py-1 pl-1 pr-3 text-lg">
          <CharacterAvatar id={activeCharacter} scale={2} framed={false} />
          {t(`character.${activeCharacter}`)}
          {status === 'ready' && isModerator && (
            <span title={t('household.moderator')} aria-label={t('household.moderator')}>
              <Icon as={Crown} size={24} className="text-brick-700" />
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="px-subtitle hidden text-sm font-bold uppercase tracking-widest sm:inline">
        {t('profile.playingAs')}
      </span>
      <div className="flex gap-2" role="group" aria-label={t('profile.playingAs')}>
        {(['husband', 'wife'] as CharacterId[]).map((id) => {
          const active = activeCharacter === id;
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
