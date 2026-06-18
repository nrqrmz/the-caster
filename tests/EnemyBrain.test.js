import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMovement, MOVEMENTS, summonSlots, isFlying, resolveMutateOnDeath } from '../src/systems/EnemyBrain.js';
import { ENEMY_MARGIN } from '../src/config.js';
import { BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_SURFACE_MS, BURROW_EMERGE_DIST, EVADE_DODGE_EVERY, EVADE_DODGE_MS, EVADE_DODGE_MUL } from '../src/data/tuning.js';

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

test('burrow: emerge transitions to surface after emergeMs', () => {
  const self = { x: 0, y: 0, radius: 17 };
  const target = { x: 500, y: 0 };
  const params = { submergeMs: 100, emergeMs: 100, surfaceMs: 300 };
  const state = {};

  // Consume the submerge window (100ms)
  MOVEMENTS.burrow({ self, target, speed: 100, dt: 100, params, state });
  assert.equal(state.mode, 'emerge');

  // Still in emerge (warning ring) after small dt
  let v = MOVEMENTS.burrow({ self, target, speed: 100, dt: 16, params, state });
  assert.equal(v.surfacing, true);
  assert.equal(v.submerged, true);

  // After emergeMs expires, transition to surface (vulnerable)
  MOVEMENTS.burrow({ self, target, speed: 100, dt: 100, params, state });
  v = MOVEMENTS.burrow({ self, target, speed: 100, dt: 16, params, state });
  assert.equal(v.vulnerable, true);
});

test('burrow: full cycle — surface chases target and loops back to submerged', () => {
  const self = { x: 0, y: 0, radius: 17 };
  const target = { x: 500, y: 0 }; // Far from self so never triggers safe-ring hold
  const speed = 100;
  const state = {};

  // Phase 1: advance past submerged window (BURROW_SUBMERGE_MS)
  let v = MOVEMENTS.burrow({ self, target, speed, dt: BURROW_SUBMERGE_MS, params: {}, state });
  assert.equal(state.mode, 'emerge', 'should transition to emerge after submergeMs');
  assert.equal(v.submerged, true, 'last submerged frame should return submerged=true');

  // Phase 2: advance past emerge/telegraph window (BURROW_TELEGRAPH_MS)
  v = MOVEMENTS.burrow({ self, target, speed, dt: BURROW_TELEGRAPH_MS, params: {}, state });
  assert.equal(state.mode, 'surface', 'should transition to surface after emergeMs');
  assert.equal(v.surfacing, true, 'last emerge frame should return surfacing=true');
  assert.equal(v.submerged, true, 'emerge is still submerged');

  // Phase 3: assert surface frame — chase velocity toward target + vulnerable
  v = MOVEMENTS.burrow({ self, target, speed, dt: 16, params: {}, state });
  assert.equal(state.mode, 'surface', 'mode stays surface on small dt');
  assert.equal(v.vulnerable, true, 'surface should be vulnerable');
  assert.ok(v.x > 0, 'surface should chase toward target (x-component > 0)');
  assert.ok(Number.isFinite(v.y), 'surface should have finite y velocity');

  // Phase 4: advance past surface window (BURROW_SURFACE_MS) and verify loop-back
  v = MOVEMENTS.burrow({ self, target, speed, dt: BURROW_SURFACE_MS, params: {}, state });
  assert.equal(state.mode, 'submerged', 'should loop back to submerged after surfaceMs');
  assert.equal(v.submerged, true, 'transition frame returns submerged=true');
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

test('no enemy def has a radius below the floor of 12', () => {
  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    if (typeof def.radius === 'number') assert.ok(def.radius >= 12, `${key} radius ${def.radius} < 12`);
  }
});

test('summonSlots: sin cap → sin límite propio', () => {
  assert.equal(summonSlots({ cap: null, alive: 99 }, 0), Infinity);
});

test('summonSlots: con cap y sin invocados → cap completo', () => {
  assert.equal(summonSlots({ cap: 3, alive: 0, cooldownUntil: 0 }, 0), 3);
});

test('summonSlots: al tope → 0', () => {
  assert.equal(summonSlots({ cap: 3, alive: 3, cooldownUntil: 0 }, 0), 0);
});

test('summonSlots: en cooldown → 0 aunque haya hueco', () => {
  assert.equal(summonSlots({ cap: 3, alive: 1, cooldownUntil: 5000 }, 1000), 0);
});

test('summonSlots: cooldown expirado → repone el hueco', () => {
  assert.equal(summonSlots({ cap: 3, alive: 1, cooldownUntil: 5000 }, 6000), 2);
});

test('buildProjectiles: giantFireball es un único disparo recto marcado big', () => {
  const out = buildProjectiles(
    { type: 'giantFireball', speed: 120, damage: 28 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } }
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].big, true);
  assert.equal(out[0].speed, 120);
  assert.equal(out[0].damage, 28);
  assert.ok(Math.abs(out[0].angle) < 1e-9); // recto hacia +x
});

import { pushOutsideRing } from '../src/systems/EnemyBrain.js';

test('pushOutsideRing deja el punto igual si ya está fuera del radio', () => {
  const p = pushOutsideRing({ x: 400, y: 0 }, { x: 0, y: 0 }, 160);
  assert.equal(p.x, 400);
  assert.equal(p.y, 0);
});

test('pushOutsideRing empuja al borde conservando la dirección', () => {
  const p = pushOutsideRing({ x: 30, y: 40 }, { x: 0, y: 0 }, 160); // dist 50 → 160
  assert.ok(Math.abs(Math.hypot(p.x, p.y) - 160) < 1e-6);
  assert.ok(Math.abs(p.x / p.y - 30 / 40) < 1e-6); // misma dirección (3:4)
});

test('pushOutsideRing usa ángulo 0 cuando el punto coincide con el centro', () => {
  const p = pushOutsideRing({ x: 100, y: 100 }, { x: 100, y: 100 }, 160);
  assert.equal(p.x, 260);
  assert.equal(p.y, 100);
});

import { sisterFormation } from '../src/systems/EnemyBrain.js';

test('holdAt avanza hacia el punto y se detiene al llegar', () => {
  const far = computeMovement(
    { movement: { type: 'holdAt', point: { x: 100, y: 0 } } }, {},
    { self: { x: 0, y: 0 }, target: { x: 999, y: 999 }, speed: 60, dt: 16 });
  assert.ok(far.x > 0 && Math.abs(far.y) < 1e-6);            // va hacia el punto, ignora al target
  const near = computeMovement(
    { movement: { type: 'holdAt', point: { x: 3, y: 0 } } }, {},
    { self: { x: 0, y: 0 }, target: { x: 999, y: 0 }, speed: 60, dt: 16 });
  assert.equal(near.x, 0); assert.equal(near.y, 0);          // dentro de 8px: se queda quieto
});

test('sisterFormation con 3 vivas: cazadora persigue, flancos a los anchors', () => {
  const anchors = [{ x: 90, y: 240 }, { x: 390, y: 240 }];
  const live = [
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
    { isChaser: true,  baseMovement: { type: 'chase' } },
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
  ];
  const out = sisterFormation(live, anchors);
  assert.deepEqual(out[0], { type: 'holdAt', point: { x: 90, y: 240 } });
  assert.deepEqual(out[1], { type: 'chase' });
  assert.deepEqual(out[2], { type: 'holdAt', point: { x: 390, y: 240 } });
});

test('sisterFormation con 2 vivas: ambas kite con rangos distintos (separadas)', () => {
  const live = [
    { isChaser: true, baseMovement: { type: 'chase' } },
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
  ];
  const out = sisterFormation(live, []);
  assert.equal(out[0].type, 'kite');
  assert.equal(out[1].type, 'kite');
  assert.notEqual(out[0].range, out[1].range); // rangos distintos → no se enciman
});

test('sisterFormation con 1 viva: usa su propio kit (baseMovement)', () => {
  const live = [{ isChaser: false, baseMovement: { type: 'kite', range: 240 } }];
  const out = sisterFormation(live, []);
  assert.deepEqual(out[0], { type: 'kite', range: 240 });
});

test('burrow: sumergido nada HACIA el objetivo (ya no se queda quieto)', () => {
  const state = {};
  const v = computeMovement(
    { movement: { type: 'burrow' } }, state,
    { self: { x: 0, y: 0 }, target: { x: 500, y: 0 }, speed: 100, dt: 16 });
  assert.equal(v.submerged, true);
  assert.ok(v.x > 0);                 // avanza hacia el objetivo (antes era 0)
  assert.ok(Math.abs(v.y) < 1e-6);
});

test('burrow: sumergido se DETIENE al alcanzar la distancia de emersión', () => {
  const state = {};
  const v = computeMovement(
    { movement: { type: 'burrow' } }, state,
    { self: { x: 0, y: 0 }, target: { x: BURROW_EMERGE_DIST - 20, y: 0 }, speed: 100, dt: 16 }); // dentro del anillo
  assert.equal(v.submerged, true);
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
});

test('burrow: tras submergeMs pasa a emerge (anillo de aviso, sigue invuln)', () => {
  const state = {};
  const ctxB = { self: { x: 0, y: 0 }, target: { x: 500, y: 0 }, speed: 100, dt: BURROW_SUBMERGE_MS };
  computeMovement({ movement: { type: 'burrow' } }, state, ctxB); // consume la ventana submerged
  const v = computeMovement({ movement: { type: 'burrow' } }, state, { ...ctxB, dt: 16 });
  assert.equal(v.submerged, true);
  assert.equal(v.surfacing, true);
});

const evadeCtx = () => ({ self: { x: 0, y: 0 }, target: { x: 200, y: 0 }, speed: 80, dt: 16 });

test('evade: approaches the target when out of range and not dodging', () => {
  const state = {};
  const v = MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state });
  assert.ok(v.x > 0, 'should move toward target on +x');
  assert.ok(Math.abs(v.y) < 1e-6, 'no lateral component when not dodging');
});

test('evade: triggers a perpendicular dash after EVADE_DODGE_EVERY ms', () => {
  const state = {};
  // Accumulate just past the dodge interval in one step.
  const v = MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_EVERY + 1 });
  assert.equal(state.mode, 'dodge');
  // During a dodge the velocity is mostly lateral (perpendicular to the target heading, which is +x → lateral is ±y).
  assert.ok(Math.abs(v.y) > Math.abs(v.x), 'dodge is lateral');
  const mag = Math.hypot(v.x, v.y);
  assert.ok(mag > 80 * (EVADE_DODGE_MUL - 1), `dodge is fast, got ${mag}`);
});

test('evade: returns to approach after the dodge window elapses', () => {
  const state = {};
  MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_EVERY + 1 }); // enter dodge
  MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_MS + 1 });     // dodge ends
  assert.equal(state.mode, 'approach');
});

test('evade: every movement type still returns finite velocity (regression)', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = MOVEMENTS[type]({ self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, speed: 60, dt: 16, params: {}, state: {} });
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});

test('isFlying reads the flying flag', () => {
  assert.equal(isFlying({ flying: true }), true);
  assert.equal(isFlying({ flying: false }), false);
  assert.equal(isFlying({}), false);
  assert.equal(isFlying(null), false);
});

test('resolveMutateOnDeath returns null when no modifier', () => {
  assert.equal(resolveMutateOnDeath({ modifiers: [] }), null);
  assert.equal(resolveMutateOnDeath({}), null);
});

test('resolveMutateOnDeath resolves an enemy spawn (lobo -> fleeing human)', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', spawnType: 'cautivo_huye', count: 1 }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'enemy', spawnType: 'cautivo_huye', count: 1 });
});

test('resolveMutateOnDeath resolves a hazard zone (fungus -> spore cloud)', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', zone: { radius: 50, dps: 18, duration: 2500 } }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'zone', radius: 50, dps: 18, duration: 2500 });
});

test('resolveMutateOnDeath defaults count to 1 for enemy spawns', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', spawnType: 'lobo' }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'enemy', spawnType: 'lobo', count: 1 });
});

import { selectTransmuteTarget, transmuteBeastKey } from '../src/systems/EnemyBrain.js';

const cap = (x, y, extra = {}) => ({ x, y, active: true, def: { transmuteTo: 'lobo' }, _transmuteLocked: false, ...extra });

test('selectTransmuteTarget picks the nearest active captive', () => {
  const near = cap(10, 0);
  const far = cap(100, 0);
  const chosen = selectTransmuteTarget({ x: 0, y: 0 }, [far, near]);
  assert.equal(chosen, near);
});

test('selectTransmuteTarget skips inactive, non-captive, and already-locked candidates', () => {
  const inactive = cap(5, 0, { active: false });
  const notCaptive = cap(6, 0, { def: {} });
  const locked = cap(7, 0, { _transmuteLocked: true });
  const valid = cap(50, 0);
  const chosen = selectTransmuteTarget({ x: 0, y: 0 }, [inactive, notCaptive, locked, valid]);
  assert.equal(chosen, valid);
});

test('selectTransmuteTarget returns null when no valid candidate', () => {
  assert.equal(selectTransmuteTarget({ x: 0, y: 0 }, []), null);
  assert.equal(selectTransmuteTarget({ x: 0, y: 0 }, [cap(1, 1, { active: false })]), null);
});

test('transmuteBeastKey returns the captive def transmuteTo, or null', () => {
  assert.equal(transmuteBeastKey({ transmuteTo: 'lobo' }), 'lobo');
  assert.equal(transmuteBeastKey({}), null);
});

