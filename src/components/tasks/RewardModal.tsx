import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { MAX_LEVEL } from '../../constants/gameRules';
import { useSfx } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { useOwnLevelUp } from '../../hooks/useOwnLevelUp';
import { LevelUpModal } from './LevelUpModal';
import { MasteryCelebration } from './MasteryCelebration';

/**
 * A quest's coin jingle (`QuestToast` shows what it paid), and a level-up card, but only for this player's own
 * character. Level-ups are tracked against the last level this device celebrated, so one also shows when the
 * spouse logs a quest that levels you up, and never for the spouse's own level-ups.
 */
export function RewardModal({ onAssignSkills }: { onAssignSkills?: () => void }) {
  const { state, reward, activeCharacter, canActAs } = useGame();
  const { playTaskCompleteSFX, playLevelUpSFX, playMasterySFX } = useSfx();
  const own = useOwnLevelUp(activeCharacter);
  const levelUp = own.pending;

  // Coin jingle for the quest, then a fanfare when the level-up card opens (a grand one for mastery).
  const rewardId = reward?.id;
  useEffect(() => {
    if (rewardId) playTaskCompleteSFX();
  }, [rewardId, playTaskCompleteSFX]);
  const levelKey = levelUp ? `${levelUp.characterId}-${levelUp.to}` : null;
  const mastered = !!levelUp && levelUp.to >= MAX_LEVEL;
  useEffect(() => {
    if (!levelKey) return;
    if (mastered) playMasterySFX();
    else playLevelUpSFX();
  }, [levelKey, mastered, playLevelUpSFX, playMasterySFX]);

  const canAssign =
    !!levelUp &&
    !!onAssignSkills &&
    canActAs(levelUp.characterId) &&
    skillPointsAvailable(getLevelFromXp(state.characters[levelUp.characterId].xp), state.characters[levelUp.characterId].skills) > 0;

  return (
    <AnimatePresence mode="wait">
      {levelUp && levelUp.to >= MAX_LEVEL && (
        <MasteryCelebration
          key={`mastery-${levelKey}`}
          characterId={levelUp.characterId}
          level={levelUp.to}
          bonusGold={levelUp.bonusGold}
          onContinue={own.acknowledge}
        />
      )}
      {levelUp && levelUp.to < MAX_LEVEL && (
        <LevelUpModal
          key={`level-${levelKey}`}
          levelUp={levelUp}
          onContinue={own.acknowledge}
          onAssignSkills={
            canAssign
              ? () => {
                  own.acknowledge();
                  onAssignSkills!();
                }
              : undefined
          }
        />
      )}
    </AnimatePresence>
  );
}
