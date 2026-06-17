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

test('hero forges with per-part palettes (multi-hue: red hair + green gown)', () => {
  const r = getRecipe('hero');
  const partPalette = (ref) => (ref.palette ? NAMED_PALETTES[ref.palette] : null);
  const out = forge(r, PARTS, paletteFor('hero', 0x4fc3f7), partPalette);
  assert.ok(out.anims['idle-down']);
  const colors = new Set(out.anims['idle-down'][0].flat().filter((c) => c != null));
  assert.ok(colors.has(NAMED_PALETTES.redhair.base), 'red hair base color present in forged hero');
  assert.ok(colors.has(NAMED_PALETTES.greengown.base), 'green gown base color present in forged hero');
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

test('every air boss + form has a recipe with a forgeable base', () => {
  const keys = ['caballero_sangre','bruja_vendaval','elemental_tormenta','lider_cultista',
    'galahad_humano','galahad_rage','galahad_rage2','galahad_murcielago','galahad_final'];
  for (const key of keys) {
    assert.ok(hasRecipe(key), `air boss '${key}' has no recipe`);
    const r = getRecipe(key);
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

// GLOBAL parity: every registered enemy type the game can spawn must have a sprite recipe.
import { ENEMY_TYPES } from '../../src/data/enemies.js';

test('GLOBAL: every registered enemy type has a sprite recipe (geometric-flagged enemies exempt)', () => {
  // Air enemies ship with geometric textures for now; their 32x32 sprite recipes are a
  // separate, user-reviewed follow-up. They declare `geometric: true` to opt out here.
  // Any enemy WITHOUT a recipe that is NOT flagged geometric still fails this invariant.
  const missing = Object.keys(ENEMY_TYPES).filter((k) => !hasRecipe(k) && !ENEMY_TYPES[k].geometric);
  assert.deepEqual(missing, [], `enemy types without recipe: ${missing.join(', ')}`);
});

// Mirror BootScene's exact forge path for EVERY recipe so a bad part/role char
// in any creature fails `node --test`, not only at runtime boot.
test('every recipe forges without throwing (mirrors BootScene)', () => {
  for (const [key, recipe] of Object.entries(RECIPES)) {
    const baseColor = recipe.baseColor ?? ENEMY_TYPES[key]?.color ?? 0x4fc3f7;
    const out = forge(recipe, PARTS, paletteFor(key, baseColor));
    assert.ok(out.anims['idle-down'] && out.anims['idle-down'][0], `${key} produced no idle-down frame`);
  }
});

test('elemental_tormenta forges as a native 2:1 sprite (64×32 grid → 128×64) and animates 4 idle frames', () => {
  const r = getRecipe('elemental_tormenta');
  assert.equal(r.gridW, 64);
  assert.equal(r.gridH, 32);
  const out = forge(r, PARTS, paletteFor('elemental_tormenta', r.baseColor));
  // forged texture dims: gridW*scale × gridH*scale = 128 × 64, 2:1 ratio.
  assert.equal(out.width, 128);
  assert.equal(out.height, 64);
  assert.equal(out.width, 2 * out.height);
  const idle = out.anims['idle-down'];
  assert.equal(idle.length, 4, 'four authored idle (lightning) frames');
  for (const f of idle) {
    assert.equal(f.length, 64, 'frame rows = gridH*scale');
    assert.equal(f[0].length, 128, 'frame cols = gridW*scale');
  }
  // animation actually changes: at least two idle frames differ (crackling lightning).
  const flat = (f) => f.flat().map((c) => (c == null ? -1 : c)).join(',');
  assert.notEqual(flat(idle[0]), flat(idle[1]), 'idle frames differ (lightning crackle)');
});
