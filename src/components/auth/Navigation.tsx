import { CalendarDays, Home, Settings, Swords, Trees } from 'lucide-react';
import type { AppView } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../utils/i18n';

const items: { id: AppView; icon: typeof Home; label: TranslationKey }[] = [
  { id: 'dashboard', icon: Home, label: 'nav.dashboard' },
  { id: 'tasks', icon: Swords, label: 'nav.tasks' },
  { id: 'skills', icon: Trees, label: 'nav.skills' },
  { id: 'calendar', icon: CalendarDays, label: 'nav.calendar' },
  { id: 'settings', icon: Settings, label: 'nav.settings' },
];

export function BottomNav({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}) {
  const { t } = useLanguage();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/60 bg-white/90 px-2 py-2 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-1 text-[11px] font-bold ${
                active ? 'text-amber-800' : 'text-stone-400'
              }`}
            >
              <Icon size={18} />
              {t(item.label)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SideNav({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}) {
  const { t } = useLanguage();
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <div className="sticky top-6 space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${
                active ? 'bg-white text-amber-800 shadow-cozy' : 'text-stone-500 hover:bg-white/60'
              }`}
            >
              <Icon size={18} />
              {t(item.label)}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
