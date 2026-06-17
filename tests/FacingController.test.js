import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facePlayerFlip } from '../src/objects/FacingController.js';

test('facePlayerFlip voltea cuando la princesa está a la izquierda', () => {
  assert.equal(facePlayerFlip(100, 50), true);
});

test('facePlayerFlip no voltea cuando la princesa está a la derecha', () => {
  assert.equal(facePlayerFlip(100, 150), false);
});

test('facePlayerFlip no voltea cuando están alineados', () => {
  assert.equal(facePlayerFlip(100, 100), false);
});
