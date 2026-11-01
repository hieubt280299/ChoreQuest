import { Check, Lock } from 'pixelarticons/react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { Button } from '../ui/Button';
import { GoogleLogo } from '../ui/GoogleLogo';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { TEXT_ACTION } from '../ui/textAction';

function MethodRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-x-3">
      <span className="flex w-6 shrink-0 justify-center text-wood-700">{icon}</span>
      <span className="min-w-0 flex-1 text-base font-bold">{label}</span>
      {children}
    </div>
  );
}

function ActiveMark() {
  const { t } = useLanguage();
  return (
    <span className="flex items-center gap-1 text-base font-extrabold text-moss-700">
      <Icon as={Check} size={12} />
      {t('auth.methods.on')}
    </span>
  );
}

/** The Account card's ways to sign in: connect or disconnect Google, or add a password to a Google-only account. */
export function SignInMethods() {
  const { t, language } = useLanguage();
  const { user, error: redirectError, connectGoogle, disconnectGoogle, sendPasswordReset } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  if (!user) return null;

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: TranslationKey }>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) setError(result.error);
    return result.ok;
  };

  const shownError = error ?? redirectError;

  return (
    <div className="mt-5 border-t-[3px] border-ink/15 pt-3">
      <p className="mb-1 text-base font-extrabold uppercase text-wood-700">{t('auth.methods.title')}</p>
      <MethodRow icon={<Icon as={Lock} size={24} />} label={t('auth.methods.password')}>
        {user.hasPassword ? (
          <ActiveMark />
        ) : (
          !resetSent && (
            <button
              type="button"
              className={`${TEXT_ACTION} text-wood-700`}
              disabled={busy || !user.email}
              onClick={() =>
                void run(() => sendPasswordReset(user.email ?? '', language)).then((ok) => ok && setResetSent(true))
              }
            >
              {t('auth.methods.setPassword')}
            </button>
          )
        )}
      </MethodRow>
      {resetSent && (
        <p className="mb-2 text-base font-bold text-moss-700 [overflow-wrap:anywhere]" role="status">
          {t('auth.methods.setPasswordSent', { email: user.email ?? '' })}
        </p>
      )}
      <MethodRow icon={<GoogleLogo />} label="Google">
        {user.hasGoogle ? (
          <span className="ml-auto flex items-center gap-3">
            <ActiveMark />
            {/* Never the last way in: a Google-only account has to add a password first. */}
            {user.hasPassword && (
              <button type="button" className={`${TEXT_ACTION} text-wood-700`} disabled={busy} onClick={() => setConfirmDisconnect(true)}>
                {t('auth.methods.disconnect')}
              </button>
            )}
          </span>
        ) : (
          <button type="button" className={`${TEXT_ACTION} text-wood-700`} disabled={busy} onClick={() => void run(() => connectGoogle(language))}>
            {busy ? t('auth.methods.connecting') : t('auth.methods.connect')}
          </button>
        )}
      </MethodRow>
      {shownError && (
        <p className="mt-2 bg-brick-600 px-3 py-2 text-base font-bold text-parchment-50 shadow-[0_0_0_3px_#2b1a12]" role="alert">
          {t(shownError)}
        </p>
      )}
      <Modal open={confirmDisconnect} onClose={() => setConfirmDisconnect(false)} title={t('auth.methods.disconnectTitle')}>
        <p className="mb-4 text-base">{t('auth.methods.disconnectHint')}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDisconnect(false)} disabled={busy}>
            {t('tasks.cancel')}
          </Button>
          <Button
            variant="brick"
            disabled={busy}
            onClick={() => void run(disconnectGoogle).then(() => setConfirmDisconnect(false))}
          >
            {t('auth.methods.disconnect')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
