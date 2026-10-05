import { AnimatePresence, motion } from 'framer-motion';
import { Fire, Sparkles } from 'pixelarticons/react';
import { useEffect } from 'react';
import { COIN } from '../../assets/sprites';
import { MAX_LEVEL } from '../../constants/gameRules';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { taskName } from '../../utils/taskNames';
import { CharacterName } from '../ui/CharacterName';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelSprite } from '../ui/pixel/PixelSprite';
import { useOwnLevelUp } from '../../hooks/useOwnLevelUp';
import { LevelUpModal } from './LevelUpModal';
import { MasteryCelebration } from './MasteryCelebration';

/**
 * The quest's reward card, then a level-up card, but only for this player's own character. Level-ups are
 * tracked against the last level this device celebrated, so one also shows when the spouse logs a quest
 * that levels you up, and never for the spouse's own level-ups.
 */
export function RewardModal({ onAssignSkills }: { onAssignSkills?: () => void }) {
  const { t, language } = useLanguage();
  const { state, reward, clearReward, activeCharacter, canActAs } = useGame();
  const { playTaskCompleteSFX, playLevelUpSFX, playMasterySFX } = useAudio();
  const own = useOwnLevelUp(activeCharacter);
  // The level-up card waits until the quest card is closed.
  const levelUp = !reward ? own.pending : null;

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

  const advance = () => clearReward();
  const canAssign =
    !!levelUp &&
    !!onAssignSkills &&
    canActAs(levelUp.characterId) &&
    skillPointsAvailable(getLevelFromXp(state.characters[levelUp.characterId].xp), state.characters[levelUp.characterId].skills) > 0;

  return (
    <AnimatePresence mode="wait">
      {reward && (
        <motion.div
          key={`reward-${reward.id}`}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-wood-950/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: pixelEase(3) }}
          onClick={advance}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('tasks.reward')}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25, ease: pixelEase(5) }}
            className="px-panel w-full max-w-sm p-6 text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-center gap-3 text-ember-500">
              <Icon as={Sparkles} size={24} />
              <PixelSprite frames={COIN} fps={8} scale={6} />
              <Icon as={Sparkles} size={24} className="-scale-x-100" />
            </div>
            <h2 className="px-title text-4xl uppercase text-flame-300" style={{ textShadow: '3px 3px 0 #b04a34, 5px 5px 0 #2b1a12' }}>
              {t('tasks.reward')}
            </h2>
            <p className="mb-5 mt-1 text-xl font-bold text-wood-600">{taskName({ nameKey: reward.title, names: reward.names }, language)}</p>
            <div className="mb-4 grid grid-cols-2 gap-4">
              {(['husband', 'wife'] as const).map((id) => {
                const earned = reward.xp[id] > 0 || reward.gold[id] > 0;
                return (
                  <div key={id} className={`px-slot flex flex-col items-center gap-2 p-3 ${earned ? '' : 'opacity-50'}`}>
                    <CharacterAvatar id={id} scale={2} framed={false} />
                    <p className="max-w-full truncate text-base font-extrabold uppercase text-wood-700"><CharacterName id={id} /></p>
                    <p className="font-arcade text-[10px] text-moss-700">+{Math.round(reward.xp[id])}XP</p>
                    <GoldCounter amount={reward.gold[id]} />
                    {(reward.streakGold?.[id] ?? 0) > 0 && (
                      <p className="flex items-center gap-1 bg-ember-400 px-1.5 text-sm font-extrabold uppercase leading-tight text-ink shadow-[0_0_0_2px_#2b1a12]">
                        <Icon as={Fire} size={12} className="text-brick-700" />
                        {t('streak.days', { days: reward.streakDays?.[id] ?? 0 })} ({t('streak.bonus', { gold: reward.streakGold?.[id] ?? 0 })})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <Button className="mt-3 w-full" onClick={advance}>
              {own.pending ? t('mastery.continue') : t('common.close')}
            </Button>
          </motion.div>
        </motion.div>
      )}
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
