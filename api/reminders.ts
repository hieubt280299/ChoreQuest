import { dueReminder, localClock, reminderMessage, type HouseholdData } from './_lib/reminders.js';
import { devicesOf, firebaseAdmin, json, sendToDevice } from './_lib/server.js';

/**
 * GET /api/reminders, run by Vercel Cron at the top of every hour (vercel.json): for each device with notifications
 * on, sends what's due at its local time (see `dueReminder`): Day 1 of a new Chronicle at 8 AM, and at 9 PM a
 * reminder if the player has done no quest today. Each device gets each reminder once (`sent`).
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  // Vercel sends the secret with every cron call; anything else is turned away (and so is everything, if it's unset).
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ error: 'unauthorized' }, 401);
  const { db } = firebaseAdmin();
  const now = new Date();
  const households = new Map<string, Promise<HouseholdData | undefined>>();
  const household = (id: string) => {
    if (!households.has(id)) households.set(id, db.doc(`households/${id}`).get().then((snapshot) => snapshot.data() as HouseholdData | undefined));
    return households.get(id)!;
  };

  let sent = 0;
  const users = await db.collection('users').where('pushEnabled', '==', true).get();
  for (const user of users.docs) {
    const householdId = user.get('householdId');
    if (typeof householdId !== 'string') continue;
    const data = await household(householdId);
    const member = data?.members?.[user.id];
    if (!data || !member) continue;
    for (const [deviceId, device] of Object.entries(devicesOf(user.data()))) {
      const due = dueReminder(data, member.characterId, device, localClock(now, device.timeZone));
      if (!due) continue;
      // Mark it first, so a slow or repeated run can't send it twice; a missed one isn't worth a second try.
      await user.ref.update({ [`push.devices.${deviceId}.sent.${due.kind}`]: due.key });
      const ttl = due.kind === 'evening' ? 60 * 60 * 2 : 60 * 60 * 12;
      if (await sendToDevice(db, user.id, deviceId, device, reminderMessage(device.language, due.kind), ttl)) sent += 1;
    }
  }
  return json({ sent });
}
