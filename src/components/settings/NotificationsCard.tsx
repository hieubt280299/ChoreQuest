import { Bell, BellOff } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';
import { disablePush, enablePush, pushEnabledHere, pushSupport } from '../../utils/push';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

/**
 * Notifications on this device: a heart from the partner, a 9 PM reminder on a day with no quests, and Day 1 of a new
 * Chronicle. Households only (the demo has nobody to hear from). Explains when this device can't get them.
 */
export function NotificationsCard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { status } = useHousehold();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<TranslationKey | null>(null);
  const support = pushSupport();

  useEffect(() => {
    let alive = true;
    void pushEnabledHere().then((value) => alive && setEnabled(value));
    return () => {
      alive = false;
    };
  }, []);

  if (status !== 'ready' || !user || support === 'unconfigured') return null;

  const toggle = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (enabled) {
        await disablePush(user.uid);
        setEnabled(false);
      } else {
        const on = await enablePush(user.uid, language);
        setEnabled(on);
        if (!on) setMessage(Notification.permission === 'denied' ? 'notify.blocked' : 'notify.failed');
      }
    } catch (err) {
      console.warn('ChoreQuest: notifications', err);
      setMessage('notify.failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Bell} size={24} />
        {t('notify.title')}
      </h3>
      <p className="mb-4 text-base leading-snug text-wood-600">{t('notify.hint')}</p>
      {support === 'ready' ? (
        <Button variant={enabled ? 'secondary' : 'primary'} className="w-full" disabled={busy || enabled === null} aria-pressed={!!enabled} onClick={() => void toggle()}>
          <Icon as={enabled ? BellOff : Bell} size={24} />
          {t(enabled ? 'notify.off' : 'notify.on')}
        </Button>
      ) : (
        <p className="px-slot px-3 py-2 text-base font-bold text-wood-700">{t(support === 'install' ? 'notify.install' : 'notify.unsupported')}</p>
      )}
      {enabled && <p className="mt-3 text-sm font-bold text-moss-700">{t('notify.enabled')}</p>}
      {message && (
        <p className="mt-3 text-sm font-bold text-brick-600" role="alert">
          {t(message)}
        </p>
      )}
    </Card>
  );
}
