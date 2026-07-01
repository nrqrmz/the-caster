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

import {
  CASTER_SLOW_FLOOR,
  WHIRLPOOL_RADIUS, WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS,
  WHIRLPOOL_ACTIVE_MS, WHIRLPOOL_COOLDOWN_MS, WHIRLPOOL_TELEGRAPH_MS,
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../src/data/tuning.js';

test('Water tuning constants are defined and in-range', () => {
  assert.equal(typeof CASTER_SLOW_FLOOR, 'number');
  assert.ok(CASTER_SLOW_FLOOR > 0 && CASTER_SLOW_FLOOR < 1);
  assert.equal(CASTER_SLOW_FLOOR, 0.45);

  assert.ok(WHIRLPOOL_RADIUS > 0);
  assert.equal(WHIRLPOOL_CENTER_PULL, 0.7);
  assert.ok(WHIRLPOOL_CENTER_DPS > 0);

  assert.ok(BURROW_SUBMERGE_MS > 0);
  assert.ok(BURROW_TELEGRAPH_MS > 0);
  assert.ok(BURROW_RECOVER_MS > 0);

  assert.equal(EGG_HATCH_MS, 2500);
  assert.equal(TADPOLE_GROW_MS, 4000);
});

import {
  CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS, PUSH_FORCE, PUSH_MS,
  EVADE_DODGE_EVERY, EVADE_DODGE_MS, EVADE_DODGE_MUL,
  TORNADO_RADIUS, TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC, TORNADO_ENEMY_PULL,
  TORNADO_TELEGRAPH_MS, TORNADO_ACTIVE_MS, TORNADO_COOLDOWN_MS,
  RITUAL_FILL_MS,
} from '../src/data/tuning.js';

test('Air tuning constants are defined and in-range', () => {
  assert.equal(CASTER_STUN_MS, 300);
  assert.equal(CASTER_LIFT_MS, 500);
  assert.equal(CC_IMMUNE_MS, 600);
  assert.ok(PUSH_FORCE > 0);
  assert.ok(PUSH_MS > 0);

  assert.ok(EVADE_DODGE_EVERY > EVADE_DODGE_MS);
  assert.ok(EVADE_DODGE_MUL > 1);

  assert.ok(TORNADO_RADIUS > 0);
  assert.equal(TORNADO_EYE_PULL, 0.9);
  assert.equal(TORNADO_TELEGRAPH_MS, 800);
  assert.ok(TORNADO_EYE_RADIUS_FRAC > 0 && TORNADO_EYE_RADIUS_FRAC < 1);
  assert.ok(TORNADO_ENEMY_PULL >= 0 && TORNADO_ENEMY_PULL < TORNADO_EYE_PULL);

  assert.ok(RITUAL_FILL_MS > 0);
});
