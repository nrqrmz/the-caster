import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseDifficulty, BASE_CURVE, CONCURRENCY_CAP, ENEMY_SHOT_POOL } from '../src/data/tuning.js';

test('base curve starts at 1 and is monotonic non-decreasing', () => {
  assert.equal(BASE_CURVE[0], 1);
  for (let i = 1; i < BASE_CURVE.length; i++) assert.ok(BASE_CURVE[i] >= BASE_CURVE[i - 1]);
});

test('baseDifficulty clamps out-of-range indices', () => {
  assert.equal(baseDifficulty(-3), BASE_CURVE[0]);
  assert.equal(baseDifficulty(999), BASE_CURVE[BASE_CURVE.length - 1]);
  assert.equal(baseDifficulty(2), BASE_CURVE[2]);
});

test('caps are positive', () => {
  assert.ok(CONCURRENCY_CAP > 0);
  assert.ok(ENEMY_SHOT_POOL > 0);
});

test('base curve covers all 8 level depths and the temple scales above the level boss', () => {
  assert.ok(BASE_CURVE.length >= 8, 'curve has an entry for each of the 8 levels');
  assert.ok(baseDifficulty(7) > baseDifficulty(6), 'nv8 temple is harder than nv7 level boss');
});
