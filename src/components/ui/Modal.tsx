import { AnimatePresence, motion } from 'framer-motion';
import { Close } from 'pixelarticons/react';
import type { ReactNode } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Icon } from './Icon';

/** Stepped easing so motion snaps frame-by-frame like a 16-bit game. */
export const pixelEase = (steps: number) => (t: number) => Math.round(t * steps) / steps;

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-wood-950/70 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: pixelEase(3) }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, scale: 0.9, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.2, ease: pixelEase(4) }}
            className="px-panel mb-3 w-full max-w-md p-5"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Title plate hanging over the top border, like an RPG dialog. */}
            <div className="px-panel px-panel-wood absolute -top-5 left-4 max-w-[70%] px-3 py-1">
              <h2 className="truncate text-xl font-extrabold uppercase tracking-wide text-parchment-50">{title}</h2>
            </div>
            {/* Close sits inside the card padding, clear of the bevelled frame and the title plate. */}
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-btn h-9 w-9 p-0"
                aria-label={t('common.close')}
              >
                <Icon as={Close} size={24} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
