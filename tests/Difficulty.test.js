import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  powerBonus, depthBonus, combineResist, difficultyContext, scaleEnemyDef,
} from '../src/systems/Difficulty.js';
import { ELITE_RESIST_MAX } from '../src/data/tuning.js';

const fresh = { purchasedNodes: [], elements: [] };

// spentPoints() sums node.cost per id, so repeating the cost-1 node 'dmg1' N times
// yields N spent points. elements only needs a length, so fill with placeholders.
function save(spent, elements = 0) {
  return {
    purchasedNodes: Array(spent).fill('dmg1'),
    elements: Array(elements).fill('x'),
  };
}

test('fresh save: no power bonus, depth bonus 0 at level 0', () => {
  assert.equal(powerBonus(fresh), 0);
  assert.equal(depthBonus(0), 0);
});

test('tolerates missing fields', () => {
  assert.equal(powerBonus({}), 0);
  assert.equal(powerBonus(undefined), 0);
});

test('powerBonus rises with points but is bounded (sustainable)', () => {
  const a = powerBonus(save(40));
  const b = powerBonus(save(110));
  const c = powerBonus(save(200));
  assert.ok(b > a);            // monotonic in points
  assert.ok(c > b);
  assert.ok(c - b < 0.2);      // 110 → 200 barely moves: future-proof
  assert.ok(b < 1.5);          // never runaway
});

test('elements add to the power bonus', () => {
  assert.ok(powerBonus(save(40, 2)) > powerBonus(save(40, 0)));
});

test('difficultyContext: basics scale softer than elites, both >= 1', () => {
  const ctx = difficultyContext(save(110, 4), 7);
  assert.ok(ctx.basicMult >= 1);
  assert.ok(ctx.basicMult < ctx.eliteMult);
});

test('endgame basic stays near x3 (not x15), elite near x4', () => {
  const ctx = difficultyContext(save(110, 4), 7); // nv8 = index 7
  assert.ok(ctx.basicMult > 2.7 && ctx.basicMult < 3.5, `basic=${ctx.basicMult}`);
  assert.ok(ctx.eliteMult > 3.6 && ctx.eliteMult < 4.5, `elite=${ctx.eliteMult}`);
});

test('eliteResist is positive at depth and bounded by ELITE_RESIST_MAX', () => {
  const ctx = difficultyContext(save(110, 4), 7);
  assert.ok(ctx.eliteResist > 0);
  assert.ok(ctx.eliteResist <= ELITE_RESIST_MAX);
});

test('combineResist never reaches 1', () => {
  assert.equal(combineResist(0, 0.3), 0.3);
  assert.equal(combineResist(0.5, 0.2), 0.6);
  assert.ok(combineResist(0.9, 0.9) < 1);
});

test('scaleEnemyDef: basic uses basicMult and adds no resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.25 };
  const def = { key: 'medusa', hp: 20, damage: 8, speed: 90 };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.hp, 40);
  assert.equal(s.damage, 16);
  assert.equal(s.speed, 90);      // untouched fields preserved
  assert.equal(s.resist, undefined);
});

test('scaleEnemyDef: elite uses eliteMult and gains combined resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.25 };
  const def = { key: 'levelboss', hp: 100, damage: 20, elite: true };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.hp, 400);
  assert.equal(s.damage, 80);
  assert.equal(s.resist, 0.25);
});

test('scaleEnemyDef: elite combines innate resist with scaling resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.2 };
  const def = { key: 'tb', hp: 100, damage: 20, elite: true, resist: 0.5 };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.resist, 0.6); // combineResist(0.5, 0.2) = 1 - 0.5*0.8
});

test('scaleEnemyDef: tolerates a form with no damage field', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.2 };
  const form = { key: 'dama_form2', hp: 200, elite: true };
  const s = scaleEnemyDef(form, ctx);
  assert.equal(s.hp, 800);
  assert.equal(s.damage, undefined);
});

test('scaleEnemyDef: mult of 1 leaves stats unchanged (never below base)', () => {
  const ctx = { basicMult: 1, eliteMult: 1, eliteResist: 0 };
  const def = { key: 'villager', hp: 20, damage: 8 };
  assert.equal(scaleEnemyDef(def, ctx).hp, 20);
});
