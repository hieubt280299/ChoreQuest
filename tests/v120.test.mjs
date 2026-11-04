import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const today = m.localDateKey();
const skill = (id) => m.SKILL_POOL.find((s) => s.id === id).effect;
const withSkills = (state, id, skills, extra = {}) => ({
  ...state, characters: { ...state.characters, [id]: { ...state.characters[id], skills, ...extra } },
});
// Total XP that puts a character at `level`.
const xpForLevel = (level) => m.XP_CURVE.slice(0, level - 1).reduce((sum, value) => sum + value, 0);

check('skill tables (v1.8.0)', () => {
  assert.deepEqual(skill('speed-cleaner').xp, [0.08, 0.16, 0.24, 0.32]);
  assert.deepEqual(skill('speed-cleaner').gold, [0.08, 0.16, 0.24, 0.32]);
  assert.deepEqual(skill('shop-savvy').xp, [0.15, 0.3, 0.45, 0.6]);
  assert.deepEqual(skill('shop-savvy').gold, [0.15, 0.3, 0.45, 0.6]);
  assert.deepEqual(skill('zen-housekeeper').xp, [0.3, 0.45, 0.6, 0.75]);
  assert.equal(skill('zen-housekeeper').gold, undefined, 'Fast Learner is XP only');
  assert.equal(skill('zen-housekeeper').xpPerCharacterLevel, 0.01);
  assert.deepEqual(skill('fortunes-favor').values, [1, 2, 3, 4]); // v1.4.0
  assert.deepEqual(skill('fortunes-favor').gold, [0.2, 0.4, 0.6, 0.8]);
  assert.deepEqual(skill('hall-of-fame').values, [1, 2, 3, 4]); // v1.4.0: Golden Tickets
});

check('Fast Learner: character lv5 + skill lv2 = 50% more XP, no gold', () => {
  const s = withSkills(m.createInitialState(today), 'wife', [{ skillId: 'zen-housekeeper', level: 2 }], { xp: xpForLevel(5) });
  assert.equal(m.getLevelFromXp(s.characters.wife.xp), 5);
  const r = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'quick' }, 'wife', s.characters, m.SKILL_POOL);
  close(r.wife.xp, 150);
  close(r.wife.gold, 100);
});

check("Fortune's Favor gold isn't applied to quests", () => {
  const s = withSkills(m.createInitialState(today), 'wife', [{ skillId: 'fortunes-favor', level: 4 }]);
  const r = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'quick' }, 'wife', s.characters, m.SKILL_POOL);
  close(r.wife.gold, 100);
});

check("Fortune's Favor: +20/40/60/80% wheel gold, jackpot included", () => {
  const wheel = { jackpotBonus: 10 };
  const prize = m.WHEEL_PRIZES.find((entry) => entry.prize !== 'none' && entry.prize !== 'jackpot');
  assert.equal(m.wheelGoldFor(prize.prize, wheel, { skills: [] }), prize.gold);
  [1.2, 1.4, 1.6, 1.8].forEach((factor, index) => {
    const character = { skills: [{ skillId: 'fortunes-favor', level: index + 1 }] };
    assert.equal(m.wheelGoldFor(prize.prize, wheel, character), Math.round(prize.gold * factor));
    assert.equal(m.wheelGoldFor('jackpot', wheel, character), Math.round((m.JACKPOT_BASE_GOLD + 10) * factor));
    assert.equal(m.wheelGoldFor('none', wheel, character), 0);
  });
});

check('reset quests keeps custom quests unless asked to remove them', () => {
  const defaults = m.DEFAULT_TASKS;
  const edited = { ...defaults[0], xp: 999, gold: 999, enabled: false };
  const custom = { ...defaults[1], id: 'custom-1', names: { en: 'Walk the dog', vi: 'Dắt chó' } };
  const tasks = [edited, ...defaults.slice(1), custom];
  const kept = m.resetQuestList(tasks);
  assert.equal(kept.length, defaults.length + 1);
  assert.deepEqual(kept[0], defaults[0], 'built-in quest back to its defaults');
  assert.deepEqual(kept[kept.length - 1], custom, 'custom quest kept');
  const full = m.resetQuestList(tasks, true);
  assert.deepEqual(full, defaults);
  assert.notEqual(full[0].names, defaults[0].names, 'defaults are copied');
});

console.log(`\n${passed} checks passed`);
