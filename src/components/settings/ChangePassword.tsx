import { Check, Lock } from 'pixelarticons/react';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

/** Settings card: change the account password (current password, then the new one twice). */
export function ChangePassword() {
  const { t } = useLanguage();
  const { user, changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [done, setDone] = useState(false);
  if (!user?.email) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setDone(false);
    const result = await changePassword(current, next, confirm);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setDone(true);
    setCurrent('');
    setNext('');
    setConfirm('');
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
          setDone(false);
        }}
        autoComplete={autoComplete}
        className="px-input mt-2 normal-case tracking-normal"
      />
    </label>
  );

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Lock} size={24} />
        {t('password.title')}
      </h2>
      <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
        {field('password.current', current, setCurrent, 'current-password')}
        {field('password.new', next, setNext, 'new-password')}
        {field('password.confirm', confirm, setConfirm, 'new-password')}
        <p className="text-sm text-wood-600">{t('password.rules')}</p>
        {error && (
          <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
            {t(error)}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-2 text-base font-extrabold text-moss-700" role="status">
            <Icon as={Check} size={24} />
            {t('password.changed')}
          </p>
        )}
        <Button type="submit" disabled={busy || !current || !next || !confirm}>
          {t('password.submit')}
        </Button>
      </form>
    </Card>
  );
}
