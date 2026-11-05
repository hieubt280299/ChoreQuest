import { freshHeart, heartMessage, type HouseholdData } from './_lib/reminders.js';
import { devicesOf, firebaseAdmin, json, sendToDevice } from './_lib/server.js';

/**
 * POST /api/heart: a player just sent a heart (saved in the household by the app); notify their partner's devices.
 * Authenticated with the player's Firebase ID token. Only a fresh heart actually stored in the household is
 * announced, and each heart only once, so this can't be used to spam the partner.
 */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return json({ error: 'unauthenticated' }, 401);
  const { auth, db } = firebaseAdmin();
  let uid: string;
  try {
    uid = (await auth.verifyIdToken(token)).uid;
  } catch {
    return json({ error: 'unauthenticated' }, 401);
  }

  const householdId = (await db.doc(`users/${uid}`).get()).get('householdId');
  if (typeof householdId !== 'string') return json({ error: 'no household' }, 404);
  const household = (await db.doc(`households/${householdId}`).get()).data() as HouseholdData | undefined;
  const me = household?.members?.[uid];
  if (!household || !me) return json({ error: 'not a member' }, 403);
  const partner = Object.values(household.members).find((member) => member.uid !== uid);
  const heart = freshHeart(household, me.characterId, Date.now());
  if (!partner || !heart) return json({ sent: 0 });

  // Claim the heart for notifying, so a retry or a second call never announces it twice.
  const partnerRef = db.doc(`users/${partner.uid}`);
  const claimed = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(partnerRef);
    if (!snapshot.exists || snapshot.get('push.lastHeart') === heart.id) return null;
    tx.update(partnerRef, { 'push.lastHeart': heart.id });
    return devicesOf(snapshot.data());
  });
  if (!claimed) return json({ sent: 0 });

  const results = await Promise.all(
    Object.entries(claimed).map(([deviceId, device]) =>
      sendToDevice(db, partner.uid, deviceId, device, heartMessage(device.language, household, me.characterId), 60 * 60 * 24),
    ),
  );
  return json({ sent: results.filter(Boolean).length });
}
