// tests/sprites/recipes.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, getRecipe, hasRecipe, paletteFor } from '../../src/data/sprites/recipes.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { forge } from '../../src/systems/SpriteForge.js';

test('hero recipe exists and references only known parts', () => {
  assert.ok(hasRecipe('hero'));
  const r = getRecipe('hero');
  for (const ref of r.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    assert.ok(PARTS[name], `hero references unknown part ${name}`);
  }
});

test('every recipe references only parts that exist (integrity)', () => {
  for (const [key, r] of Object.entries(RECIPES)) {
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

test('paletteFor uses named palette for hero', () => {
  const p = paletteFor('hero', 0x000000);
  assert.equal(typeof p.outline, 'number');
});

test('hero forges without throwing', () => {
  const r = getRecipe('hero');
  const out = forge(r, PARTS, paletteFor('hero', 0x4fc3f7));
  assert.ok(out.anims['idle-down']);
});
