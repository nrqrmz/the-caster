// Whirlwind silhouette — 32-grid.
// Serves: torbellino_errante (spinning wind vortex hazard, size 32, grey-blue 0xb0bec5).
//
// Parts authored:
//   whirl_body — 2-3 swept spiral arcs forming a funnel/cyclone shape.
//                Mostly 'b'/'h' fill with 'o' outer edges; faint hollow center.
//                Drawn as a narrowing funnel: wide at top, pinched at bottom.
//                Three spiral arms curve inward, suggesting rotation.
// Run: node tools/gen-whirlwind.mjs

const N = 32, cx = 16;
const layers = {
  whirl_body: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// ============================ WHIRL_BODY (cyclone / vortex) ============================
// A funnel-shaped vortex: wide at the top, narrowing to a point at the bottom.
// Three swept spiral arcs give the sense of rotation.
//
// Strategy:
//   - Draw a funnel outline (two converging side lines) to establish the overall shape
//   - Fill the interior with swept arcs that taper as they descend
//   - Hollow center (don't fill the very middle of each row)
//   - Use 'h' near top/edges (lighter — outer gust), 'b' in bulk, 'o' on true outline

// Funnel dimensions: top at y=2 (wide), tip at y=28 (narrow center point)
const TOP_Y    = 2;
const BOT_Y    = 28;
const TOP_HALF = 13;  // half-width at top row
const BOT_HALF = 0;   // half-width at tip

// Draw the funnel body row by row (tapered, hollow center)
for (let y = TOP_Y; y <= BOT_Y; y++) {
  const frac = (y - TOP_Y) / (BOT_Y - TOP_Y);
  const half = Math.round(TOP_HALF * (1 - frac));      // current half-width
  const hollowR = Math.max(0, Math.round(half * 0.35)); // hollow center radius

  if (half === 0) {
    // Tip: single pixel
    put('whirl_body', cx, y, 'o');
    continue;
  }

  for (let x = cx - half; x <= cx + half; x++) {
    const dist = Math.abs(x - cx);
    if (dist < hollowR) continue;   // skip hollow center

    let role;
    if (dist >= half)             role = 'o';    // outer edge
    else if (dist >= half - 1)    role = 'b';    // near-outer
    else if (frac < 0.25)         role = 'h';    // upper funnel = lighter
    else                          role = 'b';    // bulk

    put('whirl_body', x, y, role);
  }
}

// Three swept spiral arc lines — rotate inward as they descend
// Arc 1: starts at left outer edge (top) and curves to right-center (mid)
const arc1 = [
  [cx - 13, 2],  [cx - 12, 4],  [cx - 9,  6],  [cx - 6,  8],
  [cx - 3,  10], [cx,      12], [cx + 3,  14], [cx + 4, 16],
];
for (let i = 0; i < arc1.length - 1; i++) {
  const [x0, y0] = arc1[i], [x1, y1] = arc1[i + 1];
  line('whirl_body', x0, y0, x1, y1, 'h');
}
// Arc 2: starts at right outer edge (slightly lower) and curves inward
const arc2 = [
  [cx + 11, 5],  [cx + 9,  7],  [cx + 6,  9],  [cx + 3,  11],
  [cx,      13], [cx - 3,  15], [cx - 2,  18],
];
for (let i = 0; i < arc2.length - 1; i++) {
  const [x0, y0] = arc2[i], [x1, y1] = arc2[i + 1];
  line('whirl_body', x0, y0, x1, y1, 'b');
}
// Arc 3: a third sweeping curl toward the vortex center (lower section)
const arc3 = [
  [cx - 8,  14], [cx - 5,  16], [cx - 2,  18],
  [cx + 1,  20], [cx + 2,  22], [cx,      24],
];
for (let i = 0; i < arc3.length - 1; i++) {
  const [x0, y0] = arc3[i], [x1, y1] = arc3[i + 1];
  line('whirl_body', x0, y0, x1, y1, 'b');
}

// Redraw outer funnel edges as 'o' to clean up the silhouette
for (let y = TOP_Y; y <= BOT_Y; y++) {
  const frac = (y - TOP_Y) / (BOT_Y - TOP_Y);
  const half = Math.round(TOP_HALF * (1 - frac));
  if (half > 0) {
    put('whirl_body', cx - half, y, 'o');
    put('whirl_body', cx + half, y, 'o');
  }
}

// Tip pixel
put('whirl_body', cx, BOT_Y, 'o');

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

emit('whirl_body');
