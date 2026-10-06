import { updateDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_TASKS, MAX_LEVEL, MAX_SKILL_LEVEL, MAX_SKILLS_PER_CHARACTER, SKILL_POOL } from '../constants/gameRules';
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
  TaskLog,
  ThemeId,
  WheelSpinEvent,
} from '../types';
import { AVATARS, DEFAULT_AVATAR, THEMES, DEFAULT_THEME, isThemeId } from '../constants/cosmetics';
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
import {
  advanceDays,
  changedSections,
  createInitialState,
  fromHouseholdDoc,
  parseGameState,
  pruneLogs,
  resetLevelsAndSkills,
} from '../utils/gameState';
import { normalizeCharacterName } from '../utils/characterName';
import type { TranslationKey } from '../utils/i18n';
import { buildStreakIndex, currentStreak, streakIfCompletedOn, type StreakIndex } from '../utils/streaks';
import { nextWheelState, prizeGold, rollWheelPrize } from '../utils/wheel';
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
  /** The cosmetic reward this character may still claim for winning the previous chronicle, if any. */
  pendingReward: (characterId: CharacterId) => { chronicleId: number } | null;
  /** Claim the winner's reward: unlock one theme or one of your own avatars. */
  claimReward: (characterId: CharacterId, kind: 'theme' | 'avatar', item: ThemeId | AvatarId) => ActionResult;
  /** Switch your character's avatar to one the household has unlocked (shared with your spouse). */
  setAvatar: (characterId: CharacterId, avatar: AvatarId) => ActionResult;
  /** Log a quest for today, or (`late`) for yesterday through "Yesterday's quests". */
  completeTask: (taskId: string, completer: Completer, options?: { late?: boolean }) => ActionResult;
  /**
   * "Yesterday's quests" is open: before noon, nothing logged yet today, and today isn't the first day of a
   * chronicle (yesterday then belongs to a settled one). `now` is passed so callers can re-check each minute.
   */
  yesterdayOpen: (now?: Date) => boolean;
  /** Enabled quests nobody logged yesterday. */
  yesterdayQuests: () => Task[];
  /** Claim the free wheel ticket (once per local day, own character only). */
  claimDailyTicket: (characterId: CharacterId) => ActionResult;
  /** Spend a ticket on the Wheel of Fortune; the result is saved right away. */
  spinWheel: (characterId: CharacterId) => SpinResult;
  undoLog: (logId: string) => ActionResult;
  reassignLog: (logId: string, completer: Completer) => ActionResult;
  upsertTask: (task: Task) => ActionResult;
  removeTask: (taskId: string) => ActionResult;
  /** Moderator: replace the quest list with the current defaults (logs and streaks keep matching ids). */
  resetTasksToDefaults: () => ActionResult;
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
  previewReward: (taskId: string, completer: Completer, options?: { late?: boolean }) => Record<CharacterId, RewardBreakdown | null> | null;
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

  const replaceState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Load from local demo storage, or from the live household document.
  useEffect(() => {
    if (status === 'demo') {
      replaceState(readDemoState() ?? createInitialState());
      setLoading(false);
      return;
    }
    if (status !== 'ready' || !household) {
      setLoading(true);
      return;
    }
    const stored = fromHouseholdDoc(household.data, localDateKey(), false);
    const parsed = stored ? advanceDays(stored) : createInitialState();
    replaceState(parsed);
    setLoading(false);
    // Store days settled while nobody had the app open (interest, chronicle rollover); server data only,
    // never stale cache. Every device computes the same result, so concurrent saves agree.
    if (!household.fromCache && householdRef && stored && parsed !== stored) {
      updateDoc(householdRef, changedSections(stored, parsed)).catch((err) =>
        console.error('ChoreQuest: failed to save settled days', err),
      );
    }
  }, [status, household, householdRef, replaceState]);

  const persist = useCallback(
    (prev: GameState, next: GameState) => {
      if (status === 'demo') {
        try {
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Storage can be unavailable (private mode, quota); the in-memory game keeps working.
        }
        return;
      }
      if (!householdRef) return;
      // Only changed sections, so quest updates never rewrite moderator-only settings.
      const patch = changedSections(prev, next);
      if (Object.keys(patch).length === 0) return;
      updateDoc(householdRef, patch).catch((err) => console.error('ChoreQuest: failed to save household', err));
    },
    [status, householdRef],
  );

  /** Applies a new state on top of the latest one (settled days + log pruning) and saves it. */
  const commit = useCallback(
    (next: GameState) => {
      const prev = stateRef.current;
      const settled = advanceDays(next, localDateKey());
      const final = { ...settled, logs: pruneLogs(settled.logs), events: pruneLogs(settled.events) };
      replaceState(final);
      persist(prev, final);
    },
    [persist, replaceState],
  );

  // Tick every minute so the daily quest reset and the chronicle rollover happen while the app stays open.
  useEffect(() => {
    const id = window.setInterval(() => setToday(localDateKey()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // A new day: pay interest and roll the chronicle over if it ended.
  useEffect(() => {
    if (!loading && advanceDays(stateRef.current, today) !== stateRef.current) commit(stateRef.current);
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
      const current = stateRef.current;
      const { customName: _previous, ...rest } = current.characters[characterId];
      commit({
        ...current,
        characters: { ...current.characters, [characterId]: clean ? { ...rest, customName: clean } : rest },
      });
      return OK;
    },
    [canRename, commit],
  );

  // Chronicle winner's reward: the previous chronicle's top earner (ties: both) may unlock one theme or
  // avatar while the next chronicle runs. It's offered from its Day 1.
  const pendingReward = useCallback(
    (characterId: CharacterId) => {
      const current = stateRef.current;
      const last = current.prizeHistory[0];
      if (!last || current.chronicle.id !== last.chronicleId + 1) return null;
      const gold = last.goldSnapshot;
      const top = Math.max(gold.husband, gold.wife);
      if (top <= 0 || gold[characterId] !== top) return null;
      if (current.cosmetics.rewards.some((reward) => reward.chronicleId === last.chronicleId && reward.characterId === characterId)) return null;
      // Nothing left to unlock: no reward to offer.
      const lockedThemes = THEMES.filter((theme) => theme !== DEFAULT_THEME && !current.cosmetics.themes.includes(theme));
      const lockedAvatars = AVATARS[characterId].filter(
        (avatar) => avatar !== DEFAULT_AVATAR[characterId] && !current.cosmetics.avatars[characterId].includes(avatar),
      );
      if (lockedThemes.length + lockedAvatars.length === 0) return null;
      return { chronicleId: last.chronicleId };
    },
    // Re-evaluated whenever the state changes (it reads the ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const claimReward = useCallback(
    (characterId: CharacterId, kind: 'theme' | 'avatar', item: ThemeId | AvatarId): ActionResult => {
      if (!canRename(characterId)) return fail('household.error.ownCharacter');
      const reward = pendingReward(characterId);
      if (!reward) return fail('cosmetics.error.noReward');
      const current = stateRef.current;
      const cosmetics = current.cosmetics;
      if (kind === 'theme') {
        if (!isThemeId(item) || item === DEFAULT_THEME || cosmetics.themes.includes(item)) return fail('cosmetics.error.locked');
      } else if (!AVATARS[characterId].includes(item as AvatarId) || cosmetics.avatars[characterId].includes(item as AvatarId)) {
        return fail('cosmetics.error.locked');
      }
      commit({
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
      });
      return OK;
    },
    [canRename, commit, pendingReward],
  );

  const setAvatar = useCallback(
    (characterId: CharacterId, avatar: AvatarId): ActionResult => {
      if (!canRename(characterId)) return fail('household.error.ownCharacter');
      const current = stateRef.current;
      const owned = avatar === DEFAULT_AVATAR[characterId] || current.cosmetics.avatars[characterId].includes(avatar);
      if (!owned) return fail('cosmetics.error.locked');
      commit({ ...current, cosmetics: { ...current.cosmetics, activeAvatar: { ...current.cosmetics.activeAvatar, [characterId]: avatar } } });
      return OK;
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
    (taskId: string, completer: Completer, options?: { late?: boolean }): ActionResult => {
      if (!canPlay) return fail('household.error.inactive');
      const current = stateRef.current;
      const late = !!options?.late;
      if (late && !yesterdayOpen()) return fail('tasks.error.yesterdayClosed');
      // Late quests are logged on yesterday's date, which also keeps their streaks going.
      const date = late ? addDays(localDateKey(), -1) : localDateKey();
      const task = current.tasks.find((item) => item.id === taskId && item.enabled);
      if (!task) return fail('tasks.error.missing');
      if (current.logs.some((log) => log.taskId === taskId && log.date === date)) return fail('tasks.alreadyDone');

      const full = computeRewardBreakdown(
        task,
        completer,
        current.characters,
        SKILL_POOL,
        recipientStreaks(buildStreakIndex(current.logs), taskId, completer, date),
        partnerStreaks(buildStreakIndex(current.logs), taskId, completer, date),
      );
      const breakdown = late ? lateRewardBreakdown(full) : full;
      const split = splitFromBreakdown(breakdown);
      const { characters, levelUps } = grantRewards(current.characters, split);
      const log: TaskLog = {
        id: `${taskId}-${date}-${Date.now()}`,
        taskId,
        date,
        completedBy: completer,
        xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
        goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
        timestamp: Date.now(),
        loggedBy: demo ? undefined : user?.uid,
        baseXp: task.xp,
        baseGold: task.gold,
        category: task.category,
        group: task.group,
        ...streakFields(breakdown),
        ...(late ? { late: true } : {}),
      };
      commit({ ...current, characters, logs: [log, ...current.logs] });
      setReward({
        id: log.id,
        title: task.nameKey,
        names: task.names,
        xp: log.xpAwarded,
        gold: log.goldAwarded,
        streakDays: log.streakDays,
        streakGold: log.streakGold,
        levelUps,
      });
      return OK;
    },
    [canPlay, commit, demo, user?.uid, yesterdayOpen],
  );

  const claimDailyTicket = useCallback(
    (characterId: CharacterId): ActionResult => {
      if (!canActAs(characterId)) return fail('household.error.ownCharacter');
      const current = stateRef.current;
      const date = localDateKey();
      const character = current.characters[characterId];
      if (character.ticketClaimedOn === date) return fail('wheel.error.claimed');
      commit({
        ...current,
        characters: {
          ...current.characters,
          [characterId]: { ...character, tickets: character.tickets + 1, ticketClaimedOn: date },
        },
      });
      return OK;
    },
    [canActAs, commit],
  );

  const spinWheel = useCallback(
    (characterId: CharacterId): SpinResult => {
      if (!canActAs(characterId)) return { ok: false, error: 'household.error.ownCharacter' };
      const current = stateRef.current;
      const character = current.characters[characterId];
      if (character.tickets < 1) return { ok: false, error: 'wheel.error.noTickets' };
      const prize = rollWheelPrize();
      const gold = prizeGold(prize, current.wheel);
      const now = Date.now();
      const spin: WheelSpinEvent = {
        id: `spin-${characterId}-${now}`,
        type: 'spin',
        characterId,
        date: localDateKey(),
        timestamp: now,
        prize,
        gold,
      };
      commit({
        ...current,
        wheel: nextWheelState(prize, current.wheel),
        events: [spin, ...current.events],
        characters: {
          ...current.characters,
          [characterId]: { ...character, tickets: character.tickets - 1, gold: character.gold + gold },
        },
      });
      return { ok: true, spin, jackpotBefore: current.wheel.jackpotBonus };
    },
    [canActAs, commit],
  );

  const undoLog = useCallback(
    (logId: string): ActionResult => {
      const current = stateRef.current;
      const log = current.logs.find((item) => item.id === logId);
      if (!log) return fail('tasks.error.missing');
      if (!canManageLog(log)) return fail('household.error.notAllowed');
      const revoked = revokeRewards(current.characters, log.xpAwarded, log.goldAwarded);
      if (!revoked.ok) return fail('tasks.error.skillsSpent');
      commit({ ...current, characters: revoked.characters, logs: current.logs.filter((item) => item.id !== logId) });
      return OK;
    },
    [canManageLog, commit],
  );

  const reassignLog = useCallback(
    (logId: string, completer: Completer): ActionResult => {
      const current = stateRef.current;
      const log = current.logs.find((item) => item.id === logId);
      if (!log) return fail('tasks.error.missing');
      if (!canManageLog(log)) return fail('household.error.notAllowed');
      if (log.completedBy === completer) return OK;
      const task = current.tasks.find((item) => item.id === log.taskId);
      const xp = log.baseXp ?? task?.xp;
      const gold = log.baseGold ?? task?.gold;
      const category = log.category ?? task?.category;
      const group = log.group ?? task?.group;
      if (xp === undefined || gold === undefined || !category || !group) return fail('tasks.error.missing');

      const revoked = revokeRewards(current.characters, log.xpAwarded, log.goldAwarded);
      if (!revoked.ok) return fail('tasks.error.skillsSpent');
      // Streaks as of that entry's day, not counting the entry itself. Later entries keep the bonus they earned.
      const index = buildStreakIndex(current.logs, log.id);
      const full = computeRewardBreakdown(
        { xp, gold, category, group },
        completer,
        revoked.characters,
        SKILL_POOL,
        recipientStreaks(index, log.taskId, completer, log.date),
        partnerStreaks(index, log.taskId, completer, log.date),
      );
      // A late entry keeps the late rules when re-assigned.
      const breakdown = log.late ? lateRewardBreakdown(full) : full;
      const split = splitFromBreakdown(breakdown);
      const { characters, levelUps } = grantRewards(revoked.characters, split);
      const updated: TaskLog = {
        ...log,
        completedBy: completer,
        xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
        goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
        ...streakFields(breakdown),
      };
      commit({ ...current, characters, logs: current.logs.map((item) => (item.id === logId ? updated : item)) });
      // Celebrate any level-up the re-assignment caused.
      if (levelUps.length > 0) {
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
      const result = change(stateRef.current);
      if ('ok' in result) return result;
      commit(result);
      return OK;
    },
    [canEditSettings, commit],
  );

  const changeSkill = useCallback(
    (characterId: CharacterId, change: (current: GameState) => GameState | null): ActionResult => {
      if (!canActAs(characterId)) return fail('household.error.ownCharacter');
      const next = change(stateRef.current);
      if (!next) return fail('skills.noPoints');
      commit(next);
      return OK;
    },
    [canActAs, commit],
  );

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
      resetTasksToDefaults: () =>
        withSettings((current) => ({ ...current, tasks: DEFAULT_TASKS.map((task) => ({ ...task, names: { ...task.names } })) })),
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
          task,
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
