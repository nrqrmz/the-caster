// Galahad CADÁVER — Count lying dead/prone on the floor.
// NATIVE 2:1 sprite: authored on a 64-wide × 32-tall grid (res:32 → f=1, 1:1 into
// the gridW=64 × gridH=32 canvas), displayed at 128×64 (uniform ×2 — square pixels).
//
// Design: Galahad's count form lying PRONE, horizontal and limp.
// Body: head on LEFT (x≈0..22), feet on RIGHT (x≈50..63).
// Six layers, back-to-front, matching the Count's palette set:
//   cad_cape      : vampblack — cape spread flat beneath everything, collar points up
//   cad_legs      : vampblack — black trousers, ankles, shoe tips (right half)
//   cad_body      : linen    — white shirt, two limp hands with clawed fingers
//   cad_medallion : glow     — gold medallion resting on chest
//   cad_hair      : blackhair — long dark hair fanned out to the left
//   cad_head      : vampskin  — pale gaunt face, eyes closed (NOT glowing), neck
//
// Canvas layout: all layers share 64×32 fixed-anchor (0,0). 1:1 into grid (f=1, res:32).
//
// Run: node tools/gen-galcadaver.mjs
// Then splice the emitted cad_* blocks into src/data/sprites/parts.js.

const W = 64, H = 32;

const cape       = {};
const legs       = {};
const bodyLayer  = {};   // linen shirt + hands
const medallion  = {};
const hair       = {};
const headLayer  = {};   // face + neck

// ---- primitive helpers (same contract as gen-galbat.mjs / gen-stormelem.mjs) ----

const put = (L, x, y, r) => {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) L[`${x},${y}`] = r;
};

function hfill(L, y, x0, x1, r) {
  for (let x = Math.round(x0); x <= Math.round(x1); x++) put(L, x, y, r);
}

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

function blob(L, cx0, cy0, rx, ry, role='b') {
  for (let y = Math.floor(cy0-ry); y <= Math.ceil(cy0+ry); y++)
    for (let x = Math.floor(cx0-rx); x <= Math.ceil(cx0+rx); x++) {
      const d = ((x-cx0)/rx)**2 + ((y-cy0)/ry)**2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.82) r = 'o';
      else if ((x-cx0)/rx + (y-cy0)/ry < -0.55) r = 'h';
      else if ((x-cx0)/rx + (y-cy0)/ry >  0.60) r = 's';
      else r = role;
      put(L, x, y, r);
    }
}

function disk(L, cx0, cy0, r, role) {
  for (let y = Math.floor(cy0-r); y <= Math.ceil(cy0+r); y++)
    for (let x = Math.floor(cx0-r); x <= Math.ceil(cx0+r); x++)
      if (((x-cx0)/r)**2 + ((y-cy0)/r)**2 <= 1) put(L, x, y, role);
}

function lerp(a, b, t) { return a + (b-a)*t; }


// ============================= CAD_CAPE =============================
// Vampblack cape spread flat beneath the body — widest layer.
// Pools generously from left (behind head) to right (behind feet).
// Two high-collar points visible at upper-left (y≈6..12, x≈8..16).
// The main body of the cape is a broad horizontal band y≈13..28.

// ---- Collar points (stand-up collar, two peaked tips) ----
// Left collar point: peak at (x=9, y=6)
for (let y = 6; y <= 12; y++) {
  const t = (y - 6) / 6;
  const hw = Math.round(lerp(0, 3, t));
  const cx = 9;
  for (let x = cx-hw; x <= cx+hw; x++) {
    let r = (x === cx-hw || x === cx+hw) ? 'o' : (x === cx ? 'h' : 'b');
    put(cape, x, y, r);
  }
}
// Right collar point: peak at (x=16, y=7)
for (let y = 7; y <= 12; y++) {
  const t = (y - 7) / 5;
  const hw = Math.round(lerp(0, 3, t));
  const cx = 16;
  for (let x = cx-hw; x <= cx+hw; x++) {
    let r = (x === cx-hw || x === cx+hw) ? 'o' : (x === cx ? 'h' : 'b');
    put(cape, x, y, r);
  }
}

// ---- Upper cape (behind head/shoulder region, y=8..14, x=4..30) ----
for (let y = 8; y <= 14; y++) {
  const t = (y - 8) / 6;
  const lx = Math.round(lerp(4, 2, t));
  const rx = Math.round(lerp(24, 32, t));
  for (let x = lx; x <= rx; x++) {
    if (cape[`${x},${y}`]) continue;
    let r = 'b';
    if (x === lx || x === rx) r = 'o';
    else if (x <= lx + 1) r = 'h';
    else if (x >= rx - 1) r = 's';
    put(cape, x, y, r);
  }
}

// ---- Main cape drape (horizontal body, y=14..27): broad band across the canvas ----
for (let y = 14; y <= 27; y++) {
  const t = (y - 14) / 13;
  const lx = Math.round(lerp(1, 3, t));
  // Right edge: wide through y=16..21, taper at top and bottom
  const rx = y <= 8  ? 24
           : y <= 16 ? Math.round(lerp(32, 56, (y-14)/2))
           : y <= 21 ? Math.round(lerp(56, 52, (y-16)/5))
           : Math.round(lerp(52, 38, (y-21)/6));
  for (let x = lx; x <= rx; x++) {
    if (cape[`${x},${y}`]) continue;
    let r = 'b';
    if (x === lx || x === rx) r = 'o';
    else if (x <= lx + 2) r = 'h';
    else if (x >= rx - 2) r = 's';
    // Cape fold crease (shadow lines running horizontally)
    else if (y === 19 && x > 15 && x < 50) r = 's';
    else if (y === 23 && x > 10 && x < 40) r = 's';
    put(cape, x, y, r);
  }
}

// ---- Right trailing hem at feet (y=16..22, x=52..62) ----
for (let y = 15; y <= 22; y++) {
  const t = (y - 15) / 7;
  const lx = Math.round(lerp(52, 50, t));
  const rx = Math.round(lerp(62, 58, t));
  for (let x = lx; x <= rx; x++) {
    if (cape[`${x},${y}`]) continue;
    let r = (x === lx || x === rx) ? 'o' : (x >= rx-1 ? 's' : 'b');
    put(cape, x, y, r);
  }
}

// Hem fold outline (lower edge of cape)
hfill(cape, 27, 3, 37, 'o');


// ============================= CAD_LEGS =============================
// Vampblack trousers + shoe tips. Runs right half of canvas, y≈12..21.
// Body center seam at y≈16 (leg crease).

// ---- Trousers (waist x≈36, ankles x≈60) ----
for (let y = 12; y <= 21; y++) {
  const t = (y - 12) / 9;
  const lx = 36;
  // Taper slightly at ankle
  const rx = Math.round(lerp(60, 62, Math.min(1, t)));
  for (let x = lx; x <= rx; x++) {
    let r = 'b';
    if (x === lx || x === rx) r = 'o';
    else if (x <= lx + 1) r = 'h';
    else if (x >= rx - 1) r = 's';
    // Leg crease
    else if (y === 15 && x > 37 && x < 58) r = 's';
    else if (y === 16 && x > 37 && x < 58) r = 's';
    put(legs, x, y, r);
  }
}

// ---- Waistband highlight/crease ----
hfill(legs, 12, 36, 46, 's');
hfill(legs, 13, 36, 40, 's');

// ---- Ankles / shoe tips ----
// A slightly darker mound at the far right
blob(legs, 59, 17, 4, 3, 's');
put(legs, 63, 16, 'o'); put(legs, 63, 17, 'o');
put(legs, 63, 18, 'o'); put(legs, 62, 19, 'o');


// ============================= CAD_BODY (LINEN) =============================
// White shirt laid horizontal across left-center. Two limp hands (clawed fingers).
// Shirt spans x≈14..38, y≈11..21. Hands droop at left and extend right.

// ---- Shirt torso ----
blob(bodyLayer, 26, 16, 13, 5);   // main horizontal shirt blob

// Upper shirt / collar at neck area
for (let y = 11; y <= 14; y++) {
  const t = (y - 11) / 3;
  const lx = Math.round(lerp(16, 14, t));
  const rx = Math.round(lerp(22, 28, t));
  for (let x = lx; x <= rx; x++) {
    if (!bodyLayer[`${x},${y}`]) {
      let r = (x === lx || x === rx) ? 'o' : (x <= lx+1 ? 'h' : 'b');
      put(bodyLayer, x, y, r);
    }
  }
}

// Shirt button/placket (center shadow stripe)
for (let y = 13; y <= 20; y++) put(bodyLayer, 26, y, 's');
for (let y = 13; y <= 20; y++) put(bodyLayer, 25, y, 's');

// ---- Left arm (hangs downward from shoulder x≈16, y≈13..25) ----
// Upper arm (shirt-colored)
line(bodyLayer, 16, 13, 15, 20, 'b');
line(bodyLayer, 17, 13, 16, 20, 'h');
// Elbow curve
put(bodyLayer, 14, 20, 'o'); put(bodyLayer, 15, 20, 'b'); put(bodyLayer, 16, 20, 's');
// Forearm drooping
line(bodyLayer, 14, 21, 13, 25, 'b');
line(bodyLayer, 15, 21, 14, 25, 's');
// Left hand (pale, limp, small palm with clawed fingers pointing down)
for (let y = 23; y <= 26; y++) {
  for (let x = 12; x <= 16; x++) {
    let r = (x === 12 || x === 16 || y === 23) ? 'o' : (y === 26 ? 's' : 'b');
    put(bodyLayer, x, y, r);
  }
}
// Left claw fingers (3 droop downward)
put(bodyLayer, 12, 27, 'o'); put(bodyLayer, 12, 28, 'o');
put(bodyLayer, 14, 27, 'o'); put(bodyLayer, 14, 28, 'o');
put(bodyLayer, 16, 27, 'o'); put(bodyLayer, 16, 28, 'o');

// ---- Right arm ----
// Omitted: in the prone pose the right arm lies tucked under the body/cape
// and is not visible. Drawing it in linen over the trouser region produced
// a wide white patch that visually read as a "white leg". The shirt torso
// blob already covers the shoulder edge; nothing further is needed here.


// ============================= CAD_MEDALLION (GLOW) =============================
// Small gold medallion resting on the chest (x≈24..28, y≈14..18).
// Palette: glow — 'b'=gold base, 'h'=bright highlight, 's'=shadow, 'o'=dark outline.

disk(medallion, 26, 16, 2.5, 'b');
// Cross/star inlay
put(medallion, 26, 14, 'o'); put(medallion, 26, 18, 'o');
put(medallion, 24, 16, 'o'); put(medallion, 28, 16, 'o');
put(medallion, 26, 15, 'h'); put(medallion, 25, 16, 'h'); // gold highlight
put(medallion, 27, 17, 's'); put(medallion, 26, 17, 's'); // gold shadow
put(medallion, 25, 15, 'h'); // upper-left glint


// ============================= CAD_HAIR (BLACKHAIR) =============================
// Long dark hair fanned out to the LEFT side of the canvas (head is at left).
// Hair spreads from the crown area (x≈10..16, y≈9..11) leftward and slightly downward.
// Palette: blackhair — 'b'=very dark base, 'h'=very dark highlight, 's'=darkest shade, 'o'=near-black outline.

// Main hair mass behind head
blob(hair, 7,  12, 8, 5);   // large bulk behind the head
blob(hair, 3,  9,  5, 4);   // left outer mass
blob(hair, 5,  18, 6, 3);   // lower flowing hair

// Crown connection (to where the head will sit)
hfill(hair, 10, 9, 17, 'b');
hfill(hair, 11, 10, 16, 'h');

// Hair wisps fanning further left
line(hair, 2, 9,  0, 7,  's');
line(hair, 2, 10, 0, 13, 's');
line(hair, 3, 17, 1, 20, 's');
line(hair, 4, 20, 2, 24, 's');

// Long strand tips (outline marks)
for (const [x,y] of [[0,7],[0,8],[0,12],[0,13],[1,14],[1,20],[2,21],[2,24],[3,25]]) {
  put(hair, x, y, 'o');
}

// Outline along the upper hair silhouette
line(hair, 10, 9, 16, 10, 'o');
line(hair, 11, 8, 15, 9,  'h');


// ============================= CAD_HEAD (VAMPSKIN) =============================
// Pale gaunt face in 3/4 profile, eyes CLOSED (dark lines, not glowing).
// Neck connects down to the shirt. Head is at x≈13..22, y≈10..21.
// Palette: vampskin — 'b'=pale skin, 'h'=highlight (bone/cheek), 's'=sunken shadow, 'o'=dark outline.

// ---- Face oval ----
blob(headLayer, 17, 14, 5, 5);   // main face oval

// ---- Gaunt features ----
// Cheekbone highlights
put(headLayer, 14, 12, 'h'); put(headLayer, 15, 12, 'h');
put(headLayer, 14, 13, 'h');
// Sunken cheeks shadow
put(headLayer, 15, 15, 's'); put(headLayer, 15, 16, 's');
put(headLayer, 14, 16, 's'); put(headLayer, 14, 17, 's');
// Brow ridge
put(headLayer, 14, 11, 's'); put(headLayer, 15, 11, 's');
put(headLayer, 17, 11, 's'); put(headLayer, 18, 11, 's');

// ---- Nose (slight bump, profile) ----
put(headLayer, 19, 13, 'b'); put(headLayer, 20, 14, 'b');
put(headLayer, 21, 13, 'o'); put(headLayer, 21, 14, 'o');

// ---- Closed eyes (just dark lid lines, no glow) ----
// Left eye (further side, partially visible): x≈14..16, y=12
put(headLayer, 14, 12, 'o'); put(headLayer, 15, 12, 'o'); put(headLayer, 16, 12, 'o');
// Right/near eye: x≈17..19, y=12
put(headLayer, 17, 12, 'o'); put(headLayer, 18, 12, 'o'); put(headLayer, 19, 12, 'o');
// Eyelid edge (lower lid shadow)
put(headLayer, 15, 13, 's'); put(headLayer, 17, 13, 's'); put(headLayer, 18, 13, 's');

// ---- Lips (slightly parted, slack) ----
put(headLayer, 17, 17, 'h'); // upper lip highlight
put(headLayer, 17, 18, 's'); put(headLayer, 18, 18, 's'); put(headLayer, 19, 18, 's');
put(headLayer, 17, 19, 'o'); put(headLayer, 18, 19, 'o'); // mouth line (slack)

// ---- Jaw/chin ----
put(headLayer, 16, 20, 'o'); put(headLayer, 17, 20, 's'); put(headLayer, 18, 20, 's');
put(headLayer, 19, 20, 'o'); put(headLayer, 20, 20, 'o');

// ---- Neck (connecting head to shirt collar) ----
for (let y = 19; y <= 22; y++) {
  hfill(headLayer, y, 17, 19, 'b');
  put(headLayer, 16, y, 'o'); put(headLayer, 20, y, 'o');
}
// Neck shadow underside
put(headLayer, 17, 22, 's'); put(headLayer, 18, 22, 's'); put(headLayer, 19, 22, 's');


// ============================= emit helpers =============================
// Emit at FIXED 64×32 frame (no bbox crop) with anchor (0,0) so all parts share
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

emitStatic('cad_cape',      cape);
emitStatic('cad_legs',      legs);
emitStatic('cad_body',      bodyLayer);
emitStatic('cad_medallion', medallion);
emitStatic('cad_hair',      hair);
emitStatic('cad_head',      headLayer);
