import { Reload } from 'pixelarticons/react';
import { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

/** Moderator action: replace the household's quests with the current default list, after confirming. */
export function ResetQuestsButton() {
  const { t } = useLanguage();
  const { canEditSettings, resetTasksToDefaults } = useGame();
  const [open, setOpen] = useState(false);
  // Off by default: only the built-in quests are reset and custom quests stay.
  const [removeCustom, setRemoveCustom] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  return (
    <>
      <Button variant="secondary" disabled={!canEditSettings} onClick={() => setOpen(true)}>
        <Icon as={Reload} size={24} />
        {t('settings.resetQuests')}
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
          setRemoveCustom(false);
        }}
        title={t('settings.resetQuestsTitle')}
      >
        <p className="mb-4 text-base">{t('settings.resetQuestsWarning')}</p>
        <label className="mb-4 flex items-center gap-3 text-base font-bold">
          <input
            type="checkbox"
            className="px-check"
            checked={removeCustom}
            onChange={(event) => setRemoveCustom(event.target.checked)}
          />
          {t('settings.resetQuestsRemoveCustom')}
        </label>
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
              const result = resetTasksToDefaults({ removeCustom });
              if (result.ok) {
                setOpen(false);
                setRemoveCustom(false);
              }
              else setError(result.error);
            }}
          >
            <Icon as={Reload} size={24} />
            {t('settings.resetQuestsConfirm')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
