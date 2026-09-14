// tests/sprites/turtle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../../src/data/sprites/parts.js';
import { rot180, rotHeadRight } from '../../src/data/sprites/gridTransform.js';
import { getRecipe, paletteFor } from '../../src/data/sprites/recipes.js';
import { NAMED_PALETTES } from '../../src/data/sprites/palettes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { COLORS } from '../../src/config.js';

const TURTLE = ['turtle_legs', 'turtle_claws', 'turtle_head', 'turtle_shell', 'turtle_spikes', 'turtle_rune', 'turtle_eyes'];

test('turtle parts are full-canvas 64×64 res-32 stamps', () => {
  for (const name of TURTLE) {
    const p = PARTS[name];
    assert.ok(p, `missing part ${name}`);
    assert.equal(p.res, 32, `${name}.res`);
    assert.equal(p.w, 64, `${name}.w`);
    assert.equal(p.h, 64, `${name}.h`);
    assert.deepEqual(p.anchor, { x: 0, y: 0 }, `${name}.anchor`);
    assert.ok(p.down.some((row) => /[obsha]/.test(row)), `${name}.down is not empty`);
  }
});

test('turtle up/side are the 180° and head-right turns of down', () => {
  for (const name of TURTLE) {
    assert.deepEqual(PARTS[name].up, rot180(PARTS[name].down), `${name}.up`);
    assert.deepEqual(PARTS[name].side, rotHeadRight(PARTS[name].down), `${name}.side`);
  }
});

test('turtle anim frames: idle on head+eyes (2), walk on legs+claws+head+eyes (4)', () => {
  for (const name of ['turtle_head', 'turtle_eyes']) {
    for (const dir of ['down', 'up', 'side']) assert.equal(PARTS[name].anim.idle[dir].length, 2, `${name} idle ${dir}`);
  }
  for (const name of ['turtle_legs', 'turtle_claws', 'turtle_head', 'turtle_eyes']) {
    for (const dir of ['down', 'up', 'side']) assert.equal(PARTS[name].anim.walk[dir].length, 4, `${name} walk ${dir}`);
  }
  for (const name of ['turtle_shell', 'turtle_spikes', 'turtle_rune']) {
    assert.equal(PARTS[name].anim, undefined, `${name} stays still`);
  }
});

test('turtle walk frames move the legs (A and C differ from neutral and from each other)', () => {
  const walk = PARTS.turtle_legs.anim.walk.down;
  assert.notDeepEqual(walk[0], walk[1]);
  assert.notDeepEqual(walk[2], walk[1]);
  assert.notDeepEqual(walk[0], walk[2]);
  assert.deepEqual(walk[1], PARTS.turtle_legs.down, 'frame B is the neutral pose');
});

// Same per-part palette resolution as spriteBaker.resolvePartPalette for named palettes.
const partPalette = (ref) => (ref.palette ? NAMED_PALETTES[ref.palette] : null);
const forgeTurtle = () => forge(getRecipe('tortuga_acorazada'), PARTS, paletteFor('tortuga_acorazada', COLORS.turtleGreen), partPalette);
const grid180 = (g) => g.slice().reverse().map((row) => row.slice().reverse());
const gridHeadRight = (g) => {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, ny) => Array.from({ length: h }, (_, nx) => g[nx][w - 1 - ny]));
};

test('tortuga_acorazada forges a native 64×64 sprite: 2 idle + 4 walk frames per facing', () => {
  const r = getRecipe('tortuga_acorazada');
  assert.equal(r.gridW, 64);
  assert.equal(r.gridH, 64);
  assert.equal(r.scale, 1);
  const out = forgeTurtle();
  assert.equal(out.width, 64);
  assert.equal(out.height, 64);
  for (const dir of ['down', 'up', 'side']) {
    assert.equal(out.anims[`idle-${dir}`].length, 2, `idle-${dir}`);
    assert.equal(out.anims[`walk-${dir}`].length, 4, `walk-${dir}`);
    for (const f of [...out.anims[`idle-${dir}`], ...out.anims[`walk-${dir}`]]) {
      assert.equal(f.length, 64, 'frame rows');
      assert.equal(f[0].length, 64, 'frame cols');
    }
  }
});

test('forged turtle: up is the 180° turn of down, side turns the head right', () => {
  const a = forgeTurtle().anims;
  assert.deepEqual(a['idle-up'][0], grid180(a['idle-down'][0]));
  assert.deepEqual(a['idle-side'][0], gridHeadRight(a['idle-down'][0]));
  assert.deepEqual(a['walk-up'][0], grid180(a['walk-down'][0]));
});

test('forged turtle animates: walk frames differ, idle breathes', () => {
  const a = forgeTurtle().anims;
  const flat = (f) => f.flat().map((c) => (c == null ? -1 : c)).join(',');
  assert.notEqual(flat(a['walk-down'][0]), flat(a['walk-down'][1]), 'walk A vs B');
  assert.notEqual(flat(a['walk-down'][2]), flat(a['walk-down'][1]), 'walk C vs B');
  assert.notEqual(flat(a['idle-down'][0]), flat(a['idle-down'][1]), 'idle breath');
});

test('forged turtle shows the moss shell, horn spikes, blood rune and red eyes', () => {
  const colors = new Set(forgeTurtle().anims['idle-down'][0].flat().filter((c) => c != null));
  for (const [pal, role] of [['mossshell', 'base'], ['hornbone', 'highlight'], ['bloodrune', 'base'], ['redeye', 'base'], ['oliveskin', 'base']]) {
    assert.ok(colors.has(NAMED_PALETTES[pal][role]), `${pal}.${role} present`);
  }
});

test('old simple turtle parts are gone', () => {
  assert.equal(PARTS.turtle_body, undefined);
  assert.equal(PARTS.turtle_eye, undefined);
});
