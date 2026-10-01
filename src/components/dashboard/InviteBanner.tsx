import { useHousehold } from '../../context/HouseholdContext';
import { useLanguage } from '../../context/LanguageContext';
import { Card } from '../ui/Card';
import { HouseholdCode } from '../ui/HouseholdCode';

/** Until both partners have joined, the household isn't active: show the code to share. */
export function InviteBanner() {
  const { t } = useLanguage();
  const { status, household, isActive } = useHousehold();
  if (status !== 'ready' || isActive || !household) return null;

  return (
    <Card tone="ember" className="space-y-3">
      <p className="text-lg font-bold">{t('household.waiting')}</p>
      <HouseholdCode code={household.data.code} />
      <p className="text-base">{t('household.waitingPlay')}</p>
    </Card>
  );
}
