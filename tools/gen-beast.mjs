// High-craft FIRE beasts, each a distinct designed creature (per-creature silhouette):
//   can_lava     — lean lava hound, horns + molten mane + fangs (charges)
//   coloso_magma — massive hunched magma brute, horns + glowing core (shielded)
// Body takes the creature's type color (recipe palette, no override); cracks/crest/
// core use 'ember', eyes 'glow', horns 'charcoal'. Emits parts. Run: node tools/gen-beast.mjs
const N = 32, cx = 16;
const layers = {
  can_body: {}, can_glow: {}, can_horns: {}, can_eyes: {},
  coloso_body: {}, coloso_core: {}, coloso_horns: {}, coloso_eyes: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

// Fill an ellipse with a rim outline, upper-left highlight, lower-right shade.
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
const line = (L, x0, y0, x1, y1, r) => {       // simple Bresenham-ish stroke
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
};
// A tapered conical horn from base (bx,by) to tip (tx,ty): thick at the base
// (baseW px each side), narrowing to a 1px point. Outline edges, base fill.
function horn(L, bx, by, tx, ty, baseW) {
  const steps = Math.max(Math.abs(tx - bx), Math.abs(ty - by));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(bx + (tx - bx) * t), y = Math.round(by + (ty - by) * t);
    const w = Math.round(baseW * (1 - t));
    for (let d = -w; d <= w; d++) put(L, x + d, y, (Math.abs(d) === w && w > 0) ? 'o' : 'b');
    if (w === 0) put(L, x, y, 'o');
  }
}

// ============================ CAN_LAVA (lava hound, SIDE PROFILE facing left) ============================
blob('can_body', 18, 17, 7.5, 5);                         // torso
blob('can_body', 9, 13, 4.2, 3.6);                        // head
for (let y = 12; y <= 16; y++) for (let x = 3; x <= 7; x++) put('can_body', x, y, (y === 16 || x === 3) ? 'o' : 'b'); // muzzle
for (let y = 13; y <= 19; y++) for (let x = 11; x <= 15; x++) put('can_body', x, y, 'b'); // neck/chest filler
// 4 legs (front pair x11/x15, back pair x21/x25) + paws
for (const lx of [11, 15, 21, 25]) for (let y = 21; y <= 28; y++) for (let x = lx; x <= lx + 1; x++) put('can_body', x, y, (x === lx || y === 28) ? 'o' : 'b');
for (const px of [10, 14, 20, 24]) put('can_body', px, 28, 'h'); // paws/claws
// tail sweeping up-right
line('can_body', 25, 14, 29, 9, 'o'); line('can_body', 25, 15, 29, 10, 'b'); put('can_body', 28, 9, 'h');
// two FILLED cow-horns anchored on the skull, swept up-and-back (bone palette)
horn('can_horns', 8, 11, 12, 5, 2);
horn('can_horns', 11, 12, 15, 7, 2);
// molten mane along the back + body cracks
for (let x = 10; x <= 22; x++) put('can_glow', x, 12, (x % 3 === 0) ? 'h' : 'a');
for (let x = 13; x <= 22; x += 4) line('can_glow', x, 14, x + 1, 19, 'a');
// glowing eye + fangs at the snout
put('can_eyes', 8, 12, 'h'); put('can_eyes', 7, 12, 'b');
put('can_body', 4, 16, 'h'); put('can_body', 6, 16, 'h');

// ============================ COLOSO_MAGMA (brute) ============================
blob('coloso_body', cx, 18, 8.5, 8);                      // massive torso
blob('coloso_body', cx - 8, 16, 3.2, 4.2);                // left shoulder/arm
blob('coloso_body', cx + 8, 16, 3.2, 4.2);                // right shoulder/arm
blob('coloso_body', cx, 9, 3.2, 3);                       // small head between shoulders
for (let y = 24; y <= 29; y++) for (const lx of [cx - 5, cx + 2]) for (let x = lx; x <= lx + 3; x++) put('coloso_body', x, y, (y === 29 || x === lx) ? 'o' : 'b'); // legs
// fists
blob('coloso_body', cx - 9, 22, 2.4, 2.4); blob('coloso_body', cx + 9, 22, 2.4, 2.4);
// glowing molten core in the chest + cracks
blob('coloso_core', cx, 18, 3.4, 3.4, 'a');
for (const [x0, y0, x1, y1] of [[cx, 14, cx - 4, 9], [cx, 14, cx + 4, 10], [cx, 22, cx - 5, 26], [cx, 22, cx + 5, 26]]) line('coloso_core', x0, y0, x1, y1, 'a');
// short thick bull-horns jutting up-and-OUT from the temples (charcoal) — not vertical
horn('coloso_horns', cx - 2, 9, cx - 6, 5, 2);
horn('coloso_horns', cx + 2, 9, cx + 6, 5, 2);
put('coloso_eyes', cx - 1, 9, 'h'); put('coloso_eyes', cx + 1, 9, 'h');

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
for (const k of Object.keys(layers)) emit(k);
