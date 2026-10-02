import { motion } from 'framer-motion';
import { Crown } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import { useCharacterName } from '../../hooks/useCharacterName';
import type { CharacterId } from '../../types';
import { Button } from '../ui/Button';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { GoldCounter } from '../ui/GoldCounter';
import { Icon } from '../ui/Icon';
import { LevelBadge } from '../ui/LevelBadge';
import { pixelEase } from '../ui/Modal';
import { PixelConfetti } from '../ui/pixel/PixelConfetti';

/** Full-screen celebration when a character reaches the level cap. */
export function MasteryCelebration({
  characterId,
  level,
  bonusGold,
  onContinue,
}: {
  characterId: CharacterId;
  level: number;
  bonusGold: number;
  onContinue: () => void;
}) {
  const { t } = useLanguage();
  const { name } = useCharacterName();
  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-wood-950/85 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: pixelEase(3) }}
      role="dialog"
      aria-modal="true"
      aria-label={t('mastery.title')}
    >
      <PixelConfetti />

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: [0.4, 1.1, 1], opacity: 1 }}
        transition={{ duration: 0.5, ease: pixelEase(6) }}
        className="px-panel px-panel-ember relative w-full max-w-sm p-6 text-center"
      >
        <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-brick-700">
          <Icon as={Crown} size={36} className="px-blink" />
        </div>
        <div
          className="mx-auto mb-4 flex h-32 w-32 items-end justify-center"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,224,138,0.9) 0%, rgba(255,224,138,0) 70%)' }}
        >
          <span className="bob">
            <CharacterAvatar id={characterId} scale={6} framed={false} />
          </span>
        </div>
        <h2 className="px-title text-4xl uppercase text-flame-300" style={{ textShadow: '3px 3px 0 #b04a34, 5px 5px 0 #2b1a12' }}>
          {t('mastery.title')}
        </h2>
        <p className="mb-4 mt-2 text-lg font-bold">{t('mastery.subtitle', { name: name(characterId) })}</p>
        <div className="mb-4 flex items-center justify-center gap-4">
          <LevelBadge level={level} className="scale-150" />
          <span className="px-slot inline-flex items-center gap-2 px-3 py-1">
            <span className="text-sm font-extrabold uppercase text-wood-700">{t('mastery.bonus')}</span>
            <GoldCounter amount={bonusGold} spin size="lg" />
          </span>
        </div>
        <p className="mb-5 text-base text-wood-800">{t('mastery.unlocked')}</p>
        <Button className="w-full" variant="brick" onClick={onContinue}>
          {t('mastery.continue')}
        </Button>
      </motion.div>
    </motion.div>
  );
}
