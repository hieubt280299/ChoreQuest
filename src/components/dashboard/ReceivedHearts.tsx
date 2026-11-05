import { useLanguage } from '../../context/LanguageContext';
import type { CharacterId } from '../../types';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';
import { FilledHeart } from '../ui/pixel/FilledHeartIcon';
import { Tooltip } from '../ui/Tooltip';

/**
 * Hearts on the corner of a character's avatar on the day they got one from their partner: a beating heart with two
 * small ones floating up (still under reduced motion, see `.heart-beat` / `.heart-rise`). Tap for who sent it.
 */
export function ReceivedHearts({ from }: { from: CharacterId }) {
  const { t } = useLanguage();
  return (
    <span className="absolute -right-2 -top-3">
      <Tooltip
        ariaLabel={t('hearts.todayLabel')}
        triggerClassName="px-hit relative inline-flex text-brick-500 drop-shadow-[2px_2px_0_#2b1a12]"
        label={
          <>
            <span aria-hidden className="heart-rise absolute -left-1 top-0 inline-flex">
              <Icon as={FilledHeart} size={12} />
            </span>
            <span aria-hidden className="heart-rise heart-rise-late absolute -right-1 top-1 inline-flex">
              <Icon as={FilledHeart} size={12} />
            </span>
            <span aria-hidden className="heart-beat inline-flex">
              <Icon as={FilledHeart} size={24} />
            </span>
          </>
        }
        content={spliceName(t('hearts.today', { who: NAME_SLOT }), <CharacterName id={from} />)}
      />
    </span>
  );
}
