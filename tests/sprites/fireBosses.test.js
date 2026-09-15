import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_BOSS_META, FIRE_BOSS_PARTS } from '../../src/data/sprites/partsFireBosses.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireBossRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { PYRA, VESTA, FAVILLA, IGNATIUS } from '../../src/data/bosses/fire.js';
import { FIGURES, SIDE, BODY } from '../../tools/fire-bosses-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-bosses.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireBosses.js', import.meta.url));
const BOSS_DEFS = { pyra: PYRA, vesta: VESTA, favilla: FAVILLA, ignatius: IGNATIUS };
const sizeOf = (key) => FIRE_BOSS_META[key].body.size ?? 32;
const silhouette = (key) => {
  const rows = FIRE_BOSS_PARTS[`fj_${key}`].down;
  let lo = Infinity, hi = -1, h = 0;
  for (const row of rows) {
    if (/[^.]/.test(row)) h++;
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  return { w: hi - lo + 1, h };
};

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_BOSS_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fj_${key}`], FIRE_BOSS_PARTS[`fj_${key}`]);
});

test('cada jefe: bodySize = radius*2 del jefe, y el módulo generado lo respeta', () => {
  for (const key of Object.keys(FIGURES).filter((k) => BOSS_DEFS[k])) {
    const want = BOSS_DEFS[key].radius * 2;
    assert.equal(BODY[key], want, `${key} BODY`);
    assert.equal(FIGURES[key].bodySize, want, `${key} bodySize`);
    assert.equal(sizeOf(key), want, `${key} body.size generado`);
  }
});

test('cada jefe: el lado mayor de la silueta es exactamente su SIDE (48 o 64)', () => {
  for (const key of Object.keys(FIGURES).filter((k) => BOSS_DEFS[k])) {
    const { w, h } = silhouette(key);
    assert.equal(Math.max(w, h), SIDE[key], `${key} ${w}×${h}`);
  }
});

test('cada sprite: cuerpo dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_BOSS_META)) {
    const p = FIRE_BOSS_PARTS[`fj_${key}`], size = sizeOf(key);
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + size <= m.gridW && m.body.y + size <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('fireBossRecipe forja un frame estático del tamaño del lienzo', () => {
  for (const key of Object.keys(FIRE_BOSS_META)) {
    const r = fireBossRecipe(key, 'boss');
    assert.equal(r.static, true);
    assert.equal(r.scale, 1);
    assert.deepEqual(r.parts, [{ name: `fj_${key}` }]);
    assert.deepEqual(r.body, FIRE_BOSS_META[key].body);
    const g = forge(r, PARTS, derivePalette(0x888888)).anims['idle-down'][0];
    assert.equal(g.length, FIRE_BOSS_META[key].gridH);
    assert.equal(g[0].length, FIRE_BOSS_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
  assert.throws(() => fireBossRecipe('no_existe', 'boss'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fire-bosses-'));
  try {
    const out = join(dir, 'parts.js');
    execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
    assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
