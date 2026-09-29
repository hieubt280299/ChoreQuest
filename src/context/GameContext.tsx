import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebase } from '../config/firebase';
import {
  createDefaultCharacter,
  DEFAULT_PRIZE_POOL,
  DEFAULT_TASKS,
  MAX_SKILL_LEVEL,
  MAX_SKILLS_PER_CHARACTER,
  SKILL_POOL,
} from '../constants/gameRules';
import type {
  CharacterId,
  Completer,
  GameState,
  LanguageCode,
  RewardToast,
  Task,
  TaskCategory,
  TaskLog,
} from '../types';
import {
  applySkillBonuses,
  calculatePayout,
  getLevelFromXp,
  goldForLevelRange,
  localDateKey,
  monthKey,
  skillPointsAvailable,
} from '../utils/calculations';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'chorequest.game.v1';
// Firestore documents are capped at 1 MiB, so keep only recent logs (the UI only reads the current month).
const LOG_RETENTION_DAYS = 120;

function pruneLogs(logs: TaskLog[]): TaskLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_RETENTION_DAYS);
  const cutoffKey = localDateKey(cutoff);
  return logs.filter((log) => log.date >= cutoffKey);
}

function createInitialState(language: LanguageCode = 'en'): GameState {
  return {
    characters: {
      husband: createDefaultCharacter('husband', 'Husband'),
      wife: createDefaultCharacter('wife', 'Wife'),
    },
    tasks: DEFAULT_TASKS.map((task) => ({ ...task })),
    logs: [],
    prizePool: DEFAULT_PRIZE_POOL,
    activeMonth: monthKey(),
    prizeHistory: [],
    language,
    activeCharacter: 'husband',
  };
}

function applyMonthRollover(state: GameState): GameState {
  const current = monthKey();
  if (state.activeMonth === current) return state;
  const payout = calculatePayout(
    state.prizePool,
    state.characters.husband.gold,
    state.characters.wife.gold,
  );
  const settled = {
    month: state.activeMonth,
    prizePool: state.prizePool,
    settled: true,
    payout,
    goldSnapshot: {
      husband: state.characters.husband.gold,
      wife: state.characters.wife.gold,
    },
  };
  return {
    ...state,
    activeMonth: current,
    prizeHistory: [settled, ...state.prizeHistory].slice(0, 24),
    characters: {
      husband: { ...state.characters.husband, gold: 0 },
      wife: { ...state.characters.wife, gold: 0 },
    },
  };
}

function parseState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GameState>;
  if (!data.characters?.husband || !data.characters?.wife || !Array.isArray(data.tasks)) return null;
  return applyMonthRollover({
    ...createInitialState(),
    ...data,
    characters: {
      husband: { ...createDefaultCharacter('husband', 'Husband'), ...data.characters.husband },
      wife: { ...createDefaultCharacter('wife', 'Wife'), ...data.characters.wife },
    },
    tasks: data.tasks.length ? data.tasks : DEFAULT_TASKS.map((task) => ({ ...task })),
    logs: data.logs ?? [],
    prizeHistory: data.prizeHistory ?? [],
    prizePool: data.prizePool ?? DEFAULT_PRIZE_POOL,
    activeMonth: data.activeMonth ?? monthKey(),
    language: data.language === 'vi' ? 'vi' : 'en',
    activeCharacter: data.activeCharacter === 'wife' ? 'wife' : 'husband',
  });
}

function readLocalState(): GameState | null {
  try {
    return parseState(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
  } catch {
    return null;
  }
}

interface GameContextValue {
  state: GameState;
  loading: boolean;
  reward: RewardToast | null;
  clearReward: () => void;
  setLanguage: (language: LanguageCode) => void;
  completeTask: (taskId: string, completer: Completer) => void;
  upsertTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  setPrizePool: (amount: number) => void;
  unlockSkill: (characterId: CharacterId, skillId: string) => void;
  upgradeSkill: (characterId: CharacterId, skillId: string) => void;
  setActiveCharacter: (characterId: CharacterId) => void;
  isTaskDoneToday: (taskId: string) => boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, demoMode } = useAuth();
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<RewardToast | null>(null);

  const [today, setToday] = useState(localDateKey);
  const cloudUid = user && !demoMode ? user.uid : null;

  const persist = useCallback(
    async (next: GameState) => {
      const firebase = cloudUid ? getFirebase() : null;
      if (!cloudUid || !firebase) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Storage can be unavailable (private mode, quota); the in-memory game keeps working.
        }
        return;
      }
      try {
        await setDoc(doc(firebase.db, 'households', cloudUid), next);
      } catch (err) {
        console.error('ChoreQuest: failed to save household', err);
      }
    },
    [cloudUid],
  );

  useEffect(() => {
    const firebase = cloudUid ? getFirebase() : null;
    if (!cloudUid || !firebase) {
      setState(readLocalState() ?? createInitialState());
      setLoading(false);
      return;
    }
    setLoading(true);
    // Live listener so both partners' devices stay in sync instead of overwriting each other.
    return onSnapshot(
      doc(firebase.db, 'households', cloudUid),
      { includeMetadataChanges: true },
      (snap) => {
        // Our own un-acknowledged writes are already in local state.
        if (snap.metadata.hasPendingWrites) return;
        // A cache miss is not proof the household is new; wait for the server before creating one.
        if (!snap.exists() && snap.metadata.fromCache) return;
        const raw = snap.exists() ? snap.data() : null;
        const ready = parseState(raw) ?? createInitialState();
        setState(ready);
        setLoading(false);
        if (!snap.metadata.fromCache && (!raw || raw.activeMonth !== ready.activeMonth)) {
          void persist(ready);
        }
      },
      (err) => {
        console.error('ChoreQuest: failed to load household', err);
        setLoading(false);
      },
    );
  }, [cloudUid, persist]);

  const update = useCallback(
    (updater: (prev: GameState) => GameState) => {
      setState((prev) => {
        const rolled = applyMonthRollover(updater(prev));
        const next = { ...rolled, logs: pruneLogs(rolled.logs) };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  // Tick every minute so the daily task reset and the month-end gold reset happen while the app stays open.
  useEffect(() => {
    const id = window.setInterval(() => setToday(localDateKey()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!loading && state.activeMonth !== monthKey()) update((prev) => prev);
  }, [loading, state.activeMonth, today, update]);

  const completeTask = useCallback(
    (taskId: string, completer: Completer) => {
      const today = localDateKey();
      const task = state.tasks.find((item) => item.id === taskId && item.enabled);
      if (!task) return;
      if (state.logs.some((log) => log.taskId === taskId && log.date === today)) return;

      const hour = new Date().getHours();
      const share = completer === 'both' ? 0.5 : 1;
      const split = {
        husband: { xp: 0, gold: 0 },
        wife: { xp: 0, gold: 0 },
      };
      const recipients: CharacterId[] = completer === 'both' ? ['husband', 'wife'] : [completer];
      for (const id of recipients) {
        split[id] = applySkillBonuses(
          task.xp * share,
          task.gold * share,
          task,
          completer,
          state.characters[id],
          SKILL_POOL,
          hour,
        );
      }

      const levelUps: RewardToast['levelUps'] = [];
      const nextCharacters = { ...state.characters };

      (['husband', 'wife'] as CharacterId[]).forEach((id) => {
        const gained = split[id];
        if (gained.xp <= 0 && gained.gold <= 0) return;
        const prev = nextCharacters[id];
        const from = getLevelFromXp(prev.xp);
        const xp = prev.xp + gained.xp;
        const to = getLevelFromXp(xp);
        const bonusGold = goldForLevelRange(from, to);
        if (to > from) {
          levelUps.push({ characterId: id, from, to, bonusGold });
        }
        nextCharacters[id] = {
          ...prev,
          xp,
          gold: prev.gold + gained.gold + bonusGold,
        };
      });

      const log: TaskLog = {
        id: `${taskId}-${today}-${Date.now()}`,
        taskId,
        date: today,
        completedBy: completer,
        xpAwarded: { husband: split.husband.xp, wife: split.wife.xp },
        goldAwarded: { husband: split.husband.gold, wife: split.wife.gold },
        timestamp: Date.now(),
      };

      update((prev) => ({
        ...prev,
        characters: nextCharacters,
        logs: [log, ...prev.logs],
      }));

      setReward({
        id: log.id,
        title: task.nameKey,
        xp: { husband: split.husband.xp, wife: split.wife.xp },
        gold: { husband: split.husband.gold, wife: split.wife.gold },
        levelUps,
      });
    },
    [state.characters, state.logs, state.tasks, update],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      state,
      loading,
      reward,
      clearReward: () => setReward(null),
      setLanguage: (language) => update((prev) => ({ ...prev, language })),
      setActiveCharacter: (characterId) => update((prev) => ({ ...prev, activeCharacter: characterId })),
      completeTask,
      upsertTask: (task) =>
        update((prev) => {
          const exists = prev.tasks.some((item) => item.id === task.id);
          return {
            ...prev,
            tasks: exists ? prev.tasks.map((item) => (item.id === task.id ? task : item)) : [...prev.tasks, task],
          };
        }),
      removeTask: (taskId) => update((prev) => ({ ...prev, tasks: prev.tasks.filter((task) => task.id !== taskId) })),
      setPrizePool: (amount) => update((prev) => ({ ...prev, prizePool: Math.max(0, amount) })),
      unlockSkill: (characterId, skillId) =>
        update((prev) => {
          const character = prev.characters[characterId];
          const level = getLevelFromXp(character.xp);
          const points = skillPointsAvailable(level, character.skills);
          if (points < 1) return prev;
          if (character.skills.some((skill) => skill.skillId === skillId)) return prev;
          if (character.skills.length >= MAX_SKILLS_PER_CHARACTER) return prev;
          if (!SKILL_POOL.some((skill) => skill.id === skillId)) return prev;
          return {
            ...prev,
            characters: {
              ...prev.characters,
              [characterId]: {
                ...character,
                skills: [...character.skills, { skillId, level: 1 }],
              },
            },
          };
        }),
      upgradeSkill: (characterId, skillId) =>
        update((prev) => {
          const character = prev.characters[characterId];
          const owned = character.skills.find((skill) => skill.skillId === skillId);
          if (!owned || owned.level >= MAX_SKILL_LEVEL) return prev;
          const level = getLevelFromXp(character.xp);
          if (skillPointsAvailable(level, character.skills) < 1) return prev;
          return {
            ...prev,
            characters: {
              ...prev.characters,
              [characterId]: {
                ...character,
                skills: character.skills.map((skill) =>
                  skill.skillId === skillId ? { ...skill, level: skill.level + 1 } : skill,
                ),
              },
            },
          };
        }),
      isTaskDoneToday: (taskId) => state.logs.some((log) => log.taskId === taskId && log.date === today),
    }),
    [completeTask, loading, reward, state, today, update],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export const TASK_CATEGORIES: TaskCategory[] = ['cleaning', 'cooking', 'shopping', 'laundry', 'general'];
