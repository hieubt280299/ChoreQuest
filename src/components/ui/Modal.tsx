import { AnimatePresence, motion, type MotionProps } from 'framer-motion';
import { Close } from 'pixelarticons/react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Icon } from './Icon';

/** Stepped easing so motion snaps frame-by-frame like a 16-bit game. */
export const pixelEase = (steps: number) => (t: number) => Math.round(t * steps) / steps;

type Enter = Pick<MotionProps, 'initial' | 'animate' | 'exit'>;
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

/**
 * Dialog open/close motion, shared by every pop-up. Only opacity and transform change, so the browser runs it
 * on the GPU (no layout or repaint), with smooth ease curves (stepped pixel easing looked jerky on phones).
 */
export const backdropMotion: Enter = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } },
};
export const dialogMotion: Enter = {
  initial: { opacity: 0, scale: 0.92, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.16, ease: EASE_IN } },
};
/** Celebrations (level-up, jackpot, mastery) pop in with a soft spring overshoot. */
export const celebrationMotion: Enter = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 18 } },
  exit: dialogMotion.exit,
};

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Wider on big screens, for long editable lists (phones always use the full width). */
  wide?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-wood-950/70 p-4 sm:items-center"
          {...backdropMotion}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            {...dialogMotion}
            className={`px-panel mb-3 w-full p-5 pt-11 ${wide ? 'max-w-md md:max-w-3xl' : 'max-w-md'}`}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Title plate hanging over the top border, like an RPG dialog. */}
            <div className="px-panel px-panel-wood absolute -top-5 left-4 max-w-[70%] px-3 py-1">
              <h2 className="truncate text-xl font-extrabold uppercase tracking-wide text-parchment-50">{title}</h2>
            </div>
            {/* Close hangs over the top-right corner, level with the title plate, so it's clear of the content and its
                scrollbar. */}
            <div className="absolute -right-3 -top-5">
              <button type="button" onClick={onClose} className="px-btn h-9 w-9 p-0" aria-label={t('common.close')}>
                <Icon as={Close} size={24} />
              </button>
            </div>
            {/* Tall content (e.g. the wardrobe) scrolls inside the card; the title plate stays put. */}
            {/* Padding inside the scroll area (offset by negative margins) so pixel borders and a raised, selected
                button aren't clipped at its edges. */}
            <div className="px-scroll -mx-2 -mt-2 max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain px-2 pb-1 pt-2">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
