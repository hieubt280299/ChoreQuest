import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type DocumentData, type Firestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import type { PushDevice, PushMessage } from './reminders.js';

// Server-side helpers for the Vercel functions: Firebase Admin (reads households, bypassing security rules) and Web
// Push. Configured with environment variables on Vercel; see README "Notifications".

/** Firebase Admin from `FIREBASE_SERVICE_ACCOUNT`: the service account key JSON, as is or base64-encoded. */
export function firebaseAdmin() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    const json = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    initializeApp({ credential: cert(JSON.parse(json)) });
  }
  return { auth: getAuth(), db: getFirestore() };
}

let vapidReady = false;

/** Web Push signed with the VAPID key pair (the public half is also built into the app as VITE_VAPID_PUBLIC_KEY). */
function configureWebPush() {
  if (vapidReady) return;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) throw new Error('VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set');
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  // Push services want a way to reach the sender: a mailto: or https URL.
  const subject = process.env.VAPID_SUBJECT?.trim() || (site ? `https://${site}` : 'https://chorequest.vercel.app');
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
}

/**
 * Sends a notification to one of a player's devices. A subscription the push service says is gone (the app was
 * removed or notifications were turned off in the browser) is deleted. Resolves with whether it was delivered.
 */
export async function sendToDevice(
  db: Firestore,
  uid: string,
  deviceId: string,
  device: PushDevice,
  message: PushMessage,
  ttlSeconds: number,
): Promise<boolean> {
  configureWebPush();
  try {
    await webpush.sendNotification({ endpoint: device.endpoint, keys: device.keys }, JSON.stringify(message), {
      TTL: ttlSeconds,
      urgency: 'normal',
    });
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db
        .doc(`users/${uid}`)
        .update({ [`push.devices.${deviceId}`]: FieldValue.delete() })
        .catch(() => undefined);
    } else {
      console.error('ChoreQuest: push failed', status ?? err);
    }
    return false;
  }
}

/** A player's subscribed devices (`users/{uid}.push.devices`), keyed by device id. */
export function devicesOf(data: DocumentData | undefined): Record<string, PushDevice> {
  const devices = data?.push?.devices;
  return devices && typeof devices === 'object' ? (devices as Record<string, PushDevice>) : {};
}

export const json = (body: unknown, status = 200) => Response.json(body, { status });
