/**
 * Whether the game runs as the installed app (home-screen or desktop PWA) rather than in a browser tab. iOS reports
 * an installed app through `navigator.standalone` (older versions don't match the `display-mode` media query), so
 * both are checked.
 */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Marks `<html>` with `pwa-mobile` when the app runs installed on a touch screen, so CSS can hide scrollbars there.
 * Re-checked when the display mode changes.
 */
function update() {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.toggle('pwa-mobile', isInstalledApp() && touch);
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  update();
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', update);
}
