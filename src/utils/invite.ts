import { HOUSEHOLD_CODE_LENGTH, normalizeHouseholdCode } from './calculations';

const STORAGE_KEY = 'chorequest.inviteCode';

/** The household code in an invite link's query string (`?join=A7K9X2`), if it's a valid one. */
export function parseInviteCode(search: string): string | null {
  const code = normalizeHouseholdCode(new URLSearchParams(search).get('join') ?? '');
  return code.length === HOUSEHOLD_CODE_LENGTH ? code : null;
}

export function inviteUrl(code: string, origin: string): string {
  return `${origin}/?join=${code}`;
}

/**
 * Keeps the code from an opened invite link until the player reaches the join screen: signing up can take a while,
 * and Google's redirect sign-in leaves the page. The code is then removed from the address bar.
 */
export function captureInvite() {
  const code = parseInviteCode(window.location.search);
  if (!code) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Storage unavailable: the player can still type the code.
  }
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function readInvite(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearInvite() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: nothing was kept.
  }
}
