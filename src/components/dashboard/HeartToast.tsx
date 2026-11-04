import { AnimatePresence, motion } from 'framer-motion';
import { Close, Heart } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDialogOpen } from '../../hooks/useDialogOpen';
import { useThemeScope } from '../../hooks/useTheme';
import { CharacterName, NAME_SLOT, spliceName } from '../ui/CharacterName';
import { Icon } from '../ui/Icon';
import { pixelEase } from '../ui/Modal';

const SEEN_KEY = 'chorequest.heartsSeen';

function readSeen(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * "Your partner sent you a heart!" when one arrives for the player (today's, once per heart on this device), with the
 * Normal Ticket it brought. Waits while a dialog is open (it would cover its buttons), then sits above the phone nav
 * bar and hides itself after a while.
 */
export function HeartToast() {
  const { t } = useLanguage();
  const { state, today, activeCharacter, canActAs } = useGame();
  const { playWheelWinSFX } = useAudio();
  const scope = useThemeScope();
  const dialogOpen = useDialogOpen();
  const [seen, setSeen] = useState(readSeen);
  const heart = canActAs(activeCharacter) && !dialogOpen
    ? state.hearts.find((item) => item.to === activeCharacter && item.date === today && !seen.includes(`${scope}:${item.id}`))
    : undefined;

  const dismiss = () => {
    if (!heart) return;
    const next = [`${scope}:${heart.id}`, ...seen].slice(0, 20);
    setSeen(next);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable: it may show again next launch.
    }
  };

  useEffect(() => {
    if (!heart) return;
    playWheelWinSFX(0);
    const id = window.setTimeout(dismiss, 6000);
    return () => window.clearTimeout(id);
    // Once per heart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heart?.id]);

  return (
    <AnimatePresence>
      {heart && (
        <motion.div
          key={heart.id}
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: pixelEase(3) }}
          className="px-panel fixed inset-x-4 bottom-28 z-[70] mx-auto flex max-w-md items-center gap-3 px-4 py-3 md:bottom-6"
        >
          <motion.span
            className="shrink-0 text-brick-600"
            animate={{ scale: [1, 1.25, 1] }}
            transition={{ duration: 0.6, repeat: 2, ease: pixelEase(4) }}
          >
            <Icon as={Heart} size={36} />
          </motion.span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-extrabold leading-tight">
              {spliceName(t('hearts.received', { who: NAME_SLOT }), <CharacterName id={heart.from} />)}
            </span>
            <span className="block text-base text-wood-700">{t('hearts.receivedTicket')}</span>
          </span>
          <button type="button" onClick={dismiss} aria-label={t('common.close')} className="px-focus px-hit shrink-0 text-wood-700">
            <Icon as={Close} size={24} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
