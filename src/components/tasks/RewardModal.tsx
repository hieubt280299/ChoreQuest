import { AnimatePresence, motion } from 'framer-motion';
import { Fire, Sparkles, Star } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { COIN } from '../../assets/sprites';
import { MAX_LEVEL } from '../../constants/gameRules';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { taskName } from '../../utils/taskNames';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelSprite } from '../ui/pixel/PixelSprite';
import { MasteryCelebration } from './MasteryCelebration';

export function RewardModal({ onAssignSkills }: { onAssignSkills?: () => void }) {
  const { t, language } = useLanguage();
  const { name } = useCharacterName();
  const { state, reward, clearReward, canActAs } = useGame();
  const { playTaskCompleteSFX, playLevelUpSFX, playMasterySFX } = useAudio();
  // Reaching the level cap gets a full-screen celebration before the usual reward card.
  const mastery = reward?.levelUps.find((levelUp) => levelUp.to >= MAX_LEVEL);
  const [celebratedId, setCelebratedId] = useState<string | null>(null);
  const celebrating = !!reward && !!mastery && celebratedId !== reward.id;

  // Coin jingle for every completed quest, then a fanfare if anyone levelled up (a grand one for mastery).
  const rewardId = reward?.id;
  const leveledUp = (reward?.levelUps.length ?? 0) > 0;
  const mastered = !!mastery;
  useEffect(() => {
    if (!rewardId) return;
    playTaskCompleteSFX();
    if (mastered) playMasterySFX(0.35);
    else if (leveledUp) playLevelUpSFX(0.35);
  }, [rewardId, leveledUp, mastered, playTaskCompleteSFX, playLevelUpSFX, playMasterySFX]);
  // Only offer the skill picker for a character this player controls.
  const needsSkills = reward?.levelUps.some((levelUp) => {
    const character = state.characters[levelUp.characterId];
    return canActAs(levelUp.characterId) && skillPointsAvailable(getLevelFromXp(character.xp), character.skills) > 0;
  });

  return (
    <AnimatePresence>
      {celebrating && mastery && (
        <MasteryCelebration
          key="mastery"
          characterId={mastery.characterId}
          level={mastery.to}
          bonusGold={mastery.bonusGold}
          onContinue={() => setCelebratedId(reward.id)}
        />
      )}
      {reward && !celebrating && (
        <motion.div
          key="reward"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-wood-950/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: pixelEase(3) }}
          onClick={clearReward}
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
                    <p className="max-w-full truncate text-base font-extrabold uppercase text-wood-700">{name(id)}</p>
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
            {reward.levelUps.map((levelUp) => (
              <motion.p
                key={levelUp.characterId}
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.15, 1] }}
                transition={{ duration: 0.4, ease: pixelEase(4) }}
                className="px-level mb-2 w-full justify-center py-2 font-sans text-lg font-extrabold uppercase"
              >
                <Icon as={Star} size={24} className="px-blink text-flame-300" />
                {t('tasks.levelUp')} {name(levelUp.characterId)} {levelUp.from}→{levelUp.to}
              </motion.p>
            ))}
            {needsSkills && onAssignSkills && (
              <Button
                className="mt-3 w-full"
                variant="brick"
                onClick={() => {
                  onAssignSkills();
                  clearReward();
                }}
              >
                {t('skills.assign')}
              </Button>
            )}
            <Button className="mt-3 w-full" onClick={clearReward}>
              {t('common.close')}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
