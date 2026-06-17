import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';
import { AIR_ENEMIES } from '../src/data/enemies/air.js';
import { REGIONS } from '../src/data/regions.js';

// ── 1. Full roster registration ───────────────────────────────────────────────
const AIR_CREATURE_KEYS = [
  'siervo_torre', 'duelista_nocturno', 'acolito_trueno', 'heraldo_rayo', 'sacerdote_sangre',
  'guardia_nocturno', 'hechicero_viento', 'vastago_vampirico', 'murcielago', 'arpia',
  'espiritu_tormenta', 'fuego_fatuo', 'vampiro_alado', 'gargola_pararrayos', 'centinela_piedra',
  'torbellino_errante', 'tronador', 'cultista', 'cultista_canalizador', 'guardian_rito',
];

const KNOWN_MOVEMENTS = new Set([
  'chase', 'kite', 'flee', 'charge', 'orbit', 'strafe', 'erratic', 'static', 'zigzag', 'burrow', 'evade', 'holdAt',
]);
const KNOWN_MODIFIERS = new Set([
  'drain', 'onHitStun', 'onHitPush', 'auraDamage', 'healAllies', 'shielded', 'reviveOnce',
  'onHitSlow', 'onHitBurn', 'explodesOnDeath', 'splitsOnDeath', 'resist',
]);

test('air roster: exactly 20 creatures, all register in ENEMY_TYPES with matching key', () => {
  assert.equal(Object.keys(AIR_ENEMIES).length, 20, 'air.js must hold exactly 20 defs');
  assert.equal(AIR_CREATURE_KEYS.length, 20);
  for (const k of AIR_CREATURE_KEYS) {
    assert.ok(ENEMY_TYPES[k], `ENEMY_TYPES missing: ${k}`);
    assert.equal(ENEMY_TYPES[k].key, k, `key field must match object key for ${k}`);
  }
});

test('air roster: every def has required numeric fields and a valid color/tex', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const d = ENEMY_TYPES[k];
    for (const f of ['hp', 'speed', 'damage', 'radius']) {
      assert.ok(Number.isFinite(d[f]), `${k}.${f} must be a finite number`);
      assert.ok(d[f] >= 0, `${k}.${f} must be >= 0`);
    }
    assert.ok(typeof d.tex === 'string' && d.tex.length, `${k}.tex must be a tex key`);
    assert.ok(Number.isFinite(d.color), `${k}.color must be a hex number`);
  }
});

test('air roster: every movement.type is engine-supported', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const m = ENEMY_TYPES[k].movement;
    assert.ok(m && KNOWN_MOVEMENTS.has(m.type), `${k} has unsupported movement '${m && m.type}'`);
  }
});

test('air roster: every modifier type is known and flags are booleans', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const d = ENEMY_TYPES[k];
    for (const mod of d.modifiers || []) {
      const type = typeof mod === 'string' ? mod : mod.type;
      assert.ok(KNOWN_MODIFIERS.has(type), `${k} has unknown modifier '${type}'`);
    }
    if ('flying' in d) assert.equal(typeof d.flying, 'boolean', `${k}.flying must be boolean`);
    if ('untargetable' in d) assert.equal(typeof d.untargetable, 'boolean', `${k}.untargetable must be boolean`);
  }
});

// ── 2. Wave type strings resolve ──────────────────────────────────────────────
// { type: 'wave', spawnDelay, spawns } — spawns live directly on the phase
// (phase.spawns), NOT phase.wave.spawns. Confirmed against levelBuilder.buildPhase.
test('airWaves tiers 1–3 (basic levels 0–2): every spawn type exists in ENEMY_TYPES', () => {
  const levels = REGIONS.air.levels;
  for (let i = 0; i < 3; i++) {
    for (const phase of levels[i].phases) {
      if (phase.type !== 'wave') continue;
      for (const s of phase.spawns) {
        assert.ok(ENEMY_TYPES[s.type], `airWaves: unknown type '${s.type}' in level index ${i}`);
      }
    }
  }
});

test('airInterWaves tiers 2–4 (intermediate levels 3–5): every spawn type exists in ENEMY_TYPES', () => {
  const levels = REGIONS.air.levels;
  for (let i = 3; i <= 5; i++) {
    for (const phase of levels[i].phases) {
      if (phase.type !== 'wave') continue;
      for (const s of phase.spawns) {
        assert.ok(ENEMY_TYPES[s.type], `airInterWaves: unknown type '${s.type}' in level index ${i}`);
      }
    }
  }
});

// ── 3. flying flag — exactly the five flyers ──────────────────────────────────
test('flying flag is on exactly the five flyers', () => {
  const flyers = AIR_CREATURE_KEYS.filter((k) => ENEMY_TYPES[k].flying === true).sort();
  assert.deepEqual(flyers, ['arpia', 'espiritu_tormenta', 'fuego_fatuo', 'murcielago', 'vampiro_alado']);
});

// ── 4. drain modifier — exactly the six vampires/bats ─────────────────────────
test('drain modifier is on exactly the intended six creatures', () => {
  const has = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'drain');
  const drainers = AIR_CREATURE_KEYS.filter(has).sort();
  assert.deepEqual(drainers, [
    'duelista_nocturno', 'guardia_nocturno', 'murcielago', 'siervo_torre', 'vampiro_alado', 'vastago_vampirico',
  ]);
});

// ── 5. evade movement — exactly Duelista Nocturno ─────────────────────────────
test('evade movement is on exactly duelista_nocturno', () => {
  const evaders = AIR_CREATURE_KEYS.filter((k) => ENEMY_TYPES[k].movement.type === 'evade');
  assert.deepEqual(evaders, ['duelista_nocturno']);
});

// ── 6. control-loss modifiers — onHitStun / onHitPush / reviveOnce placement ──
test('onHitStun (lift) is on Fuego Fatuo (stun) and Torbellino Errante (lift)', () => {
  const stunMod = (k) => (ENEMY_TYPES[k].modifiers || []).find((m) => m.type === 'onHitStun');
  assert.equal(stunMod('fuego_fatuo').kind, 'stun');
  assert.equal(stunMod('fuego_fatuo').ms, 300);
  assert.equal(stunMod('torbellino_errante').kind, 'lift');
  assert.equal(stunMod('torbellino_errante').ms, 500);
});

test('onHitPush is on exactly torbellino_errante; reviveOnce on exactly vastago_vampirico', () => {
  const hasPush = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'onHitPush');
  assert.deepEqual(AIR_CREATURE_KEYS.filter(hasPush), ['torbellino_errante']);
  const hasRevive = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'reviveOnce');
  assert.deepEqual(AIR_CREATURE_KEYS.filter(hasRevive), ['vastago_vampirico']);
  assert.equal(ENEMY_TYPES.torbellino_errante.damage, 0, 'Torbellino Errante deals 0 damage');
});

// ── 7. ranged control-loss attack flags (consumed by executeAttack, Task 2) ───
test('ranged stun/lift attack flags are set on Heraldo (stun) and Hechicero (lift)', () => {
  assert.ok(ENEMY_TYPES.heraldo_rayo.attacks.some((a) => a.stun === true), 'Heraldo bolt must carry stun:true');
  assert.ok(ENEMY_TYPES.hechicero_viento.attacks.some((a) => a.lift === true), 'Hechicero tornadito must carry lift:true');
  assert.ok(ENEMY_TYPES.gargola_pararrayos.attacks.some((a) => a.stun === true), 'Gárgola nova must carry stun:true');
});

// ── 8. untargetable — Canalizador is NOT untargetable (only the leader, Plan 3) ─
test('cultista_canalizador is plain fodder (not untargetable here)', () => {
  assert.ok(!ENEMY_TYPES.cultista_canalizador.untargetable, 'only the nv7 leader is untargetable (Plan 3)');
  assert.equal(ENEMY_TYPES.cultista_canalizador.movement.type, 'static');
});

// ── 9. Regression: Fire, Water and generic keys still present ─────────────────
test('Fire/Water/generic enemy types are unaffected by the Air roster addition', () => {
  const legacy = ['villager', 'warrior', 'archer', 'acolito_brasa', 'piromante', 'ahogado', 'medusa', 'tiburon_joven'];
  for (const k of legacy) assert.ok(ENEMY_TYPES[k], `Regression: ENEMY_TYPES missing legacy key '${k}'`);
});
