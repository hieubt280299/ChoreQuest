import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LanguageCode } from '../types';
import { interpolate, translations, type TranslationKey } from '../utils/i18n';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: Translate;
  locale: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Per device, so each partner keeps their own language even though they share one household.
const STORAGE_KEY = 'chorequest.language';

function initialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'vi') return saved;
    // Earlier versions kept the language inside the saved demo game.
    const legacy = JSON.parse(localStorage.getItem('chorequest.game.v1') ?? 'null') as { language?: string } | null;
    if (legacy?.language === 'en' || legacy?.language === 'vi') return legacy.language;
  } catch {
    // Storage unavailable: fall back to the browser language.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(initialLanguage);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice still applies for this session.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback<Translate>(
    (key, vars) => {
      const dict: Partial<Record<TranslationKey, string>> = translations[language];
      const template = dict[key] ?? translations.en[key] ?? key;
      if (key === 'character.skillPoints' && vars && Number(vars.count) !== 1) {
        return interpolate(dict['character.skillPoints_plural'] ?? template, vars);
      }
      return interpolate(template, vars);
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale: language === 'vi' ? 'vi-VN' : 'en-US',
    }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
