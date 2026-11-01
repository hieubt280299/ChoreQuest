import { useLanguage } from '../../context/LanguageContext';

export function LevelBadge({ level, className = '' }: { level: number; className?: string }) {
  const { t, language } = useLanguage();
  return (
    // "Cấp" has letters the arcade font lacks.
    <span className={`px-level ${language === 'vi' ? 'font-sans text-sm font-extrabold uppercase' : ''} ${className}`}>
      {t('level.short')}
      <span className="text-flame-300">{level}</span>
    </span>
  );
}
