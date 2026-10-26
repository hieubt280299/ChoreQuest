import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const skill = (id) => m.SKILL_POOL.find((s) => s.id === id).effect;
const withChar = (state, id, extra) => ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], ...extra } } });

// --- Rebalance ------------------------------------------------------------
check('default quests: dishwashing 28/30, cooking 40/42, vacuum 42/42', () => {
  const by = (id) => m.DEFAULT_TASKS.find((t) => t.id === id);
  for (const id of ['dishesLunch', 'dishesDinner']) assert.deepEqual([by(id).xp, by(id).gold], [28, 30], id);
  for (const id of ['cookLunch', 'cooking', 'cookPetFood']) assert.deepEqual([by(id).xp, by(id).gold, by(id).group], [40, 42, 'main'], id);
  assert.deepEqual([by('vacuum').xp, by('vacuum').gold, by('vacuum').group], [42, 42, 'heavy']);
});

check('saved quests on v1.0 values move to v1.5; edited ones are kept', () => {
  assert.deepEqual(m.rebalanceTask({ id: 'dishesLunch', xp: 25, gold: 30, group: 'main' }), { id: 'dishesLunch', xp: 28, gold: 30, group: 'main' });
  assert.deepEqual(m.rebalanceTask({ id: 'cookPetFood', xp: 40, gold: 45, group: 'main' }), { id: 'cookPetFood', xp: 40, gold: 42, group: 'main' });
  assert.deepEqual(m.rebalanceTask({ id: 'vacuum', xp: 42, gold: 50, group: 'heavy' }), { id: 'vacuum', xp: 42, gold: 42, group: 'heavy' });
  const edited = { id: 'cooking', xp: 50, gold: 45, group: 'main' };
  assert.equal(m.rebalanceTask(edited), edited);
  const parsed = m.parseGameState({ ...m.createInitialState(today), tasks: [{ ...m.DEFAULT_TASKS.find((t) => t.id === 'cooking'), gold: 45 }] }, today);
  assert.equal(parsed.tasks[0].gold, 42, 'migrated on load');
});

check('skills: Master Chef / Laundry Pro +4..16% XP, Golden Touch 6..24% gold, Gold Interest 2/3/4/5%', () => {
  assert.deepEqual(skill('master-chef').xp, [0.04, 0.08, 0.12, 0.16]);
  assert.deepEqual(skill('master-chef').gold, [0.1, 0.18, 0.26, 0.34], 'gold unchanged');
  assert.deepEqual(skill('iron-will').xp, [0.04, 0.08, 0.12, 0.16]);
  assert.deepEqual(skill('iron-will').gold, [0.1, 0.2, 0.3, 0.4], 'gold unchanged');
  assert.deepEqual(skill('gold-doubler').gold, [0.06, 0.12, 0.18, 0.24]);
  assert.deepEqual(skill('gold-interest').values, [0.02, 0.03, 0.04, 0.05]);
  assert.equal(m.DAILY_INTEREST_CAP, 100);
});

// --- Intensity --------------------------------------------------------------
check('intensity only applies to Moderate quests with it turned on', () => {
  assert.equal(m.intensityApplies({ group: 'main', intensityEnabled: true }), true);
  assert.equal(m.intensityApplies({ group: 'main' }), false, 'off by default');
  assert.equal(m.intensityApplies({ group: 'heavy', intensityEnabled: true }), false);
  assert.equal(m.intensityApplies({ group: 'quick', intensityEnabled: true }), false);
});

check('Light 0.5x / Normal 1x / Heavy 1.5x base, rounded down', () => {
  const cooking = { xp: 40, gold: 42, group: 'main', intensityEnabled: true };
  assert.deepEqual([m.intensityBase(cooking, 'light').xp, m.intensityBase(cooking, 'light').gold], [20, 21]);
  assert.equal(m.intensityBase(cooking, 'normal'), cooking);
  assert.deepEqual([m.intensityBase(cooking, 'heavy').xp, m.intensityBase(cooking, 'heavy').gold], [60, 63]);
  const odd = { xp: 15, gold: 25, group: 'main', intensityEnabled: true };
  assert.deepEqual([m.intensityBase(odd, 'light').xp, m.intensityBase(odd, 'light').gold], [7, 12]);
  assert.deepEqual([m.intensityBase(odd, 'heavy').xp, m.intensityBase(odd, 'heavy').gold], [22, 37]);
  const off = { xp: 40, gold: 42, group: 'main' };
  assert.equal(m.intensityBase(off, 'heavy'), off, 'ignored when off');
});

check('skill bonuses build on the scaled base', () => {
  const s = withChar(m.createInitialState(today), 'wife', { skills: [{ skillId: 'master-chef', level: 4 }] });
  const cooking = { xp: 40, gold: 42, category: 'cooking', group: 'main', intensityEnabled: true };
  const heavy = m.computeRewardBreakdown(m.intensityBase(cooking, 'heavy'), 'wife', s.characters, m.SKILL_POOL);
  close(heavy.wife.baseXp, 60);
  close(heavy.wife.xp, 60 * 1.16);
  close(heavy.wife.gold, 63 * 1.34);
  const both = m.computeRewardBreakdown(m.intensityBase(cooking, 'light'), 'both', s.characters, m.SKILL_POOL);
  close(both.wife.baseGold, 21 / 2);
  close(both.husband.gold, 21 / 2, 'no skills');
});

// --- Chronicle rewards ------------------------------------------------------
const finished = (husband, wife, extra = {}) => {
  let s = m.createInitialState(day(-40));
  s = { ...s, chronicle: { ...s.chronicle, id: 3, startDate: today, endDate: day(30) } };
  const result = { chronicleId: 2, startDate: day(-30), endDate: day(-1), prizePool: 1000000, goldSnapshot: { husband, wife }, payout: m.calculatePayout(1000000, husband, wife), ...extra };
  return { ...s, prizeHistory: [result] };
};

check('chronicle rewards: both players unlock an avatar, the winner also a theme', () => {
  const s = finished(300, 100);
  assert.deepEqual(m.rewardOffer(s, 'husband'), { chronicleId: 2, winner: true, avatar: true, theme: true });
  assert.deepEqual(m.rewardOffer(s, 'wife'), { chronicleId: 2, winner: false, avatar: true, theme: false });
  const tie = finished(200, 200);
  assert.equal(m.rewardOffer(tie, 'husband').theme, true);
  assert.equal(m.rewardOffer(tie, 'wife').theme, true, 'ties: both are winners');
  assert.equal(m.rewardOffer(finished(0, 0), 'husband'), null, 'nothing for an empty chronicle');
});

check('each reward kind is claimed once; nothing left to unlock means no offer', () => {
  let s = finished(300, 100);
  s = { ...s, cosmetics: { ...s.cosmetics, rewards: [{ chronicleId: 2, characterId: 'husband', kind: 'avatar', item: m.AVATARS.husband[1] }] } };
  assert.deepEqual(m.rewardOffer(s, 'husband'), { chronicleId: 2, winner: true, avatar: false, theme: true });
  s = { ...s, cosmetics: { ...s.cosmetics, rewards: [...s.cosmetics.rewards, { chronicleId: 2, characterId: 'husband', kind: 'theme', item: 'forest' }] } };
  assert.equal(m.rewardOffer(s, 'husband'), null);
  // Every theme already unlocked: the winner still gets the avatar.
  const all = finished(300, 100);
  const themes = { ...all, cosmetics: { ...all.cosmetics, themes: m.THEMES.filter((t) => t !== m.DEFAULT_THEME) } };
  assert.deepEqual(m.rewardOffer(themes, 'husband'), { chronicleId: 2, winner: true, avatar: true, theme: false });
  // Only while the next chronicle runs.
  assert.equal(m.rewardOffer({ ...all, chronicle: { ...all.chronicle, id: 4 } }, 'husband'), null);
});

// --- Chronicle summary ------------------------------------------------------
check('summary: winner, gold, MVP days and prize split by gold share', () => {
  const s = finished(300, 100, { stats: { players: { husband: { quests: 20, bestStreak: 4, mvpDays: 18 }, wife: { quests: 9, bestStreak: 2, mvpDays: 12 } }, awards: [] } });
  const summary = m.chronicleSummary(s.prizeHistory[0], []);
  assert.equal(summary.winner, 'husband');
  assert.deepEqual(summary.players.husband, { gold: 300, mvpDays: 18, payout: 750000, share: 0.75 });
  assert.deepEqual(summary.players.wife, { gold: 100, mvpDays: 12, payout: 250000, share: 0.25 });
  assert.equal(m.chronicleSummary(finished(200, 200).prizeHistory[0], []).winner, null, 'tie');
});

check('summary is due any day of the new chronicle, from Chronicle 2 on', () => {
  const s = finished(300, 100);
  assert.equal(m.chronicleSummaryDue(s).chronicleId, 2);
  const later = { ...s, chronicle: { ...s.chronicle, startDate: day(-12) } };
  assert.equal(m.chronicleSummaryDue(later).chronicleId, 2, 'still due on Day 13');
  assert.equal(m.chronicleSummaryDue({ ...s, chronicle: { ...s.chronicle, id: 4 } }), null, 'not for an older chronicle');
  assert.equal(m.chronicleSummaryDue(m.createInitialState(today)), null, 'not for Chronicle 1');
});

// --- Patch notes ------------------------------------------------------------
check("What's New: current version matches package.json; every note in both languages", () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(m.APP_VERSION, pkg.version);
  for (const release of m.PATCH_NOTES) {
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    for (const [section, notes] of Object.entries(release.notes)) {
      assert.ok(m.PATCH_SECTIONS.includes(section), section);
      assert.equal(notes.en.length, notes.vi.length, `${release.version} ${section}: EN and VI match`);
      assert.ok(notes.en.length > 0);
    }
  }
});

console.log(`\n${passed} checks passed`);
