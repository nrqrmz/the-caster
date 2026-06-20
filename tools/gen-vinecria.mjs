// Vine sprout silhouette — SMALL VINE SPROUT (enredadera_cria), 32-grid.
// Serves: enredadera_cria (vineGreen 0x33691e).
// Silhouette: A SMALL, SIMPLE young sprout — a single short curling stem with just
// 1-2 little leaves and one tiny tendril. Clearly smaller and sparser than the full
// creeping vine (vine_*). One small glowing eye.
// Visually distinct from all three other plants:
//   vs zarza: no crossed woody branches, no thorns.
//   vs vine:  much smaller, fewer leaves, single-stem not sinuous S-curve.
//   vs flower: no stem+head structure, no petals or maw.
//
// Parts authored:
//   vinecria_body — a single short curling stem (C-curve), 1-2px thick, with a tiny tendril.
//   vinecria_leaf — 1-2 small leaves (leafgreen palette).
//   vinecria_eye  — one tiny glowing eye at the tip (glow palette).
// Run: node tools/gen-vinecria.mjs

const N = 32, cx = 16;
const layers = {
  vinecria_body: {},
  vinecria_leaf: {},
  vinecria_eye:  {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
};
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.80) r = 'o';
      else if ((x - cx0) / rx + (y - cy0) / ry < -0.55) r = 'h';
      else if ((x - cx0) / rx + (y - cy0) / ry > 0.6) r = 's';
      put(L, x, y, r);
    }
}

// ============================ VINECRIA_BODY (single short curling stem) ============================
// A compact C-shaped curl: base at lower-center, arcs left, tip points upward.
// The whole thing fits roughly in a 10x14 px area — noticeably smaller than the full vine.
// Center of canvas: cx=16. We'll center the sprout there.

// Root: short vertical base (grounded)
for (let y = 22; y <= 26; y++) {
  put('vinecria_body', cx,     y, 'b');
  put('vinecria_body', cx - 1, y, 'h');  // lit side
  put('vinecria_body', cx + 1, y, 's');  // shaded side
}
put('vinecria_body', cx - 1, 26, 'o');  // root outline bottom
put('vinecria_body', cx,     26, 'o');
put('vinecria_body', cx + 1, 26, 'o');

// Arc left and up (the curl): stem bends left from mid-height
line('vinecria_body', cx,     22, cx - 4, 17, 'b');
line('vinecria_body', cx - 1, 22, cx - 5, 17, 'h');

// Continue arc: curves back right (C-shape top)
line('vinecria_body', cx - 4, 17, cx - 3, 12, 'b');
line('vinecria_body', cx - 5, 17, cx - 4, 12, 'h');

// Tip rears slightly upward
line('vinecria_body', cx - 3, 12, cx,     9, 'b');
line('vinecria_body', cx - 4, 12, cx - 1, 9, 'h');

// Tip nub (the "head" of the sprout, tiny)
disk('vinecria_body', cx, 8, 1.5, 'b');
put('vinecria_body', cx,     7, 'o');  // tip outline

// Tiny tendril: a 2-pixel curl off the tip, curling right
put('vinecria_body', cx + 1, 9, 'b');
put('vinecria_body', cx + 2, 8, 'o');
put('vinecria_body', cx + 2, 9, 'o');

// ============================ VINECRIA_LEAF (1-2 small leaves, leafgreen palette) ============================
// Two small leaves: one on the left arc, one near the tip.

// Leaf 1: small oval on left arc
blob('vinecria_leaf', cx - 7, 17, 2.5, 1.5);

// Leaf 2: tiny leaf near the tip
blob('vinecria_leaf', cx - 2, 10, 2.0, 1.3);

// ============================ VINECRIA_EYE (glow palette — one tiny eye at tip) ============================
put('vinecria_eye', cx,     8, 'b');
put('vinecria_eye', cx + 1, 8, 'h');  // single small eye

// ============================ emit ============================
function emit(name) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}

emit('vinecria_body');
emit('vinecria_leaf');
emit('vinecria_eye');
