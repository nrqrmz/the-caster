// tests/sprites/parts.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../../src/data/sprites/parts.js';

const ROLE_CHARS = new Set(['.', 'o', 'b', 's', 'h', 'a']);

test('every part has w/h/anchor and at least the down direction', () => {
  for (const [name, p] of Object.entries(PARTS)) {
    assert.equal(typeof p.w, 'number', `${name}.w`);
    assert.equal(typeof p.h, 'number', `${name}.h`);
    assert.ok(p.anchor && typeof p.anchor.x === 'number' && typeof p.anchor.y === 'number', `${name}.anchor`);
    assert.ok(Array.isArray(p.down), `${name}.down must be an array`);
  }
});

test('each direction grid matches declared w/h and uses only role chars', () => {
  for (const [name, p] of Object.entries(PARTS)) {
    for (const dir of ['down', 'up', 'side']) {
      const rows = p[dir];
      if (rows == null) continue; // direction intentionally skipped
      assert.equal(rows.length, p.h, `${name}.${dir} row count`);
      for (const row of rows) {
        assert.equal(row.length, p.w, `${name}.${dir} row width`);
        for (const ch of row) assert.ok(ROLE_CHARS.has(ch), `${name}.${dir} bad char '${ch}'`);
      }
    }
  }
});

test('hero parts are present', () => {
  for (const n of ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff']) {
    assert.ok(PARTS[n], `missing part ${n}`);
  }
});
