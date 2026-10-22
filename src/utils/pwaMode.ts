/**
 * Marks `<html>` with `pwa-mobile` when the app runs installed (home-screen PWA) on a touch screen, so CSS can
 * hide scrollbars there. iOS reports an installed app through `navigator.standalone` (older versions don't match
 * the `display-mode` media query), so both are checked. Re-checked when the display mode changes.
 */
function update() {
  const installed =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const touch = window.matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.toggle('pwa-mobile', installed && touch);
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  update();
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', update);
}
