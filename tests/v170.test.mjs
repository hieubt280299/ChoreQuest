import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const today = m.localDateKey();
const character = (extra = {}) => ({ ...m.createInitialState(today).characters.husband, ...extra });
const streakOf = (days) => () => ({ days, doneToday: false, bonusGold: 0 });
const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const srcDir = fileURLToPath(new URL('../src', import.meta.url));

// --- Invite links ----------------------------------------------------------
check('an invite link carries a cleaned, valid code', () => {
  assert.equal(m.parseInviteCode('?join=a7k9x2'), 'A7K9X2');
  assert.equal(m.parseInviteCode('?other=1&join=A7K9X2'), 'A7K9X2');
});

check('a link without a full code is ignored', () => {
  assert.equal(m.parseInviteCode(''), null);
  assert.equal(m.parseInviteCode('?join='), null);
  assert.equal(m.parseInviteCode('?join=ABC'), null);
});

check('the share link round-trips', () => {
  const url = m.inviteUrl('A7K9X2', 'https://cqvn.vercel.app');
  assert.equal(url, 'https://cqvn.vercel.app/?join=A7K9X2');
  assert.equal(m.parseInviteCode(new URL(url).search), 'A7K9X2');
});

// --- Today card ------------------------------------------------------------
check('quests left count only enabled quests', () => {
  const tasks = [{ id: 'a', enabled: true }, { id: 'b', enabled: true }, { id: 'c', enabled: false }];
  const status = m.todayStatus(character(), tasks, today, (id) => id === 'a', streakOf(0));
  assert.deepEqual([status.questsDone, status.questsTotal], [1, 2]);
});

check('a streak is at risk from day 3, until the quest is done today', () => {
  const tasks = [{ id: 'a', enabled: true }, { id: 'b', enabled: true }, { id: 'c', enabled: true }];
  const days = { a: 5, b: 5, c: 2 };
  const status = m.todayStatus(character(), tasks, today, (id) => id === 'b', (id) => ({ days: days[id] }));
  assert.equal(status.streaksAtRisk, 1, 'a is at risk; b is done; c is too short to count');
});

check('the daily ticket is ready until claimed today', () => {
  assert.equal(m.todayStatus(character(), [], today, () => false, streakOf(0)).ticketReady, true);
  assert.equal(m.todayStatus(character({ ticketClaimedOn: '2020-01-01' }), [], today, () => false, streakOf(0)).ticketReady, true);
  assert.equal(m.todayStatus(character({ ticketClaimedOn: today }), [], today, () => false, streakOf(0)).ticketReady, false);
});

check('tickets to spin add both kinds, and skill points follow the level', () => {
  const status = m.todayStatus(character({ tickets: 2, goldenTickets: 1 }), [], today, () => false, streakOf(0));
  assert.equal(status.tickets, 3);
  assert.equal(status.skillPoints, m.skillPointsAvailable(1, []));
});

check('first steps tick off as a new player does them', () => {
  const fresh = character();
  assert.deepEqual(m.firstSteps(fresh, []), { quest: false, ticket: false, skill: false });
  assert.equal(m.firstSteps(fresh, [{ completedBy: 'wife' }]).quest, false, "the partner's quest doesn't count");
  assert.equal(m.firstSteps(fresh, [{ completedBy: 'both' }]).quest, true);
  assert.equal(m.firstSteps(character({ ticketClaimedOn: today }), []).ticket, true);
  assert.equal(m.firstSteps(character({ skills: [{ skillId: 'gold-doubler', level: 1 }] }), []).skill, true);
});

// --- Skill filters ---------------------------------------------------------
check('every skill is under All and exactly one other filter', () => {
  for (const skill of m.SKILL_POOL) {
    assert.ok(m.matchesSkillFilter(skill, 'all'), skill.id);
    const matches = m.SKILL_FILTERS.filter((filter) => filter !== 'all' && m.matchesSkillFilter(skill, filter));
    assert.equal(matches.length, 1, `${skill.id}: ${matches}`);
  }
});

check('skills land under the expected filters', () => {
  const pick = (filter) => m.SKILL_POOL.filter((skill) => m.matchesSkillFilter(skill, filter)).map((skill) => skill.id).sort();
  assert.deepEqual(pick('cleaning'), ['speed-cleaner']);
  assert.deepEqual(pick('cooking'), ['master-chef']);
  assert.deepEqual(pick('laundry'), ['iron-will']);
  assert.deepEqual(pick('shopping'), ['shop-savvy']);
  assert.deepEqual(pick('effort'), ['quick-hands', 'raid-master', 'steady-worker']);
  assert.equal(pick('general').length, m.SKILL_POOL.length - 7);
});

// --- Design rules ----------------------------------------------------------
check('digits use a font with a clear zero, in every text style', () => {
  assert.match(source('index.html'), /family=Jersey\+20&text=0123456789/);
  assert.match(source('tailwind.config.js'), /sans: \['"Jersey 20"', 'Handjet'/);
  const css = source('src/index.css');
  assert.equal((css.match(/font-family: 'Jersey 20', Handjet/g) ?? []).length, 3);
  assert.doesNotMatch(css, /font-family: Handjet/);
});

check('red is only for destructive actions', () => {
  const allowed = ['DeleteAccountButton', 'HouseholdCard', 'NewLegendCard', 'ResetQuestsButton', 'SignInMethods', 'TasksView'];
  const found = walk(srcDir).filter((path) => path.endsWith('.tsx') && /variant="brick"/.test(readFileSync(path, 'utf8')));
  for (const path of found) assert.ok(allowed.some((name) => path.includes(name)), path);
});

check('Complete is a green button, not a red one', () => {
  const card = source('src/components/tasks/TaskCard.tsx');
  assert.match(card, /icon=\{Check\}\s+variant="moss"/);
});

check('every dialog handles the keyboard', () => {
  const dialogs = walk(srcDir).filter((path) => path.endsWith('.tsx') && /role="dialog"/.test(readFileSync(path, 'utf8')));
  assert.ok(dialogs.length >= 4);
  for (const path of dialogs) assert.match(readFileSync(path, 'utf8'), /useDialogA11y\(/, path);
});

check('forms survive a stray tap outside the dialog', () => {
  for (const path of ['src/components/tasks/TaskEditorModal.tsx', 'src/components/dashboard/RenameCharacterModal.tsx', 'src/components/settings/DeleteAccountButton.tsx']) {
    assert.match(source(path), /<Modal persistent/, path);
  }
});

check('buttons and fields are 44px tap targets', () => {
  assert.match(source('src/index.css'), /button\.px-btn,\s+\.px-input \{\s+min-height: 44px;/);
});

// --- Language --------------------------------------------------------------
check('every new string exists in English and Vietnamese', () => {
  const i18n = source('src/utils/i18n.ts');
  const prefix = /^\s+'((?:today\.|calendar\.legend|skills\.filter\.|skills\.confirmHint|tasks\.(?:progress|filter|editMode|doneSection|toast)|dashboard\.today|household\.(?:share|linkCopied)|auth\.invited|onboarding\.(?:haveCode|newHousehold)|wheel\.(?:showWheel|hideWheel)|offline\.|common\.info|password\.(?:show|hide)|level\.short)[^']*)':/gm;
  const keys = [...i18n.matchAll(prefix)].map((match) => match[1]);
  assert.ok(keys.length >= 80, `found ${keys.length}`);
  for (const key of new Set(keys)) assert.equal(keys.filter((other) => other === key).length, 2, key);
});

// --- Release ---------------------------------------------------------------
check('version and What\'s New are 1.7.0', () => {
  assert.equal(m.APP_VERSION, '1.7.0');
  assert.equal(JSON.parse(source('package.json')).version, '1.7.0');
  const { notes } = m.PATCH_NOTES[0];
  assert.ok(notes.features.en.length > 0);
  assert.equal(notes.features.en.length, notes.features.vi.length);
});

console.log(`\n${passed} checks passed`);
