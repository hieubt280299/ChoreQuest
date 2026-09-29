import { Hourglass } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { formatCountdown, msUntilNextMonth } from '../../utils/calculations';
import { Card } from '../ui/Card';

export function MonthTimer() {
  const { t } = useLanguage();
  const [ms, setMs] = useState(msUntilNextMonth());

  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNextMonth()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const { days, hours, minutes } = formatCountdown(ms);

  return (
    <Card className="bg-gradient-to-br from-amber-warm to-white">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/80 p-3 text-amber-700">
          <Hourglass size={22} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">{t('dashboard.monthTimer')}</p>
          <p className="font-display text-xl text-stone-800">{t('dashboard.days', { days, hours, minutes })}</p>
        </div>
      </div>
    </Card>
  );
}
