import { Bell } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { enablePush, pushEnabledHere, pushSupport } from '../../utils/push';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * Turning notifications on for this device (hearts, the 9 PM reminder, a new Chronicle), as one row of the Display
 * card. Households only, and only until it's on: the device's own settings turn it off again, and the row comes
 * back if they do. On an iPhone outside the Home Screen app it says how to get them instead.
 */
export function NotificationsSetting() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { status } = useHousehold();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [justEnabled, setJustEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const support = pushSupport();

  useEffect(() => {
    let alive = true;
    void pushEnabledHere().then((value) => alive && setEnabled(value));
    return () => {
      alive = false;
    };
  }, []);

  if (status !== 'ready' || !user || (support !== 'ready' && support !== 'install')) return null;
  // Once on, the row goes; right after turning it on, it confirms first.
  if (enabled === null || (enabled && !justEnabled)) return null;

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const on = await enablePush(user.uid, language);
      setEnabled(on);
      setJustEnabled(on);
      if (!on) setError(Notification.permission === 'denied' ? 'notify.blocked' : 'notify.failed');
    } catch (err) {
      console.warn('ChoreQuest: notifications', err);
      setError('notify.failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 border-t-[3px] border-ink/15 pt-5">
      <p className="mb-2 text-base font-extrabold uppercase tracking-wide text-wood-700">{t('notify.title')}</p>
      {justEnabled ? (
        <p className="text-base font-bold text-moss-700" role="status">
          {t('notify.enabled')}
        </p>
      ) : support === 'install' ? (
        <p className="text-base text-wood-600">{t('notify.install')}</p>
      ) : (
        <Button className="w-full" disabled={busy} onClick={() => void turnOn()}>
          <Icon as={Bell} size={24} />
          {t('notify.on')}
        </Button>
      )}
      {error && (
        <p className="mt-2 text-sm font-bold text-brick-600" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
