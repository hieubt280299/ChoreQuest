import { AnimatePresence, motion } from 'framer-motion';
import { Heart } from 'pixelarticons/react';
import { useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { prefersReducedMotion } from '../../hooks/useQuality';
import type { CharacterId } from '../../types';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';
import { FilledHeart } from '../ui/pixel/FilledHeartIcon';

/** A few pixel hearts that float up from the button and fade. */
function HeartBurst({ onDone }: { onDone: () => void }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-full z-10 flex justify-center">
      {[-14, 0, 14].map((x, index) => (
        <motion.span
          key={x}
          className="absolute text-brick-600"
          initial={{ opacity: 1, y: 8, x: 0, scale: 0.6 }}
          animate={{ opacity: [1, 1, 0], y: -48 - index * 12, x, scale: 1.2 }}
          transition={{ duration: 1, delay: index * 0.1, ease: pixelEase(6), opacity: { duration: 1, delay: index * 0.1, times: [0, 0.6, 1] } }}
          onAnimationComplete={index === 2 ? onDone : undefined}
        >
          <Icon as={FilledHeart} size={24} />
        </motion.span>
      ))}
    </span>
  );
}

/**
 * Sends the partner a heart from the active player (once a day): no dialog, just a burst of hearts. It gives the
 * partner a Normal Ticket. Only on the partner's card, for a player who can act.
 */
export function HeartButton({ to }: { to: CharacterId }) {
  const { t } = useLanguage();
  const { activeCharacter, canActAs, canPlay, sendHeart, heartSentToday } = useGame();
  const { playWheelWinSFX } = useAudio();
  const [bursts, setBursts] = useState<number[]>([]);
  const [error, setError] = useState<TranslationKey | null>(null);
  if (!canPlay || to === activeCharacter || !canActAs(activeCharacter)) return null;
  const sent = heartSentToday(activeCharacter);

  const send = () => {
    const result = sendHeart(activeCharacter);
    setError(result.ok ? null : result.error);
    if (!result.ok) return;
    playWheelWinSFX(0);
    if (!prefersReducedMotion()) setBursts((current) => [...current, Date.now()]);
  };

  return (
    <div className="relative">
      <Button variant={sent ? 'secondary' : 'primary'} disabled={sent} onClick={send} className="w-full">
        <Icon as={Heart} size={24} className={sent ? 'text-brick-600' : ''} />
        {t(sent ? 'hearts.sent' : 'hearts.send')}
      </Button>
      {/* Outside the button, which dims once the heart is sent. */}
      <AnimatePresence>
        {bursts.map((id) => (
          <HeartBurst key={id} onDone={() => setBursts((current) => current.filter((item) => item !== id))} />
        ))}
      </AnimatePresence>
      {error && (
        <p className="mt-2 text-sm font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
