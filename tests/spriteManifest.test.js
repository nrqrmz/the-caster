import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regionSpriteKeys, CORE_SPRITE_KEYS } from '../src/data/spriteManifest.js';
import { REGIONS } from '../src/data/regions.js';
import { RECIPES } from '../src/data/sprites/recipes.js';

test('fire: includes wave enemies, bosses, and transitive summons', () => {
  const fire = regionSpriteKeys(REGIONS.fire);
  // wave enemies
  for (const k of ['acolito_brasa', 'lanzabrasas', 'salamandra', 'piromante', 'totem_pira']) {
    assert.ok(fire.has(k), `expected fire to include ${k}`);
  }
  // bosses (minibosses + temple boss)
  for (const k of ['pyra', 'vesta', 'favilla', 'ignatius']) {
    assert.ok(fire.has(k), `expected fire to include boss ${k}`);
  }
  // transitive summons: imp_brasa (sacerdote_llama/favilla), brasa_errante (ignatius)
  assert.ok(fire.has('imp_brasa'), 'expected transitive summon imp_brasa');
  assert.ok(fire.has('brasa_errante'), 'expected transitive summon brasa_errante');
});

test('fire: includes formerly-unused defs now placed in waves', () => {
  // encapuchado_pira (nv3), portaestandarte (nv4), fenix_menor (nv5), coloso_magma (nv6)
  const fire = regionSpriteKeys(REGIONS.fire);
  for (const k of ['encapuchado_pira', 'portaestandarte', 'coloso_magma', 'fenix_menor']) {
    assert.ok(fire.has(k), `expected fire to include now-placed ${k}`);
  }
});

test('manifest drops geometric placeholders (no recipe)', () => {
  // castle minibosses use geometric keys 'miniboss'/'levelboss'/'templeboss' (no recipe)
  const castle = regionSpriteKeys(REGIONS.castle);
  for (const k of ['miniboss', 'levelboss', 'templeboss']) {
    assert.ok(!castle.has(k), `expected geometric ${k} dropped`);
  }
});

test('castle needs no forged sprite beyond core', () => {
  const castle = regionSpriteKeys(REGIONS.castle);
  for (const k of castle) {
    assert.ok(CORE_SPRITE_KEYS.includes(k), `castle key ${k} should be in core`);
  }
});

test('water: generational lifecycle forms are forged (egg→tadpole→adult + Náyade grow)', () => {
  const water = regionSpriteKeys(REGIONS.water);
  // Sapo Desovador summons huevo_sapo → hatches renacuajo → matures sapo_adulto.
  for (const k of ['huevo_sapo', 'renacuajo', 'sapo_adulto']) {
    assert.ok(water.has(k), `expected water lifecycle form ${k} (else missing sprite at runtime)`);
  }
  // Náyade's renacuajos mature into sapo_escupidor via summon growType.
  assert.ok(water.has('sapo_escupidor'), 'expected Náyade grow target sapo_escupidor');
});

test('shapeshifter forms are included (water Dama, air Galahad, earth Cefalo)', () => {
  const water = regionSpriteKeys(REGIONS.water);
  for (const k of ['dama_lago', 'dama_maga', 'dama_tiburon', 'dama_kraken', 'dama_ballena', 'dama_maga_final']) {
    assert.ok(water.has(k), `expected water Dama form ${k}`);
  }
  const air = regionSpriteKeys(REGIONS.air);
  for (const k of ['galahad_humano', 'galahad_rage', 'galahad_rage2', 'galahad_murcielago', 'galahad_final']) {
    assert.ok(air.has(k), `expected air Galahad form ${k}`);
  }
  // runtime corpse swap declared via extraSprites
  assert.ok(air.has('galahad_cadaver'), 'expected galahad_cadaver via extraSprites');
  const earth = regionSpriteKeys(REGIONS.earth);
  for (const k of ['cefalo_humano', 'cefalo_felino']) {
    assert.ok(earth.has(k), `expected earth Cefalo form ${k}`);
  }
});

test('every projectile recipe is in CORE_SPRITE_KEYS', () => {
  for (const [k, r] of Object.entries(RECIPES)) {
    if (r.archetype === 'projectile') {
      assert.ok(CORE_SPRITE_KEYS.includes(k), `projectile ${k} must be core`);
    }
  }
});
