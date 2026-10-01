import {
  createDefaultCharacter,
  DEFAULT_PRIZE_POOL,
  DEFAULT_TASKS,
  inferTaskGroup,
  SKILL_MIGRATIONS,
} from '../constants/gameRules';
import type {
  Character,
  CharacterId,
  CharacterSkill,
  Chronicle,
  ChronicleResult,
  GameState,
  HouseholdDoc,
  Task,
  TaskLog,
} from '../types';
import {
  addDays,
  calculatePayout,
  daysInMonth,
  defaultChronicle,
  endOfDayMs,
  isDateKey,
  localDateKey,
} from './calculations';

// Firestore documents are capped at 1 MiB, so keep only recent logs (the UI reads the current chronicle).
const LOG_RETENTION_DAYS = 120;
const HISTORY_LIMIT = 24;

export function pruneLogs(logs: TaskLog[], today = localDateKey()): TaskLog[] {
  const cutoff = addDays(today, -LOG_RETENTION_DAYS);
  return logs.filter((log) => log.date >= cutoff);
}

export function createInitialState(today = localDateKey()): GameState {
  return {
    characters: {
      husband: createDefaultCharacter('husband', 'Husband'),
      wife: createDefaultCharacter('wife', 'Wife'),
    },
    tasks: DEFAULT_TASKS.map((task) => ({ ...task })),
    logs: [],
    prizePool: DEFAULT_PRIZE_POOL,
    chronicle: defaultChronicle(1, today),
    prizeHistory: [],
  };
}

/** Calendar-month bounds for pre-chronicle data that stored `activeMonth: 'YYYY-MM'`. */
function monthBounds(month: string): { startDate: string; endDate: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNum] = month.split('-').map(Number);
  const last = daysInMonth(year, monthNum - 1);
  return { startDate: `${month}-01`, endDate: `${month}-${String(last).padStart(2, '0')}` };
}

function parseChronicle(raw: unknown, legacyMonth: unknown, today: string): Chronicle {
  const data = (raw ?? {}) as Partial<Chronicle>;
  if (isDateKey(data.startDate) && isDateKey(data.endDate) && data.endDate >= data.startDate) {
    const id = typeof data.id === 'number' && data.id > 0 ? data.id : 1;
    // Always recompute the expiry from the date so it matches this device's time zone.
    return { id, startDate: data.startDate, endDate: data.endDate, endsAtMs: endOfDayMs(data.endDate) };
  }
  const legacy = typeof legacyMonth === 'string' ? monthBounds(legacyMonth) : null;
  if (legacy) return { id: 1, ...legacy, endsAtMs: endOfDayMs(legacy.endDate) };
  return defaultChronicle(1, today);
}

function parseHistory(raw: unknown): ChronicleResult[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): ChronicleResult[] => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<ChronicleResult> & { month?: string };
    const bounds = isDateKey(item.startDate) && isDateKey(item.endDate)
      ? { startDate: item.startDate, endDate: item.endDate }
      : typeof item.month === 'string'
        ? monthBounds(item.month)
        : null;
    if (!bounds) return [];
    return [
      {
        chronicleId: typeof item.chronicleId === 'number' ? item.chronicleId : 0,
        ...bounds,
        prizePool: item.prizePool ?? 0,
        payout: { husband: item.payout?.husband ?? 0, wife: item.payout?.wife ?? 0 },
        goldSnapshot: { husband: item.goldSnapshot?.husband ?? 0, wife: item.goldSnapshot?.wife ?? 0 },
      },
    ];
  });
}

/** Replaces retired skills with their successors, keeping the higher level if both are owned. */
function migrateSkills(skills: unknown): CharacterSkill[] {
  if (!Array.isArray(skills)) return [];
  const byId = new Map<string, number>();
  for (const skill of skills as CharacterSkill[]) {
    if (!skill?.skillId) continue;
    const id = SKILL_MIGRATIONS[skill.skillId] ?? skill.skillId;
    byId.set(id, Math.max(byId.get(id) ?? 0, skill.level ?? 1));
  }
  return [...byId].map(([skillId, level]) => ({ skillId, level }));
}

/**
 * Builds a valid GameState from stored data (current shape, or the older month-based shape),
 * then applies any due chronicle rollover.
 */
export function parseGameState(raw: unknown, today = localDateKey()): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GameState> & { activeMonth?: string };
  if (!data.characters?.husband || !data.characters?.wife) return null;
  const character = (id: CharacterId): Character => ({
    ...createDefaultCharacter(id, id === 'husband' ? 'Husband' : 'Wife'),
    ...data.characters![id],
    id,
    skills: migrateSkills(data.characters![id].skills),
  });
  return applyChronicleRollover(
    {
      characters: { husband: character('husband'), wife: character('wife') },
      tasks:
        Array.isArray(data.tasks) && data.tasks.length
          ? (data.tasks as Task[]).map((task) => ({ ...task, group: inferTaskGroup(task) }))
          : DEFAULT_TASKS.map((task) => ({ ...task })),
      logs: Array.isArray(data.logs) ? data.logs : [],
      prizePool: typeof data.prizePool === 'number' ? data.prizePool : DEFAULT_PRIZE_POOL,
      chronicle: parseChronicle(data.chronicle, data.activeMonth, today),
      prizeHistory: parseHistory(data.prizeHistory),
    },
    today,
  );
}

/**
 * Settles the chronicle once it has ended: records the payout split, resets gold (XP, levels and
 * skills persist) and starts a new one-month chronicle the next day. If the app was closed for
 * several periods, empty ones are skipped.
 */
export function applyChronicleRollover(state: GameState, today = localDateKey()): GameState {
  const current = state.chronicle;
  if (today <= current.endDate) return state;
  const goldSnapshot = { husband: state.characters.husband.gold, wife: state.characters.wife.gold };
  const result: ChronicleResult = {
    chronicleId: current.id,
    startDate: current.startDate,
    endDate: current.endDate,
    prizePool: state.prizePool,
    payout: calculatePayout(state.prizePool, goldSnapshot.husband, goldSnapshot.wife),
    goldSnapshot,
  };
  let next = defaultChronicle(current.id + 1, addDays(current.endDate, 1));
  while (today > next.endDate) next = defaultChronicle(next.id + 1, addDays(next.endDate, 1));
  return {
    ...state,
    chronicle: next,
    prizeHistory: [result, ...state.prizeHistory].slice(0, HISTORY_LIMIT),
    characters: {
      husband: { ...state.characters.husband, gold: 0 },
      wife: { ...state.characters.wife, gold: 0 },
    },
  };
}

// ---------------------------------------------------------------------------
// Household document mapping
// ---------------------------------------------------------------------------

export type HouseholdSections = Pick<HouseholdDoc, 'settings' | 'chronicle' | 'game'>;

export function toHouseholdSections(state: GameState): HouseholdSections {
  return {
    settings: { tasks: state.tasks, prizePool: state.prizePool },
    chronicle: state.chronicle,
    game: { characters: state.characters, logs: state.logs, prizeHistory: state.prizeHistory },
  };
}

export function fromHouseholdDoc(doc: Partial<HouseholdDoc>, today = localDateKey()): GameState | null {
  return parseGameState(
    {
      ...doc.game,
      tasks: doc.settings?.tasks,
      prizePool: doc.settings?.prizePool,
      chronicle: doc.chronicle,
    },
    today,
  );
}

/**
 * Only the sections that actually changed, so a member's quest update never rewrites
 * moderator-only settings (which security rules would reject).
 */
export function changedSections(prev: GameState, next: GameState): Partial<HouseholdSections> {
  const before = toHouseholdSections(prev);
  const after = toHouseholdSections(next);
  const patch: Partial<HouseholdSections> = {};
  (['settings', 'chronicle', 'game'] as const).forEach((key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      (patch as Record<string, unknown>)[key] = after[key];
    }
  });
  return patch;
}
