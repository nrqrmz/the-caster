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
