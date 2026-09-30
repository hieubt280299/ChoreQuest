import { Download } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { canInstall, promptInstall, subscribeInstallPrompt } from '../../utils/installPrompt';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export function InstallAppCard() {
  const { t } = useLanguage();
  const installable = useSyncExternalStore(subscribeInstallPrompt, canInstall);
  if (!installable) return null;

  return (
    <Card className="bg-gradient-to-br from-sage-soft to-white">
      <p className="mb-3 text-sm text-stone-600">{t('settings.installHint')}</p>
      <Button onClick={() => void promptInstall()}>
        <Download size={16} />
        {t('settings.install')}
      </Button>
    </Card>
  );
}
