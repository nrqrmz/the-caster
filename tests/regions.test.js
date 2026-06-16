import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REGION_ORDER, REQUIRED_ELEMENTS } from '../src/data/regions.js';

test('four elemental regions each have 8 levels ending in a temple', () => {
  for (const id of REGION_ORDER) {
    const r = REGIONS[id];
    assert.equal(r.levels.length, 8, `${id} level count`);
    assert.equal(r.levels[7].kind, 'temple', `${id} last is temple`);
    assert.equal(r.levels[7].phases[0].type, 'templeBoss');
    if (id === 'fire') {
      assert.equal(r.levels[7].phases[0].enemyDef.key, 'ignatius', 'fire temple boss is Ignatius');
      assert.ok(Array.isArray(r.levels[7].phases[0].enemyDef.phases), 'Ignatius runs the sequencer');
    } else if (id === 'water') {
      assert.equal(r.levels[7].phases[0].enemyDef.key, 'dama_lago', 'water temple boss is Dama del Lago');
      assert.ok(Array.isArray(r.levels[7].phases[0].enemyDef.forms), 'Dama runs the form sequencer');
    } else {
      assert.ok(Array.isArray(r.levels[7].phases[0].mechanics), `${id} temple boss has mechanics`);
    }
    assert.equal(r.element, id);
    assert.ok(r.grantsSkill, `${id} grants a skill`);
  }
});

test('standard branch layout: 3 basic, 3 intermediate, 1 levelboss, 1 temple', () => {
  const kinds = REGIONS.fire.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'intermediate', 'levelboss', 'temple']);
});

test('level 7 is a dedicated levelboss level; fire holds the sisters trio there', () => {
  const lvl7 = REGIONS.fire.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  assert.deepEqual(lvl7.phases.map((p) => p.type), ['levelBoss']);
  assert.ok(Array.isArray(lvl7.phases[0].bosses), 'fire level 7 is the trio (multi-boss)');
  assert.equal(lvl7.phases[0].bosses.length, 3);
  assert.equal(lvl7.phases[0].triangle, true);
});

test('castle is locked, has no element, and ends in the King reveal', () => {
  const c = REGIONS.castle;
  assert.equal(c.locked, true);
  assert.equal(c.element, null);
  assert.equal(c.levels.length, 5);
  assert.equal(c.levels[4].kind, 'temple');
  const lastLine = c.levels[4].dialogue.onClear.at(-1).text;
  assert.equal(lastLine, 'story.castle.clear.4');
});

test('required elements match the elemental region ids', () => {
  assert.deepEqual([...REQUIRED_ELEMENTS].sort(), [...REGION_ORDER].sort());
});

test('air branch grants the lightning skill', () => {
  assert.equal(REGIONS.air.grantsSkill, 'lightning');
});

test('all temple/level/mini bosses are flagged elite', () => {
  for (const id of REGION_ORDER) {
    for (const level of REGIONS[id].levels) {
      for (const phase of level.phases) {
        if (phase.type === 'levelBoss' && Array.isArray(phase.bosses)) {
          // Fire's level-7 boss is the trio (SISTERS_TRIO) instead of a single enemyDef.
          for (const def of phase.bosses) assert.equal(def.elite, true, `${level.id} trio member elite`);
        } else if (phase.type === 'miniboss' || phase.type === 'levelBoss' || phase.type === 'templeBoss') {
          assert.equal(phase.enemyDef.elite, true, `${level.id} ${phase.type} elite`);
        }
      }
    }
  }
});

// ─── Water wiring ────────────────────────────────────────────────────────────

test('water branch has 8 levels with the standard kind layout', () => {
  const kinds = REGIONS.water.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'intermediate', 'levelboss', 'temple']);
});

test('water nv4/5/6 minibosses are soldado_hielo, sapo_desovador, tiburon_abisal', () => {
  const water = REGIONS.water;
  const mb4 = water.levels[3].phases.find((p) => p.type === 'miniboss');
  const mb5 = water.levels[4].phases.find((p) => p.type === 'miniboss');
  const mb6 = water.levels[5].phases.find((p) => p.type === 'miniboss');
  assert.equal(mb4.enemyDef.key, 'soldado_hielo');
  assert.equal(mb5.enemyDef.key, 'sapo_desovador');
  assert.equal(mb6.enemyDef.key, 'tiburon_abisal');
  // All flagged elite
  assert.equal(mb4.enemyDef.elite, true);
  assert.equal(mb5.enemyDef.elite, true);
  assert.equal(mb6.enemyDef.elite, true);
});

test('water nv7 levelboss is the Kraken (single boss, no trio)', () => {
  const lvl7 = REGIONS.water.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  const phase = lvl7.phases[0];
  assert.equal(phase.type, 'levelBoss');
  // single boss path: enemyDef present, no bosses array
  assert.equal(phase.enemyDef.key, 'kraken');
  assert.equal(phase.enemyDef.elite, true);
  assert.equal(phase.bosses, undefined, 'Kraken is not a trio');
});

test('water nv8 templeboss is DAMA_LAGO with a forms array of length 5', () => {
  const lvl8 = REGIONS.water.levels[7];
  assert.equal(lvl8.kind, 'temple');
  const phase = lvl8.phases[0];
  assert.equal(phase.type, 'templeBoss');
  assert.equal(phase.enemyDef.key, 'dama_lago');
  assert.equal(phase.enemyDef.elite, true);
  assert.ok(Array.isArray(phase.enemyDef.forms));
  assert.equal(phase.enemyDef.forms.length, 5);
  assert.equal(phase.enemyDef.forms.at(-1).key, 'dama_maga_final');
});

test('water region grants freeze skill and preserves narrative', () => {
  const water = REGIONS.water;
  assert.equal(water.grantsSkill, 'freeze');
  const clearDialogue = water.levels[7].dialogue.onClear;
  assert.ok(clearDialogue.length >= 2, 'closing dialogue present');
  const mageLine = clearDialogue.find((l) => l.speaker === 'speaker.mage.water');
  assert.ok(mageLine, 'speaker.mage.water has a closing line');
  assert.equal(mageLine.text, 'story.water.mage.0', 'mageLines[0] key preserved');
});

// ─── Fire regression ─────────────────────────────────────────────────────────

test('fire nv4/5/6 minibosses are still pyra, vesta, favilla (regression)', () => {
  const fire = REGIONS.fire;
  const mb4 = fire.levels[3].phases.find((p) => p.type === 'miniboss');
  const mb5 = fire.levels[4].phases.find((p) => p.type === 'miniboss');
  const mb6 = fire.levels[5].phases.find((p) => p.type === 'miniboss');
  assert.equal(mb4.enemyDef.key, 'pyra');
  assert.equal(mb5.enemyDef.key, 'vesta');
  assert.equal(mb6.enemyDef.key, 'favilla');
});

test('fire nv7 is still the sisters trio (regression)', () => {
  const lvl7 = REGIONS.fire.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  const phase = lvl7.phases[0];
  assert.ok(Array.isArray(phase.bosses), 'fire nv7 still uses bosses array');
  assert.equal(phase.bosses.length, 3);
  assert.equal(phase.triangle, true);
  // The new levelBoss param must NOT have clobbered fire
  assert.equal(phase.enemyDef, undefined, 'fire nv7 has no single enemyDef — it is a trio');
});

test('fire temple boss is still Ignatius (regression)', () => {
  const tb = REGIONS.fire.levels[7].phases[0];
  assert.equal(tb.enemyDef.key, 'ignatius');
  assert.ok(Array.isArray(tb.enemyDef.phases));
});
