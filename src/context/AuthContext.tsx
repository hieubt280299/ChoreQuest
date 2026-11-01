import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { firebaseConfigured, getFirebase, getMissingFirebaseKeys } from '../config/firebase';
import {
  authErrorCode,
  authErrorKey,
  completeGoogleLink,
  connectGoogle,
  disconnectGoogle,
  finishGoogleRedirect,
  GOOGLE_PROVIDER_ID,
  hasPendingGoogleRedirect,
  PASSWORD_PROVIDER_ID,
  signInWithGoogle,
  type AuthResult,
  type GoogleResult,
  type PendingGoogleLink,
} from '../services/authService';
import type { HouseholdUser, LanguageCode } from '../types';
import type { TranslationKey } from '../utils/i18n';
import { newPasswordProblem } from '../utils/password';

interface AuthContextValue {
  user: HouseholdUser | null;
  loading: boolean;
  demoMode: boolean;
  firebaseConfigured: boolean;
  missingKeys: string[];
  error: TranslationKey | null;
  enterDemo: () => void;
  exitDemo: () => void;
  login: (email: string, password: string) => Promise<void>;
  /** Create an account; the password must be confirmed and meet the password rules. */
  register: (email: string, password: string, confirm: string) => Promise<void>;
  /** Sign in or sign up with Google. A password account with the same email sets `pendingGoogleLink`. */
  loginWithGoogle: (language: LanguageCode) => Promise<void>;
  /** A Google sign-in waiting for the password of the account that owns its email. */
  pendingGoogleLink: PendingGoogleLink | null;
  completeGoogleLink: (email: string, password: string) => Promise<AuthResult>;
  cancelGoogleLink: () => void;
  /** Add Google to the signed-in account. */
  connectGoogle: (language: LanguageCode) => Promise<AuthResult>;
  disconnectGoogle: () => Promise<AuthResult>;
  /** Re-authenticate with the current password, then set a new one. */
  changePassword: (current: string, next: string, confirm: string) => Promise<AuthResult>;
  /**
   * Email a password-reset link (Firebase's hosted reset page, then back to the app). Resolves `ok` whether or not
   * the email has an account, so the screen never reveals which emails are registered.
   */
  sendPasswordReset: (email: string, language: LanguageCode) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const missingKeys = getMissingFirebaseKeys();

function toHousehold(user: User): HouseholdUser {
  const providers = user.providerData.map((profile) => profile.providerId);
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    hasPassword: providers.includes(PASSWORD_PROVIDER_ID),
    hasGoogle: providers.includes(GOOGLE_PROVIDER_ID),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HouseholdUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [pendingGoogleLink, setPendingGoogleLink] = useState<PendingGoogleLink | null>(null);
  // Back from Google's redirect: hold the sign-in screen until its result is in.
  const [finishingRedirect, setFinishingRedirect] = useState(() => firebaseConfigured && hasPendingGoogleRedirect());

  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(firebase.auth, (next) => {
      setUser(next ? toHousehold(next) : null);
      if (next) setDemoMode(false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /** Applies the outcome of a Google attempt; link and unlink don't fire the auth listener, so `user` is refreshed here. */
  const applyGoogleResult = useCallback((result: GoogleResult): AuthResult => {
    const current = getFirebase()?.auth.currentUser;
    if (current) setUser(toHousehold(current));
    if (result.kind === 'link-required') setPendingGoogleLink(result.link);
    if (result.kind === 'error') return { ok: false, error: result.error };
    return { ok: true };
  }, []);

  // A redirect's result can only be read once (React's StrictMode runs effects twice in development).
  const redirectRead = useRef(false);
  useEffect(() => {
    const firebase = getFirebase();
    if (!firebase || !finishingRedirect || redirectRead.current) return;
    redirectRead.current = true;
    void finishGoogleRedirect(firebase.auth).then((result) => {
      const outcome = applyGoogleResult(result);
      if (!outcome.ok) setError(outcome.error);
      setFinishingRedirect(false);
    });
  }, [applyGoogleResult, finishingRedirect]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: loading || finishingRedirect,
      demoMode,
      firebaseConfigured,
      missingKeys,
      error,
      enterDemo: () => {
        setDemoMode(true);
        setError(null);
      },
      exitDemo: () => {
        setDemoMode(false);
        setError(null);
      },
      login: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase) {
          setError('auth.missingFirebase');
          return;
        }
        setError(null);
        try {
          await signInWithEmailAndPassword(firebase.auth, email, password);
          setDemoMode(false);
        } catch (err) {
          setError(authErrorKey(err));
        }
      },
      register: async (email, password, confirm) => {
        const firebase = getFirebase();
        if (!firebase) {
          setError('auth.missingFirebase');
          return;
        }
        const problem = newPasswordProblem(password, confirm);
        if (problem) {
          setError(problem);
          return;
        }
        setError(null);
        try {
          await createUserWithEmailAndPassword(firebase.auth, email, password);
          setDemoMode(false);
        } catch (err) {
          setError(authErrorKey(err));
        }
      },
      loginWithGoogle: async (language) => {
        const firebase = getFirebase();
        if (!firebase) {
          setError('auth.missingFirebase');
          return;
        }
        setError(null);
        const outcome = applyGoogleResult(await signInWithGoogle(firebase.auth, language));
        if (!outcome.ok) setError(outcome.error);
      },
      pendingGoogleLink,
      completeGoogleLink: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase || !pendingGoogleLink) return { ok: false, error: 'auth.missingFirebase' };
        const result = await completeGoogleLink(firebase.auth, pendingGoogleLink, email, password);
        const current = firebase.auth.currentUser;
        if (current) {
          // Signed in, even if linking itself failed: Settings can connect Google later, and shows why it didn't work.
          setUser(toHousehold(current));
          setPendingGoogleLink(null);
          if (!result.ok) setError(result.error);
        }
        return result;
      },
      cancelGoogleLink: () => {
        setPendingGoogleLink(null);
        setError(null);
      },
      connectGoogle: async (language) => {
        const firebase = getFirebase();
        const account = firebase?.auth.currentUser;
        if (!firebase || !account) return { ok: false, error: 'auth.missingFirebase' };
        setError(null);
        return applyGoogleResult(await connectGoogle(firebase.auth, account, language));
      },
      disconnectGoogle: async () => {
        const account = getFirebase()?.auth.currentUser;
        if (!account) return { ok: false, error: 'auth.missingFirebase' };
        const result = await disconnectGoogle(account);
        setUser(toHousehold(account));
        return result;
      },
      changePassword: async (current, next, confirm) => {
        const firebase = getFirebase();
        const account = firebase?.auth.currentUser;
        if (!firebase || !account?.email) return { ok: false, error: 'auth.missingFirebase' };
        if (!current) return { ok: false, error: 'password.error.currentEmpty' };
        const problem = newPasswordProblem(next, confirm);
        if (problem) return { ok: false, error: problem };
        if (next === current) return { ok: false, error: 'password.error.same' };
        try {
          await reauthenticateWithCredential(account, EmailAuthProvider.credential(account.email, current));
        } catch (err) {
          const key = authErrorKey(err);
          return { ok: false, error: key === 'auth.error.invalidCredential' ? 'password.error.current' : key };
        }
        try {
          await updatePassword(account, next);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: authErrorKey(err) };
        }
      },
      sendPasswordReset: async (email, language) => {
        const firebase = getFirebase();
        if (!firebase) return { ok: false, error: 'auth.missingFirebase' };
        const address = email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { ok: false, error: 'auth.error.invalidEmail' };
        // The email is written in the player's language.
        firebase.auth.languageCode = language;
        const send = (withReturnLink: boolean) =>
          sendPasswordResetEmail(
            firebase.auth,
            address,
            // After setting the new password, the reset page offers a link back to the app.
            withReturnLink ? { url: window.location.origin, handleCodeInApp: false } : undefined,
          );
        try {
          try {
            await send(true);
          } catch (err) {
            const code = authErrorCode(err);
            // This domain isn't in Firebase's authorized domains: send the plain reset email instead.
            if (code !== 'auth/unauthorized-continue-uri' && code !== 'auth/invalid-continue-uri') throw err;
            await send(false);
          }
          return { ok: true };
        } catch (err) {
          // Same answer for unknown emails (older projects without email enumeration protection report them).
          if (authErrorCode(err) === 'auth/user-not-found') return { ok: true };
          return { ok: false, error: authErrorKey(err) };
        }
      },
      logout: async () => {
        const firebase = getFirebase();
        if (firebase) await signOut(firebase.auth);
        setUser(null);
        setDemoMode(false);
        setError(null);
      },
    }),
    [applyGoogleResult, demoMode, error, finishingRedirect, loading, pendingGoogleLink, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
