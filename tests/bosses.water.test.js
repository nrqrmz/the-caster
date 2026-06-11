import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO }
  from '../src/data/bosses/water.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

const MINIBOSSES = [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL];

test('all water bosses are flagged elite', () => {
  for (const b of [...MINIBOSSES, KRAKEN, DAMA_LAGO]) {
    assert.equal(b.elite, true, `${b.key} must be elite`);
  }
});

test('all water bosses have at least one phase', () => {
  for (const b of [...MINIBOSSES, KRAKEN]) {
    assert.ok(Array.isArray(b.phases) && b.phases.length >= 1, `${b.key} has phases`);
  }
});

test('minibosses each have exactly 2 phases', () => {
  for (const b of MINIBOSSES) {
    assert.equal(b.phases.length, 2, `${b.key} should have 2 phases`);
  }
});

test('Kraken has 3 phases; phase 2 and 3 enter spawnWhirlpool', () => {
  assert.equal(KRAKEN.phases.length, 3);
  assert.ok(KRAKEN.phases[1].enter?.includes('spawnWhirlpool'), 'Kraken p2 enters whirlpool');
  assert.ok(KRAKEN.phases[2].enter?.includes('spawnWhirlpool'), 'Kraken p3 enters whirlpool');
});

test('Kraken phase thresholds: 1.0, 0.6, 0.3 (descending)', () => {
  const froms = KRAKEN.phases.map((p) => p.from);
  assert.deepEqual(froms, [1.0, 0.6, 0.3]);
});

test('Dama has a forms array of length 5', () => {
  assert.ok(Array.isArray(DAMA_LAGO.forms));
  assert.equal(DAMA_LAGO.forms.length, 5);
});

test('all Dama forms are flagged elite', () => {
  for (const f of DAMA_LAGO.forms) {
    assert.equal(f.elite, true, `${f.key} form must be elite`);
  }
});

test('Dama forms have ascending hp across the first four forms', () => {
  const hps = DAMA_LAGO.forms.slice(0, 4).map((f) => f.hp);
  for (let i = 1; i < hps.length; i++) {
    assert.ok(hps[i] > hps[i - 1], `form[${i}].hp (${hps[i]}) should exceed form[${i-1}].hp (${hps[i-1]})`);
  }
});

test('Dama forms have non-decreasing resist across the first four forms', () => {
  const resists = DAMA_LAGO.forms.slice(0, 4).map((f) => f.resist ?? 0);
  for (let i = 1; i < resists.length; i++) {
    assert.ok(resists[i] >= resists[i - 1], `form[${i}].resist should be >= form[${i-1}].resist`);
  }
});

test('last Dama form is maga_final with low hp', () => {
  const last = DAMA_LAGO.forms.at(-1);
  assert.equal(last.key, 'dama_maga_final');
  assert.ok(last.hp <= 20, `maga_final hp should be ≤ 20, got ${last.hp}`);
});

test('Dama form keys in order: maga, tiburon, kraken, ballena, maga_final', () => {
  const keys = DAMA_LAGO.forms.map((f) => f.key);
  assert.deepEqual(keys, ['dama_maga', 'dama_tiburon', 'dama_kraken', 'dama_ballena', 'dama_maga_final']);
});

test('SOLDADO_HIELO has shielded and onHitSlow modifiers', () => {
  const types = SOLDADO_HIELO.modifiers.map((m) => m.type);
  assert.ok(types.includes('shielded'), 'soldado has shielded');
  assert.ok(types.includes('onHitSlow'), 'soldado has onHitSlow');
});

test('SOLDADO_HIELO onHitSlow has the correct floor', () => {
  const slow = SOLDADO_HIELO.modifiers.find((m) => m.type === 'onHitSlow');
  assert.equal(slow.floor, 0.45);
});

test('SAPO_DESOVADOR phase 2 summons 2 eggs per cycle', () => {
  const p2summon = SAPO_DESOVADOR.phases[1].sequence.find((s) => s.do === 'summon');
  assert.ok(p2summon, 'phase 2 has a summon step');
  assert.equal(p2summon.count, 2);
  assert.equal(p2summon.spawnType, 'huevo_sapo');
});

test('TIBURON_ABISAL uses burrow movement', () => {
  assert.equal(TIBURON_ABISAL.movement.type, 'burrow');
});

test('every boss summon spawnType resolves to a registered enemy', () => {
  // (boss, phases) pairs. DAMA_LAGO has no own phases — its forms each do.
  const targets = [
    { boss: SOLDADO_HIELO, phases: SOLDADO_HIELO.phases },
    { boss: SAPO_DESOVADOR, phases: SAPO_DESOVADOR.phases },
    { boss: TIBURON_ABISAL, phases: TIBURON_ABISAL.phases },
    { boss: KRAKEN, phases: KRAKEN.phases },
    ...DAMA_LAGO.forms.map((f) => ({ boss: f, phases: f.phases })),
  ];
  for (const { boss, phases } of targets) {
    for (const phase of phases ?? []) {
      for (const step of phase.sequence ?? []) {
        if (step.do !== 'summon') continue;
        assert.ok(
          ENEMY_TYPES[step.spawnType],
          `${boss.key} summons unregistered enemy type "${step.spawnType}"`,
        );
      }
    }
  }
});
