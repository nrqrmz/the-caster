import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goldReward, respecCost, canBuy, buy, canRespec, respec } from '../src/systems/Economy.js';

test('goldReward is a positive integer that grows with the difficulty multiplier', () => {
  const lo = goldReward({ kind: 'basic' }, 1, 30000);
  const hi = goldReward({ kind: 'basic' }, 2, 30000);
  assert.ok(Number.isInteger(lo) && lo > 0);
  assert.ok(hi > lo);
});

test('goldReward rewards faster clears and a tougher level type', () => {
  assert.ok(goldReward({ kind: 'basic' }, 1, 0) > goldReward({ kind: 'basic' }, 1, 9_999_999));
  assert.ok(goldReward({ kind: 'temple' }, 1, 30000) > goldReward({ kind: 'basic' }, 1, 30000));
});

test('respecCost triples each time (permanent escalation)', () => {
  assert.equal(respecCost(0), 100);
  assert.equal(respecCost(1), 300);
  assert.equal(respecCost(2), 900);
});

test('buy requires gold, deducts price, increments inventory, immutably', () => {
  const save = { gold: 50, inventory: { potion: 0, elixir: 0, phoenix: 0 } };
  assert.equal(canBuy(save, 'potion'), true);   // potion price 40
  assert.equal(canBuy(save, 'phoenix'), false); // phoenix price 150
  const next = buy(save, 'potion');
  assert.equal(next.gold, 10);
  assert.equal(next.inventory.potion, 1);
  assert.equal(save.gold, 50);                  // original untouched
  assert.equal(buy(save, 'phoenix'), save);     // unaffordable → no-op (same ref)
});

test('respec costs gold, refunds spent points, clears nodes, escalates; leaves elements/progress', () => {
  // dmg1 cost 1, dmg2 cost 2 → refund 3
  const save = { gold: 200, skillPoints: 0, purchasedNodes: ['dmg1', 'dmg2'], respecCount: 0, elements: ['fire'], regionProgress: { fire: { cleared: 1 } } };
  assert.equal(canRespec(save), true);
  const next = respec(save);
  assert.equal(next.gold, 100);          // 200 - 100
  assert.equal(next.skillPoints, 3);     // refunded 1 + 2
  assert.deepEqual(next.purchasedNodes, []);
  assert.equal(next.respecCount, 1);
  assert.deepEqual(next.elements, ['fire']);
  assert.deepEqual(next.regionProgress, { fire: { cleared: 1 } });
  assert.equal(save.gold, 200);          // original untouched
});

test('respec is a no-op when gold is insufficient', () => {
  const save = { gold: 50, skillPoints: 0, purchasedNodes: ['dmg1'], respecCount: 0 };
  assert.equal(canRespec(save), false);
  assert.equal(respec(save), save); // same ref
});

test('levelboss levels earn pretemple-parity gold', () => {
  const ms = 50000;
  assert.equal(
    goldReward({ kind: 'levelboss' }, 1, ms),
    goldReward({ kind: 'pretemple' }, 1, ms),
  );
});
