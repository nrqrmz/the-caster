import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetPreview } from '../../tools/lib/sheetPreview.mjs';

const solid = (w, h, [r, g, b]) => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([r, g, b, 255], i * 4);
  return { width: w, height: h, data };
};
const item = (extra = {}) => ({
  fig: { slot: [0, 3], rows: [0, 3] },
  recipe: { gridW: 1, gridH: 1, body: { x: 0, y: 0, size: 1 } },
  grid: [[0x00ff00]],
  ...extra,
});
// PAD = 12; con refScale 1 el recorte 4×4 va en x = 12, y = H - 12 - 4.
const refPixel = (out) => {
  const i = ((out.height - 12 - 4) * out.width + 12) * 4;
  return [...out.data.slice(i, i + 3)];
};

test('renderSheetPreview: sin img, el recorte sale de ref', () => {
  const out = renderSheetPreview(solid(4, 4, [255, 0, 0]), [item()], { refScale: 1 });
  assert.deepEqual(refPixel(out), [255, 0, 0]);
});

test('renderSheetPreview: con img, el recorte de ese item sale de su imagen', () => {
  const out = renderSheetPreview(solid(4, 4, [255, 0, 0]), [item({ img: solid(4, 4, [0, 0, 255]) })], { refScale: 1 });
  assert.deepEqual(refPixel(out), [0, 0, 255]);
});
