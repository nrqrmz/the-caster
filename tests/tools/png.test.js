import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePng, encodePng } from '../../tools/lib/png.mjs';

const REF = new URL('../../tools/refs/fuego-basicos-small.png', import.meta.url);

test('decodePng lee la referencia de Fuego (RGBA 1569×192)', () => {
  const img = decodePng(readFileSync(REF));
  assert.equal(img.width, 1569);
  assert.equal(img.height, 192);
  const i = (100 * img.width + 10) * 4; // panel de fondo
  assert.deepEqual([...img.data.slice(i, i + 4)], [15, 14, 24, 255]);
});

test('encodePng → decodePng conserva los píxeles', () => {
  const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255]);
  const back = decodePng(encodePng({ width: 2, height: 2, data }));
  assert.equal(back.width, 2);
  assert.equal(back.height, 2);
  assert.deepEqual([...back.data], [...data]);
});

test('decodePng rechaza lo que no es PNG', () => {
  assert.throws(() => decodePng(Buffer.from('hola mundo, no soy un png')), /not a PNG/);
});
