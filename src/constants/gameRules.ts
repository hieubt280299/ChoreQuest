import type { Character, CharacterId, SkillDefinition, Task } from '../types';

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

export const DEFAULT_TASKS: Task[] = [
  { id: 'dishes', nameKey: 'task.dishes', xp: 30, gold: 20, category: 'cleaning', enabled: true },
  { id: 'cooking', nameKey: 'task.cooking', xp: 50, gold: 35, category: 'cooking', enabled: true },
  { id: 'grocery', nameKey: 'task.grocery', xp: 40, gold: 30, category: 'shopping', enabled: true },
  { id: 'laundry', nameKey: 'task.laundry', xp: 35, gold: 25, category: 'laundry', enabled: true },
  { id: 'vacuum', nameKey: 'task.vacuum', xp: 30, gold: 20, category: 'cleaning', enabled: true },
  { id: 'trash', nameKey: 'task.trash', xp: 15, gold: 10, category: 'general', enabled: true },
  { id: 'beds', nameKey: 'task.beds', xp: 12, gold: 8, category: 'general', enabled: true },
  { id: 'bathroom', nameKey: 'task.bathroom', xp: 45, gold: 30, category: 'cleaning', enabled: true },
];

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
    id: 'early-bird',
    nameKey: 'skill.earlyBird.name',
    descriptionKey: 'skill.earlyBird.desc',
    icon: 'sun',
    maxLevel: 4,
    effect: { kind: 'morning_bonus', perLevel: 0.08 },
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
    id: 'night-owl',
    nameKey: 'skill.nightOwl.name',
    descriptionKey: 'skill.nightOwl.desc',
    icon: 'moon',
    maxLevel: 4,
    effect: { kind: 'evening_bonus', perLevel: 0.08 },
  },
  {
    id: 'lucky-charm',
    nameKey: 'skill.luckyCharm.name',
    descriptionKey: 'skill.luckyCharm.desc',
    icon: 'clover',
    maxLevel: 4,
    effect: { kind: 'gold_all', perLevel: 0.05 },
  },
];

export function createDefaultCharacter(id: CharacterId, name: string): Character {
  return { id, name, xp: 0, gold: 0, skills: [] };
}
