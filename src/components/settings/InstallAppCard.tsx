import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { InstallButton, useInstallButton } from '../ui/InstallButton';

/** Settings card for "Get the app": same button and rules as the top bar and menus (hidden in the installed app). */
export function InstallAppCard() {
  const { t } = useLanguage();
  if (!useInstallButton()) return null;

  return (
    <Card tone="moss" className="flex flex-wrap items-center gap-4">
      <p className="min-w-48 flex-1 text-lg font-bold">{t('settings.installHint')}</p>
      <InstallButton variant="card" />
    </Card>
  );
}
