// Galahad COFFIN — vertical stone sarcophagus (nv7 ritual setpiece centerpiece).
// NATIVE non-square sprite: authored on a 32-wide × 96-tall grid (res:32 → f=1),
// displayed ~96×288 (uniform ×3 — square pixels).
//
// Design: classic hexagonal coffin standing vertical. Head end at TOP, foot at BOTTOM,
// widest at the "shoulders" (~1/3 down). Four layers, back-to-front:
//   coffin_body  : stone (recipe baseColor) — hexagonal slab, shaded h(left)/s(right), cracks
//   coffin_trim  : gold — outline tracing the coffin edge + central lid seam + two bands
//   coffin_gem   : blood red (vampglow) — diamond gem on the chest (~40% down)
//   coffin_crest : gold — small crest/diamond emblem at the head
//
// Run: node tools/gen-coffin.mjs
// Then splice the emitted coffin_* blocks into src/data/sprites/parts.js.

const W = 32, H = 96;
const CX = 16;

const body  = {};
const trim  = {};
const gem   = {};
const crest = {};

const put = (L, x, y, r) => {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) L[`${x},${y}`] = r;
};
function hfill(L, y, x0, x1, r) {
  for (let x = Math.round(x0); x <= Math.round(x1); x++) put(L, x, y, r);
}

// ---- Coffin silhouette: halfwidth(y) piecewise-linear (head→shoulders→body→foot) ----
function lerp(a, b, t) { return a + (b - a) * t; }
function halfWidth(y) {
  if (y < 6 || y > 90) return -1;                 // outside the coffin
  if (y <= 10) return 5;                           // head top (narrow flat)
  if (y <= 30) return lerp(5, 13, (y - 10) / 20);  // shoulders widen
  if (y <= 82) return lerp(13, 10, (y - 30) / 52); // body tapers slightly
  return lerp(10, 3, (y - 82) / 8);                // foot tapers to point
}

// ---- coffin_body: stone slab ----
for (let y = 6; y <= 90; y++) {
  const hw = halfWidth(y);
  if (hw < 0) continue;
  const L = Math.round(CX - hw), R = Math.round(CX + hw);
  hfill(body, y, L, R, 'b');
  put(body, L, y, 'o'); put(body, R, y, 'o');          // side outline
  put(body, L + 1, y, 'h'); put(body, L + 2, y, 'h');  // lit left face
  put(body, R - 1, y, 's'); put(body, R - 2, y, 's');  // shadowed right face
}
// Head + foot caps (outline the flat top/bottom edges)
hfill(body, 6, CX - 5, CX + 5, 'o');
hfill(body, 90, CX - 3, CX + 3, 'o');
// A few weathered cracks (dark hairlines down the stone)
[[10, 40, 11, 55], [22, 60, 20, 78], [12, 30, 13, 44]].forEach(([x0, y0, x1, y1]) => {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) put(body, lerp(x0, x1, i / steps), lerp(y0, y1, i / steps), 's');
});

// ---- coffin_trim: gold border + lid seam + two horizontal bands ----
for (let y = 6; y <= 90; y++) {
  const hw = halfWidth(y);
  if (hw < 0) continue;
  put(trim, CX - hw, y, 'b'); put(trim, CX + hw, y, 'b'); // gold edge
}
hfill(trim, 6, CX - 5, CX + 5, 'b');   // gold head cap
hfill(trim, 90, CX - 3, CX + 3, 'b');  // gold foot cap
for (let y = 12; y <= 86; y++) put(trim, CX, y, 'b'); // central lid seam
put(trim, CX, 12, 'h'); // seam glint
// Two decorative gold bands across the lid
[26, 70].forEach((y) => { const hw = halfWidth(y); hfill(trim, y, CX - hw + 1, CX + hw - 1, 'b'); });

// ---- coffin_gem: blood-red diamond on the chest (~y 37..43) ----
const gy = 40;
for (let dy = -3; dy <= 3; dy++) {
  const w = 3 - Math.abs(dy);
  hfill(gem, gy + dy, CX - w, CX + w, 'b');
}
put(gem, CX, gy - 1, 'h'); put(gem, CX, gy, 'h'); // gem highlight
put(gem, CX + 1, gy + 1, 's');                    // gem facet shadow

// ---- coffin_crest: small gold diamond emblem at the head (~y 8) ----
const cy = 9;
for (let dy = -2; dy <= 2; dy++) {
  const w = 2 - Math.abs(dy);
  hfill(crest, cy + dy, CX - w, CX + w, 'b');
}
put(crest, CX, cy, 'h');

// ============================= emit =============================
function layerToFixedRows(L) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) row += L[`${x},${y}`] ?? '.';
    rows.push(row);
  }
  return rows;
}
function emitStatic(name, L) {
  const rows = layerToFixedRows(L);
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${W}, h: ${H}, anchor: { x: 0, y: 0 },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}

emitStatic('coffin_body',  body);
emitStatic('coffin_trim',  trim);
emitStatic('coffin_gem',   gem);
emitStatic('coffin_crest', crest);
