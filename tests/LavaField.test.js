import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lavaPulse, lavaRimAlpha, lavaSpots, lavaEmbers, lerpColor, lavaEdgeEmbers } from '../src/systems/LavaField.js';

test('lavaPulse / lavaRimAlpha stay in 0..1 and animate over time', () => {
  for (const t of [0, 123, 999, 5000]) {
    const p = lavaPulse(t), a = lavaRimAlpha(t);
    assert.ok(p >= 0 && p <= 1, `pulse ${p}`);
    assert.ok(a >= 0 && a <= 1, `rim ${a}`);
  }
  assert.notEqual(lavaPulse(0), lavaPulse(400)); // animated
});

test('lavaSpots returns `count` spots within the radius, drifting over time', () => {
  const s0 = lavaSpots(40, 0, 7);
  assert.equal(s0.length, 7);
  for (const s of s0) {
    assert.ok(Math.hypot(s.x, s.y) <= 40 + 1e-9, 'spot inside radius');
    assert.ok(s.r > 0 && s.bright >= 0 && s.bright <= 1);
  }
  const s1 = lavaSpots(40, 500, 7);
  assert.notEqual(JSON.stringify(s0), JSON.stringify(s1)); // animated
});

test('lavaEmbers rise (negative y) and fade (alpha 0..1)', () => {
  const e = lavaEmbers(40, 250, 6);
  assert.equal(e.length, 6);
  for (const p of e) {
    assert.ok(p.y <= 0, `ember rises: y=${p.y}`);
    assert.ok(p.alpha >= 0 && p.alpha <= 1, `alpha ${p.alpha}`);
    assert.ok(p.r > 0);
  }
});

test('lerpColor interpolates channel-wise', () => {
  assert.equal(lerpColor(0x000000, 0xffffff, 0), 0x000000);
  assert.equal(lerpColor(0x000000, 0xffffff, 1), 0xffffff);
  assert.equal(lerpColor(0x000000, 0xffffff, 0.5), 0x808080); // Math.round(127.5) = 128
  assert.equal(lerpColor(0xff0000, 0x0000ff, 0.5), 0x800080);
});

test('lavaEdgeEmbers spaces embers along a segment and rises', () => {
  const e = lavaEdgeEmbers({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 5);
  assert.equal(e.length, 5);
  // x roughly increases along the edge; y is at/above the line (<= ~0)
  assert.ok(e[0].x < e[4].x);
  for (const p of e) assert.ok(p.y <= 0 + 1e-9 && p.alpha >= 0 && p.alpha <= 1);
});
