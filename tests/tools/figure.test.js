import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertFigure, medianCut, BODY } from '../../tools/lib/figure.mjs';

const BG = [16, 14, 25];
function sheet(w, h) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = BG[0]; data[i * 4 + 1] = BG[1]; data[i * 4 + 2] = BG[2]; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
}
function fill(img, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = (c >> 16) & 255; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255;
  }
}
const colorAt = (r, x, y) => { const ch = r.rows[y][x]; return ch === '.' ? null : r.colors[ch]; };
const RED = 0xb03a2e, YELLOW = 0xffd54f;

test('medianCut es determinista y separa grupos distintos', () => {
  const cols = [...new Array(50).fill(0x100000), ...new Array(50).fill(0xf0f0f0)];
  const a = medianCut(cols, 4);
  assert.deepEqual(a, medianCut(cols, 4));
  assert.ok(a.includes(0x100000) && a.includes(0xf0f0f0));
  assert.ok(a.length <= 4);
});

test('convertFigure: figura pequeña → lienzo 32×32 con el cuerpo centrado y el brillo conservado', () => {
  const img = sheet(40, 40);
  fill(img, 10, 5, 29, 34, RED);      // cuerpo 20×30
  fill(img, 18, 18, 21, 21, YELLOW);  // brillo 4×4 en el centro
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0 });
  assert.equal(r.gridW, BODY);
  assert.equal(r.gridH, BODY);
  assert.deepEqual(r.body, { x: 0, y: 0 });
  assert.equal(r.rows.length, 32);
  assert.ok(r.rows.every((row) => row.length === 32));
  // bbox (10,5) → salida (8..11,13..16) → lienzo desplazado (+6,+2)
  assert.equal(colorAt(r, 14, 15), YELLOW);
  assert.equal(colorAt(r, 6, 2), RED);   // esquina: contorno = color más oscuro = rojo
  assert.equal(colorAt(r, 5, 2), null);  // fuera de la figura
});

test('convertFigure: figura más alta que 32 → el cuadro del cuerpo se centra en la masa de la silueta', () => {
  const img = sheet(60, 90);
  fill(img, 10, 5, 41, 84, RED);      // silueta uniforme 32×80
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 89], scale: 1, peel: 0 });
  assert.deepEqual([r.gridW, r.gridH], [32, 80]);
  assert.deepEqual(r.body, { x: 0, y: 24 });
});

test('convertFigure: lo que sobresale por arriba amplía el lienzo y tira del cuerpo hacia su masa', () => {
  const img = sheet(60, 70);
  fill(img, 10, 30, 41, 61, RED);     // cuerpo 32×32
  fill(img, 24, 5, 27, 29, YELLOW);   // antorcha 4×25 encima
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 69], scale: 1, peel: 0 });
  assert.equal(r.gridH, 57);
  // masa: 1024 px con y medio 40.5 + 100 px con y medio 12 → ≈37.96 → esquina 22
  assert.deepEqual(r.body, { x: 0, y: 22 });
  assert.equal(colorAt(r, 15, 0), YELLOW);
});

const silhouetteW = (r) => {
  let lo = Infinity, hi = -1;
  for (const row of r.rows) for (let x = 0; x < row.length; x++) if (row[x] !== '.') { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  return hi - lo + 1;
};
const silhouetteH = (r) => r.rows.filter((row) => /[^.]/.test(row)).length;

test('convertFigure: minWidth sube la escala hasta que la silueta mida al menos ese ancho, sin deformar', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, RED);    // silueta 20×100 (ratio 1:5)
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 119], scale: 0.4, minWidth: 32, peel: 0 });
  const w = silhouetteW(r), h = silhouetteH(r);
  assert.ok(w >= 32 && w <= 33, `ancho ${w}`);
  assert.ok(Math.abs(h / w - 5) < 0.25, `ratio ${h}/${w}`);
});

test('convertFigure: minWidth no reduce una figura que ya es más ancha', () => {
  const img = sheet(120, 60);
  fill(img, 10, 10, 109, 49, RED);    // silueta 100×40
  const a = convertFigure(img, { slot: [0, 119], rows: [0, 59], scale: 0.5, peel: 0 });
  const b = convertFigure(img, { slot: [0, 119], rows: [0, 59], scale: 0.5, minWidth: 32, peel: 0 });
  assert.deepEqual(b, a);
});

test('convertFigure: minWidth compensa el pelado de bordes', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, 0x201010);  // oscuro: el pelado se come los bordes
  fill(img, 14, 10, 25, 109, RED);
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 119], scale: 0.4, minWidth: 32, peel: 2 });
  assert.ok(silhouetteW(r) >= 32, `ancho ${silhouetteW(r)}`);
});

test('convertFigure: un píxel color fondo encerrado en la figura no es fondo', () => {
  const img = sheet(40, 40);
  fill(img, 5, 5, 34, 34, RED);
  fill(img, 19, 19, 20, 20, (BG[0] << 16) | (BG[1] << 8) | BG[2]);
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0 });
  assert.notEqual(r.rows[16][15], '.');
});

test('convertFigure: overrides pintan en coordenadas del lienzo y validan límites y colores', () => {
  const img = sheet(40, 40);
  fill(img, 4, 4, 35, 35, RED);
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0, overrides: [[3, 3, YELLOW], [4, 4, null]] });
  assert.equal(colorAt(r, 3, 3), YELLOW);
  assert.equal(colorAt(r, 4, 4), null);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, overrides: [[99, 0, YELLOW]] }), /outside/);
  const many = Array.from({ length: 16 }, (_, i) => [i, 10, 0x010101 * (i + 1)]);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0, overrides: many }), /colors > 16/);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, colors: 17 }), /colors 17 > 16/);
});

test('convertFigure: scale 0.5 reduce a la mitad', () => {
  const img = sheet(80, 80);
  fill(img, 8, 8, 71, 71, RED);
  const r = convertFigure(img, { slot: [0, 79], rows: [0, 79], scale: 0.5, peel: 0 });
  assert.deepEqual([r.gridW, r.gridH], [32, 32]);
  assert.equal(r.rows.join('').replace(/\./g, '').length, 32 * 32);
});

test('convertFigure: slot vacío lanza error', () => {
  assert.throws(() => convertFigure(sheet(10, 10), { slot: [0, 9], rows: [0, 9], scale: 1 }), /empty slot/);
});
