// tests/sprites/turtle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../../src/data/sprites/parts.js';
import { rot180, rotHeadRight } from '../../src/data/sprites/gridTransform.js';

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
