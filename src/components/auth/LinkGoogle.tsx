import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { PendingGoogleLink } from '../../services/authService';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { GoogleLogo } from '../ui/GoogleLogo';
import { TEXT_ACTION } from '../ui/textAction';

/**
 * Shown when Google sign-in finds a password account with the same email: entering the password once links the two,
 * so the player keeps the same account and progress.
 */
export function LinkGoogle({ link, onForgot }: { link: PendingGoogleLink; onForgot: (email: string) => void }) {
  const { t } = useLanguage();
  const { completeGoogleLink, cancelGoogleLink } = useAuth();
  const [email, setEmail] = useState(link.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await completeGoogleLink(email, password);
    // Once linked, the auth listener replaces this screen.
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <form className="space-y-5" onSubmit={(event) => void submit(event)} noValidate>
      <div>
        <h2 className="mb-2 text-3xl font-extrabold uppercase">{t('auth.link.title')}</h2>
        <p className="text-base text-wood-700 [overflow-wrap:anywhere]">
          {link.email ? t('auth.link.hint', { email: link.email }) : t('auth.link.hintNoEmail')}
        </p>
      </div>
      {!link.email && (
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('auth.email')}
          aria-label={t('auth.email')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="px-input"
        />
      )}
      <input
        type="password"
        autoComplete="current-password"
        autoFocus
        placeholder={t('auth.password')}
        aria-label={t('auth.password')}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="px-input"
      />
      <div className="-mt-3 flex justify-end">
        <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={() => onForgot(email)}>
          {t('auth.forgot')}
        </button>
      </div>
      {error && (
        <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy || !password || !email.trim()}>
        <GoogleLogo />
        {busy ? t('auth.link.linking') : t('auth.link.submit')}
      </Button>
      <div>
        <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={cancelGoogleLink}>
          {t('tasks.cancel')}
        </button>
      </div>
    </form>
  );
}
