import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => {
  fn();
  passed += 1;
  console.log('ok -', label);
};
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const withSkills = (state, id, skills, extra = {}) => ({
  ...state,
  characters: { ...state.characters, [id]: { ...state.characters[id], skills, ...extra } },
});

check('caps: 8 skill slots, 24 points, 14 skills', () => {
  assert.equal(m.MAX_SKILLS_PER_CHARACTER, 8);
  assert.equal(m.MAX_SKILL_POINTS, 24);
  assert.equal(m.SKILL_POOL.length, 14);
});

check('Speed Cleaner lv3 + Fast Learner lv2 (v1.2.0 values) at character level 1', () => {
  const s = withSkills(m.createInitialState(today), 'husband', [{ skillId: 'speed-cleaner', level: 3 }, { skillId: 'zen-housekeeper', level: 2 }]);
  const r = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'cleaning', group: 'main' }, 'husband', s.characters, m.SKILL_POOL);
  // XP: +20% cleaning, +60% +1% (character level 1) all; gold: +20% cleaning only
  close(r.husband.xp, 181);
  close(r.husband.gold, 120);
});

check('Master Chef 10/18/26/34, Heavy Lifter 15/25/35/45, Quick Hands 5..20 gold, Team Player 12..48 XP / 10..40 gold', () => {
  const chef = m.SKILL_POOL.find((s) => s.id === 'master-chef').effect.gold;
  assert.deepEqual(chef, [0.1, 0.18, 0.26, 0.34]);
  assert.deepEqual(m.SKILL_POOL.find((s) => s.id === 'raid-master').effect.gold, [0.15, 0.25, 0.35, 0.45]);
  const quick = m.SKILL_POOL.find((s) => s.id === 'quick-hands').effect;
  assert.deepEqual(quick.gold, [0.05, 0.1, 0.15, 0.2]);
  assert.deepEqual(quick.xp, [0.1, 0.2, 0.3, 0.4]);
  const team = m.SKILL_POOL.find((s) => s.id === 'team-player').effect;
  assert.deepEqual(team.xp, [0.12, 0.24, 0.36, 0.48]);
  assert.deepEqual(team.gold, [0.1, 0.2, 0.3, 0.4]);
});

check('Synergistic Streak only when the spouse has a 3+ day streak on that quest', () => {
  const s = withSkills(m.createInitialState(today), 'wife', [{ skillId: 'synergistic-streak', level: 2 }]);
  const base = { xp: 100, gold: 100, category: 'general', group: 'quick' };
  const off = m.computeRewardBreakdown(base, 'wife', s.characters, m.SKILL_POOL, {}, { wife: 2 });
  close(off.wife.gold, 100);
  const on = m.computeRewardBreakdown(base, 'wife', s.characters, m.SKILL_POOL, {}, { wife: 3 });
  close(on.wife.gold, 130);
  close(on.wife.xp, 115);
});

check('quest rebalance: v0.2 built-ins migrate, edited quests are kept', () => {
  assert.deepEqual(
    [m.rebalanceTask({ id: 'cooking', xp: 45, gold: 55, group: 'main' })].map((t) => [t.xp, t.gold, t.group])[0],
    [40, 42, 'main'], // through the v1.0 and v1.5 rebalances
  );
  assert.deepEqual(m.rebalanceTask({ id: 'trash', xp: 5, gold: 5, group: 'quick' }).gold, 10);
  const edited = { id: 'cooking', xp: 60, gold: 55, group: 'main' };
  assert.equal(m.rebalanceTask(edited), edited);
  assert.equal(m.groupForXp(10), 'quick');
  assert.equal(m.groupForXp(25), 'main');
  assert.equal(m.groupForXp(40), 'main');
  assert.equal(m.groupForXp(41), 'heavy');
});

const log = (date, by, gold) => ({
  id: `${date}-${by}-${gold}`, taskId: 'trash', date, completedBy: by,
  xpAwarded: { husband: by === 'husband' ? gold : 0, wife: by === 'wife' ? gold : 0 },
  goldAwarded: { husband: by === 'husband' ? gold : 0, wife: by === 'wife' ? gold : 0 }, timestamp: 1,
});

check('Hall of Fame: each finished day settles once; every 5th MVP pays tickets', () => {
  let s = m.createInitialState(day(-10));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-10), endDate: day(20) }, mvpSettledOn: day(-8) };
  s = withSkills(s, 'husband', [{ skillId: 'hall-of-fame', level: 3 }]);
  // Husband is MVP on 6 days (-7..-2), wife on -1, tie today (unfinished anyway).
  const logs = [];
  for (let d = -7; d <= -2; d += 1) logs.push(log(day(d), 'husband', 10));
  logs.push(log(day(-1), 'wife', 10));
  s = { ...s, logs };
  const next = m.advanceDays(s, today);
  assert.equal(next.characters.husband.mvpDays, 6);
  assert.equal(next.characters.wife.mvpDays, 1);
  assert.equal(next.characters.husband.goldenTickets, 3, '5th MVP pays lv3 = 3 Golden Tickets');
  assert.equal(next.characters.husband.tickets, 0);
  assert.equal(next.mvpSettledOn, day(-1));
  assert.equal(m.advanceDays(next, today), next, 'idempotent');
});

check('Hall of Fame is not retroactive: no marker means counting starts now', () => {
  let s = m.createInitialState(day(-10));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-10), endDate: day(20) } };
  delete s.mvpSettledOn;
  s = withSkills(s, 'husband', [{ skillId: 'hall-of-fame', level: 1 }]);
  s = { ...s, logs: [log(day(-3), 'husband', 5), log(day(-2), 'husband', 5)] };
  const next = m.advanceDays(s, today);
  assert.equal(next.characters.husband.mvpDays, 0);
  assert.equal(next.mvpSettledOn, day(-1));
});

check('rollover resets MVP days and counts the new chronicle', () => {
  let s = m.createInitialState(day(-40));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-40), endDate: day(-3) }, mvpSettledOn: day(-5) };
  s = { ...s, logs: [log(day(-4), 'wife', 10), log(day(-2), 'husband', 10)] };
  const next = m.advanceDays(s, today);
  assert.equal(next.chronicle.startDate, day(-2));
  assert.equal(next.characters.wife.mvpDays, 0, 'old chronicle MVPs reset');
  assert.equal(next.characters.husband.mvpDays, 1, 'new chronicle day counted');
});

check('cosmetics parse: unknown items dropped, active avatar must be owned', () => {
  const raw = m.toHouseholdSections({
    ...m.createInitialState(today),
    cosmetics: {
      themes: ['forest', 'nope'],
      avatars: { husband: ['spellsmith', 'mage'], wife: [] },
      activeAvatar: { husband: 'spellsmith', wife: 'dancer' },
      rewards: [{ chronicleId: 1, characterId: 'husband', kind: 'avatar', item: 'spellsmith' }],
    },
  });
  const back = m.fromHouseholdDoc(JSON.parse(JSON.stringify(raw)), today, false);
  assert.deepEqual(back.cosmetics.themes, ['forest']);
  assert.deepEqual(back.cosmetics.avatars, { husband: ['spellsmith'], wife: [] });
  assert.deepEqual(back.cosmetics.activeAvatar, { husband: 'spellsmith', wife: 'mage' });
  assert.equal(back.cosmetics.rewards.length, 1);
});

console.log(`\n${passed} checks passed`);
