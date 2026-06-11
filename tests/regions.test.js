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
  assert.match(lastLine, /CONTINUARÁ/);
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
