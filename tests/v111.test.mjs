import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
let n = 0;
const log = (date, by, gold, taskId = 'trash') => ({
  id: `l${n++}`, taskId, date, completedBy: by, xpAwarded: { husband: 0, wife: 0 },
  goldAwarded: { husband: by === 'wife' ? 0 : gold, wife: by === 'husband' ? 0 : gold }, timestamp: 1,
});

check('rollover saves the archive snapshot', () => {
  let s = m.createInitialState(day(-40));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-40), endDate: day(-2) }, mvpSettledOn: day(-3) };
  s = { ...s, logs: [log(day(-10), 'husband', 10), log(day(-9), 'husband', 10), log(day(-8), 'husband', 10), log(day(-5), 'wife', 5, 'beds')] };
  const next = m.advanceDays(s, today);
  const stats = next.prizeHistory[0].stats;
  assert.ok(stats, 'snapshot saved');
  assert.deepEqual(stats.players.husband, { quests: 3, bestStreak: 3, mvpDays: 3 });
  assert.deepEqual(stats.players.wife, { quests: 1, bestStreak: 1, mvpDays: 1 });
  assert.ok(stats.awards.some((a) => a.kind === 'streak' && a.characterId === 'husband' && a.days === 3));
});

check('archive stats survive the quest log being pruned', () => {
  const result = { chronicleId: 1, startDate: day(-300), endDate: day(-270), prizePool: 100, payout: { husband: 60, wife: 40 },
    goldSnapshot: { husband: 60, wife: 40 },
    stats: { players: { husband: { quests: 20, bestStreak: 5, mvpDays: 12 }, wife: { quests: 9, bestStreak: 2, mvpDays: 6 } }, awards: [{ kind: 'mvp', characterId: 'husband', days: 12 }] } };
  const stats = m.chronicleStats(result, []);
  assert.equal(stats.hasLog, true);
  assert.equal(stats.players.husband.quests, 20);
  assert.equal(stats.players.husband.mvpDays, 12);
  assert.equal(stats.awards.length, 1);
  assert.equal(Math.round(stats.players.husband.avgGold * 31), 60);
});

check('older chronicles get backfilled only while their whole log is kept', () => {
  const recent = { chronicleId: 2, startDate: day(-60), endDate: day(-31), prizePool: 100, payout: { husband: 50, wife: 50 }, goldSnapshot: { husband: 1, wife: 1 } };
  const old = { chronicleId: 1, startDate: day(-130), endDate: day(-61), prizePool: 100, payout: { husband: 50, wife: 50 }, goldSnapshot: { husband: 1, wife: 1 } };
  const s = m.createInitialState(today);
  const raw = { ...s, logs: [log(day(-40), 'wife', 5), log(day(-100), 'husband', 5)], prizeHistory: [recent, old] };
  const parsed = m.parseGameState(JSON.parse(JSON.stringify(raw)), today);
  assert.ok(parsed.prizeHistory[0].stats, 'recent chronicle backfilled');
  assert.equal(parsed.prizeHistory[0].stats.players.wife.quests, 1);
  assert.equal(parsed.prizeHistory[1].stats, undefined, 'partly pruned chronicle is not guessed');
});

check('snapshots round-trip through a save; broken ones are dropped', () => {
  const s = m.createInitialState(day(-30));
  const good = { players: { husband: { quests: 1, bestStreak: 1, mvpDays: 0 }, wife: { quests: 0, bestStreak: 0, mvpDays: 0 } }, awards: [] };
  const entry = (stats) => ({ chronicleId: 1, startDate: day(-200), endDate: day(-170), prizePool: 1, payout: { husband: 1, wife: 0 }, goldSnapshot: { husband: 1, wife: 0 }, stats });
  const back = m.fromHouseholdDoc(JSON.parse(JSON.stringify(m.toHouseholdSections({ ...s, prizeHistory: [entry(good), entry({ players: {} })] }))), today, false);
  assert.deepEqual(back.prizeHistory[0].stats, good);
  assert.equal(back.prizeHistory[1].stats, undefined);
});

console.log(`\n${passed} checks passed`);
