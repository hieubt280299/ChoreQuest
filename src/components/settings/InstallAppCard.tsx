import { Download } from 'pixelarticons/react';
import { useSyncExternalStore } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { canInstall, promptInstall, subscribeInstallPrompt } from '../../utils/installPrompt';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

export function InstallAppCard() {
  const { t } = useLanguage();
  const installable = useSyncExternalStore(subscribeInstallPrompt, canInstall);
  if (!installable) return null;

  return (
    <Card tone="moss" className="flex flex-wrap items-center gap-4">
      <p className="min-w-48 flex-1 text-lg font-bold">{t('settings.installHint')}</p>
      <Button variant="moss" onClick={() => void promptInstall()}>
        <Icon as={Download} size={24} />
        {t('settings.install')}
      </Button>
    </Card>
  );
}
