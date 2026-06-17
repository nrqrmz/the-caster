// Galahad MURCIÉLAGO form — bespoke colossal symmetric vampire bat.
// NATIVE 2:1 sprite: authored on a 64-wide × 32-tall grid (res:32 → f=1, 1:1 into
// the gridW=64 × gridH=32 canvas), displayed at 128×64 (uniform ×2 — square pixels).
//
// Design: a COLOSSAL, TERRIFYING, symmetric vampire bat.
//   - gbat_wings : enormous membranous bat wings spanning the full 64-wide canvas.
//                  Scalloped/clawed leading edge, vein-veined membrane, 'o' outline,
//                  'b' membrane fill, 's' shade pockets, 'h' highlight/ribs.
//   - gbat_body  : monstrous central body + grotesque head. Snarling FANGED MAW (open
//                  mouth, prominent upper+lower fangs), two enormous pointed ears.
//                  'o' outline, 'b' body fill, 's' underbelly/shadow, 'h' catch-light/rim.
//   - gbat_eyes  : two menacing red glowing eyes (palette: vampglow).
//
// Symmetry: every pixel is placed symmetrically about x=31.5 (vertical center of the
// 64-wide canvas). The helper `sym(L,x,y,r)` writes both x and the mirror pixel.
//
// Run: node tools/gen-galbat.mjs
// Then splice the emitted gbat_* blocks into src/data/sprites/parts.js.

const W = 64, H = 32;

const wings = {};
const body  = {};
const eyes  = {};

// ---- primitive helpers (same contract as gen-stormelem) ----

const put = (L, x, y, r) => {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) L[`${x},${y}`] = r;
};

// Place a pixel AND its mirror (about x=31.5, so mirror = 63-x).
const sym = (L, x, y, r) => { put(L, x, y, r); put(L, 63 - x, y, r); };

function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1-x0), dy = Math.abs(y1-y0), sx = x0<x1?1:-1, sy = y0<y1?1:-1;
  let err = dx-dy, x = x0, y = y0;
  for (;;) {
    put(L, x, y, r);
    if (x===x1 && y===y1) break;
    const e2 = 2*err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 <  dx) { err += dx; y += sy; }
  }
}

// Symmetric line: draws the line and its mirror simultaneously.
function symline(L, x0, y0, x1, y1, r) {
  line(L, x0, y0, x1, y1, r);
  line(L, 63-x0, y0, 63-x1, y1, r);
}

function disk(L, cx0, cy0, r, role) {
  for (let y = Math.floor(cy0-r); y <= Math.ceil(cy0+r); y++)
    for (let x = Math.floor(cx0-r); x <= Math.ceil(cx0+r); x++)
      if (((x-cx0)/r)**2 + ((y-cy0)/r)**2 <= 1) put(L, x, y, role);
}

function symdisk(L, cx0, cy0, r, role) {
  disk(L, cx0, cy0, r, role);
  disk(L, 63-cx0, cy0, r, role);
}

function blob(L, cx0, cy0, rx, ry, role='b') {
  for (let y = Math.floor(cy0-ry); y <= Math.ceil(cy0+ry); y++)
    for (let x = Math.floor(cx0-rx); x <= Math.ceil(cx0+rx); x++) {
      const d = ((x-cx0)/rx)**2 + ((y-cy0)/ry)**2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.80) r = 'o';
      else if ((x-cx0)/rx + (y-cy0)/ry < -0.55) r = 'h';
      else if ((x-cx0)/rx + (y-cy0)/ry >  0.60) r = 's';
      put(L, x, y, r);
    }
}

// Symmetric blob (about x=31.5).
function symblob(L, cx0, cy0, rx, ry, role='b') {
  blob(L, cx0, cy0, rx, ry, role);
  blob(L, 63-cx0, cy0, rx, ry, role);
}


// ============================= GBAT_WINGS =============================
// The wings DOMINATE the canvas, spanning x=0..63, y=0..31.
// Structure:
//   • Two leading-edge "arm" spines fan from the shoulder (≈x=20/43, y=4) to the
//     wingtip corners (x≈2, y≈8) and back to claw-tips along the trailing edge.
//   • Scalloped trailing edge: 5 lobes per side with small claw notches.
//   • Membrane fill between the arm-bones and the trailing edge.
//   • Vein lines = shade 's' lines radiating from the arm spine inward.
//   • Arm-bone highlight = 'h' along the primary spar.
//   • Everything mirrored left ↔ right about x=31.5.

// ---- Outer wing extent ----
// Left-side coordinates; the sym* calls mirror to the right.

// Primary leading-edge spar (LEFT):
// From shoulder attach (x=22, y=5) → elbow (x=8, y=9) → wingtip (x=2, y=13)
// then the trailing finger spurs fan further down.
const L_SPAR = [
  [22,5],[19,6],[15,7],[10,8],[6,9],[3,11],[1,13],
];
// Secondary upper arm spar (inner, shorter)
const L_SPAR2 = [
  [22,5],[20,7],[18,9],[16,11],[14,13],
];
// Third finger spar
const L_SPAR3 = [
  [22,6],[19,9],[17,12],[15,15],[13,18],
];
// Fourth finger spar (lower)
const L_SPAR4 = [
  [22,7],[20,11],[19,14],[17,17],[16,21],
];
// Trailing scallop edge points (left side, bottom of wing)
const L_SCALLOP = [
  [0,14],[1,17],[0,20],[2,23],[0,26],[2,29],[4,31],
];
// Inner trailing edge connecting back to body
const L_INNER = [
  [14,31],[16,28],[18,25],[20,22],[21,19],[22,16],
];

// Draw arm spars (highlight 'h' core, then 'b' fill)
for (let i = 0; i < L_SPAR.length-1; i++) {
  const [x0,y0] = L_SPAR[i], [x1,y1] = L_SPAR[i+1];
  symline(wings, x0, y0, x1, y1, 'h'); // bone highlight
  // slight thickening: one pixel inward
  symline(wings, x0+1, y0, x1+1, y1, 'b');
}
for (let i = 0; i < L_SPAR2.length-1; i++) {
  const [x0,y0] = L_SPAR2[i], [x1,y1] = L_SPAR2[i+1];
  symline(wings, x0, y0, x1, y1, 'b');
}
for (let i = 0; i < L_SPAR3.length-1; i++) {
  const [x0,y0] = L_SPAR3[i], [x1,y1] = L_SPAR3[i+1];
  symline(wings, x0, y0, x1, y1, 'b');
}
for (let i = 0; i < L_SPAR4.length-1; i++) {
  const [x0,y0] = L_SPAR4[i], [x1,y1] = L_SPAR4[i+1];
  symline(wings, x0, y0, x1, y1, 'b');
}

// Scalloped trailing edge (left side)
for (let i = 0; i < L_SCALLOP.length-1; i++) {
  const [x0,y0] = L_SCALLOP[i], [x1,y1] = L_SCALLOP[i+1];
  symline(wings, x0, y0, x1, y1, 'o');
}
// Connect scallop tip to wingtip
symline(wings, 0, 14, 1, 13, 'o');
symline(wings, 4, 31, 14, 31, 'o');

// Inner trailing edge back to body
for (let i = 0; i < L_INNER.length-1; i++) {
  const [x0,y0] = L_INNER[i], [x1,y1] = L_INNER[i+1];
  symline(wings, x0, y0, x1, y1, 'o');
}

// ---- Membrane fill ----
// Fill a broad wing membrane between the outer spar region and the trailing edge.
// Use a sweep across each row, from the outer-edge x to the inner-edge x.
// Membrane palette: 'b' base, shade 's' near bones, 'h' near leading edge.

// Build a bounding box for the left wing membrane per row.
// Outer edge (leading): follows L_SPAR extended downward through scallop.
// Inner edge: body boundary at x≈19..22 for y≈5..16, then L_INNER for y≈16..31.

function lerp(v0, v1, t) { return v0 + (v1-v0)*t; }

// Outer x boundary for left side (minimum x = leftmost extent per row).
const outerX = new Array(H).fill(30);
for (const [x,y] of [...L_SPAR, ...L_SCALLOP]) { const oy = Math.round(y); if (oy < H) outerX[oy] = Math.min(outerX[oy], x); }
// Smooth it
for (let y = 5; y < H; y++) if (outerX[y] === 30 && outerX[y-1] !== 30) outerX[y] = outerX[y-1]+1;

// Inner x boundary for left side (maximum x = closest to centre)
const innerX = new Array(H).fill(22);
for (let y = 0; y < 5; y++) innerX[y] = 22;
for (let y = 5; y <= 16; y++) innerX[y] = 22;
for (let i = 0; i < L_INNER.length; i++) {
  const [ix,iy] = L_INNER[i];
  innerX[Math.round(iy)] = Math.min(innerX[Math.round(iy)], ix);
}
// Smooth inner boundary between known points
for (let i = 0; i < L_INNER.length-1; i++) {
  const [x0,y0] = L_INNER[i], [x1,y1] = L_INNER[i+1];
  const steps = Math.abs(y1-y0);
  for (let s = 0; s <= steps; s++) {
    const t = steps ? s/steps : 0;
    const iy = Math.round(lerp(y0, y1, t));
    const ix = Math.round(lerp(x0, x1, t));
    if (iy < H) innerX[iy] = Math.min(innerX[iy]+1, ix);
  }
}

// Paint the membrane
for (let y = 5; y < H; y++) {
  const ox = outerX[y] + 1;
  const ix = innerX[y] - 1;
  if (ix < ox) continue;
  for (let x = ox; x <= ix; x++) {
    const t = (x - ox) / Math.max(1, ix - ox); // 0=outer, 1=inner
    let r = 'b';
    if (!wings[`${x},${y}`]) { // don't overwrite spars/outlines
      if (t < 0.15) r = 's';           // dark at outer edge (trailing shadow)
      else if (t > 0.75) r = 's';      // dark at inner edge near body
      else if (y % 4 === 1 && t > 0.2 && t < 0.65) r = 's'; // vein shading stripe
      sym(wings, x, y, r);
    }
  }
}

// ---- Claw tips at wing-finger ends ----
// 3 tiny claws at the leading spar tip and outer scallop cusps.
const L_CLAWS = [
  [1,13],[0,12],    // wingtip leading edge claw
  [0,20],[0,21],    // mid-scallop claw
  [2,29],[1,30],    // lower scallop claw
];
for (const [x,y] of L_CLAWS) sym(wings, x, y, 'o');

// Outline along the very leading edge (the spar already has 'h'; add outer 'o')
for (const [x,y] of L_SPAR) sym(wings, x, y, 'o');
// Leading edge outline (top arc)
for (let x = 0; x <= 22; x++) { if (!wings[`${x},5`]) sym(wings, x, 5, 'o'); }


// ============================= GBAT_BODY =============================
// Monstrous central body + grotesque head on the same layer.
// The body is centered: x=28..35 (8px wide) occupies the torso.
// Head is at the top with HUGE pointed ears, an open fanged maw.
// Coordinate system: center of canvas = x=31..32 (two-pixel center for even 64).
// We draw with center at x=31.5; for sym(), use cx values <32 (left).

const BCX = 31; // body center-left column (sym mirrors to 32+)

// ---- Ears (enormous pointed, at x=24..27 left / mirror right, y=0..9) ----
// Each ear: a tall sharp triangle, pointed tip at top.
// Left ear: tip at (x=25, y=0), base at y=10, x=23..28.
for (let y = 0; y <= 10; y++) {
  const t = y / 10;
  const halfW = Math.round(lerp(0.5, 3.5, t));
  const earCx = 25; // left ear center
  for (let x = earCx - halfW; x <= earCx + halfW; x++) {
    let r = 'b';
    if (x === earCx - halfW || x === earCx + halfW) r = 'o';
    else if (x === earCx) r = 'h'; // inner highlight
    else if (x === earCx + halfW - 1) r = 's'; // shade inside edge
    sym(body, x, y, r);
  }
}
// Ear inner notch (the pale inner pinna) — a narrow inner highlight stripe
for (let y = 1; y <= 8; y++) {
  const t = y / 8;
  const earCx = 25;
  const pw = Math.max(0, Math.round(lerp(0, 1, t)));
  if (pw >= 0) sym(body, earCx, y, 'h');
}

// ---- Head oval (y=8..18, center x=31.5, w≈14, h≈11) ----
// Grotesque wide angular head.
for (let y = 8; y <= 18; y++) {
  const t = (y - 8) / 10;
  // wide, slightly widening from top then narrowing at chin
  const half = (y <= 11) ? lerp(6, 8, (y-8)/3) :
               (y <= 14) ? lerp(8, 7, (y-11)/3) :
                           lerp(7, 5, (y-14)/4);
  const Lx = Math.round(BCX - half + 0.5);
  const Rx = Math.round(BCX + half + 0.5);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';
    else if (x >= Rx - 1) r = 's';
    put(body, x, y, r);
  }
}

// ---- Brow ridge (heavy, overhanging — y=10..11) ----
for (let x = BCX - 6; x <= BCX + 7; x++) {
  if (body[`${x},10`] && body[`${x},10`] !== 'o') put(body, x, 10, 's');
  if (body[`${x},11`] && body[`${x},11`] !== 'o') put(body, x, 11, 's');
}

// ---- Nose bridge / muzzle (protruding snout, y=13..18) ----
// The snout widens at the muzzle row where the fangs sit.
for (let y = 13; y <= 18; y++) {
  const mhalf = (y <= 15) ? 3 : (y <= 16) ? 4 : 3;
  for (let x = BCX - mhalf; x <= BCX + mhalf + 1; x++) {
    let r = 'b';
    if (x === BCX - mhalf || x === BCX + mhalf + 1) r = 'o';
    else if (x === BCX - mhalf + 1) r = 'h';
    put(body, x, y, r);
  }
}

// ---- Open fanged maw (y=15..19) ----
// Mouth opening: dark crevice line at y=16 across center
for (let x = BCX - 5; x <= BCX + 6; x++) put(body, x, 16, 'o');
// Upper jaw / lip (y=15): slight lip above mouth line
for (let x = BCX - 4; x <= BCX + 5; x++) {
  if (body[`${x},15`] !== 'o') put(body, x, 15, 's');
}
// Lower jaw (y=17..18): wider, drooping open
for (let y = 17; y <= 18; y++) {
  const mhalf = 4 + (y - 17);
  for (let x = BCX - mhalf; x <= BCX + mhalf + 1; x++) {
    if (!body[`${x},${y}`]) put(body, x, y, 's');
    if (x === BCX - mhalf || x === BCX + mhalf + 1) put(body, x, y, 'o');
  }
}
// Chin bottom edge (y=19): outline close
for (let x = BCX - 4; x <= BCX + 5; x++) put(body, x, 19, 'o');

// ---- UPPER FANGS (prominent, pointed, hang from upper jaw y=15..17) ----
// Four fangs symmetric: left pair at x=27,29; right pair at x=34,36 (mirror)
for (const fx of [BCX-4, BCX-2]) {
  put(body, fx, 15, 'h'); // fang tip bright
  put(body, fx, 16, 'h'); // fang mid
  put(body, fx, 17, 'o'); // fang base merges into maw dark
}
// Mirror upper fangs
for (const fx of [BCX+5, BCX+3]) {
  put(body, fx, 15, 'h');
  put(body, fx, 16, 'h');
  put(body, fx, 17, 'o');
}

// ---- LOWER FANGS (upward, visible in open maw, y=18..16) ----
for (const fx of [BCX-1, BCX+1, BCX+2]) {
  put(body, fx, 18, 'h');
  put(body, fx, 17, 'o');
}

// ---- Torso / body mass (y=17..29) — thick bat body, hanging below head ----
for (let y = 19; y <= 29; y++) {
  const t = (y - 19) / 10;
  // Wide at shoulders, tapering toward the haunches
  const half = (y <= 22) ? lerp(9, 8, (y-19)/3) :
               (y <= 25) ? lerp(8, 6.5, (y-22)/3) :
                           lerp(6.5, 4.5, (y-25)/4);
  const Lx = Math.round(BCX - half + 0.5);
  const Rx = Math.round(BCX + half + 0.5);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';
    else if (x >= Rx - 1) r = 's';
    // Belly shadow lower portion
    if (y >= 25 && r === 'b') r = 's';
    put(body, x, y, r);
  }
}

// ---- Hind legs / clawed feet (y=28..31) ----
// Two stumpy limbs with spreading claws.
// Left limb: x=23..26, right limb: x=37..40
for (let y = 28; y <= 31; y++) {
  // Left leg
  for (let x = 23; x <= 26; x++) {
    let r = (x === 23 || x === 26) ? 'o' : 'b';
    put(body, x, y, r);
  }
  // Right leg
  for (let x = 37; x <= 40; x++) {
    let r = (x === 37 || x === 40) ? 'o' : 'b';
    put(body, x, y, r);
  }
}
// Claws at y=31: three points per foot
for (const [cx0, cxEnd] of [[21,27],[36,42]]) {
  put(body, cx0,   31, 'o');
  put(body, cx0+1, 31, 'o');
  // middle claw tip (one below)
  // — actually extend into y=31 row as short spurs
  for (let x = cx0+2; x < cxEnd-1; x++) if (!body[`${x},31`]) put(body, x, 31, 'o');
  put(body, cxEnd-1, 31, 'o');
  put(body, cxEnd,   31, 'o');
}

// Fur / membrane attachment line connecting shoulders to wing roots (y=19, near body edge)
for (let x = BCX - 9; x <= BCX + 10; x++) {
  if (!body[`${x},19`]) put(body, x, 19, 's');
}
// shoulder outline
put(body, BCX-9, 19, 'o'); put(body, BCX+10, 19, 'o');


// ============================= GBAT_EYES =============================
// Two fierce red glowing eyes (palette: vampglow).
// Left eye center: (x=27, y=13); Right: (x=36, y=13).
// Outer glow halo (h), iris (b), slit pupil (o).

function drawGlowEye(L, ex, ey) {
  // outer halo
  symdisk(L, ex, ey, 2.8, 'h');
  // iris
  symdisk(L, ex, ey, 1.8, 'b');
  // vertical slit pupil
  for (let y = ey - 1; y <= ey + 1; y++) {
    sym(L, ex,   y, 'o');
    sym(L, ex+1, y, 'o'); // thicken slit one pixel right as well (mirror handles it)
  }
  sym(L, ex-1, ey, 'o');
  sym(L, ex+2, ey, 'o');
}

// Left eye at (27, 13) — mirrored to right eye at (63-27=36, 13)
drawGlowEye(eyes, 27, 13);


// ============================= emit helpers =============================
// Emit at a FIXED 64×32 frame (no bbox crop) with anchor (0,0) so all parts share
// the canvas origin and align. f=1 (res:32), so 1:1 into the 64×32 grid.

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

emitStatic('gbat_wings', wings);
emitStatic('gbat_body',  body);
emitStatic('gbat_eyes',  eyes);
