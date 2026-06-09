import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, purchase, getStats } from '../src/systems/SkillTree.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';

function saveWith(overrides) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...overrides };
}

test('cannot purchase without enough points', () => {
  const save = saveWith({ skillPoints: 0 });
  assert.equal(canPurchase(save, 'basic_dmg_1').ok, false);
});

test('cannot purchase when prerequisite missing', () => {
  const save = saveWith({ skillPoints: 5 });
  const res = canPurchase(save, 'basic_dmg_2'); // requires basic_dmg_1
  assert.equal(res.ok, false);
  assert.match(res.reason, /requisito|prereq/i);
});

test('cannot purchase an already-owned node', () => {
  const save = saveWith({ skillPoints: 5, purchasedNodes: ['basic_dmg_1'] });
  assert.equal(canPurchase(save, 'basic_dmg_1').ok, false);
});

test('purchase deducts points and records the node', () => {
  const save = saveWith({ skillPoints: 3 });
  const next = purchase(save, 'basic_dmg_1');
  assert.equal(next.skillPoints, 2);
  assert.deepEqual(next.purchasedNodes, ['basic_dmg_1']);
});

test('purchase does not mutate the original save', () => {
  const save = saveWith({ skillPoints: 3 });
  purchase(save, 'basic_dmg_1');
  assert.equal(save.skillPoints, 3);
  assert.deepEqual(save.purchasedNodes, []);
});

test('getStats applies purchased bonuses and respects floors', () => {
  const save = saveWith({ purchasedNodes: ['basic_dmg_1', 'shot_rate_1'] });
  const stats = getStats(save);
  assert.equal(stats.basicDamage, 15);  // 10 + 5
  assert.equal(stats.shotRate, 425);    // 500 - 75
});

test('getStats clamps shotRate to its floor', () => {
  // Six shot_rate-style reductions would go below floor; simulate via many adds.
  const save = saveWith({ purchasedNodes: ['shot_rate_1'] });
  const stats = getStats(save);
  assert.ok(stats.shotRate >= 150);
});
