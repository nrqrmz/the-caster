// Bear silhouette — TRUE side profile (facing right, matching wolf/boar).
// Authored as an EXPLICIT per-column contour (NOT stacked ellipses): a top line
// Ty[x] (back → shoulder hump → neck → head → snout) and a bottom line By[x]
// (rump → belly → chest → throat → jaw), filled between, then an automatic
// outline pass. Plus four plantigrade legs, a round ear, a short snout with nose,
// and a stubby tail.
//
// Landscape canvas 40-wide × 28-tall, res:32 (f=1). Recipe:
//   oso_jardin: { archetype:'beast', gridW:40, gridH:28, scale:2, parts:BEAR, flip:true }
//   → renders 80×56 (a big, heavy, clearly-ursine fodder beast).
//
// Parts: bear_body (whole silhouette + shading), bear_eyes (glow).
// Run: node tools/gen-bear.mjs  → splice bear_body + bear_eyes into parts.js.

const W = 40, H = 28;

const layers = { bear_body: {}, bear_eyes: {} };

const put = (L, x, y, r) => {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) layers[L][`${x},${y}`] = r;
};
const get = (L, x, y) => layers[L][`${x},${y}`];

// ---- TOP contour Ty[x] (lower y = higher): rump→back→HUMP→neck→head→snout ----
const Ty = {
  4: 11, 5: 10, 6: 9, 7: 8, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7, 13: 7, 14: 7,
  15: 6, 16: 6, 17: 6, 18: 5, 19: 5, 20: 5,
  21: 4, 22: 4, 23: 4, 24: 4,     // broad shoulder hump (over front legs)
  25: 5, 26: 5, 27: 5,            // shallow neck dip (smoother back)
  28: 4, 29: 4, 30: 4, 31: 5,     // rounded head/forehead
  32: 6, 33: 7, 34: 8, 35: 9, 36: 10,  // short blunt muzzle slope (ends at x36)
};
// ---- BOTTOM contour By[x] (larger y = lower): rump→belly→chest→throat→jaw ----
const By = {
  4: 14, 5: 15, 6: 16, 7: 17, 8: 18, 9: 19, 10: 19, 11: 19, 12: 19, 13: 19,
  14: 19, 15: 19, 16: 19, 17: 19, 18: 19, 19: 19, 20: 19, 21: 18, 22: 18, 23: 17,
  24: 17, 25: 16, 26: 16, 27: 16, 28: 16, 29: 16, 30: 16,  // chest / throat
  31: 16, 32: 16, 33: 15, 34: 15, 35: 15, 36: 15,          // jaw / blunt muzzle front
};

// Fill the trunk between the two contours as base 'b'.
for (let x = 4; x <= 38; x++) {
  const t = Ty[x], b = By[x];
  for (let y = t; y <= b; y++) put('bear_body', x, y, 'b');
}

// Small ROUNDED ear sitting on top of the head (solid so it survives outlining).
put('bear_body', 28, 3, 'b'); put('bear_body', 29, 3, 'b'); put('bear_body', 30, 3, 'b'); put('bear_body', 31, 3, 'b');
put('bear_body', 29, 2, 'b'); put('bear_body', 30, 2, 'b');

// Blunt muzzle front: nose at the very front of the short snout (x36), mouth crease.
put('bear_body', 36, 12, 'o'); put('bear_body', 36, 13, 'o'); put('bear_body', 36, 14, 'o'); // dark nose
if (get('bear_body', 35, 14)) put('bear_body', 35, 14, 's');
if (get('bear_body', 34, 14)) put('bear_body', 34, 14, 's'); // mouth crease shade

// Stubby tail at the rear (left).
put('bear_body', 3, 12, 'b'); put('bear_body', 2, 12, 'b'); put('bear_body', 3, 13, 'b');

// ---- Legs (below the belly, down to y=27) ----
// Each leg: a thick column of 'b'; far legs are 's' (in shadow, set behind).
function leg(x0, x1, yTop, yBot, role) {
  for (let x = x0; x <= x1; x++)
    for (let y = yTop; y <= yBot; y++)
      if (!get('bear_body', x, y)) put('bear_body', x, y, role);
}
// FAR pair first (shaded, slightly higher/shorter) so near pair overlaps in front.
leg(6, 8, 18, 25, 's');    // far back leg
leg(21, 23, 17, 25, 's');  // far front leg
// NEAR pair (base).
leg(9, 13, 18, 27, 'b');   // near back leg
leg(25, 29, 16, 27, 'b');  // near front leg
// Claws on the near paws (front edge of each foot).
for (const fx of [9, 25]) { put('bear_body', fx, 27, 'o'); put('bear_body', fx - 1, 26, 'o'); }
for (const fx of [13, 29]) { put('bear_body', fx, 27, 'o'); }

// ---- Shading bands ----
// Back highlight: the row just under the top contour, along back + hump.
for (let x = 6; x <= 33; x++) { const y = Ty[x] + 1; if (get('bear_body', x, y) === 'b') put('bear_body', x, y, 'h'); }
// Underbelly shade: the row just above the bottom contour across the trunk.
for (let x = 8; x <= 24; x++) { const y = By[x] - 1; if (get('bear_body', x, y) === 'b') put('bear_body', x, y, 's'); }

// ---- Automatic outline pass: any body cell touching empty space → 'o' ----
const snapshot = Object.keys(layers.bear_body).map((k) => k.split(',').map(Number));
for (const [x, y] of snapshot) {
  const empty = (xx, yy) => xx < 0 || xx >= W || yy < 0 || yy >= H || !get('bear_body', xx, yy);
  if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)) put('bear_body', x, y, 'o');
}

// ---- Eye (glow), deep-set on the head, just behind the snout. ----
put('bear_eyes', 32, 9, 'b'); put('bear_eyes', 33, 9, 'h');

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
emit('bear_body');
emit('bear_eyes');
