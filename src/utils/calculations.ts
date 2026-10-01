import { HIGH_TIER_LEVEL_GOLD, MASTERY_LEVEL_GOLD, MAX_LEVEL, STANDARD_LEVEL_GOLD, XP_CURVE } from '../constants/gameRules';
import type {
  Character,
  CharacterId,
  CharacterSkill,
  Completer,
  RewardBreakdown,
  SkillDefinition,
  Task,
} from '../types';
import { streakBonusGold } from './streaks';

export function getLevelFromXp(xp: number): number {
  let remaining = Math.max(0, xp);
  let level = 1;
  for (const cost of XP_CURVE) {
    if (remaining >= cost) {
      remaining -= cost;
      level += 1;
      if (level >= MAX_LEVEL) return MAX_LEVEL;
    } else {
      break;
    }
  }
  return level;
}

export function getXpProgress(xp: number): {
  level: number;
  currentInLevel: number;
  needed: number;
  percent: number;
  totalForNext: number;
} {
  let remaining = Math.max(0, xp);
  let level = 1;
  for (const cost of XP_CURVE) {
    if (remaining >= cost) {
      remaining -= cost;
      level += 1;
      if (level >= MAX_LEVEL) {
        return { level: MAX_LEVEL, currentInLevel: 0, needed: 0, percent: 100, totalForNext: 0 };
      }
    } else {
      return {
        level,
        currentInLevel: remaining,
        needed: cost,
        percent: Math.min(100, (remaining / cost) * 100),
        totalForNext: cost,
      };
    }
  }
  return { level: MAX_LEVEL, currentInLevel: 0, needed: 0, percent: 100, totalForNext: 0 };
}

export function getLevelUpGold(newLevel: number): number {
  if (newLevel < 2 || newLevel > MAX_LEVEL) return 0;
  if (newLevel <= 24) return STANDARD_LEVEL_GOLD;
  if (newLevel === MAX_LEVEL) return MASTERY_LEVEL_GOLD;
  return HIGH_TIER_LEVEL_GOLD;
}

export function goldForLevelRange(fromLevel: number, toLevel: number): number {
  let gold = 0;
  for (let level = fromLevel + 1; level <= toLevel; level += 1) {
    gold += getLevelUpGold(level);
  }
  return gold;
}

export function splitRewards(xp: number, gold: number, completer: Completer): Record<CharacterId, { xp: number; gold: number }> {
  if (completer === 'both') {
    return {
      husband: { xp: xp / 2, gold: gold / 2 },
      wife: { xp: xp / 2, gold: gold / 2 },
    };
  }
  const empty = { xp: 0, gold: 0 };
  if (completer === 'husband') {
    return { husband: { xp, gold }, wife: empty };
  }
  return { husband: empty, wife: { xp, gold } };
}

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatGold(amount: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount));
}

export function calculatePayout(
  prizePool: number,
  husbandGold: number,
  wifeGold: number,
): Record<CharacterId, number> {
  const total = husbandGold + wifeGold;
  if (total <= 0) {
    return { husband: prizePool / 2, wife: prizePool / 2 };
  }
  return {
    husband: prizePool * (husbandGold / total),
    wife: prizePool * (wifeGold / total),
  };
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function skillPointsAvailable(level: number, skills: CharacterSkill[]): number {
  const allocated = skills.reduce((sum, skill) => sum + skill.level, 0);
  return Math.max(0, level - allocated);
}

export function msUntilNextMonth(date = new Date()): number {
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return Math.max(0, end.getTime() - date.getTime());
}

export function formatCountdown(ms: number): { days: number; hours: number; minutes: number } {
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

/** Multiplies a reward by the character's skill bonuses for this task (category, group, co-op). */
export function applySkillBonuses(
  baseXp: number,
  baseGold: number,
  task: Pick<Task, 'category' | 'group'>,
  completer: Completer,
  character: Character,
  skillPool: SkillDefinition[],
): { xp: number; gold: number } {
  let xpMult = 1;
  let goldMult = 1;

  for (const owned of character.skills) {
    const def = skillPool.find((skill) => skill.id === owned.skillId);
    if (!def) continue;
    const bonus = def.effect.perLevel * owned.level;
    const inGroup = task.group === def.effect.group;
    switch (def.effect.kind) {
      case 'xp_all':
        xpMult += bonus;
        break;
      case 'gold_all':
      case 'gold_mult':
        goldMult += bonus;
        break;
      case 'task_category_xp':
        if (task.category === def.effect.category) xpMult += bonus;
        break;
      case 'task_category_gold':
        if (task.category === def.effect.category) goldMult += bonus;
        break;
      case 'both_bonus':
        if (completer === 'both') {
          xpMult += bonus;
          goldMult += bonus;
        }
        break;
      case 'group_xp':
        if (inGroup) xpMult += bonus;
        break;
      case 'group_gold':
        if (inGroup) goldMult += bonus;
        break;
      case 'group_both':
        if (inGroup) {
          xpMult += bonus;
          goldMult += bonus;
        }
        break;
      default:
        break;
    }
  }

  return { xp: baseXp * xpMult, gold: baseGold * goldMult };
}

export function monthLabel(month: string, locale: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  return new Date(year, (monthNum ?? 1) - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// ---------------------------------------------------------------------------
// Local calendar dates (`YYYY-MM-DD`) and chronicles
// ---------------------------------------------------------------------------

/** Local midnight of a `YYYY-MM-DD` key. */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseDateKey(value).getTime());
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

/** Adds calendar months, clamping to the last day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(key: string, months: number): string {
  const date = parseDateKey(key);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, daysInMonth(date.getFullYear(), date.getMonth())));
  return localDateKey(date);
}

/** Epoch ms of local midnight right after the given day. */
export function endOfDayMs(key: string): number {
  return parseDateKey(addDays(key, 1)).getTime();
}

/** Days from `start` to `end`, both inclusive. */
export function dayCount(start: string, end: string): number {
  return Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86_400_000) + 1;
}

/** A chronicle starting on `startDate` with the default length of one month. */
export function defaultChronicle(id: number, startDate: string) {
  const endDate = addDays(addMonths(startDate, 1), -1);
  return { id, startDate, endDate, endsAtMs: endOfDayMs(endDate) };
}

export function formatDateRange(start: string, end: string, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${format.format(parseDateKey(start))} – ${format.format(parseDateKey(end))}`;
}

// ---------------------------------------------------------------------------
// Household join codes
// ---------------------------------------------------------------------------

// No 0/O or 1/I/L, so codes can be read aloud and typed without mix-ups.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const HOUSEHOLD_CODE_LENGTH = 6;

export function generateHouseholdCode(): string {
  const bytes = new Uint8Array(HOUSEHOLD_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export function normalizeHouseholdCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, HOUSEHOLD_CODE_LENGTH);
}

// ---------------------------------------------------------------------------
// Quest rewards: split, grant and revoke (used by complete, undo and re-assign)
// ---------------------------------------------------------------------------

export type RewardSplit = Record<CharacterId, { xp: number; gold: number }>;
export type QuestBase = Pick<Task, 'xp' | 'gold' | 'category' | 'group'>;

/**
 * Exactly what each character earns for a quest: base share (50/50 for "both"), plus skill bonuses on
 * that share, plus the character's own streak bonus gold (never split). `null` for non-recipients.
 */
export function computeRewardBreakdown(
  base: QuestBase,
  completer: Completer,
  characters: Record<CharacterId, Character>,
  skillPool: SkillDefinition[],
  streakDays: Partial<Record<CharacterId, number>> = {},
): Record<CharacterId, RewardBreakdown | null> {
  const share = completer === 'both' ? 0.5 : 1;
  const result: Record<CharacterId, RewardBreakdown | null> = { husband: null, wife: null };
  const recipients: CharacterId[] = completer === 'both' ? ['husband', 'wife'] : [completer];
  for (const id of recipients) {
    const baseXp = base.xp * share;
    const baseGold = base.gold * share;
    const withSkills = applySkillBonuses(baseXp, baseGold, base, completer, characters[id], skillPool);
    const days = streakDays[id] ?? 0;
    const streakGold = streakBonusGold(days);
    result[id] = {
      baseXp,
      baseGold,
      skillXp: withSkills.xp - baseXp,
      skillGold: withSkills.gold - baseGold,
      streakDays: days,
      streakGold,
      xp: withSkills.xp,
      gold: withSkills.gold + streakGold,
    };
  }
  return result;
}

/** Totals per character from a breakdown (0 for non-recipients). */
export function splitFromBreakdown(breakdown: Record<CharacterId, RewardBreakdown | null>): RewardSplit {
  return {
    husband: { xp: breakdown.husband?.xp ?? 0, gold: breakdown.husband?.gold ?? 0 },
    wife: { xp: breakdown.wife?.xp ?? 0, gold: breakdown.wife?.gold ?? 0 },
  };
}

/** XP/gold each character earns for a quest (without streaks); see computeRewardBreakdown for details. */
export function computeRewardSplit(
  base: QuestBase,
  completer: Completer,
  characters: Record<CharacterId, Character>,
  skillPool: SkillDefinition[],
): RewardSplit {
  return splitFromBreakdown(computeRewardBreakdown(base, completer, characters, skillPool));
}

export interface LevelUp {
  characterId: CharacterId;
  from: number;
  to: number;
  bonusGold: number;
}

/** Adds rewards, including level-up bonus gold. */
export function grantRewards(
  characters: Record<CharacterId, Character>,
  split: RewardSplit,
): { characters: Record<CharacterId, Character>; levelUps: LevelUp[] } {
  const next = { ...characters };
  const levelUps: LevelUp[] = [];
  (['husband', 'wife'] as CharacterId[]).forEach((id) => {
    const gained = split[id];
    if (gained.xp <= 0 && gained.gold <= 0) return;
    const prev = next[id];
    const from = getLevelFromXp(prev.xp);
    const xp = prev.xp + gained.xp;
    const to = getLevelFromXp(xp);
    const bonusGold = goldForLevelRange(from, to);
    if (to > from) levelUps.push({ characterId: id, from, to, bonusGold });
    next[id] = { ...prev, xp, gold: prev.gold + gained.gold + bonusGold };
  });
  return { characters: next, levelUps };
}

/**
 * Takes back a log's rewards, including bonus gold of any levels it granted. Fails if the lost
 * levels' skill points were already spent, since un-spending skills isn't supported.
 */
export function revokeRewards(
  characters: Record<CharacterId, Character>,
  xpAwarded: Record<CharacterId, number>,
  goldAwarded: Record<CharacterId, number>,
): { ok: true; characters: Record<CharacterId, Character> } | { ok: false; characterId: CharacterId } {
  const next = { ...characters };
  for (const id of ['husband', 'wife'] as CharacterId[]) {
    const prev = next[id];
    const xp = Math.max(0, prev.xp - (xpAwarded[id] ?? 0));
    const fromLevel = getLevelFromXp(prev.xp);
    const toLevel = getLevelFromXp(xp);
    const allocated = prev.skills.reduce((sum, skill) => sum + skill.level, 0);
    if (allocated > toLevel) return { ok: false, characterId: id };
    const lostBonus = goldForLevelRange(toLevel, fromLevel);
    next[id] = { ...prev, xp, gold: Math.max(0, prev.gold - (goldAwarded[id] ?? 0) - lostBonus) };
  }
  return { ok: true, characters: next };
}
