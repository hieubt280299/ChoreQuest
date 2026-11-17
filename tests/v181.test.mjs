import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const today = m.localDateKey();
const withChar = (state, id, extra) => ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], ...extra } } });
const meta = (id, extra = {}) => ({ id, date: today, timestamp: 1000, ...extra });

// --- Stale data after the app comes back --------------------------------------------
check('coming back after a few seconds in the background restarts the connection', () => {
  assert.equal(m.RECONNECT_AFTER_HIDDEN_MS, 5000);
  assert.equal(m.shouldReconnect(1500), false, 'a quick app switch');
  assert.equal(m.shouldReconnect(5000), true);
  assert.equal(m.shouldReconnect(30 * 60_000), true);
});

check('households reconnect on resume; a save in progress finishes first', () => {
  const resume = source('src/services/firestoreResume.ts');
  assert.match(resume, /disableNetwork\(db\);\s*await enableNetwork\(db\)/);
  assert.match(resume, /savesInFlight\(\)/);
  assert.match(resume, /'visibilitychange'/);
  assert.match(resume, /event\.persisted/);
  assert.match(source('src/context/HouseholdContext.tsx'), /return reconnectOnResume\(firebase\.db\);/);
});

// --- A spouse's spin stays a surprise -------------------------------------------------
check('a spin records the jackpot before it and how long its wheel turns', () => {
  let s = withChar(m.createInitialState(today), 'wife', { tickets: 1 });
  s = { ...s, wheel: { jackpotBonus: 40 } };
  const { spin, state } = m.spinOnState(s, 'wife', 'none', meta('a', { spinMs: 7150 }));
  assert.equal(spin.jackpotBefore, 40);
  assert.equal(spin.spinMs, 7150);
  assert.equal(state.wheel.jackpotBonus, 50);
});

check('until it\'s shown, a spouse\'s spin is undone: jackpot, gold, tickets and the day log', () => {
  let s = withChar(m.createInitialState(today), 'wife', { tickets: 2, goldenTickets: 1, gold: 100 });
  s = { ...s, wheel: { jackpotBonus: 40 } };
  const golden = m.spinOnState(s, 'wife', 'none', meta('g')); // Golden miss: +10 pot, a Normal Ticket back
  const normal = m.spinOnState(golden.state, 'wife', 'normal', meta('n')); // +10 gold
  const after = normal.state;
  assert.deepEqual([after.wheel.jackpotBonus, after.characters.wife.gold, after.characters.wife.tickets, after.characters.wife.goldenTickets], [50, 110, 2, 0]);
  const shown = m.withoutSpins(after, ['g', 'n']);
  assert.deepEqual([shown.wheel.jackpotBonus, shown.characters.wife.gold, shown.characters.wife.tickets, shown.characters.wife.goldenTickets], [40, 100, 2, 1]);
  assert.equal(shown.events.length, 0);
  // Only the newer one still turning: the older one shows.
  const partly = m.withoutSpins(after, ['n']);
  assert.deepEqual([partly.wheel.jackpotBonus, partly.characters.wife.gold, partly.events.map((e) => e.id).join()], [50, 100, 'g']);
  assert.equal(m.withoutSpins(after, []), after, 'nothing held: the same state');
});

check('a jackpot stays hidden too: the pot shows its old value until the wheel stops', () => {
  let s = withChar(m.createInitialState(today), 'husband', { tickets: 1 });
  s = { ...s, wheel: { jackpotBonus: 90 } };
  const { state } = m.spinOnState(s, 'husband', 'jackpot', meta('j'));
  assert.equal(state.wheel.jackpotBonus, 0);
  const shown = m.withoutSpins(state, ['j']);
  assert.equal(shown.wheel.jackpotBonus, 90);
  assert.equal(shown.characters.husband.gold, 0);
  assert.equal(shown.characters.husband.tickets, 1);
  // Spins saved before v1.8.1 have no jackpotBefore: a miss is still undone.
  const old = { ...state, wheel: { jackpotBonus: 30 }, events: [{ ...state.events[0], prize: 'none', gold: 0, jackpotBefore: undefined }] };
  assert.equal(m.withoutSpins(old, ['j']).wheel.jackpotBonus, 20);
});

check('a spin is held until its wheel stops, and only while it\'s fresh', () => {
  assert.equal(m.spinRevealDelay({ spinMs: 7150 }), 8150);
  assert.equal(m.spinRevealDelay({}), m.LONGEST_SPIN_MS + 1000, 'older spins: the longest wheel');
  assert.equal(m.spinRevealDelay({ spinMs: 60_000 }), m.LONGEST_SPIN_MS + 1000, 'capped');
  assert.equal(m.spinRevealDelay({ spinMs: 160 }), 1160, 'reduced motion: nearly at once');
  assert.ok(m.isFreshSpin({ timestamp: 1_000_000, spinMs: 7150 }, 1_000_000 + 2_000), 'arrived while turning');
  assert.ok(m.isFreshSpin({ timestamp: 1_000_000, spinMs: 7150 }, 1_000_000 - 3_000), "the spouse's clock a little ahead");
  assert.ok(!m.isFreshSpin({ timestamp: 1_000_000, spinMs: 7150 }, 1_000_000 + 8150 + m.CLOCK_SKEW_MS), 'seen later: shown at once');
  assert.ok(!m.isFreshSpin({ timestamp: 1_000_000, spinMs: 7150 }, 1_000_000 + 30_000), 'back in the app 30 s later: shown at once');
});

check('the game shows the held state; the wheel passes its spin time with the spin', () => {
  const game = source('src/context/GameContext.tsx');
  assert.match(game, /spin\.characterId !== myCharacter && isFreshSpin\(spin, now\)/);
  assert.match(game, /state: shownState,/);
  assert.match(game, /if \(demo \|\| loading\) return;/);
  assert.match(source('src/components/dashboard/WheelOfFortune.tsx'), /spinWheel\(characterId, Math\.round\(spinSeconds \* 1000\) \+ 150\)/);
});

// --- Notifications: one player's saved devices can't break or misuse the reminders --------
check('only browser push services are ever contacted', () => {
  const ok = (endpoint) => m.reminders.isPushEndpoint(endpoint);
  assert.ok(ok('https://fcm.googleapis.com/fcm/send/abc:def'), 'Chrome, Android, Samsung, Opera');
  assert.ok(ok('https://updates.push.services.mozilla.com/wpush/v2/gAAAA'), 'Firefox');
  assert.ok(ok('https://web.push.apple.com/QGx'), 'Safari');
  assert.ok(ok('https://wns2-par02p.notify.windows.com/w/?token=BQY'), 'Edge');
  for (const bad of [
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com:8443/fcm/send/abc',
    'https://fcm.googleapis.com.example.com/x',
    'https://evil-fcm.googleapis.com/x',
    'https://push.apple.com.example.com/x',
    'https://fcm.googleapis.com@example.com/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://127.0.0.1/x',
    'https://localhost/x',
    'https://metadata.google.internal/x',
    'not a url',
    '',
    undefined,
    42,
  ]) {
    assert.equal(ok(bad), false, String(bad));
  }
});

check('the reminder cron: device ids are path segments, failures stay per device, sends time out, pages of players', () => {
  const cron = source('api/reminders.ts');
  assert.match(cron, /new FieldPath\('push', 'devices', deviceId, 'sent', due\.kind\)/);
  assert.doesNotMatch(cron, /`push\.devices\.\$\{/, 'no dotted path built from a device id');
  assert.match(cron, /Promise\.allSettled\(page\.docs\.map/);
  assert.match(cron, /\.orderBy\(FieldPath\.documentId\(\)\)\.limit\(PAGE_SIZE\)/);
  assert.match(cron, /timingSafeEqual\(given, expected\)/);
  const server = source('api/_lib/server.ts');
  assert.match(server, /if \(!isPushEndpoint\(device\.endpoint\)\)/);
  assert.match(server, /timeout: SEND_TIMEOUT_MS,/);
  assert.match(server, /new FieldPath\('push', 'devices', deviceId\), FieldValue\.delete\(\)/);
  assert.doesNotMatch(server, /`push\.devices\.\$\{/);
});

check('a heart goes to the other account in memberIds, never to a uid written inside a member entry', () => {
  const entry = (uid, characterId) => ({ uid, characterId, role: 'member' });
  const forged = { memberIds: ['me'], members: { me: entry('me', 'husband'), extra: entry('someone-else', 'wife') } };
  assert.equal(m.reminders.partnerOf(forged, 'me'), null, 'an extra member entry is not a partner');
  const couple = { memberIds: ['me', 'you'], members: { me: entry('me', 'husband'), you: entry('someone-else', 'wife') } };
  assert.equal(m.reminders.partnerOf(couple, 'me'), 'you', 'the id in memberIds, not the entry\'s uid field');
  assert.equal(m.reminders.partnerOf(couple, 'you'), 'me');
  assert.equal(m.reminders.partnerOf(couple, 'stranger'), null, 'only members have a partner');
  assert.equal(m.reminders.partnerOf({ members: {} }, 'me'), null);
  const heart = source('api/heart.ts');
  assert.match(heart, /const partnerUid = partnerOf\(household, uid\);/);
  assert.match(heart, /!household\.memberIds\?\.includes\(uid\)/);
  assert.doesNotMatch(heart, /member\.uid !== uid/);
});

// --- Release ------------------------------------------------------------------------------
check('release rule written down: semver kinds and minimum gaps', () => {
  const guide = source('AGENT_GUIDE.md');
  assert.match(guide, /### 🗓️ Versioning & Release Cadence/);
  assert.match(guide, /MAJOR: at least \*\*3 months\*\*/);
  assert.match(guide, /MINOR: at least \*\*2 weeks\*\*/);
  assert.match(guide, /PATCH: at least \*\*1 day\*\*/);
});

check('version and What\'s New are 1.8.1', () => {
  assert.equal(m.APP_VERSION, '1.8.1');
  assert.equal(JSON.parse(source('package.json')).version, '1.8.1');
  const lock = JSON.parse(source('package-lock.json'));
  assert.equal(lock.version, '1.8.1');
  assert.equal(lock.packages[''].version, '1.8.1');
  const { notes } = m.PATCH_NOTES[0];
  for (const section of Object.values(notes)) assert.equal(section.en.length, section.vi.length);
  assert.match(source('CHANGELOG.md'), /## \[1\.8\.1\] - \d{4}-\d{2}-\d{2}\r?\n\r?\nSpec: \[UPDATE_v1\.8\.1\.md\]/);
  assert.ok(existsSync(new URL('../UPDATE_v1.8.1.md', import.meta.url)));
});

console.log(`\n${passed} checks passed`);
