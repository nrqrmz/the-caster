// tests/sprites/recipes.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, getRecipe, hasRecipe, paletteFor } from '../../src/data/sprites/recipes.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { NAMED_PALETTES, derivePalette } from '../../src/data/sprites/palettes.js';

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
  assert.equal(p.accent, NAMED_PALETTES.hero.accent);
});

test('hero forges without throwing', () => {
  const r = getRecipe('hero');
  const out = forge(r, PARTS, paletteFor('hero', 0x4fc3f7));
  assert.ok(out.anims['idle-down']);
});

test('paletteFor derive path: unknown key returns derivePalette of baseColor', () => {
  assert.deepEqual(paletteFor('__nonexistent__', 0xabcdef), derivePalette(0xabcdef));
});

test('paletteFor derive path: different base colors produce different palettes', () => {
  assert.notDeepEqual(paletteFor('__x__', 0xff0000), paletteFor('__y__', 0x00ff00));
});

test('projectile recipes exist and forge', () => {
  for (const k of ['orb', 'fireball', 'arrow']) {
    assert.ok(hasRecipe(k), `missing projectile recipe ${k}`);
    const out = forge(getRecipe(k), PARTS, paletteFor(k, getRecipe(k).baseColor));
    assert.ok(out.anims['idle-down']);
  }
});

import { FIRE_ENEMIES } from '../../src/data/enemies/fire.js';

test('every fire enemy + generic has a recipe with known parts', () => {
  const keys = [...Object.keys(FIRE_ENEMIES), 'villager', 'warrior', 'archer'];
  for (const key of keys) {
    assert.ok(hasRecipe(key), `'${key}' has no sprite recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

test('every fire boss has a recipe with known parts', () => {
  for (const key of ['pyra', 'vesta', 'favilla', 'ignatius']) {
    assert.ok(hasRecipe(key), `fire boss '${key}' has no recipe`);
    const r = getRecipe(key);
    assert.equal(typeof r.baseColor, 'number', `boss '${key}' recipe must set baseColor`);
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

import { WATER_ENEMIES } from '../../src/data/enemies/water.js';

test('every water enemy has a recipe with known parts', () => {
  for (const key of Object.keys(WATER_ENEMIES)) {
    assert.ok(hasRecipe(key), `water enemy '${key}' has no recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

test('every water boss + form has a recipe with baseColor and known parts', () => {
  const keys = ['soldado_hielo','sapo_desovador','tiburon_abisal','kraken','dama_lago','dama_maga','dama_tiburon','dama_kraken','dama_ballena','dama_maga_final'];
  for (const key of keys) {
    assert.ok(hasRecipe(key), `water boss '${key}' has no recipe`);
    const r = getRecipe(key);
    assert.equal(typeof r.baseColor, 'number', `boss '${key}' recipe must set baseColor`);
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

// GLOBAL parity: every registered enemy type the game can spawn must have a sprite recipe.
import { ENEMY_TYPES } from '../../src/data/enemies.js';

test('GLOBAL: every registered enemy type has a sprite recipe', () => {
  const missing = Object.keys(ENEMY_TYPES).filter((k) => !hasRecipe(k));
  assert.deepEqual(missing, [], `enemy types without recipe: ${missing.join(', ')}`);
});
