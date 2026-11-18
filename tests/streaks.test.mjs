// Node checks for streaks, reward breakdowns, group skills, migrations and the new song.
import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

const { SKILL_POOL } = m;
let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log('ok -', name);
};
const log = (taskId, date, completedBy, extra = {}) => ({
  id: `${taskId}-${date}`, taskId, date, completedBy,
  xpAwarded: { husband: 0, wife: 0 }, goldAwarded: { husband: 0, wife: 0 }, timestamp: 0, ...extra,
});

test('streak bonus: nothing before day 3, grows to day 10, then stays (values: v190)', () => {
  const gold = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 30].map(m.streakBonusGold);
  assert.deepEqual(gold.slice(0, 2), [0, 0]);
  assert.ok(gold[2] > 0);
  for (let i = 3; i < 10; i += 1) assert.ok(gold[i] >= gold[i - 1], `day ${i + 1}`);
  assert.equal(gold[10], gold[9]);
  assert.equal(gold[11], gold[9]);
});

test('streak counts consecutive days per character; a missed day resets', () => {
  const logs = [
    log('dishes', '2026-10-01', 'husband'),
    log('dishes', '2026-10-02', 'both'),
    log('dishes', '2026-10-03', 'husband'),
    log('dishes', '2026-10-05', 'husband'), // gap on 10-04
  ];
  const idx = m.buildStreakIndex(logs);
  assert.equal(m.streakEndingOn(idx, 'dishes', 'husband', '2026-10-03'), 3);
  assert.equal(m.streakEndingOn(idx, 'dishes', 'wife', '2026-10-03'), 0, 'wife only did 10-02');
  assert.equal(m.streakEndingOn(idx, 'dishes', 'husband', '2026-10-05'), 1, 'reset after the gap');
  assert.equal(m.streakIfCompletedOn(idx, 'dishes', 'husband', '2026-10-04'), 4);
});

test('live streak: done today vs pending, and broken streaks show 0', () => {
  const logs = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d) => log('trash', d, 'wife'));
  const idx = m.buildStreakIndex(logs);
  // Done today: what today's completion paid; pending: what completing it today would pay (the 4th day).
  assert.deepEqual(m.currentStreak(idx, 'trash', 'wife', '2026-10-03'), { taskId: 'trash', characterId: 'wife', days: 3, doneToday: true, bonusGold: m.streakBonusGold(3) });
  assert.deepEqual(m.currentStreak(idx, 'trash', 'wife', '2026-10-04'), { taskId: 'trash', characterId: 'wife', days: 3, doneToday: false, bonusGold: m.streakBonusGold(4) });
  assert.equal(m.currentStreak(idx, 'trash', 'wife', '2026-10-05').days, 0, 'missed 10-04');
});

test('"both" keeps both streaks alive; excluded log is ignored (re-assign)', () => {
  const logs = [log('mop', '2026-10-01', 'both'), log('mop', '2026-10-02', 'both')];
  assert.equal(m.streakIfCompletedOn(m.buildStreakIndex(logs), 'mop', 'wife', '2026-10-03'), 3);
  assert.equal(m.streakIfCompletedOn(m.buildStreakIndex(logs, 'mop-2026-10-02'), 'mop', 'wife', '2026-10-03'), 1);
});

test('breakdown: streak gold is not split for "both"; skills apply to the share', () => {
  const s = m.createInitialState('2026-10-01');
  s.characters.husband.skills = [{ skillId: 'raid-master', level: 1 }]; // +20% gold, +10% XP on heavy
  const task = s.tasks.find((t) => t.id === 'mop'); // heavy
  const b = m.computeRewardBreakdown(task, 'both', s.characters, SKILL_POOL, { husband: 5, wife: 3 });
  const share = task.gold / 2;
  assert.equal(b.husband.baseGold, share);
  assert.ok(Math.abs(b.husband.skillGold - share * 0.2) < 1e-9);
  assert.equal(b.husband.streakGold, m.streakBonusGold(5), 'day 5, full amount');
  assert.equal(b.wife.streakGold, m.streakBonusGold(3));
  assert.ok(Math.abs(b.husband.gold - (share * 1.2 + m.streakBonusGold(5))) < 1e-9);
  assert.equal(b.wife.xp, task.xp / 2);
  const solo = m.computeRewardBreakdown(task, 'wife', s.characters, SKILL_POOL, { wife: 10 });
  assert.equal(solo.husband, null);
  assert.equal(solo.wife.gold, task.gold + m.streakBonusGold(10));
});

test('group skills only affect their group', () => {
  const s = m.createInitialState('2026-10-01');
  s.characters.wife.skills = [{ skillId: 'quick-hands', level: 2 }]; // XP and gold bonus on quick quests
  const bonus = SKILL_POOL.find((d) => d.id === 'quick-hands').effect.gold[1];
  const quick = s.tasks.find((t) => t.id === 'trash');
  const main = s.tasks.find((t) => t.id === 'sweep');
  assert.deepEqual(m.computeRewardSplit(quick, 'wife', s.characters, SKILL_POOL).wife, { xp: quick.xp * (1 + bonus), gold: quick.gold * (1 + bonus) });
  assert.deepEqual(m.computeRewardSplit(main, 'wife', s.characters, SKILL_POOL).wife, { xp: 15, gold: 20 });
});

test('old data: retired skills migrate, groups are inferred', () => {
  const raw = {
    characters: {
      husband: { id: 'husband', name: 'Husband', xp: 0, gold: 0, skills: [{ skillId: 'early-bird', level: 2 }, { skillId: 'lucky-charm', level: 1 }] },
      wife: { id: 'wife', name: 'Wife', xp: 0, gold: 0, skills: [{ skillId: 'night-owl', level: 3 }] },
    },
    tasks: [
      { id: 'vacuum', nameKey: 'task.vacuum', xp: 30, gold: 20, category: 'cleaning', enabled: true },
      { id: 'custom-1', nameKey: 'Walk dog', xp: 10, gold: 5, category: 'general', enabled: true },
      { id: 'custom-2', nameKey: 'Fix sink', xp: 10, gold: 5, category: 'cleaning', enabled: true },
    ],
    chronicle: { id: 1, startDate: '2026-10-01', endDate: '2026-10-31' }, logs: [], prizePool: 1, prizeHistory: [],
    skillsRefundedIn: '1.8.0',
  };
  const s = m.parseGameState(raw, '2026-10-02');
  assert.deepEqual(s.characters.husband.skills, [{ skillId: 'quick-hands', level: 2 }, { skillId: 'steady-worker', level: 1 }]);
  assert.deepEqual(s.characters.wife.skills, [{ skillId: 'raid-master', level: 3 }]);
  assert.deepEqual(s.tasks.map((t) => t.group), ['heavy', 'quick', 'main']);
  for (const skill of [...s.characters.husband.skills, ...s.characters.wife.skills]) {
    assert.ok(SKILL_POOL.some((def) => def.id === skill.skillId), skill.skillId);
  }
});

test('default quests: 21 across 3 groups, unique ids, 15 skills', () => {
  const tasks = m.createInitialState('2026-10-01').tasks;
  assert.equal(tasks.length, 21);
  assert.equal(new Set(tasks.map((t) => t.id)).size, 21);
  assert.deepEqual(['quick', 'main', 'heavy'].map((g) => tasks.filter((t) => t.group === g).length), [8, 9, 4]);
  assert.equal(SKILL_POOL.length, 15);
  assert.equal(SKILL_POOL.some((s) => /morning|evening/.test(s.effect.kind)), false);
});

test('song compiles: 16 bars of 8 steps with snare, hats, bass and lead', () => {
  const steps = m.compileSong();
  const count = (v) => steps.flat().filter((e) => e.voice === v).length;
  assert.equal(steps.length, 128);
  assert.equal(count('kick'), 0);
  assert.equal(count('snare'), 36);
  assert.equal(count('hat'), 96);
  assert.equal(count('bass'), 48);
  console.log(`   loop length ${(128 * 60 / 132 / 2).toFixed(1)}s, lead notes ${count('lead')}`);
});

test('history: per-player counts, both counts for each, partner comparison, chronicle window', () => {
  const L = (id, taskId, date, who, xp, gold) => ({ id, taskId, date, completedBy: who, xpAwarded: xp, goldAwarded: gold, timestamp: 0 });
  const logs = [
    L('1', 'dishes', '2026-10-01', 'husband', { husband: 40, wife: 0 }, { husband: 25, wife: 0 }),
    L('2', 'dishes', '2026-10-02', 'both', { husband: 20, wife: 20 }, { husband: 13, wife: 12 }),
    L('3', 'dishes', '2026-10-03', 'wife', { husband: 0, wife: 40 }, { husband: 0, wife: 25 }),
    L('4', 'trash', '2026-10-02', 'husband', { husband: 10, wife: 0 }, { husband: 5, wife: 0 }),
    L('5', 'trash', '2026-10-03', 'husband', { husband: 10, wife: 0 }, { husband: 5, wife: 0 }),
    L('6', 'trash', '2026-10-04', 'husband', { husband: 10, wife: 0 }, { husband: 5, wife: 0 }),
    L('7', 'mop', '2026-09-30', 'husband', { husband: 90, wife: 0 }, { husband: 55, wife: 0 }), // before the chronicle
  ];
  const h = m.questHistory(logs, 'husband', '2026-10-01', '2026-10-04');
  assert.deepEqual(h.map((e) => [e.taskId, e.mine.count]), [['trash', 3], ['dishes', 2]]);
  const dishes = h.find((e) => e.taskId === 'dishes');
  assert.deepEqual(dishes.mine, { count: 2, xp: 60, gold: 38, lastDate: '2026-10-02' });
  assert.deepEqual(dishes.partner, { count: 2, xp: 60, gold: 37, lastDate: '2026-10-03' });
  assert.deepEqual(m.totalTally(h), { count: 5, xp: 90, gold: 53 });
  assert.deepEqual(m.questHistory(logs, 'wife', '2026-10-01', '2026-10-04').map((e) => e.taskId), ['dishes']);
});

test('level-up gold: standard, high tier, mastery at 30; grant pays it', () => {
  assert.deepEqual([2, 24, 25, 29, 30, 31].map(m.getLevelUpGold), [50, 50, 300, 300, 2000, 0]);
  const s = m.createInitialState('2026-10-01');
  const xpFor = (level) => { let xp = 0; for (let l = 1; l < level; l++) xp += [230, 370, 480, 580, 600, 720, 750, 780, 810, 840, 870, 1000, 1000, 1000, 1000, 1000, 1000, 1500, 1590, 1600, 1850, 2100, 2350, 2600, 3500, 4500, 5500, 6500, 7500][l - 1]; return xp; };
  s.characters.wife.xp = xpFor(30) - 10;
  assert.equal(m.getLevelFromXp(s.characters.wife.xp), 29);
  const { characters, levelUps } = m.grantRewards(s.characters, { husband: { xp: 0, gold: 0 }, wife: { xp: 20, gold: 5 } });
  assert.deepEqual(levelUps, [{ characterId: 'wife', from: 29, to: 30, bonusGold: 2000, goldenTickets: 1, tickets: 0, skillPoints: 0 }]);
  assert.equal(characters.wife.gold, 2005);
});

test('new legend: reset levels and skills, keep gold/chronicle/quests/history; persists', () => {
  const s = m.createInitialState('2026-10-01');
  s.characters.husband = { ...s.characters.husband, xp: 99999, gold: 1234, skills: [{ skillId: 'zen-housekeeper', level: 4 }] };
  s.characters.wife = { ...s.characters.wife, xp: 500, gold: 77, skills: [{ skillId: 'raid-master', level: 1 }] };
  s.logs = [{ id: 'x', taskId: 'mop', date: '2026-10-01', completedBy: 'husband', xpAwarded: { husband: 45, wife: 0 }, goldAwarded: { husband: 55, wife: 0 }, timestamp: 1 }];
  const r = m.resetLevelsAndSkills(s, 1000);
  assert.deepEqual([r.characters.husband.xp, r.characters.wife.xp], [0, 0]);
  assert.deepEqual([r.characters.husband.skills, r.characters.wife.skills], [[], []]);
  assert.deepEqual([r.characters.husband.gold, r.characters.wife.gold], [1234, 77]);
  assert.equal(r.chronicle, s.chronicle);
  assert.equal(r.tasks, s.tasks);
  assert.equal(r.logs, s.logs);
  assert.equal(r.levelResetAt, 1000);
  const back = m.fromHouseholdDoc({ code: 'X', ...m.toHouseholdSections(r) }, '2026-10-02');
  assert.equal(back.levelResetAt, 1000);
  assert.equal('levelResetAt' in m.toHouseholdSections(s).game, false, 'not written until a reset happens');
});

test('default quest values come from DEFAULT_TASKS (values: v190)', () => {
  const by = (id) => m.createInitialState('2026-10-01').tasks.find((t) => t.id === id);
  for (const task of m.DEFAULT_TASKS) assert.deepEqual([by(task.id).xp, by(task.id).gold], [task.xp, task.gold], task.id);
});

console.log(`\n${passed} passed`);
