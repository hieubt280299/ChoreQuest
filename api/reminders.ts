import { timingSafeEqual } from 'node:crypto';
import { FieldPath, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { dueReminder, localClock, reminderMessage, type HouseholdData } from './_lib/reminders.js';
import { devicesOf, firebaseAdmin, json, sendToDevice } from './_lib/server.js';

/** Players read per page, so memory stays flat however many turn notifications on. */
const PAGE_SIZE = 200;

/** Constant-time check of Vercel Cron's `Authorization: Bearer <CRON_SECRET>`. */
function isCronCall(header: string | null, secret: string): boolean {
  const given = Buffer.from(header ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Sends what's due to one player's devices and resolves with how many were delivered. A device that fails (bad saved
 * data, a push service error) is logged and skipped, so it never stops the player's other devices or anyone else.
 */
async function remindPlayer(
  db: Firestore,
  user: QueryDocumentSnapshot,
  household: (id: string) => Promise<HouseholdData | undefined>,
  now: Date,
): Promise<number> {
  const householdId = user.get('householdId');
  if (typeof householdId !== 'string') return 0;
  const data = await household(householdId);
  const member = data?.members?.[user.id];
  if (!data || !member) return 0;
  let sent = 0;
  for (const [deviceId, device] of Object.entries(devicesOf(user.data()))) {
    try {
      const due = dueReminder(data, member.characterId, device, localClock(now, device.timeZone));
      if (!due) continue;
      // Mark it first, so a slow or repeated run can't send it twice; a missed one isn't worth a second try. Path
      // segments, never a dotted string: the device id is player data, not a path to parse.
      await user.ref.update(new FieldPath('push', 'devices', deviceId, 'sent', due.kind), due.key);
      const ttl = due.kind === 'evening' ? 60 * 60 * 2 : 60 * 60 * 12;
      if (await sendToDevice(db, user.id, deviceId, device, reminderMessage(device.language, due.kind), ttl)) sent += 1;
    } catch (err) {
      console.error('ChoreQuest: reminder failed for a device', err);
    }
  }
  return sent;
}

/**
 * GET /api/reminders, run by Vercel Cron at the top of every hour (vercel.json): for each device with notifications
 * on, sends what's due at its local time (see `dueReminder`): Day 1 of a new Chronicle at 8 AM, and at 9 PM a
 * reminder if the player has done no quest today. Each device gets each reminder once (`sent`).
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  // Vercel sends the secret with every cron call; anything else is turned away (and so is everything, if it's unset).
  if (!secret || !isCronCall(request.headers.get('authorization'), secret)) return json({ error: 'unauthorized' }, 401);
  const { db } = firebaseAdmin();
  const now = new Date();

  let sent = 0;
  let last: QueryDocumentSnapshot | undefined;
  for (;;) {
    let query = db.collection('users').where('pushEnabled', '==', true).orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (last) query = query.startAfter(last);
    const page = await query.get();
    if (page.empty) break;
    last = page.docs[page.docs.length - 1];

    // Partners share a household, so each one is read once per page (and let go with the page).
    const households = new Map<string, Promise<HouseholdData | undefined>>();
    const household = (id: string) => {
      if (!households.has(id)) {
        households.set(id, db.doc(`households/${id}`).get().then((snapshot) => snapshot.data() as HouseholdData | undefined));
      }
      return households.get(id)!;
    };

    // One player's failure or slow device never holds up or cancels anyone else's reminders.
    const results = await Promise.allSettled(page.docs.map((user) => remindPlayer(db, user, household, now)));
    for (const result of results) {
      if (result.status === 'fulfilled') sent += result.value;
      else console.error('ChoreQuest: reminders failed for a player', result.reason);
    }
    if (page.size < PAGE_SIZE) break;
  }
  return json({ sent });
}
