// Wolf silhouette — side profile (facing right), 32-grid.
// Serves: lobo (wolf quadruped, size 64, flip:true so rendered facing left).
//
// Parts authored:
//   wolf_body  — elongated horizontal torso, arched back, raised neck, bushy tail sweeping upward.
//                Filled with blob; lomo ('h' highlight), belly ('s' shade); neck column; tail lines.
//   wolf_legs  — 4 slim legs: front pair x10-11, back pair x20-21, each y21..26; paws 'o' at y=26.
//   wolf_head  — canine head, snout pointing right at (23,16), alert pointed ears at y12.
//   wolf_eyes  — single amber eye at (23,15) (palette: glow).
// Run: node tools/gen-wolf.mjs

const N = 32, cx = 16;
const layers = {
  wolf_body: {},
  wolf_legs: {},
  wolf_head: {},
  wolf_eyes: {},
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

// ============================ WOLF_BODY ============================
// Main torso: horizontal ellipse, slightly arched (higher center).
// Wolf faces RIGHT; body spans roughly x6..x22, y16..y21.
blob('wolf_body', 14, 18, 7, 3.5);   // main torso

// Neck rising from front of torso toward head (right side)
for (let y = 13; y <= 18; y++) {
  put('wolf_body', 20, y, 'b');
  put('wolf_body', 21, y, 'b');
  put('wolf_body', 22, y, (y === 13 || y === 18) ? 'o' : 'b');
}
put('wolf_body', 20, 12, 'o');
put('wolf_body', 21, 12, 'o');

// Lomo (back ridge) highlight along the top of the torso
for (let x = 8; x <= 20; x++) put('wolf_body', x, 15, 'h');

// Belly shade along the bottom
for (let x = 9; x <= 20; x++) put('wolf_body', x, 21, 's');

// Bushy tail sweeping upward from the rear (left side of body, x5..x7)
line('wolf_body', 7, 17, 4, 14, 'b');
line('wolf_body', 7, 16, 3, 13, 'b');
line('wolf_body', 6, 17, 3, 14, 'o');
line('wolf_body', 5, 15, 2, 12, 'h');  // tail tip highlight
put('wolf_body', 2, 12, 'o');
put('wolf_body', 3, 11, 'o');

// ============================ WOLF_LEGS ============================
// Front pair (x10-11), back pair (x20-21), y21..26; paws at y26.
for (const lx of [10, 20]) {
  for (let y = 21; y <= 25; y++) {
    put('wolf_legs', lx,     y, 'b');
    put('wolf_legs', lx + 1, y, 'b');
  }
  // Paw outline at bottom
  put('wolf_legs', lx - 1, 26, 'o');
  put('wolf_legs', lx,     26, 'b');
  put('wolf_legs', lx + 1, 26, 'b');
  put('wolf_legs', lx + 2, 26, 'o');
}
// Stagger back legs slightly to show depth (one leg offset by 1)
for (let y = 21; y <= 26; y++) {
  put('wolf_legs', 19, y, 's');   // back-left leg shadow suggestion
}

// ============================ WOLF_HEAD ============================
// Round head, centered around x21 y15; snout protruding right to x26.
disk('wolf_head', 21, 15, 3.2, 'b');
// Outline the head
for (let x = 18; x <= 24; x++) {
  for (let y = 12; y <= 18; y++) {
    const d = ((x - 21) / 3.2) ** 2 + ((y - 15) / 3.2) ** 2;
    if (d > 0.90 && d <= 1.0) put('wolf_head', x, y, 'o');
  }
}
// Snout — horizontal muzzle block extending right
for (let y = 15; y <= 17; y++) {
  put('wolf_head', 24, y, 'b');
  put('wolf_head', 25, y, 'b');
  put('wolf_head', 26, y, 'o');
}
put('wolf_head', 24, 14, 'o');  // top of snout
put('wolf_head', 25, 14, 'o');
put('wolf_head', 24, 18, 'o');  // bottom of snout (jaw)
put('wolf_head', 25, 18, 'o');
put('wolf_head', 26, 18, 'o');
// Nostril
put('wolf_head', 26, 15, 'o');

// Pointed ears (alert wolf): two triangular ears
// Left/lower ear
put('wolf_head', 19, 12, 'b');
put('wolf_head', 19, 11, 'b');
put('wolf_head', 20, 11, 'o');
put('wolf_head', 19, 10, 'o');
// Right/leading ear
put('wolf_head', 21, 12, 'b');
put('wolf_head', 22, 12, 'b');
put('wolf_head', 22, 11, 'b');
put('wolf_head', 22, 10, 'o');
put('wolf_head', 21, 10, 'o');
// Ear interior highlights
put('wolf_head', 20, 12, 'h');
put('wolf_head', 21, 11, 'h');

// Head shading
for (let x = 18; x <= 20; x++) put('wolf_head', x, 13, 'h');  // top-left highlight
for (let x = 22; x <= 24; x++) put('wolf_head', x, 16, 's');  // lower-right shade

// ============================ WOLF_EYES ============================
// Single amber glowing eye on the right side of the head (snout-side).
put('wolf_eyes', 23, 14, 'h');  // top glow
put('wolf_eyes', 23, 15, 'b');  // main pupil

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

emit('wolf_body');
emit('wolf_legs');
emit('wolf_head');
emit('wolf_eyes');
