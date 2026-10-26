import assert from 'node:assert/strict';
import * as m from './.build/logic.mjs';

let passed = 0;
const check = (label, fn) => { fn(); passed += 1; console.log('ok -', label); };
const today = m.localDateKey();
const day = (n) => m.addDays(today, n);
const withSkills = (state, id, skills, extra = {}) => ({
  ...state, characters: { ...state.characters, [id]: { ...state.characters[id], skills, ...extra } },
});

// --- Skills ---------------------------------------------------------------
check('Steady Worker: 10/15/20/25% XP and gold on Moderate quests', () => {
  const effect = m.SKILL_POOL.find((s) => s.id === 'steady-worker').effect;
  assert.deepEqual(effect.xp, [0.1, 0.15, 0.2, 0.25]);
  assert.deepEqual(effect.gold, [0.1, 0.15, 0.2, 0.25]);
  const s = withSkills(m.createInitialState(today), 'wife', [{ skillId: 'steady-worker', level: 4 }]);
  const r = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'main' }, 'wife', s.characters, m.SKILL_POOL);
  assert.equal(Math.round(r.wife.xp), 125);
  assert.equal(Math.round(r.wife.gold), 125);
  const quick = m.computeRewardBreakdown({ xp: 100, gold: 100, category: 'general', group: 'quick' }, 'wife', s.characters, m.SKILL_POOL);
  assert.equal(Math.round(quick.wife.gold), 100, 'not on Quick quests');
});

check('Gold Interest: capped at 100 gold a day, never on day 1', () => {
  let s = m.createInitialState(day(-3));
  s = { ...s, chronicle: { ...s.chronicle, startDate: day(-3), endDate: day(20) } };
  // 5% (level 4, v1.5) of 5000 = 250, capped to 100 per day; days -2, -1 and today pay (day -3 is the chronicle's day 1).
  s = withSkills(s, 'husband', [{ skillId: 'gold-interest', level: 4 }], { gold: 5000, interestOn: day(-4) });
  const next = m.applyDailyInterest(s, today);
  const paid = next.events.filter((e) => e.type === 'interest' && e.characterId === 'husband');
  assert.deepEqual(paid.map((e) => e.date).sort(), [day(-2), day(-1), day(0)]);
  assert.ok(paid.every((e) => e.gold === 100));
  assert.equal(next.characters.husband.gold, 5300);
  // Below the cap the percentage applies as before: level 4 = 5% (v1.5) of 500 = 25.
  const small = m.applyDailyInterest(withSkills(s, 'husband', [{ skillId: 'gold-interest', level: 4 }], { gold: 500, interestOn: day(-1) }), today);
  assert.equal(small.characters.husband.gold, 525);
});

// --- Sync: ops, idempotency, transactions ---------------------------------
// The kinds of ops GameContext builds: a wheel spin for the husband and a quest for the wife.
const spinOp = (id) => ({
  id,
  update: (s) => {
    const c = s.characters.husband;
    if (c.tickets < 1) return 'wheel.error.noTickets';
    const event = { id: `spin-${id}`, type: 'spin', characterId: 'husband', date: today, timestamp: 1, prize: 'big', gold: 10 };
    return { ...s, wheel: m.nextWheelState('big', s.wheel), events: [event, ...s.events], characters: { ...s.characters, husband: { ...c, tickets: c.tickets - 1, gold: c.gold + 10 } } };
  },
});
const questOp = (id, by, taskId = 'trash') => ({
  id,
  update: (s) => {
    if (s.logs.some((l) => l.taskId === taskId && l.date === today)) return 'tasks.alreadyDone';
    const c = s.characters[by];
    const log = { id: `${taskId}-${id}`, taskId, date: today, completedBy: by, xpAwarded: { husband: by === 'husband' ? 5 : 0, wife: by === 'wife' ? 5 : 0 }, goldAwarded: { husband: by === 'husband' ? 20 : 0, wife: by === 'wife' ? 20 : 0 }, timestamp: 2 };
    return { ...s, logs: [log, ...s.logs], characters: { ...s.characters, [by]: { ...c, xp: c.xp + 5, gold: c.gold + 20 } } };
  },
});

// A fake household document and Firestore-style field-path updates.
const setPath = (obj, path, value) => {
  const keys = path.split('.');
  let node = obj;
  for (const key of keys.slice(0, -1)) node = node[key] = { ...node[key] };
  node[keys[keys.length - 1]] = value;
};
const makeServer = (state) => {
  let doc = structuredClone({ code: 'ABCDEF', ...m.toHouseholdSections(state) });
  return {
    read: () => m.fromHouseholdDoc(structuredClone(doc), today, false),
    update: (patch) => { doc = structuredClone(doc); for (const [path, value] of Object.entries(patch)) setPath(doc, path, structuredClone(value)); },
    // What commitOp does online: read the latest doc, apply the op on it, write only what changed.
    transact(op) {
      const server = this.read();
      const result = m.applyOp(server, op, today);
      if (result.ok) this.update(m.householdPatch(server, result.state));
      return result;
    },
  };
};
const start = () => withSkills(m.createInitialState(day(-5)), 'husband', [], { tickets: 3, gold: 0 });

check('applyOp records the op id and applies each op once', () => {
  const s = start();
  const once = m.applyOp(s, spinOp('a1'), today);
  assert.ok(once.ok);
  assert.deepEqual(once.state.appliedOps, ['a1']);
  const twice = m.applyOp(once.state, spinOp('a1'), today);
  assert.equal(twice.state.characters.husband.tickets, 2, 'replayed op is skipped');
  assert.equal(twice.state.events.filter((e) => e.type === 'spin').length, 1);
});

check('both spouses acting at once: both updates survive (transactions)', () => {
  const server = makeServer(start());
  // Both devices start from the same snapshot; the husband's transaction lands first, then the wife's
  // transaction re-reads the document (as Firestore's retry does) instead of writing her stale copy.
  const stale = server.read();
  const localWife = m.applyOp(stale, questOp('w1', 'wife'), today);
  assert.ok(localWife.ok);
  assert.ok(server.transact(spinOp('h1')).ok);
  assert.ok(server.transact(questOp('w1', 'wife')).ok);
  const final = server.read();
  assert.equal(final.characters.husband.tickets, 2, "husband's spin kept");
  assert.equal(final.characters.husband.gold, 10);
  assert.equal(final.wheel.jackpotBonus, 0);
  assert.equal(final.characters.wife.gold, 20, "wife's quest kept");
  assert.equal(final.logs.length, 1);
  assert.deepEqual([...final.appliedOps].sort(), ['h1', 'w1']);
});

check('the old whole-section save lost the other player\'s update (regression guard)', () => {
  const server = makeServer(start());
  const stale = server.read();
  server.transact(spinOp('h1'));
  // Old behaviour: the wife's device wrote its whole `game` section from its stale copy.
  const wife = m.applyOp(stale, questOp('w1', 'wife'), today).state;
  server.update({ game: m.toHouseholdSections(wife).game });
  assert.equal(server.read().characters.husband.tickets, 3, 'spin was overwritten');
});

check('offline fallback: field-level patches from stale copies still keep both players', () => {
  const server = makeServer(start());
  const stale = server.read();
  const husband = m.applyOp(stale, spinOp('h1'), today).state;
  const wife = m.applyOp(stale, questOp('w1', 'wife'), today).state;
  server.update(m.householdPatch(stale, husband));
  const patch = m.householdPatch(stale, wife);
  assert.ok(!('game.characters.husband' in patch), "wife's write never carries the husband's character");
  server.update(patch);
  const final = server.read();
  assert.equal(final.characters.husband.tickets, 2);
  assert.equal(final.characters.wife.gold, 20);
});

check('an op that no longer applies is rejected, not double-applied', () => {
  const server = makeServer(start());
  assert.ok(server.transact(questOp('h2', 'husband')).ok);
  const second = server.transact(questOp('w2', 'wife'));
  assert.deepEqual(second, { ok: false, error: 'tasks.alreadyDone' });
  assert.equal(server.read().characters.wife.gold, 0);
});

check('replayOps: pending ops on top of a newer snapshot, already-saved ones skipped', () => {
  const server = makeServer(start());
  server.transact(spinOp('h1'));
  // The husband's spin is saved; his quest is still pending.
  const shown = m.replayOps(server.read(), [spinOp('h1'), questOp('h3', 'husband')], today);
  assert.equal(shown.characters.husband.tickets, 2, 'saved spin not applied again');
  assert.equal(shown.characters.husband.gold, 30);
});

check('settle returns the same state when nothing is due (no needless writes)', () => {
  const s = m.settle(start(), today);
  assert.equal(m.settle(s, today), s);
  assert.deepEqual(m.householdPatch(s, s), {});
});

console.log(`\n${passed} checks passed`);
