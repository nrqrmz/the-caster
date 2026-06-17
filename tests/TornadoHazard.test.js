import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInside, forceAt, inEye, scaleForPhase } from '../src/systems/TornadoHazard.js';
import { TORNADO_RADIUS, TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC } from '../src/data/tuning.js';

const CENTER = { x: 240, y: 427 };
const R = TORNADO_RADIUS;

test('isInside: true within radius, false outside', () => {
  assert.equal(isInside(CENTER, R, { x: CENTER.x, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R + 1, y: CENTER.y }), false);
});

test('forceAt: zero at the edge', () => {
  const v = forceAt(CENTER, R, { x: CENTER.x + R, y: CENTER.y }, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3);
});

test('forceAt: directed toward the eye, near-max just outside the eye', () => {
  const pos = { x: CENTER.x + R * 0.5, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(v.x < 0, 'pulls left toward center');
  assert.ok(Math.abs(v.y) < 1, 'mostly horizontal');
  const near = { x: CENTER.x + R * (TORNADO_EYE_RADIUS_FRAC + 0.02), y: CENTER.y };
  const vn = forceAt(CENTER, R, near, 100);
  assert.ok(Math.hypot(vn.x, vn.y) > TORNADO_EYE_PULL * 100 * 0.6, 'strong pull just outside the eye');
});

test('forceAt: monotonically grows from edge inward to the eye', () => {
  let prev = 0;
  for (const d of [R * 0.9, R * 0.6, R * 0.3, R * (TORNADO_EYE_RADIUS_FRAC + 0.01)]) {
    const v = forceAt(CENTER, R, { x: CENTER.x + d, y: CENTER.y }, 100);
    const mag = Math.hypot(v.x, v.y);
    assert.ok(mag >= prev - 1e-6, `not monotone at d=${d}`);
    prev = mag;
  }
});

test('inEye: true within the calm eye, and the eye has ZERO pull (inverse of whirlpool DoT)', () => {
  assert.equal(inEye(CENTER, R, CENTER), true);
  const eyePos = { x: CENTER.x + R * TORNADO_EYE_RADIUS_FRAC * 0.5, y: CENTER.y };
  const v = forceAt(CENTER, R, eyePos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3, 'no pull inside the calm eye');
  assert.equal(inEye(CENTER, R, { x: CENTER.x + R * 0.5, y: CENTER.y }), false);
});

test('scaleForPhase: phase 1 = 1.0, later phases stronger', () => {
  assert.equal(scaleForPhase(1), 1.0);
  assert.ok(scaleForPhase(3) > scaleForPhase(1));
});
