// Carnivorous flower silhouette — VENUS FLYTRAP / MAN-EATING FLOWER, 32-grid.
// Serves: flor_carnivora (mossGreen 0x558b2f).
// Silhouette: A thick green STEM rising from 1-2 basal LEAVES at bottom, topped by a
// bulbous flower HEAD ringed by visible PETALS opening to reveal a GAPING FANGED MAW
// (ring of sharp bone-white teeth around a dark purple/black interior cavity).
// Unmistakably reads as a flower-with-a-mouth on a real stem.
// Completely distinct from zarza (no thorns/branches), vine (no sinuous creep),
// vinecria (no flower head), AND the old version (petals now clearly separate from maw,
// stem shorter/thicker, basal leaves large and prominent).
//
// Parts authored:
//   flower_stem   — thick green stem (y18 to y30) plus two large basal leaves fanning out.
//   flower_petals — ring of 6 petals around the head (alternating 'h'/'b'/'s' for depth).
//   flower_maw    — dark oval cavity + bone-white teeth ring top and bottom.
//   flower_eyes   — two small glowing eyes inside the maw (sporeglow palette).
// Run: node tools/gen-flower.mjs

const N = 32, cx = 16;
const layers = {
  flower_stem:   {},
  flower_petals: {},
  flower_maw:    {},
  flower_eyes:   {},
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

// ============================ FLOWER_STEM (thick stem + large basal leaves) ============================
// A thick 4px-wide stem from y=18 to y=30 (tall, sturdy, not spindly).
// Two large basal leaves fanning out at the base (like a Venus flytrap ground rosette).

// Thick stem (4px wide)
for (let y = 18; y <= 30; y++) {
  put('flower_stem', cx - 2, y, 'h');   // left highlight
  put('flower_stem', cx - 1, y, 'b');
  put('flower_stem', cx,     y, 'b');
  put('flower_stem', cx + 1, y, 's');
  put('flower_stem', cx + 2, y, 'o');   // right outline
}
// Left outline
for (let y = 19; y <= 29; y++) put('flower_stem', cx - 3, y, 'o');
// Top and bottom caps
for (let x = cx - 2; x <= cx + 2; x++) put('flower_stem', x, 18, 'o');
for (let x = cx - 2; x <= cx + 2; x++) put('flower_stem', x, 30, 'o');

// BASAL LEAF LEFT — large, fans out from base toward lower-left
// A fat leaf: mid-vein + two lobes blobs
line('flower_stem', cx - 2, 27, cx - 9, 25, 'b');   // mid-vein
line('flower_stem', cx - 2, 28, cx - 9, 26, 's');
blob('flower_stem', cx - 8, 24, 3.5, 2.0);           // leaf body
put('flower_stem', cx - 11, 24, 'o');                // tip outline
put('flower_stem', cx - 11, 25, 'o');

// BASAL LEAF RIGHT — fans toward lower-right
line('flower_stem', cx + 2, 27, cx + 9, 24, 'b');   // mid-vein
line('flower_stem', cx + 2, 28, cx + 9, 25, 's');
blob('flower_stem', cx + 8, 23, 3.5, 2.0);           // leaf body
put('flower_stem', cx + 11, 23, 'o');                // tip outline
put('flower_stem', cx + 11, 24, 'o');

// ============================ FLOWER_PETALS (ring of 6 visible petals) ============================
// 6 petals arranged around the flower head center (~y=10, cx).
// Petals are elongated blobs sticking out at 6 compass directions.
// Upper 3 petals fan above; lower 3 fan below (but above the stem top at y=18).

// Center support (the receptacle / calyx — NOT the maw itself, that's flower_maw)
blob('flower_petals', cx, 11, 5.5, 6.0);  // the "head" base — petals attach here

// Petal noon (top)
blob('flower_petals', cx,     3, 2.5, 4.0);
// Petal 10 o'clock (upper-left)
blob('flower_petals', cx - 7, 5, 3.5, 2.5);
// Petal 2 o'clock (upper-right)
blob('flower_petals', cx + 7, 5, 3.5, 2.5);
// Petal 8 o'clock (lower-left)
blob('flower_petals', cx - 7, 17, 3.5, 2.5);
// Petal 4 o'clock (lower-right)
blob('flower_petals', cx + 7, 17, 3.5, 2.5);
// Petal 6 o'clock (bottom petal, between stem and head)
blob('flower_petals', cx,     19, 2.5, 2.0);

// ============================ FLOWER_MAW (dark cavity + bone teeth, palette: shadow) ============================
// A dark oval cavity in the center of the head. The maw is deliberately smaller than
// the petal ring so you can see the petals around it. Teeth line top and bottom of maw.

// Dark inner throat oval
disk('flower_maw', cx, 10, 4.8, 'b');     // outer shadow fill
disk('flower_maw', cx, 11, 3.2, 's');     // inner deeper shadow
disk('flower_maw', cx, 12, 1.8, 'h');     // tongue/back of throat highlight

// Upper TEETH row — pointed downward from the top jaw
// 5 teeth spaced across top of maw opening
const upperTeeth = [cx - 4, cx - 2, cx, cx + 2, cx + 4];
for (const tx of upperTeeth) {
  put('flower_maw', tx, 6,  'o');  // tooth tip (bone role = 'o' in this palette for sharp)
  put('flower_maw', tx, 7,  'b');  // tooth body
  put('flower_maw', tx, 8,  'b');
}
// Upper jaw border connecting teeth roots
for (let x = cx - 5; x <= cx + 5; x++) put('flower_maw', x, 5, 'o');  // top border

// Lower TEETH row — pointed upward from the bottom jaw
const lowerTeeth = [cx - 3, cx - 1, cx + 1, cx + 3];
for (const tx of lowerTeeth) {
  put('flower_maw', tx, 15, 'o');  // tooth tip
  put('flower_maw', tx, 14, 'b');  // tooth body
  put('flower_maw', tx, 13, 'b');
}
// Lower jaw border
for (let x = cx - 5; x <= cx + 5; x++) put('flower_maw', x, 16, 'o');  // bottom border

// ============================ FLOWER_EYES (palette: sporeglow) ============================
// Two small glowing eyes INSIDE the maw, above the tongue line.

put('flower_eyes', cx - 2, 9, 'b');
put('flower_eyes', cx - 1, 9, 'h');   // left eye
put('flower_eyes', cx + 2, 9, 'b');
put('flower_eyes', cx + 3, 9, 'h');   // right eye

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

emit('flower_stem');
emit('flower_petals');
emit('flower_maw');
emit('flower_eyes');
