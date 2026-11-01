import { useLanguage } from '../../context/LanguageContext';

/** One-tap language switch, showing the current language. On the top bar and the screens before sign-in. */
export function LanguageToggle() {
  const { t, language, setLanguage } = useLanguage();
  const label = t('language.switch');

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
      aria-label={label}
      title={label}
      className="px-btn h-11 w-11 shrink-0 p-0 font-arcade text-[11px]"
    >
      {language.toUpperCase()}
    </button>
  );
}
