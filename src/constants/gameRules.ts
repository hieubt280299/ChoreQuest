import type { Character, CharacterId, SkillDefinition, Task, TaskCategory, TaskGroup, WheelPrize } from '../types';

export const XP_CURVE = [
  230, 370, 480, 580, 600, 720, 750, 780, 810, 840, 870, 1000, 1000, 1000, 1000, 1000, 1000, 1500, 1590, 1600, 1850, 2100,
  2350, 2600, 3500, 4500, 5500, 6500, 7500,
] as const;

export const MAX_LEVEL = 30;
export const MAX_SKILLS_PER_CHARACTER = 8;
export const MAX_SKILL_LEVEL = 4;
/** Earned skill points stop growing here (reached at level 24): enough to max 6 of the 8 slots. */
export const MAX_SKILL_POINTS = 24;
export const STANDARD_LEVEL_GOLD = 50;
export const HIGH_TIER_LEVEL_GOLD = 300;
/** Reaching the level cap (mastery) pays a much bigger bonus. */
export const MASTERY_LEVEL_GOLD = 2000;
export const DEFAULT_PRIZE_POOL = 1_000_000;

// Wheel of Fortune. Weights are percentages; a miss grows the jackpot until someone hits it.
export const WHEEL_PRIZES: { prize: WheelPrize; gold: number; weight: number }[] = [
  { prize: 'small', gold: 3, weight: 35 },
  { prize: 'normal', gold: 5, weight: 30 },
  { prize: 'big', gold: 10, weight: 15 },
  { prize: 'jackpot', gold: 100, weight: 1 },
  { prize: 'none', gold: 0, weight: 19 },
];
export const JACKPOT_BASE_GOLD = 100;
export const JACKPOT_MISS_BONUS = 10;
/**
 * The slices drawn on the wheel, clockwise from the top, with their relative sizes. Sizes are visual only
 * (odds come from WHEEL_PRIZES), but the jackpot slice is kept the smallest to hint at its rarity.
 */
export const WHEEL_SEGMENTS: { prize: WheelPrize; size: number }[] = [
  { prize: 'none', size: 5 },
  { prize: 'jackpot', size: 2 },
  { prize: 'none', size: 5 },
  { prize: 'small', size: 5 },
  { prize: 'normal', size: 5 },
  { prize: 'big', size: 4 },
  { prize: 'normal', size: 5 },
  { prize: 'small', size: 5 },
];

export const TASK_GROUPS: TaskGroup[] = ['quick', 'main', 'heavy'];

// Rewards scale with time and effort (0.75 pleasant, 1 normal, 1.3 physical or unpleasant, 1.5 heavy,
// 1.8 hardest): XP ~ 1 per minute x effort (halved from 2/min so levelling feels earned, min 5);
// gold ~ 1.2 per minute x effort, rounded to 5 (min 5).
export const DEFAULT_TASKS: Task[] = [
  // Quick tasks: up to 10 XP
  { id: 'beds', nameKey: 'task.beds', names: { en: 'Make the Bed', vi: 'Dọn dẹp giường' }, xp: 5, gold: 5, category: 'general', group: 'quick', enabled: true },
  { id: 'feedPet', nameKey: 'task.feedPet', names: { en: 'Feed Pet', vi: 'Cho thú cưng ăn' }, xp: 5, gold: 5, category: 'general', group: 'quick', enabled: true },
  { id: 'trash', nameKey: 'task.trash', names: { en: 'Take Out Trash', vi: 'Đổ rác' }, xp: 5, gold: 10, category: 'general', group: 'quick', enabled: true },
  { id: 'laundry', nameKey: 'task.laundry', names: { en: 'Wash Clothes', vi: 'Giặt quần áo' }, xp: 8, gold: 8, category: 'laundry', group: 'quick', enabled: true },
  { id: 'collectClothes', nameKey: 'task.collectClothes', names: { en: 'Collect Dried Clothes', vi: 'Thu quần áo' }, xp: 8, gold: 8, category: 'laundry', group: 'quick', enabled: true },
  { id: 'cleanLitter', nameKey: 'task.cleanLitter', names: { en: 'Clean Litter Box', vi: 'Dọn khay cát thú cưng' }, xp: 8, gold: 10, category: 'general', group: 'quick', enabled: true },
  { id: 'dryClothes', nameKey: 'task.dryClothes', names: { en: 'Hang / Dry Clothes', vi: 'Phơi quần áo' }, xp: 10, gold: 10, category: 'laundry', group: 'quick', enabled: true },
  { id: 'groceryDaily', nameKey: 'task.groceryDaily', names: { en: 'Daily Grocery Shopping', vi: 'Đi chợ hằng ngày' }, xp: 10, gold: 10, category: 'shopping', group: 'quick', enabled: true },
  // Moderate tasks: 11-40 XP
  { id: 'changeSheets', nameKey: 'task.changeSheets', names: { en: 'Change Bed Sheets', vi: 'Thay ga giường' }, xp: 13, gold: 15, category: 'laundry', group: 'main', enabled: true },
  { id: 'cleanFridge', nameKey: 'task.cleanFridge', names: { en: 'Clean Fridge', vi: 'Lau dọn tủ lạnh' }, xp: 15, gold: 15, category: 'cleaning', group: 'main', enabled: true },
  { id: 'sweep', nameKey: 'task.sweep', names: { en: 'Sweep House', vi: 'Quét nhà' }, xp: 15, gold: 20, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dishesLunch', nameKey: 'task.dishesLunch', names: { en: 'Lunch Dishwashing', vi: 'Rửa bát bữa trưa' }, xp: 25, gold: 30, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dishesDinner', nameKey: 'task.dishesDinner', names: { en: 'Dinner Dishwashing', vi: 'Rửa bát bữa tối' }, xp: 25, gold: 30, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dustFurniture', nameKey: 'task.dustFurniture', names: { en: 'Dust Furniture', vi: 'Lau bụi bàn ghế & kệ' }, xp: 20, gold: 20, category: 'cleaning', group: 'main', enabled: true },
  { id: 'cookLunch', nameKey: 'task.cookLunch', names: { en: 'Cook Lunch', vi: 'Nấu bữa trưa' }, xp: 40, gold: 45, category: 'cooking', group: 'main', enabled: true },
  { id: 'cooking', nameKey: 'task.cooking', names: { en: 'Cook Dinner', vi: 'Nấu bữa tối' }, xp: 40, gold: 45, category: 'cooking', group: 'main', enabled: true },
  { id: 'cookPetFood', nameKey: 'task.cookPetFood', names: { en: "Cook Pet's Food", vi: 'Nấu đồ ăn cho thú cưng' }, xp: 40, gold: 45, category: 'cooking', group: 'main', enabled: true },
  // Heavy tasks: 41+ XP
  { id: 'vacuum', nameKey: 'task.vacuum', names: { en: 'Vacuum House', vi: 'Hút bụi nhà' }, xp: 42, gold: 50, category: 'cleaning', group: 'heavy', enabled: true },
  { id: 'grocery', nameKey: 'task.grocery', names: { en: 'Supermarket Shopping', vi: 'Đi siêu thị' }, xp: 45, gold: 50, category: 'shopping', group: 'heavy', enabled: true },
  { id: 'mop', nameKey: 'task.mop', names: { en: 'Mop House', vi: 'Lau nhà' }, xp: 45, gold: 50, category: 'cleaning', group: 'heavy', enabled: true },
  { id: 'bathroom', nameKey: 'task.bathroom', names: { en: 'Clean Bathroom', vi: 'Cọ rửa nhà vệ sinh' }, xp: 55, gold: 65, category: 'cleaning', group: 'heavy', enabled: true },
];

/** Effort group from a quest's XP: Quick up to 10, Moderate 11-40, Heavy 41+ (used for defaults and new quests). */
export function groupForXp(xp: number): TaskGroup {
  return xp <= 10 ? 'quick' : xp <= 40 ? 'main' : 'heavy';
}

/**
 * Built-in quests still on their v0.2 values get the v1.0 rebalance (values and group). Quests a moderator
 * has edited are left alone.
 */
const V1_REBALANCE: Record<string, { from: [number, number, TaskGroup]; to: [number, number, TaskGroup] }> = {
  laundry: { from: [5, 5, 'quick'], to: [8, 8, 'quick'] },
  collectClothes: { from: [5, 5, 'quick'], to: [8, 8, 'quick'] },
  trash: { from: [5, 5, 'quick'], to: [5, 10, 'quick'] },
  cleanFridge: { from: [15, 20, 'main'], to: [15, 15, 'main'] },
  sweep: { from: [20, 25, 'main'], to: [15, 20, 'main'] },
  dishesLunch: { from: [20, 25, 'main'], to: [25, 30, 'main'] },
  dishesDinner: { from: [20, 25, 'main'], to: [25, 30, 'main'] },
  dustFurniture: { from: [30, 35, 'main'], to: [20, 20, 'main'] },
  cookLunch: { from: [45, 55, 'main'], to: [40, 45, 'main'] },
  cooking: { from: [45, 55, 'main'], to: [40, 45, 'main'] },
  cookPetFood: { from: [45, 55, 'main'], to: [40, 45, 'main'] },
  grocery: { from: [45, 55, 'main'], to: [45, 50, 'heavy'] },
  vacuum: { from: [40, 50, 'heavy'], to: [42, 50, 'heavy'] },
  mop: { from: [45, 55, 'heavy'], to: [45, 50, 'heavy'] },
};

export function rebalanceTask<T extends Pick<Task, 'id' | 'xp' | 'gold' | 'group'>>(task: T): T {
  const change = V1_REBALANCE[task.id];
  if (!change) return task;
  const [xp, gold, group] = change.from;
  if (task.xp !== xp || task.gold !== gold || task.group !== group) return task;
  return { ...task, xp: change.to[0], gold: change.to[1], group: change.to[2] };
}

const DEFAULT_GROUP_BY_ID = new Map(DEFAULT_TASKS.map((task) => [task.id, task.group]));
const GROUP_BY_CATEGORY: Record<TaskCategory, TaskGroup> = {
  general: 'quick',
  cleaning: 'main',
  cooking: 'main',
  shopping: 'main',
  laundry: 'main',
};

/** Group for quests saved before groups existed: the built-in's group, else a guess from its category. */
export function inferTaskGroup(task: Pick<Task, 'id' | 'category'> & { group?: unknown }): TaskGroup {
  if (task.group === 'quick' || task.group === 'main' || task.group === 'heavy') return task.group;
  return DEFAULT_GROUP_BY_ID.get(task.id) ?? GROUP_BY_CATEGORY[task.category] ?? 'main';
}

const levels = (...values: number[]) => values;
/** XP-only skills also pay gold: half their XP bonus. */
const halfOf = (values: number[]) => values.map((value) => value / 2);

export const SKILL_POOL: SkillDefinition[] = [
  {
    id: 'speed-cleaner',
    nameKey: 'skill.speedCleaner.name',
    descriptionKey: 'skill.speedCleaner.desc',
    icon: 'sparkles',
    maxLevel: 4,
    effect: { kind: 'category', category: 'cleaning', xp: levels(0.08, 0.16, 0.24, 0.32), gold: halfOf(levels(0.08, 0.16, 0.24, 0.32)) },
  },
  {
    id: 'master-chef',
    nameKey: 'skill.masterChef.name',
    descriptionKey: 'skill.masterChef.desc',
    icon: 'chef',
    maxLevel: 4,
    effect: { kind: 'category', category: 'cooking', gold: levels(0.1, 0.18, 0.26, 0.34) },
  },
  {
    id: 'gold-doubler',
    nameKey: 'skill.goldDoubler.name',
    descriptionKey: 'skill.goldDoubler.desc',
    icon: 'coins',
    maxLevel: 4,
    effect: { kind: 'all', gold: levels(0.05, 0.1, 0.15, 0.2) },
  },
  {
    id: 'quick-hands',
    nameKey: 'skill.quickHands.name',
    descriptionKey: 'skill.quickHands.desc',
    icon: 'zap',
    maxLevel: 4,
    effect: { kind: 'group', group: 'quick', xp: levels(0.1, 0.2, 0.3, 0.4), gold: levels(0.05, 0.1, 0.15, 0.2) },
  },
  {
    id: 'team-player',
    nameKey: 'skill.teamPlayer.name',
    descriptionKey: 'skill.teamPlayer.desc',
    icon: 'hearts',
    maxLevel: 4,
    effect: { kind: 'together', xp: levels(0.1, 0.2, 0.3, 0.4), gold: levels(0.05, 0.1, 0.15, 0.2) },
  },
  {
    id: 'iron-will',
    nameKey: 'skill.ironWill.name',
    descriptionKey: 'skill.ironWill.desc',
    icon: 'shirt',
    maxLevel: 4,
    effect: { kind: 'category', category: 'laundry', gold: levels(0.1, 0.2, 0.3, 0.4) },
  },
  {
    id: 'shop-savvy',
    nameKey: 'skill.shopSavvy.name',
    descriptionKey: 'skill.shopSavvy.desc',
    icon: 'cart',
    maxLevel: 4,
    effect: { kind: 'category', category: 'shopping', xp: levels(0.08, 0.16, 0.24, 0.32), gold: halfOf(levels(0.08, 0.16, 0.24, 0.32)) },
  },
  {
    id: 'zen-housekeeper',
    nameKey: 'skill.zenHousekeeper.name',
    descriptionKey: 'skill.zenHousekeeper.desc',
    icon: 'lightbulb',
    maxLevel: 4,
    effect: { kind: 'all', xp: levels(0.04, 0.08, 0.12, 0.16), gold: halfOf(levels(0.04, 0.08, 0.12, 0.16)) },
  },
  {
    id: 'raid-master',
    nameKey: 'skill.raidMaster.name',
    descriptionKey: 'skill.raidMaster.desc',
    icon: 'shield',
    maxLevel: 4,
    effect: { kind: 'group', group: 'heavy', gold: levels(0.15, 0.25, 0.35, 0.45) },
  },
  {
    id: 'steady-worker',
    nameKey: 'skill.steadyWorker.name',
    descriptionKey: 'skill.steadyWorker.desc',
    icon: 'clock',
    maxLevel: 4,
    effect: { kind: 'group', group: 'main', xp: levels(0.06, 0.12, 0.18, 0.24), gold: levels(0.06, 0.12, 0.18, 0.24) },
  },
  {
    id: 'fortunes-favor',
    nameKey: 'skill.fortunesFavor.name',
    descriptionKey: 'skill.fortunesFavor.desc',
    icon: 'ticket',
    maxLevel: 4,
    effect: { kind: 'chronicle_tickets', values: levels(2, 3, 4, 5) },
  },
  {
    id: 'gold-interest',
    nameKey: 'skill.goldInterest.name',
    descriptionKey: 'skill.goldInterest.desc',
    icon: 'trending',
    maxLevel: 4,
    effect: { kind: 'daily_interest', values: levels(0.02, 0.04, 0.06, 0.08) },
  },
  {
    id: 'synergistic-streak',
    nameKey: 'skill.synergy.name',
    descriptionKey: 'skill.synergy.desc',
    icon: 'link',
    maxLevel: 4,
    effect: { kind: 'spouse_streak', xp: levels(0.1, 0.15, 0.2, 0.25), gold: levels(0.2, 0.3, 0.4, 0.5) },
  },
  {
    id: 'hall-of-fame',
    nameKey: 'skill.hallOfFame.name',
    descriptionKey: 'skill.hallOfFame.desc',
    icon: 'trophy',
    maxLevel: 4,
    effect: { kind: 'mvp_tickets', values: levels(1, 2, 3, 4) },
  },
];

/** Hall of Fame pays at every this-many MVP days in a chronicle. */
export const HALL_OF_FAME_EVERY = 5;

/** A character's level in a skill (0 = not learned). */
export function skillLevel(character: Pick<Character, 'skills'>, skillId: string): number {
  return character.skills.find((skill) => skill.skillId === skillId)?.level ?? 0;
}

/** A skill's `values` entry at a level (tickets, interest rate), 0 when not learned. */
export function skillEffectValue(skill: SkillDefinition, level: number): number {
  return level > 0 ? (skill.effect.values?.[level - 1] ?? 0) : 0;
}

/**
 * Retired skills and their replacements (time-of-day bonuses became task-group bonuses; Lucky Charm
 * duplicated Golden Touch). Owned levels carry over, so no skill points are lost.
 */
export const SKILL_MIGRATIONS: Record<string, string> = {
  'early-bird': 'quick-hands',
  'night-owl': 'raid-master',
  'lucky-charm': 'steady-worker',
};

export function createDefaultCharacter(id: CharacterId, name: string): Character {
  return { id, name, xp: 0, gold: 0, skills: [], tickets: 0, ticketLevel: 1, mvpDays: 0 };
}
