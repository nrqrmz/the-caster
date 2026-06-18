import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as BOSSES from '../src/data/bosses/earth.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

const named = Object.values(BOSSES).filter((b) => b && b.key);

function checkSummonTargets(def, label) {
  for (const phase of def.phases || []) {
    for (const step of phase.sequence || []) {
      if (step.do === 'summon') {
        const types = step.spawnTypes || [step.spawnType];
        for (const t of types) assert.ok(ENEMY_TYPES[t], `${label} summons unknown type ${t}`);
      }
    }
  }
}

test('every boss def has key + numeric core fields', () => {
  for (const b of named) {
    assert.equal(typeof b.key, 'string');
    for (const f of ['hp', 'speed', 'damage', 'radius']) assert.equal(typeof b[f], 'number', `${b.key}.${f}`);
    assert.ok(b.elite === true, `${b.key} must be elite`);
  }
});

test('boss summon spawnTypes resolve (including inside forms)', () => {
  for (const b of named) {
    checkSummonTargets(b, b.key);
    for (const f of b.forms || []) checkSummonTargets(f, `${b.key}:${f.key}`);
  }
});

test('Señor Lobo and Circe are exported and multi-phase', () => {
  assert.ok(BOSSES.SENOR_LOBO && BOSSES.SENOR_LOBO.phases.length >= 2);
  assert.ok(BOSSES.CIRCE && BOSSES.CIRCE.phases.length === 3);
});
