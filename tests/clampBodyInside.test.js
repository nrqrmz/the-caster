import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampBodyInside } from '../src/systems/clampBodyInside.js';

const W = 480, H = 854;

test('un cuerpo ya dentro no se mueve', () => {
  const r = clampBodyInside(240, 400, 16, 16, W, H, 10);
  assert.deepEqual(r, { x: 240, y: 400 });
});

test('empuja el cuerpo adentro en el borde izquierdo/arriba (halfsize + margen)', () => {
  const r = clampBodyInside(0, 0, 16, 16, W, H, 10);
  assert.equal(r.x, 26); // 16 + 10
  assert.equal(r.y, 26);
});

test('empuja el cuerpo adentro en el borde derecho/abajo', () => {
  const r = clampBodyInside(W, H, 16, 20, W, H, 10);
  assert.equal(r.x, W - 26); // 480 - (16 + 10)
  assert.equal(r.y, H - 30); // 854 - (20 + 10)
});

test('respeta esquinas (clampa ambos ejes a la vez)', () => {
  const r = clampBodyInside(-50, 9999, 16, 16, W, H, 10);
  assert.equal(r.x, 26);
  assert.equal(r.y, H - 26);
});

test('margen 0 clampa justo al borde por halfsize', () => {
  const r = clampBodyInside(0, 0, 16, 16, W, H, 0);
  assert.equal(r.x, 16);
  assert.equal(r.y, 16);
});

test('cuerpo más grande que el área degrada al centro del eje', () => {
  // halfW (300) + margen excede el medio-ancho => lo > hi; clamp degrada a hi.
  const r = clampBodyInside(240, 400, 300, 300, W, H, 10);
  // Math.min(Math.max(x, lo), hi) con lo > hi => devuelve hi.
  assert.equal(r.x, W - 310);
  assert.equal(r.y, H - 310);
});
