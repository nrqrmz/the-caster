// tests/sprites/SpriteForge.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forge, composeGrid, DESIGN } from '../../src/systems/SpriteForge.js';

const PARTS = {
  block: {
    w: 4, h: 4, anchor: { x: 6, y: 6 },
    down: ['bbbb', 'bbbb', 'bbbb', 'bbbb'],
    up: ['oooo', 'oooo', 'oooo', 'oooo'],   // back differs from front
    side: ['bbbb', 'bbbb', 'bsbb', 'bbbb'],
  },
};
const PALETTE = { outline: 0x111111, base: 0x4444ff, shade: 0x2222aa, highlight: 0x8888ff, accent: 0xffff00 };

test('composeGrid stamps a part onto a 16x16 role grid', () => {
  const g = composeGrid({ parts: ['block'] }, PARTS, 'down');
  assert.equal(g.length, DESIGN);
  assert.equal(g[0].length, DESIGN);
  assert.equal(g[6][6], 'b');
  assert.equal(g[0][0], '.');
});

test('forge returns 6 anims with correct frame counts and color grids', () => {
  const out = forge({ size: 16, parts: ['block'], anim: { idle: 2, walk: 2 } }, PARTS, PALETTE);
  assert.equal(out.size, 16);
  for (const key of ['idle-down', 'idle-up', 'idle-side', 'walk-down', 'walk-up', 'walk-side']) {
    assert.ok(out.anims[key], `missing ${key}`);
  }
  assert.equal(out.anims['idle-down'].length, 2);
  assert.equal(out.anims['walk-down'].length, 2);
  const frame = out.anims['idle-down'][0];
  assert.equal(frame.length, 16);
  assert.equal(frame[0].length, 16);
  assert.equal(frame[6][6], PALETTE.base); // role 'b' resolved to base color
  assert.equal(frame[0][0], null);         // transparent
});

test('up (back) differs from down, and walk frames differ', () => {
  const out = forge({ size: 16, parts: ['block'], anim: { idle: 1, walk: 2 } }, PARTS, PALETTE);
  assert.notDeepEqual(out.anims['idle-up'][0], out.anims['idle-down'][0]);
  assert.notDeepEqual(out.anims['walk-down'][0], out.anims['walk-down'][1]);
});

test('scale produces a larger grid (size 32 = 2x)', () => {
  const out = forge({ size: 32, parts: ['block'], anim: { idle: 1, walk: 1 } }, PARTS, PALETTE);
  assert.equal(out.size, 32);
  assert.equal(out.anims['idle-down'][0].length, 32);
});
