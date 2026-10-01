import type { Character, CharacterId, SkillDefinition, Task, TaskCategory, TaskGroup } from '../types';

export const XP_CURVE = [
  230, 370, 480, 580, 600, 720, 750, 780, 810, 840, 870, 1000, 1000, 1000, 1000, 1000, 1000, 1500, 1590, 1600, 1850, 2100,
  2350, 2600, 3500, 4500, 5500, 6500, 7500,
] as const;

export const MAX_LEVEL = 30;
export const MAX_SKILLS_PER_CHARACTER = 6;
export const MAX_SKILL_LEVEL = 4;
export const STANDARD_LEVEL_GOLD = 50;
export const HIGH_TIER_LEVEL_GOLD = 300;
export const DEFAULT_PRIZE_POOL = 1_000_000;

export const TASK_GROUPS: TaskGroup[] = ['quick', 'main', 'heavy'];

// Rewards scale with time and effort: XP = 2 per minute x effort (0.75 pleasant, 1 normal, 1.3 physical
// or unpleasant, 1.5 heavy, 1.8 hardest), rounded to 5 (min 10); gold is ~60% of XP (min 5).
export const DEFAULT_TASKS: Task[] = [
  // Quick tasks: light, ~5-10 minutes
  { id: 'beds', nameKey: 'task.beds', names: { en: 'Make the Bed', vi: 'Dọn dẹp giường' }, xp: 10, gold: 5, category: 'general', group: 'quick', enabled: true },
  { id: 'feedPet', nameKey: 'task.feedPet', names: { en: 'Feed Pet', vi: 'Cho thú cưng ăn' }, xp: 10, gold: 5, category: 'general', group: 'quick', enabled: true },
  { id: 'trash', nameKey: 'task.trash', names: { en: 'Take Out Trash', vi: 'Đổ rác' }, xp: 10, gold: 5, category: 'general', group: 'quick', enabled: true },
  { id: 'laundry', nameKey: 'task.laundry', names: { en: 'Wash Clothes', vi: 'Giặt quần áo' }, xp: 10, gold: 5, category: 'laundry', group: 'quick', enabled: true },
  { id: 'collectClothes', nameKey: 'task.collectClothes', names: { en: 'Collect Dried Clothes', vi: 'Thu quần áo' }, xp: 10, gold: 5, category: 'laundry', group: 'quick', enabled: true },
  { id: 'cleanLitter', nameKey: 'task.cleanLitter', names: { en: 'Clean Litter Box', vi: 'Dọn khay cát thú cưng' }, xp: 15, gold: 10, category: 'general', group: 'quick', enabled: true },
  { id: 'dryClothes', nameKey: 'task.dryClothes', names: { en: 'Hang / Dry Clothes', vi: 'Phơi quần áo' }, xp: 20, gold: 10, category: 'laundry', group: 'quick', enabled: true },
  { id: 'groceryDaily', nameKey: 'task.groceryDaily', names: { en: 'Daily Grocery Shopping', vi: 'Đi chợ hằng ngày' }, xp: 20, gold: 10, category: 'shopping', group: 'quick', enabled: true },
  // Moderate tasks: normal effort, ~10-60 minutes
  { id: 'changeSheets', nameKey: 'task.changeSheets', names: { en: 'Change Bed Sheets', vi: 'Thay ga giường' }, xp: 25, gold: 15, category: 'laundry', group: 'main', enabled: true },
  { id: 'cleanFridge', nameKey: 'task.cleanFridge', names: { en: 'Clean Fridge', vi: 'Lau dọn tủ lạnh' }, xp: 30, gold: 20, category: 'cleaning', group: 'main', enabled: true },
  { id: 'sweep', nameKey: 'task.sweep', names: { en: 'Sweep House', vi: 'Quét nhà' }, xp: 40, gold: 25, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dishesLunch', nameKey: 'task.dishesLunch', names: { en: 'Lunch Dishwashing', vi: 'Rửa bát bữa trưa' }, xp: 40, gold: 25, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dishesDinner', nameKey: 'task.dishesDinner', names: { en: 'Dinner Dishwashing', vi: 'Rửa bát bữa tối' }, xp: 40, gold: 25, category: 'cleaning', group: 'main', enabled: true },
  { id: 'dustFurniture', nameKey: 'task.dustFurniture', names: { en: 'Dust Furniture', vi: 'Lau bụi bàn ghế & kệ' }, xp: 60, gold: 35, category: 'cleaning', group: 'main', enabled: true },
  { id: 'cookLunch', nameKey: 'task.cookLunch', names: { en: 'Cook Lunch', vi: 'Nấu bữa trưa' }, xp: 90, gold: 55, category: 'cooking', group: 'main', enabled: true },
  { id: 'cooking', nameKey: 'task.cooking', names: { en: 'Cook Dinner', vi: 'Nấu bữa tối' }, xp: 90, gold: 55, category: 'cooking', group: 'main', enabled: true },
  { id: 'cookPetFood', nameKey: 'task.cookPetFood', names: { en: "Cook Pet's Food", vi: 'Nấu đồ ăn cho thú cưng' }, xp: 90, gold: 55, category: 'cooking', group: 'main', enabled: true },
  { id: 'grocery', nameKey: 'task.grocery', names: { en: 'Supermarket Shopping', vi: 'Đi siêu thị' }, xp: 90, gold: 55, category: 'shopping', group: 'main', enabled: true },
  // Heavy tasks: physically demanding, ~30 minutes
  { id: 'vacuum', nameKey: 'task.vacuum', names: { en: 'Vacuum House', vi: 'Hút bụi nhà' }, xp: 80, gold: 50, category: 'cleaning', group: 'heavy', enabled: true },
  { id: 'mop', nameKey: 'task.mop', names: { en: 'Mop House', vi: 'Lau nhà' }, xp: 90, gold: 55, category: 'cleaning', group: 'heavy', enabled: true },
  { id: 'bathroom', nameKey: 'task.bathroom', names: { en: 'Clean Bathroom', vi: 'Cọ rửa nhà vệ sinh' }, xp: 110, gold: 65, category: 'cleaning', group: 'heavy', enabled: true },
];

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

export const SKILL_POOL: SkillDefinition[] = [
  {
    id: 'speed-cleaner',
    nameKey: 'skill.speedCleaner.name',
    descriptionKey: 'skill.speedCleaner.desc',
    icon: 'sparkles',
    maxLevel: 4,
    effect: { kind: 'task_category_xp', perLevel: 0.08, category: 'cleaning' },
  },
  {
    id: 'master-chef',
    nameKey: 'skill.masterChef.name',
    descriptionKey: 'skill.masterChef.desc',
    icon: 'chef',
    maxLevel: 4,
    effect: { kind: 'task_category_gold', perLevel: 0.1, category: 'cooking' },
  },
  {
    id: 'gold-doubler',
    nameKey: 'skill.goldDoubler.name',
    descriptionKey: 'skill.goldDoubler.desc',
    icon: 'coins',
    maxLevel: 4,
    effect: { kind: 'gold_mult', perLevel: 0.05 },
  },
  {
    id: 'quick-hands',
    nameKey: 'skill.quickHands.name',
    descriptionKey: 'skill.quickHands.desc',
    icon: 'zap',
    maxLevel: 4,
    effect: { kind: 'group_both', perLevel: 0.1, group: 'quick' },
  },
  {
    id: 'team-player',
    nameKey: 'skill.teamPlayer.name',
    descriptionKey: 'skill.teamPlayer.desc',
    icon: 'hearts',
    maxLevel: 4,
    effect: { kind: 'both_bonus', perLevel: 0.1 },
  },
  {
    id: 'iron-will',
    nameKey: 'skill.ironWill.name',
    descriptionKey: 'skill.ironWill.desc',
    icon: 'shirt',
    maxLevel: 4,
    effect: { kind: 'task_category_gold', perLevel: 0.1, category: 'laundry' },
  },
  {
    id: 'shop-savvy',
    nameKey: 'skill.shopSavvy.name',
    descriptionKey: 'skill.shopSavvy.desc',
    icon: 'cart',
    maxLevel: 4,
    effect: { kind: 'task_category_xp', perLevel: 0.08, category: 'shopping' },
  },
  {
    id: 'zen-housekeeper',
    nameKey: 'skill.zenHousekeeper.name',
    descriptionKey: 'skill.zenHousekeeper.desc',
    icon: 'leaf',
    maxLevel: 4,
    effect: { kind: 'xp_all', perLevel: 0.04 },
  },
  {
    id: 'raid-master',
    nameKey: 'skill.raidMaster.name',
    descriptionKey: 'skill.raidMaster.desc',
    icon: 'sword',
    maxLevel: 4,
    effect: { kind: 'group_gold', perLevel: 0.15, group: 'heavy' },
  },
  {
    id: 'steady-worker',
    nameKey: 'skill.steadyWorker.name',
    descriptionKey: 'skill.steadyWorker.desc',
    icon: 'clock',
    maxLevel: 4,
    effect: { kind: 'group_both', perLevel: 0.06, group: 'main' },
  },
];

/**
 * Retired skills and their replacements (time-of-day bonuses became task-group bonuses; Lucky Charm
 * duplicated Gold Doubler). Owned levels carry over, so no skill points are lost.
 */
export const SKILL_MIGRATIONS: Record<string, string> = {
  'early-bird': 'quick-hands',
  'night-owl': 'raid-master',
  'lucky-charm': 'steady-worker',
};

export function createDefaultCharacter(id: CharacterId, name: string): Character {
  return { id, name, xp: 0, gold: 0, skills: [] };
}
