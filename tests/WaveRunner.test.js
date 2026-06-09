import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveRunner } from '../src/systems/WaveRunner.js';

const level = {
  phases: [
    { type: 'wave', spawns: [{ type: 'villager', count: 2 }], spawnDelay: 100 },
    { type: 'wave', spawns: [{ type: 'villager', count: 1 }], spawnDelay: 100 },
    { type: 'miniboss', enemyDef: { hp: 10 } },
    { type: 'levelBoss', enemyDef: { hp: 20 } },
  ],
};

test('starts at the first phase', () => {
  const r = new WaveRunner(level);
  assert.equal(r.phase, 'wave');
  assert.equal(r.currentPhase().spawns[0].count, 2);
});

test('onCleared walks the phase list then reports done', () => {
  const r = new WaveRunner(level);
  assert.equal(r.phase, 'wave');
  r.onCleared(); assert.equal(r.phase, 'wave');
  assert.equal(r.currentPhase().spawns[0].count, 1);
  r.onCleared(); assert.equal(r.phase, 'miniboss');
  r.onCleared(); assert.equal(r.phase, 'levelBoss');
  r.onCleared(); assert.equal(r.phase, 'done');
});

test('isComplete only true past the last phase', () => {
  const r = new WaveRunner(level);
  assert.equal(r.isComplete(), false);
  for (let i = 0; i < 4; i++) r.onCleared();
  assert.equal(r.isComplete(), true);
  assert.equal(r.currentPhase(), null);
});

test('a temple level with a single templeBoss phase', () => {
  const r = new WaveRunner({ phases: [{ type: 'templeBoss', enemyDef: { hp: 99 } }] });
  assert.equal(r.phase, 'templeBoss');
  r.onCleared();
  assert.equal(r.phase, 'done');
  assert.equal(r.isComplete(), true);
});
