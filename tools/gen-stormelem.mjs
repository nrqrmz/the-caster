// Elemental de Tormenta (nv6 setpiece boss) — storm-cloud elemental.
// A roiling CÚMULO (cumulus cluster): organic rounded puffs, transparent corners,
// THREE menacing eyes, and idle lightning animation crackling through the cloud.
// Parts emitted:
//   storm_body  — organic cloud cluster: wide rounded puffs, transparent corners
//                 (at 128×128 display each grid pixel is 4×4 — square, uniform)
//   storm_bolts — jagged lightning veins (4 animated idle frames, different crackle positions)
//   storm_eyes  — THREE glaring eyes across the cloud (left/center/right puffs)
//
// Run: node tools/gen-stormelem.mjs

const N = 32, cx = 16;

// We need separate layers per bolt frame + static body/eyes
const body = {};
const eyes = {};
const bolts = [
  {}, // frame 0 (static fallback)
  {}, // frame 1
  {}, // frame 2
  {}, // frame 3
];

const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) L[`${x},${y}`] = r; };

function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function disk(L, cx0, cy0, r, role) {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
}
// blob: ellipse with rim auto-shading; outer ring → 'o', upper-left → 'h', lower-right → 's', center 'b'.
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.80) r = 'o';
      else if ((x - cx0) / rx + (y - cy0) / ry < -0.55) r = 'h';
      else if ((x - cx0) / rx + (y - cy0) / ry > 0.60) r = 's';
      put(L, x, y, r);
    }
}

// ============================ STORM_BODY (organic cloud cluster — TRANSPARENT corners) ============================
// Strategy: overlapping rounded puffs that form a wide cloud shape but leave corners empty.
// The cloud occupies roughly the middle 24×28 of the 32×32 grid, with puff bumps poking higher.
// Upper: three main puffs (left/center/right billow tops) — tallest center, flanked by two side puffs.
// Middle: broad body connecting all three puffs.
// Lower: wide rounded underside that tapers at sides (NOT filling bottom corners).
// Colors: 'b'=dark storm body (baseColor 0x37474f), 'o'=rim, 'h'=highlight (upper puff tops), 's'=shade pockets.

// ---- LEFT PUFF (left billow, centered ~x=9) ----
blob(body,  9,  9, 6.5, 5.5);   // main left puff
blob(body,  7,  6, 4,   3.5);   // left puff crown
blob(body,  11, 5, 3.5, 3);     // inner-left upper crown
blob(body,  5,  12, 4,  3.5);   // left puff lower lobe
blob(body,  4,  8, 3,  2.5);    // far-left small crown

// ---- CENTER PUFF (tallest billow, centered ~x=16) ----
blob(body,  16, 7, 7,   6);     // main center puff (tall)
blob(body,  16, 4, 4.5, 3.5);   // center crown (reaches y=0)
blob(body,  13, 5, 3.5, 3);     // left-center crown
blob(body,  19, 5, 3.5, 3);     // right-center crown
blob(body,  16, 11, 7, 4.5);    // center-lower lobe

// ---- RIGHT PUFF (right billow, centered ~x=23) ----
blob(body,  23, 9, 6.5, 5.5);   // main right puff
blob(body,  25, 6, 4,   3.5);   // right puff crown
blob(body,  21, 5, 3.5, 3);     // inner-right upper crown
blob(body,  27, 12, 4,  3.5);   // right puff lower lobe
blob(body,  28, 8, 3,  2.5);    // far-right small crown

// ---- BROAD BODY — connects all three puffs, forms main mass ----
blob(body,  16, 16, 12, 7.5);   // central wide body
blob(body,  9,  15, 6,  5);     // left body connect
blob(body,  23, 15, 6,  5);     // right body connect
blob(body,  16, 20, 10, 5.5);   // wide mid-belly
blob(body,  10, 20, 5,  4);     // left belly
blob(body,  22, 20, 5,  4);     // right belly

// ---- ROUNDED UNDERSIDE (organic, tapers at sides — NOT filling corners) ----
blob(body,  16, 24, 9.5, 4.5);  // center underbelly (wide)
blob(body,  10, 24, 5,  3.5);   // left underbelly lobe
blob(body,  22, 24, 5,  3.5);   // right underbelly lobe
blob(body,  16, 27, 7.5, 3.5);  // lower center (tapering)

// ---- SHADE POCKETS (dark turbulence) ----
blob(body,  12, 17, 3.5, 2.5, 's');
blob(body,  20, 17, 3,   2.5, 's');
blob(body,  16, 21, 4,   2.5, 's');
blob(body,  8,  15, 2.5, 2,   's');
blob(body,  24, 15, 2.5, 2,   's');
blob(body,  16, 25, 3,   2,   's');

// ---- UPPER HIGHLIGHTS on puff tops ----
disk(body,  9,  4,  2.5, 'h');   // left puff highlight
disk(body,  16, 1.5, 3,  'h');   // center puff top highlight
disk(body,  23, 4,  2.5, 'h');   // right puff highlight
disk(body,  7,  7,  1.5, 'h');   // far-left crown highlight
disk(body,  25, 7,  1.5, 'h');   // far-right crown highlight
disk(body,  13, 3,  1.5, 'h');   // left-center crown
disk(body,  19, 3,  1.5, 'h');   // right-center crown

// ============================ STORM_EYES (THREE glaring eyes — one per puff) ============================
// Left eye: in left puff ~(8, 13)
// Center eye: in center puff ~(16, 12)
// Right eye: in right puff ~(24, 13)
// Each eye: bright `h`/`a` glow ring, `b` iris, `o` slit pupil (menacing).
// All THREE use glow palette.

function drawEye(L, ex, ey) {
  // Outer glow halo — 3px radius
  disk(L, ex, ey, 3.0, 'h');
  // Mid iris — 1.8px radius
  disk(L, ex, ey, 1.8, 'b');
  // Narrow vertical slit pupil
  for (let y = ey - 1; y <= ey + 1; y++) put(L, ex, y, 'o');
  put(L, ex - 1, ey, 'o');
  put(L, ex + 1, ey, 'o');
  // Upper eyelid shadow (heavy-lidded glare)
  for (let x = ex - 2; x <= ex + 2; x++) put(L, x, ey - 2, 'b');
  // Inner glow flanks
  put(L, ex - 1, ey - 1, 'h');
  put(L, ex + 1, ey - 1, 'h');
}

drawEye(eyes, 8,  13);   // left eye (in left puff)
drawEye(eyes, 16, 12);   // center eye (in center puff, slightly higher)
drawEye(eyes, 24, 13);   // right eye (in right puff)

// ============================ STORM_BOLTS (4 animated frames — lightning crackles through the cloud) ============================
// Palette: wispglow (electric yellow). Roles: 'h' = bright channel, 'a' = glow fringe.
// Each frame has the same STRUCTURE (main + flanking bolts) but different ZIG positions
// so the lightning appears to flow/crackle per frame.
// Static down/up/side = frame 0.

// Helper: draw a bolt along a path (array of [x,y] waypoints)
function drawBolt(L, path, fringe = true) {
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1];
    line(L, x0, y0, x1, y1, 'h');
    if (fringe) {
      line(L, x0 - 1, y0, x1 - 1, y1, 'a');
      line(L, x0 + 1, y0, x1 + 1, y1, 'a');
    }
  }
}

// FRAME 0 — baseline crackle positions
{
  const L = bolts[0];
  // Central bolt: top-center zigzags down through body
  drawBolt(L, [
    [16, 5], [18, 8], [14, 11], [17, 14], [13, 17], [16, 20], [14, 23], [16, 27],
  ]);
  // Left bolt
  drawBolt(L, [
    [8, 8], [6, 11], [9, 14], [6, 17], [8, 21], [5, 25],
  ]);
  // Right bolt
  drawBolt(L, [
    [24, 8], [26, 11], [23, 14], [26, 17], [24, 21], [27, 25],
  ]);
  // Short inner-left branch
  drawBolt(L, [
    [12, 11], [10, 14], [13, 17], [11, 20],
  ], false);
  // Flare tips
  put(L, 15, 27, 'h'); put(L, 17, 27, 'h');
  put(L, 4,  25, 'h'); put(L, 5,  26, 'a');
  put(L, 27, 25, 'h'); put(L, 28, 26, 'a');
}

// FRAME 1 — bolts shift right (crackle moves right side active)
{
  const L = bolts[1];
  // Central bolt shifts slightly right, different kinks
  drawBolt(L, [
    [17, 5], [15, 8], [19, 11], [16, 14], [20, 17], [17, 20], [19, 23], [17, 27],
  ]);
  // Left bolt dimmer path
  drawBolt(L, [
    [8, 9], [10, 12], [7, 15], [9, 18], [7, 22], [9, 25],
  ]);
  // Right bolt brighter/stronger
  drawBolt(L, [
    [24, 7], [27, 10], [24, 13], [27, 16], [25, 19], [28, 23], [26, 26],
  ]);
  // Short inner-right branch active
  drawBolt(L, [
    [20, 11], [22, 14], [19, 17], [21, 20],
  ], false);
  // Flare tips
  put(L, 16, 27, 'h'); put(L, 18, 27, 'h');
  put(L, 8,  25, 'h'); put(L, 9,  26, 'a');
  put(L, 26, 26, 'h'); put(L, 27, 27, 'a');
}

// FRAME 2 — bolts shift left (left side active, center shorter)
{
  const L = bolts[2];
  // Central bolt leans left
  drawBolt(L, [
    [15, 5], [13, 8], [16, 11], [13, 14], [15, 17], [13, 20], [15, 23], [14, 27],
  ]);
  // Left bolt wide/strong
  drawBolt(L, [
    [9, 7], [6, 10], [9, 13], [5, 16], [8, 19], [5, 22], [7, 26],
  ]);
  // Right bolt shorter
  drawBolt(L, [
    [23, 9], [25, 12], [22, 15], [24, 18], [23, 22], [25, 25],
  ]);
  // Short inner-left branch active
  drawBolt(L, [
    [11, 10], [9,  13], [12, 16], [10, 19],
  ], false);
  // Flare tips
  put(L, 13, 27, 'h'); put(L, 15, 27, 'h');
  put(L, 6,  26, 'h'); put(L, 7,  27, 'a');
  put(L, 25, 25, 'h'); put(L, 26, 26, 'a');
}

// FRAME 3 — wide spread, all three bolts active simultaneously, new kinks
{
  const L = bolts[3];
  // Central bolt new kink pattern
  drawBolt(L, [
    [16, 4], [19, 8], [15, 12], [18, 15], [14, 18], [17, 21], [15, 24], [17, 27],
  ]);
  // Left bolt medium
  drawBolt(L, [
    [8, 8], [5, 11], [8, 14], [5, 17], [7, 20], [4, 24], [6, 27],
  ]);
  // Right bolt medium
  drawBolt(L, [
    [24, 8], [27, 11], [24, 14], [27, 17], [25, 20], [28, 24], [26, 27],
  ]);
  // Center horizontal flicker (unique to frame 3)
  drawBolt(L, [
    [12, 15], [14, 15], [16, 14], [18, 15], [20, 15],
  ], false);
  // Flare tips
  put(L, 16, 27, 'h'); put(L, 18, 27, 'h');
  put(L, 5,  27, 'h'); put(L, 6,  28, 'a');
  put(L, 27, 27, 'h'); put(L, 28, 28, 'a');
}

// ============================ emit helpers ============================
function layerToRows(L) {
  const keys = Object.keys(L);
  if (!keys.length) return null;
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) {
    let row = '';
    for (let x = minx; x <= maxx; x++) row += L[`${x},${y}`] ?? '.';
    rows.push(row);
  }
  return { rows, minx, maxx, miny, maxy, w: maxx - minx + 1, h: maxy - miny + 1 };
}

function emitStatic(name, L) {
  const info = layerToRows(L);
  if (!info) { console.log(`// ${name} EMPTY`); return; }
  const { rows, minx, miny, w, h } = info;
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${w}, h: ${h}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}

function emitAnimatedBolts() {
  const infos = bolts.map(layerToRows);
  // Use frame 0 geometry for the anchor/dims (static fallback)
  const { minx, miny, w, h } = infos[0];
  const staticBlock = `[\n${infos[0].rows.map(r => `      '${r}',`).join('\n')}\n    ]`;

  // Build per-direction anim frame arrays (all dirs identical — cloud is symmetric)
  function frameBlock(info) {
    return `[\n${info.rows.map(r => `        '${r}',`).join('\n')}\n      ]`;
  }
  const framesStr = infos.map(frameBlock).join(', ');
  const animDir = `[ ${framesStr} ]`;

  console.log(`  storm_bolts: {`);
  console.log(`    res: 32, w: ${w}, h: ${h}, anchor: { x: ${minx}, y: ${miny} },`);
  console.log(`    down: ${staticBlock}, up: ${staticBlock}, side: ${staticBlock},`);
  console.log(`    anim: {`);
  console.log(`      idle: { down: ${animDir}, up: ${animDir}, side: ${animDir} },`);
  console.log(`    },`);
  console.log(`  },`);
}

emitStatic('storm_body', body);
emitAnimatedBolts();
emitStatic('storm_eyes', eyes);
