import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';
import { REGIONS } from '../src/data/regions.js';

// ── 1. Full roster registration ───────────────────────────────────────────────
const WATER_CREATURE_KEYS = [
  'acolito_escarcha', 'lanzahielos', 'ahogado', 'sacerdotisa_lago', 'vidente_marea',
  'guardia_hielo', 'corista_abismo', 'renacuajo', 'rana_saltarina', 'sapo_escupidor',
  'pez_globo', 'cangrejo_acorazado', 'medusa', 'medusa_cria', 'tiburon_joven',
  'serpiente_marina', 'nayade', 'burbuja_gelida', 'totem_escarcha', 'huevo_sapo',
  'tortuga_acorazada',
];

test('water roster: all 20 creature types (+medusa_cria) register in ENEMY_TYPES', () => {
  for (const k of WATER_CREATURE_KEYS) {
    assert.ok(ENEMY_TYPES[k], `ENEMY_TYPES missing: ${k}`);
    assert.equal(ENEMY_TYPES[k].key, k, `key field must match object key for ${k}`);
  }
  assert.equal(WATER_CREATURE_KEYS.length, 21); // 20 named + medusa_cria
});

// ── 2. Wave type strings resolve ──────────────────────────────────────────────
// NOTE: buildPhase (src/data/levelBuilder.js) returns wave phases as
// { type: 'wave', spawnDelay, spawns } — spawns live directly on the phase
// (phase.spawns), NOT phase.wave.spawns. Confirmed against the real shape.

test('waterWaves tiers 1–3: all referenced enemy types exist in ENEMY_TYPES', () => {
  const waterLevels = REGIONS.water.levels;
  // basic levels are indices 0, 1, 2
  for (let i = 0; i < 3; i++) {
    const level = waterLevels[i];
    for (const phase of level.phases) {
      if (phase.type !== 'wave') continue;
      for (const spawn of phase.spawns) {
        assert.ok(ENEMY_TYPES[spawn.type], `waterWaves: unknown type '${spawn.type}' in level index ${i}`);
      }
    }
  }
});

test('waterInterWaves tiers 2–4: all referenced enemy types exist in ENEMY_TYPES', () => {
  const waterLevels = REGIONS.water.levels;
  // intermediate levels are indices 3, 4, 5
  for (let i = 3; i <= 5; i++) {
    const level = waterLevels[i];
    for (const phase of level.phases) {
      if (phase.type !== 'wave') continue;
      for (const spawn of phase.spawns) {
        assert.ok(ENEMY_TYPES[spawn.type], `waterInterWaves: unknown type '${spawn.type}' in level index ${i}`);
      }
    }
  }
});

// ── 3. onHitSlow — exactly 2 melee/aura creatures (ranged acolito migrated to ice projectile type)
test('onHitSlow modifier is on exactly guardia_hielo and burbuja_gelida (melee/aura only)', () => {
  const hasSlowMod = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'onHitSlow');
  const slowCarriers = Object.keys(ENEMY_TYPES).filter(hasSlowMod);
  assert.deepEqual(
    slowCarriers.sort(),
    ['burbuja_gelida', 'guardia_hielo'],
    'onHitSlow should appear on exactly these two melee/aura Water creatures (acolito_escarcha now slows via ice projectile type)',
  );
  // acolito_escarcha must NOT have onHitSlow (its ice-type shot applies the slow instead)
  assert.ok(!hasSlowMod('acolito_escarcha'), 'acolito_escarcha must NOT have onHitSlow modifier');
});

// ── 4. splitsOnDeath — exactly medusa ────────────────────────────────────────
test('splitsOnDeath modifier is on exactly medusa', () => {
  const hasSplit = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'splitsOnDeath');
  const splitCarriers = Object.keys(ENEMY_TYPES).filter(hasSplit);
  assert.deepEqual(splitCarriers, ['medusa'], 'splitsOnDeath should be on medusa only');
  // Verify medusa_cria does NOT have splitsOnDeath (no re-split)
  assert.ok(!hasSplit('medusa_cria'), 'medusa_cria must not have splitsOnDeath (no re-split)');
});

// ── 5. burrow movement — exactly tiburon_joven ───────────────────────────────
test('burrow movement is on exactly tiburon_joven', () => {
  const hasBurrow = (k) => ENEMY_TYPES[k].movement && ENEMY_TYPES[k].movement.type === 'burrow';
  const burrowers = Object.keys(ENEMY_TYPES).filter(hasBurrow);
  assert.deepEqual(burrowers, ['tiburon_joven'], 'burrow should be on tiburon_joven only');
  const def = ENEMY_TYPES.tiburon_joven;
  assert.ok(def.movement.submergeMs > 0, 'tiburon_joven burrow needs submergeMs');
  assert.ok(def.movement.emergeMs > 0, 'tiburon_joven burrow needs emergeMs');
});

// ── 6. resist modifier — exactly tortuga_acorazada ───────────────────────────
test('resist modifier is on exactly tortuga_acorazada', () => {
  const hasResist = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'resist');
  const resisters = Object.keys(ENEMY_TYPES).filter(hasResist);
  assert.deepEqual(resisters, ['tortuga_acorazada'], 'resist should be on tortuga_acorazada only');
  const resistMod = ENEMY_TYPES.tortuga_acorazada.modifiers.find((m) => m.type === 'resist');
  assert.ok(resistMod.factor > 0 && resistMod.factor < 1, 'resist factor must be in (0, 1)');
});

// ── 6b. Frog lifecycle chain is fully connected ──────────────────────────────
// egg (huevo_sapo) → renacuajo → sapo_adulto → egg (closed, self-sustaining loop
// bounded by CONCURRENCY_CAP). Pure data integrity only — the timers/spawning are
// Phaser-coupled (GameScene/EnemyBrain) and verified by playtest.
test('frog lifecycle chain is fully connected', () => {
  const egg = ENEMY_TYPES.huevo_sapo;
  assert.equal(egg.lifecycle, 'egg', 'huevo_sapo must be tagged lifecycle: egg');
  assert.ok(ENEMY_TYPES[egg._hatchType], `egg._hatchType '${egg._hatchType}' must resolve`);
  assert.equal(egg._hatchType, 'renacuajo', 'egg hatches into renacuajo');

  // Egg is inert until it hatches: static, no attacks.
  assert.equal(egg.movement.type, 'static', 'huevo_sapo must be static');
  assert.equal((egg.attacks || []).length, 0, 'huevo_sapo must have no attacks (inert)');

  const tadpole = ENEMY_TYPES.renacuajo;
  assert.ok(ENEMY_TYPES[tadpole._growType], `renacuajo._growType '${tadpole._growType}' must resolve`);
  assert.equal(tadpole._growType, 'sapo_adulto', 'renacuajo grows into sapo_adulto');

  const adult = ENEMY_TYPES.sapo_adulto;
  assert.ok(adult, 'sapo_adulto must register in ENEMY_TYPES');
  const summon = (adult.attacks || []).find((a) => a.type === 'summon');
  assert.ok(summon, 'sapo_adulto must have a summon attack');
  assert.ok(ENEMY_TYPES[summon.spawnType], `summon.spawnType '${summon.spawnType}' must resolve`);
  // Closes the loop: adult lays the same egg the chain started from.
  assert.equal(summon.spawnType, 'huevo_sapo', 'sapo_adulto must re-lay huevo_sapo (closed cycle)');
});

// ── 7. Regression: Fire and generic keys still present ───────────────────────
test('Fire and generic enemy types are unaffected by Water roster addition', () => {
  const legacyKeys = ['villager', 'warrior', 'archer', 'acolito_brasa', 'lanzabrasas',
    'piromante', 'caballero_brasa', 'sacerdote_llama', 'portaestandarte',
    'larva_magma', 'can_lava', 'imp_brasa', 'totem_pira'];
  for (const k of legacyKeys) {
    assert.ok(ENEMY_TYPES[k], `Regression: ENEMY_TYPES missing legacy key '${k}'`);
  }
});
