import { Hourglass } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCountdown, msUntilNextMonth } from '../../utils/calculations';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

export function MonthTimer() {
  const { t } = useLanguage();
  const [ms, setMs] = useState(msUntilNextMonth());

  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNextMonth()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { days, hours, minutes } = formatCountdown(ms);
  const digit = (value: number, unit: string) => (
    <span className="flex items-baseline gap-1">
      <span className="font-arcade text-base text-flame-300">{String(value).padStart(2, '0')}</span>
      <span className="text-sm font-bold uppercase text-parchment-300">{unit}</span>
    </span>
  );

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2 text-brick-600">
        <Icon as={Hourglass} size={24} />
        <p className="text-lg font-extrabold uppercase tracking-wide">{t('dashboard.monthTimer')}</p>
      </div>
      {/* Retro LCD-style countdown */}
      <div
        className="px-slot-dark flex items-center justify-center gap-5 px-3 py-3"
        role="timer"
        aria-label={t('dashboard.days', { days, hours, minutes })}
      >
        {digit(days, 'd')}
        {digit(hours, 'h')}
        {digit(minutes, 'm')}
      </div>
    </Card>
  );
}
