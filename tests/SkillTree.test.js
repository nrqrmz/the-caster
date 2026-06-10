import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, purchase, getStats, isBranchUnlocked } from '../src/systems/SkillTree.js';
import { SKILL_TREE, SKILL_BRANCHES } from '../src/data/skilltree.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';

function saveWith(overrides) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...overrides };
}

test('cannot purchase without enough points', () => {
  assert.equal(canPurchase(saveWith({ skillPoints: 0 }), 'dmg1').ok, false);
});

test('cannot purchase when the track prerequisite is missing', () => {
  const res = canPurchase(saveWith({ skillPoints: 5 }), 'dmg2'); // requires dmg1
  assert.equal(res.ok, false);
  assert.match(res.reason, /requisito|prereq/i);
});

test('purchase deducts points and records the node (immutably)', () => {
  const save = saveWith({ skillPoints: 3 });
  const next = purchase(save, 'dmg1');
  assert.equal(next.skillPoints, 2);
  assert.deepEqual(next.purchasedNodes, ['dmg1']);
  assert.equal(save.skillPoints, 3); // original unchanged
});

test('getStats applies general bonuses', () => {
  const stats = getStats(saveWith({ purchasedNodes: ['dmg1', 'regen1'] }));
  assert.equal(stats.basicDamage, 15);   // 10 + 5
  assert.equal(stats.healthRegen, 2);    // 0 + 2
});

test('getStats applies elemental bonuses (chain, radius)', () => {
  const stats = getStats(saveWith({ purchasedNodes: ['l_chain1', 'f_area1'] }));
  assert.equal(stats.lightningChain, 3); // 2 + 1
  assert.equal(stats.fireballRadius, 90); // 70 + 20
});

test('getStats clamps freezeSlowPct to its floor', () => {
  const stats = getStats(saveWith({ purchasedNodes: ['w_slow1', 'w_slow2'] }));
  assert.ok(stats.freezeSlowPct >= 0.2);
});

test('isBranchUnlocked: general always open, elemental gated by mastery', () => {
  const general = SKILL_BRANCHES.find((b) => b.element === null);
  const fire = SKILL_BRANCHES.find((b) => b.element === 'fire');
  assert.equal(isBranchUnlocked(saveWith({}), general), true);
  assert.equal(isBranchUnlocked(saveWith({ elements: [] }), fire), false);
  assert.equal(isBranchUnlocked(saveWith({ elements: ['fire'] }), fire), true);
});

test('every branch/track node id exists and each track is a valid requires-chain', () => {
  for (const branch of SKILL_BRANCHES) {
    for (const track of branch.tracks) {
      for (let i = 0; i < track.nodes.length; i++) {
        const id = track.nodes[i];
        assert.ok(SKILL_TREE[id], `missing node ${id}`);
        if (i > 0) {
          assert.ok(
            SKILL_TREE[id].requires.includes(track.nodes[i - 1]),
            `${id} must require ${track.nodes[i - 1]}`,
          );
        }
      }
    }
  }
});
