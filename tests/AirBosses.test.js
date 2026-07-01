import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA, LIDER_CULTISTA, GALAHAD,
} from '../src/data/bosses/air.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';
import { hasRecipe } from '../src/data/sprites/recipes.js';

const MINIBOSSES = [CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA];
const ALL = [...MINIBOSSES, LIDER_CULTISTA, GALAHAD];

test('all five Air bosses are exported and flagged elite', () => {
  for (const b of ALL) {
    assert.ok(b && typeof b === 'object', 'boss def exists');
    assert.equal(b.elite, true, `${b.key} must be elite`);
    // Galahad and forms are spritted; others must be geometric:true or have a recipe.
    if (b.key !== 'galahad') {
      assert.ok(b.geometric === true || hasRecipe(b.key), `${b.key} must be geometric:true or have a sprite recipe`);
    }
  }
});

test('Air boss keys match the spec', () => {
  assert.deepEqual(ALL.map((b) => b.key), [
    'caballero_sangre', 'bruja_vendaval', 'elemental_tormenta', 'lider_cultista', 'galahad',
  ]);
});

test('minibosses have well-formed phases (>=1, each with a sequence array)', () => {
  for (const b of MINIBOSSES) {
    assert.ok(Array.isArray(b.phases) && b.phases.length >= 1, `${b.key} has phases`);
    for (const p of b.phases) {
      assert.ok(Array.isArray(p.sequence) && p.sequence.length >= 1, `${b.key} phase has a sequence`);
      assert.equal(typeof p.from, 'number', `${b.key} phase has a numeric 'from'`);
    }
  }
});

test('Caballero de Sangre: tanque-vampiro (640hp, shielded 0.25, speed 180, drainBite 20/150/4000)', () => {
  assert.equal(CABALLERO_SANGRE.hp, 640);
  assert.equal(CABALLERO_SANGRE.speed, 180);
  assert.equal(CABALLERO_SANGRE.radius, 28);
  const sh = CABALLERO_SANGRE.modifiers.find((m) => m.type === 'shielded');
  const db = CABALLERO_SANGRE.modifiers.find((m) => m.type === 'drainBite');
  assert.equal(sh.reduce, 0.25);
  assert.deepEqual([db.amount, db.range, db.cooldown], [20, 150, 4000]);
});

test('Caballero juke decision: charge in P1, evade in P2', () => {
  assert.equal(CABALLERO_SANGRE.movement.type, 'charge');
  assert.equal(CABALLERO_SANGRE.phases[1].movement.type, 'evade');
});

test('Caballero P2 summons murcielago (count 2, cap 4, respawn 12000)', () => {
  const s = CABALLERO_SANGRE.phases[1].sequence.find((x) => x.do === 'summon');
  assert.ok(s, 'P2 has a summon');
  assert.equal(s.spawnType, 'murcielago');
  assert.equal(s.count, 2);
  assert.equal(s.cap, 4);
  assert.equal(s.respawnMs, 12000);
});

test('Bruja del Vendaval: escurridiza (640hp, shielded 0.15, speed 100), Blink + summons no-murciélago', () => {
  assert.equal(BRUJA_VENDAVAL.hp, 640);
  assert.equal(BRUJA_VENDAVAL.speed, 100);
  assert.equal(BRUJA_VENDAVAL.radius, 30);
  assert.equal(BRUJA_VENDAVAL.modifiers.find((m) => m.type === 'shielded').reduce, 0.15);
  const steps = BRUJA_VENDAVAL.phases.flatMap((p) => p.sequence);
  assert.ok(steps.some((s) => s.do === 'blinkStorm'), 'tiene Blink de Tormenta');
  const summons = steps.filter((s) => s.do === 'summon').map((s) => s.spawnType);
  assert.ok(!summons.includes('murcielago'), 'no invoca murciélagos');
  assert.ok(summons.includes('arpia'), 'invoca arpías');
});

test('Elemental de Tormenta: esponja 2000hp, shielded 0.25, radius 100, anchorY 0.375', () => {
  assert.equal(ELEMENTAL_TORMENTA.hp, 2000);
  assert.equal(ELEMENTAL_TORMENTA.radius, 100);
  assert.equal(ELEMENTAL_TORMENTA.anchorY, 0.375);
  assert.equal(ELEMENTAL_TORMENTA.modifiers.find((m) => m.type === 'shielded').reduce, 0.25);
  assert.equal(ELEMENTAL_TORMENTA.resist, undefined, 'resist reemplazado por shielded');
});

test('Elemental phase thresholds 1.0/0.6/0.3; P2 and P3 enter spawnTornado', () => {
  assert.deepEqual(ELEMENTAL_TORMENTA.phases.map((p) => p.from), [1.0, 0.6, 0.3]);
  assert.ok(ELEMENTAL_TORMENTA.phases[1].enter?.includes('spawnTornado'));
  assert.ok(ELEMENTAL_TORMENTA.phases[2].enter?.includes('spawnTornado'));
});

test('Líder Cultista has ritual + untargetable flags and two phases', () => {
  assert.equal(LIDER_CULTISTA.ritual, true);
  assert.equal(LIDER_CULTISTA.untargetable, true);
  assert.equal(LIDER_CULTISTA.movement.type, 'static');
  assert.equal(LIDER_CULTISTA.phases.length, 2);
});

test('Líder phase 0 channels (summons), phase 1 fights (no summon, from 0.0)', () => {
  const p0 = LIDER_CULTISTA.phases[0];
  const p1 = LIDER_CULTISTA.phases[1];
  assert.ok(p0.sequence.some((s) => s.do === 'summon'), 'phase 0 summons');
  assert.ok(!p1.sequence.some((s) => s.do === 'summon'), 'phase 1 does not summon');
  assert.equal(p0.from, 1.0);
  assert.equal(p1.from, 0.0, 'phase 1 is reached only via forcedPhase, never hp');
});

test('Galahad has 5 forms, all elite, with deathFeint flag', () => {
  assert.equal(GALAHAD.deathFeint, true);
  assert.ok(Array.isArray(GALAHAD.forms));
  assert.equal(GALAHAD.forms.length, 5);
  for (const f of GALAHAD.forms) assert.equal(f.elite, true, `${f.key} form elite`);
});

test('Galahad form keys in order', () => {
  assert.deepEqual(GALAHAD.forms.map((f) => f.key), [
    'galahad_humano', 'galahad_rage', 'galahad_rage2', 'galahad_murcielago', 'galahad_final',
  ]);
});

test('Galahad forms have ascending resist across the first four forms, final resets to 0', () => {
  const r = GALAHAD.forms.map((f) => f.resist ?? 0);
  assert.deepEqual(r, [0, 0.10, 0.20, 0.30, 0]);
  for (let i = 1; i < r.length - 1; i++) assert.ok(r[i] > r[i - 1], `resist ascends at ${i}`);
  assert.equal(r[4], 0, 'final form resist resets to 0');
});

test('Galahad form hp matches spec §4.5 (340/460/560/700/90)', () => {
  assert.deepEqual(GALAHAD.forms.map((f) => f.hp), [340, 460, 560, 700, 90]);
});

test('Galahad Humano uses evade; Murcielago is flying with a push gust nova', () => {
  assert.equal(GALAHAD.forms[0].movement.type, 'evade');
  assert.equal(GALAHAD.forms[3].flying, true);
  const gust = GALAHAD.forms[3].phases[0].sequence.find((s) => s.do === 'nova' && s.push);
  assert.ok(gust, 'murcielago has a push nova');
  assert.ok(gust.push.force > 0, 'push has a force');
});

test('Galahad Rage ×2 doubles Rage cadence/speed (spd 150, halved windup)', () => {
  const rage = GALAHAD.forms[1];
  const rage2 = GALAHAD.forms[2];
  assert.equal(rage.speed, 110);
  assert.equal(rage2.speed, 150);
  assert.ok(rage2.movement.windup < rage.movement.windup, 'rage2 windup is shorter (faster cadence)');
});

test('last Galahad form is galahad_final with low hp + minimal kit', () => {
  const last = GALAHAD.forms.at(-1);
  assert.equal(last.key, 'galahad_final');
  assert.ok(last.hp <= 100, `final hp low, got ${last.hp}`);
  assert.equal(last.phases.length, 1, 'final has one phase (minimal kit)');
});

test('Elemental: horda escalando, SOLO no-humanoides, más tipos por fase', () => {
  const HUMANOID = ['siervo_torre','duelista_nocturno','acolito_trueno','heraldo_rayo','sacerdote_sangre','guardia_nocturno','hechicero_viento','vastago_vampirico','cultista','cultista_canalizador','guardian_rito'];
  const summonsByPhase = ELEMENTAL_TORMENTA.phases.map(
    (p) => p.sequence.filter((s) => s.do === 'summon').map((s) => s.spawnType));
  summonsByPhase.flat().forEach((t) => assert.ok(!HUMANOID.includes(t), `${t} no-humanoide`));
  assert.ok(summonsByPhase[2].length >= summonsByPhase[0].length + 2, 'P3 tiene más tipos que P1');
});

test('every boss summon spawnType is a registered enemy', () => {
  const defs = [CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA, LIDER_CULTISTA, ...GALAHAD.forms];
  for (const def of defs) {
    for (const phase of def.phases || []) {
      for (const step of phase.sequence || []) {
        if (step.do === 'summon') {
          assert.ok(step.spawnType in ENEMY_TYPES, `${def.key}: summon spawnType '${step.spawnType}' not in ENEMY_TYPES`);
        }
      }
    }
  }
});
