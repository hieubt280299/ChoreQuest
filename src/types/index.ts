export type CharacterId = 'husband' | 'wife';
export type Completer = CharacterId | 'both';
export type LanguageCode = 'en' | 'vi';
export type AppView = 'dashboard' | 'tasks' | 'skills' | 'calendar' | 'settings';
export type HouseholdRole = 'moderator' | 'member';

export interface CharacterSkill {
  skillId: string;
  level: number;
}

export interface Character {
  id: CharacterId;
  name: string;
  xp: number;
  gold: number;
  skills: CharacterSkill[];
}

export interface SkillDefinition {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: 'sparkles' | 'chef' | 'coins' | 'sun' | 'hearts' | 'shirt' | 'cart' | 'leaf' | 'moon' | 'clover';
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
  | 'morning_bonus'
  | 'evening_bonus';

export interface SkillEffect {
  kind: SkillEffectKind;
  /** Bonus per skill level as a fraction, e.g. 0.08 = +8% per level. */
  perLevel: number;
  category?: TaskCategory;
}

export type TaskCategory = 'cleaning' | 'cooking' | 'shopping' | 'laundry' | 'general';

export interface Task {
  id: string;
  nameKey: string;
  xp: number;
  gold: number;
  category: TaskCategory;
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
  /** Local hour of completion, used to recompute time-of-day skill bonuses on re-assign. */
  hour?: number;
  /** Task values at completion time, so a log can be re-assigned even if the task was edited later. */
  baseXp?: number;
  baseGold?: number;
  category?: TaskCategory;
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
  title: string;
  xp: Record<CharacterId, number>;
  gold: Record<CharacterId, number>;
  levelUps: { characterId: CharacterId; from: number; to: number; bonusGold: number }[];
}

/** The playable game state as the UI sees it (assembled from the household document or local demo storage). */
export interface GameState {
  characters: Record<CharacterId, Character>;
  tasks: Task[];
  logs: TaskLog[];
  prizePool: number;
  chronicle: Chronicle;
  prizeHistory: ChronicleResult[];
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
