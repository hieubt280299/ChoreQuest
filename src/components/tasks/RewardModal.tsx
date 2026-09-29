import { AnimatePresence, motion } from 'framer-motion';
import { PartyPopper, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { getLevelFromXp, skillPointsAvailable } from '../../utils/calculations';
import { translations, type TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { GoldCounter } from '../ui/GoldCounter';

function label(nameKey: string, t: (key: TranslationKey) => string) {
  return nameKey in translations.en ? t(nameKey as TranslationKey) : nameKey;
}

export function RewardModal({ onAssignSkills }: { onAssignSkills?: () => void }) {
  const { t } = useLanguage();
  const { state, reward, clearReward } = useGame();
  const needsSkills = reward?.levelUps.some((levelUp) => {
    const character = state.characters[levelUp.characterId];
    return skillPointsAvailable(getLevelFromXp(character.xp), character.skills) > 0;
  });

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearReward}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-amber-warm to-cream p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white text-amber-600"
            >
              <PartyPopper size={28} />
            </motion.div>
            <h2 className="font-display text-2xl text-stone-800">{t('tasks.reward')}</h2>
            <p className="mb-4 font-semibold text-stone-500">{label(reward.title, t)}</p>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              {(['husband', 'wife'] as const).map((id) => (
                <div key={id} className="rounded-2xl bg-white/80 p-3">
                  <p className="font-bold text-stone-600">{t(`character.${id}`)}</p>
                  <p className="text-emerald-700">+{Math.round(reward.xp[id])} XP</p>
                  <GoldCounter amount={reward.gold[id]} className="mt-1" />
                </div>
              ))}
            </div>
            {reward.levelUps.map((levelUp) => (
              <p key={levelUp.characterId} className="mb-2 inline-flex items-center gap-1 font-bold text-rose-700">
                <Sparkles size={16} />
                {t('tasks.levelUp')} {t(`character.${levelUp.characterId}`)} {levelUp.from}→{levelUp.to}
              </p>
            ))}
            {needsSkills && onAssignSkills && (
              <Button
                className="mt-3 w-full"
                variant="rose"
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
