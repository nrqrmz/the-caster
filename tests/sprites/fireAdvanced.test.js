import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_ADVANCED_META, FIRE_ADVANCED_PARTS } from '../../src/data/sprites/partsFireAdvanced.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireAdvancedRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { ENEMY_TYPES } from '../../src/data/enemies/index.js';
import { FIGURES } from '../../tools/fire-advanced-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-advanced.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireAdvanced.js', import.meta.url));
const sizeOf = (key) => FIRE_ADVANCED_META[key].body.size ?? 32;

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_ADVANCED_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fa_${key}`], FIRE_ADVANCED_PARTS[`fa_${key}`]);
});

test('cada figura: bodySize = radius*2 del enemigo, minWidth ≥ bodySize, y el módulo generado lo respeta', () => {
  for (const [key, f] of Object.entries(FIGURES)) {
    const want = ENEMY_TYPES[key].radius * 2;
    assert.equal(f.bodySize, want, `${key} bodySize`);
    assert.ok(f.minWidth >= want, `${key} minWidth ${f.minWidth} < ${want}`);
    assert.equal(sizeOf(key), want, `${key} body.size generado`);
  }
});

test('cada sprite: cuerpo dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_ADVANCED_META)) {
    const p = FIRE_ADVANCED_PARTS[`fa_${key}`], size = sizeOf(key);
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + size <= m.gridW && m.body.y + size <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('cada silueta mide al menos lo que su cuerpo de ancho', () => {
  for (const key of Object.keys(FIRE_ADVANCED_META)) {
    let lo = Infinity, hi = -1;
    for (const row of FIRE_ADVANCED_PARTS[`fa_${key}`].down) {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    assert.ok(hi - lo + 1 >= sizeOf(key), `${key} ancho ${hi - lo + 1} < ${sizeOf(key)}`);
  }
});

test('fireAdvancedRecipe forja un frame estático del tamaño del lienzo y pasa los extras', () => {
  for (const key of Object.keys(FIRE_ADVANCED_META)) {
    const r = fireAdvancedRecipe(key, 'beast');
    assert.equal(r.static, true);
    assert.equal(r.scale, 1);
    assert.deepEqual(r.parts, [{ name: `fa_${key}` }]);
    assert.deepEqual(r.body, FIRE_ADVANCED_META[key].body);
    const out = forge(r, PARTS, derivePalette(0x888888));
    const g = out.anims['idle-down'][0];
    assert.equal(out.anims['walk-side'].length, 1);
    assert.equal(g.length, FIRE_ADVANCED_META[key].gridH);
    assert.equal(g[0].length, FIRE_ADVANCED_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
  const key = Object.keys(FIRE_ADVANCED_META)[0];
  assert.equal(fireAdvancedRecipe(key, 'beast', { faces: true }).faces, true);
});

test('fireAdvancedRecipe lanza con una clave sin sprite generado', () => {
  assert.throws(() => fireAdvancedRecipe('no_existe', 'beast'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fire-advanced-'));
  try {
    const out = join(dir, 'parts.js');
    execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
    assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
