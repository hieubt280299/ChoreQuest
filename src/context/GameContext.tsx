import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { intensityApplies, intensityBase, MAX_LEVEL, MAX_SKILL_LEVEL, MAX_SKILLS_PER_CHARACTER, SKILL_POOL } from '../constants/gameRules';
import type {
  AvatarId,
  CharacterId,
  Completer,
  GameState,
  RewardBreakdown,
  RewardToast,
  Streak,
  Task,
  TaskCategory,
  TaskIntensity,
  TaskLog,
  ThemeId,
  WheelSpinEvent,
} from '../types';
import { AVATARS, DEFAULT_AVATAR, DEFAULT_THEME, isThemeId } from '../constants/cosmetics';
import {
  addDays,
  computeRewardBreakdown,
  lateRewardBreakdown,
  endOfDayMs,
  getLevelFromXp,
  grantRewards,
  isDateKey,
  localDateKey,
  revokeRewards,
  skillPointsAvailable,
  splitFromBreakdown,
} from '../utils/calculations';
import { commitOp } from '../services/firestoreServices';
import {
  advanceDays,
  createInitialState,
  fromHouseholdDoc,
  parseGameState,
  resetLevelsAndSkills,
  resetQuestList,
} from '../utils/gameState';
import { normalizeCharacterName } from '../utils/characterName';
import type { TranslationKey } from '../utils/i18n';
import { buildStreakIndex, currentStreak, streakIfCompletedOn, type StreakIndex } from '../utils/streaks';
import { rewardOffer, type RewardOffer } from '../utils/chronicleRewards';
import { applyOp, replayOps, type GameOp, type OpResult } from '../utils/transactionUtils';
import { rollWheelPrize, spinOnState } from '../utils/wheel';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';

const DEMO_STORAGE_KEY = 'chorequest.game.v2';
const LEGACY_DEMO_STORAGE_KEY = 'chorequest.game.v1';

function readDemoState(): GameState | null {
  for (const key of [DEMO_STORAGE_KEY, LEGACY_DEMO_STORAGE_KEY]) {
    try {
      const parsed = parseGameState(JSON.parse(localStorage.getItem(key) ?? 'null'));
      if (parsed) return parsed;
    } catch {
      // Unreadable storage: fall through to a fresh game.
    }
  }
  return null;
}

export type ActionResult = { ok: true } | { ok: false; error: TranslationKey };
const OK: ActionResult = { ok: true };
const fail = (error: TranslationKey): ActionResult => ({ ok: false, error });
const done = (result: OpResult): ActionResult => (result.ok ? OK : fail(result.error));

/** Short unique id for an op (idempotency key), e.g. "lq3x9k2-8f3a1c". */
const newOpId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Upkeep op: settles days that passed (interest, chronicle rollover) and nothing else. */
const SETTLE_DAYS: GameOp = { update: (current) => current };

/** A spin's outcome; `jackpotBefore` is the pot as it stood when the wheel started turning. */
export type SpinResult = { ok: true; spin: WheelSpinEvent; jackpotBefore: number } | { ok: false; error: TranslationKey };

interface GameContextValue {
  state: GameState;
  loading: boolean;
  today: string;
  reward: RewardToast | null;
  clearReward: () => void;
  /** The character this player controls: their own in a household, switchable in the demo. */
  activeCharacter: CharacterId;
  setActiveCharacter: (characterId: CharacterId) => void;
  canSwitchCharacter: boolean;
  /** Whether game actions (quests, skills) may be taken for this character. */
  canActAs: (characterId: CharacterId) => boolean;
  /** Household is active (both partners joined), or demo. */
  canPlay: boolean;
  /** Moderator (or demo): may change quests, prize pool and the chronicle end date. */
  canEditSettings: boolean;
  /** "Who did it?" options this player may choose when completing a quest. */
  completerOptions: Completer[];
  canManageLog: (log: TaskLog) => boolean;
  /** A player may rename only their own character (any in the demo). */
  canRename: (characterId: CharacterId) => boolean;
  /** Set (or clear, with a blank name) a character's display name. */
  setCharacterName: (characterId: CharacterId, name: string) => ActionResult;
  /** The cosmetic unlocks this character may still claim for the previous chronicle, if any. */
  pendingReward: (characterId: CharacterId) => RewardOffer | null;
  /** Claim a chronicle reward: an avatar of your own (both players) or a theme (the winner). */
  claimReward: (characterId: CharacterId, kind: 'theme' | 'avatar', item: ThemeId | AvatarId) => ActionResult;
  /** Switch your character's avatar to one the household has unlocked (shared with your spouse). */
  setAvatar: (characterId: CharacterId, avatar: AvatarId) => ActionResult;
  /**
   * Log a quest for today, or (`late`) for yesterday through "Yesterday's quests". `intensity` is the effort
   * picked for an intensity-enabled Moderate quest (Normal otherwise).
   */
  completeTask: (taskId: string, completer: Completer, options?: { late?: boolean; intensity?: TaskIntensity }) => ActionResult;
  /**
   * "Yesterday's quests" is open: before noon, nothing logged yet today, and today isn't the first day of a
   * chronicle (yesterday then belongs to a settled one). `now` is passed so callers can re-check each minute.
   */
  yesterdayOpen: (now?: Date) => boolean;
  /** Enabled quests nobody logged yesterday. */
  yesterdayQuests: () => Task[];
  /** Claim the free wheel ticket (once per local day, own character only). */
  claimDailyTicket: (characterId: CharacterId) => ActionResult;
  /**
   * Spend a ticket on the Wheel of Fortune. Resolves once the spin is saved (online: in a transaction on the
   * latest household data, so the prize and jackpot are the server's), so the wheel can stay locked till then.
   */
  spinWheel: (characterId: CharacterId) => Promise<SpinResult>;
  undoLog: (logId: string) => ActionResult;
  reassignLog: (logId: string, completer: Completer) => ActionResult;
  upsertTask: (task: Task) => ActionResult;
  removeTask: (taskId: string) => ActionResult;
  /**
   * Moderator: put the built-in quests back to their default values (logs and streaks keep matching ids).
   * Custom quests are kept unless `removeCustom` is set.
   */
  resetTasksToDefaults: (options?: { removeCustom?: boolean }) => ActionResult;
  /** A player has reached the level cap, so levels and skills may be reset ("new legend"). */
  levelResetUnlocked: boolean;
  /** Moderator: reset both players to level 1 with no skills; gold and chronicle are kept. */
  resetLevels: () => ActionResult;
  setPrizePool: (amount: number) => ActionResult;
  setChronicleEndDate: (date: string) => ActionResult;
  unlockSkill: (characterId: CharacterId, skillId: string) => ActionResult;
  upgradeSkill: (characterId: CharacterId, skillId: string) => ActionResult;
  isTaskDoneToday: (taskId: string) => boolean;
  getTodayLog: (taskId: string) => TaskLog | undefined;
  /** A character's live streak on a quest. */
  getStreak: (taskId: string, characterId: CharacterId) => Streak;
  /** Exact reward breakdown completing a quest today would give, per character (null = not a recipient). */
  previewReward: (
    taskId: string,
    completer: Completer,
    options?: { late?: boolean; intensity?: TaskIntensity },
  ) => Record<CharacterId, RewardBreakdown | null> | null;
  /** Why the last action couldn't be saved (e.g. the other player just did the same quest), until dismissed. */
  syncError: TranslationKey | null;
  clearSyncError: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/** Streak day each recipient would reach by completing `taskId` on `date`. */
/** Each recipient's spouse's current streak on `taskId` as of `date` (Synergistic Streak). */
function partnerStreaks(index: StreakIndex, taskId: string, completer: Completer, date: string) {
  const recipients: CharacterId[] = completer === 'both' ? ['husband', 'wife'] : [completer];
  const days: Partial<Record<CharacterId, number>> = {};
  for (const id of recipients) days[id] = currentStreak(index, taskId, id === 'husband' ? 'wife' : 'husband', date).days;
  return days;
}

function recipientStreaks(index: StreakIndex, taskId: string, completer: Completer, date: string) {
  const recipients: CharacterId[] = completer === 'both' ? ['husband', 'wife'] : [completer];
  const days: Partial<Record<CharacterId, number>> = {};
  for (const id of recipients) days[id] = streakIfCompletedOn(index, taskId, id, date);
  return days;
}

/** Streak fields stored on a log: only recipients that reached a streak. */
function streakFields(breakdown: Record<CharacterId, RewardBreakdown | null>) {
  const streakDays: Partial<Record<CharacterId, number>> = {};
  const streakGold: Partial<Record<CharacterId, number>> = {};
  for (const id of ['husband', 'wife'] as CharacterId[]) {
    const part = breakdown[id];
    if (part) {
      streakDays[id] = part.streakDays;
      streakGold[id] = part.streakGold;
    }
  }
  return { streakDays, streakGold };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { status, household, householdRef, me, isModerator, isActive } = useHousehold();
  const demo = status === 'demo';

  const [state, setState] = useState<GameState>(() => createInitialState());
  const stateRef = useRef(state);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<RewardToast | null>(null);
  const [today, setToday] = useState(localDateKey);
  const [demoCharacter, setDemoCharacter] = useState<CharacterId>('husband');
  const [syncError, setSyncError] = useState<TranslationKey | null>(null);
  // Household sync: the last state the server sent, the player's actions it hasn't confirmed yet (replayed on
  // top of every snapshot, so the screen never jumps back), and the queue that saves them one at a time.
  const serverRef = useRef<GameState | null>(null);
  const pendingRef = useRef<GameOp[]>([]);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  const replaceState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  /** Saves an op to the household document (see `commitOp`); on failure the screen goes back to the server state. */
  const save = useCallback(
    (op: GameOp, date: string): Promise<OpResult> => {
      if (!householdRef) return Promise.resolve({ ok: false, error: 'sync.error.saveFailed' });
      pendingRef.current = [...pendingRef.current, op];
      const saved = queueRef.current
        .then(() => commitOp(householdRef, op, date, () => serverRef.current))
        .catch((): OpResult => ({ ok: false, error: 'sync.error.saveFailed' }))
        .then((result) => {
          pendingRef.current = pendingRef.current.filter((item) => item !== op);
          if (!result.ok) {
            // Only player actions (ops with an id) explain themselves; background upkeep fails quietly.
            if (op.id) setSyncError(result.error);
            if (serverRef.current) replaceState(replayOps(serverRef.current, pendingRef.current, localDateKey()));
          }
          return result;
        });
      queueRef.current = saved;
      return saved;
    },
    [householdRef, replaceState],
  );

  // Load from local demo storage, or follow the live household document.
  useEffect(() => {
    if (status === 'demo') {
      serverRef.current = null;
      replaceState(readDemoState() ?? createInitialState());
      setLoading(false);
      return;
    }
    if (status !== 'ready' || !household) {
      setLoading(true);
      return;
    }
    const date = localDateKey();
    const stored = fromHouseholdDoc(household.data, date, false);
    serverRef.current = stored;
    replaceState(stored ? replayOps(stored, pendingRef.current, date) : createInitialState());
    setLoading(false);
    // Store days settled while nobody had the app open (interest, chronicle rollover); server data only, never
    // stale cache. It's a transaction like any action, so when both devices try, the second finds nothing to do.
    if (!household.fromCache && stored && advanceDays(stored, date) !== stored) void save(SETTLE_DAYS, date);
  }, [status, household, replaceState, save]);

  /**
   * Applies an op on top of the latest state right away (optimistic UI: buttons reflect it at once, so a second
   * tap can't repeat it) and saves it: transactionally in a household, to local storage in the demo.
   * `saved` resolves with the state the server ended up with (or the reason it was rejected).
   */
  const commit = useCallback(
    (op: GameOp): { result: OpResult; saved: Promise<OpResult> } => {
      const date = localDateKey();
      const result = applyOp(stateRef.current, op, date);
      if (!result.ok) return { result, saved: Promise.resolve(result) };
      replaceState(result.state);
      if (status === 'demo') {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(result.state));
        } catch {
          // Storage can be unavailable (private mode, quota); the in-memory game keeps working.
        }
        return { result, saved: Promise.resolve(result) };
      }
      return { result, saved: save(op, date) };
    },
    [status, replaceState, save],
  );

  // Tick every minute so the daily quest reset and the chronicle rollover happen while the app stays open.
  useEffect(() => {
    const id = window.setInterval(() => setToday(localDateKey()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // A new day: pay interest and roll the chronicle over if it ended.
  useEffect(() => {
    if (!loading && advanceDays(stateRef.current, today) !== stateRef.current) commit(SETTLE_DAYS);
  }, [commit, loading, today]);

  const myCharacter: CharacterId = demo ? demoCharacter : (me?.characterId ?? 'husband');
  const canPlay = demo || isActive;
  const canEditSettings = demo || isModerator;
  const canActAs = useCallback(
    (characterId: CharacterId) => demo || (isActive && me?.characterId === characterId),
    [demo, isActive, me?.characterId],
  );

  const canRename = useCallback(
    (characterId: CharacterId) => demo || me?.characterId === characterId,
    [demo, me?.characterId],
  );

  const setCharacterName = useCallback(
    (characterId: CharacterId, name: string): ActionResult => {
      if (!canRename(characterId)) return fail('household.error.ownCharacter');
      const clean = normalizeCharacterName(name);
      if (clean === null) return fail('character.nameInvalid');
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const { customName: _previous, ...rest } = current.characters[characterId];
            return { ...current, characters: { ...current.characters, [characterId]: clean ? { ...rest, customName: clean } : rest } };
          },
        }).result,
      );
    },
    [canRename, commit],
  );

  const pendingReward = useCallback(
    (characterId: CharacterId) => rewardOffer(stateRef.current, characterId),
    // Re-evaluated whenever the state changes (it reads the ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const claimReward = useCallback(
    (characterId: CharacterId, kind: 'theme' | 'avatar', item: ThemeId | AvatarId): ActionResult => {
      if (!canRename(characterId)) return fail('household.error.ownCharacter');
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const reward = rewardOffer(current, characterId);
            if (!reward || !reward[kind]) return 'cosmetics.error.noReward';
            const cosmetics = current.cosmetics;
            if (kind === 'theme') {
              if (!isThemeId(item) || item === DEFAULT_THEME || cosmetics.themes.includes(item)) return 'cosmetics.error.locked';
            } else if (!AVATARS[characterId].includes(item as AvatarId) || cosmetics.avatars[characterId].includes(item as AvatarId)) {
              return 'cosmetics.error.locked';
            }
            return {
              ...current,
              cosmetics: {
                ...cosmetics,
                themes: kind === 'theme' ? [...cosmetics.themes, item as ThemeId] : cosmetics.themes,
                avatars:
                  kind === 'avatar'
                    ? { ...cosmetics.avatars, [characterId]: [...cosmetics.avatars[characterId], item as AvatarId] }
                    : cosmetics.avatars,
                // A new avatar is put on right away.
                activeAvatar: kind === 'avatar' ? { ...cosmetics.activeAvatar, [characterId]: item as AvatarId } : cosmetics.activeAvatar,
                rewards: [...cosmetics.rewards, { chronicleId: reward.chronicleId, characterId, kind, item }],
              },
            };
          },
        }).result,
      );
    },
    [canRename, commit],
  );

  const setAvatar = useCallback(
    (characterId: CharacterId, avatar: AvatarId): ActionResult => {
      if (!canRename(characterId)) return fail('household.error.ownCharacter');
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const owned = avatar === DEFAULT_AVATAR[characterId] || current.cosmetics.avatars[characterId].includes(avatar);
            if (!owned) return 'cosmetics.error.locked';
            return { ...current, cosmetics: { ...current.cosmetics, activeAvatar: { ...current.cosmetics.activeAvatar, [characterId]: avatar } } };
          },
        }).result,
      );
    },
    [canRename, commit],
  );

  const canManageLog = useCallback(
    (log: TaskLog) => {
      // Gold of finished chronicles is already settled, so only current-chronicle logs can change; and XP
      // from before a level reset is gone, so those entries can't be undone either.
      if (log.date < stateRef.current.chronicle.startDate || !canPlay) return false;
      if (stateRef.current.levelResetAt !== undefined && log.timestamp < stateRef.current.levelResetAt) return false;
      if (demo || isModerator) return true;
      return log.loggedBy === user?.uid || log.completedBy === myCharacter || log.completedBy === 'both';
    },
    [canPlay, demo, isModerator, myCharacter, user?.uid],
  );

  const yesterdayOpen = useCallback((now: Date = new Date()) => {
    const current = stateRef.current;
    const todayKey = localDateKey(now);
    return now.getHours() < 12 && todayKey !== current.chronicle.startDate && !current.logs.some((log) => log.date === todayKey);
  }, []);

  const yesterdayQuests = useCallback(() => {
    const current = stateRef.current;
    const yesterday = addDays(localDateKey(), -1);
    return current.tasks.filter((task) => task.enabled && !current.logs.some((log) => log.taskId === task.id && log.date === yesterday));
  }, []);

  const completeTask = useCallback(
    (taskId: string, completer: Completer, options?: { late?: boolean; intensity?: TaskIntensity }): ActionResult => {
      if (!canPlay) return fail('household.error.inactive');
      const late = !!options?.late;
      if (late && !yesterdayOpen()) return fail('tasks.error.yesterdayClosed');
      // Late quests are logged on yesterday's date, which also keeps their streaks going.
      const date = late ? addDays(localDateKey(), -1) : localDateKey();
      const now = Date.now();
      const loggedBy = demo ? undefined : user?.uid;
      // What the latest run of the op produced, for the "Quest complete!" card.
      const outcome: { task?: Task; log?: TaskLog; levelUps?: ReturnType<typeof grantRewards>['levelUps'] } = {};
      const { result } = commit({
        id: newOpId(),
        update: (current) => {
          const task = current.tasks.find((item) => item.id === taskId && item.enabled);
          if (!task) return 'tasks.error.missing';
          // Also catches the other player logging the same quest a moment earlier.
          if (current.logs.some((log) => log.taskId === taskId && log.date === date)) return 'tasks.alreadyDone';
          // Effort (intensity-enabled Moderate quests) scales the base first; skills and streaks build on it.
          const intensity = intensityApplies(task) ? (options?.intensity ?? 'normal') : 'normal';
          const base = intensityBase(task, intensity);
          const index = buildStreakIndex(current.logs);
          const full = computeRewardBreakdown(
            base,
            completer,
            current.characters,
            SKILL_POOL,
            recipientStreaks(index, taskId, completer, date),
            partnerStreaks(index, taskId, completer, date),
          );
          const breakdown = late ? lateRewardBreakdown(full) : full;
          const split = splitFromBreakdown(breakdown);
          const { characters, levelUps } = grantRewards(current.characters, split);
          const log: TaskLog = {
            id: `${taskId}-${date}-${now}`,
            taskId,
            date,
            completedBy: completer,
            xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
            goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
            timestamp: now,
            loggedBy,
            baseXp: base.xp,
            baseGold: base.gold,
            category: task.category,
            group: task.group,
            ...streakFields(breakdown),
            ...(late ? { late: true } : {}),
            ...(intensity !== 'normal' ? { intensity } : {}),
          };
          Object.assign(outcome, { task, log, levelUps });
          return { ...current, characters, logs: [log, ...current.logs] };
        },
      });
      if (!result.ok) return fail(result.error);
      const { task, log, levelUps } = outcome;
      if (task && log) {
        setReward({
          id: log.id,
          title: task.nameKey,
          names: task.names,
          xp: log.xpAwarded,
          gold: log.goldAwarded,
          streakDays: log.streakDays,
          streakGold: log.streakGold,
          levelUps: levelUps ?? [],
        });
      }
      return OK;
    },
    [canPlay, commit, demo, user?.uid, yesterdayOpen],
  );

  const claimDailyTicket = useCallback(
    (characterId: CharacterId): ActionResult => {
      if (!canActAs(characterId)) return fail('household.error.ownCharacter');
      const date = localDateKey();
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const character = current.characters[characterId];
            if (character.ticketClaimedOn === date) return 'wheel.error.claimed';
            return {
              ...current,
              characters: { ...current.characters, [characterId]: { ...character, tickets: character.tickets + 1, ticketClaimedOn: date } },
            };
          },
        }).result,
      );
    },
    [canActAs, commit],
  );

  const spinWheel = useCallback(
    async (characterId: CharacterId): Promise<SpinResult> => {
      if (!canActAs(characterId)) return { ok: false, error: 'household.error.ownCharacter' };
      // The prize is rolled once; the gold it pays (jackpot, Fortune's Favor) comes from the state it lands on.
      const prize = rollWheelPrize();
      const now = Date.now();
      const date = localDateKey();
      const spinId = `spin-${characterId}-${now}`;
      const seen: { jackpotBefore?: number } = {};
      const { result, saved } = commit({
        id: newOpId(),
        update: (current) => {
          // Golden Tickets go first (2x gold; a miss refunds a Normal Ticket), see `spinOnState`.
          const outcome = spinOnState(current, characterId, prize, { id: spinId, date, timestamp: now });
          if (!outcome) return 'wheel.error.noTickets';
          seen.jackpotBefore = current.wheel.jackpotBonus;
          return outcome.state;
        },
      });
      if (!result.ok) return { ok: false, error: result.error };
      // The wheel turns only once the spin is stored, and shows what the server recorded.
      const final = await saved;
      if (!final.ok) return { ok: false, error: final.error };
      const spin = final.state.events.find((event): event is WheelSpinEvent => event.type === 'spin' && event.id === spinId);
      if (!spin) return { ok: false, error: 'sync.error.saveFailed' };
      return { ok: true, spin, jackpotBefore: seen.jackpotBefore ?? 0 };
    },
    [canActAs, commit],
  );

  const undoLog = useCallback(
    (logId: string): ActionResult => {
      const log = stateRef.current.logs.find((item) => item.id === logId);
      if (!log) return fail('tasks.error.missing');
      if (!canManageLog(log)) return fail('household.error.notAllowed');
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const entry = current.logs.find((item) => item.id === logId);
            if (!entry) return 'tasks.error.missing';
            const revoked = revokeRewards(current.characters, entry.xpAwarded, entry.goldAwarded);
            if (!revoked.ok) return 'tasks.error.skillsSpent';
            return { ...current, characters: revoked.characters, logs: current.logs.filter((item) => item.id !== logId) };
          },
        }).result,
      );
    },
    [canManageLog, commit],
  );

  const reassignLog = useCallback(
    (logId: string, completer: Completer): ActionResult => {
      const log = stateRef.current.logs.find((item) => item.id === logId);
      if (!log) return fail('tasks.error.missing');
      if (!canManageLog(log)) return fail('household.error.notAllowed');
      if (log.completedBy === completer) return OK;
      const outcome: { task?: Task; updated?: TaskLog; levelUps?: ReturnType<typeof grantRewards>['levelUps'] } = {};
      const { result } = commit({
        id: newOpId(),
        update: (current) => {
          const entry = current.logs.find((item) => item.id === logId);
          if (!entry) return 'tasks.error.missing';
          if (entry.completedBy === completer) return current;
          const task = current.tasks.find((item) => item.id === entry.taskId);
          const xp = entry.baseXp ?? task?.xp;
          const gold = entry.baseGold ?? task?.gold;
          const category = entry.category ?? task?.category;
          const group = entry.group ?? task?.group;
          if (xp === undefined || gold === undefined || !category || !group) return 'tasks.error.missing';

          const revoked = revokeRewards(current.characters, entry.xpAwarded, entry.goldAwarded);
          if (!revoked.ok) return 'tasks.error.skillsSpent';
          // Streaks as of that entry's day, not counting the entry itself. Later entries keep the bonus they earned.
          const index = buildStreakIndex(current.logs, entry.id);
          const full = computeRewardBreakdown(
            { xp, gold, category, group },
            completer,
            revoked.characters,
            SKILL_POOL,
            recipientStreaks(index, entry.taskId, completer, entry.date),
            partnerStreaks(index, entry.taskId, completer, entry.date),
          );
          // A late entry keeps the late rules when re-assigned.
          const breakdown = entry.late ? lateRewardBreakdown(full) : full;
          const split = splitFromBreakdown(breakdown);
          const { characters, levelUps } = grantRewards(revoked.characters, split);
          const updated: TaskLog = {
            ...entry,
            completedBy: completer,
            xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
            goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
            ...streakFields(breakdown),
          };
          Object.assign(outcome, { task, updated, levelUps });
          return { ...current, characters, logs: current.logs.map((item) => (item.id === logId ? updated : item)) };
        },
      });
      if (!result.ok) return fail(result.error);
      // Celebrate any level-up the re-assignment caused.
      const { task, updated, levelUps } = outcome;
      if (updated && levelUps && levelUps.length > 0) {
        setReward({
          id: `${log.id}-reassign-${Date.now()}`,
          title: task?.nameKey ?? log.taskId,
          names: task?.names,
          xp: updated.xpAwarded,
          gold: updated.goldAwarded,
          streakDays: updated.streakDays,
          streakGold: updated.streakGold,
          levelUps,
        });
      }
      return OK;
    },
    [canManageLog, commit],
  );

  const withSettings = useCallback(
    (change: (current: GameState) => GameState | ActionResult): ActionResult => {
      if (!canEditSettings) return fail('household.error.moderatorOnly');
      return done(
        commit({
          id: newOpId(),
          update: (current) => {
            const next = change(current);
            if (!('ok' in next)) return next;
            return next.ok ? current : next.error;
          },
        }).result,
      );
    },
    [canEditSettings, commit],
  );

  const changeSkill = useCallback(
    (characterId: CharacterId, change: (current: GameState) => GameState | null): ActionResult => {
      if (!canActAs(characterId)) return fail('household.error.ownCharacter');
      return done(commit({ id: newOpId(), update: (current) => change(current) ?? 'skills.noPoints' }).result);
    },
    [canActAs, commit],
  );

  const clearSyncError = useCallback(() => setSyncError(null), []);

  const streakIndex = useMemo(() => buildStreakIndex(state.logs), [state.logs]);
  const levelResetUnlocked = (['husband', 'wife'] as CharacterId[]).some(
    (id) => getLevelFromXp(state.characters[id].xp) >= MAX_LEVEL,
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      loading,
      today,
      reward,
      clearReward: () => setReward(null),
      activeCharacter: myCharacter,
      setActiveCharacter: (characterId) => {
        if (demo) setDemoCharacter(characterId);
      },
      canSwitchCharacter: demo,
      canActAs,
      canPlay,
      canEditSettings,
      // Either partner may log a quest for themselves, their spouse, or both.
      completerOptions: ['husband', 'wife', 'both'],
      canManageLog,
      canRename,
      setCharacterName,
      pendingReward,
      claimReward,
      setAvatar,
      completeTask,
      claimDailyTicket,
      spinWheel,
      undoLog,
      reassignLog,
      upsertTask: (task) =>
        withSettings((current) => {
          const exists = current.tasks.some((item) => item.id === task.id);
          return {
            ...current,
            tasks: exists ? current.tasks.map((item) => (item.id === task.id ? task : item)) : [...current.tasks, task],
          };
        }),
      levelResetUnlocked,
      resetLevels: () =>
        withSettings((current) =>
          (['husband', 'wife'] as CharacterId[]).some((id) => getLevelFromXp(current.characters[id].xp) >= MAX_LEVEL)
            ? resetLevelsAndSkills(current)
            : fail('settings.newLegendLocked'),
        ),
      resetTasksToDefaults: (options) =>
        withSettings((current) => ({ ...current, tasks: resetQuestList(current.tasks, options?.removeCustom) })),
      removeTask: (taskId) =>
        withSettings((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== taskId) })),
      setPrizePool: (amount) =>
        withSettings((current) => ({ ...current, prizePool: Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0)) })),
      setChronicleEndDate: (date) =>
        withSettings((current) => {
          if (!isDateKey(date) || date < localDateKey() || date < current.chronicle.startDate) {
            return fail('chronicle.error.endDate');
          }
          return { ...current, chronicle: { ...current.chronicle, endDate: date, endsAtMs: endOfDayMs(date) } };
        }),
      unlockSkill: (characterId, skillId) =>
        changeSkill(characterId, (current) => {
          const character = current.characters[characterId];
          const points = skillPointsAvailable(getLevelFromXp(character.xp), character.skills);
          if (points < 1) return null;
          if (character.skills.some((skill) => skill.skillId === skillId)) return null;
          if (character.skills.length >= MAX_SKILLS_PER_CHARACTER) return null;
          if (!SKILL_POOL.some((skill) => skill.id === skillId)) return null;
          // Gold Interest starts paying the day after it is learned.
          const interestStart = skillId === 'gold-interest' ? { interestOn: localDateKey() } : {};
          return {
            ...current,
            characters: {
              ...current.characters,
              [characterId]: { ...character, ...interestStart, skills: [...character.skills, { skillId, level: 1 }] },
            },
          };
        }),
      upgradeSkill: (characterId, skillId) =>
        changeSkill(characterId, (current) => {
          const character = current.characters[characterId];
          const owned = character.skills.find((skill) => skill.skillId === skillId);
          if (!owned || owned.level >= MAX_SKILL_LEVEL) return null;
          if (skillPointsAvailable(getLevelFromXp(character.xp), character.skills) < 1) return null;
          return {
            ...current,
            characters: {
              ...current.characters,
              [characterId]: {
                ...character,
                skills: character.skills.map((skill) => (skill.skillId === skillId ? { ...skill, level: skill.level + 1 } : skill)),
              },
            },
          };
        }),
      isTaskDoneToday: (taskId) => state.logs.some((log) => log.taskId === taskId && log.date === today),
      getTodayLog: (taskId) => state.logs.find((log) => log.taskId === taskId && log.date === today),
      getStreak: (taskId, characterId) => currentStreak(streakIndex, taskId, characterId, today),
      previewReward: (taskId, completer, options) => {
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return null;
        const date = options?.late ? addDays(today, -1) : today;
        const full = computeRewardBreakdown(
          intensityBase(task, options?.intensity),
          completer,
          state.characters,
          SKILL_POOL,
          recipientStreaks(streakIndex, taskId, completer, date),
          partnerStreaks(streakIndex, taskId, completer, date),
        );
        return options?.late ? lateRewardBreakdown(full) : full;
      },
      yesterdayOpen,
      yesterdayQuests,
      syncError,
      clearSyncError,
    }),
    [
      state,
      loading,
      today,
      reward,
      myCharacter,
      demo,
      canActAs,
      canPlay,
      canEditSettings,
      canManageLog,
      canRename,
      setCharacterName,
      pendingReward,
      claimReward,
      setAvatar,
      completeTask,
      claimDailyTicket,
      spinWheel,
      undoLog,
      reassignLog,
      withSettings,
      yesterdayOpen,
      yesterdayQuests,
      changeSkill,
      streakIndex,
      levelResetUnlocked,
      syncError,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export const TASK_CATEGORIES: TaskCategory[] = ['cleaning', 'cooking', 'shopping', 'laundry', 'general'];

/**
 * The avatar a character currently wears (household-wide). Safe outside the game provider (e.g. the sign-in
 * screen), where it returns the default.
 */
export function useActiveAvatar(characterId: CharacterId): AvatarId {
  const ctx = useContext(GameContext);
  return ctx?.state.cosmetics.activeAvatar[characterId] ?? DEFAULT_AVATAR[characterId];
}
