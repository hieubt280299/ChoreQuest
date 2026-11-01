import {
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  unlink,
  type Auth,
  type OAuthCredential,
  type User,
} from 'firebase/auth';
import type { LanguageCode } from '../types';
import type { TranslationKey } from '../utils/i18n';

export const GOOGLE_PROVIDER_ID = GoogleAuthProvider.PROVIDER_ID;
export const PASSWORD_PROVIDER_ID = 'password';

/** A Google sign-in waiting for the password of the account that already owns its email. */
export interface PendingGoogleLink {
  /** Missing when Firebase doesn't report the email: the link screen then asks for it. */
  email: string | null;
  credential: OAuthCredential;
}

export type GoogleResult =
  | { kind: 'done' }
  /** The page is leaving for Google; the result is picked up by finishGoogleRedirect on return. */
  | { kind: 'redirecting' }
  | { kind: 'cancelled' }
  | { kind: 'link-required'; link: PendingGoogleLink }
  | { kind: 'error'; error: TranslationKey };

export type AuthResult = { ok: true } | { ok: false; error: TranslationKey };

const AUTH_ERROR_KEYS: Record<string, TranslationKey> = {
  'auth/invalid-credential': 'auth.error.invalidCredential',
  'auth/wrong-password': 'auth.error.invalidCredential',
  'auth/user-not-found': 'auth.error.invalidCredential',
  'auth/email-already-in-use': 'auth.error.emailInUse',
  'auth/weak-password': 'auth.error.weakPassword',
  'auth/invalid-email': 'auth.error.invalidEmail',
  'auth/operation-not-allowed': 'auth.error.notEnabled',
  'auth/configuration-not-found': 'auth.error.notEnabled',
  'auth/network-request-failed': 'auth.error.network',
  'auth/too-many-requests': 'auth.error.tooMany',
  'auth/requires-recent-login': 'auth.error.recentLogin',
};

const GOOGLE_ERROR_KEYS: Record<string, TranslationKey> = {
  // Connecting a Google account that already belongs to another ChoreQuest account.
  'auth/credential-already-in-use': 'auth.google.error.inUse',
  'auth/email-already-in-use': 'auth.google.error.inUse',
  'auth/unauthorized-domain': 'auth.google.error.domain',
  'auth/user-mismatch': 'auth.google.error.mismatch',
  'auth/popup-blocked': 'auth.google.error.popup',
  'auth/operation-not-supported-in-this-environment': 'auth.google.error.popup',
};

const CANCELLED_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);
const POPUP_UNAVAILABLE_CODES = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment']);

export function authErrorCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
}

export function authErrorKey(err: unknown): TranslationKey {
  const code = authErrorCode(err);
  console.warn('ChoreQuest: auth failed', code || err);
  return AUTH_ERROR_KEYS[code] ?? 'auth.error';
}

/**
 * Turns a failed Google attempt into what the app should do next. `auth/account-exists-with-different-credential`
 * means a password account owns this email: keep Google's credential, so entering the password can link the two
 * and the player stays on one uid (data is keyed by uid, so nothing has to move).
 */
export function resolveGoogleError(err: unknown): GoogleResult {
  const code = authErrorCode(err);
  if (CANCELLED_CODES.has(code)) return { kind: 'cancelled' };
  if (code === 'auth/account-exists-with-different-credential') {
    const credential = GoogleAuthProvider.credentialFromError(err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
    if (credential) {
      const email = (err as { customData?: { email?: unknown } }).customData?.email;
      return { kind: 'link-required', link: { email: typeof email === 'string' ? email : null, credential } };
    }
  }
  console.warn('ChoreQuest: Google sign-in failed', code || err);
  return { kind: 'error', error: GOOGLE_ERROR_KEYS[code] ?? AUTH_ERROR_KEYS[code] ?? 'auth.google.error.generic' };
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  // A shared phone can hold both partners' Google accounts, so always ask which one.
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

// Set just before leaving for Google, so the return can tell "came back with nothing" from a normal launch.
const REDIRECT_FLAG = 'chorequest.googleRedirect';

function setRedirectFlag(on: boolean) {
  try {
    if (on) sessionStorage.setItem(REDIRECT_FLAG, '1');
    else sessionStorage.removeItem(REDIRECT_FLAG);
  } catch {
    // Storage unavailable: a failed redirect just won't show an error.
  }
}

export function hasPendingGoogleRedirect(): boolean {
  try {
    return sessionStorage.getItem(REDIRECT_FLAG) !== null;
  } catch {
    return false;
  }
}

/** iPhone home-screen apps can't rely on popups. */
function popupUnreliable(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

async function popupOrRedirect(popup: () => Promise<unknown>, redirect: () => Promise<void>): Promise<GoogleResult> {
  const leave = async (): Promise<GoogleResult> => {
    setRedirectFlag(true);
    try {
      await redirect();
      return { kind: 'redirecting' };
    } catch (err) {
      setRedirectFlag(false);
      return resolveGoogleError(err);
    }
  };
  if (popupUnreliable()) return leave();
  try {
    await popup();
    return { kind: 'done' };
  } catch (err) {
    return POPUP_UNAVAILABLE_CODES.has(authErrorCode(err)) ? leave() : resolveGoogleError(err);
  }
}

export function signInWithGoogle(auth: Auth, language: LanguageCode): Promise<GoogleResult> {
  auth.languageCode = language;
  const provider = googleProvider();
  return popupOrRedirect(
    () => signInWithPopup(auth, provider),
    () => signInWithRedirect(auth, provider),
  );
}

/** Adds Google to the signed-in account. This keeps its password, unlike signing in with Google from the start screen. */
export function connectGoogle(auth: Auth, user: User, language: LanguageCode): Promise<GoogleResult> {
  auth.languageCode = language;
  const provider = googleProvider();
  return popupOrRedirect(
    () => linkWithPopup(user, provider),
    () => linkWithRedirect(user, provider),
  );
}

/** Call once on launch when hasPendingGoogleRedirect() is true: collects the result of the redirect the app started. */
export async function finishGoogleRedirect(auth: Auth): Promise<GoogleResult> {
  try {
    const result = await getRedirectResult(auth);
    return result ? { kind: 'done' } : { kind: 'error', error: 'auth.google.error.redirect' };
  } catch (err) {
    return resolveGoogleError(err);
  } finally {
    setRedirectFlag(false);
  }
}

/**
 * Signs in to the account that owns the email, then attaches the waiting Google credential to it. If the password
 * was right but linking fails, the player stays signed in (with an error) and can connect Google from Settings.
 */
export async function completeGoogleLink(auth: Auth, link: PendingGoogleLink, email: string, password: string): Promise<AuthResult> {
  let user: User;
  try {
    user = (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
  } catch (err) {
    const key = authErrorKey(err);
    return { ok: false, error: key === 'auth.error.invalidCredential' ? 'password.error.current' : key };
  }
  try {
    await linkWithCredential(user, link.credential);
    return { ok: true };
  } catch (err) {
    const result = resolveGoogleError(err);
    return { ok: false, error: result.kind === 'error' ? result.error : 'auth.google.error.generic' };
  }
}

export async function disconnectGoogle(user: User): Promise<AuthResult> {
  try {
    await unlink(user, GOOGLE_PROVIDER_ID);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: authErrorKey(err) };
  }
}

/** Confirms a Google-only player before a sensitive action. A popup only: a redirect would lose the action in progress. */
export async function reauthenticateWithGoogle(auth: Auth, user: User, language: LanguageCode): Promise<GoogleResult> {
  auth.languageCode = language;
  try {
    await reauthenticateWithPopup(user, googleProvider());
    return { kind: 'done' };
  } catch (err) {
    return resolveGoogleError(err);
  }
}
