import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FormSequencer } from '../src/systems/FormSequencer.js';

const FORMS = [
  { hp: 200, resist: 0,   movement: { type: 'kite' } },
  { hp: 300, resist: 0.2, movement: { type: 'burrow' } },
  { hp: 400, resist: 0.4, movement: { type: 'static' } },
  { hp: 100, resist: 0.5, movement: { type: 'flee' } }, // last / maga-final
];

test('FormSequencer starts on form 0 with that form hp', () => {
  const fs = new FormSequencer(FORMS);
  assert.equal(fs.activeFormIndex, 0);
  assert.equal(fs.currentHp, FORMS[0].hp);
  assert.equal(fs.isLastForm(), false);
});

test('applyDamage reduces hp within a form', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(50);
  assert.equal(fs.currentHp, 150);
  assert.equal(fs.transformPending, false);
  assert.equal(fs.fightOver, false);
});

test('applyDamage at zero hp triggers transformPending on non-last form', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(200); // exactly kills form 0
  assert.equal(fs.currentHp, 0);
  assert.equal(fs.transformPending, true);
  assert.equal(fs.fightOver, false);
});

test('completeTransform advances to next form with full hp', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(200);
  fs.completeTransform();
  assert.equal(fs.activeFormIndex, 1);
  assert.equal(fs.currentHp, FORMS[1].hp);
  assert.equal(fs.transformPending, false);
});

test('killing all forms except the last triggers fightOver on the last form', () => {
  const fs = new FormSequencer(FORMS);
  // Kill forms 0, 1, 2 (overkill so resist can't leave a sliver of hp).
  for (let i = 0; i < 3; i++) {
    fs.applyDamage(99999);
    fs.completeTransform();
  }
  assert.equal(fs.activeFormIndex, 3);
  assert.equal(fs.isLastForm(), true);
  // Now kill the last form (overkill past its resist).
  fs.applyDamage(99999);
  assert.equal(fs.fightOver, true);
  assert.equal(fs.transformPending, false);
});

test('resist increases with each form', () => {
  const fs = new FormSequencer(FORMS);
  assert.equal(fs.activeForm().resist, 0);
  fs.applyDamage(99999); fs.completeTransform();
  assert.equal(fs.activeForm().resist, 0.2);
  fs.applyDamage(99999); fs.completeTransform();
  assert.equal(fs.activeForm().resist, 0.4);
});

test('applyDamage respects active form resist', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(300); fs.completeTransform(); // advance to form 1 (resist 0.2)
  const hp = fs.currentHp;
  fs.applyDamage(100); // 100 × (1 - 0.2) = 80 actual damage
  assert.equal(fs.currentHp, hp - 80);
});

test('hp cannot go below zero', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(9999);
  assert.ok(fs.currentHp <= 0);
});

test('Dama revert pattern: last form is maga_final with very low hp', () => {
  // Mirrors the real boss: last form has ~20 HP.
  const dama = [
    { hp: 200, resist: 0 },
    { hp: 300, resist: 0.2 },
    { hp: 20, resist: 0 }, // maga_final
  ];
  const fs = new FormSequencer(dama);
  fs.applyDamage(99999); fs.completeTransform();
  fs.applyDamage(99999); fs.completeTransform();
  assert.equal(fs.isLastForm(), true);
  assert.equal(fs.currentHp, 20);
  fs.applyDamage(20);
  assert.equal(fs.fightOver, true);
});
