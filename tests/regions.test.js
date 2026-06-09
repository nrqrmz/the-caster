import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REGION_ORDER, REQUIRED_ELEMENTS } from '../src/data/regions.js';

test('four elemental regions each have 7 levels ending in a temple', () => {
  for (const id of REGION_ORDER) {
    const r = REGIONS[id];
    assert.equal(r.levels.length, 7, `${id} level count`);
    assert.equal(r.levels[6].kind, 'temple', `${id} last is temple`);
    assert.equal(r.levels[6].phases[0].type, 'templeBoss');
    assert.ok(Array.isArray(r.levels[6].phases[0].mechanics), `${id} temple boss has mechanics`);
    assert.equal(r.element, id);
    assert.ok(r.grantsSkill, `${id} grants a skill`);
  }
});

test('standard branch kind layout is 3 basic, 2 intermediate, 1 pretemple, 1 temple', () => {
  const kinds = REGIONS.fire.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'pretemple', 'temple']);
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
