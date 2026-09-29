import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

function readConfig() {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
}

export function getMissingFirebaseKeys(): string[] {
  const config = readConfig();
  const values: Record<(typeof requiredKeys)[number], string | undefined> = {
    VITE_FIREBASE_API_KEY: config.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: config.authDomain,
    VITE_FIREBASE_PROJECT_ID: config.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: config.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: config.messagingSenderId,
    VITE_FIREBASE_APP_ID: config.appId,
  };
  return requiredKeys.filter((key) => !values[key]?.trim());
}

export const firebaseConfigured = getMissingFirebaseKeys().length === 0;

let services: FirebaseServices | null = null;

export function getFirebase(): FirebaseServices | null {
  if (!firebaseConfigured) return null;
  if (services) return services;
  const app = initializeApp(readConfig());
  services = {
    app,
    auth: getAuth(app),
    // Offline cache keeps the app usable on flaky mobile connections and syncs when back online.
    db: initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }),
  };
  return services;
}
