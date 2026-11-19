// "Get the app": which device and browser the game runs in, and the steps to install it there. Pure functions of the
// user agent (no `window` access), so they can be tested; `installPrompt.ts` feeds them the real values.

export type InstallPlatform = 'ios' | 'android' | 'windows' | 'other';
export type InstallBrowser = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other';

/** One step of the install guide: its text and a pixel icon. */
export interface InstallStep {
  text:
    | 'install.step.openBrowser'
    | 'install.step.iosShare'
    | 'install.step.iosAdd'
    | 'install.step.androidMenu'
    | 'install.step.androidAdd'
    | 'install.step.androidChrome'
    | 'install.step.chromeMenu'
    | 'install.step.chromeInstall'
    | 'install.step.chromeIcon'
    | 'install.step.edgeMenu'
    | 'install.step.edgeInstall'
    | 'install.step.safariDock'
    | 'install.step.unsupported';
  icon: 'external' | 'share' | 'plus' | 'menuVertical' | 'menuHorizontal' | 'download' | 'dock' | 'close';
}

/**
 * The device: iOS, Android, Windows or something else. `uaPlatform` is `navigator.userAgentData.platform` where the
 * browser has it (Chrome, Edge). iPadOS asks for desktop pages and calls itself a Mac, so a "Macintosh" with a touch
 * screen counts as iOS.
 */
export function detectPlatform(userAgent: string, uaPlatform = '', maxTouchPoints = 0): InstallPlatform {
  const platform = uaPlatform.toLowerCase();
  if (platform === 'android') return 'android';
  if (platform === 'windows') return 'windows';
  if (platform === 'ios') return 'ios';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  if (/Windows/i.test(userAgent)) return 'windows';
  return 'other';
}

/** The browser, from its user agent. Edge and Samsung Internet also say "Chrome", so they're checked first. */
export function detectBrowser(userAgent: string): InstallBrowser {
  if (/Edg(e|A|iOS)?\//.test(userAgent)) return 'edge';
  if (/SamsungBrowser\//.test(userAgent)) return 'samsung';
  if (/Firefox\/|FxiOS\//.test(userAgent)) return 'firefox';
  if (/Chrome\/|CriOS\//.test(userAgent)) return 'chrome';
  if (/Safari\//.test(userAgent) && /Version\//.test(userAgent)) return 'safari';
  return 'other';
}

/** The built-in browser of Zalo, Facebook, Messenger or Instagram, which can't install apps. */
export function isInAppBrowser(userAgent: string): boolean {
  return /Zalo|FBAN|FBAV|FB_IAB|Instagram/i.test(userAgent);
}

/** Safari's major version ("Version/17.2" → 17), 0 when unknown. Add to Dock needs Safari 17 (macOS 14). */
function safariVersion(userAgent: string): number {
  const match = /Version\/(\d+)/.exec(userAgent);
  return match ? Number(match[1]) : 0;
}

/**
 * The install guide for a device and browser, shown when the browser can't open its own install dialog: 2–3 short
 * steps. An in-app browser first has to open the page in a real browser.
 */
export function installGuideSteps(platform: InstallPlatform, browser: InstallBrowser, userAgent = '', inApp = false): InstallStep[] {
  const open: InstallStep[] = inApp ? [{ text: 'install.step.openBrowser', icon: 'external' }] : [];
  if (platform === 'ios') {
    return [...open, { text: 'install.step.iosShare', icon: 'share' }, { text: 'install.step.iosAdd', icon: 'plus' }];
  }
  if (platform === 'android') {
    return [
      ...open,
      { text: 'install.step.androidMenu', icon: 'menuVertical' },
      { text: 'install.step.androidAdd', icon: 'download' },
      ...(inApp ? [] : [{ text: 'install.step.androidChrome', icon: 'external' } as InstallStep]),
    ];
  }
  if (inApp) return open;
  if (browser === 'edge') {
    return [
      { text: 'install.step.edgeMenu', icon: 'menuHorizontal' },
      { text: 'install.step.edgeInstall', icon: 'download' },
    ];
  }
  if (browser === 'chrome') {
    return [
      { text: 'install.step.chromeMenu', icon: 'menuVertical' },
      { text: 'install.step.chromeInstall', icon: 'download' },
      { text: 'install.step.chromeIcon', icon: 'plus' },
    ];
  }
  if (browser === 'safari' && platform === 'other' && safariVersion(userAgent) >= 17) {
    return [{ text: 'install.step.safariDock', icon: 'dock' }];
  }
  // Firefox, older Safari and anything else on a computer can't install web apps.
  return [{ text: 'install.step.unsupported', icon: 'close' }];
}
