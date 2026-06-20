// Bramble silhouette — WOODY THORN BUSH (zarza_estranguladora), 32-grid.
// Serves: zarza_estranguladora (vineGreen 0x33691e).
// Silhouette: IRREGULAR, ASYMMETRIC tangle of dark woody STEMS/branches crisscrossing
// at varied angles (not a round blob), with short bone-colored THORNS bristling off the
// stems, and two glowing eyes nestled in the tangle.
//
// Parts authored:
//   bramble_body   — crisscrossed woody branches at multiple angles; 'b' fill, 'h'
//                    upper-front stems, 's' back/deeper stems, 'o' outline.
//   bramble_thorns — short 2-3px spikes jutting from stems (bone palette).
//   bramble_eyes   — two small glowing eyes peeking from the tangle center (glow).
// Run: node tools/gen-bramble.mjs

const N = 32, cx = 16;
const layers = {
  bramble_body:   {},
  bramble_thorns: {},
  bramble_eyes:   {},
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

// ============================ BRAMBLE_BODY (woody stem tangle) ============================
// Five thick woody stems crossing at irregular angles — the classic bramble tangle.
// Stems are 2px wide (parallel line pairs) so they look woody, not vine-thin.

// Stem 1: Nearly horizontal, slightly tilted — left to right across mid-canvas
line('bramble_body', 4,  16, 27, 13, 'b');
line('bramble_body', 4,  17, 27, 14, 's');

// Stem 2: Steep diagonal, top-left to bottom-right
line('bramble_body', 6,  5,  22, 27, 'b');
line('bramble_body', 7,  5,  23, 27, 's');

// Stem 3: Diagonal going top-right to bottom-left (crossing stem 2)
line('bramble_body', 25, 4,  7,  28, 'h');
line('bramble_body', 26, 4,  8,  28, 'b');

// Stem 4: Short steep, lower-left area — adds asymmetry
line('bramble_body', 3,  22, 12, 10, 'b');
line('bramble_body', 4,  22, 13, 10, 's');

// Stem 5: Upper-right area, medium angle — fills upper right
line('bramble_body', 17, 4,  28, 18, 'h');
line('bramble_body', 17, 5,  28, 19, 'b');

// Stem 6: Low sweep — right to lower-left, grounds the bush
line('bramble_body', 28, 23, 5,  29, 's');
line('bramble_body', 28, 22, 5,  28, 'b');

// Small fill blobs at junctions to thicken crossings
disk('bramble_body', 12, 15, 2.2, 'b');  // center crossing clump
disk('bramble_body', 20, 12, 1.8, 'h');  // upper-right junction
disk('bramble_body', 9,  21, 1.8, 's');  // lower-left junction

// ============================ BRAMBLE_THORNS (bone spikes bristling off stems) ============================
// Short 2-3px pointed spikes spaced along the stems. Drawn as short lines from stem
// edge outward; bone palette. Irregular spacing for organic feel.

const thornPositions = [
  // [root x, root y, tip x, tip y]  — 2-3px spikes jutting perpendicular to stem direction
  // Along stem 1 (roughly horizontal):
  [6,  15, 5,  12],   // left end, upward spike
  [10, 16, 9,  13],   // spike up
  [13, 15, 12, 12],
  [17, 14, 18, 11],
  [21, 13, 22, 10],
  [25, 13, 27, 11],
  [7,  17, 6,  20],   // downward spikes along stem 1
  [12, 16, 11, 19],
  [19, 14, 20, 17],
  [24, 14, 25, 17],
  // Along stem 2 (steep diagonal):
  [8,  9,  5,  8],
  [10, 12, 7,  11],
  [14, 17, 11, 16],
  [17, 21, 14, 20],
  [20, 25, 17, 26],
  // Along stem 3 (top-right to bottom-left):
  [23, 7,  25, 5],
  [19, 12, 22, 11],
  [15, 18, 18, 17],
  [11, 22, 14, 21],
  // Along stem 5 (upper right):
  [20, 7,  22, 5],
  [23, 10, 25, 8],
  [26, 14, 28, 12],
];

for (const [rx, ry, tx, ty] of thornPositions) {
  put('bramble_thorns', rx, ry, 'b');      // thorn root (thicker base)
  line('bramble_thorns', rx, ry, tx, ty, 'o');  // thorn shaft + sharp tip
}

// ============================ BRAMBLE_EYES (glowing eyes nestled in tangle center) ============================
// Two small menacing eyes peeking from between stems near the crossing cluster.

put('bramble_eyes', 11, 14, 'b');
put('bramble_eyes', 12, 14, 'h');   // left eye
put('bramble_eyes', 16, 13, 'b');
put('bramble_eyes', 17, 13, 'h');   // right eye

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

emit('bramble_body');
emit('bramble_thorns');
emit('bramble_eyes');
