// tests/sprites/gridTransform.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rot180, rotHeadRight } from '../../src/data/sprites/gridTransform.js';

test('rot180 turns rows upside down and reverses each row', () => {
  assert.deepEqual(rot180(['ab', 'cd']), ['dc', 'ba']);
});

test('rotHeadRight moves the bottom row (head) to the right column', () => {
  assert.deepEqual(rotHeadRight(['ab', 'cd']), ['bd', 'ac']);
});

test('rotHeadRight turns a W×H grid into H×W', () => {
  // 3 wide × 2 tall → 2 wide × 3 tall; bottom row 'def' ends up as the right column.
  assert.deepEqual(rotHeadRight(['abc', 'def']), ['cf', 'be', 'ad']);
});

test('two head-right turns equal one 180° turn; four are the identity', () => {
  const g = ['ab.', 'c.d', '.ef'];
  assert.deepEqual(rotHeadRight(rotHeadRight(g)), rot180(g));
  assert.deepEqual(rotHeadRight(rotHeadRight(rotHeadRight(rotHeadRight(g)))), g);
});

test('transforms do not mutate their input', () => {
  const g = ['ab', 'cd'];
  rot180(g); rotHeadRight(g);
  assert.deepEqual(g, ['ab', 'cd']);
});
