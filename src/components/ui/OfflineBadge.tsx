import { Cloud } from 'pixelarticons/react';
import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOnline } from '../../hooks/useOnline';
import { Icon } from './Icon';

/** Offline, actions still count and are saved once the connection is back; this says so. It stays in view just under the top bar, in the page flow so it never covers anything. Not shown in the demo. */
export function OfflineBadge() {
  const { t } = useLanguage();
  const { status } = useHousehold();
  const online = useOnline();
  if (online || status !== 'ready') return null;

  return (
    <p
      role="status"
      className="sticky top-[4.5rem] z-40 mx-auto flex w-fit items-center gap-2 whitespace-nowrap bg-ink px-3 py-0.5 text-base font-bold text-parchment-50 shadow-[0_0_0_2px_#2b1a12]"
    >
      <Icon as={Cloud} size={24} />
      {t('offline.badge')}
    </p>
  );
}
