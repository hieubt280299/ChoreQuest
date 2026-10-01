import { Trash } from 'pixelarticons/react';
import { useState, type FormEvent } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

/** Permanently deletes the signed-in account and its data, after a password confirmation. */
export function DeleteAccountButton() {
  const { t } = useLanguage();
  const { household, deleteAccount } = useHousehold();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const isLastMember = !household || household.data.memberIds.length <= 1;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword('');
    setError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await deleteAccount(password);
    // On success the auth listener signs us out and the app returns to the login screen.
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="brick" onClick={() => setOpen(true)}>
        <Icon as={Trash} size={24} />
        {t('account.delete')}
      </Button>
      <Modal open={open} onClose={close} title={t('account.deleteTitle')}>
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          <p className="text-base">{t('account.deleteWarning')}</p>
          <p className="text-base font-extrabold text-brick-600">
            {household && isLastMember ? t('household.leaveLast') : household ? t('account.deletePartner') : null}
          </p>
          <label className="block text-base font-extrabold uppercase text-wood-700">
            {t('account.password')}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="px-input mt-2"
              required
            />
          </label>
          {error && (
            <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
              {t(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={close} disabled={busy}>
              {t('tasks.cancel')}
            </Button>
            <Button type="submit" variant="brick" disabled={busy || !password}>
              <Icon as={Trash} size={24} />
              {t('account.deleteConfirm')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
