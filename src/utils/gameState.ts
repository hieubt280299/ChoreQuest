import {
  createDefaultCharacter,
  DEFAULT_PRIZE_POOL,
  DEFAULT_TASKS,
  inferTaskGroup,
  SKILL_MIGRATIONS,
  SKILL_POOL,
  skillEffectValue,
  skillLevel,
} from '../constants/gameRules';
import { normalizeCharacterName } from './characterName';
import type {
  Character,
  CharacterId,
  CharacterSkill,
  Chronicle,
  ChronicleResult,
  GameEvent,
  GameState,
  HouseholdDoc,
  Task,
  WheelPrize,
} from '../types';
import {
  addDays,
  calculatePayout,
  daysInMonth,
  defaultChronicle,
  endOfDayMs,
  getLevelFromXp,
  isDateKey,
  localDateKey,
  parseDateKey,
} from './calculations';

// Firestore documents are capped at 1 MiB, so keep only recent logs (the UI reads the current chronicle).
const LOG_RETENTION_DAYS = 120;
const HISTORY_LIMIT = 24;

export function pruneLogs<T extends { date: string }>(logs: T[], today = localDateKey()): T[] {
  const cutoff = addDays(today, -LOG_RETENTION_DAYS);
  return logs.filter((log) => log.date >= cutoff);
}

const WHEEL_PRIZE_IDS: WheelPrize[] = ['small', 'normal', 'big', 'jackpot', 'none'];

function parseEvents(raw: unknown): GameEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is GameEvent => {
    const event = item as Partial<GameEvent> | null;
    if (!event || typeof event.id !== 'string' || !isDateKey(event.date)) return false;
    if (event.characterId !== 'husband' && event.characterId !== 'wife') return false;
    if (typeof event.gold !== 'number' || typeof event.timestamp !== 'number') return false;
    return event.type === 'interest' || (event.type === 'spin' && WHEEL_PRIZE_IDS.includes(event.prize as WheelPrize));
  });
}

const count = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

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
    wheel: { jackpotBonus: 0 },
    events: [],
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
 * then (unless `advance` is false) settles any days that passed: interest and chronicle rollover.
 */
export function parseGameState(raw: unknown, today = localDateKey(), advance = true): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<GameState> & { activeMonth?: string };
  if (!data.characters?.husband || !data.characters?.wife) return null;
  const character = (id: CharacterId): Character => {
    // `interestGold` was a short-lived separate interest balance (pre-release); interest is now plain gold.
    const { customName, ticketClaimedOn, interestOn, interestGold: _interestGold, ...rest } = data.characters![id] as Character & {
      interestGold?: unknown;
    };
    // Keep only valid, non-blank custom names.
    const cleanName = typeof customName === 'string' ? normalizeCharacterName(customName) : null;
    const xp = count(rest.xp);
    return {
      ...createDefaultCharacter(id, id === 'husband' ? 'Husband' : 'Wife'),
      ...rest,
      id,
      xp,
      gold: count(rest.gold),
      skills: migrateSkills(rest.skills),
      tickets: Math.floor(count(rest.tickets)),
      // Characters from before tickets existed start counting from their current level (no back pay).
      ticketLevel: Math.floor(count(rest.ticketLevel, getLevelFromXp(xp))) || 1,
      ...(cleanName ? { customName: cleanName } : {}),
      ...(isDateKey(ticketClaimedOn) ? { ticketClaimedOn } : {}),
      ...(isDateKey(interestOn) ? { interestOn } : {}),
    };
  };
  const state: GameState = {
    characters: { husband: character('husband'), wife: character('wife') },
    tasks:
      Array.isArray(data.tasks) && data.tasks.length
        ? (data.tasks as Task[]).map((task) => ({ ...task, group: inferTaskGroup(task) }))
        : DEFAULT_TASKS.map((task) => ({ ...task })),
    logs: Array.isArray(data.logs) ? data.logs : [],
    prizePool: typeof data.prizePool === 'number' ? data.prizePool : DEFAULT_PRIZE_POOL,
    chronicle: parseChronicle(data.chronicle, data.activeMonth, today),
    prizeHistory: parseHistory(data.prizeHistory),
    wheel: { jackpotBonus: count(data.wheel?.jackpotBonus) },
    events: parseEvents(data.events),
    ...(typeof data.levelResetAt === 'number' ? { levelResetAt: data.levelResetAt } : {}),
  };
  return advance ? advanceDays(state, today) : state;
}

const GOLD_INTEREST = SKILL_POOL.find((skill) => skill.id === 'gold-interest')!;
const FORTUNES_FAVOR = SKILL_POOL.find((skill) => skill.id === 'fortunes-favor')!;

/**
 * Gold Interest: at the start of each day after `interestOn`, up to `upTo`, a character with the skill
 * gains its rate of their current gold (rounded) as ordinary gold, so it counts for the payout. Each
 * payout is also logged as an `interest` event, which keeps it out of the day's MVP. A chronicle's first
 * day never pays (gold has just reset). Derived only from stored data, so every device computes the
 * same result whoever opens the app first.
 */
export function applyDailyInterest(state: GameState, upTo: string): GameState {
  let changed = false;
  const characters = { ...state.characters };
  const events = [...state.events];
  for (const id of ['husband', 'wife'] as CharacterId[]) {
    const character = characters[id];
    const level = skillLevel(character, GOLD_INTEREST.id);
    if (level === 0) continue;
    if (!character.interestOn) {
      // Interest starts the day after the skill is learned.
      characters[id] = { ...character, interestOn: upTo };
      changed = true;
      continue;
    }
    if (character.interestOn >= upTo) continue;
    const rate = skillEffectValue(GOLD_INTEREST, level);
    let gold = character.gold;
    for (let day = addDays(character.interestOn, 1); day <= upTo; day = addDays(day, 1)) {
      if (day <= state.chronicle.startDate) continue;
      const interest = Math.round(gold * rate);
      if (interest <= 0) continue;
      gold += interest;
      events.unshift({
        id: `interest-${id}-${day}`,
        type: 'interest',
        characterId: id,
        date: day,
        timestamp: parseDateKey(day).getTime(),
        gold: interest,
      });
    }
    characters[id] = { ...character, gold, interestOn: upTo };
    changed = true;
  }
  return changed ? { ...state, characters, events } : state;
}

/**
 * Settles every day up to `today`: interest for days still inside the chronicle, then the rollover
 * (gold resets), then interest for the new chronicle's days (on zero gold, so it only moves the marker).
 * Returns the same object when nothing was due.
 */
export function advanceDays(state: GameState, today = localDateKey()): GameState {
  const inChronicle = today < state.chronicle.endDate ? today : state.chronicle.endDate;
  const settled = applyDailyInterest(state, inChronicle);
  const rolled = applyChronicleRollover(settled, today);
  return rolled === settled ? settled : applyDailyInterest(rolled, today);
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
  // Gold (and interest) reset; Fortune's Favor hands out its tickets for the new chronicle.
  const fresh = (id: CharacterId) => {
    const character = state.characters[id];
    const bonusTickets = skillEffectValue(FORTUNES_FAVOR, skillLevel(character, FORTUNES_FAVOR.id));
    return { ...character, gold: 0, tickets: character.tickets + bonusTickets };
  };
  return {
    ...state,
    chronicle: next,
    prizeHistory: [result, ...state.prizeHistory].slice(0, HISTORY_LIMIT),
    characters: { husband: fresh('husband'), wife: fresh('wife') },
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
    game: {
      characters: state.characters,
      logs: state.logs,
      prizeHistory: state.prizeHistory,
      wheel: state.wheel,
      events: state.events,
      ...(state.levelResetAt !== undefined ? { levelResetAt: state.levelResetAt } : {}),
    },
  };
}

/**
 * "New legend": once a player has mastered the game (level cap), both players go back to level 1 with
 * no skills to keep levels meaningful. Gold, the chronicle, quests and history are kept.
 */
export function resetLevelsAndSkills(state: GameState, now = Date.now()): GameState {
  return {
    ...state,
    characters: {
      husband: { ...state.characters.husband, xp: 0, skills: [], ticketLevel: 1 },
      wife: { ...state.characters.wife, xp: 0, skills: [], ticketLevel: 1 },
    },
    levelResetAt: now,
  };
}

export function fromHouseholdDoc(doc: Partial<HouseholdDoc>, today = localDateKey(), advance = true): GameState | null {
  return parseGameState(
    {
      ...doc.game,
      tasks: doc.settings?.tasks,
      prizePool: doc.settings?.prizePool,
      chronicle: doc.chronicle,
    },
    today,
    advance,
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
