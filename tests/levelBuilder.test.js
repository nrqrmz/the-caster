import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLevel, KIND_PHASES, DEFAULT_REWARD } from '../src/data/levelBuilder.js';

const waves = [
  { spawnDelay: 700, spawns: [{ type: 'villager', count: 5 }] },
  { spawnDelay: 650, spawns: [{ type: 'villager', count: 4 }] },
  { spawnDelay: 600, spawns: [{ type: 'warrior', count: 2 }] },
];

test('basic kind expands to three wave phases consuming waves in order', () => {
  const lv = makeLevel('fire_1', 'fire', 'basic', { waves });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'wave']);
  assert.equal(lv.phases[0].spawns[0].count, 5);
  assert.equal(lv.phases[2].spawns[0].count, 2);
  assert.equal(lv.id, 'fire_1');
  assert.equal(lv.regionId, 'fire');
  assert.equal(lv.kind, 'basic');
});

test('intermediate kind = two waves + a miniboss phase', () => {
  const lv = makeLevel('fire_4', 'fire', 'intermediate', {
    waves, miniboss: { hp: 300, damage: 18 },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'miniboss']);
  assert.equal(lv.phases[2].enemyDef.hp, 300);
});

test('pretemple kind = two waves + miniboss + levelBoss', () => {
  const lv = makeLevel('fire_6', 'fire', 'pretemple', {
    waves, miniboss: { hp: 300 }, levelBoss: { hp: 600, damage: 22 },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'miniboss', 'levelBoss']);
  assert.equal(lv.phases[3].enemyDef.hp, 600);
});

test('temple kind = a single templeBoss phase carrying mechanics + minions', () => {
  const lv = makeLevel('fire_7', 'fire', 'temple', {
    templeBoss: { hp: 900, mechanics: [{ type: 'nova', every: 3000 }] },
    minions: [{ type: 'villager', count: 4 }],
    dialogue: { onClear: [{ speaker: 'Mago', text: '...' }] },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['templeBoss']);
  assert.equal(lv.phases[0].enemyDef.hp, 900);
  assert.equal(lv.phases[0].mechanics[0].type, 'nova');
  assert.deepEqual(lv.phases[0].minions, [{ type: 'villager', count: 4 }]);
  assert.deepEqual(lv.dialogue.onClear[0].speaker, 'Mago');
});

test('reward defaults by kind, override-able', () => {
  assert.equal(makeLevel('a', 'r', 'basic', { waves }).reward.skillPoints, DEFAULT_REWARD.basic);
  assert.equal(makeLevel('b', 'r', 'temple', { templeBoss: {} }).reward.skillPoints, DEFAULT_REWARD.temple);
  assert.equal(makeLevel('c', 'r', 'basic', { waves, skillPoints: 9 }).reward.skillPoints, 9);
});

test('unknown kind throws', () => {
  assert.throws(() => makeLevel('x', 'r', 'nope', {}), /kind desconocido/);
});

test('KIND_PHASES documents the presets', () => {
  assert.deepEqual(KIND_PHASES.basic, ['wave', 'wave', 'wave']);
  assert.deepEqual(KIND_PHASES.temple, ['templeBoss']);
});
