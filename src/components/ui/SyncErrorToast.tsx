import { AnimatePresence, motion } from 'framer-motion';
import { Close } from 'pixelarticons/react';
import { useEffect } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import { pixelEase } from './Modal';
import { Icon } from './Icon';

/**
 * Shown when an action couldn't be saved, e.g. the other player logged the same quest a moment earlier (the
 * screen has already gone back to the saved state). Sits above the phone nav bar and hides itself after a while.
 */
export function SyncErrorToast() {
  const { t } = useLanguage();
  const { syncError, clearSyncError } = useGame();

  useEffect(() => {
    if (!syncError) return;
    const id = window.setTimeout(clearSyncError, 6000);
    return () => window.clearTimeout(id);
  }, [syncError, clearSyncError]);

  return (
    <AnimatePresence>
      {syncError && (
        <motion.div
          key={syncError}
          role="alert"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: pixelEase(3) }}
          className="fixed inset-x-4 bottom-28 z-[70] mx-auto flex max-w-md items-start gap-3 bg-brick-600 px-4 py-3 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12] md:bottom-6"
        >
          <span className="min-w-0 flex-1">{t(syncError)}</span>
          <button type="button" onClick={clearSyncError} aria-label={t('common.close')} className="shrink-0">
            <Icon as={Close} size={24} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
