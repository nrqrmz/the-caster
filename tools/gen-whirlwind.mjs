// Whirlwind silhouette — 32-grid.
// Serves: torbellino_errante (spinning wind vortex hazard, size 32, grey-blue 0xb0bec5).
//
// Parts authored:
//   whirl_body — PARALLEL SAME-DIRECTION BANDS.
//                Classic cartoon tornado: a funnel silhouette (wide at top, tip at bottom)
//                with 4 bold SWEPT BANDS all going in the SAME direction (left→right),
//                so the implied rotation is consistent — NOT alternating/convergent.
//                Each band is a thick diagonal stripe that starts near the left funnel wall
//                and exits near the right. All bands share the same slope (parallel).
//                Clear gaps between bands expose the interior.
//                Roles: 'h' leading/highlight edge, 'b' body, 's' trailing shade, 'o' outer edge.
//                Debris specks at top/sides: 'h'.
// Run: node tools/gen-whirlwind.mjs

const N = 32, cx = 16;
const layers = { whirl_body: {} };
const put = (L, x, y, r) => {
  if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r;
};

// Bresenham line
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    put(L, x, y, r);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx)  { err += dx; y += sy; }
  }
}

// ============================ WHIRL_BODY (parallel same-direction bands) ============================
//
// FUNNEL: top y=1, bottom y=29, max half-width 13, narrows to 0.
// ALL BANDS sweep the SAME direction: left-wall → right-wall (L→R), parallel to each other.
// This means all bands have the SAME slope — they all enter from the LEFT side of the funnel
// at the top of their row range and exit on the RIGHT side at the bottom.
// 4 stacked bands, each 5 rows tall, with 2-row gaps between them.
// Leading edge (direction of motion = right side of band) = 'h', trailing (left) = 's'.

const TOP_Y  = 1;
const BOT_Y  = 29;
const TOP_HW = 13;

// Funnel half-width at y
const hw = y => {
  if (y <= TOP_Y) return TOP_HW;
  if (y >= BOT_Y) return 0;
  return Math.round(TOP_HW * (1 - (y - TOP_Y) / (BOT_Y - TOP_Y)));
};

// Draw a single parallel band.
// All bands sweep L→R: at yStart, band center is near the left wall; at yEnd, near the right wall.
// The SLOPE is fixed: offset goes from -hw(yTop)*0.65 to +hw(yBottom)*0.65 over 5 rows.
// yTop/yBottom are the funnel-width reference points for computing the slope.
// By using consistent yTop/yBottom deltas (same dy) for ALL bands, all bands are PARALLEL.
function drawBand(yStart, yEnd) {
  const h0 = hw(yStart), hN = hw(yEnd);
  // ALL bands: start offset = -h * 0.65 (left side), end offset = +h * 0.65 (right side)
  const from = -h0 * 0.65;
  const to   = +hN * 0.65;

  for (let y = yStart; y <= yEnd; y++) {
    const h = hw(y);
    if (h <= 0) continue;

    const t = (yEnd > yStart) ? (y - yStart) / (yEnd - yStart) : 0;
    // Center of this band row — sweeps L→R
    const bandCx = Math.round(cx + from + (to - from) * t);

    // Band width: thicker near top of band, tapers with funnel toward bottom
    const bw = Math.max(1, Math.round(h * 0.55 * (1 - t * 0.3)));

    // Fill band within funnel
    const xL = Math.max(cx - h, bandCx - bw);
    const xR = Math.min(cx + h, bandCx + bw);

    for (let x = xL; x <= xR; x++) {
      const relDist = (x - bandCx) / (bw || 1);  // -1 (left/trailing) .. +1 (right/leading)
      // Leading edge = RIGHT side (L→R sweep), so towardLeading = relDist
      const towardLeading = relDist;

      let role;
      const isEdge = (x === cx - h || x === cx + h);
      if (isEdge) {
        role = 'o';
      } else if (towardLeading >= 0.55) {
        role = 'h';  // leading highlight (right edge of band)
      } else if (towardLeading <= -0.55) {
        role = 's';  // trailing shade (left edge of band)
      } else {
        role = 'b';  // body
      }
      put('whirl_body', x, y, role);
    }
  }
}

// 4 Parallel bands — ALL sweep L→R (same direction, same slope, parallel)
// Band A  y=1..5
// Band B  y=8..12
// Band C  y=15..19
// Band D  y=22..26
drawBand( 1,  5);
drawBand( 8, 12);
drawBand(15, 19);
drawBand(22, 26);

// ==== Funnel silhouette edges ====
// Always mark the outer funnel boundary as 'o'
for (let y = TOP_Y; y <= BOT_Y; y++) {
  const h = hw(y);
  if (h > 0) {
    put('whirl_body', cx - h, y, 'o');
    put('whirl_body', cx + h, y, 'o');
  }
}
// Tip
put('whirl_body', cx, BOT_Y, 'o');

// ==== Debris / wind specks ====
// A handful of 'h' pixels just outside the funnel top and sides
const debris = [
  // Top scatter
  [cx - 14,  0], [cx + 14,  0],
  [cx - 8,  0], // y=0 (clamped from -1)
  // Mid scatter — flung outward
  [cx - 14,  6], [cx + 14,  6],
  [cx - 13,  13], [cx + 11,  13],
];
for (const [x, y] of debris) {
  if (x >= 0 && x < N && y >= 0 && y < N && !layers.whirl_body[`${x},${y}`]) {
    put('whirl_body', x, y, 'h');
  }
}

// ============================ emit ============================
function emit(name) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) {
    let row = '';
    for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.';
    rows.push(row);
  }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}

emit('whirl_body');
