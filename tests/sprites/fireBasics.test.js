import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_BASIC_META, FIRE_BASIC_PARTS } from '../../src/data/sprites/partsFireBasics.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireBasicRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { FIGURES } from '../../tools/fire-basics-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-basics.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireBasics.js', import.meta.url));

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_BASIC_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fb_${key}`], FIRE_BASIC_PARTS[`fb_${key}`]);
});

test('cada sprite: cuerpo 32×32 dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_BASIC_META)) {
    const p = FIRE_BASIC_PARTS[`fb_${key}`];
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + 32 <= m.gridW && m.body.y + 32 <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('fireBasicRecipe forja un frame estático del tamaño del lienzo', () => {
  for (const key of Object.keys(FIRE_BASIC_META)) {
    const r = fireBasicRecipe(key, 'humanoid');
    assert.equal(r.static, true);
    assert.deepEqual(r.parts, [{ name: `fb_${key}` }]);
    const out = forge(r, PARTS, derivePalette(0x888888));
    const g = out.anims['idle-down'][0];
    assert.equal(out.anims['walk-side'].length, 1);
    assert.equal(g.length, FIRE_BASIC_META[key].gridH);
    assert.equal(g[0].length, FIRE_BASIC_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
});

test('fireBasicRecipe lanza con una clave sin sprite generado', () => {
  assert.throws(() => fireBasicRecipe('no_existe', 'humanoid'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'fire-basics-')), 'parts.js');
  execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
  assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
});
