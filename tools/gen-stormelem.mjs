// Elemental de Tormenta (nv6 setpiece boss) — storm-cloud elemental.
// A roiling black cumulonimbus with lightning veins and a single glaring eye.
// Parts emitted:
//   storm_body  — big lumpy dark storm cloud, fills full 32×32 grid edge-to-edge
//                 (at 128×64 display each grid pixel is 4w×2h — broad horizontal mass)
//   storm_bolts — jagged lightning veins spanning the wide cloud
//   storm_eye   — one menacing glaring eye at the cloud center (sentient elemental)
//
// Run: node tools/gen-stormelem.mjs
const N = 32, cx = 16;
const layers = {
  storm_body: {}, storm_bolts: {}, storm_eye: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

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

// ============================ STORM_BODY (roiling cumulonimbus — fills full 32×32) ============================
// Strategy: spread blobs to reach x=0..31, y=0..31 — at 128×64 display this reads as a wide cumulonimbus.
// Upper part: billowing rounded turrets spanning the full width.
// Middle: very broad main body.
// Lower: wide flat anvil base reaching all four corners.
// Color roles: 'b'=dark storm body, 'o'=rim/outline, 'h'=upper-billow highlights, 's'=shade pockets.

// ---- MAIN CLOUD BODY (extra-wide mid section, covers full x range) ----
blob('storm_body', cx,      18, 15, 9);      // central bulk — full width + deep
blob('storm_body', 4,       15, 7,  6);      // far-left upper lobe (reaches x=0)
blob('storm_body', 28,      15, 7,  6);      // far-right upper lobe (reaches x=31)
blob('storm_body', cx - 5,  14, 7,  5.5);   // left-center upper lobe
blob('storm_body', cx + 5,  14, 7,  5.5);   // right-center upper lobe

// ---- UPPER BILLOWING TURRETS (wide spread, reach near edges) ----
blob('storm_body', cx,      6,  7,   5.5);  // top-center billow (tallest)
blob('storm_body', 4,       8,  5,   4.5);  // far-left billow (x touches 0)
blob('storm_body', 28,      8,  5,   4.5);  // far-right billow (x touches 31)
blob('storm_body', cx - 7,  9,  5,   4);    // left secondary billow
blob('storm_body', cx + 7,  9,  5,   4);    // right secondary billow
blob('storm_body', 2,       5,  3.5, 3.5);  // far-left crown puff (y=1..9, x=0..5)
blob('storm_body', 30,      5,  3.5, 3.5);  // far-right crown puff
blob('storm_body', cx - 3,  4,  3.5, 3);   // left-center crown
blob('storm_body', cx + 3,  4,  3.5, 3);   // right-center crown
// Top-edge spires — fill y=0 strip
for (let x = 0; x < N; x++) {
  // Push a few pixels to y=0 at various x positions to guarantee top-row coverage
  if (x < 6 || (x >= 10 && x <= 14) || x === cx || (x >= 18 && x <= 22) || x > 25) {
    if (!layers.storm_body[`${x},0`]) put('storm_body', x, 0, 'h');
    if (!layers.storm_body[`${x},1`]) put('storm_body', x, 1, 'h');
  }
}

// ---- ANVIL / FLAT BASE (cumulonimbus shelf — fills full width at bottom) ----
// Far side overhangs reach x=0 and x=31
blob('storm_body', 3,       24, 5.5, 4);    // far-left underhang
blob('storm_body', 29,      24, 5.5, 4);    // far-right underhang
blob('storm_body', cx - 7,  23, 5,   3.5);  // left-center underhang
blob('storm_body', cx + 7,  23, 5,   3.5);  // right-center underhang
// Flat underbelly connecting everything — full-width horizontal strip
for (let y = 23; y <= 31; y++) {
  // Wide base that reaches x=0..31 at the bottom rows
  const halfBase = 16 - (y - 23) * 0.25;   // barely tapers
  const Lx = Math.max(0, Math.round(cx - halfBase));
  const Rx = Math.min(31, Math.round(cx + halfBase));
  for (let x = Lx; x <= Rx; x++) {
    if (!layers.storm_body[`${x},${y}`]) {
      const edge = (x === Lx || x === Rx);
      put('storm_body', x, y, edge ? 'o' : 's');
    }
  }
}
// Bottom row fill — ensure y=31 is fully covered edge-to-edge
for (let x = 0; x < N; x++) {
  if (!layers.storm_body[`${x},31`]) put('storm_body', x, 31, 's');
  if (!layers.storm_body[`${x},30`]) put('storm_body', x, 30, 's');
}
// Fill any remaining gaps at x=0 and x=31 columns mid-body
for (let y = 5; y <= 28; y++) {
  if (!layers.storm_body[`0,${y}`])  put('storm_body', 0,  y, 'o');
  if (!layers.storm_body[`31,${y}`]) put('storm_body', 31, y, 'o');
}

// ---- SHADE POCKETS (turbulent inner darkness) ----
blob('storm_body', cx - 3, 19, 4,   3,   's');
blob('storm_body', cx + 4, 20, 3.5, 2.5, 's');
blob('storm_body', cx - 5, 15, 3,   2.5, 's');
blob('storm_body', 5,       18, 3,   2.5, 's');  // far-left pocket
blob('storm_body', 27,      18, 3,   2.5, 's');  // far-right pocket

// ---- UPPER HIGHLIGHTS on top billows (catch-light on rounded cloud tops) ----
for (const [bx, by, r] of [
  [cx,     2,  2.5],  // top of center turret
  [cx - 1, 3,  1.5],
  [cx + 1, 3,  1.5],
  [4,      3,  2],    // far-left billow crown
  [28,     3,  2],    // far-right billow crown
  [cx - 7, 6,  1.5],  // left billow crown
  [cx + 7, 6,  1.5],  // right billow crown
  [cx - 3, 2,  1.5],  // left puff crown
  [cx + 3, 2,  1.5],  // right puff crown
  [2,      2,  1.2],  // far-left corner puff top
  [30,     2,  1.2],  // far-right corner puff top
]) {
  disk('storm_body', bx, by, r, 'h');
}

// ============================ STORM_BOLTS (jagged lightning veins — span full width) ============================
// Four distinct lightning bolts zig-zagging across the wide mass.
// Using roles: 'h' (bright electric) for the main channel, 'a' (accent) for glow fringe.

// ---- Bolt 1: main central bolt — top-center down to lower-center ----
const bolt1 = [
  [cx, 5], [cx + 2, 8], [cx - 2, 11], [cx + 3, 14], [cx - 2, 17], [cx + 1, 20], [cx - 1, 24], [cx, 28],
];
for (let i = 0; i < bolt1.length - 1; i++) {
  const [x0, y0] = bolt1[i], [x1, y1] = bolt1[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 - 1, y0, x1 - 1, y1, 'a');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Bolt 2: left bolt — wide left flank ----
const bolt2 = [
  [5, 7], [4, 10], [6, 13], [3, 16], [5, 20], [2, 25],
];
for (let i = 0; i < bolt2.length - 1; i++) {
  const [x0, y0] = bolt2[i], [x1, y1] = bolt2[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 - 1, y0, x1 - 1, y1, 'a');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Bolt 3: right bolt — wide right flank ----
const bolt3 = [
  [27, 7], [28, 10], [26, 13], [29, 16], [27, 20], [30, 25],
];
for (let i = 0; i < bolt3.length - 1; i++) {
  const [x0, y0] = bolt3[i], [x1, y1] = bolt3[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 - 1, y0, x1 - 1, y1, 'a');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Bolt 4: left-of-center short bolt ----
const bolt4 = [
  [cx - 7, 9], [cx - 6, 12], [cx - 9, 15], [cx - 7, 19],
];
for (let i = 0; i < bolt4.length - 1; i++) {
  const [x0, y0] = bolt4[i], [x1, y1] = bolt4[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Extra tip flares at bolt terminations ----
put('storm_bolts', cx - 1, 28, 'h'); put('storm_bolts', cx + 1, 28, 'h');
put('storm_bolts', 2,  25, 'h');     put('storm_bolts', 1,  26, 'a');
put('storm_bolts', 30, 25, 'h');     put('storm_bolts', 31, 26, 'a');
put('storm_bolts', cx - 7, 19, 'h'); put('storm_bolts', cx - 8, 20, 'a');

// ============================ STORM_EYE (glaring sentient eye in the cloud center) ============================
// One large menacing eye near the cloud center (y≈14..17, cx).
// The eye has: an outer glow ring (h), a dark iris (b), and a narrow vertical slit pupil (o).
// Uses glow palette → 'h' = bright highlight, 'b' = glow base/iris, 'o' = dark pupil slit.

const EY = 15, EX = cx;   // eye center
// Outer glow halo — 3px radius
disk('storm_eye', EX, EY, 3.2, 'h');
// Mid iris — 2px radius, slightly darker
disk('storm_eye', EX, EY, 2.0, 'b');
// Narrow vertical slit pupil (menacing, like a glaring storm deity)
for (let y = EY - 2; y <= EY + 2; y++) put('storm_eye', EX, y, 'o');
// Slightly widen the slit at center for a cat/reptile slit effect
put('storm_eye', EX - 1, EY, 'o');
put('storm_eye', EX + 1, EY, 'o');
// Upper eyelid shadow (makes it look like a heavy-lidded glare)
for (let x = EX - 2; x <= EX + 2; x++) put('storm_eye', x, EY - 2, 'b');
// Inner glow: tiny bright pupils flanking the slit
put('storm_eye', EX - 1, EY - 1, 'h');
put('storm_eye', EX + 1, EY - 1, 'h');

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
  const w = maxx - minx + 1, h = maxy - miny + 1;
  console.log(`  ${name}: {\n    res: 32, w: ${w}, h: ${h}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
emit('storm_body');
emit('storm_bolts');
emit('storm_eye');
