import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';

/**
 * Change-password form shown inside the Account card (current password, then the new one twice). Calls
 * `onDone` once the password has been updated, or `onCancel` to close it.
 */
export function ChangePasswordForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const result = await changePassword(current, next, confirm);
    setBusy(false);
    if (result.ok) onDone();
    else setError(result.error);
  };

  const field = (label: TranslationKey, value: string, onChange: (value: string) => void, autoComplete: string) => (
    <label className="block text-base font-extrabold uppercase text-wood-700">
      {t(label)}
      <input
        type="password"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setError(null);
        }}
        autoComplete={autoComplete}
        className="px-input mt-2 normal-case tracking-normal"
      />
    </label>
  );

  return (
    <form className="mt-5 space-y-4 border-t-[3px] border-ink/15 pt-5" onSubmit={(event) => void submit(event)} noValidate>
      {field('password.current', current, setCurrent, 'current-password')}
      {field('password.new', next, setNext, 'new-password')}
      {field('password.confirm', confirm, setConfirm, 'new-password')}
      <p className="text-sm text-wood-600">{t('password.rules')}</p>
      {error && (
        <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          {t('tasks.cancel')}
        </Button>
        <Button type="submit" disabled={busy || !current || !next || !confirm}>
          {t('password.submit')}
        </Button>
      </div>
    </form>
  );
}
