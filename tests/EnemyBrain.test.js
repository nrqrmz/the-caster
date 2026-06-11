import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMovement, MOVEMENTS } from '../src/systems/EnemyBrain.js';

const mag = (v) => Math.hypot(v.x, v.y);
const ctx = (overrides = {}) => ({
  self: { x: 0, y: 0 },
  target: { x: 100, y: 0 },
  speed: 60,
  dt: 16,
  ...overrides,
});

test('chase moves straight toward the target at full speed', () => {
  const v = computeMovement({ movement: { type: 'chase' } }, {}, ctx());
  assert.ok(Math.abs(v.x - 60) < 1e-6);
  assert.ok(Math.abs(v.y) < 1e-6);
});

test('static does not move', () => {
  const v = computeMovement({ movement: { type: 'static' } }, {}, ctx());
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
});

test('flee moves directly away from the target', () => {
  const v = computeMovement({ movement: { type: 'flee' } }, {}, ctx());
  assert.ok(v.x < 0);
  assert.ok(Math.abs(mag(v) - 60) < 1e-6);
});

test('kite advances when too far, retreats when too close, holds in the band', () => {
  const def = { movement: { type: 'kite', range: 200 } };
  const far = computeMovement(def, {}, ctx({ target: { x: 400, y: 0 } }));
  assert.ok(far.x > 0);
  const near = computeMovement(def, {}, ctx({ target: { x: 50, y: 0 } }));
  assert.ok(near.x < 0);
  const inBand = computeMovement(def, {}, ctx({ target: { x: 200, y: 0 } }));
  assert.equal(inBand.x, 0);
  assert.equal(inBand.y, 0);
});

test('unknown movement type falls back to chase', () => {
  const v = computeMovement({ movement: { type: 'nope' } }, {}, ctx());
  assert.ok(v.x > 0);
});

test('charge stays still during windup, then dashes faster than base speed', () => {
  const def = { movement: { type: 'charge', windup: 600, dash: 400, recover: 700, dashMul: 3 } };
  const state = {};
  let v = computeMovement(def, state, ctx({ dt: 100 }));
  assert.equal(mag(v), 0);
  computeMovement(def, state, ctx({ dt: 600 }));
  v = computeMovement(def, state, ctx({ dt: 100 }));
  assert.ok(mag(v) > 60);
});

test('every movement type returns a finite velocity vector', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = computeMovement({ movement: { type } }, {}, ctx());
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});

import { stepAttack, buildProjectiles } from '../src/systems/EnemyBrain.js';
import { findModifier } from '../src/systems/EnemyBrain.js';

test('stepAttack with no telegraph fires once the cooldown elapses', () => {
  const att = { type: 'shootStraight', every: 1000 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 400), {});
  assert.deepEqual(stepAttack(att, rt, 400), {});
  assert.deepEqual(stepAttack(att, rt, 400), { fire: true });
  assert.deepEqual(stepAttack(att, rt, 400), {});
});

test('stepAttack telegraphs first, then fires after the telegraph window', () => {
  const att = { type: 'shootStraight', every: 1000, telegraph: 300 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 1000), { telegraph: true });
  assert.deepEqual(stepAttack(att, rt, 100), { telegraph: true });
  assert.deepEqual(stepAttack(att, rt, 250), { fire: true });
});

test('buildProjectiles shootStraight makes one shot aimed at the target', () => {
  const projs = buildProjectiles({ type: 'shootStraight', speed: 200, damage: 5 },
    { self: { x: 0, y: 0 }, target: { x: 0, y: 100 } });
  assert.equal(projs.length, 1);
  assert.ok(Math.abs(projs[0].angle - Math.PI / 2) < 1e-6);
  assert.equal(projs[0].speed, 200);
  assert.equal(projs[0].damage, 5);
});

test('buildProjectiles shootSpread fans `count` shots across the arc', () => {
  const projs = buildProjectiles({ type: 'shootSpread', count: 3, arc: 90 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 3);
  const arc = (90 * Math.PI) / 180;
  assert.ok(Math.abs(projs[0].angle - (-arc / 2)) < 1e-6);
  assert.ok(Math.abs(projs[1].angle - 0) < 1e-6);
  assert.ok(Math.abs(projs[2].angle - (arc / 2)) < 1e-6);
});

test('buildProjectiles nova spreads `count` shots evenly around the circle', () => {
  const projs = buildProjectiles({ type: 'nova', count: 8 },
    { self: { x: 0, y: 0 }, target: { x: 1, y: 0 } });
  assert.equal(projs.length, 8);
  assert.ok(Math.abs(projs[1].angle - (Math.PI * 2) / 8) < 1e-6);
});

test('buildProjectiles damage falls back to ctx.damage when the attack omits it', () => {
  const projs = buildProjectiles({ type: 'shootStraight' },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, damage: 14 });
  assert.equal(projs[0].damage, 14);
});

test('buildProjectiles returns nothing for a melee attack', () => {
  const projs = buildProjectiles({ type: 'melee' },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 0);
});

test('shootBurst fires `burst` times spaced by burstGap, then returns to cooldown', () => {
  const att = { type: 'shootBurst', every: 1000, burst: 3, burstGap: 100 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 1000), { fire: true });
  assert.deepEqual(stepAttack(att, rt, 100), { fire: true });
  assert.deepEqual(stepAttack(att, rt, 100), { fire: true });
  assert.deepEqual(stepAttack(att, rt, 100), {});
});

test('buildProjectiles shootHoming makes one homing shot toward the target', () => {
  const projs = buildProjectiles({ type: 'shootHoming', speed: 120, damage: 9 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 1);
  assert.equal(projs[0].homing, true);
  assert.ok(Math.abs(projs[0].angle - 0) < 1e-6);
  assert.equal(projs[0].speed, 120);
});

test('buildProjectiles shootBurst builds one straight shot per fire call', () => {
  const projs = buildProjectiles({ type: 'shootBurst', speed: 300 },
    { self: { x: 0, y: 0 }, target: { x: 0, y: 100 }, damage: 7 });
  assert.equal(projs.length, 1);
  assert.ok(Math.abs(projs[0].angle - Math.PI / 2) < 1e-6);
  assert.equal(projs[0].damage, 7);
});

test('findModifier returns the entry (normalizing string form) or null', () => {
  const def = { modifiers: ['explodesOnDeath', { type: 'onHitBurn', dps: 6, ms: 2000 }] };
  assert.deepEqual(findModifier(def, 'explodesOnDeath'), { type: 'explodesOnDeath' });
  assert.deepEqual(findModifier(def, 'onHitBurn'), { type: 'onHitBurn', dps: 6, ms: 2000 });
  assert.equal(findModifier(def, 'shielded'), null);
  assert.equal(findModifier({}, 'shielded'), null);
});

import { BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS } from '../src/data/tuning.js';

// Helper: run burrow for `ms` ms in one step.
function runBurrow(state, ms, ctx) {
  return MOVEMENTS.burrow({ ...ctx, params: {}, state, dt: ms });
}

const burrowCtx = () => ({
  self: { x: 0, y: 0 },
  target: { x: 100, y: 100 },
  speed: 80,
  dt: 16,
});

test('burrow: starts in submerged state with zero velocity', () => {
  const state = {};
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state });
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
  assert.equal(state.mode, 'submerged');
  assert.equal(v.submerged, true);
});

test('burrow: stays submerged until BURROW_SUBMERGE_MS elapses', () => {
  const state = {};
  // Consume all but the last ms.
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_SUBMERGE_MS - 1 });
  assert.equal(state.mode, 'submerged');
});

test('burrow: transitions to reposition after submerge window', () => {
  const state = {};
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_SUBMERGE_MS + 1 });
  assert.equal(state.mode, 'reposition');
});

test('burrow: reposition snaps to near target immediately (same frame)', () => {
  const state = { mode: 'reposition', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 16 });
  // After reposition the mode advances to 'telegraph'.
  assert.equal(state.mode, 'telegraph');
  // Velocity during reposition is zero (snap is a position write, not velocity).
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
  // The intent carries a reposition target.
  assert.ok(v.repositionTo, 'should carry repositionTo {x,y}');
});

test('burrow: telegraph mode signals surfacing for BURROW_TELEGRAPH_MS', () => {
  const state = { mode: 'telegraph', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_TELEGRAPH_MS - 1 });
  assert.equal(v.surfacing, true);
  assert.equal(state.mode, 'telegraph');
});

test('burrow: telegraph transitions to attack after window', () => {
  const state = { mode: 'telegraph', t: 0 };
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_TELEGRAPH_MS + 1 });
  assert.equal(state.mode, 'attack');
});

test('burrow: attack mode fires a dashStrike and transitions to recover', () => {
  const state = { mode: 'attack', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 16 });
  assert.equal(v.dashStrike, true);
  assert.equal(state.mode, 'recover');
});

test('burrow: recover is vulnerable and returns to submerged after BURROW_RECOVER_MS', () => {
  const state = { mode: 'recover', t: 0 };
  let v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_RECOVER_MS - 1 });
  assert.equal(v.vulnerable, true);
  assert.equal(state.mode, 'recover');
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 2 }); // push past threshold
  assert.equal(state.mode, 'submerged');
});

test('every movement type (including burrow) returns finite velocity', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = MOVEMENTS[type]({ self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, speed: 60, dt: 16, params: {}, state: {} });
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});
