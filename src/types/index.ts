export type CharacterId = 'husband' | 'wife';
export type Completer = CharacterId | 'both';
export type LanguageCode = 'en' | 'vi';
export type AppView = 'dashboard' | 'tasks' | 'skills' | 'calendar' | 'settings';

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
}

export interface MonthlyPrize {
  month: string;
  prizePool: number;
  settled: boolean;
  payout?: Record<CharacterId, number>;
  goldSnapshot?: Record<CharacterId, number>;
}

export interface RewardToast {
  id: string;
  title: string;
  xp: Record<CharacterId, number>;
  gold: Record<CharacterId, number>;
  levelUps: { characterId: CharacterId; from: number; to: number; bonusGold: number }[];
}

export interface GameState {
  characters: Record<CharacterId, Character>;
  tasks: Task[];
  logs: TaskLog[];
  prizePool: number;
  activeMonth: string;
  prizeHistory: MonthlyPrize[];
  language: LanguageCode;
  activeCharacter: CharacterId;
}

export interface HouseholdUser {
  uid: string;
  email: string | null;
}
