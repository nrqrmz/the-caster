import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveRunner } from '../src/systems/WaveRunner.js';

const scenario = {
  waves: [
    { spawnDelay: 100, spawns: [{ type: 'villager', count: 2 }] },
    { spawnDelay: 100, spawns: [{ type: 'villager', count: 1 }] },
  ],
  miniboss: { hp: 10 },
  temple: { grantsSkill: 'fireball' },
  boss: { hp: 20 },
};

test('starts in the first wave phase', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.phase, 'wave');
  assert.equal(r.waveIndex, 0);
});

test('advances through both waves, then miniboss, temple, boss, done', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.phase, 'wave');     // wave 0
  r.onCleared();
  assert.equal(r.phase, 'wave');     // wave 1
  assert.equal(r.waveIndex, 1);
  r.onCleared();
  assert.equal(r.phase, 'miniboss');
  r.onCleared();
  assert.equal(r.phase, 'temple');
  r.onCleared();
  assert.equal(r.phase, 'boss');
  r.onCleared();
  assert.equal(r.phase, 'done');
});

test('currentWave returns the active wave definition', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.currentWave().spawns[0].count, 2);
  r.onCleared();
  assert.equal(r.currentWave().spawns[0].count, 1);
});

test('isComplete only true at done', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.isComplete(), false);
  for (let i = 0; i < 5; i++) r.onCleared();
  assert.equal(r.isComplete(), true);
});
