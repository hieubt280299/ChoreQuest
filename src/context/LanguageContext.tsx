import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
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

export function LanguageProvider({
  children,
  language,
  setLanguage,
}: {
  children: ReactNode;
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
}) {
  const t = useCallback<Translate>(
    (key, vars) => {
      const dict = translations[language];
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
