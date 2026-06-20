// Boar silhouette — side profile (facing right), 32-grid.
// Serves: jabali (boar quadruped, size 64, flip:true).
//
// Parts authored:
//   boar_body  — heavy BARREL torso, FATTER/rounder + LOWER/squatter, bristle ridge on back, thick neck.
//                Body shifted DOWN so the animal sits low and squat.
//   boar_legs  — 4 SHORT stout legs; shorter than before, close to ground.
//   boar_head  — broad flat snout with round disc at tip; no tusks here.
//   boar_tusks — two UPWARD-curving ivory tusks (palette: bone). Tusks sweep UP from snout, NOT down.
//   boar_eyes  — single small eye (palette: glow).
// Run: node tools/gen-boar.mjs

const N = 32, cx = 16;
const layers = {
  boar_body:  {},
  boar_legs:  {},
  boar_head:  {},
  boar_tusks: {},
  boar_eyes:  {},
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

// ============================ BOAR_BODY ============================
// FAT barrel torso: very round, LOW to the ground. Body center moved DOWN to y=20.
// rx=8 for wide girth, ry=5.5 for fat but low profile.
blob('boar_body', 12, 20, 8, 5.5);

// Thick neck connecting body to head (right side, x19..22, y16..20)
for (let y = 16; y <= 20; y++) {
  put('boar_body', 20, y, 'b');
  put('boar_body', 21, y, 'b');
  put('boar_body', 19, y, 'h');
  put('boar_body', 22, y, 'o');
}
put('boar_body', 20, 15, 'o');
put('boar_body', 21, 15, 'o');
put('boar_body', 19, 15, 'o');

// Bristle ridge along the top of the back (raised hump of stiff hair)
// Joroba/hump centered higher, covering the mid-back
for (let x = 8; x <= 18; x++) {
  put('boar_body', x, 14, 'h');   // top bristle row
  if (x % 2 === 0) put('boar_body', x, 13, 'h');  // staggered bristle tips
}
put('boar_body', 10, 12, 'h');
put('boar_body', 12, 12, 'h');
put('boar_body', 14, 12, 'h');
put('boar_body', 16, 12, 'h');

// Stubby tail at the rear
put('boar_body', 4, 19, 'b');
put('boar_body', 3, 18, 'o');
put('boar_body', 4, 17, 'o');

// ============================ BOAR_LEGS ============================
// 4 SHORT stout legs: front pair near x10, back pair near x19, but SHORTER — only y24..27.
for (const lx of [10, 19]) {
  for (let y = 24; y <= 27; y++) {
    put('boar_legs', lx,     y, 'b');
    put('boar_legs', lx + 1, y, 'b');
    if (y >= 26) {
      put('boar_legs', lx - 1, y, 'o');   // hoof outline sides
      put('boar_legs', lx + 2, y, 'o');
    }
  }
  // Hoof bottom
  put('boar_legs', lx - 1, 28, 'o');
  put('boar_legs', lx,     28, 's');
  put('boar_legs', lx + 1, 28, 's');
  put('boar_legs', lx + 2, 28, 'o');
}
// Shadow rear legs to show depth
for (let y = 24; y <= 28; y++) put('boar_legs', 18, y, 's');

// ============================ BOAR_HEAD ============================
// Broad pig-like head: large and blocky.
// Head shifted down to sit at same level as the lower body (center y=18).
blob('boar_head', 24, 18, 3.5, 3.2);

// Wide flat snout disc at the very front (rightmost)
for (let y = 17; y <= 20; y++) {
  put('boar_head', 27, y, 'b');
  put('boar_head', 28, y, 'b');
  put('boar_head', 29, y, 'o');
}
put('boar_head', 27, 16, 'o');
put('boar_head', 28, 16, 'o');
put('boar_head', 27, 21, 'o');
put('boar_head', 28, 21, 'o');
// Nostrils on the snout disc
put('boar_head', 28, 17, 'o');
put('boar_head', 28, 19, 'o');

// Small rounded ear at top of head
put('boar_head', 23, 15, 'b');
put('boar_head', 24, 14, 'b');
put('boar_head', 25, 14, 'b');
put('boar_head', 23, 14, 'o');
put('boar_head', 26, 14, 'o');
put('boar_head', 24, 13, 'o');
put('boar_head', 25, 13, 'o');

// Neck filler between head blob and body
for (let y = 16; y <= 20; y++) {
  put('boar_head', 21, y, 'b');
  put('boar_head', 22, y, 'b');
}

// ============================ BOAR_TUSKS (bone palette) ============================
// A real boar's tusk juts from the FRONT of the lower jaw (the snout is at the right,
// x≈29) and curves UP and slightly FORWARD/outward, the sharp tip pointing up-forward
// PAST the snout — NOT a long blade sweeping back over the head.
//
// Main tusk: roots at the mouth front (x29,y20) and sweeps up-and-forward to a sharp
// tip jutting ahead of the snout at (x33,y14).
put('boar_tusks', 29, 20, 'b'); put('boar_tusks', 30, 20, 'b');
put('boar_tusks', 30, 19, 'b'); put('boar_tusks', 31, 19, 'b');
put('boar_tusks', 31, 18, 'b'); put('boar_tusks', 32, 18, 'b');
put('boar_tusks', 32, 17, 'b'); put('boar_tusks', 32, 16, 'b');
put('boar_tusks', 33, 16, 'b'); put('boar_tusks', 33, 15, 'h'); // bright outer curve
put('boar_tusks', 33, 14, 'o');                                  // sharp tip
// crisp outline along the front/underside of the tusk
put('boar_tusks', 29, 21, 'o'); put('boar_tusks', 30, 21, 'o');
put('boar_tusks', 31, 20, 'o'); put('boar_tusks', 32, 19, 'o');
put('boar_tusks', 34, 15, 'o'); put('boar_tusks', 34, 16, 'o');

// Small second tusk stub just below/behind the main one (the lower canine).
put('boar_tusks', 28, 21, 'b'); put('boar_tusks', 29, 22, 'b'); put('boar_tusks', 29, 23, 'o');

// ============================ BOAR_EYES (glow palette) ============================
// Small eye on the side of the head
put('boar_eyes', 25, 16, 'h');
put('boar_eyes', 25, 17, 'b');

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

emit('boar_body');
emit('boar_legs');
emit('boar_head');
emit('boar_tusks');
emit('boar_eyes');
