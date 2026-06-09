import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearedCount, isLevelUnlocked, isRegionComplete, isCastleUnlocked, grantClear,
} from '../src/systems/Campaign.js';

// Fake region: 3 levels, last is the temple granting 'fire'.
const region = {
  id: 'fire', element: 'fire', grantsSkill: 'fireball',
  levels: [
    { kind: 'basic',  reward: { skillPoints: 1 } },
    { kind: 'basic',  reward: { skillPoints: 1 } },
    { kind: 'temple', reward: { skillPoints: 4 } },
  ],
};
const fresh = () => ({ skillPoints: 0, elements: [], unlockedSkills: [], regionProgress: {} });

test('clearedCount defaults to 0', () => {
  assert.equal(clearedCount(fresh(), 'fire'), 0);
});

test('only level 0 unlocked initially; next unlocks as you clear', () => {
  const s = fresh();
  assert.equal(isLevelUnlocked(s, 'fire', 0), true);
  assert.equal(isLevelUnlocked(s, 'fire', 1), false);
  const s1 = grantClear(s, region, 0);
  assert.equal(isLevelUnlocked(s1, 'fire', 1), true);
  assert.equal(isLevelUnlocked(s1, 'fire', 2), false);
});

test('grantClear advances cleared, adds reward points, only on the NEXT level', () => {
  const s = grantClear(fresh(), region, 0);
  assert.equal(clearedCount(s, 'fire'), 1);
  assert.equal(s.skillPoints, 1);
  // re-clearing an already-cleared level is a no-op (returns same save)
  const again = grantClear(s, region, 0);
  assert.equal(again, s);
  // clearing a not-yet-unlocked level is a no-op
  assert.equal(grantClear(s, region, 2), s);
});

test('grantClear does not mutate the input save', () => {
  const s = fresh();
  grantClear(s, region, 0);
  assert.equal(s.skillPoints, 0);
  assert.deepEqual(s.regionProgress, {});
});

test('clearing a temple level masters the element and grants its skill', () => {
  let s = fresh();
  s = grantClear(s, region, 0);
  s = grantClear(s, region, 1);
  s = grantClear(s, region, 2); // temple
  assert.deepEqual(s.elements, ['fire']);
  assert.deepEqual(s.unlockedSkills, ['fireball']);
  assert.equal(isRegionComplete(s, region), true);
});

test('castle unlocks only when all required elements are mastered', () => {
  const req = ['fire', 'water', 'air', 'earth'];
  assert.equal(isCastleUnlocked({ elements: ['fire', 'water', 'air'] }, req), false);
  assert.equal(isCastleUnlocked({ elements: ['fire', 'water', 'air', 'earth'] }, req), true);
});
