import { Crown, Sliders } from 'pixelarticons/react';
import { useGame } from '../../context/GameContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { Icon } from '../ui/Icon';

/**
 * Your character in the header; tapping it opens the wardrobe (themes and avatars). In the demo there is a
 * button per character: tapping the other one switches to it, tapping the active one opens the wardrobe.
 */
export function ProfileSwitcher({ onOpenWardrobe }: { onOpenWardrobe: () => void }) {
  const { t } = useLanguage();
  const { activeCharacter, setActiveCharacter, canSwitchCharacter } = useGame();
  const { status, isModerator } = useHousehold();

  if (!canSwitchCharacter) {
    return (
      <button
        type="button"
        onClick={onOpenWardrobe}
        className="px-btn px-btn-primary gap-1 py-1 pl-1 pr-2.5 text-lg"
        aria-label={`${t('household.youAre')} ${t(`character.${activeCharacter}`)} · ${t('cosmetics.title')}`}
      >
        <CharacterAvatar id={activeCharacter} scale={2} framed={false} />
        <span className="hidden min-[360px]:inline">{t(`character.${activeCharacter}`)}</span>
        {status === 'ready' && isModerator && (
          <span title={t('household.moderator')}>
            <Icon as={Crown} size={24} className="text-brick-700" />
          </span>
        )}
        <Icon as={Sliders} size={12} className="text-ink/70" />
      </button>
    );
  }

  return (
    <div className="flex gap-2" role="group" aria-label={t('profile.playingAs')}>
      {(['husband', 'wife'] as CharacterId[]).map((id) => {
        const active = activeCharacter === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => (active ? onOpenWardrobe() : setActiveCharacter(id))}
            aria-pressed={active}
            aria-label={active ? `${t(`character.${id}`)} · ${t('cosmetics.title')}` : t(`character.${id}`)}
            className={`px-btn gap-1 py-1 pl-1 pr-2 text-lg ${active ? 'px-btn-primary' : ''}`}
          >
            <CharacterAvatar id={id} scale={2} framed={false} />
            <span className="hidden sm:inline">{t(`character.${id}`)}</span>
            {active && <Icon as={Sliders} size={12} className="text-ink/70" />}
          </button>
        );
      })}
    </div>
  );
}
