import { APP_VERSION } from '../constants/patchNotes';
import { isWheelBusy } from '../hooks/useWheelBusy';
import { savesInFlight } from './savesInFlight';

/** How often a long-open app looks for a new version (it also looks on launch, on resume and when back online). */
const CHECK_EVERY_MS = 30 * 60 * 1000;
// The version this tab already reloaded for, so a version that can't be fetched yet never causes a reload loop.
const RELOADED_KEY = 'chorequest.reloadedFor';

/** Whether the published version (`/version.json`) should replace the one running. */
export function needsReload(latest: string | null | undefined, current: string, alreadyReloadedFor: string | null): boolean {
  return !!latest && latest !== current && latest !== alreadyReloadedFor;
}

/** Something a reload would interrupt: an action still saving, an open dialog, a field being typed in, or a spinning wheel. */
function busy(): boolean {
  const active = document.activeElement;
  return (
    savesInFlight() ||
    isWheelBusy() ||
    !!document.querySelector('[role="dialog"]') ||
    (active instanceof HTMLElement && active.matches('input, textarea, select'))
  );
}

/**
 * Runs `action` as soon as nothing is in progress. In the background only a save still running holds it back,
 * since nobody is looking at a dialog or typing there.
 */
function whenIdle(action: () => void) {
  const idle = document.visibilityState === 'hidden' ? !savesInFlight() : !busy();
  if (idle) action();
  else window.setTimeout(() => whenIdle(action), 2000);
}

/**
 * Lets a downloaded new version take over. The service worker waits until it's told to (otherwise it would wait for
 * every window of the app to close, which an installed app on a phone rarely does), so it's told once nothing is in
 * progress; `controllerchange` then reloads the app into it. The very first install needs none of this.
 */
function promote(registration: ServiceWorkerRegistration) {
  const waiting = registration.waiting;
  if (!waiting || !navigator.serviceWorker.controller) return;
  whenIdle(() => waiting.postMessage({ type: 'SKIP_WAITING' }));
}

async function checkVersion(registration: ServiceWorkerRegistration | null) {
  try {
    const response = await fetch('/version.json', { cache: 'no-store' });
    if (!response.ok) return;
    const { version } = (await response.json()) as { version?: string };
    let reloadedFor: string | null = null;
    try {
      reloadedFor = sessionStorage.getItem(RELOADED_KEY);
    } catch {
      // Storage unavailable: still safe, the version check just runs again next time.
    }
    if (!version || !needsReload(version, APP_VERSION, reloadedFor)) return;
    await registration?.update();
    // Normally the new service worker downloads, takes over and reloads the app. If that hasn't happened after a while
    // (or there's no service worker), reload anyway, once for this version.
    window.setTimeout(
      () => {
        if (registration?.waiting) {
          promote(registration);
          return;
        }
        try {
          sessionStorage.setItem(RELOADED_KEY, version);
        } catch {
          // Storage unavailable: reload anyway.
        }
        whenIdle(() => window.location.reload());
      },
      registration ? 20_000 : 0,
    );
  } catch {
    // Offline or the file is missing: try again on the next check.
  }
}

/**
 * Keeps an installed app on the latest version. Phones resume a home-screen app without reloading it, so the browser
 * rarely looks for a new service worker, and a new one would wait for the app to be closed anyway. This registers the
 * worker itself, checks for updates on launch, on resume, when back online and every 30 minutes, lets a new version
 * take over once nothing is in progress, and compares the running version with `/version.json` as a fallback.
 */
export function startAppUpdates() {
  if (import.meta.env.DEV) return;
  const watch = (registration: ServiceWorkerRegistration | null) => {
    const check = () => {
      registration?.update().catch(() => undefined);
      void checkVersion(registration);
    };
    if (registration) {
      promote(registration);
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') promote(registration);
        });
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', check);
    window.setInterval(check, CHECK_EVERY_MS);
    void checkVersion(registration);
  };

  if (!('serviceWorker' in navigator)) {
    watch(null);
    return;
  }
  // The first install takes control without needing a reload; after that, a new controller means a new version. It
  // can come from another tab of the app that was idle, so this tab still waits until it's idle itself.
  let controlled = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) whenIdle(() => window.location.reload());
    controlled = true;
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(watch)
      .catch((err) => {
        console.warn('ChoreQuest: service worker registration failed', err);
        watch(null);
      });
  });
}
