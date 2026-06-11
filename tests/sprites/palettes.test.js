// tests/sprites/palettes.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darken, lighten, derivePalette, NAMED_PALETTES } from '../../src/data/sprites/palettes.js';

test('darken/lighten move toward black/white', () => {
  assert.ok(darken(0x808080, 0.5) < 0x808080);
  assert.ok(lighten(0x808080, 0.5) > 0x808080);
  assert.equal(darken(0xffffff, 1), 0x000000);
  assert.equal(lighten(0x000000, 1), 0xffffff);
});

test('derivePalette returns 5 concrete roles', () => {
  const p = derivePalette(0x4fc3f7);
  for (const role of ['outline', 'base', 'shade', 'highlight', 'accent']) {
    assert.equal(typeof p[role], 'number', `${role} must be a number`);
    assert.ok(p[role] >= 0 && p[role] <= 0xffffff);
  }
  assert.equal(p.base, 0x4fc3f7);
  const lum = (c) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  assert.ok(lum(p.shade) < lum(p.base), 'shade must be darker than base');
  assert.ok(lum(p.highlight) > lum(p.base), 'highlight must be lighter than base');
});

test('derivePalette honors overrides', () => {
  const p = derivePalette(0x4fc3f7, { accent: 0xff0000 });
  assert.equal(p.accent, 0xff0000);
});

test('NAMED_PALETTES.hero exists and is full', () => {
  assert.ok(NAMED_PALETTES.hero);
  assert.equal(typeof NAMED_PALETTES.hero.outline, 'number');
});
