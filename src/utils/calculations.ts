import { HIGH_TIER_LEVEL_GOLD, MAX_LEVEL, STANDARD_LEVEL_GOLD, XP_CURVE } from '../constants/gameRules';
import type { Character, CharacterId, CharacterSkill, Completer, SkillDefinition, Task } from '../types';

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

export function applySkillBonuses(
  baseXp: number,
  baseGold: number,
  task: Task,
  completer: Completer,
  character: Character,
  skillPool: SkillDefinition[],
  hour = new Date().getHours(),
): { xp: number; gold: number } {
  let xpMult = 1;
  let goldMult = 1;

  for (const owned of character.skills) {
    const def = skillPool.find((skill) => skill.id === owned.skillId);
    if (!def) continue;
    const bonus = def.effect.perLevel * owned.level;
    switch (def.effect.kind) {
      case 'xp_all':
        xpMult += bonus;
        break;
      case 'gold_all':
        goldMult += bonus;
        break;
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
      case 'morning_bonus':
        if (hour < 12) {
          xpMult += bonus;
          goldMult += bonus;
        }
        break;
      case 'evening_bonus':
        if (hour >= 20) {
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
