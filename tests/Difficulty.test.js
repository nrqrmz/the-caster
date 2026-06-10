import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficultyMultiplier, scaleEnemyDef } from '../src/systems/Difficulty.js';

test('base multiplier is 1 for a fresh save', () => {
  assert.equal(difficultyMultiplier({ purchasedNodes: [], elements: [] }), 1);
});

test('multiplier rises with spent points and mastered elements', () => {
  const m1 = difficultyMultiplier({ purchasedNodes: ['dmg1'], elements: [] }); // cost 1
  const m2 = difficultyMultiplier({ purchasedNodes: ['dmg1'], elements: ['fire'] });
  assert.ok(m1 > 1);
  assert.ok(m2 > m1);
});

test('tolerates missing fields', () => {
  assert.equal(difficultyMultiplier({}), 1);
});

test('scaleEnemyDef scales hp and damage, never below base, and keeps other fields', () => {
  const def = { key: 'villager', hp: 20, damage: 8, speed: 90 };
  const scaled = scaleEnemyDef(def, 1.5);
  assert.equal(scaled.hp, 30);
  assert.equal(scaled.damage, 12);
  assert.equal(scaled.speed, 90);
  assert.equal(scaled.key, 'villager');
  const same = scaleEnemyDef(def, 1);
  assert.equal(same.hp, 20);
});

import { levelMultiplier } from '../src/systems/Difficulty.js';

test('levelMultiplier at level 0 equals the power multiplier (base 1.0)', () => {
  const save = { purchasedNodes: [], elements: [] };
  assert.equal(levelMultiplier(save, 0), 1);
});

test('levelMultiplier rises with level depth for the same save', () => {
  const save = { purchasedNodes: [], elements: [] };
  assert.ok(levelMultiplier(save, 6) > levelMultiplier(save, 0));
});

test('levelMultiplier rises with player power at the same depth', () => {
  const weak = { purchasedNodes: [], elements: [] };
  const strong = { purchasedNodes: ['dmg1'], elements: ['fire'] };
  assert.ok(levelMultiplier(strong, 3) > levelMultiplier(weak, 3));
});
