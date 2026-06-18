import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_ENEMIES } from '../src/data/enemies/earth.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

const defs = Object.values(EARTH_ENEMIES);

test('every Earth def has the required numeric fields and a matching key', () => {
  for (const [k, d] of Object.entries(EARTH_ENEMIES)) {
    assert.equal(d.key, k, `key mismatch for ${k}`);
    for (const f of ['hp', 'speed', 'damage', 'radius']) {
      assert.equal(typeof d[f], 'number', `${k}.${f} must be a number`);
    }
    assert.ok(d.movement && typeof d.movement.type === 'string', `${k} needs movement.type`);
    assert.ok(Array.isArray(d.attacks), `${k}.attacks must be an array`);
  }
});

test('the roster has exactly 20 player-facing creatures (excluding split children)', () => {
  const facing = defs.filter((d) => !d.key.endsWith('_cria'));
  assert.equal(facing.length, 20);
});

test('every transmuteTo points to a registered enemy type', () => {
  for (const d of defs) {
    if (d.transmuteTo) assert.ok(ENEMY_TYPES[d.transmuteTo], `${d.key}.transmuteTo -> ${d.transmuteTo} not registered`);
  }
});

test('every mutateOnDeath spawnType / splitsOnDeath spawnType resolves', () => {
  for (const d of defs) {
    for (const m of d.modifiers || []) {
      if (m && m.type === 'mutateOnDeath' && m.spawnType) {
        assert.ok(ENEMY_TYPES[m.spawnType], `${d.key} mutateOnDeath -> ${m.spawnType} not registered`);
      }
      if (m && m.type === 'splitsOnDeath' && m.spawnType) {
        assert.ok(ENEMY_TYPES[m.spawnType], `${d.key} splitsOnDeath -> ${m.spawnType} not registered`);
      }
    }
  }
});

test('captives are both flagged captive and have a transmuteTo', () => {
  for (const d of defs) {
    if (d.captive) assert.ok(d.transmuteTo, `${d.key} is captive but has no transmuteTo`);
  }
});
