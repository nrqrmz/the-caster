import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickRitual, ritualFraction } from '../src/systems/RitualMeter.js';
import { RITUAL_FILL_MS } from '../src/data/tuning.js';

test('tickRitual fills over time and reports full once filled', () => {
  const s = { filled: 0, total: RITUAL_FILL_MS };
  let r = tickRitual(s, RITUAL_FILL_MS / 2);
  assert.equal(r.full, false);
  assert.ok(Math.abs(ritualFraction(s) - 0.5) < 1e-6);
  r = tickRitual(s, RITUAL_FILL_MS); // overshoot
  assert.equal(r.full, true);
  assert.equal(ritualFraction(s), 1);
});

test('tickRitual stays full and clamps fraction at 1', () => {
  const s = { filled: RITUAL_FILL_MS, total: RITUAL_FILL_MS };
  const r = tickRitual(s, 1000);
  assert.equal(r.full, true);
  assert.equal(ritualFraction(s), 1);
});

test('ritualFraction defaults total when missing', () => {
  const s = { filled: 0 };
  assert.equal(ritualFraction(s), 0);
});
