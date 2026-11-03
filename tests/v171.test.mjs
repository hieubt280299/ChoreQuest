import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const checkAsync = async (label, fn) => { await fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const skill = (id) => m.SKILL_POOL.find((item) => item.id === id);

// --- Wheel ------------------------------------------------------------------
check('wheel labels turn with their slice again (no flip on the lower half)', () => {
  const wheel = source('src/components/dashboard/WheelOfFortune.tsx');
  const labels = wheel.slice(wheel.indexOf('const SliceLabels'), wheel.indexOf('/** Result card after a spin'));
  assert.ok(labels.length > 0);
  assert.doesNotMatch(wheel, /upsideDownAtRest/);
  assert.doesNotMatch(labels, /rotate-180/);
  assert.match(labels, /rotate\(\$\{\(slice\.start \+ slice\.end\) \/ 2\}deg\)/);
});

// --- App updates ------------------------------------------------------------
check('a different published version triggers a reload', () => {
  assert.equal(m.needsReload('1.7.2', '1.7.1', null), true);
  assert.equal(m.needsReload('1.7.0', '1.7.1', null), true, 'a rollback too');
});

check('no reload for the same version, a missing file, or a version already reloaded for', () => {
  assert.equal(m.needsReload('1.7.1', '1.7.1', null), false);
  assert.equal(m.needsReload(undefined, '1.7.1', null), false);
  assert.equal(m.needsReload(null, '1.7.1', null), false);
  assert.equal(m.needsReload('1.7.2', '1.7.1', '1.7.2'), false, 'never loops');
});

await checkAsync('a save counts as in flight until it settles, even when it fails', async () => {
  assert.equal(m.savesInFlight(), false);
  let finish;
  const save = m.trackSave(new Promise((resolve) => { finish = resolve; }));
  const failed = m.trackSave(Promise.reject(new Error('offline')));
  assert.equal(m.savesInFlight(), true);
  await failed.catch(() => undefined);
  assert.equal(m.savesInFlight(), true, 'the other save is still running');
  finish('ok');
  assert.equal(await save, 'ok');
  assert.equal(m.savesInFlight(), false);
});

check('an update never reloads during a save, and waits in other tabs too', () => {
  const updates = source('src/utils/appUpdate.ts');
  assert.match(updates, /savesInFlight\(\) \|\|/);
  assert.match(updates, /if \(controlled\) whenIdle\(\(\) => window\.location\.reload\(\)\)/);
  assert.match(source('src/context/GameContext.tsx'), /trackSave\(queueRef\.current/);
});

check('the build publishes version.json, and it is never cached or precached', () => {
  const config = source('vite.config.ts');
  assert.match(config, /fileName: 'version\.json'/);
  assert.match(config, /injectRegister: false/);
  assert.doesNotMatch(config, /globPatterns: \[[^\]]*json/);
  const { headers } = JSON.parse(source('vercel.json'));
  const noCache = headers.find((rule) => rule.source.includes('version.json'));
  assert.ok(noCache, 'version.json has a header rule');
  assert.match(noCache.headers[0].value, /max-age=0/);
});

check('the app starts its update checks', () => {
  assert.match(source('src/main.tsx'), /startAppUpdates\(\);/);
  const updates = source('src/utils/appUpdate.ts');
  for (const trigger of ["'visibilitychange'", "'online'", 'setInterval', "'controllerchange'", "'updatefound'", "type: 'SKIP_WAITING'"]) {
    assert.ok(updates.includes(trigger), trigger);
  }
});

// --- Skill filters ----------------------------------------------------------
check('only filters with skills left to learn are offered', () => {
  const left = ['speed-cleaner', 'gold-doubler', 'quick-hands'].map(skill);
  assert.deepEqual(m.availableSkillFilters(left), ['all', 'cleaning', 'size', 'general']);
});

check('every filter shows while nothing is learned', () => {
  assert.deepEqual(m.availableSkillFilters(m.SKILL_POOL), m.SKILL_FILTERS);
});

check('with one filter left besides All, or none, there are no chips', () => {
  assert.deepEqual(m.availableSkillFilters([skill('speed-cleaner')]), ['all', 'cleaning']);
  assert.deepEqual(m.availableSkillFilters([skill('gold-doubler'), skill('gold-interest')]), ['all', 'general']);
  assert.deepEqual(m.availableSkillFilters([]), []);
});

// --- Skill descriptions -----------------------------------------------------
check('view-only descriptions show only the current level', () => {
  assert.match(source('src/components/dashboard/SkillChip.tsx'), /<SkillDescription skill=\{skill\} level=\{level\} exact /);
  assert.match(source('src/components/skills/SkillsView.tsx'), /level=\{owned\.level\}\s+exact/);
});

// --- Settings -----------------------------------------------------------------
check('version and What\'s New have their own About section', () => {
  const settings = source('src/components/settings/SettingsView.tsx');
  const about = settings.indexOf("t('settings.group.about')");
  const account = settings.indexOf("t('settings.group.account')");
  assert.ok(about > account, 'About comes after Account');
  assert.ok(settings.indexOf("t('settings.version'") > about, 'the version is under About');
  assert.ok(settings.indexOf("t('patch.open')") > about, "What's New is under About");
  const i18n = source('src/utils/i18n.ts');
  assert.equal((i18n.match(/'settings\.group\.about':/g) ?? []).length, 2);
});

// --- Task size ----------------------------------------------------------------
check('"Group" is now "Task size" (Mức việc) everywhere it shows', () => {
  const i18n = source('src/utils/i18n.ts');
  const values = (key) => [...i18n.matchAll(new RegExp(`'${key.replace('.', '\.')}': '([^']+)'`, 'g'))].map((match) => match[1]);
  assert.deepEqual(values('tasks.group'), ['Task size', 'Mức việc']);
  assert.deepEqual(values('tasks.groupBy.group'), ['Task size', 'Mức việc']);
  assert.deepEqual(values('skills.filter.size'), ['Task size', 'Mức việc']);
  assert.doesNotMatch(i18n, /'(tasks\.group|tasks\.groupBy\.group)': '(Group|Nhóm)'/);
  assert.doesNotMatch(i18n, /skills\.filter\.effort/);
});

// --- Release ------------------------------------------------------------------
check('What\'s New has 1.7.1', () => {
  const { notes } = m.PATCH_NOTES.find((entry) => entry.version === '1.7.1');
  for (const section of Object.values(notes)) assert.equal(section.en.length, section.vi.length);
});

console.log(`\n${passed} checks passed`);
