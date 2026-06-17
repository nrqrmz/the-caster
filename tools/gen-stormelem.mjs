// Elemental de Tormenta (nv6 setpiece boss) — storm-cloud elemental.
// A roiling black cumulonimbus with lightning veins and a single glaring eye.
// Parts emitted:
//   storm_body  — big lumpy dark storm cloud (overlapping blobs, billowing top / anvil base)
//   storm_bolts — jagged lightning veins across the cloud
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

// ============================ STORM_BODY (roiling cumulonimbus) ============================
// Strategy: several overlapping blob() calls to create a lumpy cloud mass.
// Upper part: billowing rounded turrets (tall, prominent).
// Middle: broad main body.
// Lower: flat anvil base with a flat-bottom look.
// Color roles: 'b'=dark storm body, 'o'=rim/outline, 'h'=upper-billow highlights, 's'=shade pockets.

// ---- MAIN CLOUD BODY (broad mid section) ----
blob('storm_body', cx,     17, 11, 8);       // central bulk — wide and deep
blob('storm_body', cx - 4, 14, 7.5, 6);     // left upper lobe
blob('storm_body', cx + 4, 14, 7.5, 6);     // right upper lobe

// ---- UPPER BILLOWING TURRETS ----
blob('storm_body', cx,     8,  6,   5);      // top-center billow (tallest, dominating)
blob('storm_body', cx - 7, 11, 4.5, 4);     // left secondary billow
blob('storm_body', cx + 7, 11, 4.5, 4);     // right secondary billow
blob('storm_body', cx - 3, 6,  3,   3);     // left crown puff
blob('storm_body', cx + 3, 6,  3,   3);     // right crown puff

// ---- ANVIL / FLAT BASE (cumulonimbus shelf — widens at bottom) ----
// Overhang left side
blob('storm_body', cx - 9, 22, 5, 3.5);
// Overhang right side
blob('storm_body', cx + 9, 22, 5, 3.5);
// Flat underbelly connecting the overhang — horizontal mass
for (let y = 22; y <= 28; y++) {
  const half = 13 - (y - 22) * 0.7;   // tapers slightly downward
  const Lx = Math.round(cx - half), Rx = Math.round(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    if (!layers.storm_body[`${x},${y}`]) {  // only fill gaps
      const edge = (x === Lx || x === Rx);
      put('storm_body', x, y, edge ? 'o' : 's');   // underbelly is dark/shaded
    }
  }
}

// ---- SHADE POCKETS (turbulent inner darkness) ----
// A few extra shade patches inside the cloud mass to look roiling
blob('storm_body', cx - 3, 19, 3.5, 2.5, 's');
blob('storm_body', cx + 4, 20, 3,   2,   's');
blob('storm_body', cx - 5, 15, 2.5, 2,   's');

// ---- UPPER HIGHLIGHTS on top billows (catch-light on rounded cloud tops) ----
// These override some interior pixels with 'h' to suggest lit upper surfaces
for (const [bx, by, r] of [
  [cx,     4,  2],   // top of center turret
  [cx - 1, 5,  1.5],
  [cx + 1, 5,  1.5],
  [cx - 7, 8,  1.5], // left billow crown
  [cx + 7, 8,  1.5], // right billow crown
  [cx - 3, 4,  1.2], // left puff crown
  [cx + 3, 4,  1.2], // right puff crown
]) {
  disk('storm_body', bx, by, r, 'h');
}

// ============================ STORM_BOLTS (jagged lightning veins) ============================
// Three distinct lightning bolts zig-zagging across the cloud.
// Using roles: 'h' (bright electric) for the main channel, 'a' (accent) for glow fringe.

// ---- Bolt 1: main central bolt — top-center down to lower-left ----
// Starts near top turret, zig-zags to lower area
const bolt1 = [
  [cx, 7], [cx + 1, 9], [cx - 1, 11], [cx + 2, 13], [cx - 2, 15], [cx + 1, 17], [cx - 1, 20], [cx, 23],
];
for (let i = 0; i < bolt1.length - 1; i++) {
  const [x0, y0] = bolt1[i], [x1, y1] = bolt1[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  // Glow fringe: 'a' pixels flanking the bolt
  line('storm_bolts', x0 - 1, y0, x1 - 1, y1, 'a');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Bolt 2: left side bolt — shorter, forking left ----
const bolt2 = [
  [cx - 6, 10], [cx - 5, 12], [cx - 7, 14], [cx - 5, 17], [cx - 8, 21],
];
for (let i = 0; i < bolt2.length - 1; i++) {
  const [x0, y0] = bolt2[i], [x1, y1] = bolt2[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 - 1, y0, x1 - 1, y1, 'a');
}

// ---- Bolt 3: right side bolt — short, on the right flank ----
const bolt3 = [
  [cx + 6, 11], [cx + 8, 13], [cx + 5, 15], [cx + 7, 18],
];
for (let i = 0; i < bolt3.length - 1; i++) {
  const [x0, y0] = bolt3[i], [x1, y1] = bolt3[i + 1];
  line('storm_bolts', x0, y0, x1, y1, 'h');
  line('storm_bolts', x0 + 1, y0, x1 + 1, y1, 'a');
}

// ---- Extra tip flares at bolt terminations ----
put('storm_bolts', cx - 1, 23, 'h'); put('storm_bolts', cx + 1, 23, 'h');
put('storm_bolts', cx - 8, 21, 'h'); put('storm_bolts', cx - 9, 22, 'a');
put('storm_bolts', cx + 7, 18, 'h'); put('storm_bolts', cx + 8, 19, 'a');

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
