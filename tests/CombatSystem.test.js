import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage } from '../src/systems/CombatSystem.js';

test('applyDamage reduces hp and reports alive', () => {
  const r = applyDamage({ hp: 50, maxHp: 50 }, 20);
  assert.equal(r.hp, 30);
  assert.equal(r.dead, false);
});

test('applyDamage clamps hp at zero and reports dead', () => {
  const r = applyDamage({ hp: 10, maxHp: 50 }, 25);
  assert.equal(r.hp, 0);
  assert.equal(r.dead, true);
});

test('applyDamage ignores negative damage', () => {
  const r = applyDamage({ hp: 10, maxHp: 50 }, -5);
  assert.equal(r.hp, 10);
  assert.equal(r.dead, false);
});

import { applyCasterSlow, tickCasterSlow, getCasterSpeedMul } from '../src/systems/CombatSystem.js';
import { CASTER_SLOW_FLOOR } from '../src/data/tuning.js';

test('applyCasterSlow sets factor and remaining on a fresh state', () => {
  const state = { slowRemaining: 0, slowFactor: 1 };
  applyCasterSlow(state, 0.6, 1200);
  assert.equal(state.slowFactor, 0.6);
  assert.equal(state.slowRemaining, 1200);
});

test('applyCasterSlow refreshes duration when hit again while slowed', () => {
  const state = { slowRemaining: 600, slowFactor: 0.6 };
  applyCasterSlow(state, 0.6, 1200);
  assert.equal(state.slowRemaining, 1200); // refreshed
  assert.equal(state.slowFactor, 0.6);
});

test('applyCasterSlow keeps the stronger (lower) factor when stacking', () => {
  const state = { slowRemaining: 800, slowFactor: 0.6 };
  applyCasterSlow(state, 0.8, 1200); // weaker slow
  assert.equal(state.slowFactor, 0.6); // original factor retained
});

test('applyCasterSlow never goes below CASTER_SLOW_FLOOR', () => {
  const state = { slowRemaining: 0, slowFactor: 1 };
  applyCasterSlow(state, 0.1, 1200); // extreme slow
  assert.ok(state.slowFactor >= CASTER_SLOW_FLOOR);
  assert.equal(state.slowFactor, CASTER_SLOW_FLOOR);
});

test('tickCasterSlow decrements remaining and resets to 1 when expired', () => {
  const state = { slowRemaining: 100, slowFactor: 0.6 };
  tickCasterSlow(state, 50);
  assert.equal(state.slowRemaining, 50);
  assert.equal(state.slowFactor, 0.6);
  tickCasterSlow(state, 60); // expires
  assert.equal(state.slowRemaining, 0);
  assert.equal(state.slowFactor, 1); // back to full
});

test('getCasterSpeedMul returns slowFactor while active, 1 when idle', () => {
  const active = { slowRemaining: 500, slowFactor: 0.6 };
  assert.equal(getCasterSpeedMul(active), 0.6);
  const idle = { slowRemaining: 0, slowFactor: 1 };
  assert.equal(getCasterSpeedMul(idle), 1);
});
