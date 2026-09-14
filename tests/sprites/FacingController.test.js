// tests/sprites/FacingController.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickFacing } from '../../src/objects/FacingController.js';

test('horizontal dominant -> side, flip when moving left', () => {
  assert.deepEqual(pickFacing(100, 10, 'down'), { dir: 'side', flipX: false });
  assert.deepEqual(pickFacing(-100, 10, 'down'), { dir: 'side', flipX: true });
});

test('vertical dominant -> up/down, never flips', () => {
  assert.deepEqual(pickFacing(10, -100, 'side'), { dir: 'up', flipX: false });
  assert.deepEqual(pickFacing(10, 100, 'side'), { dir: 'down', flipX: false });
});

import { FacingController } from '../../src/objects/FacingController.js';

function fakeSprite() {
  const calls = { flip: [], play: [] };
  return {
    calls, x: 100, y: 100, flipX: false,
    setFlipX(v) { calls.flip.push(v); this.flipX = v; },
    anims: { play: (key) => calls.play.push(key) },
    scene: { anims: { exists: () => false } },
  };
}

test('receta estática: moverse a la izquierda no voltea', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'acolito_brasa');
  fc.isStatic = true;
  fc.update(-100, 0);
  assert.deepEqual(s.calls.flip, []);
  assert.equal(s.flipX, false);
  assert.deepEqual(s.calls.play, ['acolito_brasa-walk-side']);
});

test('receta estática con facePlayer: tampoco voltea', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'acolito_brasa');
  fc.isStatic = true;
  fc.facePlayer = true;
  fc.update(0, 0, { x: 10, y: 100 });
  assert.deepEqual(s.calls.flip, []);
  assert.deepEqual(s.calls.play, ['acolito_brasa-idle-side']);
});

test('receta no estática: moverse a la izquierda sí voltea (control)', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'lobo');
  fc.update(-100, 0);
  assert.deepEqual(s.calls.flip, [true]);
});
