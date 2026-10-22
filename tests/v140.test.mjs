import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const withChar = (state, id, extra) => ({ ...state, characters: { ...state.characters, [id]: { ...state.characters[id], ...extra } } });
const meta = (n = 1) => ({ id: `spin-${n}`, date: today, timestamp: n });

check('wheel table: 5 / 10 / 15 gold, jackpot 500 + pot at 2%, miss 18%', () => {
  const table = Object.fromEntries(m.WHEEL_PRIZES.map((e) => [e.prize, [e.gold, e.weight]]));
  assert.deepEqual(table, { small: [5, 35], normal: [10, 30], big: [15, 15], jackpot: [500, 2], none: [0, 18] });
  assert.equal(m.JACKPOT_BASE_GOLD, 500);
  assert.equal(m.JACKPOT_MISS_BONUS, 10);
});

check('Golden Tickets are always used first', () => {
  assert.equal(m.nextTicket({ tickets: 3, goldenTickets: 1 }), 'golden');
  assert.equal(m.nextTicket({ tickets: 3, goldenTickets: 0 }), 'normal');
  assert.equal(m.nextTicket({ tickets: 0, goldenTickets: 0 }), null);
});

check('Golden Ticket doubles every gold prize, jackpot included; Fortune\'s Favor only boosts Normal Tickets', () => {
  const wheel = { jackpotBonus: 30 };
  const plain = { skills: [] };
  const favor4 = { skills: [{ skillId: 'fortunes-favor', level: 4 }] };
  for (const [prize, gold] of [['small', 5], ['normal', 10], ['big', 15], ['jackpot', 530]]) {
    assert.equal(m.wheelGoldFor(prize, wheel, plain, 'golden'), gold * 2, prize);
    assert.equal(m.wheelGoldFor(prize, wheel, favor4, 'golden'), gold * 2, `${prize}: favor ignored on golden`);
    assert.equal(m.wheelGoldFor(prize, wheel, favor4, 'normal'), gold * 2, `${prize}: favor lv4 = +100% on normal`);
    assert.equal(m.wheelGoldFor(prize, wheel, plain, 'normal'), gold);
  }
  assert.equal(m.wheelGoldFor('none', wheel, favor4, 'golden'), 0);
  const favor1 = { skills: [{ skillId: 'fortunes-favor', level: 1 }] };
  assert.equal(m.wheelGoldFor('normal', wheel, favor1, 'normal'), 13, '10 x 1.25 rounded');
});

check('spin with a Golden Ticket: spends it first, pays double', () => {
  const s = withChar(m.createInitialState(today), 'husband', { tickets: 2, goldenTickets: 1, gold: 0 });
  const r = m.spinOnState(s, 'husband', 'big', meta());
  assert.equal(r.spin.ticket, 'golden');
  assert.equal(r.spin.gold, 30);
  assert.equal(r.state.characters.husband.goldenTickets, 0);
  assert.equal(r.state.characters.husband.tickets, 2, 'Normal Tickets untouched');
  assert.equal(r.state.characters.husband.gold, 30);
  const next = m.spinOnState(r.state, 'husband', 'big', meta(2));
  assert.equal(next.spin.ticket, 'normal');
  assert.equal(next.spin.gold, 15);
  assert.equal(next.state.characters.husband.tickets, 1);
});

check('Golden Ticket miss: jackpot +10 and 1 Normal Ticket back', () => {
  const s = withChar(m.createInitialState(today), 'wife', { tickets: 0, goldenTickets: 1 });
  const r = m.spinOnState(s, 'wife', 'none', meta());
  assert.equal(r.spin.refunded, true);
  assert.equal(r.spin.gold, 0);
  assert.equal(r.state.wheel.jackpotBonus, 10);
  assert.equal(r.state.characters.wife.goldenTickets, 0);
  assert.equal(r.state.characters.wife.tickets, 1);
  // A Normal Ticket miss has no refund.
  const again = m.spinOnState(r.state, 'wife', 'none', meta(2));
  assert.equal(again.spin.refunded, undefined);
  assert.equal(again.state.characters.wife.tickets, 0);
  assert.equal(again.state.wheel.jackpotBonus, 20);
  assert.equal(m.spinOnState(again.state, 'wife', 'small', meta(3)), null, 'no tickets left');
});

check('Golden jackpot pays (500 + pot) x 2 and empties the pot', () => {
  let s = withChar(m.createInitialState(today), 'husband', { goldenTickets: 1, gold: 0 });
  s = { ...s, wheel: { jackpotBonus: 40 } };
  const r = m.spinOnState(s, 'husband', 'jackpot', meta());
  assert.equal(r.spin.gold, 1080);
  assert.equal(r.state.wheel.jackpotBonus, 0);
});

check('level-up: 1 Golden Ticket per new level, plus Fortune\'s Favor Normal Tickets per level', () => {
  let s = m.createInitialState(today);
  s = withChar(s, 'husband', { skills: [{ skillId: 'fortunes-favor', level: 3 }] });
  const xp = m.XP_CURVE[0] + m.XP_CURVE[1]; // level 1 -> 3
  const { characters, levelUps } = m.grantRewards(s.characters, { husband: { xp, gold: 0 }, wife: { xp: 0, gold: 0 } });
  assert.equal(characters.husband.goldenTickets, 2);
  assert.equal(characters.husband.tickets, 6, 'favor lv3 = 3 per level');
  assert.equal(levelUps[0].goldenTickets, 2);
  assert.equal(levelUps[0].tickets, 6);
});

check("Fortune's Favor: 1 / 2 / 3 / 4 Normal Tickets each new Chronicle", () => {
  for (const level of [1, 2, 3, 4]) {
    let s = m.createInitialState(day(-40));
    s = { ...s, chronicle: { ...s.chronicle, startDate: day(-40), endDate: day(-1) } };
    s = withChar(s, 'wife', { skills: [{ skillId: 'fortunes-favor', level }] });
    const next = m.advanceDays(s, today);
    assert.equal(next.characters.wife.tickets, level);
    assert.equal(next.characters.wife.goldenTickets, 0);
  }
});

check('Hall of Fame: 1 / 2 / 3 / 4 Golden Tickets at every 5th MVP day', () => {
  const log = (date, gold) => ({ id: date, taskId: 'trash', date, completedBy: 'wife', xpAwarded: { husband: 0, wife: 0 }, goldAwarded: { husband: 0, wife: gold }, timestamp: 1 });
  for (const level of [1, 2, 3, 4]) {
    let s = m.createInitialState(day(-10));
    s = { ...s, chronicle: { ...s.chronicle, startDate: day(-10), endDate: day(20) }, mvpSettledOn: day(-6) };
    s = withChar(s, 'wife', { skills: [{ skillId: 'hall-of-fame', level }] });
    s = { ...s, logs: [-5, -4, -3, -2, -1].map((d) => log(day(d), 10)) };
    const next = m.advanceDays(s, today);
    assert.equal(next.characters.wife.mvpDays, 5);
    assert.equal(next.characters.wife.goldenTickets, level);
    assert.equal(next.characters.wife.tickets, 0);
  }
});

check('Team Player: +12/24/36/48% XP and +10/20/30/40% gold on quests done together', () => {
  const s = withChar(m.createInitialState(today), 'husband', { skills: [{ skillId: 'team-player', level: 4 }] });
  const both = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'quick' }, 'both', s.characters, m.SKILL_POOL);
  assert.ok(Math.abs(both.husband.xp - 50 * 1.48) < 1e-9);
  assert.ok(Math.abs(both.husband.gold - 50 * 1.4) < 1e-9);
  const solo = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'quick' }, 'husband', s.characters, m.SKILL_POOL);
  assert.equal(solo.husband.xp, 100, 'not alone');
});

check('older saves load with 0 Golden Tickets; Golden Tickets survive a save/load', () => {
  const s = m.createInitialState(today);
  const raw = m.toHouseholdSections(s);
  delete raw.game.characters.husband.goldenTickets;
  const loaded = m.fromHouseholdDoc({ code: 'X', ...raw }, today);
  assert.equal(loaded.characters.husband.goldenTickets, 0);
  const rich = withChar(s, 'wife', { goldenTickets: 3 });
  const back = m.fromHouseholdDoc({ code: 'X', ...m.toHouseholdSections(rich) }, today);
  assert.equal(back.characters.wife.goldenTickets, 3);
  // Spin events keep their ticket and refund marks.
  const spun = m.spinOnState(withChar(s, 'wife', { goldenTickets: 1 }), 'wife', 'none', meta()).state;
  const event = m.fromHouseholdDoc({ code: 'X', ...m.toHouseholdSections(spun) }, today).events[0];
  assert.equal(event.ticket, 'golden');
  assert.equal(event.refunded, true);
});

console.log(`\n${passed} checks passed`);
