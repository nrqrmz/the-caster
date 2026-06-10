import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activePhase, stepBoss } from '../src/systems/BossBrain.js';

const PHASES = [{ from: 1.0 }, { from: 0.6 }, { from: 0.3 }];

test('activePhase picks the deepest phase whose threshold the hp is at/below', () => {
  assert.equal(activePhase(PHASES, 0.9), 0);
  assert.equal(activePhase(PHASES, 0.6), 1);
  assert.equal(activePhase(PHASES, 0.5), 1);
  assert.equal(activePhase(PHASES, 0.2), 2);
  assert.equal(activePhase(PHASES, 1.0), 0);
});

test('stepBoss signals entered=true once when the phase changes', () => {
  const def = { speed: 50, movement: { type: 'kite' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
    { from: 0.5, speedMul: 1.5, sequence: [{ do: 'wait', dur: 100 }] },
  ] };
  const rt = {};
  const a = stepBoss(def, rt, 1.0, 16);
  assert.equal(a.phaseIndex, 0);
  assert.equal(a.entered, true);
  const b = stepBoss(def, rt, 1.0, 16);
  assert.equal(b.entered, false);
  const c = stepBoss(def, rt, 0.4, 16);
  assert.equal(c.phaseIndex, 1);
  assert.equal(c.entered, true);
  assert.equal(c.speedMul, 1.5);
});

test('stepBoss telegraphs during the window, then fires once, then advances', () => {
  const def = { speed: 50, movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 3, telegraph: 300, dur: 200 },
      { do: 'wait', dur: 100 },
    ] },
  ] };
  const rt = {};
  let out = stepBoss(def, rt, 1.0, 100);
  assert.ok(out.telegraph && !out.fire);
  out = stepBoss(def, rt, 1.0, 100);
  assert.ok(out.telegraph && !out.fire);
  out = stepBoss(def, rt, 1.0, 150);
  assert.ok(out.fire && out.fire.do === 'shootSpread');
  out = stepBoss(def, rt, 1.0, 10);
  assert.ok(!out.fire && !out.telegraph);
  out = stepBoss(def, rt, 1.0, 200);
  assert.ok(!out.fire);
});

test('wait steps never fire or telegraph', () => {
  const def = { speed: 50, movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
  ] };
  const out = stepBoss(def, {}, 1.0, 50);
  assert.equal(out.fire, null);
  assert.equal(out.telegraph, null);
});

test('stepBoss falls back to def.movement when the phase omits one, and speedMul defaults to 1', () => {
  const def = { speed: 50, movement: { type: 'chase' }, phases: [{ from: 1.0, sequence: [{ do: 'wait', dur: 100 }] }] };
  const out = stepBoss(def, {}, 1.0, 16);
  assert.deepEqual(out.movement, { type: 'chase' });
  assert.equal(out.speedMul, 1);
});
