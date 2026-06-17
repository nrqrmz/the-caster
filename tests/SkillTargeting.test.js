import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainTargets, freezeEffect } from '../src/systems/SkillTargeting.js';

const caster = { x: 0, y: 0 };

test('no enemies yields no targets', () => {
  assert.deepEqual(chainTargets(caster, [], 50, 3), []);
});

test('primary target is nearest to caster and ignores jump radius', () => {
  // single far enemy: still hit as the primary (cast) target
  assert.deepEqual(chainTargets(caster, [{ x: 1000, y: 0 }], 50, 2), [0]);
});

test('maxTargets caps the chain', () => {
  const enemies = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 50, 1), [0]);
});

test('chain hops to the nearest unused within jumpRadius of the last hit, stops when none in range', () => {
  // A(10) -> B(20) reachable (10 apart); C(200) too far from B (180 > 50)
  const enemies = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 200, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 50, 3), [0, 1]);
});

test('each hop picks the nearest remaining and never repeats', () => {
  // nearest to caster is index 1 (x=10); from there nearest is index 2 (x=25); then index 0 (x=30)
  const enemies = [{ x: 30, y: 0 }, { x: 10, y: 0 }, { x: 25, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 100, 3), [1, 2, 0]);
});

test('freezeEffect tiers by elite flag', () => {
  assert.equal(freezeEffect({ elite: true }), 'slow');
  assert.equal(freezeEffect({ elite: false }), 'freeze');
  assert.equal(freezeEffect({}), 'freeze');
});

test('chainTargets skips untargetable enemies', () => {
  const caster = { x: 0, y: 0 };
  const enemies = [
    { x: 10, y: 0, untargetable: true },  // nearest but shielded — must be skipped
    { x: 40, y: 0 },                      // chosen primary
    { x: 70, y: 0 },                      // chain hop
  ];
  const hits = chainTargets(caster, enemies, 100, 3);
  assert.deepEqual(hits, [1, 2]);
});
