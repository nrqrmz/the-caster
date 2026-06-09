import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficultyMultiplier, scaleEnemyDef } from '../src/systems/Difficulty.js';

test('base multiplier is 1 for a fresh save', () => {
  assert.equal(difficultyMultiplier({ purchasedNodes: [], elements: [] }), 1);
});

test('multiplier rises with spent points and mastered elements', () => {
  const m1 = difficultyMultiplier({ purchasedNodes: ['basic_dmg_1'], elements: [] }); // cost 1
  const m2 = difficultyMultiplier({ purchasedNodes: ['basic_dmg_1'], elements: ['fire'] });
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
