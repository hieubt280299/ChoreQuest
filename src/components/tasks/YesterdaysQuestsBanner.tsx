import { Clock, Undo } from 'pixelarticons/react';
import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

/** The current time, refreshed every minute (so noon closes "Yesterday's quests" without a reload). */
export function useMinuteNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * Grace period banner on the Quests tab: until noon (and before anything is logged today), yesterday's
 * missed quests can still be finished for half gold and no XP, keeping their streaks alive.
 */
export function YesterdaysQuestsBanner({ active, count, onToggle }: { active: boolean; count: number; onToggle: () => void }) {
  const { t } = useLanguage();
  return (
    <Card tone={active ? 'ember' : 'parchment'} className="flex flex-wrap items-center gap-3 p-4">
      <Icon as={Clock} size={36} className="shrink-0 text-brick-600" />
      <div className="min-w-[12rem] flex-1">
        <p className="text-lg font-extrabold uppercase leading-tight">{t('yesterday.title')}</p>
        <p className="text-base text-wood-700">{t('yesterday.hint')}</p>
      </div>
      <Button variant={active ? 'secondary' : 'brick'} className="w-full sm:w-auto" onClick={onToggle} aria-pressed={active}>
        {active ? (
          <>
            <Icon as={Undo} size={24} />
            {t('yesterday.back')}
          </>
        ) : (
          t('yesterday.show', { count })
        )}
      </Button>
    </Card>
  );
}
