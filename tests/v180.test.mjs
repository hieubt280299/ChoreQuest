import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const skill = (id) => m.SKILL_POOL.find((item) => item.id === id);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const withChar = (state, id, extra) => ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], ...extra } } });
let n = 0;
const log = (date, by, taskId = 'trash', extra = {}) => ({
  id: `l${n++}`, taskId, date, completedBy: by, timestamp: n,
  xpAwarded: { husband: 0, wife: 0 }, goldAwarded: { husband: by === 'wife' ? 0 : 5, wife: by === 'husband' ? 0 : 5 }, ...extra,
});
/** A running chronicle from day -20 to day +10, with freezes settled up to `settledOn`. */
const running = (logs, settledOn = day(-21), extra = {}) => ({
  ...m.createInitialState(day(-20)),
  chronicle: { id: 1, startDate: day(-20), endDate: day(10), endsAtMs: 0 },
  logs,
  freezesSettledOn: settledOn,
  ...extra,
});

// --- Skill rebalance ----------------------------------------------------------
check('skill values (v1.8.0)', () => {
  const both = (id) => [skill(id).effect.xp, skill(id).effect.gold];
  assert.deepEqual(both('speed-cleaner'), [[0.08, 0.16, 0.24, 0.32], [0.08, 0.16, 0.24, 0.32]]);
  assert.deepEqual(both('master-chef'), [[0.09, 0.18, 0.27, 0.36], [0.09, 0.18, 0.27, 0.36]]);
  assert.deepEqual(both('iron-will'), [[0.2, 0.3, 0.4, 0.5], [0.2, 0.4, 0.6, 0.8]]);
  assert.deepEqual(both('shop-savvy'), [[0.15, 0.3, 0.45, 0.6], [0.15, 0.3, 0.45, 0.6]]);
  assert.deepEqual(both('quick-hands'), [[0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.4]]);
  assert.deepEqual(both('raid-master'), [[0.1, 0.2, 0.3, 0.4], [0.2, 0.3, 0.4, 0.5]]);
  assert.deepEqual(both('team-player'), [[0.15, 0.3, 0.45, 0.6], [0.15, 0.3, 0.45, 0.6]]);
  assert.deepEqual(both('steady-worker'), [[0.1, 0.15, 0.2, 0.25], [0.1, 0.15, 0.2, 0.25]], 'unchanged');
  assert.deepEqual(skill('gold-doubler').effect.gold, [0.06, 0.12, 0.18, 0.24], 'unchanged');
  assert.deepEqual(skill('zen-housekeeper').effect.xp, [0.3, 0.45, 0.6, 0.75]);
  assert.equal(skill('zen-housekeeper').effect.xpPerCharacterLevel, 0.01);
  assert.deepEqual(skill('fortunes-favor').effect.gold, [0.2, 0.4, 0.6, 0.8]);
  assert.deepEqual(skill('gold-interest').effect.values, [0.02, 0.03, 0.04, 0.05]);
  assert.deepEqual(skill('gold-interest').effect.caps, [15, 30, 45, 60]);
  assert.equal(m.HALL_OF_FAME_EVERY, 3);
  assert.deepEqual(skill('synergistic-streak').effect, { kind: 'spouse_streak', gold: [0.15, 0.3, 0.45, 0.6] }, 'Tag Team: no XP');
});

check('Errand Runner covers Shopping and General quests', () => {
  const s = withChar(m.createInitialState(today), 'wife', { skills: [{ skillId: 'shop-savvy', level: 2 }] });
  const gain = (category) => m.computeRewardBreakdown({ xp: 100, gold: 100, category, group: 'quick' }, 'wife', s.characters, m.SKILL_POOL).wife;
  close(gain('shopping').gold, 130);
  close(gain('general').xp, 130);
  close(gain('cleaning').gold, 100);
  assert.ok(m.skillCoversQuest(skill('shop-savvy'), { category: 'general', group: 'heavy' }));
  assert.ok(m.matchesSkillFilter(skill('shop-savvy'), 'shopping') && !m.matchesSkillFilter(skill('shop-savvy'), 'general'));
});

check('Gold Interest stops at the level\'s daily cap', () => {
  for (const [level, cap] of [[1, 15], [2, 30], [3, 45], [4, 60]]) {
    let s = m.createInitialState(day(-3));
    s = { ...s, chronicle: { ...s.chronicle, startDate: day(-3), endDate: day(20) } };
    s = withChar(s, 'husband', { skills: [{ skillId: 'gold-interest', level }], gold: 10000, interestOn: day(-1) });
    const paid = m.applyDailyInterest(s, today).events.filter((event) => event.type === 'interest');
    assert.deepEqual(paid.map((event) => event.gold), [cap], `level ${level}`);
  }
});

check('Hall of Fame pays at every 3rd MVP day', () => {
  let s = m.createInitialState(day(-10));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-10), endDate: day(20) }, mvpSettledOn: day(-8) };
  s = withChar(s, 'wife', { skills: [{ skillId: 'hall-of-fame', level: 2 }] });
  s = { ...s, logs: [-7, -6, -5, -4, -3, -2].map((d) => log(day(d), 'wife')) };
  assert.equal(m.advanceDays(s, today).characters.wife.goldenTickets, 4, '3rd and 6th MVP days, 2 each');
});

check('Mop House is 42 XP / 45 gold; saved v1.5 values move, edited ones stay', () => {
  const mop = m.DEFAULT_TASKS.find((task) => task.id === 'mop');
  assert.deepEqual([mop.xp, mop.gold, mop.group], [42, 45, 'heavy']);
  const moved = m.rebalanceTask({ id: 'mop', xp: 45, gold: 50, group: 'heavy' });
  assert.deepEqual([moved.xp, moved.gold], [42, 45]);
  const edited = { id: 'mop', xp: 60, gold: 50, group: 'heavy' };
  assert.equal(m.rebalanceTask(edited), edited);
});

// --- One-time skill point refund ---------------------------------------------
check('the rebalance refunds every learned skill once, with a notice for those who had some', () => {
  const old = m.createInitialState(day(-5));
  delete old.skillsRefundedIn;
  let s = withChar(old, 'husband', { skills: [{ skillId: 'gold-interest', level: 3 }, { skillId: 'master-chef', level: 1 }], interestOn: day(-4) });
  s = m.refundSkills(s);
  assert.deepEqual(s.characters.husband.skills, []);
  assert.equal(s.characters.husband.refundNotice, true);
  assert.equal(s.characters.husband.interestOn, undefined, 'a re-learned Interest starts the next day');
  assert.equal(s.characters.wife.refundNotice, undefined, 'nothing to refund, no notice');
  assert.equal(s.skillsRefundedIn, m.SKILL_REFUND_VERSION);
  const relearned = withChar(s, 'husband', { skills: [{ skillId: 'master-chef', level: 2 }] });
  assert.equal(m.refundSkills(relearned), relearned, 'never twice');
  assert.equal(m.SKILL_REFUND_VERSION, '1.8.0');
});

check('older saves are refunded when the days are settled; new games never are', () => {
  const raw = { ...m.createInitialState(day(-5)), skillsRefundedIn: undefined };
  raw.characters.wife.skills = [{ skillId: 'team-player', level: 2 }];
  const loaded = m.parseGameState(JSON.parse(JSON.stringify(raw)), today);
  assert.deepEqual(loaded.characters.wife.skills, []);
  assert.equal(loaded.characters.wife.refundNotice, true);
  const fresh = m.createInitialState(today);
  assert.equal(fresh.skillsRefundedIn, '1.8.0');
  // The marker and the notice survive a save and load.
  const again = m.fromHouseholdDoc(m.toHouseholdSections(loaded), today);
  assert.equal(again.skillsRefundedIn, '1.8.0');
  assert.equal(again.characters.wife.refundNotice, true);
});

// --- Tag Team -------------------------------------------------------------------
check('Tag Team: done alone on the spouse\'s 3+ day streak quest, +% gold plus that streak\'s bonus, no XP bonus', () => {
  const s = withChar(m.createInitialState(today), 'husband', { skills: [{ skillId: 'synergistic-streak', level: 4 }] });
  const base = { xp: 40, gold: 50, category: 'cleaning', group: 'heavy' };
  const solo = m.computeRewardBreakdown(base, 'husband', s.characters, m.SKILL_POOL, { husband: 1 }, { husband: 6 }).husband;
  close(solo.xp, 40);
  assert.equal(solo.coverGold, 3, "the wife's 6-day streak pays 3");
  assert.equal(solo.coveredFor, 'wife');
  close(solo.gold, 50 * 1.6 + 3);
  close(solo.baseGold + solo.skillGold + solo.streakGold, solo.gold);
  const together = m.computeRewardBreakdown(base, 'both', s.characters, m.SKILL_POOL, {}, { husband: 6 }).husband;
  close(together.gold, 25 * 1.6);
  assert.equal(together.coveredFor, undefined, 'together, the spouse keeps their own streak');
  const late = m.lateRewardBreakdown({ husband: solo, wife: null }).husband;
  assert.equal(late.gold, Math.floor((50 * 1.6) / 2), 'late: no streak gold');
  assert.equal(late.coveredFor, 'wife', 'but the streak is still kept');
  const short = m.computeRewardBreakdown(base, 'husband', s.characters, m.SKILL_POOL, {}, { husband: 2 }).husband;
  assert.equal(short.coveredFor, undefined);
  const without = m.computeRewardBreakdown(base, 'wife', s.characters, m.SKILL_POOL, {}, { wife: 6 }).wife;
  assert.equal(without.coveredFor, undefined, 'only with the skill');
});

check('a covered day keeps the spouse\'s streak going, one day shorter', () => {
  const logs = [-5, -4, -3, -2].map((d) => log(day(d), 'wife', 'mop'));
  logs.push(log(day(-1), 'husband', 'mop', { coveredFor: 'wife' }));
  const index = m.buildStreakIndex(logs);
  assert.equal(m.currentStreak(index, 'mop', 'wife', today).days, 3, '4 days, minus 1 for the cover');
  assert.equal(m.streakIfCompletedOn(index, 'mop', 'wife', today), 4);
  assert.equal(m.currentStreak(m.buildStreakIndex(logs.slice(0, 4)), 'mop', 'wife', today).days, 0, 'without the cover it broke');
});

check('Tag Team can\'t be farmed: covering every day runs the spouse\'s streak down, then stops', () => {
  let s = m.createInitialState(day(-40));
  s = withChar(s, 'husband', { skills: [{ skillId: 'synergistic-streak', level: 4 }] });
  const task = s.tasks.find((t) => t.id === 'dishesDinner');
  const logs = [];
  for (let d = -30; d <= -21; d += 1) logs.push(log(day(d), 'wife', task.id));
  const coverGold = [];
  for (let d = -20; d <= -10; d += 1) {
    const index = m.buildStreakIndex(logs);
    const partner = m.currentStreak(index, task.id, 'wife', day(d)).days;
    const part = m.computeRewardBreakdown(task, 'husband', s.characters, m.SKILL_POOL, {}, { husband: partner }).husband;
    coverGold.push(part.coverGold ?? 0);
    logs.push(log(day(d), 'husband', task.id, part.coveredFor ? { coveredFor: part.coveredFor } : {}));
  }
  // The wife's 10-day streak pays 21, then 13, 8, 5… as each cover takes a day off; below 3 days it stops.
  assert.deepEqual(coverGold, [21, 13, 8, 5, 3, 2, 1, 1, 0, 0, 0]);
  assert.equal(m.currentStreak(m.buildStreakIndex(logs), task.id, 'wife', day(-9)).days, 0, 'and then it breaks');
});

// --- Streak Freezes ---------------------------------------------------------------
check('a day with nothing done uses a freeze when a 3+ day streak would break', () => {
  const s = running([log(day(-5), 'wife'), log(day(-4), 'wife'), log(day(-3), 'wife'), log(day(-3), 'husband', 'beds')], day(-3));
  const next = m.advanceDays(s, today);
  assert.deepEqual(next.freezes, [{ characterId: 'wife', date: day(-2) }, { characterId: 'wife', date: day(-1) }]);
  assert.equal(next.freezesSettledOn, day(-1));
  assert.equal(m.freezesUsed(next, 'wife'), 2);
  assert.equal(m.freezesUsed(next, 'husband'), 0, 'no streak to save, no freeze');
  const index = m.buildStreakIndex(next.logs, undefined, next.freezes);
  assert.equal(m.currentStreak(index, 'trash', 'wife', today).days, 3, 'kept');
  assert.equal(m.streakIfCompletedOn(index, 'trash', 'wife', today), 4, 'and goes on from where it was');
  assert.equal(m.advanceDays(next, today), next, 'each day settles once');
});

check('freezes: anything done that day counts (together too), late quests don\'t', () => {
  const streak = [log(day(-5), 'wife'), log(day(-4), 'wife'), log(day(-3), 'wife')];
  const busy = m.advanceDays(running([...streak, log(day(-2), 'both', 'beds')], day(-3)), day(-1));
  assert.deepEqual(busy.freezes, [], 'a quest done together counts as doing something');
  // A late "Yesterday's quests" entry doesn't count as activity, but it keeps its own streak.
  const late = m.advanceDays(running([...streak, log(day(-5), 'wife', 'beds'), log(day(-4), 'wife', 'beds'), log(day(-3), 'wife', 'beds'), log(day(-2), 'wife', 'trash', { late: true })], day(-3)), day(-1));
  assert.deepEqual(late.freezes, [{ characterId: 'wife', date: day(-2) }], 'the beds streak needed saving');
  const onlyLate = m.advanceDays(running([...streak, log(day(-2), 'wife', 'trash', { late: true })], day(-3)), day(-1));
  assert.deepEqual(onlyLate.freezes, [], 'its only streak was kept by the late entry');
});

check('3 freezes per chronicle, none carried over; no marker means counting starts now', () => {
  const streak = [log(day(-12), 'wife'), log(day(-11), 'wife'), log(day(-10), 'wife')];
  const next = m.advanceDays(running(streak, day(-10)), today);
  assert.deepEqual(next.freezes.map((freeze) => freeze.date), [day(-9), day(-8), day(-7)]);
  assert.equal(m.currentStreak(m.buildStreakIndex(next.logs, undefined, next.freezes), 'trash', 'wife', today).days, 0, 'broke on day 4');
  const unmarked = running(streak, undefined);
  delete unmarked.freezesSettledOn;
  const started = m.advanceDays(unmarked, today);
  assert.deepEqual(started.freezes, []);
  assert.equal(started.freezesSettledOn, day(-1));
  // A new chronicle brings 3 new ones.
  const ended = { ...next, chronicle: { id: 1, startDate: day(-20), endDate: day(-8), endsAtMs: 0 } };
  assert.equal(m.freezesUsed({ freezes: next.freezes, chronicle: { startDate: day(-7), endDate: day(20) } }, 'wife'), 1);
  assert.equal(m.freezesUsed({ freezes: next.freezes, chronicle: { startDate: day(-6), endDate: day(20) } }, 'wife'), 0);
  assert.ok(ended);
});

check('the longest streak bridges frozen days, and covered days one day shorter', () => {
  const logs = [log(day(-6), 'wife'), log(day(-5), 'wife'), log(day(-3), 'wife'), log(day(-2), 'husband', 'trash', { coveredFor: 'wife' }), log(day(-1), 'wife')];
  assert.equal(m.longestStreak(m.buildStreakIndex(logs), 'wife'), 2, 'the gap on day -4 breaks it');
  // -6, -5, (frozen -4), -3 = 3; the cover on -2 takes one off, so -1 brings it back to 3.
  assert.equal(m.longestStreak(m.buildStreakIndex(logs, undefined, [{ characterId: 'wife', date: day(-4) }]), 'wife'), 3);
});

// --- Hearts -----------------------------------------------------------------------
check('a heart: once a day per player, +1 Normal Ticket for the partner', () => {
  const s = m.createInitialState(today);
  const sent = m.sendHeartOnState(s, 'husband', today, 123);
  assert.equal(sent.characters.wife.tickets, 1);
  assert.equal(sent.characters.husband.tickets, 0);
  assert.deepEqual(sent.hearts, [{ id: `heart-husband-${today}`, from: 'husband', to: 'wife', date: today, timestamp: 123 }]);
  assert.equal(m.sendHeartOnState(sent, 'husband', today, 124), 'hearts.error.sent');
  assert.ok(m.heartSentOn(sent, 'husband', today));
  assert.ok(!m.heartSentOn(sent, 'wife', today));
  const back = m.sendHeartOnState(sent, 'wife', today, 125);
  assert.equal(back.characters.husband.tickets, 1, 'both can send one');
  assert.equal(typeof m.sendHeartOnState(sent, 'husband', m.addDays(today, 1), 200), 'object', 'again tomorrow');
});

check('hearts and freezes are saved, pruned with the logs and survive a load', () => {
  const s = { ...m.createInitialState(today), hearts: [{ id: 'h1', from: 'wife', to: 'husband', date: today, timestamp: 1 }, { id: 'old', from: 'wife', to: 'husband', date: day(-200), timestamp: 1 }], freezes: [{ characterId: 'wife', date: day(-1) }] };
  const settled = m.settle(s, today);
  assert.deepEqual(settled.hearts.map((heart) => heart.id), ['h1']);
  const loaded = m.fromHouseholdDoc(m.toHouseholdSections(settled), today, false);
  assert.deepEqual(loaded.hearts, settled.hearts);
  assert.deepEqual(loaded.freezes, settled.freezes);
  const patch = m.householdPatch(m.createInitialState(today), settled);
  assert.ok('game.hearts' in patch && 'game.freezes' in patch);
  const junk = m.parseGameState({ ...settled, hearts: [{ id: 'x', from: 'wife', to: 'wife', date: today, timestamp: 1 }, null], freezes: [{ characterId: 'cat', date: today }] }, today, false);
  assert.deepEqual([junk.hearts, junk.freezes], [[], []]);
});

check('the Chronicle summary and archive show who got the most hearts', () => {
  let s = m.createInitialState(day(-40));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-40), endDate: day(-2) }, logs: [log(day(-10), 'husband')] };
  s = { ...s, hearts: [day(-9), day(-8)].map((date, index) => ({ id: `h${index}`, from: 'husband', to: 'wife', date, timestamp: 1 })) };
  const result = m.advanceDays(s, today).prizeHistory[0];
  assert.equal(result.stats.players.wife.hearts, 2);
  assert.equal(result.stats.players.husband.hearts, 0);
  assert.ok(result.stats.awards.some((award) => award.kind === 'hearts' && award.characterId === 'wife' && award.count === 2));
  const summary = m.chronicleSummary(result, []);
  assert.equal(summary.mostHearts, 'wife');
  assert.equal(summary.players.wife.hearts, 2);
});

// --- Notifications (server planning) -------------------------------------------------
const household = (extra = {}) => ({
  members: { u1: { uid: 'u1', characterId: 'husband' }, u2: { uid: 'u2', characterId: 'wife' } },
  chronicle: { id: 3, startDate: '2026-11-01', endDate: '2026-11-30' },
  game: { characters: { husband: { customName: 'Hieu' }, wife: {} }, logs: [], hearts: [] },
  ...extra,
});
const r = m.reminders;

check('local time comes from each device\'s time zone', () => {
  const now = new Date('2026-11-04T14:30:00Z');
  assert.deepEqual(r.localClock(now, 'Asia/Ho_Chi_Minh'), { date: '2026-11-04', hour: 21 });
  assert.deepEqual(r.localClock(now, 'America/New_York'), { date: '2026-11-04', hour: 9 });
  assert.deepEqual(r.localClock(new Date('2026-11-04T17:30:00Z'), 'Asia/Ho_Chi_Minh'), { date: '2026-11-05', hour: 0 });
  assert.deepEqual(r.localClock(now, 'Not/AZone'), { date: '2026-11-04', hour: 21 }, 'unknown zone: Vietnam');
});

check('9 PM reminder only on a day with no quest done, once per day', () => {
  const evening = { date: '2026-11-04', hour: r.EVENING_HOUR };
  assert.deepEqual(r.dueReminder(household(), 'wife', {}, evening), { kind: 'evening', key: '2026-11-04' });
  const busy = household({ game: { ...household().game, logs: [{ date: '2026-11-04', completedBy: 'both' }] } });
  assert.equal(r.dueReminder(busy, 'wife', {}, evening), null);
  const other = household({ game: { ...household().game, logs: [{ date: '2026-11-04', completedBy: 'husband' }] } });
  assert.ok(r.dueReminder(other, 'wife', {}, evening), "the partner's quest doesn't count");
  assert.equal(r.dueReminder(household(), 'wife', { sent: { evening: '2026-11-04' } }, evening), null, 'sent already');
  assert.equal(r.dueReminder(household(), 'wife', {}, { date: '2026-11-04', hour: 20 }), null, 'other hours');
});

check('Day 1 of a new Chronicle in the morning, even before anyone opened the app', () => {
  const morning = (date) => ({ date, hour: r.MORNING_HOUR });
  assert.deepEqual(r.dueReminder(household(), 'wife', {}, morning('2026-11-01')), { kind: 'newChronicle', key: '3' });
  assert.deepEqual(r.dueReminder(household(), 'wife', {}, morning('2026-12-01')), { kind: 'newChronicle', key: '4' }, 'not rolled over yet');
  assert.equal(r.dueReminder(household(), 'wife', {}, morning('2026-11-02')), null);
  assert.equal(r.dueReminder(household(), 'wife', { sent: { newChronicle: '3' } }, morning('2026-11-01')), null);
});

check('a heart is announced while fresh, with the sender\'s name in the device language', () => {
  const now = Date.parse('2026-11-04T12:00:00Z');
  const h = household({ game: { ...household().game, hearts: [{ id: 'a', from: 'husband', to: 'wife', date: '2026-11-04', timestamp: now - 60_000 }] } });
  assert.equal(r.freshHeart(h, 'husband', now).id, 'a');
  assert.equal(r.freshHeart(h, 'husband', now + r.HEART_FRESH_MS), null);
  assert.equal(r.freshHeart(h, 'wife', now), null);
  assert.equal(r.heartMessage('vi', h, 'husband').title, 'Hieu gửi bạn một trái tim');
  assert.equal(r.heartMessage('en', household(), 'wife').title, 'Wife sent you a heart');
  assert.equal(r.reminderMessage('vi', 'evening').tag, 'evening');
});

check('server and hosting: hourly reminder jobs, authenticated endpoints, API kept out of the app fallback', () => {
  const vercel = JSON.parse(source('vercel.json'));
  assert.deepEqual(vercel.crons.map((cron) => cron.schedule), Array.from({ length: 24 }, (_, hour) => `0 ${hour} * * *`));
  assert.ok(vercel.crons.every((cron) => cron.path === '/api/reminders'));
  assert.equal(vercel.rewrites[1].source, '/((?!api/).*)');
  assert.match(source('api/reminders.ts'), /CRON_SECRET/);
  assert.match(source('api/heart.ts'), /verifyIdToken/);
  // Each function bundles on its own: only `./_lib/*.js` imports, nothing from the app.
  for (const file of ['api/heart.ts', 'api/reminders.ts', 'api/_lib/server.ts', 'api/_lib/reminders.ts']) {
    for (const [, path] of source(file).matchAll(/from '(\.[^']+)'/g)) assert.match(path, /^\.\/(_lib\/)?\w+\.js$/, `${file}: ${path}`);
  }
  assert.match(source('vite.config.ts'), /importScripts: \['push-sw\.js'\]/);
  assert.ok(existsSync(new URL('../public/push-sw.js', import.meta.url)));
});

// --- UI ---------------------------------------------------------------------------------
check('tier pips explain every level; hearts sit on the partner\'s card', () => {
  const view = source('src/components/skills/SkillsView.tsx');
  assert.match(view, /<TierPips level=\{level\} skill=\{skill\} \/>/);
  assert.match(source('src/components/skills/SkillPickerModal.tsx'), /<TierPips level=\{owned\?\.level \?\? 0\} skill=\{skill\} \/>/);
  assert.match(source('src/components/skills/SkillDescription.tsx'), /export function skillLevelTable/);
  assert.match(source('src/components/dashboard/CharacterCard.tsx'), /<HeartButton to=\{id\} \/>/);
  const i18n = source('src/utils/i18n.ts');
  assert.match(i18n, /'skill\.shopSavvy\.name': 'Errand Runner'/);
  assert.match(i18n, /'skill\.shopSavvy\.name': 'Việc vặt'/);
  assert.match(i18n, /'skill\.synergy\.name': 'Tag Team'/);
  assert.equal((i18n.match(/\{\{cap\}\}/g) ?? []).length, 2, 'Gold Interest shows its level cap in both languages');
});

// --- Follow-ups after review ------------------------------------------------------------------
check('every skill description names exactly what the skill boosts, in both languages', () => {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const { id, descriptionKey, effect } of m.SKILL_POOL) {
    for (const language of ['en', 'vi']) {
      const text = m.translations[language][descriptionKey];
      const where = `${id} (${language})`;
      assert.equal(text.includes('{{xp}}'), !!effect.xp, `${where}: XP`);
      if (effect.xp && effect.gold && same(effect.xp, effect.gold)) {
        // Equal XP and gold bonuses are written once: "Gain 8% more XP and gold…".
        assert.ok(!text.includes('{{gold}}'), `${where}: one value for both`);
        assert.match(text, language === 'en' ? /\{\{xp\}\} more XP and gold/ : /\{\{xp\}\} kinh nghiệm và vàng/, where);
      } else {
        assert.equal(text.includes('{{gold}}'), !!effect.gold, `${where}: gold`);
      }
      assert.equal(text.includes('{{values}}'), !!effect.values, `${where}: values`);
      assert.equal(text.includes('{{cap}}'), !!effect.caps, `${where}: cap`);
    }
  }
});

check('the Wardrobe isn\'t in Settings any more; notifications are one row of the Display card, gone once on', () => {
  const settings = source('src/components/settings/SettingsView.tsx');
  assert.doesNotMatch(settings, /onOpenWardrobe|cosmetics\.title/);
  assert.match(settings, /<NotificationsSetting \/>/);
  assert.ok(!existsSync(new URL('../src/components/settings/NotificationsCard.tsx', import.meta.url)));
  const row = source('src/components/settings/NotificationsSetting.tsx');
  assert.match(row, /enabled && !justEnabled\)\) return null/);
  const i18n = source('src/utils/i18n.ts');
  assert.doesNotMatch(i18n, /'notify\.(hint|off|unsupported)'/);
});

check('signing out unsubscribes the device; a device saved twice is notified once', () => {
  assert.match(source('src/context/AuthContext.tsx'), /forgetPushDevice\(uid\)[\s\S]*signOut\(firebase\.auth\)/);
  const device = (endpoint) => ({ endpoint, keys: { p256dh: 'p', auth: 'a' }, timeZone: 'Asia/Ho_Chi_Minh', language: 'vi' });
  const devices = m.reminders.distinctDevices({ a: device('https://push/1'), b: device('https://push/1'), c: device('https://push/2') });
  assert.deepEqual(Object.keys(devices), ['a', 'c']);
});

check('a card shows hearts on the day its player got one, to both players', () => {
  const card = source('src/components/dashboard/CharacterCard.tsx');
  assert.match(card, /state\.hearts\.find\(\(item\) => item\.to === id && item\.date === today\)/);
  assert.match(card, /<ReceivedHearts from=\{heart\.from\} \/>/);
  const css = source('src/index.css');
  assert.match(css, /\.heart-beat,\s*\.heart-rise \{\s*animation: none;/, 'still under reduced motion');
});

// --- Release --------------------------------------------------------------------------------
check('version and What\'s New are 1.8.0', () => {
  assert.equal(m.APP_VERSION, '1.8.0');
  assert.equal(JSON.parse(source('package.json')).version, '1.8.0');
  const lock = JSON.parse(source('package-lock.json'));
  assert.equal(lock.version, '1.8.0');
  assert.equal(lock.packages[''].version, '1.8.0');
  const { notes } = m.PATCH_NOTES[0];
  for (const section of Object.values(notes)) assert.equal(section.en.length, section.vi.length);
  assert.match(source('CHANGELOG.md'), /## \[1\.8\.0\] - \d{4}-\d{2}-\d{2}\r?\n\r?\nSpec: \[UPDATE_v1\.8\.0\.md\]/);
});

console.log(`\n${passed} checks passed`);
