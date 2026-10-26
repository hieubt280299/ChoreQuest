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
const base = () => m.createInitialState(day(-10));

// --- Tickets on level-up --------------------------------------------------
check('level 1 -> 3 grants 2 Golden Tickets and 2 skill points; marker moves to 3', () => {
  const s = base();
  const xp = m.XP_CURVE[0] + m.XP_CURVE[1]; // exactly level 3
  const { characters, levelUps } = m.grantRewards(s.characters, { husband: { xp, gold: 0 }, wife: { xp: 0, gold: 0 } });
  assert.equal(m.getLevelFromXp(characters.husband.xp), 3);
  assert.equal(characters.husband.goldenTickets, 2);
  assert.equal(characters.husband.tickets, 0, 'no Normal Tickets without Fortune\'s Favor');
  assert.equal(characters.husband.ticketLevel, 3);
  assert.deepEqual(
    { goldenTickets: levelUps[0].goldenTickets, tickets: levelUps[0].tickets, skillPoints: levelUps[0].skillPoints, from: levelUps[0].from, to: levelUps[0].to },
    { goldenTickets: 2, tickets: 0, skillPoints: 2, from: 1, to: 3 },
  );
});

check('undo then redo a level-up does not pay tickets twice', () => {
  const s = base();
  const xp = m.XP_CURVE[0];
  const first = m.grantRewards(s.characters, { husband: { xp, gold: 5 }, wife: { xp: 0, gold: 0 } });
  assert.equal(first.characters.husband.goldenTickets, 1);
  const undone = m.revokeRewards(first.characters, { husband: xp, wife: 0 }, { husband: 5, wife: 0 });
  assert.ok(undone.ok);
  assert.equal(undone.characters.husband.goldenTickets, 1, 'tickets are kept on undo');
  const again = m.grantRewards(undone.characters, { husband: { xp, gold: 5 }, wife: { xp: 0, gold: 0 } });
  assert.equal(again.characters.husband.goldenTickets, 1, 'no second ticket for the same level');
  assert.equal(again.levelUps[0].goldenTickets, 0);
});

// --- Wheel odds -----------------------------------------------------------
check('prize table maps the roll to 35 / 30 / 15 / 2 / 18', () => {
  const at = (r) => m.rollWheelPrize(() => r);
  assert.equal(at(0), 'small');
  assert.equal(at(0.3499), 'small');
  assert.equal(at(0.35), 'normal');
  assert.equal(at(0.6499), 'normal');
  assert.equal(at(0.65), 'big');
  assert.equal(at(0.7999), 'big');
  assert.equal(at(0.8), 'jackpot');
  assert.equal(at(0.8199), 'jackpot');
  assert.equal(at(0.82), 'none');
  assert.equal(at(0.99999), 'none');
});

check('random rolls land near the published odds', () => {
  const counts = { small: 0, normal: 0, big: 0, jackpot: 0, none: 0 };
  const n = 200000;
  for (let i = 0; i < n; i += 1) counts[m.rollWheelPrize()] += 1;
  const expect = { small: 0.35, normal: 0.3, big: 0.15, jackpot: 0.02, none: 0.18 };
  for (const [prize, p] of Object.entries(expect)) assert.ok(Math.abs(counts[prize] / n - p) < 0.01, `${prize} ${counts[prize] / n}`);
});

check('misses grow the jackpot by 10, a jackpot pays 500 + bonus and resets it', () => {
  let wheel = { jackpotBonus: 0 };
  wheel = m.nextWheelState('none', wheel);
  wheel = m.nextWheelState('none', wheel);
  wheel = m.nextWheelState('small', wheel);
  assert.equal(wheel.jackpotBonus, 20);
  assert.equal(m.prizeGold('jackpot', wheel), 520);
  assert.equal(m.prizeGold('big', wheel), 15);
  assert.equal(m.prizeGold('none', wheel), 0);
  assert.equal(m.nextWheelState('jackpot', wheel).jackpotBonus, 0);
});

// --- Gold Interest --------------------------------------------------------
const withSkill = (state, id, skillId, level, extra = {}) => ({
  ...state,
  characters: {
    ...state.characters,
    [id]: { ...state.characters[id], skills: [...state.characters[id].skills, { skillId, level }], ...extra },
  },
});

check('interest adds rate x current gold each new day (compounding) and logs it for the day log', () => {
  const s = withSkill({ ...base(), chronicle: { ...base().chronicle, endDate: day(20) } }, 'wife', 'gold-interest', 2, {
    gold: 100,
    interestOn: day(-3),
  });
  const next = m.applyDailyInterest(s, today);
  // Level 2 = 3% a day on current gold (v1.5): 100 -> 103 -> 106 (3.09) -> 109 (3.18)
  assert.equal(next.characters.wife.gold, 109, 'interest is ordinary gold (counts for the payout)');
  assert.equal(next.characters.wife.interestOn, today);
  assert.equal('interestGold' in next.characters.wife, false);
  assert.deepEqual(next.events.filter((e) => e.type === 'interest').map((e) => [e.date, e.gold]).sort(), [
    [day(-2), 3],
    [day(-1), 3],
    [today, 3],
  ]);
  assert.equal(m.applyDailyInterest(next, today), next, 'same day again: no change');
});

check('learning the skill without a start date only sets the marker', () => {
  const s = withSkill(base(), 'husband', 'gold-interest', 1, { gold: 500 });
  const next = m.applyDailyInterest(s, today);
  assert.equal(next.characters.husband.gold, 500);
  assert.equal(next.characters.husband.interestOn, today);
});

check("a chronicle's first day never pays interest", () => {
  let s = { ...base(), chronicle: { ...base().chronicle, startDate: today, endDate: day(20) } };
  s = withSkill(s, 'husband', 'gold-interest', 4, { gold: 100, interestOn: day(-1) });
  const next = m.applyDailyInterest(s, today);
  assert.equal(next.characters.husband.gold, 100);
  assert.equal(next.events.length, 0);
});

check('rounding: 2% of 30 gold is 1 a day; 2% of 20 is 0 (no event)', () => {
  const a = m.applyDailyInterest(withSkill(base(), 'husband', 'gold-interest', 1, { gold: 30, interestOn: day(-1) }), today);
  assert.equal(a.characters.husband.gold, 31);
  const b = m.applyDailyInterest(withSkill(base(), 'husband', 'gold-interest', 1, { gold: 20, interestOn: day(-1) }), today);
  assert.equal(b.characters.husband.gold, 20);
  assert.equal(b.events.length, 0);
});

// --- Rollover: interest, Fortune's Favor, payout -----------------------------
check('advanceDays: interest up to the last day counts for the payout, then reset and Fortune tickets', () => {
  let s = base();
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-30), endDate: day(-2) } };
  s = withSkill(s, 'husband', 'gold-interest', 1, { gold: 100, interestOn: day(-4), tickets: 1 });
  s = withSkill(s, 'husband', 'fortunes-favor', 3);
  s = { ...s, characters: { ...s.characters, wife: { ...s.characters.wife, gold: 300 } } };
  const next = m.advanceDays(s, today);
  const result = next.prizeHistory[0];
  // 2% a day: 100 -> 102 -> 104 (2.04)
  assert.deepEqual(result.goldSnapshot, { husband: 104, wife: 300 }, 'interest is in the payout snapshot');
  assert.equal(result.payout.husband, s.prizePool * (104 / 404));
  const interest = next.events.filter((e) => e.type === 'interest');
  assert.deepEqual(interest.map((e) => e.date).sort(), [day(-3), day(-2)], 'only days inside the old chronicle pay');
  assert.equal(next.characters.husband.gold, 0);
  assert.equal(next.characters.husband.tickets, 1 + 3, "Fortune's Favor lv3 = +3 Normal Tickets");
  assert.equal(next.characters.wife.tickets, 0);
  assert.equal(next.characters.husband.interestOn, today);
  assert.equal(next.chronicle.id, s.chronicle.id + 1);
  assert.equal(m.advanceDays(next, today), next, 'idempotent once settled');
});

check("Fortune's Favor levels 1-4 give 1 / 2 / 3 / 4 Normal Tickets each chronicle", () => {
  for (const [level, tickets] of [[1, 1], [2, 2], [3, 3], [4, 4]]) {
    let s = base();
    s = { ...s, chronicle: { ...s.chronicle, startDate: day(-30), endDate: day(-1) } };
    s = withSkill(s, 'wife', 'fortunes-favor', level);
    assert.equal(m.advanceDays(s, today).characters.wife.tickets, tickets);
  }
});

// --- Loading older saves --------------------------------------------------
check('old saves load with no tickets and the current level as the ticket marker', () => {
  const xp = m.XP_CURVE[0] + m.XP_CURVE[1] + 10; // level 3
  const raw = {
    characters: { husband: { id: 'husband', name: 'Husband', xp, gold: 40, skills: [] }, wife: { id: 'wife', name: 'Wife', xp: 0, gold: 0, skills: [] } },
    tasks: [],
    logs: [],
    prizePool: 1000,
    chronicle: { id: 2, startDate: day(-3), endDate: day(20), endsAtMs: 0 },
    prizeHistory: [],
  };
  const s = m.parseGameState(raw, today);
  assert.equal(s.characters.husband.tickets, 0);
  assert.equal(s.characters.husband.ticketLevel, 3);
  assert.equal(s.characters.wife.ticketLevel, 1);
  assert.deepEqual(s.wheel, { jackpotBonus: 0 });
  assert.deepEqual(s.events, []);
});

check('events survive a save/load round trip; junk events are dropped', () => {
  const s = base();
  const spin = { id: 'spin-1', type: 'spin', characterId: 'wife', date: today, timestamp: 1, prize: 'big', gold: 10 };
  const sections = m.toHouseholdSections({ ...s, wheel: { jackpotBonus: 30 }, events: [spin, { id: 'x', type: 'spin', characterId: 'cat' }] });
  const back = m.fromHouseholdDoc(JSON.parse(JSON.stringify(sections)), today, false);
  assert.deepEqual(back.events, [spin]);
  assert.equal(back.wheel.jackpotBonus, 30);
});

check('new legend resets the ticket marker so levels pay tickets again', () => {
  const s = base();
  const leveled = { ...s, characters: { ...s.characters, husband: { ...s.characters.husband, ticketLevel: 12, tickets: 3 } } };
  const reset = m.resetLevelsAndSkills(leveled);
  assert.equal(reset.characters.husband.ticketLevel, 1);
  assert.equal(reset.characters.husband.tickets, 3, 'tickets on hand are kept');
});

console.log(`\n${passed} checks passed`);
