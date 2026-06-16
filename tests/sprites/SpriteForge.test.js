import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forge, composeColorGrid, DESIGN } from '../../src/systems/SpriteForge.js';

const PAL = { outline: 0x111111, base: 0x222222, shade: 0x333333, highlight: 0x444444, accent: 0x555555 };
const PARTS = {
  dot16: { res: 16, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['b'], up: ['b'], side: ['b'] },
  dot32: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['h'], up: ['h'], side: ['h'] },
};

test('DESIGN is 32', () => { assert.equal(DESIGN, 32); });

test('composeColorGrid upscales a legacy res:16 part ×2 (fills a 2×2 block)', () => {
  const g = composeColorGrid({ parts: ['dot16'] }, PARTS, 'down', PAL);
  assert.equal(g.length, 32);
  assert.equal(g[0][0], PAL.base);
  assert.equal(g[0][1], PAL.base);
  assert.equal(g[1][0], PAL.base);
  assert.equal(g[1][1], PAL.base);
  assert.equal(g[2][0], null);
});

test('composeColorGrid stamps a res:32 part 1:1', () => {
  const g = composeColorGrid({ parts: ['dot32'] }, PARTS, 'down', PAL);
  assert.equal(g[0][0], PAL.highlight);
  assert.equal(g[0][1], null);
  assert.equal(g[1][0], null);
});

test('composeColorGrid resolves a part-ref palette override, not the recipe palette', () => {
  const partPalette = (ref) => (ref.color != null ? { ...PAL, base: ref.color } : null);
  const g = composeColorGrid({ parts: [{ name: 'dot16', color: 0xabcdef }] }, PARTS, 'down', PAL, partPalette);
  assert.equal(g[0][0], 0xabcdef);
});

test('composeColorGrid throws on unknown part and unknown role char', () => {
  assert.throws(() => composeColorGrid({ parts: ['ghost'] }, {}, 'down', PAL), /unknown part/);
  const bad = { x: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['z'], up: ['z'], side: ['z'] } };
  assert.throws(() => composeColorGrid({ parts: ['x'] }, bad, 'down', PAL), /unknown role char/);
});

test('forge: scale follows size/DESIGN; output texture is DESIGN*scale', () => {
  const out32 = forge({ size: 32, parts: ['dot32'], anim: { idle: 1, walk: 1 } }, PARTS, PAL);
  assert.equal(out32.size, 32);
  assert.equal(out32.anims['idle-down'][0].length, 32);
  const out64 = forge({ size: 64, parts: ['dot32'], anim: { idle: 1, walk: 1 } }, PARTS, PAL);
  assert.equal(out64.size, 64);
  assert.equal(out64.anims['idle-down'][0].length, 64);
});

test('forge produces idle and walk frame sets per direction', () => {
  const out = forge({ size: 32, parts: ['dot16'], anim: { idle: 2, walk: 2 } }, PARTS, PAL);
  assert.equal(out.anims['idle-down'].length, 2);
  assert.equal(out.anims['walk-side'].length, 2);
  assert.equal(out.anims['idle-down'][0][0][0], PAL.base);
});
