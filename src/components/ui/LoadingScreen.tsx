import { FIRE } from '../../assets/sprites';
import { PixelSprite } from './pixel/PixelSprite';

// Rendered before the language context exists, so it stays text-light and language-neutral.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6" role="status" aria-live="polite">
      <PixelSprite frames={FIRE} fps={6} scale={5} />
      <p className="px-wordmark text-base">ChoreQuest</p>
      <p className="font-arcade text-[10px] text-parchment-300">
        LOADING<span className="px-blink">_</span>
      </p>
    </div>
  );
}
