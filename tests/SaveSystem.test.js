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

test('fresh default has v3 shape', () => {
  const s = new SaveSystem(memStorage()).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 3);
  assert.equal(s.gold, 0);
  assert.deepEqual(s.inventory, { potion: 0, elixir: 0, phoenix: 0 });
  assert.equal(s.respecCount, 0);
  assert.deepEqual(s.elements, []);
});

test('round-trips v3 state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load();
  s.gold = 250; s.inventory.potion = 2; s.respecCount = 1;
  save.write(s);
  const r = new SaveSystem(storage).load();
  assert.equal(r.gold, 250);
  assert.equal(r.inventory.potion, 2);
  assert.equal(r.respecCount, 1);
});

test('migrates a v2 save: keeps progression, adds gold/inventory/respecCount at 0', () => {
  const v2 = {
    version: 2, skillPoints: 4, purchasedNodes: ['dmg1'],
    unlockedSkills: ['fireball'], elements: ['fire'], regionProgress: { fire: { cleared: 3 } },
  };
  const s = new SaveSystem(memStorage(v2)).load();
  assert.equal(s.version, 3);
  assert.equal(s.skillPoints, 4);
  assert.deepEqual(s.elements, ['fire']);
  assert.deepEqual(s.regionProgress, { fire: { cleared: 3 } });
  assert.equal(s.gold, 0);
  assert.deepEqual(s.inventory, { potion: 0, elixir: 0, phoenix: 0 });
  assert.equal(s.respecCount, 0);
});

test('migrates a v1 save all the way to v3', () => {
  const v1 = { version: 1, skillPoints: 7, purchasedNodes: [], unlockedSkills: ['fireball'], unlockedTemples: ['fire'], currentScenario: 'scenario1' };
  const s = new SaveSystem(memStorage(v1)).load();
  assert.equal(s.version, 3);
  assert.equal(s.skillPoints, 7);
  assert.deepEqual(s.elements, ['fire']);
  assert.equal(s.gold, 0);
  assert.equal(s.respecCount, 0);
});

test('unknown version resets to fresh default', () => {
  const s = new SaveSystem(memStorage({ version: 999 })).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.gold, 0);
});

test('reset clears stored state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load(); s.gold = 99; save.write(s);
  save.reset();
  assert.equal(save.load().gold, 0);
});
