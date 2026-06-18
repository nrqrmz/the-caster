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

import { applyResist } from '../src/systems/CombatSystem.js';

test('applyResist reduces damage by the resist fraction', () => {
  assert.equal(applyResist(100, 0.3), 70);
  assert.equal(applyResist(100, 0), 100);
  assert.equal(applyResist(100, 1), 0);
});

test('applyResist clamps resist to [0,1]', () => {
  assert.equal(applyResist(100, -0.5), 100); // negative resist = no reduction
  assert.equal(applyResist(100, 1.5), 0);    // over 1 = full immunity
});

import { tryMeleeContact } from '../src/systems/CombatSystem.js';

test('tryMeleeContact permite el primer golpe y arma el cooldown', () => {
  const e = {};
  assert.equal(tryMeleeContact(e, 1000, 600), true);
  assert.equal(e.contactReadyAt, 1600);
});

test('tryMeleeContact bloquea golpes dentro del cooldown', () => {
  const e = {};
  tryMeleeContact(e, 1000, 600);
  assert.equal(tryMeleeContact(e, 1300, 600), false); // 1300 < 1600
  assert.equal(tryMeleeContact(e, 1599, 600), false);
});

test('tryMeleeContact vuelve a permitir tras el cooldown', () => {
  const e = {};
  tryMeleeContact(e, 1000, 600);
  assert.equal(tryMeleeContact(e, 1600, 600), true); // exactamente al expirar
  assert.equal(e.contactReadyAt, 2200);
});

import {
  applyCasterCc, tickCasterCc, isControlLocked, isMovementLocked,
  applyCasterPush, tickCasterPush, getCasterPush, applyDrain,
} from '../src/systems/CombatSystem.js';
import { CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS, CASTER_ROOT_MS } from '../src/data/tuning.js';

function freshCc() {
  return { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
}

test('applyCasterCc sets stun and returns true on a fresh state', () => {
  const s = freshCc();
  assert.equal(applyCasterCc(s, 'stun', CASTER_STUN_MS), true);
  assert.equal(s.stunRemaining, CASTER_STUN_MS);
  assert.equal(isControlLocked(s), true);
});

test('applyCasterCc sets lift independently of stun', () => {
  const s = freshCc();
  applyCasterCc(s, 'lift', CASTER_LIFT_MS);
  assert.equal(s.liftRemaining, CASTER_LIFT_MS);
  assert.equal(isControlLocked(s), true);
});

test('applyCasterCc is ignored (returns false) while ccImmune is active', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, ccImmuneRemaining: 200 };
  assert.equal(applyCasterCc(s, 'stun', CASTER_STUN_MS), false);
  assert.equal(s.stunRemaining, 0);
  assert.equal(isControlLocked(s), false);
});

test('tickCasterCc decrements stun and arms ccImmune when it expires', () => {
  const s = freshCc();
  applyCasterCc(s, 'stun', 100);
  tickCasterCc(s, 60);
  assert.equal(s.stunRemaining, 40);
  assert.equal(s.ccImmuneRemaining, 0); // not expired yet
  tickCasterCc(s, 60); // expires this frame
  assert.equal(s.stunRemaining, 0);
  assert.equal(s.ccImmuneRemaining, CC_IMMUNE_MS);
  assert.equal(isControlLocked(s), false);
});

test('a second stun is blocked during the immunity window, then allowed after it decays', () => {
  const s = freshCc();
  applyCasterCc(s, 'stun', 50);
  tickCasterCc(s, 60); // stun expires → ccImmune armed
  assert.equal(applyCasterCc(s, 'stun', 300), false); // blocked
  tickCasterCc(s, CC_IMMUNE_MS); // immunity decays to 0
  assert.equal(s.ccImmuneRemaining, 0);
  assert.equal(applyCasterCc(s, 'stun', 300), true); // allowed again
});

test('applyCasterCc root sets rootRemaining and returns true', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  assert.equal(applyCasterCc(s, 'root', CASTER_ROOT_MS), true);
  assert.equal(s.rootRemaining, CASTER_ROOT_MS);
});

test('root locks movement but NOT control (caster keeps casting while rooted)', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 300);
  assert.equal(isMovementLocked(s), true);  // can't move
  assert.equal(isControlLocked(s), false);  // can still cast/fire
});

test('tickCasterCc decrements root and arms ccImmune when it expires', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 100);
  tickCasterCc(s, 60);
  assert.equal(s.rootRemaining, 40);
  assert.equal(s.ccImmuneRemaining, 0); // not expired yet
  tickCasterCc(s, 60); // expires this frame
  assert.equal(s.rootRemaining, 0);
  assert.equal(s.ccImmuneRemaining, CC_IMMUNE_MS);
  assert.equal(isMovementLocked(s), false);
});

test('a root is blocked during the anti-chain immunity window', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 50);
  tickCasterCc(s, 60); // root expires → ccImmune armed
  assert.equal(applyCasterCc(s, 'root', 300), false); // blocked
  tickCasterCc(s, CC_IMMUNE_MS); // immunity decays
  assert.equal(applyCasterCc(s, 'root', 300), true); // allowed again
});

test('applyCasterPush sets a decaying impulse; getCasterPush returns it then zero', () => {
  const s = { pushX: 0, pushY: 0, pushRemaining: 0 };
  applyCasterPush(s, 200, 0, 250);
  assert.deepEqual(getCasterPush(s), { x: 200, y: 0 });
  tickCasterPush(s, 250); // fully decays
  assert.equal(s.pushRemaining, 0);
  assert.deepEqual(getCasterPush(s), { x: 0, y: 0 });
});

test('applyDrain heals an entity, clamped to maxHp', () => {
  const e = { hp: 30, maxHp: 50 };
  applyDrain(e, 8);
  assert.equal(e.hp, 38);
  applyDrain(e, 999);
  assert.equal(e.hp, 50); // clamped
});
