// Whirlwind silhouette — 32-grid.
// Serves: torbellino_errante (spinning wind vortex hazard, size 32, grey-blue 0xb0bec5).
//
// Parts authored:
//   whirl_body — UNMISTAKABLE SPIRAL CYCLONE.
//                Classic cartoon tornado: a funnel silhouette (wide at top, tip at bottom)
//                with 4 bold SWEPT CURVED BANDS winding around it. Each band is a thick
//                diagonal arc that sweeps from one side of the funnel to the other as it
//                descends, alternating direction (L→R, R→L, L→R, R→L).
//                Clear gaps between bands expose the interior and make the spiral obvious.
//                Roles: 'h' leading/highlight edge of each band, 'b' body, 's' trailing shade.
//                Funnel outer edge: 'o'. Debris specks at top: 'h'.
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

// ============================ WHIRL_BODY (spiral cyclone) ============================
//
// FUNNEL: top y=1, bottom y=29, max half-width 13, narrows to 0.
// SPIRAL BANDS: 4 stacked, alternating sweep direction.
// Each band occupies 5 rows. Gap of 2 rows between bands.
// Within each band, the center x follows a diagonal arc from one side to the other.
// Band thickness grows wider near leading edge (h) and narrows at trailing edge (s).

const TOP_Y  = 1;
const BOT_Y  = 29;
const TOP_HW = 13;

// Funnel half-width at y
const hw = y => {
  if (y <= TOP_Y) return TOP_HW;
  if (y >= BOT_Y) return 0;
  return Math.round(TOP_HW * (1 - (y - TOP_Y) / (BOT_Y - TOP_Y)));
};

// Clamp x within funnel at y
const clampX = (x, y) => {
  const h = hw(y);
  return Math.max(cx - h, Math.min(cx + h, x));
};

// Draw a single spiral band.
// yStart, yEnd: row range
// leftToRight: if true, band sweeps left→right (arc starts on left side at yStart, ends right at yEnd)
// Returns the center column of the sweep: cx + sweep(t)
// sweep(t) = lerp from -hw(yStart)*0.6 to +hw(yEnd)*0.6 (or reversed)
function drawBand(yStart, yEnd, leftToRight) {
  const h0 = hw(yStart), hN = hw(yEnd);
  const from = leftToRight ? -h0 * 0.65 : +h0 * 0.65;
  const to   = leftToRight ? +hN * 0.65 : -hN * 0.65;

  for (let y = yStart; y <= yEnd; y++) {
    const h = hw(y);
    if (h <= 0) continue;

    const t = (yEnd > yStart) ? (y - yStart) / (yEnd - yStart) : 0;
    // Center of this band row
    const bandCx = Math.round(cx + from + (to - from) * t);

    // Band width at this row: thicker at top of band, thinner at bottom (tapers with funnel)
    const bw = Math.max(1, Math.round(h * 0.55 * (1 - t * 0.3)));

    // Fill band
    const xL = Math.max(cx - h, bandCx - bw);
    const xR = Math.min(cx + h, bandCx + bw);

    for (let x = xL; x <= xR; x++) {
      const relDist = (x - bandCx) / (bw || 1);  // -1..+1 within band
      // Leading edge = direction of sweep:
      //   leftToRight → leading edge is on the RIGHT side of band (high x)
      //   rightToLeft → leading edge is on the LEFT side (low x)
      const towardLeading = leftToRight ? relDist : -relDist;  // +1 = leading

      let role;
      const isEdge = (x === cx - h || x === cx + h);
      if (isEdge) {
        role = 'o';
      } else if (towardLeading >= 0.55) {
        role = 'h';  // leading highlight
      } else if (towardLeading <= -0.55) {
        role = 's';  // trailing shade
      } else {
        role = 'b';  // body
      }
      put('whirl_body', x, y, role);
    }
  }
}

// 4 Spiral bands — alternating directions creates the unmistakable spiral
// Band A  y=1..5   L→R  (enters top-left, exits mid-right)
// Band B  y=8..12  R→L  (enters right, sweeps left)
// Band C  y=15..19 L→R
// Band D  y=22..26 R→L
drawBand( 1,  5, true);
drawBand( 8, 12, false);
drawBand(15, 19, true);
drawBand(22, 26, false);

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
  [cx - 8,  -1 + 1], // shifted to y=0 (clamped)
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
