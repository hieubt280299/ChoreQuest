// Captures Chrome/Android's `beforeinstallprompt` so the app can offer its own "Get the app" button, and knows
// whether that button should show at all. Imported from main.tsx so the listener exists before the browser fires
// the event (once, early).

import { detectBrowser, detectPlatform, installGuideSteps, isInAppBrowser, type InstallStep } from './installGuide';
import { isInstalledApp } from './pwaMode';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
/** Installed in this session (`appinstalled`): the button goes away until the next visit. */
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  installed = true;
  notify();
});

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The browser can open its own install dialog right now. */
export function canInstall(): boolean {
  return deferred !== null;
}

/** "Get the app" shows everywhere except inside the installed app, or right after installing it. */
export function showInstallButton(): boolean {
  return !installed && !isInstalledApp();
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  deferred = null;
  notify();
  await event.prompt();
}

/** The install guide for this device and browser, for when there's no install dialog to open. */
export function currentInstallGuide(): InstallStep[] {
  const userAgent = navigator.userAgent;
  const uaPlatform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? '';
  return installGuideSteps(
    detectPlatform(userAgent, uaPlatform, navigator.maxTouchPoints ?? 0),
    detectBrowser(userAgent),
    userAgent,
    isInAppBrowser(userAgent),
  );
}
