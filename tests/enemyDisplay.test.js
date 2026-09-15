import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayFor, BODY_PX } from '../src/systems/enemyDisplay.js';

test('BODY_PX es 32', () => { assert.equal(BODY_PX, 32); });

test('sin body (o sin receta): tamaño cuadrado radius*2, como hoy', () => {
  assert.deepEqual(displayFor({ size: 32, parts: [] }, 16), { square: 32 });
  assert.deepEqual(displayFor({ gridW: 64, gridH: 32, parts: [] }, 40), { square: 80 });
  assert.deepEqual(displayFor(null, 17), { square: 34 });
});

test('con body: escala uniforme, origen en el centro del cuerpo y cuerpo físico 32×32 desplazado', () => {
  const r = { gridW: 54, gridH: 45, body: { x: 11, y: 13 } };
  assert.deepEqual(displayFor(r, 16), {
    scale: 1,
    originX: 27 / 54,
    originY: 29 / 45,
    body: { w: 32, h: 32, x: 11, y: 13 },
    half: 16,
  });
});

test('con body y radio 17: la escala crece igual en X e Y', () => {
  const d = displayFor({ gridW: 32, gridH: 36, body: { x: 0, y: 4 } }, 17);
  assert.equal(d.scale, 34 / 32);
  assert.equal(d.originX, 0.5);
  assert.equal(d.originY, 20 / 36);
  assert.equal(d.half, 17);
});

test('con body pero sin gridW/gridH: lanza en vez de producir NaN', () => {
  assert.throws(() => displayFor({ body: { x: 0, y: 0 } }, 16), /needs gridW and gridH/);
  assert.throws(() => displayFor({ gridW: 32, body: { x: 0, y: 0 } }, 16), /needs gridW and gridH/);
});

test('con body.size: el cuadro del cuerpo mide ese lado y con radius*2 = size la escala es 1', () => {
  const r = { gridW: 64, gridH: 70, body: { x: 2, y: 6, size: 60 } };
  assert.deepEqual(displayFor(r, 30), {
    scale: 1,
    originX: 32 / 64,
    originY: 36 / 70,
    body: { w: 60, h: 60, x: 2, y: 6 },
    half: 30,
  });
});

test('con body.size y otro radio: la escala es radius*2/size', () => {
  const d = displayFor({ gridW: 40, gridH: 40, body: { x: 0, y: 0, size: 40 } }, 30);
  assert.equal(d.scale, 60 / 40);
  assert.equal(d.originX, 0.5);
  assert.deepEqual(d.body, { w: 40, h: 40, x: 0, y: 0 });
});
