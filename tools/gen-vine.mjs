// Vine silhouette — CREEPING VINE (enredadera_reptante), 32-grid.
// Serves: enredadera_reptante (vineGreen 0x33691e).
// Silhouette: A long sinuous S-curved stem creeping low and wide across the canvas,
// with broad leaves sprouting along it (leafgreen palette) and curling tendrils at the
// tips. The leading tip rears up with two glowing eyes like a snake's head.
// Clearly different from zarza (leaves not thorns; sinuous S-curve not crossed branches).
//
// Parts authored:
//   vine_body  — sinuous S-shaped stem crossing the canvas; 'b' fill, 'h' top-lit,
//                's' underside shade, 'o' outline. Stem is 2-3px thick (feels organic).
//   vine_leaves — broad oval leaves sprouting off the stem (leafgreen palette).
//                 Each leaf is a small blob, positioned alternating left/right of stem.
//   vine_eyes  — two small glowing eyes at the leading tip (glow palette).
// Run: node tools/gen-vine.mjs

const N = 32, cx = 16;
const layers = {
  vine_body:   {},
  vine_leaves: {},
  vine_eyes:   {},
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

// ============================ VINE_BODY (sinuous S-curved stem) ============================
// The stem traces an S-curve: starts at upper-right, dips to lower-center, curves back
// to upper-left. This gives a clearly sinuous, creeping silhouette (totally unlike bramble).
// Drawn as 3 segment lines, each 2px wide (parallel pairs).

// Segment A: tip/head at upper-left (y~8), sweeps right and down
line('vine_body', 3,  10, 10, 18, 'b');
line('vine_body', 4,  10, 11, 18, 'h');  // lit upper edge

// Segment B: continues sweeping right and back up (the S bend)
line('vine_body', 10, 18, 20, 13, 'b');
line('vine_body', 10, 19, 20, 14, 's');  // shaded lower edge

// Segment C: continues right and down to the tail (lower-right)
line('vine_body', 20, 13, 28, 19, 'b');
line('vine_body', 20, 14, 28, 20, 's');

// Thicken the S-curve at joints with small blobs (the stem is fleshy/organic)
disk('vine_body', 10, 18, 1.8, 'b');   // joint B
disk('vine_body', 20, 13, 1.8, 'b');   // joint C

// "Head" at the leading tip: a small rounded nub that rears up like a snake
disk('vine_body', 3, 8, 2.5, 'b');
put('vine_body', 3, 6, 'o');  // top of head nub
put('vine_body', 2, 7, 'o');
put('vine_body', 4, 7, 'o');
put('vine_body', 2, 9, 'h');  // highlight on left of head
put('vine_body', 3, 10, 's'); // shade where head meets stem

// Tail at right end: thin trailing tip
put('vine_body', 29, 20, 'o');  // curling tail tip

// Tendril at right tip: a small curl (single pixel strokes)
put('vine_body', 27, 21, 'b');
put('vine_body', 28, 22, 'o');
put('vine_body', 29, 22, 'o');
put('vine_body', 30, 21, 'o');  // will be clipped to N-1=31

// Tendril at left (behind the head): short curl upward
put('vine_body', 2,  5, 'b');
put('vine_body', 3,  4, 'o');
put('vine_body', 4,  4, 'o');
put('vine_body', 5,  5, 'o');

// ============================ VINE_LEAVES (broad leaves, leafgreen palette) ============================
// Four leaves sprouting alternately on each side of the S-curve stem.
// Each leaf = a small elongated blob, angled to follow the stem direction.

// Leaf 1: upper side of segment A, pointing upper-left
blob('vine_leaves', 5,  13, 3.5, 2.0);

// Leaf 2: lower side of segment A, pointing lower-right
blob('vine_leaves', 8,  22, 3.5, 2.0);

// Leaf 3: upper side of segment B, pointing upward
blob('vine_leaves', 15, 10, 3.0, 2.2);

// Leaf 4: lower side of segment B/C joint, pointing lower-right
blob('vine_leaves', 22, 18, 3.0, 2.0);

// ============================ VINE_EYES (glow palette — two eyes on the head nub) ============================
put('vine_eyes', 2, 7, 'b');
put('vine_eyes', 2, 8, 'h');  // left eye
put('vine_eyes', 5, 7, 'b');
put('vine_eyes', 5, 8, 'h');  // right eye

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

emit('vine_body');
emit('vine_leaves');
emit('vine_eyes');
