import { useLanguage } from '../../context/LanguageContext';
import type { ThemeId } from '../../types';
import { CharacterAvatar } from '../ui/CharacterAvatar';
import { ProgressBar } from '../ui/ProgressBar';

/**
 * A miniature screen drawn in a theme: its page background, wood top bar, a title, and a character card
 * with an XP bar and a button. It uses the real components under `data-theme`, rendered at double size and
 * scaled down, so it shows exactly how the theme looks.
 */
export function ThemePreview({ theme }: { theme: ThemeId }) {
  const { t } = useLanguage();
  return (
    <span className="relative block h-[92px] w-full overflow-hidden shadow-[0_0_0_2px_#2b1a12]" aria-hidden>
      <span data-theme={theme} className="theme-bg absolute left-0 top-0 block h-[200%] w-[200%] origin-top-left scale-50">
        <span className="px-panel-wood flex h-9 items-center border-b-4 border-ink px-3">
          <span className="px-wordmark text-[10px]">ChoreQuest</span>
        </span>
        <span className="px-title mx-3 mt-2 block text-2xl leading-none">{t('dashboard.title')}</span>
        <span className="px-panel mx-3 mt-3 flex items-center gap-2 p-2">
          <CharacterAvatar id="husband" avatar="knight" scale={2} />
          <span className="min-w-0 flex-1 space-y-2">
            <ProgressBar percent={62} />
            <span className="px-btn px-btn-primary block px-2 py-0.5 text-center text-sm">{t('tasks.complete')}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
