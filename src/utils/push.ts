import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebase } from '../config/firebase';
import type { LanguageCode } from '../types';

// Push notifications (reminders and hearts) for household players. The app subscribes this device with the browser's
// push service and saves the subscription on the player's own `users/{uid}` document; Vercel functions (`api/`)
// send the notifications from there, so they arrive even when the app is closed.

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() ?? '';
const DEVICE_KEY = 'chorequest.pushDevice';
// What this device last saved, so a launch only writes when something changed.
const SAVED_KEY = 'chorequest.pushSaved';

/** One subscribed device, as stored under `users/{uid}.push.devices.{deviceId}`. */
export interface PushDevice {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  /** IANA time zone, so reminders come at 9 PM local time. */
  timeZone: string;
  language: LanguageCode;
  updatedAt: number;
}

/**
 * Whether notifications can be turned on here: `unconfigured` (no VAPID key in this build), `unsupported` (no push in
 * this browser), `install` (an iPhone or iPad only allows push in the app added to the Home Screen) or `ready`.
 */
export type PushSupport = 'unconfigured' | 'unsupported' | 'install' | 'ready';

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return 'unconfigured';
  if (typeof window === 'undefined') return 'unsupported';
  if (isIos() && !standalone()) return 'install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  return 'ready';
}

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return 'device';
  }
}

/** The VAPID key as the bytes `pushManager.subscribe` wants. */
function applicationServerKey(): Uint8Array {
  const padded = `${VAPID_PUBLIC_KEY}${'='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  // The app registers the service worker on load (utils/appUpdate.ts); `ready` waits for it.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 10_000)),
  ]);
}

function toDevice(subscription: PushSubscription, language: LanguageCode): PushDevice | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return null;
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    language,
    updatedAt: Date.now(),
  };
}

async function saveDevice(uid: string, device: PushDevice) {
  const firebase = getFirebase();
  if (!firebase) throw new Error('Firebase is not configured');
  const id = deviceId();
  await setDoc(doc(firebase.db, 'users', uid), { pushEnabled: true, push: { devices: { [id]: device } } }, { merge: true });
  try {
    localStorage.setItem(SAVED_KEY, `${device.endpoint}|${device.timeZone}|${device.language}`);
  } catch {
    // Storage unavailable: it's saved again next launch.
  }
}

/** This device's push subscription, if it has one (without waiting for the service worker to start). */
async function currentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager?.getSubscription()) ?? null;
}

/** Whether this device currently has notifications on (permission granted and subscribed). */
export async function pushEnabledHere(): Promise<boolean> {
  if (pushSupport() !== 'ready' || Notification.permission !== 'granted') return false;
  return !!(await currentSubscription());
}

/**
 * Turns notifications on for this device: asks for permission (call it from a tap), subscribes with the push
 * service and saves the subscription for the player. Resolves with false if permission was refused.
 */
export async function enablePush(uid: string, language: LanguageCode): Promise<boolean> {
  if (pushSupport() !== 'ready') return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  const reg = await registration();
  if (!reg) return false;
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey() as BufferSource }));
  const device = toDevice(subscription, language);
  if (!device) return false;
  await saveDevice(uid, device);
  return true;
}

/**
 * Signing out: this device stops getting the account's notifications, so a phone that changes hands never shows
 * the previous player's hearts and reminders. Quick when the device was never subscribed.
 */
export async function forgetPushDevice(uid: string): Promise<void> {
  const subscription = await currentSubscription().catch(() => null);
  if (!subscription) return;
  await subscription.unsubscribe().catch(() => undefined);
  const firebase = getFirebase();
  if (!firebase) return;
  const ref = doc(firebase.db, 'users', uid);
  await updateDoc(ref, { [`push.devices.${deviceId()}`]: deleteField() }).catch(() => undefined);
  // Reminders stop for the account once no device is left.
  const devices = (await getDoc(ref).catch(() => null))?.get('push.devices') as Record<string, unknown> | undefined;
  if (!devices || Object.keys(devices).length === 0) await updateDoc(ref, { pushEnabled: false }).catch(() => undefined);
  try {
    localStorage.removeItem(SAVED_KEY);
  } catch {
    // Nothing to forget.
  }
}

/**
 * Keeps this device's saved subscription current on launch: browsers may renew it, and the language or time zone
 * may have changed. Only writes when something did.
 */
export async function refreshPush(uid: string, language: LanguageCode): Promise<void> {
  if (pushSupport() !== 'ready' || Notification.permission !== 'granted') return;
  const reg = await registration();
  const subscription = await reg?.pushManager.getSubscription();
  if (!subscription) return;
  const device = toDevice(subscription, language);
  if (!device) return;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(SAVED_KEY);
  } catch {
    // Storage unavailable: save to be sure.
  }
  if (saved === `${device.endpoint}|${device.timeZone}|${device.language}`) return;
  await saveDevice(uid, device).catch((err) => console.warn('ChoreQuest: could not save the push subscription', err));
}

/** Asks the server to notify the partner of the heart this player just sent (best effort, never blocks the game). */
export async function notifyPartnerOfHeart(): Promise<void> {
  try {
    const token = await getFirebase()?.auth.currentUser?.getIdToken();
    if (!token) return;
    await fetch('/api/heart', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    // Offline or no server (local preview): the heart itself is already saved.
  }
}
