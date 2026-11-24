import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const skill = (id) => m.SKILL_POOL.find((item) => item.id === id);
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const withChar = (state, id, extra) => ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], ...extra } } });
let n = 0;
const log = (date, by, extra = {}) => ({
  id: `l${n++}`, taskId: 'beds', date, completedBy: by, timestamp: n,
  xpAwarded: { husband: 0, wife: 0 }, goldAwarded: { husband: 0, wife: 0 }, ...extra,
});
const quest = { xp: 100, gold: 100, category: 'general', group: 'quick' };

// --- Skill values ------------------------------------------------------------------
check('skill values (v1.9.0)', () => {
  const both = (id) => [skill(id).effect.xp, skill(id).effect.gold];
  assert.deepEqual(skill('gold-interest').effect.values, [0.01, 0.02, 0.03, 0.04]);
  assert.deepEqual(skill('gold-interest').effect.caps, [12, 20, 28, 36]);
  assert.deepEqual(skill('fortunes-favor').effect.values, [2, 2, 2, 2]);
  assert.deepEqual(skill('fortunes-favor').effect.gold, [0.2, 0.4, 0.6, 0.8], 'spin bonus unchanged');
  assert.deepEqual(skill('zen-housekeeper').effect.xp, [0.16, 0.24, 0.32, 0.4]);
  assert.deepEqual(skill('zen-housekeeper').effect.xpPerCharacterLevel, [0.005, 0.01, 0.015, 0.02]);
  assert.deepEqual(both('quick-hands'), [[0.15, 0.25, 0.35, 0.45], [0.15, 0.25, 0.35, 0.45]]);
  assert.deepEqual(both('shop-savvy'), [[0.25, 0.4, 0.55, 0.7], [0.25, 0.4, 0.55, 0.7]]);
  assert.deepEqual(both('iron-will'), [[0.25, 0.45, 0.65, 0.85], [0.25, 0.45, 0.65, 0.85]]);
  assert.deepEqual(both('raid-master'), [[0.15, 0.3, 0.45, 0.6], [0.2, 0.4, 0.6, 0.8]]);
  assert.deepEqual(both('master-chef'), [[0.14, 0.28, 0.42, 0.56], [0.14, 0.28, 0.42, 0.56]]);
  assert.deepEqual(both('team-player'), [[0.2, 0.4, 0.6, 0.8], [0.2, 0.4, 0.6, 0.8]]);
  assert.deepEqual(both('steady-worker'), [[0.09, 0.18, 0.27, 0.36], [0.09, 0.18, 0.27, 0.36]]);
  assert.deepEqual(skill('synergistic-streak').effect, { kind: 'spouse_streak', gold: [0.25, 0.5, 0.75, 1] });
  // Unchanged.
  assert.deepEqual(both('speed-cleaner'), [[0.08, 0.16, 0.24, 0.32], [0.08, 0.16, 0.24, 0.32]]);
  assert.deepEqual(skill('gold-doubler').effect.gold, [0.07, 0.14, 0.21, 0.28]);
  assert.deepEqual(skill('hall-of-fame').effect.values, [1, 2, 3, 4]);
  assert.equal(m.SKILL_REFUND_VERSION, '1.8.0', 'no new refund');
});

check('Fast Learner: +0.5 / 1 / 1.5 / 2% per character level, by skill level', () => {
  const xpForLevel = (level) => m.XP_CURVE.slice(0, level - 1).reduce((sum, value) => sum + value, 0);
  for (const [skillLevel, expected] of [[1, 118.5], [2, 129], [3, 139.5], [4, 150]]) {
    const s = withChar(m.createInitialState(today), 'wife', { skills: [{ skillId: 'zen-housekeeper', level: skillLevel }], xp: xpForLevel(5) });
    const r = m.computeRewardBreakdown(quest, 'wife', s.characters, m.SKILL_POOL).wife;
    close(r.xp, expected);
    close(r.gold, 100);
  }
});

// --- Seesaw ---------------------------------------------------------------------------
const seesaw = (level, husbandGold, wifeGold) =>
  withChar(withChar(m.createInitialState(today), 'husband', { skills: [{ skillId: 'seesaw', level }], gold: husbandGold }), 'wife', { gold: wifeGold });

check('Seesaw: behind or tied pays gold, leading pays XP instead', () => {
  assert.deepEqual(skill('seesaw').effect, { kind: 'gold_position', gold: [0.06, 0.12, 0.18, 0.24], xp: [0.1, 0.2, 0.3, 0.4] });
  const behind = m.computeRewardBreakdown(quest, 'husband', seesaw(4, 50, 80).characters, m.SKILL_POOL).husband;
  close(behind.gold, 124);
  close(behind.xp, 100);
  const tied = m.computeRewardBreakdown(quest, 'husband', seesaw(1, 0, 0).characters, m.SKILL_POOL).husband;
  close(tied.gold, 106);
  close(tied.xp, 100);
  const leading = m.computeRewardBreakdown(quest, 'husband', seesaw(4, 81, 80).characters, m.SKILL_POOL).husband;
  close(leading.gold, 100);
  close(leading.xp, 140);
});

check('Seesaw on a Both quest: each owner checks their own position', () => {
  let s = seesaw(2, 50, 80);
  s = withChar(s, 'wife', { skills: [{ skillId: 'seesaw', level: 2 }] });
  const r = m.computeRewardBreakdown(quest, 'both', s.characters, m.SKILL_POOL);
  close(r.husband.gold, 50 * 1.12);
  close(r.husband.xp, 50);
  close(r.wife.gold, 50);
  close(r.wife.xp, 50 * 1.2);
});

check('Seesaw late: half gold when behind, nothing while leading; undo takes back exactly what was paid', () => {
  const lateBehind = m.lateRewardBreakdown(m.computeRewardBreakdown(quest, 'husband', seesaw(4, 0, 10).characters, m.SKILL_POOL)).husband;
  assert.equal(lateBehind.gold, Math.floor(124 / 2));
  assert.equal(lateBehind.xp, 0);
  const lateLeading = m.lateRewardBreakdown(m.computeRewardBreakdown(quest, 'husband', seesaw(4, 10, 0).characters, m.SKILL_POOL)).husband;
  assert.equal(lateLeading.gold, 50);
  assert.equal(lateLeading.xp, 0);
  // Level 5 (enough points for Seesaw lv4), behind in gold.
  const xp = m.XP_CURVE.slice(0, 4).reduce((sum, value) => sum + value, 0);
  const s = withChar(seesaw(4, 0, 10), 'husband', { xp });
  const split = m.splitFromBreakdown(m.computeRewardBreakdown(quest, 'husband', s.characters, m.SKILL_POOL));
  const granted = m.grantRewards(s.characters, split).characters;
  const undone = m.revokeRewards(granted, { husband: split.husband.xp, wife: 0 }, { husband: split.husband.gold, wife: 0 });
  assert.equal(undone.husband.gold, 0);
  assert.equal(undone.husband.xp, xp);
});

check('Seesaw sits under General, with its icon, both descriptions and its two tier pip rows', () => {
  assert.ok(m.matchesSkillFilter(skill('seesaw'), 'general'));
  assert.equal(skill('seesaw').icon, 'seesaw');
  assert.match(source('src/components/ui/SkillIcon.tsx'), /seesaw: SortVertical/);
  assert.equal(m.translations.en['skill.seesaw.name'], 'Seesaw');
  assert.equal(m.translations.vi['skill.seesaw.name'], 'Bập bênh');
  assert.match(source('src/components/skills/SkillDescription.tsx'), /skills\.table\.goldBehind[\s\S]*skills\.table\.xpLeading/);
});

// --- Gold Interest: active days ------------------------------------------------------
const interest = (logs) => {
  let s = m.createInitialState(day(-5));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-5), endDate: day(20) }, logs };
  s = withChar(s, 'wife', { skills: [{ skillId: 'gold-interest', level: 4 }], gold: 500, interestOn: day(-1) });
  return m.applyDailyInterest(s, today).characters.wife.gold;
};

check('Gold Interest pays only the day after an on-time quest', () => {
  assert.equal(interest([]), 500, 'no quest yesterday');
  assert.equal(interest([log(day(-2), 'wife')]), 500, 'a quest the day before yesterday');
  assert.equal(interest([log(day(-1), 'wife', { late: true })]), 500, 'only a late quest');
  assert.equal(interest([log(day(-1), 'husband')]), 500, "the spouse's quest");
  assert.equal(interest([log(day(-1), 'wife')]), 520, '4% of 500');
  assert.equal(interest([log(day(-1), 'both')]), 520, 'a Both quest counts');
});

// --- Fortune's Favor -------------------------------------------------------------------
check("Fortune's Favor: 2 Normal Tickets per level-up at every level, none per Chronicle", () => {
  for (const level of [1, 2, 3, 4]) {
    const s = withChar(m.createInitialState(today), 'husband', { skills: [{ skillId: 'fortunes-favor', level }] });
    const { characters } = m.grantRewards(s.characters, { husband: { xp: m.XP_CURVE[0], gold: 0 }, wife: { xp: 0, gold: 0 } });
    assert.equal(characters.husband.tickets, 2, `level ${level}`);
  }
  assert.doesNotMatch(source('src/utils/gameState.ts'), /bonusTickets/);
  assert.doesNotMatch(m.translations.en['skill.fortunesFavor.desc'], /Chronicle/);
});

check('a value that is the same at every level is shown once (no "2 / 2 / 2 / 2", no "2 → 2")', () => {
  assert.match(source('src/components/skills/SkillsView.tsx'), /const same = values\.every\(\(value\) => value === values\[0\]\);/);
  assert.match(source('src/components/skills/SkillDescription.tsx'), /const next = exact \|\| values\[level\] === current \? undefined : values\[level\];/);
});

// --- Quests and streaks ------------------------------------------------------------------
check('quest values (v1.9.0): laundry +2 gold; 30+ gold -5 but never below XP', () => {
  const expected = {
    laundry: [8, 10], collectClothes: [8, 10], dryClothes: [10, 12], changeSheets: [13, 17],
    dishesLunch: [28, 28], dishesDinner: [28, 28], cookLunch: [40, 40], cooking: [40, 40], cookPetFood: [40, 40],
    grocery: [45, 45], mop: [42, 42], bathroom: [55, 60], vacuum: [42, 42],
  };
  for (const [id, values] of Object.entries(expected)) {
    const task = m.DEFAULT_TASKS.find((t) => t.id === id);
    assert.deepEqual([task.xp, task.gold], values, id);
  }
  for (const task of m.DEFAULT_TASKS) if (task.gold >= 28) assert.ok(task.gold >= task.xp, `${task.id}: at least 1 gold per XP`);
});

check('saved quests on v1.8 values move to v1.9; edited ones stay', () => {
  const v18 = {
    laundry: [8, 8, 'quick'], collectClothes: [8, 8, 'quick'], dryClothes: [10, 10, 'quick'], changeSheets: [13, 15, 'main'],
    dishesLunch: [28, 30, 'main'], dishesDinner: [28, 30, 'main'], cookLunch: [40, 42, 'main'], cooking: [40, 42, 'main'],
    cookPetFood: [40, 42, 'main'], grocery: [45, 50, 'heavy'], mop: [42, 45, 'heavy'], bathroom: [55, 65, 'heavy'],
  };
  for (const [id, [xp, gold, group]] of Object.entries(v18)) {
    const task = m.DEFAULT_TASKS.find((t) => t.id === id);
    const moved = m.rebalanceTask({ id, xp, gold, group });
    assert.deepEqual([moved.xp, moved.gold, moved.group], [task.xp, task.gold, task.group], id);
  }
  const mop = m.rebalanceTask({ id: 'mop', xp: 45, gold: 50, group: 'heavy' });
  assert.deepEqual([mop.xp, mop.gold], [42, 42], 'v1.5 Mop goes through v1.8, then v1.9');
  const edited = { id: 'cooking', xp: 40, gold: 50, group: 'main' };
  assert.equal(m.rebalanceTask(edited), edited);
});

check('streak gold = streak length from day 3, up to 10', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 30].map(m.streakBonusGold), [0, 0, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10]);
  assert.equal(m.STREAK_MIN_DAYS, 3);
  assert.equal(m.STREAK_MAX_DAYS, 10);
});

// --- Get the app ---------------------------------------------------------------------------
const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  mac17: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  mac16: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  zalo: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Zalo android/12',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  linuxChrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

check('Get the app: device, browser and in-app browser detection', () => {
  assert.equal(m.detectPlatform(UA.iphone), 'ios');
  assert.equal(m.detectPlatform(UA.ipad, '', 5), 'ios', 'iPadOS calls itself a Mac but has a touch screen');
  assert.equal(m.detectPlatform(UA.mac17, '', 0), 'other');
  assert.equal(m.detectPlatform(UA.android), 'android');
  assert.equal(m.detectPlatform(UA.chrome), 'windows');
  assert.equal(m.detectPlatform(UA.linuxChrome), 'other');
  assert.equal(m.detectPlatform('anything', 'Windows'), 'windows', 'userAgentData first');
  assert.equal(m.detectBrowser(UA.edge), 'edge');
  assert.equal(m.detectBrowser(UA.samsung), 'samsung');
  assert.equal(m.detectBrowser(UA.chrome), 'chrome');
  assert.equal(m.detectBrowser(UA.firefox), 'firefox');
  assert.equal(m.detectBrowser(UA.mac17), 'safari');
  assert.equal(m.isInAppBrowser(UA.zalo), true);
  assert.equal(m.isInAppBrowser('Mozilla/5.0 [FBAN/FBIOS;FBAV/450.0]'), true);
  assert.equal(m.isInAppBrowser(UA.chrome), false);
});

check('Get the app: the guide for each device', () => {
  const steps = (ua, touch = 0) => m.installGuideSteps(m.detectPlatform(ua, '', touch), m.detectBrowser(ua), ua, m.isInAppBrowser(ua)).map((s) => s.text);
  assert.deepEqual(steps(UA.iphone), ['install.step.iosShare', 'install.step.iosAdd']);
  assert.deepEqual(steps(UA.ipad, 5), ['install.step.iosShare', 'install.step.iosAdd']);
  assert.deepEqual(steps(UA.android), ['install.step.androidMenu', 'install.step.androidAdd', 'install.step.androidChrome']);
  assert.deepEqual(steps(UA.zalo), ['install.step.openBrowser', 'install.step.androidMenu', 'install.step.androidAdd']);
  assert.deepEqual(steps(UA.edge), ['install.step.edgeMenu', 'install.step.edgeInstall']);
  assert.deepEqual(steps(UA.chrome), ['install.step.chromeMenu', 'install.step.chromeInstall', 'install.step.chromeIcon']);
  assert.deepEqual(steps(UA.linuxChrome), ['install.step.chromeMenu', 'install.step.chromeInstall', 'install.step.chromeIcon']);
  assert.deepEqual(steps(UA.firefox), ['install.step.unsupported']);
  assert.deepEqual(steps(UA.mac17), ['install.step.safariDock']);
  assert.deepEqual(steps(UA.mac16), ['install.step.unsupported'], 'Add to Dock needs Safari 17');
  // Every step has both languages.
  const keys = new Set(Object.values(UA).flatMap((ua) => [0, 5].flatMap((touch) => steps(ua, touch))));
  for (const key of keys) for (const language of ['en', 'vi']) assert.ok(m.translations[language][key], `${language} ${key}`);
});

check('Get the app shows on the sign-in screen, the top bar (phones), the side menu, the More drawer and Settings', () => {
  const auth = source('src/components/auth/AuthScreen.tsx');
  assert.match(auth, /<InstallButton variant="banner" \/>/, 'a big banner on the sign-in screen');
  assert.ok(auth.indexOf('<InstallButton variant="banner" />') < auth.indexOf('<CabinScene />'), 'right under the title');
  assert.match(source('src/index.css'), /prefers-reduced-motion: reduce\) \{\s*\.bob,\s*\.px-nudge,/, 'its animation stops for reduced motion');
  for (const language of ['en', 'vi']) assert.ok(m.translations[language]['install.bannerTitle'] && m.translations[language]['install.bannerBody'], language);
  assert.match(source('src/App.tsx'), /<InstallButton variant="icon" className="md:hidden" \/>/);
  const nav = source('src/components/auth/Navigation.tsx');
  assert.match(nav, /<InstallButton variant="menu" menuItem onPrompted=/);
  assert.match(nav, /<InstallButton variant="menu" \/>/);
  assert.match(source('src/components/settings/InstallAppCard.tsx'), /<InstallButton variant="card" \/>/);
  const prompt = source('src/utils/installPrompt.ts');
  assert.match(prompt, /return !installed && !isInstalledApp\(\);/, 'hidden in the installed app and after installing');
  assert.match(source('src/utils/pwaMode.ts'), /export function isInstalledApp/);
  for (const language of ['en', 'vi']) assert.ok(m.translations[language]['install.button'], language);
});

// --- Fix an entry ---------------------------------------------------------------------------
const atLevel7 = (extraXp, points = 7) => {
  const xp = m.xpAtLevelStart(7) + extraXp;
  return withChar(m.createInitialState(today), 'wife', { xp, skills: [{ skillId: 'gold-doubler', level: 4 }, { skillId: 'master-chef', level: points - 4 }] });
};

check('fixing an entry keeps a level whose skill points are spent: level 7, 10 XP, -20 XP -> level 7, -10 XP', () => {
  const s = atLevel7(10);
  const after = m.revokeRewards(s.characters, { husband: 0, wife: 20 }, { husband: 0, wife: 0 });
  assert.equal(m.getLevelFromXp(after.wife.xp), 7, 'level kept');
  assert.equal(after.wife.xpDebt, 10);
  const progress = m.characterXpProgress(after.wife);
  assert.equal(progress.level, 7);
  assert.equal(progress.currentInLevel, -10, 'text shows -10 XP');
  assert.equal(progress.percent, 0, 'bars show it as empty');
  assert.equal(after.wife.gold, s.characters.wife.gold, 'no level-up gold taken back, since the level stays');
  // Losing more grows the debt; new XP pays it back first.
  const deeper = m.revokeRewards(after, { husband: 0, wife: 5 }, { husband: 0, wife: 0 });
  assert.equal(deeper.wife.xpDebt, 15);
  const paid = m.grantRewards(deeper, { husband: { xp: 0, gold: 0 }, wife: { xp: 20, gold: 0 } }).characters;
  assert.equal(paid.wife.xpDebt, undefined);
  assert.equal(m.characterXpProgress(paid.wife).currentInLevel, 5);
  const partly = m.grantRewards(deeper, { husband: { xp: 0, gold: 0 }, wife: { xp: 6, gold: 0 } }).characters;
  assert.equal(partly.wife.xpDebt, 9);
  assert.equal(partly.wife.xp, m.xpAtLevelStart(7));
});

check('with points left unspent, the level drops as before (and its level-up gold goes back)', () => {
  const s = withChar(atLevel7(10, 6), 'wife', { gold: 500 }); // 6 of 7 points spent: level 6 still covers them
  const after = m.revokeRewards(s.characters, { husband: 0, wife: 20 }, { husband: 0, wife: 0 });
  assert.equal(m.getLevelFromXp(after.wife.xp), 6);
  assert.equal(after.wife.xp, m.xpAtLevelStart(7) - 10);
  assert.equal(after.wife.xpDebt, undefined);
  assert.equal(after.wife.gold, 500 - m.getLevelUpGold(7));
});

check('XP owed survives a save and load, bad values are dropped, and a New Legend reset clears it', () => {
  const s = withChar(atLevel7(0), 'wife', { xpDebt: 12 });
  const back = m.fromHouseholdDoc(m.toHouseholdSections(s), today);
  assert.equal(back.characters.wife.xpDebt, 12);
  const bad = m.parseGameState(withChar(s, 'wife', { xpDebt: -4 }), today);
  assert.equal('xpDebt' in bad.characters.wife, false);
  assert.equal('xpDebt' in m.resetLevelsAndSkills(s).characters.wife, false);
});

check('either player can fix any entry: today\'s, and late ones while the late window is open', () => {
  const ctx = source('src/context/GameContext.tsx');
  const rule = ctx.slice(ctx.indexOf('const canManageLog = useCallback('), ctx.indexOf('[canPlay, yesterdayOpen],'));
  assert.doesNotMatch(rule, /loggedBy|myCharacter|isModerator/, 'whoever did or logged it');
  assert.match(rule, /if \(log\.late\) return log\.date === addDays\(todayKey, -1\) && yesterdayOpen\(\);/);
  assert.match(rule, /return log\.date === todayKey;/, "yesterday's on-time entries stay locked");
  assert.doesNotMatch(ctx, /skillsSpent/, 'fixing never refuses over spent skill points');
  assert.match(source('src/components/tasks/TaskCard.tsx'), /canFix && <IconButton icon=\{Undo\}/, 'Fix shows in the Yesterday view too');
  assert.match(source('src/components/tasks/TasksView.tsx'), /lateQuests\.length > 0 \|\| lateEntries/);
  assert.equal(m.translations.en['tasks.error.skillsSpent'], undefined);
});

// --- Lucky Quest of the Day -------------------------------------------------------------------
check('Lucky Quest: one enabled quest a day, the same on every device, whatever the list order', () => {
  const tasks = m.DEFAULT_TASKS;
  const id = m.luckyQuestId(tasks, '2026-11-19');
  assert.ok(tasks.some((task) => task.id === id && task.enabled));
  assert.equal(m.luckyQuestId([...tasks].reverse(), '2026-11-19'), id, 'order does not matter');
  assert.equal(m.luckyQuestId(tasks, '2026-11-19'), id, 'stable');
  const off = tasks.map((task) => (task.id === id ? { ...task, enabled: false } : task));
  assert.notEqual(m.luckyQuestId(off, '2026-11-19'), id, 'never a disabled quest');
  assert.equal(m.luckyQuestId([], '2026-11-19'), null);
  // Over two months it moves around the list.
  const picks = new Set(Array.from({ length: 60 }, (_, i) => m.luckyQuestId(tasks, m.addDays('2026-11-01', i))));
  assert.ok(picks.size >= 10, `${picks.size} different quests`);
});

check('Lucky Quest doubles the base gold (not XP) before skills, streaks and the Both split', () => {
  const task = { xp: 40, gold: 40, category: 'cooking', group: 'main' };
  assert.deepEqual(m.luckyBase(task, true), { ...task, gold: 80 });
  assert.equal(m.luckyBase(task, false), task);
  let s = withChar(m.createInitialState(today), 'wife', { skills: [{ skillId: 'master-chef', level: 1 }] });
  const r = m.computeRewardBreakdown(m.luckyBase(task, true), 'both', s.characters, m.SKILL_POOL, { wife: 3 });
  close(r.wife.baseGold, 40);
  close(r.wife.gold, 40 * (1 + skill('master-chef').effect.gold[0]) + m.streakBonusGold(3));
  close(r.wife.xp, 20 * (1 + skill('master-chef').effect.xp[0]));
});

check('Lucky Quest: on-time completions only, stored on the log; shown on the quest and the Today card', () => {
  const ctx = source('src/context/GameContext.tsx');
  assert.match(ctx, /const lucky = !late && luckyQuestId\(current\.tasks, date\) === task\.id;/);
  assert.match(ctx, /const base = luckyBase\(intensityBase\(task, intensity\), lucky\);/);
  assert.match(ctx, /\.\.\.\(lucky \? \{ lucky: true \} : \{\}\)/);
  assert.match(ctx, /luckyBase\(intensityBase\(task, options\?\.intensity\), lucky\)/, 'the reward preview shows it');
  assert.match(source('src/components/tasks/TasksView.tsx'), /lucky=\{!showingYesterday && task\.id === luckyTaskId\}/);
  assert.match(source('src/components/tasks/TaskCard.tsx'), /lucky \? task\.gold \* LUCKY_GOLD_MULTIPLIER/);
  assert.match(source('src/components/dashboard/TodayCard.tsx'), /t\('today\.lucky', \{ quest: taskName\(lucky, language\) \}\)/);
  for (const language of ['en', 'vi']) for (const key of ['lucky.title', 'lucky.help', 'today.lucky']) assert.ok(m.translations[language][key], `${language} ${key}`);
});

// --- Chronicle results ---------------------------------------------------------------------------
/** A chronicle from day -12 to day -3 (10 days), finished, with two quests and a spin. */
const ended = () => {
  let s = m.createInitialState(day(-20));
  s = { ...s, chronicle: { ...s.chronicle, id: 1, startDate: day(-12), endDate: day(-3) }, mvpSettledOn: day(-13), freezesSettledOn: day(-13) };
  const xp = m.XP_CURVE[0]; // the wife's quest takes her from level 1 to 2: +50 level-up gold
  s = withChar(s, 'wife', { xp, gold: 40 + 50 + 15 });
  s = withChar(s, 'husband', { gold: 30 });
  s = {
    ...s,
    logs: [
      log(day(-12), 'husband', { taskId: 'trash', xpAwarded: { husband: 5, wife: 0 }, goldAwarded: { husband: 30, wife: 0 } }),
      log(day(-10), 'wife', { taskId: 'cooking', xpAwarded: { husband: 0, wife: xp }, goldAwarded: { husband: 0, wife: 40 }, lucky: true }),
    ],
    events: [{ id: 'spin-1', type: 'spin', characterId: 'wife', date: day(-5), timestamp: 1, prize: 'big', gold: 15, ticket: 'normal' }],
  };
  return withChar(s, 'husband', { xp: 5 });
};

check('the gold race is rebuilt day by day, level-up gold included, and matches the final gold', () => {
  const s = ended();
  const race = m.goldRace(s.chronicle, s.logs, s.events, { husband: 5, wife: m.XP_CURVE[0] });
  assert.equal(race.husband.length, 10);
  assert.deepEqual(race.husband, [30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
  assert.deepEqual(race.wife, [0, 0, 90, 90, 90, 90, 90, 105, 105, 105], 'quest gold + level-up gold on day 3, the spin on day 8');
  assert.equal(race.wife.at(-1), s.characters.wife.gold);
});

check('the rollover saves the race, the quests done together and Lucky Quests, and counts the win', () => {
  const next = m.advanceDays(ended(), today);
  const stats = next.prizeHistory[0].stats;
  assert.equal(stats.totalQuests, 2);
  assert.equal(stats.players.wife.lucky, 1);
  assert.equal(stats.players.husband.lucky, 0);
  assert.deepEqual(stats.goldByDay.wife.at(-1), 105);
  assert.equal(next.characters.wife.chronicleWins, 1, 'most gold wins');
  assert.equal('chronicleWins' in next.characters.husband, false);
  assert.deepEqual(m.chronicleWinners({ goldSnapshot: { husband: 5, wife: 5 } }), ['husband', 'wife'], 'a tie counts for both');
  assert.deepEqual(m.chronicleWinners({ goldSnapshot: { husband: 0, wife: 0 } }), [], 'nobody earned gold');
  // The race and the win survive a save and load.
  const back = m.fromHouseholdDoc(m.toHouseholdSections(next), today);
  assert.deepEqual(back.prizeHistory[0].stats.goldByDay, stats.goldByDay);
  assert.equal(back.characters.wife.chronicleWins, 1);
});

check('saves from before v1.9 count their wins from the kept results', () => {
  const s = m.createInitialState(day(-5));
  const result = (chronicleId, husband, wife) => ({ chronicleId, startDate: day(-90), endDate: day(-61), prizePool: 1, payout: { husband: 0, wife: 0 }, goldSnapshot: { husband, wife } });
  const raw = { ...s, prizeHistory: [result(3, 10, 20), result(2, 30, 30), result(1, 50, 10)] };
  delete raw.characters.husband.chronicleWins;
  const loaded = m.parseGameState(JSON.parse(JSON.stringify(raw)), today, false);
  assert.equal(loaded.characters.husband.chronicleWins, 2, 'chronicle 1 and the tie in chronicle 2');
  assert.equal(loaded.characters.wife.chronicleWins, 2, 'chronicle 3 and the tie');
});

check('the winner picks a theme or 2 Golden Tickets; only the tickets once every theme is unlocked', () => {
  const s = m.advanceDays(ended(), today);
  assert.equal(m.WINNER_GOLDEN_TICKETS, 2);
  const offer = m.rewardOffer(s, 'wife');
  assert.equal(offer.theme, true);
  assert.equal(offer.tickets, true);
  assert.equal(m.rewardOffer(s, 'husband').tickets, false, 'not the loser');
  const before = s.characters.wife.goldenTickets;
  const took = m.claimRewardOnState(s, 'wife', 'tickets');
  assert.equal(took.characters.wife.goldenTickets, before + 2);
  assert.equal(m.rewardOffer(took, 'wife').theme, false, 'tickets taken: no theme any more');
  assert.equal(m.rewardOffer(took, 'wife').tickets, false);
  assert.equal(m.claimRewardOnState(took, 'wife', 'tickets'), 'cosmetics.error.noReward', 'once');
  const themed = m.claimRewardOnState(s, 'wife', 'theme', 'forest');
  assert.equal(m.rewardOffer(themed, 'wife').tickets, false, 'theme taken: no tickets');
  const allThemes = { ...s, cosmetics: { ...s.cosmetics, themes: m.THEMES.filter((t) => t !== m.DEFAULT_THEME) } };
  assert.deepEqual([m.rewardOffer(allThemes, 'wife').theme, m.rewardOffer(allThemes, 'wife').tickets], [false, true]);
  // The tickets reward survives a save and load.
  const back = m.fromHouseholdDoc(m.toHouseholdSections(took), today);
  assert.ok(back.cosmetics.rewards.some((reward) => reward.kind === 'tickets' && reward.item === 'goldenTickets'));
});

check('the reigning champion is crowned for the whole next chronicle', () => {
  const s = m.advanceDays(ended(), today);
  assert.deepEqual(m.reigningChampions(s), ['wife']);
  assert.deepEqual(m.reigningChampions({ ...s, chronicle: { ...s.chronicle, id: s.chronicle.id + 1 } }), [], 'not the one after');
  assert.deepEqual(m.reigningChampions(m.createInitialState(today)), []);
});

check('the results tell the story: margin, quests together, change since last time, Lucky Quests, awards, race', () => {
  const s = m.advanceDays(ended(), today);
  const previous = { chronicleId: 0, startDate: day(-60), endDate: day(-31), prizePool: 1, payout: { husband: 0, wife: 0 }, goldSnapshot: { husband: 60, wife: 50 } };
  const result = s.prizeHistory[0];
  const summary = m.chronicleSummary(result, { ...s, prizeHistory: [result, previous] });
  assert.equal(summary.winner, 'wife');
  assert.equal(summary.margin, 75);
  assert.equal(summary.totalQuests, 2);
  assert.equal(summary.players.wife.lucky, 1);
  assert.ok(summary.goldByDay);
  assert.ok(Array.isArray(summary.awards));
  assert.equal(summary.previousId, 0);
  assert.equal(summary.players.husband.goldChange, 30 / 60 - 1);
  assert.equal(summary.players.wife.goldChange, 105 / 50 - 1);
  // A chronicle archived before v1.9 (no race saved) has its race rebuilt while its log is kept.
  const { goldByDay: _race, ...oldStats } = result.stats;
  const old = { ...result, stats: oldStats };
  assert.deepEqual(m.chronicleSummary(old, s).goldByDay, result.stats.goldByDay);
  assert.equal(m.chronicleSummary(old, { logs: [] }).goldByDay, null, 'no log: no race');
});

check('results pop-up: awards, story and race; reopened from History; crown and wins on the card; rewards in their own dialog', () => {
  const modal = source('src/components/chronicle/ChronicleSummaryModal.tsx');
  assert.match(modal, /<GoldRaceChart goldByDay=\{summary\.goldByDay\} \/>/);
  assert.match(modal, /<ChronicleAwards awards=\{summary\.awards\} \/>/);
  assert.match(modal, /t\('summary\.margin'/);
  assert.match(modal, /t\('summary\.together'/);
  assert.match(source('src/components/history/PastChronicles.tsx'), /<ChronicleSummaryModal result=\{results\} reopened /);
  const card = source('src/components/dashboard/CharacterCard.tsx');
  assert.match(card, /reigningChampions\(state\)\.includes\(id\)/);
  assert.match(card, /t\('champion\.wins', \{ count: wins \}\)/);
  // Rewards are picked in their own dialog, which lists only what can be taken; the Wardrobe just links to it.
  const picker = source('src/components/cosmetics/RewardPickerModal.tsx');
  assert.match(picker, /THEMES\.filter\(\(item\) => item !== DEFAULT_THEME && !cosmetics\.themes\.includes\(item\)\)/, 'locked themes only');
  assert.match(picker, /AVATARS\[me\]\.filter\(\(item\) => item !== DEFAULT_AVATAR\[me\] && !cosmetics\.avatars\[me\]\.includes\(item\)\)/, 'locked avatars only');
  assert.match(picker, /\{reward\.tickets && \([\s\S]*\{reward\.theme && \([\s\S]*\{reward\.avatar && \(/, 'each section only when it can be taken');
  // The winner's prize reads as ONE choice: a "pick one" heading, the themes, OR, then the tickets.
  assert.match(picker, /'cosmetics\.winnerPick'[\s\S]*lockedThemes\.map[\s\S]*t\('cosmetics\.or'\)[\s\S]*t\('cosmetics\.prizeTickets'/);
  assert.match(picker, /take\('tickets'\)/);
  assert.match(picker, /'cosmetics\.claimPrize'/, 'claiming a theme says it is the prize');
  assert.doesNotMatch(picker.slice(picker.indexOf("t('cosmetics.or')") - 400, picker.indexOf("t('cosmetics.or')")), /font-arcade/, 'HOẶC needs a font with Vietnamese letters');
  const wardrobe = source('src/components/cosmetics/CosmeticPicker.tsx');
  assert.doesNotMatch(wardrobe, /claimReward|'pick'/, 'the Wardrobe claims nothing');
  assert.match(wardrobe, /onClick=\{onOpenRewards\}/);
  const app = source('src/App.tsx');
  assert.match(app, /<RewardBanner onOpen=\{\(\) => setRewardsOpen\(true\)\} \/>/);
  assert.match(app, /<StartupNotices onOpenRewards=\{\(\) => setRewardsOpen\(true\)\}/);
  assert.match(app, /<RewardPickerModal open=\{rewardsOpen\}/);
  const chart = source('src/components/chronicle/GoldRaceChart.tsx');
  assert.match(chart, /husband: 'var\(--chart-husband\)', wife: 'var\(--chart-wife\)'/, 'series colors come from the theme');
  // Each theme's pair, checked with the data-viz palette validator against that theme's parchment-50.
  const pairs = { 'src/index.css': ['#b04a34', '#8a5a9c'], 'src/themes/mushroom/theme.css': ['#d82800', '#6844fc'], 'src/themes/cottage/theme.css': ['#a8435f', '#7a5cb8'], 'src/themes/forest/theme.css': ['#b0552c', '#8a6ad0'] };
  for (const [file, [husband, wife]] of Object.entries(pairs)) {
    const css = source(file);
    assert.match(css, new RegExp(`--chart-husband: ${husband};`), file);
    assert.match(css, new RegExp(`--chart-wife: ${wife};`), file);
  }
  assert.match(chart, /<FloatingBubble/);
  assert.match(chart, /<table className="sr-only">/, 'a table view for screen readers');
  const keys = ['summary.margin', 'summary.together', 'summary.lucky', 'summary.change', 'summary.race', 'summary.raceDay', 'summary.done', 'archive.seeResults', 'champion.reigning', 'champion.reigningHelp', 'champion.wins', 'cosmetics.takeTickets', 'cosmetics.rewardHintWinnerAll', 'cosmetics.rewardHintWinner', 'cosmetics.rewardHintAvatarTickets', 'cosmetics.rewardHintTickets', 'cosmetics.winnerPick', 'cosmetics.prizeTheme', 'cosmetics.prizeTickets', 'cosmetics.or', 'cosmetics.take', 'cosmetics.claimPrize', 'cosmetics.winnerPrize', 'cosmetics.avatarPrize'];
  for (const language of ['en', 'vi']) for (const key of keys) assert.ok(m.translations[language][key], `${language} ${key}`);
});

check('demo: "Finish this Chronicle" plays a sample month and ends it, so its results can be tried', () => {
  const s = m.createInitialState(today);
  const next = m.finishDemoChronicle(s, today);
  assert.equal(next.chronicle.id, 2);
  assert.equal(next.chronicle.startDate, today, 'a new chronicle starts today');
  const result = next.prizeHistory[0];
  assert.equal(result.chronicleId, 1);
  assert.equal(result.startDate, m.addDays(today, -m.DEMO_CHRONICLE_DAYS));
  assert.equal(result.endDate, m.addDays(today, -1));
  assert.ok(result.stats.totalQuests > 20, `${result.stats.totalQuests} sample quests`);
  assert.equal(result.stats.goldByDay.husband.length, m.DEMO_CHRONICLE_DAYS);
  assert.equal(result.stats.goldByDay.wife.at(-1), Math.round(result.goldSnapshot.wife), 'the race ends at the payout gold');
  // Finishing again reuses the same days: the earlier sample month must not count twice.
  const again = m.finishDemoChronicle(next, today).prizeHistory[0];
  assert.equal(again.chronicleId, 2);
  for (const id of ['husband', 'wife']) assert.equal(again.stats.goldByDay[id].at(-1), Math.round(again.goldSnapshot[id]), `${id}: race = gold`);
  assert.ok(again.stats.totalQuests < result.stats.totalQuests * 1.5, 'quests of one month, not two');
  // A race that doesn't end at the final gold is never shown.
  const off = { ...result, goldSnapshot: { ...result.goldSnapshot, wife: result.goldSnapshot.wife / 2 } };
  assert.equal(m.raceMatchesGold(result.stats.goldByDay, result.goldSnapshot), true);
  assert.equal(m.chronicleSummary(off, next).goldByDay, null);
  assert.ok(result.stats.players.husband.lucky + result.stats.players.wife.lucky > 0, 'Lucky Quests in the sample');
  assert.ok(m.chronicleSummaryDue(next), 'the results pop-up is due');
  const [winner] = m.chronicleWinners(result);
  assert.equal(next.characters[winner].chronicleWins, 1);
  assert.deepEqual(m.reigningChampions(next), [winner]);
  assert.equal(m.rewardOffer(next, winner).tickets, true);
  assert.deepEqual(m.finishDemoChronicle(s, today).prizeHistory[0].goldSnapshot, result.goldSnapshot, 'the same day gives the same month');
  const settings = source('src/components/settings/SettingsView.tsx');
  assert.match(settings, /\{demoMode && <FinishDemoChronicle \/>\}/, 'demo only');
  assert.match(source('src/context/GameContext.tsx'), /demo\s*\? done\(commit\(\{ id: newOpId\(\), update: \(current\) => finishDemoChronicle\(current, localDateKey\(\)\) \}\)\.result\)\s*: fail\('household\.error\.notAllowed'\)/);
});

// --- Level curve ---------------------------------------------------------------------------
check('levels: the v1.9 XP curve; saved XP moves to it once, keeping level and progress', () => {
  assert.deepEqual([...m.XP_CURVE], [
    250, 400, 550, 800, 850, 925, 1050, 1150, 1225, 1300, 1375, 1450, 1525, 1600, 1675, 1750, 1825, 1900, 2000, 2200,
    2400, 2600, 2800, 3000, 4000, 5000, 6000, 7000, 8000,
  ]);
  assert.equal(m.xpAtLevelStart(30), 66600);
  const old = m.XP_CURVE_V18;
  const share = (xp, curve) => {
    const level = m.getLevelFromXp(xp, curve);
    return [level, (xp - m.xpAtLevelStart(level, curve)) / curve[level - 1]];
  };
  // Level and share of it kept, at a level start, mid-level, just below the next level, and past level 30.
  for (const xp of [0, 600, 3886.365, 6466.62, m.xpAtLevelStart(9, old) - 0.001, 26620, 54120 + 123]) {
    const moved = m.convertXp(xp, old, m.XP_CURVE);
    const [level, done] = share(xp, old);
    assert.equal(m.getLevelFromXp(moved), level, `${xp}: level kept`);
    if (level < 30) assert.ok(Math.abs(share(moved, m.XP_CURVE)[1] - done) < 0.001, `${xp}: progress kept`);
  }
  assert.equal(m.convertXp(54120 + 123, old, m.XP_CURVE), 66600 + 123, 'XP past level 30 is kept as it is');

  // An older household: moved once on load, with the time and each player's gain recorded.
  const fresh = m.createInitialState(today);
  assert.deepEqual(fresh.xpRescale, { version: '1.9.0', at: 0, delta: { husband: 0, wife: 0 } }, 'a new game starts on the new curve');
  assert.equal(m.rescaleXp(fresh), fresh);
  const { xpRescale: _marker, ...older } = withChar(withChar(fresh, 'wife', { xp: 6466.62 }), 'husband', { xp: m.xpAtLevelStart(7, old), xpDebt: 10 });
  const moved = m.rescaleXp(older, 1234);
  assert.equal(m.getLevelFromXp(moved.characters.wife.xp), 11);
  assert.equal(moved.characters.husband.xp, m.xpAtLevelStart(7), 'a level start stays a level start');
  assert.equal(moved.characters.husband.xpDebt, 10, 'owed XP stays owed');
  assert.equal(moved.xpRescale.at, 1234);
  assert.equal(moved.xpRescale.delta.wife, moved.characters.wife.xp - 6466.62);
  assert.equal(m.rescaleXp(moved), moved, 'once');
  const loaded = m.parseGameState(JSON.parse(JSON.stringify(older)), today);
  assert.equal(m.getLevelFromXp(loaded.characters.wife.xp), 11, 'moved on load');
  assert.equal(loaded.xpRescale.version, '1.9.0');
  assert.deepEqual(m.fromHouseholdDoc(m.toHouseholdSections(moved), today, false).xpRescale, moved.xpRescale, 'saved');
});

check('levels: a gold race across the XP move still adds up', () => {
  // 2,000 XP before the move (levels 1 -> 5 on the old curve: 4 level-ups), then 50 XP after it.
  const result = { startDate: '2026-11-01', endDate: '2026-11-02' };
  const at = Date.parse('2026-11-02T08:00:00');
  const s = m.rescaleXp(withChar({ ...m.createInitialState(today), xpRescale: undefined }, 'wife', { xp: 2000 }), at);
  const log = (date, time, xp) => ({ id: `${date}-${xp}`, taskId: 'dishes', date, completedBy: 'wife', timestamp: Date.parse(`${date}T${time}`), xpAwarded: { husband: 0, wife: xp }, goldAwarded: { husband: 0, wife: 0 } });
  const logs = [log('2026-11-01', '12:00:00', 2000), log('2026-11-02', '12:00:00', 50)];
  const xpNow = { husband: 0, wife: s.characters.wife.xp + 50 };
  assert.deepEqual(m.goldRace(result, logs, [], xpNow, s.xpRescale).wife, [200, 200]);
  assert.deepEqual(m.goldRace(result, logs, [], xpNow).wife, [150, 150], 'without the record it would be off');
  // A move before the chronicle began: all on the new curve.
  assert.deepEqual(m.goldRace({ startDate: '2026-11-03', endDate: '2026-11-03' }, [], [], xpNow, s.xpRescale).wife, [0]);
});

check('daily XP: +3 for claiming the daily ticket and for sending a heart, recorded for the gold race', () => {
  assert.equal(m.DAILY_TICKET_XP, 3);
  assert.equal(m.HEART_SENT_XP, 3);
  const s = m.createInitialState(today);
  const now = Date.parse(`${today}T09:00:00`);
  const claimed = m.claimDailyTicketOnState(s, 'wife', today, now);
  assert.equal(claimed.characters.wife.xp, 3);
  assert.equal(claimed.characters.wife.tickets, s.characters.wife.tickets + 1);
  assert.deepEqual(claimed.events[0], { id: `xp-ticket-wife-${today}`, type: 'xp', characterId: 'wife', date: today, timestamp: now, source: 'ticket', xp: 3, gold: 0 });
  assert.equal(m.claimDailyTicketOnState(claimed, 'wife', today, now), 'wheel.error.claimed', 'once a day');
  const hearted = m.sendHeartOnState(claimed, 'husband', today, now + 1);
  assert.equal(hearted.characters.husband.xp, 3, 'the sender gets the XP');
  assert.equal(hearted.characters.wife.xp, 3, 'the receiver gets the ticket, not XP');
  assert.equal(hearted.characters.wife.tickets, claimed.characters.wife.tickets + m.HEART_TICKETS);
  assert.equal(hearted.events[0].source, 'heart');
  // Like quest XP: owed XP is paid back first, and a level-up pays its gold.
  const owing = m.claimDailyTicketOnState(withChar(s, 'wife', { xp: m.XP_CURVE[0], xpDebt: 5 }), 'wife', today, now);
  assert.equal(owing.characters.wife.xpDebt, 2);
  const leveled = m.claimDailyTicketOnState(withChar(s, 'wife', { xp: m.XP_CURVE[0] - 1 }), 'wife', today, now);
  assert.equal(m.getLevelFromXp(leveled.characters.wife.xp), 2);
  assert.equal(leveled.characters.wife.gold, m.getLevelUpGold(2));
  // Saved, and replayed by the race: the level-up gold shows on the day it happened.
  const back = m.fromHouseholdDoc(m.toHouseholdSections(hearted), today, false);
  assert.deepEqual(back.events.slice(0, 2), hearted.events.slice(0, 2));
  const race = m.goldRace({ startDate: today, endDate: today }, leveled.logs, leveled.events, { husband: 0, wife: leveled.characters.wife.xp });
  assert.equal(race.wife[0], leveled.characters.wife.gold);
});

// --- Release -------------------------------------------------------------------------------
check("version and What's New are 1.9.0", () => {
  assert.equal(m.APP_VERSION, '1.9.0');
  assert.equal(JSON.parse(source('package.json')).version, '1.9.0');
  const lock = JSON.parse(source('package-lock.json'));
  assert.equal(lock.version, '1.9.0');
  assert.equal(lock.packages[''].version, '1.9.0');
  const { notes } = m.PATCH_NOTES[0];
  for (const section of Object.values(notes)) assert.equal(section.en.length, section.vi.length);
  // Balance is split into Skills and Quests; Vietnamese says "Tăng/Giảm sức mạnh" for buffs and nerfs.
  assert.equal(notes.balance, undefined);
  assert.ok(notes.skills.vi.some((line) => line.startsWith('Tăng sức mạnh:')) && notes.skills.vi.some((line) => line.startsWith('Giảm sức mạnh:')));
  assert.ok(!notes.skills.vi.some((line) => /\b(Buff|Nerf)\b/.test(line)));
  assert.ok(notes.quests.en.includes('Streak gold for days 3 to 10: now 3/4/5/6/7/8/9/10 instead of 1/1/2/3/5/8/13/21.'));
  assert.deepEqual(m.BALANCE_PARTS, ['levels', 'skills', 'quests']);
  assert.equal(notes.levels.en[0], 'Leveling now needs more XP.');
  for (const language of ['en', 'vi']) for (const part of m.BALANCE_PARTS) assert.ok(m.translations[language][`patch.section.${part}`]);
  assert.match(source('src/components/settings/PatchNotesModal.tsx'), /BALANCE_PARTS\.filter/);
  assert.match(source('CHANGELOG.md'), /## \[1\.9\.0\] - \d{4}-\d{2}-\d{2}\r?\n\r?\nSpec: \[UPDATE_v1\.9\.0\.md\]/);
  assert.ok(existsSync(new URL('../UPDATE_v1.9.0.md', import.meta.url)));
});

console.log(`\n${passed} checks passed`);
