import { useThemeModule } from '../../themes';
import type { ThemeId } from '../../types';
import { CabinScene } from '../dashboard/CabinScene';
import { ProgressBar } from '../ui/ProgressBar';

/**
 * A miniature screen in a theme: its page background, wood top bar, its own scene and an XP bar, drawn
 * with the real components under `data-theme` at double size and scaled down. The theme's chunk (scene and
 * CSS) is fetched when the preview first shows.
 */
export function ThemePreview({ theme }: { theme: ThemeId }) {
  const loaded = useThemeModule(theme);
  return (
    <span className="relative block h-[92px] w-full overflow-hidden bg-wood-800 shadow-[0_0_0_2px_#2b1a12]" aria-hidden>
      {loaded && (
        <span data-theme={theme} className="theme-bg absolute left-0 top-0 block h-[200%] w-[200%] origin-top-left scale-50">
          <span className="px-panel-wood flex h-9 items-center border-b-4 border-ink px-3">
            <span className="px-wordmark text-[10px]">ChoreQuest</span>
          </span>
          <span className="mx-3 mt-2 block">
            <span className="px-panel px-panel-wood block p-1">
              <CabinScene theme={theme} />
            </span>
          </span>
          <span className="mx-3 mt-2 block">
            <ProgressBar percent={62} />
          </span>
        </span>
      )}
    </span>
  );
}
