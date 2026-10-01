import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Star } from 'pixelarticons/react';
import { useEffect } from 'react';
import { COIN } from '../../assets/sprites';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { PixelSprite } from '../ui/pixel/PixelSprite';

function label(nameKey: string, t: (key: TranslationKey) => string) {
  return nameKey in translations.en ? t(nameKey as TranslationKey) : nameKey;
}

export function RewardModal({ onAssignSkills }: { onAssignSkills?: () => void }) {
  const { t } = useLanguage();
  const { state, reward, clearReward, canActAs } = useGame();
  const { playTaskCompleteSFX, playLevelUpSFX } = useAudio();

  // Coin jingle for every completed quest, then a fanfare if anyone levelled up.
  const rewardId = reward?.id;
  const leveledUp = (reward?.levelUps.length ?? 0) > 0;
  useEffect(() => {
    if (!rewardId) return;
    playTaskCompleteSFX();
    if (leveledUp) playLevelUpSFX(0.35);
  }, [rewardId, leveledUp, playTaskCompleteSFX, playLevelUpSFX]);
  // Only offer the skill picker for a character this player controls.
  const needsSkills = reward?.levelUps.some((levelUp) => {
    const character = state.characters[levelUp.characterId];
    return canActAs(levelUp.characterId) && skillPointsAvailable(getLevelFromXp(character.xp), character.skills) > 0;
  });

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
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
            <p className="mb-5 mt-1 text-xl font-bold text-wood-600">{label(reward.title, t)}</p>
            <div className="mb-4 grid grid-cols-2 gap-4">
              {(['husband', 'wife'] as const).map((id) => {
                const earned = reward.xp[id] > 0 || reward.gold[id] > 0;
                return (
                  <div key={id} className={`px-slot flex flex-col items-center gap-2 p-3 ${earned ? '' : 'opacity-50'}`}>
                    <CharacterAvatar id={id} scale={2} framed={false} />
                    <p className="text-base font-extrabold uppercase text-wood-700">{t(`character.${id}`)}</p>
                    <p className="font-arcade text-[10px] text-moss-700">+{Math.round(reward.xp[id])}XP</p>
                    <GoldCounter amount={reward.gold[id]} />
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
                {t('tasks.levelUp')} {t(`character.${levelUp.characterId}`)} {levelUp.from}→{levelUp.to}
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
