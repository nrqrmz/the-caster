// Elemental de Tormenta (air nv7 setpiece boss) — storm-cloud elemental.
// NATIVE 2:1 sprite: authored on a 64-wide × 32-tall grid (res:32 → f=1, 1:1 into
// the gridW=64 × gridH=32 canvas), displayed at 128×64 (uniform ×2 — square pixels).
// A roiling wide CÚMULO (cumulus cluster): organic rounded puffs, transparent corners,
// THREE menacing eyes spread across it, and an idle lightning animation crackling
// through the cloud.
// Parts emitted:
//   storm_body  — organic WIDE cloud cluster: rounded puffs, transparent corners
//   storm_bolts — jagged lightning veins (4 animated idle frames, different crackle positions)
//   storm_eyes  — THREE glaring eyes across the cloud (left/center/right puffs)
//
// Run: node tools/gen-stormelem.mjs

const W = 64, H = 32;

const body = {};
const eyes = {};
const bolts = [
  {}, // frame 0 (static fallback)
  {}, // frame 1
  {}, // frame 2
  {}, // frame 3
];

const put = (L, x, y, r) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) L[`${x},${y}`] = r; };

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

// ============================ STORM_BODY (WIDE organic cloud cluster — TRANSPARENT corners) ============================
// The cloud spans roughly the middle ~60 wide × ~28 tall of the 64×32 grid, with puff bumps
// poking higher and a rounded underside that tapers at the sides (corners stay empty).
// Three main billow puffs (left ~x=14, center ~x=32, right ~x=50) sit on a broad body mass.
// Colors: 'b'=dark storm body (baseColor 0x37474f), 'o'=rim, 'h'=highlight (upper puff tops), 's'=shade pockets.

// ---- LEFT PUFF (left billow, centered ~x=14) ----
blob(body, 14,  9, 11,   6);    // main left puff
blob(body, 10,  6,  6.5, 4);    // left puff crown
blob(body, 18,  5,  6,   3.5);  // inner-left upper crown
blob(body,  7, 12,  6,   4);    // left puff lower lobe
blob(body,  5,  9,  4.5, 3);    // far-left small crown

// ---- CENTER PUFF (tallest billow, centered ~x=32) ----
blob(body, 32,  7, 12,   6.5);  // main center puff (tall)
blob(body, 32,  4,  7.5, 4);    // center crown (reaches near top)
blob(body, 25,  5,  6,   3.5);  // left-center crown
blob(body, 39,  5,  6,   3.5);  // right-center crown
blob(body, 32, 11, 12,   5);    // center-lower lobe

// ---- RIGHT PUFF (right billow, centered ~x=50) ----
blob(body, 50,  9, 11,   6);    // main right puff
blob(body, 54,  6,  6.5, 4);    // right puff crown
blob(body, 46,  5,  6,   3.5);  // inner-right upper crown
blob(body, 57, 12,  6,   4);    // right puff lower lobe
blob(body, 59,  9,  4.5, 3);    // far-right small crown

// ---- BROAD BODY — connects all three puffs, forms main mass ----
blob(body, 32, 17, 23,   8);    // central wide body
blob(body, 16, 15, 11,   5.5);  // left body connect
blob(body, 48, 15, 11,   5.5);  // right body connect
blob(body, 32, 21, 20,   6);    // wide mid-belly
blob(body, 18, 21,  9,   4.5);  // left belly
blob(body, 46, 21,  9,   4.5);  // right belly

// ---- ROUNDED UNDERSIDE (organic, tapers at sides — NOT filling corners) ----
blob(body, 32, 25, 18,   5);    // center underbelly (wide)
blob(body, 18, 25,  9,   4);    // left underbelly lobe
blob(body, 46, 25,  9,   4);    // right underbelly lobe
blob(body, 32, 28, 14,   4);    // lower center (tapering)

// ---- SHADE POCKETS (dark turbulence) ----
blob(body, 22, 18, 6,   3, 's');
blob(body, 42, 18, 5.5, 3, 's');
blob(body, 32, 22, 7,   3, 's');
blob(body, 14, 16, 4.5, 2.5, 's');
blob(body, 50, 16, 4.5, 2.5, 's');
blob(body, 32, 27, 5,   2.5, 's');

// ---- UPPER HIGHLIGHTS on puff tops ----
disk(body, 14,  4, 4.5, 'h');   // left puff highlight
disk(body, 32,  2, 5,   'h');   // center puff top highlight
disk(body, 50,  4, 4.5, 'h');   // right puff highlight
disk(body, 10,  6, 2.5, 'h');   // far-left crown highlight
disk(body, 54,  6, 2.5, 'h');   // far-right crown highlight
disk(body, 25,  4, 2.5, 'h');   // left-center crown
disk(body, 39,  4, 2.5, 'h');   // right-center crown

// ============================ STORM_EYES (THREE glaring eyes — one per puff) ============================
function drawEye(L, ex, ey) {
  disk(L, ex, ey, 4.0, 'h');          // outer glow halo
  disk(L, ex, ey, 2.4, 'b');          // mid iris
  for (let y = ey - 2; y <= ey + 2; y++) put(L, ex, y, 'o');  // vertical slit pupil
  put(L, ex - 1, ey, 'o');
  put(L, ex + 1, ey, 'o');
  for (let x = ex - 3; x <= ex + 3; x++) put(L, x, ey - 3, 'b'); // heavy-lidded upper shadow
  put(L, ex - 2, ey - 1, 'h');         // inner glow flanks
  put(L, ex + 2, ey - 1, 'h');
}

drawEye(eyes, 14, 13);   // left eye (in left puff)
drawEye(eyes, 32, 12);   // center eye (in center puff, slightly higher)
drawEye(eyes, 50, 13);   // right eye (in right puff)

// ============================ STORM_BOLTS (4 animated frames — lightning crackles through the wide cloud) ============================
// Palette: wispglow (electric yellow). Roles: 'h' = bright channel, 'a' = glow fringe.
// Same STRUCTURE per frame (main + flanking bolts) but different ZIG positions so the
// lightning appears to flow/crackle across the wide cloud. Static down/up/side = frame 0.

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
  drawBolt(L, [[32, 5], [36, 9], [28, 13], [34, 17], [26, 21], [33, 25], [28, 28], [33, 30]]); // central
  drawBolt(L, [[14, 8], [10, 12], [16, 16], [10, 20], [15, 24], [9, 28]]);                      // left
  drawBolt(L, [[50, 8], [54, 12], [48, 16], [54, 20], [49, 24], [55, 28]]);                     // right
  drawBolt(L, [[22, 13], [18, 17], [24, 21], [20, 25]], false);                                  // inner-left branch
  put(L, 31, 30, 'h'); put(L, 33, 30, 'h');
  put(L,  8, 28, 'h'); put(L,  9, 29, 'a');
  put(L, 55, 28, 'h'); put(L, 56, 29, 'a');
}

// FRAME 1 — bolts shift right
{
  const L = bolts[1];
  drawBolt(L, [[34, 5], [30, 9], [38, 13], [32, 17], [40, 21], [33, 25], [38, 28], [34, 30]]);
  drawBolt(L, [[14, 9], [18, 13], [12, 17], [16, 21], [12, 25], [16, 29]]);
  drawBolt(L, [[50, 7], [56, 11], [50, 15], [56, 19], [52, 23], [57, 27], [53, 30]]);
  drawBolt(L, [[40, 13], [44, 17], [38, 21], [42, 25]], false);
  put(L, 33, 30, 'h'); put(L, 35, 30, 'h');
  put(L, 16, 29, 'h'); put(L, 17, 30, 'a');
  put(L, 53, 30, 'h'); put(L, 54, 31, 'a');
}

// FRAME 2 — bolts shift left
{
  const L = bolts[2];
  drawBolt(L, [[30, 5], [26, 9], [32, 13], [26, 17], [31, 21], [26, 25], [30, 28], [28, 30]]);
  drawBolt(L, [[16, 7], [10, 11], [16, 15], [9, 19], [15, 23], [9, 27], [13, 30]]);
  drawBolt(L, [[48, 9], [52, 13], [46, 17], [50, 21], [47, 25], [52, 28]]);
  drawBolt(L, [[22, 11], [18, 15], [24, 19], [20, 23]], false);
  put(L, 27, 30, 'h'); put(L, 29, 30, 'h');
  put(L, 10, 29, 'h'); put(L, 11, 30, 'a');
  put(L, 50, 28, 'h'); put(L, 51, 29, 'a');
}

// FRAME 3 — wide spread, all three bolts active, new kinks + horizontal flicker
{
  const L = bolts[3];
  drawBolt(L, [[32, 4], [38, 9], [30, 14], [36, 18], [28, 22], [34, 26], [30, 29], [34, 31]]);
  drawBolt(L, [[14, 8], [9, 12], [15, 16], [9, 20], [14, 24], [8, 28], [12, 31]]);
  drawBolt(L, [[50, 8], [55, 12], [49, 16], [55, 20], [51, 24], [56, 28], [52, 31]]);
  drawBolt(L, [[24, 18], [28, 18], [32, 17], [36, 18], [40, 18]], false); // horizontal flicker
  put(L, 32, 31, 'h'); put(L, 34, 31, 'h');
  put(L,  9, 31, 'h'); put(L, 10, 31, 'a');
  put(L, 55, 31, 'h'); put(L, 56, 31, 'a');
}

// ============================ emit helpers ============================
// Emit at a FIXED 64×32 frame (no bbox crop) with anchor (0,0) so all parts share the
// canvas origin and align across animation frames. f=1 (res:32), so 1:1 into the grid.
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

function emitAnimatedBolts() {
  const framesRows = bolts.map(layerToFixedRows);
  const staticBlock = `[\n${framesRows[0].map(r => `      '${r}',`).join('\n')}\n    ]`;
  function frameBlock(rows) { return `[\n${rows.map(r => `        '${r}',`).join('\n')}\n      ]`; }
  const animDir = `[ ${framesRows.map(frameBlock).join(', ')} ]`;
  console.log(`  storm_bolts: {`);
  console.log(`    res: 32, w: ${W}, h: ${H}, anchor: { x: 0, y: 0 },`);
  console.log(`    down: ${staticBlock}, up: ${staticBlock}, side: ${staticBlock},`);
  console.log(`    anim: {`);
  console.log(`      idle: { down: ${animDir}, up: ${animDir}, side: ${animDir} },`);
  console.log(`    },`);
  console.log(`  },`);
}

emitStatic('storm_body', body);
emitAnimatedBolts();
emitStatic('storm_eyes', eyes);
