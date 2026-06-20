// Great Feline (Céfalo felino) — side profile, 32-grid.
// Serves: cefalo_felino (panther boss, size 96, baseColor 0x5d4037, flip:true → faces left).
//
// Design: A LARGE SLEEK PANTHER. Key differences from both lobo and lelaps:
//   - LOW CROUCHING CAT BODY: much lower-slung than either dog (cats pad rather than trot)
//   - LONG CURVING TAIL: thick at base, curving up and over in a relaxed feline arc
//   - FELINE HEAD: SHORT ROUNDED EARS (NOT erect wolf ears, NOT drop hound ears)
//     Wide rounded cat skull, short flat nose, broad cheeks — unmistakably feline
//   - FELINE PAW STANCE: padding stance with thick paws, not hound long-legs stride
//   - MUSCULAR LOW BODY: panther proportions — long body, deep chest, compact stride
//   - Glowing eyes (glow palette)
//
// Parts: feline_body, feline_legs, feline_head, feline_eyes (glow).
// Run: node tools/gen-feline.mjs

const N = 32, cx = 16;
const layers = {
  feline_body: {},
  feline_legs: {},
  feline_head: {},
  feline_eyes: {},
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

// ============================ FELINE_BODY ============================
// LOW, MUSCULAR panther body: much lower-slung than the hound.
// Per-column contour for precise cat silhouette.
// Profile facing RIGHT: head at right, tail at left.

// TOP contour: low back, flat/level (cats are horizontal, no arched back of greyhound)
// The panther body sits at y=14..22 approximately — LOWER than the hound.
const Ty = {
  3: 17, 4: 16, 5: 15, 6: 14, 7: 14, 8: 14, 9: 14, 10: 14, 11: 14, 12: 14,
  // Slight shoulder rise
  13: 13, 14: 13, 15: 13, 16: 13,
  // Neck drop
  17: 14, 18: 14, 19: 13, 20: 12,
  // Head rise
  21: 12, 22: 11,
};

// BOTTOM contour: higher up (cat belly doesn't droop, tucked belly)
const By = {
  3: 19, 4: 19,
  5: 20, 6: 21, 7: 21, 8: 21,
  // Belly tuck for padded stance (less extreme than greyhound but still athletic)
  9: 21, 10: 21, 11: 21, 12: 20, 13: 19,
  // Deep chest
  14: 22, 15: 22, 16: 22,
  // Chest front
  17: 21, 18: 20, 19: 19, 20: 17,
  // Throat area
  21: 16, 22: 16,
};

// Fill trunk
for (let x = 3; x <= 22; x++) {
  const t = Ty[x], b = By[x];
  if (t == null || b == null) continue;
  for (let y = t; y <= b; y++) put('feline_body', x, y, 'b');
}

// LONG CURVING FELINE TAIL — the key cat silhouette marker.
// The tail is LONG and THICK at the base, curves upward in a gentle arc then tips over.
// This is very different from the wolf's bushy tail or the hound's thin whip.
// Tail base at rump (x3-4), curves up (x2-0), arcs right (tips over to x3-5).
line('feline_body', 4, 18, 2, 15, 'b');
line('feline_body', 2, 15, 1, 12, 'b');
line('feline_body', 1, 12, 1,  9, 'b');  // vertical curl
line('feline_body', 1,  9, 2,  7, 'b');  // curl tip starting rightward
line('feline_body', 2,  7, 4,  6, 'b');  // hook of the tail tip
put('feline_body', 4,  6, 'h');           // tail tip highlight
put('feline_body', 5,  6, 'h');
// Tail thickness (it's a thick panther tail, not a thin wire)
line('feline_body', 3, 18, 1, 14, 'b');
line('feline_body', 0, 13, 0, 10, 'b');
put('feline_body', 0, 13, 'o');
put('feline_body', 0, 10, 'o');
line('feline_body', 1, 10, 2,  8, 'b');
// Tail outline (outer edge)
put('feline_body', 5, 7, 'o');  // tip outline
put('feline_body', 3, 5, 'o');
// Tail shading (underside)
line('feline_body', 2, 15, 2, 12, 's');

// Back highlight (dorsal line)
for (let x = 5; x <= 19; x++) {
  const t = Ty[x];
  if (t != null) put('feline_body', x, t + 1, 'h');
}
// Belly shade (underbelly)
for (let x = 6; x <= 12; x++) {
  const b = By[x];
  if (b != null) put('feline_body', x, b - 1, 's');
}

// Automatic outline pass
const bodyKeys = Object.keys(layers.feline_body).map(k => k.split(',').map(Number));
for (const [x, y] of bodyKeys) {
  const get = (xx, yy) => layers['feline_body'][`${xx},${yy}`];
  const empty = (xx, yy) => xx < 0 || xx >= N || yy < 0 || yy >= N || !get(xx, yy);
  if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))
    put('feline_body', x, y, 'o');
}

// ============================ FELINE_LEGS ============================
// PADDED STANCE — four thick cat paws in a padding walk (not a running stride).
// Key distinction from the hound: legs are SHORTER and THICKER (compact, not stretched).
// The panther is LOW to the ground; legs don't extend as far.

// Back legs (left side) — compact, pawing position
// Far back leg (shade)
for (let y = 21; y <= 26; y++) put('feline_legs',  5, y, 's');
put('feline_legs',  4, 27, 's');
put('feline_legs',  5, 27, 's');
put('feline_legs',  6, 27, 'o');  // paw
// Near back leg (forward of far)
for (let y = 21; y <= 26; y++) {
  put('feline_legs', 7, y, 'b');
  put('feline_legs', 8, y, 'b');
}
// Thick cat paw (wide, padded)
put('feline_legs',  6, 27, 'o');
put('feline_legs',  7, 27, 'b');
put('feline_legs',  8, 27, 'b');
put('feline_legs',  9, 27, 'b');
put('feline_legs', 10, 27, 'o');
put('feline_legs',  7, 28, 'o');  // paw pad outline
put('feline_legs',  8, 28, 'b');
put('feline_legs',  9, 28, 'o');

// Front legs (right side) — slightly more extended forward (padding walk)
// Far front leg (shade)
for (let y = 22; y <= 26; y++) put('feline_legs', 18, y, 's');
put('feline_legs', 17, 27, 's');
put('feline_legs', 18, 27, 's');
put('feline_legs', 19, 27, 'o');
// Near front leg
for (let y = 22; y <= 26; y++) {
  put('feline_legs', 20, y, 'b');
  put('feline_legs', 21, y, 'b');
}
// Thick cat paw
put('feline_legs', 19, 27, 'o');
put('feline_legs', 20, 27, 'b');
put('feline_legs', 21, 27, 'b');
put('feline_legs', 22, 27, 'b');
put('feline_legs', 23, 27, 'o');
put('feline_legs', 20, 28, 'o');  // paw pad
put('feline_legs', 21, 28, 'b');
put('feline_legs', 22, 28, 'o');

// ============================ FELINE_HEAD ============================
// FELINE HEAD in profile facing RIGHT.
// Key features:
//   - WIDE ROUND SKULL (cats have broader heads relative to snout)
//   - SHORT FLAT SNOUT (panther = short muzzle, NOT long like the hound)
//   - SMALL ROUNDED EARS (NOT erect triangles, NOT drop hound ears)
//     Rounded cat ears = unmistakably feline
//   - Prominent whisker area

// Wide round skull
disk('feline_head', 22, 16, 4.5, 'b');
// Outline skull
for (let x = 17; x <= 27; x++) {
  for (let y = 11; y <= 21; y++) {
    const d = ((x - 22) / 4.5) ** 2 + ((y - 16) / 4.5) ** 2;
    if (d > 0.88 && d <= 1.0) put('feline_head', x, y, 'o');
  }
}

// SHORT CAT SNOUT — much shorter than the hound (greyhound long muzzle).
// Panther has a compact, powerful jaw.
for (let y = 17; y <= 19; y++) {
  put('feline_head', 26, y, 'b');
  put('feline_head', 27, y, 'b');
  put('feline_head', 28, y, (y === 17 || y === 19) ? 'o' : 'b');
}
// Cat nose (wide, flat, at end of snout)
put('feline_head', 27, 17, 'o');
put('feline_head', 28, 17, 'o');
put('feline_head', 28, 18, 's');  // nostril
put('feline_head', 29, 17, 'o');
put('feline_head', 29, 18, 'o');
// Chin/jaw
put('feline_head', 26, 20, 'o');
put('feline_head', 27, 20, 'o');

// ROUNDED EARS — small, low-set on the wide skull.
// NOT pointed triangles like a wolf. NOT drooping like a hound.
// Small stubby rounded ear shapes.
// Front ear (more prominent)
put('feline_head', 22, 11, 'b');
put('feline_head', 23, 11, 'b');
put('feline_head', 22, 10, 'b');
put('feline_head', 23, 10, 'b');
put('feline_head', 21, 11, 'o');  // ear outline
put('feline_head', 22,  9, 'o');  // ear top (ROUNDED not pointed)
put('feline_head', 23,  9, 'o');
put('feline_head', 24, 10, 'o');
put('feline_head', 24, 11, 'o');
// Back ear (partially visible)
put('feline_head', 19, 12, 'b');
put('feline_head', 20, 12, 'b');
put('feline_head', 19, 11, 'o');
put('feline_head', 20, 11, 'b');
put('feline_head', 20, 10, 'o');
put('feline_head', 21, 11, 'o');

// Head highlights
for (let x = 20; x <= 24; x++) put('feline_head', x, 12, 'h');  // crown highlight
// Cheek shade (broad cheeks = feline)
for (let x = 18; x <= 21; x++) put('feline_head', x, 17, 's');  // cheek shade
// Neck shading
put('feline_head', 17, 16, 's');
put('feline_head', 17, 17, 's');
put('feline_head', 18, 18, 's');

// ============================ FELINE_EYES (glow palette) ============================
// Glowing eyes — slightly forward-set on the feline head
put('feline_eyes', 24, 14, 'h');  // top glow
put('feline_eyes', 24, 15, 'b');  // main eye
put('feline_eyes', 25, 15, 'h');  // glow right
put('feline_eyes', 25, 14, 'h');  // glow highlight

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

emit('feline_body');
emit('feline_legs');
emit('feline_head');
emit('feline_eyes');
