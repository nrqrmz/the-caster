import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetParts } from '../../tools/lib/sheetParts.mjs';

const R = { gridW: 3, gridH: 2, body: { x: 0, y: 1, size: 32 }, colors: { '0': 0x000000, '1': 0xff8000 }, rows: ['01.', '.10'] };
const load = (text) => import('data:text/javascript,' + encodeURIComponent(text));

test('renderSheetParts: módulo importable con META y PARTS', async () => {
  const text = renderSheetParts([['bicho', R]], { header: ['// cabecera'], prefix: 'zz_', metaName: 'M', partsName: 'P' });
  assert.ok(text.startsWith('// cabecera\n\nexport const M = {\n'));
  assert.ok(text.endsWith('};\n'));
  const mod = await load(text);
  assert.deepEqual(mod.M, { bicho: { gridW: 3, gridH: 2, body: { x: 0, y: 1 } } });
  assert.deepEqual(mod.P.zz_bicho, {
    res: 32, w: 3, h: 2, anchor: { x: 0, y: 0 },
    colors: { '0': 0x000000, '1': 0xff8000 },
    down: ['01.', '.10'],
  });
});

test('renderSheetParts: body.size solo se escribe cuando no es 32', async () => {
  const text = renderSheetParts(
    [['grande', { ...R, body: { x: 2, y: 3, size: 60 } }], ['sinsize', { ...R, body: { x: 1, y: 1 } }]],
    { header: [], prefix: 'zz_', metaName: 'M', partsName: 'P' },
  );
  const mod = await load(text);
  assert.deepEqual(mod.M.grande.body, { x: 2, y: 3, size: 60 });
  assert.deepEqual(mod.M.sinsize.body, { x: 1, y: 1 });
});
