// Node checks for the pure household/chronicle/reward logic (bundled from src with esbuild).
import assert from 'node:assert/strict';
import * as calc from './.build/logic.mjs';

const { SKILL_POOL } = calc;
let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log('ok -', name);
};

test('date math', () => {
  assert.equal(calc.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(calc.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(calc.addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(calc.dayCount('2026-10-01', '2026-10-31'), 31);
  assert.deepEqual(
    (({ startDate, endDate }) => ({ startDate, endDate }))(calc.defaultChronicle(1, '2026-10-01')),
    { startDate: '2026-10-01', endDate: '2026-10-31' },
  );
  assert.equal(calc.defaultChronicle(1, '2026-10-15').endDate, '2026-11-14');
  assert.equal(calc.endOfDayMs('2026-10-31'), new Date(2026, 10, 1).getTime());
});

test('household codes', () => {
  const codes = new Set(Array.from({ length: 2000 }, () => calc.generateHouseholdCode()));
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(codes.size > 1990, 'codes should be practically unique');
  assert.equal(calc.normalizeHouseholdCode(' a7k-9x2z '), 'A7K9X2');
});

test('rollover settles gold, keeps xp/skills, starts next day', () => {
  const s = calc.createInitialState('2026-10-01');
  s.characters.husband.gold = 300;
  s.characters.wife.gold = 100;
  s.characters.husband.xp = 500;
  s.characters.husband.skills = [{ skillId: 'gold-doubler', level: 1 }];
  assert.equal(calc.applyChronicleRollover(s, '2026-10-31'), s, 'no rollover on the last day');
  const r = calc.applyChronicleRollover(s, '2026-11-01');
  assert.deepEqual(r.chronicle, { id: 2, startDate: '2026-11-01', endDate: '2026-11-30', endsAtMs: calc.endOfDayMs('2026-11-30') });
  assert.equal(r.characters.husband.gold, 0);
  assert.equal(r.characters.wife.gold, 0);
  assert.equal(r.characters.husband.xp, 500);
  assert.equal(r.characters.husband.skills.length, 1);
  assert.equal(r.prizeHistory[0].payout.husband, 750_000);
  assert.equal(r.prizeHistory[0].payout.wife, 250_000);
});

test('rollover skips whole idle periods', () => {
  const s = calc.createInitialState('2026-01-01');
  const r = calc.applyChronicleRollover(s, '2026-04-10');
  assert.equal(r.chronicle.startDate, '2026-04-01');
  assert.equal(r.chronicle.id, 4);
  assert.equal(r.prizeHistory.length, 1, 'only the played chronicle is recorded');
});

test('legacy month-based data migrates to a chronicle', () => {
  const legacy = {
    characters: { husband: { id: 'husband', name: 'Husband', xp: 10, gold: 5, skills: [] }, wife: { id: 'wife', name: 'Wife', xp: 0, gold: 0, skills: [] } },
    tasks: [], logs: [], prizePool: 500000, activeMonth: '2026-10', language: 'vi', activeCharacter: 'wife',
    prizeHistory: [{ month: '2026-09', prizePool: 1, settled: true, payout: { husband: 1, wife: 2 }, goldSnapshot: { husband: 3, wife: 4 } }],
  };
  const s = calc.parseGameState(legacy, '2026-10-05');
  assert.equal(s.chronicle.startDate, '2026-10-01');
  assert.equal(s.chronicle.endDate, '2026-10-31');
  assert.equal(s.characters.husband.gold, 5, 'same month: no reset');
  assert.equal(s.prizeHistory[0].startDate, '2026-09-01');
  assert.equal(s.prizeHistory[0].endDate, '2026-09-30');
  assert.ok(s.tasks.length > 0, 'default tasks restored');
  assert.equal('language' in s, false);
});

test('household sections round-trip and field-level patches', () => {
  const s = calc.createInitialState('2026-10-01');
  const doc = { code: 'ABCDEF', ...calc.toHouseholdSections(s) };
  assert.deepEqual(calc.fromHouseholdDoc(doc, '2026-10-01'), s);
  const played = { ...s, characters: { ...s.characters, wife: { ...s.characters.wife, xp: 10 } } };
  assert.deepEqual(Object.keys(calc.householdPatch(s, played)), ['game.characters.wife']);
  assert.deepEqual(Object.keys(calc.householdPatch(s, { ...s, prizePool: 1 })), ['settings.prizePool']);
});

test('grant then revoke restores characters (incl. level-up bonus gold)', () => {
  const s = calc.createInitialState('2026-10-01');
  s.characters.husband.xp = 220; // 10 XP from level 2
  const split = calc.computeRewardSplit({ xp: 30, gold: 20, category: 'cleaning' }, 'husband', s.characters, SKILL_POOL, 10);
  const { characters, levelUps } = calc.grantRewards(s.characters, split);
  assert.deepEqual(levelUps, [{ characterId: 'husband', from: 1, to: 2, bonusGold: 50, goldenTickets: 1, tickets: 0, skillPoints: 1 }]);
  assert.equal(characters.husband.gold, 70);
  const back = calc.revokeRewards(characters, { husband: split.husband.xp, wife: 0 }, { husband: split.husband.gold, wife: 0 });
  assert.equal(back.ok, true);
  // Tickets stay paid out (no farming by undo + redo); everything else is restored.
  assert.deepEqual(back.characters, { ...s.characters, husband: { ...s.characters.husband, goldenTickets: 1, ticketLevel: 2 } });
});

test('revoke refuses when the lost level\'s skill point was spent', () => {
  const s = calc.createInitialState('2026-10-01');
  s.characters.wife.xp = 230; // level 2
  s.characters.wife.skills = [{ skillId: 'zen-housekeeper', level: 2 }];
  const r = calc.revokeRewards(s.characters, { husband: 0, wife: 30 }, { husband: 0, wife: 0 });
  assert.deepEqual(r, { ok: false, characterId: 'wife' });
});

test('both splits 50/50 and re-assign moves rewards', () => {
  const s = calc.createInitialState('2026-10-01');
  const base = { xp: 50, gold: 40, category: 'cooking' };
  const both = calc.computeRewardSplit(base, 'both', s.characters, SKILL_POOL, 12);
  assert.deepEqual(both, { husband: { xp: 25, gold: 20 }, wife: { xp: 25, gold: 20 } });
  const granted = calc.grantRewards(s.characters, both).characters;
  const revoked = calc.revokeRewards(granted, { husband: 25, wife: 25 }, { husband: 20, wife: 20 });
  const wifeOnly = calc.computeRewardSplit(base, 'wife', revoked.characters, SKILL_POOL, 12);
  const after = calc.grantRewards(revoked.characters, wifeOnly).characters;
  assert.equal(after.husband.xp, 0);
  assert.equal(after.husband.gold, 0);
  assert.equal(after.wife.xp, 50);
  assert.equal(after.wife.gold, 40);
});

console.log(`\n${passed} passed`);
