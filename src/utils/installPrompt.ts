// Captures Chrome/Android's `beforeinstallprompt` so the app can offer its own "Install" button.
// Imported from main.tsx so the listener exists before the browser fires the event (once, early).

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  notify();
});

export function subscribeInstallPrompt(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canInstall(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<void> {
  if (!deferred) return;
  const event = deferred;
  deferred = null;
  notify();
  await event.prompt();
}
