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
