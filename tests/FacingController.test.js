import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facePlayerFlip } from '../src/objects/FacingController.js';

test('facePlayerFlip voltea a la izquierda cuando la princesa cruza el deadband', () => {
  // mirando a la derecha (false), princesa claramente a la izquierda → voltea
  assert.equal(facePlayerFlip(100, 50, false), true);
});

test('facePlayerFlip vuelve a la derecha cuando la princesa cruza el deadband', () => {
  assert.equal(facePlayerFlip(100, 160, true), false);
});

test('facePlayerFlip NO togglea dentro del deadband (mantiene el estado actual)', () => {
  // princesa a ±10px (dentro del deadband de 12) no debe cambiar el flip
  assert.equal(facePlayerFlip(100, 90, false), false);
  assert.equal(facePlayerFlip(100, 110, false), false);
  assert.equal(facePlayerFlip(100, 90, true), true);
  assert.equal(facePlayerFlip(100, 110, true), true);
});

test('facePlayerFlip respeta un deadband personalizado', () => {
  assert.equal(facePlayerFlip(100, 70, false, 40), false); // 70 > 100-40=60 → mantiene
  assert.equal(facePlayerFlip(100, 55, false, 40), true);  // 55 < 60 → voltea
});
