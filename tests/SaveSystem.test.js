import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSystem, DEFAULT_SAVE, SAVE_VERSION } from '../src/systems/SaveSystem.js';

function memStorage(seed) {
  const m = new Map(seed ? [['the-caster:save', JSON.stringify(seed)]] : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('fresh default has v2 shape', () => {
  const s = new SaveSystem(memStorage()).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 2);
  assert.equal(s.skillPoints, 0);
  assert.deepEqual(s.purchasedNodes, []);
  assert.deepEqual(s.unlockedSkills, []);
  assert.deepEqual(s.elements, []);
  assert.deepEqual(s.regionProgress, {});
  assert.equal('currentScenario' in s, false);
});

test('save then load round-trips v2 state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load();
  s.skillPoints = 5;
  s.elements.push('fire');
  s.regionProgress.fire = { cleared: 3 };
  save.write(s);
  const r = new SaveSystem(storage).load();
  assert.equal(r.skillPoints, 5);
  assert.deepEqual(r.elements, ['fire']);
  assert.deepEqual(r.regionProgress.fire, { cleared: 3 });
});

test('migrates a v1 save: keeps points/nodes/skills, derives elements from unlockedTemples', () => {
  const v1 = {
    version: 1, skillPoints: 7, purchasedNodes: ['basic_dmg_1'],
    unlockedSkills: ['fireball'], unlockedTemples: ['fire'], currentScenario: 'scenario1',
  };
  const s = new SaveSystem(memStorage(v1)).load();
  assert.equal(s.version, 2);
  assert.equal(s.skillPoints, 7);
  assert.deepEqual(s.purchasedNodes, ['basic_dmg_1']);
  assert.deepEqual(s.unlockedSkills, ['fireball']);
  assert.deepEqual(s.elements, ['fire']);
  assert.deepEqual(s.regionProgress, {});
  assert.equal('currentScenario' in s, false);
});

test('unknown version resets to fresh default', () => {
  const s = new SaveSystem(memStorage({ version: 999, skillPoints: 50 })).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.skillPoints, 0);
});

test('reset clears stored state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load(); s.skillPoints = 9; save.write(s);
  save.reset();
  assert.equal(save.load().skillPoints, 0);
});
