import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { firebaseConfigured, getFirebase, getMissingFirebaseKeys } from '../config/firebase';
import type { HouseholdUser } from '../types';
import type { TranslationKey } from '../utils/i18n';

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
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const missingKeys = getMissingFirebaseKeys();

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
};

function toErrorKey(err: unknown): TranslationKey {
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
  console.warn('ChoreQuest: auth failed', code || err);
  return AUTH_ERROR_KEYS[code] ?? 'auth.error';
}

function toHousehold(user: User): HouseholdUser {
  return { uid: user.uid, email: user.email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HouseholdUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);

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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
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
          setError(toErrorKey(err));
        }
      },
      register: async (email, password) => {
        const firebase = getFirebase();
        if (!firebase) {
          setError('auth.missingFirebase');
          return;
        }
        setError(null);
        try {
          await createUserWithEmailAndPassword(firebase.auth, email, password);
          setDemoMode(false);
        } catch (err) {
          setError(toErrorKey(err));
        }
      },
      logout: async () => {
        const firebase = getFirebase();
        if (firebase) await signOut(firebase.auth);
        setUser(null);
        setDemoMode(false);
      },
    }),
    [demoMode, error, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
