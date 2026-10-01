import { Crown, Lock, Reload } from 'pixelarticons/react';
import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

/**
 * "New legend": unlocked once a player reaches the level cap. A moderator can reset both players to
 * level 1 with no skills (gold and the chronicle are kept) so levels don't inflate forever.
 */
export function NewLegendCard() {
  const { t } = useLanguage();
  const { levelResetUnlocked, canEditSettings, resetLevels } = useGame();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  return (
    <Card tone={levelResetUnlocked ? 'ember' : 'parchment'}>
      <h2 className="mb-3 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Crown} size={24} />
        {t('settings.newLegend')}
      </h2>
      {levelResetUnlocked ? (
        <>
          <p className="mb-4 text-base">{t('settings.newLegendHint')}</p>
          {!canEditSettings && (
            <p className="mb-4 flex items-center gap-2 text-base font-bold text-wood-700">
              <Icon as={Lock} size={24} />
              {t('household.moderatorOnly')}
            </p>
          )}
          <Button variant="brick" disabled={!canEditSettings} onClick={() => setOpen(true)}>
            <Icon as={Reload} size={24} />
            {t('settings.newLegendButton')}
          </Button>
        </>
      ) : (
        <p className="flex items-center gap-2 text-base font-bold text-wood-600">
          <Icon as={Lock} size={24} />
          {t('settings.newLegendLocked')}
        </p>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title={t('settings.newLegendTitle')}
      >
        <p className="mb-4 text-base">{t('settings.newLegendWarning')}</p>
        {error && (
          <p className="mb-4 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
            {t(error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('tasks.cancel')}
          </Button>
          <Button
            variant="brick"
            onClick={() => {
              const result = resetLevels();
              if (result.ok) setOpen(false);
              else setError(result.error);
            }}
          >
            <Icon as={Crown} size={24} />
            {t('settings.newLegendConfirm')}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
