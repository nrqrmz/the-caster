import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMovement, MOVEMENTS } from '../src/systems/EnemyBrain.js';
import { ENEMY_MARGIN } from '../src/config.js';

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

test('burrow: ciclo submerged → reposition → emerge → surface → submerged', () => {
  const self = { x: 100, y: 100, radius: 17 };
  const target = { x: 200, y: 200 };
  const params = { submergeMs: 100, emergeMs: 100, surfaceMs: 300 };
  const state = {};
  const step = () => MOVEMENTS.burrow({ self, target, speed: 100, dt: 100, params, state });

  // 1) submerged: invuln, sin moverse
  let v = step();
  assert.equal(v.submerged, true);
  assert.equal(v.x, 0); assert.equal(v.y, 0);

  // 2) reposition: teletransporta junto al objetivo, sigue submerged
  v = step();
  assert.equal(v.submerged, true);
  assert.ok(v.repositionTo && typeof v.repositionTo.x === 'number');

  // 3) emerge: aviso de superficie, aún invuln (submerged true)
  v = step();
  assert.equal(v.surfacing, true);
  assert.equal(v.submerged, true);

  // 4) surface: vulnerable y persiguiendo al objetivo (velocidad hacia abajo-derecha)
  v = step();
  assert.equal(v.vulnerable, true);
  assert.equal(v.submerged, undefined);
  assert.ok(v.x > 0 && v.y > 0);

  // 5) sigue en surface (300ms de ventana, dt 100 → 3 frames vulnerables)
  v = step();
  assert.equal(v.vulnerable, true);

  // 6) expira la superficie → vuelve a submerged
  v = step();
  assert.equal(v.submerged, true);
});

test('every movement type (including burrow) returns finite velocity', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = MOVEMENTS[type]({ self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, speed: 60, dt: 16, params: {}, state: {} });
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});

import { buildSplitChildren } from '../src/systems/EnemyBrain.js';

test('buildSplitChildren returns count child defs scaled to 0.5x hp/radius', () => {
  const def = { hp: 80, radius: 18, speed: 60, tex: 'circle', damage: 6,
                modifiers: [{ type: 'splitsOnDeath', spawnType: null, count: 2 }] };
  const children = buildSplitChildren(def);
  assert.equal(children.length, 2);
  for (const c of children) {
    assert.equal(c.hp, 40);
    assert.ok(c.radius < def.radius);
    assert.equal(c._split, true);
  }
});

test('buildSplitChildren returns [] when modifier absent or _split is already set', () => {
  const def = { hp: 80, modifiers: [] };
  assert.deepEqual(buildSplitChildren(def), []);

  const split = { hp: 80, modifiers: [{ type: 'splitsOnDeath', count: 2 }], _split: true };
  assert.deepEqual(buildSplitChildren(split), []);
});

test('buildSplitChildren respects custom spawnType by recording it on the child def', () => {
  const def = { hp: 100, radius: 20, speed: 70, tex: 'circle', damage: 8,
                modifiers: [{ type: 'splitsOnDeath', spawnType: 'medusaChild', count: 2 }] };
  const children = buildSplitChildren(def);
  assert.equal(children[0]._spawnType, 'medusaChild');
});

import { tickLifecycle, LIFECYCLE } from '../src/systems/EnemyBrain.js';
import { EGG_HATCH_MS, TADPOLE_GROW_MS } from '../src/data/tuning.js';

test('tickLifecycle: egg stays egg until EGG_HATCH_MS elapses', () => {
  const state = { lifecycle: LIFECYCLE.EGG, lifecycleTimer: 0 };
  const result = tickLifecycle(state, EGG_HATCH_MS - 1);
  assert.equal(result.promote, false);
  assert.equal(state.lifecycle, LIFECYCLE.EGG);
});

test('tickLifecycle: egg promotes to tadpole after EGG_HATCH_MS', () => {
  const state = { lifecycle: LIFECYCLE.EGG, lifecycleTimer: 0 };
  const result = tickLifecycle(state, EGG_HATCH_MS + 1);
  assert.equal(result.promote, true);
  assert.equal(result.promoteTo, LIFECYCLE.TADPOLE);
  assert.equal(state.lifecycle, LIFECYCLE.TADPOLE);
  assert.equal(state.lifecycleTimer, 0);
});

test('tickLifecycle: tadpole promotes to adult after TADPOLE_GROW_MS', () => {
  const state = { lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: 0 };
  tickLifecycle(state, TADPOLE_GROW_MS + 1);
  const result = tickLifecycle({ lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: TADPOLE_GROW_MS + 1 }, 0);
  // Direct: force already-elapsed.
  const s2 = { lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: TADPOLE_GROW_MS + 100 };
  const r2 = tickLifecycle(s2, 0);
  assert.equal(r2.promote, true);
  assert.equal(r2.promoteTo, LIFECYCLE.ADULT);
});

test('tickLifecycle: adult has no further promotion', () => {
  const state = { lifecycle: LIFECYCLE.ADULT, lifecycleTimer: 99999 };
  const result = tickLifecycle(state, 0);
  assert.equal(result.promote, false);
});

test('tickLifecycle: no lifecycle field → no promotion (non-frog enemy)', () => {
  const state = {};
  const result = tickLifecycle(state, 1000);
  assert.equal(result.promote, false);
});

import { ENEMY_TYPES } from '../src/data/enemies/index.js';

test('split children clamp radius to a floor of 16', () => {
  const parent = { hp: 40, radius: 18, modifiers: [{ type: 'splitsOnDeath', count: 2, spawnType: 'x' }] };
  const kids = buildSplitChildren(parent);
  assert.equal(kids.length, 2);
  for (const k of kids) assert.ok(k.radius >= 16, `radius ${k.radius} below floor`);
  assert.equal(kids[0].radius, 16); // 18*0.7=12.6 -> 13, clamped to 16
});

test('split children keep ×0.7 when above the floor', () => {
  const parent = { hp: 100, radius: 30, modifiers: [{ type: 'splitsOnDeath', count: 1, spawnType: 'x' }] };
  const kids = buildSplitChildren(parent);
  assert.equal(kids[0].radius, 21); // round(30*0.7)
});

test('no enemy def has a radius below the floor of 16', () => {
  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    if (typeof def.radius === 'number') assert.ok(def.radius >= 16, `${key} radius ${def.radius} < 16`);
  }
});

