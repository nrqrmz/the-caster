import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSystem, DEFAULT_SAVE, SAVE_VERSION } from '../src/systems/SaveSystem.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('load returns a fresh default when storage is empty', () => {
  const save = new SaveSystem(memStorage());
  const state = save.load();
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.skillPoints, DEFAULT_SAVE.skillPoints);
  assert.deepEqual(state.purchasedNodes, []);
  assert.deepEqual(state.unlockedSkills, []);
});

test('save then load round-trips state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const state = save.load();
  state.skillPoints = 3;
  state.unlockedSkills.push('fireball');
  save.write(state);

  const reloaded = new SaveSystem(storage).load();
  assert.equal(reloaded.skillPoints, 3);
  assert.deepEqual(reloaded.unlockedSkills, ['fireball']);
});

test('reset clears stored state back to default', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const state = save.load();
  state.skillPoints = 9;
  save.write(state);
  save.reset();
  assert.equal(save.load().skillPoints, DEFAULT_SAVE.skillPoints);
});

test('load discards a save with a mismatched version', () => {
  const storage = memStorage();
  storage.setItem('the-caster:save', JSON.stringify({ version: 999, skillPoints: 50 }));
  const state = new SaveSystem(storage).load();
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.skillPoints, DEFAULT_SAVE.skillPoints);
});
