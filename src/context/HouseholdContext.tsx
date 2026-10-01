import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type UpdateData,
  type WriteBatch,
} from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebase } from '../config/firebase';
import type { CharacterId, HouseholdDoc, HouseholdMember, TaskLog } from '../types';
import { generateHouseholdCode, HOUSEHOLD_CODE_LENGTH, localDateKey, normalizeHouseholdCode } from '../utils/calculations';
import { createInitialState, parseGameState, toHouseholdSections } from '../utils/gameState';
import type { TranslationKey } from '../utils/i18n';
import { useAuth } from './AuthContext';

/**
 * - demo: offline demo, no household needed
 * - signedOut: no user
 * - loading: waiting for the profile/household
 * - none: signed in without a household, so show onboarding
 * - ready: member of a household
 */
export type HouseholdStatus = 'demo' | 'signedOut' | 'loading' | 'none' | 'ready';

export interface HouseholdSnapshot {
  id: string;
  data: HouseholdDoc;
  /** True while the data came from the offline cache rather than the server. */
  fromCache: boolean;
}

type ActionResult = { ok: true } | { ok: false; error: TranslationKey };

interface HouseholdContextValue {
  status: HouseholdStatus;
  household: HouseholdSnapshot | null;
  householdRef: DocumentReference | null;
  me: HouseholdMember | null;
  partner: HouseholdMember | null;
  isModerator: boolean;
  /** Both husband and wife have joined. */
  isActive: boolean;
  createHousehold: (characterId: CharacterId) => Promise<ActionResult>;
  joinHousehold: (code: string) => Promise<ActionResult>;
  leaveHousehold: () => Promise<ActionResult>;
  grantModerator: (uid: string) => Promise<ActionResult>;
  /** Re-authenticates with the password, removes all of this account's data, then deletes the sign-in. */
  deleteAccount: (password: string) => Promise<ActionResult>;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

function firestoreCode(err: unknown): string {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
}

/**
 * Adds "remove `uid` from this household" to a batch: the last member deletes the household and its
 * code; a leaving sole moderator hands the role to the partner so the household is never unmanaged.
 */
function addLeaveToBatch(batch: WriteBatch, db: Firestore, household: HouseholdSnapshot, uid: string) {
  const ref = doc(db, 'households', household.id);
  const others = household.data.memberIds.filter((id) => id !== uid);
  if (others.length === 0) {
    batch.delete(ref);
    batch.delete(doc(db, 'householdCodes', household.data.code));
    return;
  }
  const patch: UpdateData<DocumentData> = { memberIds: others, [`members.${uid}`]: deleteField() };
  const leavingModerator = household.data.members[uid]?.role === 'moderator';
  const otherIsModerator = others.some((id) => household.data.members[id]?.role === 'moderator');
  if (leavingModerator && !otherIsModerator) patch[`members.${others[0]}.role`] = 'moderator';
  batch.update(ref, patch);
}

function reauthErrorKey(err: unknown): TranslationKey {
  switch (firestoreCode(err)) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/missing-password':
      return 'auth.error.invalidCredential';
    case 'auth/too-many-requests':
      return 'auth.error.tooMany';
    case 'auth/network-request-failed':
      return 'auth.error.network';
    default:
      return 'onboarding.error.generic';
  }
}

class JoinError extends Error {
  constructor(readonly key: TranslationKey) {
    super(key);
  }
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const uid = user && !demoMode ? user.uid : null;
  const email = user?.email ?? null;

  const [profile, setProfile] = useState<{ uid: string; householdId: string | null } | null>(null);
  const [household, setHousehold] = useState<HouseholdSnapshot | null>(null);
  const [householdLoadedFor, setHouseholdLoadedFor] = useState<string | null>(null);

  // users/{uid} tells us which household this account belongs to.
  useEffect(() => {
    setProfile(null);
    const firebase = uid ? getFirebase() : null;
    if (!uid || !firebase) return;
    return onSnapshot(
      doc(firebase.db, 'users', uid),
      { includeMetadataChanges: true },
      (snap) => {
        // Only follow server-confirmed profiles: right after creating/joining, the local copy points at
        // a household the server may not have committed yet, and reading it then is denied.
        if (snap.metadata.hasPendingWrites) return;
        // A cache miss isn't proof the profile is missing; wait for the server.
        if (!snap.exists() && snap.metadata.fromCache) return;
        const householdId = snap.exists() ? ((snap.data().householdId as string | null) ?? null) : null;
        setProfile({ uid, householdId });
      },
      (err) => {
        console.error('ChoreQuest: failed to load profile', err);
        setProfile({ uid, householdId: null });
      },
    );
  }, [uid]);

  const householdId = profile?.uid === uid ? (profile?.householdId ?? null) : null;

  // households/{id}: membership, settings and the shared game, live for both partners.
  useEffect(() => {
    setHousehold(null);
    setHouseholdLoadedFor(null);
    const firebase = uid ? getFirebase() : null;
    if (!uid || !householdId || !firebase) return;
    return onSnapshot(
      doc(firebase.db, 'households', householdId),
      { includeMetadataChanges: true },
      (snap) => {
        // Our own un-acknowledged writes are already applied locally by the game state.
        if (snap.metadata.hasPendingWrites) return;
        if (!snap.exists()) {
          if (snap.metadata.fromCache) return;
          setHousehold(null);
        } else {
          const data = snap.data() as HouseholdDoc;
          // Profile can briefly point at a household we no longer belong to (e.g. after leaving elsewhere).
          setHousehold(data.memberIds?.includes(uid) ? { id: householdId, data, fromCache: snap.metadata.fromCache } : null);
        }
        setHouseholdLoadedFor(householdId);
      },
      (err) => {
        // Permission denied means we are no longer a member.
        console.warn('ChoreQuest: household unavailable', err);
        setHousehold(null);
        setHouseholdLoadedFor(householdId);
      },
    );
  }, [uid, householdId]);

  let status: HouseholdStatus;
  if (demoMode) status = 'demo';
  else if (!uid) status = 'signedOut';
  else if (!profile || profile.uid !== uid) status = 'loading';
  else if (!householdId) status = 'none';
  else if (householdLoadedFor !== householdId) status = 'loading';
  else status = household ? 'ready' : 'none';

  const me = (uid && household?.data.members?.[uid]) || null;
  const partnerId = household?.data.memberIds.find((id) => id !== uid);
  const partner = (partnerId && household?.data.members?.[partnerId]) || null;

  const createHousehold = useCallback(
    async (characterId: CharacterId): Promise<ActionResult> => {
      const firebase = getFirebase();
      if (!uid || !firebase) return { ok: false, error: 'auth.missingFirebase' };
      const { db } = firebase;

      // Carry over progress saved by the earlier single-account version (households/{uid}).
      let initial = createInitialState(localDateKey());
      try {
        const legacy = await getDoc(doc(db, 'households', uid));
        const parsed = legacy.exists() ? parseGameState(legacy.data()) : null;
        if (parsed) initial = parsed;
      } catch {
        // No legacy data (or not readable): start fresh.
      }

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = generateHouseholdCode();
        try {
          const codeRef = doc(db, 'householdCodes', code);
          if ((await getDoc(codeRef)).exists()) continue;
          const ref = doc(collection(db, 'households'));
          const now = Date.now();
          const household: HouseholdDoc = {
            code,
            createdBy: uid,
            createdAt: now,
            memberIds: [uid],
            members: { [uid]: { uid, characterId, role: 'moderator', email, joinedAt: now } },
            ...toHouseholdSections(initial),
          };
          const batch = writeBatch(db);
          batch.set(ref, household);
          batch.set(codeRef, { householdId: ref.id, createdBy: uid });
          batch.set(doc(db, 'users', uid), { householdId: ref.id, email, updatedAt: now }, { merge: true });
          await batch.commit();
          return { ok: true };
        } catch (err) {
          // A code taken between our check and the commit is rejected by the rules; try another.
          if (firestoreCode(err) === 'permission-denied') continue;
          console.error('ChoreQuest: failed to create household', err);
          return { ok: false, error: firestoreCode(err) === 'unavailable' ? 'auth.error.network' : 'onboarding.error.generic' };
        }
      }
      return { ok: false, error: 'onboarding.error.generic' };
    },
    [email, uid],
  );

  const joinHousehold = useCallback(
    async (input: string): Promise<ActionResult> => {
      const firebase = getFirebase();
      if (!uid || !firebase) return { ok: false, error: 'auth.missingFirebase' };
      const { db } = firebase;
      const code = normalizeHouseholdCode(input);
      if (code.length !== HOUSEHOLD_CODE_LENGTH) return { ok: false, error: 'onboarding.error.codeFormat' };

      try {
        const codeSnap = await getDoc(doc(db, 'householdCodes', code));
        if (!codeSnap.exists()) return { ok: false, error: 'onboarding.error.notFound' };
        const targetId = codeSnap.data().householdId as string;
        const ref = doc(db, 'households', targetId);

        await runTransaction(db, async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new JoinError('onboarding.error.notFound');
          const data = snap.data() as HouseholdDoc;
          const now = Date.now();
          if (!data.memberIds.includes(uid)) {
            if (data.memberIds.length >= 2) throw new JoinError('onboarding.error.full');
            const taken = Object.values(data.members ?? {}).map((member) => member.characterId);
            const characterId: CharacterId = taken.includes('husband') ? 'wife' : 'husband';
            const role = data.memberIds.length === 0 ? 'moderator' : 'member';
            tx.update(ref, {
              memberIds: [...data.memberIds, uid],
              [`members.${uid}`]: { uid, characterId, role, email, joinedAt: now },
            });
          }
          tx.set(doc(db, 'users', uid), { householdId: targetId, email, updatedAt: now }, { merge: true });
        });
        return { ok: true };
      } catch (err) {
        if (err instanceof JoinError) return { ok: false, error: err.key };
        // Full households are no longer readable by non-members.
        if (firestoreCode(err) === 'permission-denied') return { ok: false, error: 'onboarding.error.full' };
        console.error('ChoreQuest: failed to join household', err);
        return { ok: false, error: firestoreCode(err) === 'unavailable' ? 'auth.error.network' : 'onboarding.error.generic' };
      }
    },
    [email, uid],
  );

  const leaveHousehold = useCallback(async (): Promise<ActionResult> => {
    const firebase = getFirebase();
    if (!uid || !firebase || !household) return { ok: false, error: 'onboarding.error.generic' };
    const { db } = firebase;
    try {
      const batch = writeBatch(db);
      addLeaveToBatch(batch, db, household, uid);
      batch.set(doc(db, 'users', uid), { householdId: null, updatedAt: Date.now() }, { merge: true });
      await batch.commit();
      return { ok: true };
    } catch (err) {
      console.error('ChoreQuest: failed to leave household', err);
      return { ok: false, error: 'onboarding.error.generic' };
    }
  }, [household, uid]);

  const deleteAccount = useCallback(
    async (password: string): Promise<ActionResult> => {
      const firebase = getFirebase();
      const current = firebase?.auth.currentUser;
      if (!firebase || !uid || !current || current.uid !== uid || !current.email) {
        return { ok: false, error: 'onboarding.error.generic' };
      }
      // Firebase only deletes accounts with a recent sign-in, so confirm the password first.
      try {
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
      } catch (err) {
        return { ok: false, error: reauthErrorKey(err) };
      }

      const { db } = firebase;
      try {
        if (household) {
          // Unlink this account from the quest log it leaves behind (the partner keeps the history).
          const logs = (household.data.game?.logs ?? []) as TaskLog[];
          if (logs.some((log) => log.loggedBy === uid)) {
            await updateDoc(doc(db, 'households', household.id), {
              'game.logs': logs.map((log) => {
                if (log.loggedBy !== uid) return log;
                const { loggedBy: _removed, ...rest } = log;
                return rest;
              }),
            });
          }
        }
        const batch = writeBatch(db);
        if (household) addLeaveToBatch(batch, db, household, uid);
        batch.delete(doc(db, 'users', uid));
        await batch.commit();
        // Old single-account save (households/{uid}), if any; absent for most accounts.
        await deleteDoc(doc(db, 'households', uid)).catch(() => undefined);
        await deleteUser(current);
        return { ok: true };
      } catch (err) {
        console.error('ChoreQuest: failed to delete account', err);
        return { ok: false, error: firestoreCode(err) === 'auth/network-request-failed' ? 'auth.error.network' : 'onboarding.error.generic' };
      }
    },
    [household, uid],
  );

  const grantModerator = useCallback(
    async (targetUid: string): Promise<ActionResult> => {
      const firebase = getFirebase();
      if (!firebase || !household) return { ok: false, error: 'onboarding.error.generic' };
      try {
        await updateDoc(doc(firebase.db, 'households', household.id), { [`members.${targetUid}.role`]: 'moderator' });
        return { ok: true };
      } catch (err) {
        console.error('ChoreQuest: failed to grant moderator', err);
        return { ok: false, error: 'onboarding.error.generic' };
      }
    },
    [household],
  );

  const activeHouseholdId = household?.id ?? null;
  const householdRef = useMemo(() => {
    const firebase = getFirebase();
    return firebase && activeHouseholdId ? doc(firebase.db, 'households', activeHouseholdId) : null;
  }, [activeHouseholdId]);

  const value = useMemo<HouseholdContextValue>(
    () => ({
      status,
      household,
      householdRef,
      me,
      partner,
      isModerator: status === 'demo' || me?.role === 'moderator',
      isActive: status === 'demo' || (household?.data.memberIds.length ?? 0) >= 2,
      createHousehold,
      joinHousehold,
      leaveHousehold,
      grantModerator,
      deleteAccount,
    }),
    [status, household, householdRef, me, partner, createHousehold, joinHousehold, leaveHousehold, grantModerator, deleteAccount],
  );

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider');
  return ctx;
}
