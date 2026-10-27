import { useLanguage } from '../../context/LanguageContext';
import { setQuality, useQuality, type Quality } from '../../hooks/useQuality';
import { Button } from '../ui/Button';

/** Graphics quality options (inside Settings' Display card): High (full animation) or Low (still, for low-end phones) graphics, saved on this device. */
export function SettingsQualityToggle() {
  const { t } = useLanguage();
  const quality = useQuality();
  return (
    <div>
      <p className="mb-2 text-base font-extrabold uppercase tracking-wide text-wood-700">{t('quality.title')}</p>
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
    </div>
  );
}
