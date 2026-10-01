import { updateDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MAX_SKILL_LEVEL, MAX_SKILLS_PER_CHARACTER, SKILL_POOL } from '../constants/gameRules';
import type { CharacterId, Completer, GameState, RewardToast, Task, TaskCategory, TaskLog } from '../types';
import {
  computeRewardSplit,
  endOfDayMs,
  getLevelFromXp,
  grantRewards,
  isDateKey,
  localDateKey,
  revokeRewards,
  skillPointsAvailable,
} from '../utils/calculations';
import {
  applyChronicleRollover,
  changedSections,
  createInitialState,
  fromHouseholdDoc,
  parseGameState,
  pruneLogs,
} from '../utils/gameState';
import type { TranslationKey } from '../utils/i18n';
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
  completeTask: (taskId: string, completer: Completer) => ActionResult;
  undoLog: (logId: string) => ActionResult;
  reassignLog: (logId: string, completer: Completer) => ActionResult;
  upsertTask: (task: Task) => ActionResult;
  removeTask: (taskId: string) => ActionResult;
  setPrizePool: (amount: number) => ActionResult;
  setChronicleEndDate: (date: string) => ActionResult;
  unlockSkill: (characterId: CharacterId, skillId: string) => ActionResult;
  upgradeSkill: (characterId: CharacterId, skillId: string) => ActionResult;
  isTaskDoneToday: (taskId: string) => boolean;
  getTodayLog: (taskId: string) => TaskLog | undefined;
}

const GameContext = createContext<GameContextValue | null>(null);

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
    const parsed = fromHouseholdDoc(household.data) ?? createInitialState();
    replaceState(parsed);
    setLoading(false);
    // Store a rollover that happened while nobody had the app open (server data only, never stale cache).
    if (!household.fromCache && householdRef && parsed.chronicle.id !== household.data.chronicle?.id) {
      updateDoc(householdRef, { chronicle: parsed.chronicle, game: { characters: parsed.characters, logs: parsed.logs, prizeHistory: parsed.prizeHistory } }).catch(
        (err) => console.error('ChoreQuest: failed to save chronicle rollover', err),
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

  /** Applies a new state on top of the latest one (rollover + log pruning) and saves it. */
  const commit = useCallback(
    (next: GameState) => {
      const prev = stateRef.current;
      const rolled = applyChronicleRollover(next, localDateKey());
      const final = { ...rolled, logs: pruneLogs(rolled.logs) };
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

  useEffect(() => {
    if (!loading && today > stateRef.current.chronicle.endDate) commit(stateRef.current);
  }, [commit, loading, today]);

  const myCharacter: CharacterId = demo ? demoCharacter : (me?.characterId ?? 'husband');
  const canPlay = demo || isActive;
  const canEditSettings = demo || isModerator;
  const canActAs = useCallback(
    (characterId: CharacterId) => demo || (isActive && me?.characterId === characterId),
    [demo, isActive, me?.characterId],
  );

  const canManageLog = useCallback(
    (log: TaskLog) => {
      // Gold of finished chronicles is already settled, so only current-chronicle logs can change.
      if (log.date < stateRef.current.chronicle.startDate || !canPlay) return false;
      if (demo || isModerator) return true;
      return log.loggedBy === user?.uid || log.completedBy === myCharacter || log.completedBy === 'both';
    },
    [canPlay, demo, isModerator, myCharacter, user?.uid],
  );

  const completeTask = useCallback(
    (taskId: string, completer: Completer): ActionResult => {
      if (!canPlay) return fail('household.error.inactive');
      if (!demo && completer !== myCharacter && completer !== 'both') return fail('household.error.ownCharacter');
      const current = stateRef.current;
      const date = localDateKey();
      const task = current.tasks.find((item) => item.id === taskId && item.enabled);
      if (!task) return fail('tasks.error.missing');
      if (current.logs.some((log) => log.taskId === taskId && log.date === date)) return fail('tasks.alreadyDone');

      const hour = new Date().getHours();
      const split = computeRewardSplit(task, completer, current.characters, SKILL_POOL, hour);
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
        hour,
        baseXp: task.xp,
        baseGold: task.gold,
        category: task.category,
      };
      commit({ ...current, characters, logs: [log, ...current.logs] });
      setReward({ id: log.id, title: task.nameKey, xp: log.xpAwarded, gold: log.goldAwarded, levelUps });
      return OK;
    },
    [canPlay, commit, demo, myCharacter, user?.uid],
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
      if (xp === undefined || gold === undefined || !category) return fail('tasks.error.missing');

      const revoked = revokeRewards(current.characters, log.xpAwarded, log.goldAwarded);
      if (!revoked.ok) return fail('tasks.error.skillsSpent');
      const hour = log.hour ?? new Date(log.timestamp).getHours();
      const split = computeRewardSplit({ xp, gold, category }, completer, revoked.characters, SKILL_POOL, hour);
      const { characters, levelUps } = grantRewards(revoked.characters, split);
      const updated: TaskLog = {
        ...log,
        completedBy: completer,
        xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
        goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
      };
      commit({ ...current, characters, logs: current.logs.map((item) => (item.id === logId ? updated : item)) });
      // Celebrate any level-up the re-assignment caused.
      if (levelUps.length > 0) {
        setReward({ id: `${log.id}-reassign-${Date.now()}`, title: task?.nameKey ?? log.taskId, xp: updated.xpAwarded, gold: updated.goldAwarded, levelUps });
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
      completerOptions: demo ? ['husband', 'wife', 'both'] : [myCharacter, 'both'],
      canManageLog,
      completeTask,
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
          return {
            ...current,
            characters: {
              ...current.characters,
              [characterId]: { ...character, skills: [...character.skills, { skillId, level: 1 }] },
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
      completeTask,
      undoLog,
      reassignLog,
      withSettings,
      changeSkill,
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
