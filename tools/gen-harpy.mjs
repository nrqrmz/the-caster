// Harpy silhouette — front-facing, 32-grid.
// Serves: arpia (winged humanoid bird-woman, size 32, plum 0x8e24aa).
//
// Parts authored:
//   harpy_wings — large feathered wings spread wide behind the body (back layer).
//                 Fan of feather-lines from each shoulder; 'b' fill, 'h'/'s' shading,
//                 'o' outline/feather-tips. Feathers fan from shoulder to 3 tip points.
//   harpy_body  — humanoid torso + clawed bird legs. Torso is a slim blob; lower body
//                 tapers to two visible talon-feet. 'b' base, 's' shade, 'h' highlight, 'o' outline.
//   harpy_head  — round head + fierce-expression face + feather crest on top.
//                 Thin beak, visible brow-ridge, crest plumes above head.
//   harpy_eyes  — two glowing eyes (palette: glow). Overlaid on face.
// Run: node tools/gen-harpy.mjs

const N = 32, cx = 16;
const layers = {
  harpy_wings: {},
  harpy_body:  {},
  harpy_head:  {},
  harpy_eyes:  {},
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

// ============================ HARPY_WINGS (feathered, spread behind body) ============================
// Each wing fans from the shoulder outward. Feathered by drawing multiple feather quill lines
// with slight spread, and 'o' at tips. Wings span most of the 32-wide grid.
// Shoulder anchor: (cx ± 3, y=14). Three tip points fanning upward and outward.

for (const s of [-1, 1]) {
  const shx = cx + s * 3, shy = 14;   // shoulder / wing root

  // Three feather fans (upper, mid, lower tips)
  const tips = [
    [cx + s * 14, 7,  'h'],   // upper-most tip (lighter = highlight)
    [cx + s * 14, 12, 'b'],   // mid tip
    [cx + s * 11, 18, 's'],   // lower tip (shade)
  ];

  // Primary feather quill lines from shoulder to each tip
  for (const [tx, ty, role] of tips) {
    line('harpy_wings', shx, shy, tx, ty, 'b');
  }

  // Secondary feather barbs: short lines branching off the primary quills
  // Upper fan: extra feather lines fanning between upper and mid tips
  const [upX, upY] = [cx + s * 14, 7];
  const [midX, midY] = [cx + s * 14, 12];
  const [lowX, lowY] = [cx + s * 11, 18];

  // Extra feather strokes between upper and mid (feather spread)
  line('harpy_wings', shx, shy - 1, cx + s * 12, 5,  'h');   // topmost feather
  line('harpy_wings', shx, shy - 1, cx + s * 13, 9,  'b');   // upper-mid
  line('harpy_wings', shx, shy + 1, cx + s * 12, 15, 's');   // mid-low
  line('harpy_wings', shx, shy + 1, cx + s * 9,  19, 's');   // low spread

  // Wing membrane fill: small blobs along each primary quill for feather body
  for (let k = 2; k < 6; k++) {
    const frac = k / 7;
    const bx = Math.round(shx + (upX - shx) * frac);
    const by = Math.round(shy + (upY - shy) * frac);
    put('harpy_wings', bx, by, 'b');
    put('harpy_wings', bx + s, by, 'b');
  }
  for (let k = 1; k < 5; k++) {
    const frac = k / 5;
    const bx = Math.round(shx + (midX - shx) * frac);
    const by = Math.round(shy + (midY - shy) * frac);
    put('harpy_wings', bx, by, 'b');
    put('harpy_wings', bx + s, by, 'b');
  }

  // Tip outlines
  put('harpy_wings', upX, upY,   'o');
  put('harpy_wings', midX, midY, 'o');
  put('harpy_wings', lowX, lowY, 'o');
  put('harpy_wings', cx + s * 12, 5, 'o');   // topmost feather tip

  // Outline the leading edge (top): shoulder → topmost tip
  line('harpy_wings', shx - s, shy - 1, cx + s * 12, 5, 'o');
  // Outline the trailing edge (bottom): shoulder → lower tip
  line('harpy_wings', shx, shy + 1, lowX, lowY, 'o');
}

// ============================ HARPY_BODY (torso + clawed legs) ============================
// Slim humanoid torso, narrow waist, two bird-claw feet.

// Torso — narrow blob, slightly taller than wide
blob('harpy_body', cx, 15, 2.8, 3.5);

// Waist/hip transition
blob('harpy_body', cx, 20, 2.5, 1.5);

// Thighs — two short column blobs
for (const s of [-1, 1]) {
  const lx = cx + s * 2;
  // Upper leg (thigh)
  for (let y = 22; y <= 25; y++) {
    put('harpy_body', lx - 1, y, 'b');
    put('harpy_body', lx,     y, 'b');
    put('harpy_body', lx + 1, y, 'o');
  }
  // Lower leg (talon leg, narrowing)
  for (let y = 26; y <= 27; y++) {
    put('harpy_body', lx, y, 'b');
    put('harpy_body', lx, y, 'o');
  }
  // Clawed feet — three curved talons
  put('harpy_body', lx - 1, 28, 'o');   // left talon
  put('harpy_body', lx,     28, 'b');   // center toe
  put('harpy_body', lx + 1, 28, 'o');   // right talon
  put('harpy_body', lx - 1, 29, 'o');   // claw tips
  put('harpy_body', lx,     29, 'o');
  put('harpy_body', lx + 1, 29, 'o');
  // Back talon
  put('harpy_body', lx, 27, 'o');
}

// Outline the waist and hip area
for (let x = cx - 3; x <= cx + 3; x++) {
  put('harpy_body', x, 22, 'o');
}

// ============================ HARPY_HEAD (head + fierce face + feather crest) ============================
// Round head with a beak, fierce brow line, and feather crest plumes.

// Feather crest — 3 plumes rising above the head
for (const [px, pyBase, h] of [
  [cx - 2, 3,  4],   // left plume
  [cx,     1,  6],   // center plume (tallest)
  [cx + 2, 3,  4],   // right plume
]) {
  for (let k = 0; k < h; k++) {
    put('harpy_head', px, pyBase + k, k < 2 ? 'h' : 'b');
  }
  put('harpy_head', px, pyBase,     'o');   // plume tip outline
  put('harpy_head', px, pyBase + h - 1, 's'); // plume base shade
}

// Head — round blob
blob('harpy_head', cx, 10, 3.5, 3.0);

// Fierce brow ridge: a downward-angled 'o' line across the brow
for (const s of [-1, 1]) {
  line('harpy_head', cx + s * 1, 8, cx + s * 3, 9, 'o');   // angled brow
}

// Beak — short horizontal 'o' nub at center of face (center-face position)
put('harpy_head', cx - 1, 11, 'h');   // upper beak
put('harpy_head', cx,     11, 'h');
put('harpy_head', cx + 1, 11, 'h');
put('harpy_head', cx - 1, 12, 'o');   // lower beak outline
put('harpy_head', cx,     12, 'o');
put('harpy_head', cx + 1, 12, 'o');

// ============================ HARPY_EYES (glow palette overlay) ============================
// Two small glowing eyes just above the beak.
put('harpy_eyes', cx - 2, 9, 'b');   // left eye
put('harpy_eyes', cx + 2, 9, 'b');   // right eye

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

emit('harpy_wings');
emit('harpy_body');
emit('harpy_head');
emit('harpy_eyes');
