import { ArrowLeft, Check, Mail } from 'pixelarticons/react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { TEXT_ACTION } from '../ui/textAction';

/** Seconds before "Send again" is allowed, so a double tap or impatience doesn't flood the inbox (or Firebase). */
const RESEND_SECONDS = 60;

/**
 * "Forgot password?": sends Firebase's reset email to the address entered (pre-filled from the sign-in form). The
 * confirmation reads the same whether or not the email has an account, so nobody can probe which emails are
 * registered; it reminds the player to check Spam and allows another send after a short wait.
 */
export function ForgotPassword({ initialEmail, onBack }: { initialEmail: string; onBack: (email: string) => void }) {
  const { t, language } = useLanguage();
  const { sendPasswordReset, firebaseConfigured } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [wait, setWait] = useState(0);

  // Count down to "Send again".
  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await sendPasswordReset(email, language);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSentTo(email.trim());
    setWait(RESEND_SECONDS);
  };

  const back = (
    <button type="button" className={`${TEXT_ACTION} text-wood-700`} onClick={() => onBack(email)}>
      <Icon as={ArrowLeft} size={12} />
      {t('auth.reset.back')}
    </button>
  );

  if (sentTo) {
    return (
      <div className="space-y-5">
        <h2 className="text-3xl font-extrabold uppercase">{t('auth.reset.sentTitle')}</h2>
        <div className="px-slot flex items-start gap-3 p-3" role="status">
          <span className="mt-0.5 text-moss-700">
            <Icon as={Check} size={24} />
          </span>
          <p className="min-w-0 text-base [overflow-wrap:anywhere]">{t('auth.reset.sentHint', { email: sentTo })}</p>
        </div>
        {error && (
          <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
            {t(error)}
          </p>
        )}
        <Button className="w-full" onClick={() => onBack(sentTo)}>
          {t('auth.reset.back')}
        </Button>
        <div className="text-center">
          <button type="button" className={`${TEXT_ACTION} text-wood-700 disabled:no-underline disabled:opacity-60`} disabled={wait > 0 || busy} onClick={() => void send()}>
            {wait > 0 ? t('auth.reset.resendIn', { seconds: wait }) : t('auth.reset.resend')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={(event) => void send(event)} noValidate>
      <div>
        <h2 className="mb-2 text-3xl font-extrabold uppercase">{t('auth.reset.title')}</h2>
        <p className="text-base text-wood-700">{t('auth.reset.hint')}</p>
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        placeholder={t('auth.email')}
        aria-label={t('auth.email')}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError(null);
        }}
        className="px-input"
        disabled={!firebaseConfigured}
      />
      {error && (
        <p className="bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(error)}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!firebaseConfigured || busy || !email.trim()}>
        <Icon as={Mail} size={24} />
        {busy ? t('auth.reset.sending') : t('auth.reset.send')}
      </Button>
      <div>{back}</div>
    </form>
  );
}
