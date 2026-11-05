import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useLanguage } from '../context/LanguageContext';
import { refreshPush } from '../utils/push';

/**
 * Keeps this device's notification subscription saved and current (it can be renewed by the browser, and the
 * notifications follow the app language and time zone) for a player in a household.
 */
export function usePushRefresh() {
  const { user } = useAuth();
  const { status } = useHousehold();
  const { language } = useLanguage();
  const uid = user?.uid;
  useEffect(() => {
    if (uid && status === 'ready') void refreshPush(uid, language);
  }, [uid, status, language]);
}
