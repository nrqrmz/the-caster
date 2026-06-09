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
