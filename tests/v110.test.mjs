import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };

check('late reward: 0 XP, half of base + skill gold rounded down, no streak bonus', () => {
  const s = m.createInitialState('2026-10-01');
  s.characters.wife.skills = [{ skillId: 'master-chef', level: 1 }]; // +10% gold on cooking
  const task = s.tasks.find((t) => t.id === 'cooking'); // 40 XP / 45 G
  const full = m.computeRewardBreakdown(task, 'wife', s.characters, m.SKILL_POOL, { wife: 6 });
  assert.ok(full.wife.streakGold > 0);
  const late = m.lateRewardBreakdown(full).wife;
  assert.equal(late.xp, 0);
  assert.equal(late.streakGold, 0);
  assert.equal(late.gold, Math.floor((45 + 4.5) / 2)); // 24
  assert.equal(late.baseGold + late.skillGold, late.gold, 'parts add up');
  assert.equal(late.streakDays, 6, 'streak day is still recorded');
});

check('late "both": each share halved and floored', () => {
  const s = m.createInitialState('2026-10-01');
  const task = s.tasks.find((t) => t.id === 'trash'); // 5 XP / 10 G -> 5 G each
  const late = m.lateRewardBreakdown(m.computeRewardBreakdown(task, 'both', s.characters, m.SKILL_POOL));
  assert.deepEqual([late.husband.gold, late.wife.gold, late.husband.xp], [2, 2, 0]);
});

const log = (date, by, gold, late) => ({
  id: `${date}-${by}-${gold}`, taskId: 'trash', date, completedBy: by,
  xpAwarded: { husband: 0, wife: 0 }, goldAwarded: { husband: by === 'husband' ? gold : 0, wife: by === 'wife' ? gold : 0 },
  timestamp: 1, ...(late ? { late: true } : {}),
});

check('late gold never changes the day\'s MVP', () => {
  const logs = [log('2026-10-01', 'husband', 10), log('2026-10-01', 'wife', 30, true)];
  assert.equal(m.dayMvp(logs, '2026-10-01'), 'husband');
  assert.deepEqual(m.questGoldOn(logs, '2026-10-01'), { husband: 10, wife: 0 });
});

check('a late log keeps the streak going', () => {
  const logs = [
    { ...log('2026-10-01', 'wife', 5), id: 'a' },
    { ...log('2026-10-02', 'wife', 2, true), id: 'b' },
  ];
  const index = m.buildStreakIndex(logs);
  assert.equal(m.streakIfCompletedOn(index, 'trash', 'wife', '2026-10-03'), 3);
});

check('password rules', () => {
  assert.equal(m.passwordProblem(''), 'password.error.empty');
  assert.equal(m.passwordProblem('abc12'), 'password.error.short');
  assert.equal(m.passwordProblem('abcdefgh'), 'password.error.pattern');
  assert.equal(m.passwordProblem('12345678'), 'password.error.pattern');
  assert.equal(m.passwordProblem('mậtkhẩu12'), null, 'Vietnamese letters count');
  assert.equal(m.newPasswordProblem('abcd1234', 'abcd1235'), 'password.error.mismatch');
  assert.equal(m.newPasswordProblem('abcd1234', 'abcd1234'), null);
});

console.log(`\n${passed} checks passed`);
