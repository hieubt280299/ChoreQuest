import { Monitor } from 'pixelarticons/react';
import { useLanguage } from '../../context/LanguageContext';
import { setQuality, useQuality, type Quality } from '../../hooks/useQuality';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

/** Settings card: High (full animation) or Low (still, for low-end phones) graphics, saved on this device. */
export function SettingsQualityToggle() {
  const { t } = useLanguage();
  const quality = useQuality();
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold uppercase tracking-wide text-brick-600">
        <Icon as={Monitor} size={24} />
        {t('quality.title')}
      </h2>
      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={t('quality.title')}>
        {(['high', 'low'] as Quality[]).map((option) => (
          <Button
            key={option}
            role="radio"
            aria-checked={quality === option}
            variant={quality === option ? 'primary' : 'secondary'}
            onClick={() => setQuality(option)}
          >
            {t(option === 'high' ? 'quality.high' : 'quality.low')}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-base text-wood-600">{t(quality === 'high' ? 'quality.highHint' : 'quality.lowHint')}</p>
    </Card>
  );
}
