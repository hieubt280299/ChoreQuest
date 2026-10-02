export type CharacterId = 'husband' | 'wife';
export type Completer = CharacterId | 'both';
export type LanguageCode = 'en' | 'vi';
export type AppView = 'dashboard' | 'tasks' | 'skills' | 'history' | 'calendar' | 'settings';
export type HouseholdRole = 'moderator' | 'member';

export interface CharacterSkill {
  skillId: string;
  level: number;
}

export interface Character {
  id: CharacterId;
  /** Legacy internal label ("Husband"/"Wife"); not shown. */
  name: string;
  /** Player-chosen display name (max 16 letters/digits/spaces); unset = show the role. */
  customName?: string;
  xp: number;
  /** Gold earned this chronicle (quests, wheel, interest); decides the payout split. */
  gold: number;
  skills: CharacterSkill[];
  /** Wheel of Fortune tickets on hand. */
  tickets: number;
  /** Last local day (`YYYY-MM-DD`) the free daily ticket was claimed. */
  ticketClaimedOn?: string;
  /**
   * Highest level that has paid its level-up ticket, so undoing and redoing a quest around a level-up
   * can't farm tickets. Reset with the levels ("new legend").
   */
  ticketLevel: number;
  /** Last local day whose interest has been settled (set once the skill is learned). */
  interestOn?: string;
}

export interface SkillDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: 'sparkles' | 'chef' | 'coins' | 'zap' | 'hearts' | 'shirt' | 'cart' | 'lightbulb' | 'shield' | 'clock' | 'ticket' | 'trending';
  maxLevel: 4;
  effect: SkillEffect;
}

export type SkillEffectKind =
  | 'xp_all'
  | 'gold_all'
  | 'gold_mult'
  | 'task_category_xp'
  | 'task_category_gold'
  | 'both_bonus'
  | 'group_xp'
  | 'group_gold'
  | 'group_both'
  /** Extra wheel tickets at the start of each chronicle: base + perLevel x level. */
  | 'chronicle_tickets'
  /** Daily interest on current gold: perLevel x level. */
  | 'daily_interest';

export interface SkillEffect {
  kind: SkillEffectKind;
  /** Bonus per skill level as a fraction, e.g. 0.08 = +8% per level. */
  perLevel: number;
  /** Flat amount added to the per-level value (chronicle_tickets: 2 / 3 / 4 / 5). */
  base?: number;
  category?: TaskCategory;
  group?: TaskGroup;
}

export type TaskCategory = 'cleaning' | 'cooking' | 'shopping' | 'laundry' | 'general';
/** Effort tier: quick (light dailies), main (standard chores), heavy (weekly "raids"). */
export type TaskGroup = 'quick' | 'main' | 'heavy';

export interface Task {
  id: string;
  /** Internal code (e.g. `task.laundry`), generated from the name for custom quests. */
  nameKey: string;
  /** Player-entered names per language; built-in quests may omit them and use app translations. */
  names?: Partial<Record<LanguageCode, string>>;
  xp: number;
  gold: number;
  category: TaskCategory;
  group: TaskGroup;
  enabled: boolean;
}

export interface TaskLog {
  id: string;
  taskId: string;
  date: string;
  completedBy: Completer;
  xpAwarded: Record<CharacterId, number>;
  goldAwarded: Record<CharacterId, number>;
  timestamp: number;
  /** uid of the account that logged it (absent in demo mode and older logs). */
  loggedBy?: string;
  /** Task values at completion time, so a log can be re-assigned even if the task was edited later. */
  baseXp?: number;
  baseGold?: number;
  category?: TaskCategory;
  group?: TaskGroup;
  /** Streak length each recipient reached with this completion, and the bonus gold it paid (included in goldAwarded). */
  streakDays?: Partial<Record<CharacterId, number>>;
  streakGold?: Partial<Record<CharacterId, number>>;
}

/**
 * A character's run of consecutive days completing one quest (derived from the quest log, never stored).
 * `days` counts up to today if done today, otherwise up to yesterday (a missed day makes it 0).
 */
export interface Streak {
  taskId: string;
  characterId: CharacterId;
  days: number;
  doneToday: boolean;
  /** Bonus gold earned today (if done) or that completing it today would earn. */
  bonusGold: number;
}

/** How one character's reward for a completion is made up. */
export interface RewardBreakdown {
  baseXp: number;
  baseGold: number;
  skillXp: number;
  skillGold: number;
  streakDays: number;
  streakGold: number;
  xp: number;
  gold: number;
}

/** A season of play. Gold resets when it ends; XP, levels and skills persist. */
export interface Chronicle {
  /** Sequential number, starting at 1. */
  id: number;
  /** First day, local `YYYY-MM-DD`. */
  startDate: string;
  /** Last day (inclusive), local `YYYY-MM-DD`. */
  endDate: string;
  /** Epoch ms of local midnight after `endDate`; lets security rules check expiry. */
  endsAtMs: number;
}

/** Settled result of a finished chronicle. */
export interface ChronicleResult {
  chronicleId: number;
  startDate: string;
  endDate: string;
  prizePool: number;
  payout: Record<CharacterId, number>;
  goldSnapshot: Record<CharacterId, number>;
}

export interface RewardToast {
  id: string;
  /** Quest code; `names` holds its display names. */
  title: string;
  names?: Partial<Record<LanguageCode, string>>;
  xp: Record<CharacterId, number>;
  gold: Record<CharacterId, number>;
  streakDays?: Partial<Record<CharacterId, number>>;
  streakGold?: Partial<Record<CharacterId, number>>;
  levelUps: LevelUpReward[];
}

/** What one character got for levelling up. */
export interface LevelUpReward {
  characterId: CharacterId;
  from: number;
  to: number;
  bonusGold: number;
  /** Wheel tickets granted (one per level not rewarded before). */
  tickets: number;
  /** Skill points gained (stop growing once every slot can be maxed). */
  skillPoints: number;
}

// ---------------------------------------------------------------------------
// Wheel of Fortune and interest
// ---------------------------------------------------------------------------

export type WheelPrize = 'small' | 'normal' | 'big' | 'jackpot' | 'none';

/** Shared wheel state: the jackpot grows with every miss until someone hits it. */
export interface WheelState {
  jackpotBonus: number;
}

/** One spin of the wheel. */
export interface WheelSpinEvent {
  id: string;
  type: 'spin';
  characterId: CharacterId;
  date: string;
  timestamp: number;
  prize: WheelPrize;
  gold: number;
}

/** Gold Interest paid at the start of a day (counts for the payout, not for the day's MVP). */
export interface InterestEvent {
  id: string;
  type: 'interest';
  characterId: CharacterId;
  date: string;
  timestamp: number;
  gold: number;
}

export type GameEvent = WheelSpinEvent | InterestEvent;

/** The playable game state as the UI sees it (assembled from the household document or local demo storage). */
export interface GameState {
  characters: Record<CharacterId, Character>;
  tasks: Task[];
  logs: TaskLog[];
  prizePool: number;
  chronicle: Chronicle;
  prizeHistory: ChronicleResult[];
  wheel: WheelState;
  /** Wheel spins and interest payouts, kept as long as quest logs. */
  events: GameEvent[];
  /**
   * When levels and skills were last reset after a player reached the level cap (epoch ms).
   * Quest entries logged before it can no longer be undone or re-assigned.
   */
  levelResetAt?: number;
}

export interface HouseholdUser {
  uid: string;
  email: string | null;
}

// ---------------------------------------------------------------------------
// Firestore schema
// ---------------------------------------------------------------------------

export interface HouseholdMember {
  uid: string;
  characterId: CharacterId;
  role: HouseholdRole;
  email: string | null;
  joinedAt: number;
}

/** `households/{householdId}`: one couple, max 2 members. */
export interface HouseholdDoc {
  /** 6-character join code, mirrored in `householdCodes/{code}`. */
  code: string;
  /**
   * uid of the household's creator (the spec's `createdById`). Only the creator may grant or revoke the
   * partner's moderator role; if the creator leaves, this passes to the remaining member.
   */
  createdBy: string;
  createdAt: number;
  /** Member uids (max 2); duplicated from `members` so security rules can check membership and size. */
  memberIds: string[];
  members: Record<string, HouseholdMember>;
  /** Moderator-only configuration. */
  settings: {
    tasks: Task[];
    prizePool: number;
  };
  /** Moderators may change the end date; any member may roll it over once expired. */
  chronicle: Chronicle;
  /** Shared play state any member may update. */
  game: {
    characters: Record<CharacterId, Character>;
    logs: TaskLog[];
    prizeHistory: ChronicleResult[];
    wheel?: WheelState;
    events?: GameEvent[];
    levelResetAt?: number;
  };
}

/** `householdCodes/{code}`: join-code lookup. */
export interface HouseholdCodeDoc {
  householdId: string;
  createdBy: string;
}

/** `users/{uid}` */
export interface UserProfileDoc {
  householdId: string | null;
  email: string | null;
  updatedAt: number;
}
