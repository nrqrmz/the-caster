// Lélaps — mythic hound (boss), side profile facing RIGHT, 32-grid.
// Serves: lelaps (athletic divine hound, size 96, baseColor 0x9e9e9e, flip:true → faces left).
//
// Design: SLEEK, ATHLETIC, ELONGATED running hound. Key differences from fodder lobo:
//   - LONGER, LEANER body (stretched horizontal silhouette, not compact like the lobo)
//   - MID-STRIDE GAIT: front legs extended forward, back legs pushed back (galloping)
//   - LONG NECK arching forward and upward
//   - DROP EARS (NOT erect — long floppy ears hanging down, clearly NOT a wolf)
//   - Sleek whippet/greyhound musculature (deep chest, tucked belly, arched loin)
//   - Tail carried high and curved (not bushy)
//   - Glowing eyes (glow palette)
//
// Parts: lelaps_body, lelaps_legs, lelaps_head, lelaps_eyes (glow).
// Run: node tools/gen-lelaps.mjs

const N = 32, cx = 16;
const layers = {
  lelaps_body: {},
  lelaps_legs: {},
  lelaps_head: {},
  lelaps_eyes: {},
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

// ============================ LELAPS_BODY ============================
// ELONGATED athletic body: wide horizontal ellipse (longer than the lobo).
// The hound spans roughly x3..x28, which is much wider than the lobo's x6..x22.
// Body is HIGHER and the belly TUCKED UP (deep chest, arched loin) —
// characteristic greyhound/coursing hound silhouette.

// Per-column contour technique (like the bear) for precise greyhound silhouette.
// Profile facing RIGHT: head at right (x22+), tail at left (x2-3).

// TOP contour Ty[x]: defines the back line of the hound
const Ty = {
  // Tail base (left)
  2: 16, 3: 15, 4: 14,
  // Rump/loin (slightly raised)
  5: 13, 6: 12, 7: 11, 8: 11,
  // Arched back — slightly higher in the middle
  9: 10, 10: 10, 11: 10, 12: 10, 13: 10,
  // Deep chest / withers area
  14: 11, 15: 11, 16: 11,
  // Neck rising gracefully
  17: 10, 18: 9, 19: 8, 20: 8,
  // Head connection
  21: 8, 22: 8,
};

// BOTTOM contour By[x]: defines belly — deep chest tucks up steeply
const By = {
  2: 18,
  3: 19, 4: 19,
  5: 20, 6: 20, 7: 20, 8: 20,
  // Belly tuck — rises up (athletic greyhound belly)
  9: 20, 10: 19, 11: 18, 12: 17, 13: 17,
  // Deep chest (lower than belly)
  14: 20, 15: 21, 16: 20,
  // Chest front
  17: 18, 18: 16, 19: 15,
  // Throat / chest front
  20: 14, 21: 14, 22: 15,
};

// Fill trunk between contours
for (let x = 2; x <= 22; x++) {
  const t = Ty[x], b = By[x];
  if (t == null || b == null) continue;
  for (let y = t; y <= b; y++) put('lelaps_body', x, y, 'b');
}

// HIGH CURLING TAIL — sweeps up from the rump (left end).
// The tail curves upward with a tight curl (unlike the bushy wolf tail).
line('lelaps_body', 4, 15, 2, 12, 'b');
line('lelaps_body', 2, 12, 1, 10, 'b');
line('lelaps_body', 1, 10, 2,  8, 'b');  // curl tip
line('lelaps_body', 2,  8, 3,  7, 'b');
put('lelaps_body', 3,  7, 'h');          // tail tip highlight
put('lelaps_body', 2,  8, 'h');
put('lelaps_body', 1, 10, 'o');          // tail outline
put('lelaps_body', 2, 12, 'o');

// Back highlight (lomo) along the dorsal ridge
for (let x = 5; x <= 20; x++) {
  const t = Ty[x];
  if (t != null) put('lelaps_body', x, t + 1, 'h');
}
// Belly shade — the tucked belly line
for (let x = 9; x <= 13; x++) put('lelaps_body', x, By[x] - 1, 's');
// Chest shade
for (let x = 14; x <= 16; x++) put('lelaps_body', x, By[x] - 1, 's');

// Automatic outline pass
const bodyKeys = Object.keys(layers.lelaps_body).map(k => k.split(',').map(Number));
for (const [x, y] of bodyKeys) {
  const get = (xx, yy) => layers['lelaps_body'][`${xx},${yy}`];
  const empty = (xx, yy) => xx < 0 || xx >= N || yy < 0 || yy >= N || !get(xx, yy);
  if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))
    put('lelaps_body', x, y, 'o');
}

// ============================ LELAPS_LEGS ============================
// MID-STRIDE GAIT: the key silhouette differentiator from the lobo.
// Front legs: stretched FORWARD (extended in stride toward x22-26, angled down)
// Back legs: pushed BACKWARD (stretched back toward x2-5, angled down)
// This galloping posture reads completely differently from the lobo's standing legs.

// Back legs (left side, behind the body) — legs stretched rearward
// Far back leg (slightly higher, in shadow shade)
line('lelaps_legs', 5, 20, 3, 26, 's');  // far back leg
put('lelaps_legs', 2, 27, 's');
// Near back leg (slightly forward of far leg)
line('lelaps_legs', 7, 20, 5, 26, 'b');  // near back leg
put('lelaps_legs', 4, 27, 'b');
put('lelaps_legs', 5, 27, 'b');
put('lelaps_legs', 4, 28, 'o');  // paw
put('lelaps_legs', 5, 28, 'b');
put('lelaps_legs', 6, 28, 'o');

// Front legs (right side) — legs stretched forward in stride
// Near front leg (angling down-forward)
line('lelaps_legs', 16, 21, 20, 27, 'b');  // near front
put('lelaps_legs', 20, 27, 'b');
put('lelaps_legs', 21, 28, 'b');
put('lelaps_legs', 21, 29, 'o');  // paw tip
put('lelaps_legs', 20, 29, 'b');
put('lelaps_legs', 19, 29, 'o');
// Far front leg (slightly back, in shadow)
line('lelaps_legs', 14, 21, 18, 27, 's');  // far front leg
put('lelaps_legs', 17, 28, 's');
put('lelaps_legs', 17, 29, 'o');

// ============================ LELAPS_HEAD ============================
// LONG-NOSED HOUND HEAD in profile facing RIGHT.
// Key features:
//   - LONG elegant muzzle (much longer than lobo) — coursing hound nose
//   - DROP EARS: long pendant ears hanging DOWN (not erect like a wolf)
//     This is the primary visual distinction from both lobo and hombre_lobo
//   - Long graceful neck

// Skull — lean oval
disk('lelaps_head', 21, 13, 3.5, 'b');
// Outline skull
for (let x = 17; x <= 25; x++) {
  for (let y = 9; y <= 17; y++) {
    const d = ((x - 21) / 3.5) ** 2 + ((y - 13) / 3.5) ** 2;
    if (d > 0.88 && d <= 1.0) put('lelaps_head', x, y, 'o');
  }
}

// LONG ELEGANT MUZZLE — extends far right
// Much longer than the lobo snout (hound/greyhound proportions)
for (let y = 14; y <= 16; y++) {
  put('lelaps_head', 24, y, 'b');
  put('lelaps_head', 25, y, 'b');
  put('lelaps_head', 26, y, 'b');
  put('lelaps_head', 27, y, 'b');
  put('lelaps_head', 28, y, 'b');
  put('lelaps_head', 29, y, (y === 14 || y === 16) ? 'o' : 'b');
  put('lelaps_head', 30, y, 'o');
}
// Muzzle top bridge (narrower upper jaw)
put('lelaps_head', 24, 13, 'b');
put('lelaps_head', 25, 13, 'b');
put('lelaps_head', 26, 13, 'b');
put('lelaps_head', 24, 12, 'o');  // top of muzzle
put('lelaps_head', 25, 12, 'o');
// Nose (at the tip of the long muzzle)
put('lelaps_head', 30, 14, 'o');
put('lelaps_head', 30, 15, 's');  // nostril dark
put('lelaps_head', 31, 15, 'o');

// Drop ears — LONG PENDANT EARS hanging DOWN from the skull.
// This is the key distinguisher from wolf (erect ears).
// Ear base at top of skull x19-21, droops down y14..y22.
// Left/lower ear (behind the head):
for (let y = 10; y <= 20; y++) {
  put('lelaps_head', 18, y, 'b');
  put('lelaps_head', 19, y, 'b');
  if (y <= 12) put('lelaps_head', 20, y, 'b');
}
// Drop ear outline (left side)
for (let y = 10; y <= 20; y++) put('lelaps_head', 17, y, 'o');
put('lelaps_head', 18, 20, 'o');  // ear tip
put('lelaps_head', 19, 20, 'o');
// Ear shading
for (let y = 12; y <= 19; y++) put('lelaps_head', 19, y, 's');

// Head highlight (top of skull)
for (let x = 19; x <= 22; x++) put('lelaps_head', x, 10, 'h');
// Chin/jaw shade
for (let x = 22; x <= 26; x++) put('lelaps_head', x, 17, 's');

// ============================ LELAPS_EYES (glow palette) ============================
// Single glowing eye on the right side (snout side) of the head.
put('lelaps_eyes', 23, 12, 'h');  // top glow
put('lelaps_eyes', 23, 13, 'b');  // main eye
put('lelaps_eyes', 24, 13, 'h');  // glow right

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

emit('lelaps_body');
emit('lelaps_legs');
emit('lelaps_head');
emit('lelaps_eyes');
