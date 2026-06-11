import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  forceAt, isInside, centerDot, scaleForPhase,
} from '../src/systems/WhirlpoolHazard.js';
import { WHIRLPOOL_RADIUS, WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS } from '../src/data/tuning.js';

const CENTER = { x: 240, y: 427 };
const R = WHIRLPOOL_RADIUS;

test('isInside: true when within radius, false outside', () => {
  assert.equal(isInside(CENTER, R, { x: CENTER.x, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R - 1, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R + 1, y: CENTER.y }), false);
});

test('forceAt: zero force at the edge (distance = radius)', () => {
  const pos = { x: CENTER.x + R, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3);
});

test('forceAt: max force at the center (= WHIRLPOOL_CENTER_PULL * casterSpeed)', () => {
  const casterSpeed = 100;
  const v = forceAt(CENTER, R, CENTER, casterSpeed);
  const mag = Math.hypot(v.x, v.y);
  // At the center, distance = 0. forceAt should return 0 velocity (nowhere to pull toward).
  // The force direction is toward center; at center itself, the force magnitude is maximum
  // but direction is undefined — implementation may return zero or a stable fallback.
  // We test a point very close to center instead.
  const nearCenter = { x: CENTER.x + 1, y: CENTER.y };
  const v2 = forceAt(CENTER, R, nearCenter, casterSpeed);
  const mag2 = Math.hypot(v2.x, v2.y);
  assert.ok(mag2 > WHIRLPOOL_CENTER_PULL * casterSpeed * 0.9,
    `expected near-max force, got ${mag2}`);
});

test('forceAt: force is directed toward center', () => {
  const pos = { x: CENTER.x + 40, y: CENTER.y }; // to the right of center
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(v.x < 0, 'force should pull left (toward center)');
  assert.ok(Math.abs(v.y) < 1, 'force should be mostly horizontal');
});

test('forceAt: force grows from 0 at edge to max near center (monotone)', () => {
  const casterSpeed = 100;
  const distances = [R * 0.9, R * 0.6, R * 0.3, R * 0.05];
  let prevMag = 0;
  for (const d of distances) { // from edge inward toward center
    const pos = { x: CENTER.x + d, y: CENTER.y };
    const v = forceAt(CENTER, R, pos, casterSpeed);
    const mag = Math.hypot(v.x, v.y);
    assert.ok(mag >= prevMag - 1e-6, `force not monotone at d=${d}: ${mag} < ${prevMag}`);
    prevMag = mag;
  }
});

test('centerDot: returns DPS when inside center zone, 0 outside', () => {
  const centerZoneRadius = R * 0.2;
  assert.ok(centerDot(CENTER, R, CENTER) > 0);
  const outside = { x: CENTER.x + R * 0.5, y: CENTER.y };
  assert.equal(centerDot(CENTER, R, outside), 0);
});

test('centerDot: center DPS matches WHIRLPOOL_CENTER_DPS at the very center', () => {
  assert.equal(centerDot(CENTER, R, CENTER), WHIRLPOOL_CENTER_DPS);
});

test('scaleForPhase: phase 1 returns 1.0, phase 3 returns a larger multiplier', () => {
  const p1 = scaleForPhase(1);
  const p3 = scaleForPhase(3);
  assert.equal(p1, 1.0);
  assert.ok(p3 > p1);
});

test('forceAt outside radius returns zero vector', () => {
  const pos = { x: CENTER.x + R + 50, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-6);
});
