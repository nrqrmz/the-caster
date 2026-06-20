// Thorn Totem silhouette — front-facing, 32-grid.
// Serves: totem_espinas (barkBrown 0x6d4c41, size 64).
// Silhouette: a tall carved vertical COLUMN (stone/wood totem pole) bristling
//   with sharp THORNS jutting from its sides along its length. A carved hollow
//   FACE with shadow eyes and a central glowing eye. NOT humanoid — a totem pole.
//
// Parts authored:
//   thorntotem_body  — tall rectangular column/pillar with top capstone and base.
//                      'b' base, 's' shade right side, 'h' highlight left side, 'o' outline.
//   thorntotem_face  — carved hollow face on the column (sunken eyes, gaping mouth).
//                      palette: shadow. The face is carved INTO the stone, so shadow roles
//                      read darker (recessed).
//   thorntotem_thorns — sharp spike/thorn shapes jutting from the sides of the column.
//                       palette: bone (ivory thorn color). Sharp triangular protrusions.
//   thorntotem_eye   — one central glowing eye on the face (palette: sporeglow).
// Run: node tools/gen-thorntotem.mjs

const N = 32, cx = 16;
const layers = {
  thorntotem_body:   {},
  thorntotem_face:   {},
  thorntotem_thorns: {},
  thorntotem_eye:    {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// Helper: fill a rectangle with shading
function rect(L, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let r = 'b';
      if (y === y0 || y === y1 || x === x0 || x === x1) r = 'o';
      else if (x === x0 + 1) r = 'h';
      else if (x === x1 - 1) r = 's';
      put(L, x, y, r);
    }
  }
}

// ============================ THORNTOTEM_BODY (tall column / totem pole) ============================
// The column is tall and narrow: cx-4 to cx+4 (9px wide), spanning y=2..30.
// It has a wider capstone at the top and a wider base plinth at the bottom.

// 1. Capstone (top, wider, carved): wider crown at top
for (let y = 2; y <= 5; y++) {
  for (let x = cx - 6; x <= cx + 6; x++) {
    let r = 'b';
    if (y === 2 || y === 5 || x === cx - 6 || x === cx + 6) r = 'o';
    else if (x === cx - 5) r = 'h';
    else if (x === cx + 5) r = 's';
    put('thorntotem_body', x, y, r);
  }
}
// Capstone top point / peak
put('thorntotem_body', cx - 2, 1, 'o');
put('thorntotem_body', cx - 1, 1, 'b');
put('thorntotem_body', cx,     1, 'h');
put('thorntotem_body', cx + 1, 1, 'b');
put('thorntotem_body', cx + 2, 1, 'o');
put('thorntotem_body', cx,     0, 'o');    // top spike of capstone

// 2. Main column shaft: narrow rectangular column
rect('thorntotem_body', cx - 4, 5, cx + 4, 27);

// 3. Base plinth (bottom, wider, heavy)
for (let y = 27; y <= 31; y++) {
  for (let x = cx - 6; x <= cx + 6; x++) {
    let r = 'b';
    if (y === 27 || y === 31 || x === cx - 6 || x === cx + 6) r = 'o';
    else if (x === cx - 5) r = 'h';
    else if (x === cx + 5) r = 's';
    put('thorntotem_body', x, y, r);
  }
}

// 4. Wood grain / carved texture lines on the column (horizontal marks)
put('thorntotem_body', cx - 3, 9, 's');
put('thorntotem_body', cx - 2, 9, 's');
put('thorntotem_body', cx - 3, 14, 's');
put('thorntotem_body', cx - 2, 14, 's');
put('thorntotem_body', cx - 3, 20, 's');
put('thorntotem_body', cx - 2, 20, 's');

// ============================ THORNTOTEM_FACE (shadow palette — carved hollow face) ============================
// A carved face SUNK INTO the column. Uses shadow palette (very dark, recessed).
// The face occupies the middle section of the column (y=8..18).

// Brow ridge (dark carved arch)
line('thorntotem_face', cx - 3, 8, cx + 3, 8, 'o');

// Eye sockets (hollow carved pits) — recessed rectangular pits
put('thorntotem_face', cx - 3, 9, 'o');
put('thorntotem_face', cx - 2, 9, 'b');    // left eye socket
put('thorntotem_face', cx - 3, 10, 'o');
put('thorntotem_face', cx - 2, 10, 'b');
put('thorntotem_face', cx - 3, 11, 'o');

put('thorntotem_face', cx + 2, 9, 'b');    // right eye socket
put('thorntotem_face', cx + 3, 9, 'o');
put('thorntotem_face', cx + 2, 10, 'b');
put('thorntotem_face', cx + 3, 10, 'o');
put('thorntotem_face', cx + 3, 11, 'o');

// Nose ridge (central carved line)
put('thorntotem_face', cx,     12, 'b');
put('thorntotem_face', cx,     13, 'b');
put('thorntotem_face', cx - 1, 13, 's');
put('thorntotem_face', cx + 1, 13, 's');

// Mouth — carved gaping slot (wide, dark)
for (let x = cx - 3; x <= cx + 3; x++) {
  put('thorntotem_face', x, 15, 'o');
  put('thorntotem_face', x, 16, 'b');
  put('thorntotem_face', x, 17, 's');
}
put('thorntotem_face', cx - 3, 15, 'o');
put('thorntotem_face', cx + 3, 15, 'o');
put('thorntotem_face', cx - 3, 16, 'o');
put('thorntotem_face', cx + 3, 16, 'o');
put('thorntotem_face', cx - 3, 17, 'o');
put('thorntotem_face', cx + 3, 17, 'o');

// Carved chin ridge below mouth
line('thorntotem_face', cx - 3, 18, cx + 3, 18, 's');

// ============================ THORNTOTEM_THORNS (bone palette — jutting thorns) ============================
// Sharp thorn/spike shapes protruding from each side of the column.
// Each thorn is a short sharp triangle: base on the column edge, tip pointing outward.
// Thorns go along the column in pairs (left and right), at regular intervals.
// Using 'b' for the bone body and 'o' for the tip outline.

// Upper thorns (near top, y=7..8)
put('thorntotem_thorns', cx - 6, 7, 'b');
put('thorntotem_thorns', cx - 7, 7, 'o');    // left upper thorn tip
put('thorntotem_thorns', cx - 5, 8, 'b');
put('thorntotem_thorns', cx - 6, 8, 'o');

put('thorntotem_thorns', cx + 5, 7, 'b');
put('thorntotem_thorns', cx + 6, 7, 'o');    // right upper thorn tip
put('thorntotem_thorns', cx + 4, 8, 'b');
put('thorntotem_thorns', cx + 5, 8, 'o');

// Mid-upper thorns (y=11..13) — longer, more prominent
put('thorntotem_thorns', cx - 5, 11, 'b');
put('thorntotem_thorns', cx - 6, 11, 'b');
put('thorntotem_thorns', cx - 7, 12, 'o');   // left mid thorn tip (longer)
put('thorntotem_thorns', cx - 5, 12, 'b');
put('thorntotem_thorns', cx - 6, 12, 'b');
put('thorntotem_thorns', cx - 5, 13, 'b');
put('thorntotem_thorns', cx - 6, 13, 'o');

put('thorntotem_thorns', cx + 4, 11, 'b');
put('thorntotem_thorns', cx + 5, 11, 'b');
put('thorntotem_thorns', cx + 6, 12, 'o');   // right mid thorn tip (longer)
put('thorntotem_thorns', cx + 4, 12, 'b');
put('thorntotem_thorns', cx + 5, 12, 'b');
put('thorntotem_thorns', cx + 4, 13, 'b');
put('thorntotem_thorns', cx + 5, 13, 'o');

// Mid-lower thorns (y=19..21)
put('thorntotem_thorns', cx - 6, 19, 'b');
put('thorntotem_thorns', cx - 7, 19, 'o');   // left lower-mid thorn
put('thorntotem_thorns', cx - 5, 20, 'b');
put('thorntotem_thorns', cx - 6, 20, 'o');
put('thorntotem_thorns', cx - 6, 21, 'b');
put('thorntotem_thorns', cx - 8, 20, 'o');   // extreme tip

put('thorntotem_thorns', cx + 5, 19, 'b');
put('thorntotem_thorns', cx + 6, 19, 'o');   // right lower-mid thorn
put('thorntotem_thorns', cx + 4, 20, 'b');
put('thorntotem_thorns', cx + 5, 20, 'o');
put('thorntotem_thorns', cx + 5, 21, 'b');
put('thorntotem_thorns', cx + 7, 20, 'o');

// Lower thorns (y=24..25)
put('thorntotem_thorns', cx - 5, 24, 'b');
put('thorntotem_thorns', cx - 6, 24, 'o');   // left lower thorn
put('thorntotem_thorns', cx - 5, 25, 'o');

put('thorntotem_thorns', cx + 4, 24, 'b');
put('thorntotem_thorns', cx + 5, 24, 'o');   // right lower thorn
put('thorntotem_thorns', cx + 4, 25, 'o');

// ============================ THORNTOTEM_EYE (sporeglow palette — central glowing eye) ============================
// A single central glowing eye (sporeglow = sickly green) on the face of the totem.
// Centered on the column face (cx, y=10).
put('thorntotem_eye', cx - 1, 10, 'b');
put('thorntotem_eye', cx,     10, 'b');
put('thorntotem_eye', cx + 1, 10, 'b');
put('thorntotem_eye', cx - 1,  9, 'h');
put('thorntotem_eye', cx,      9, 'h');    // glow halo above
put('thorntotem_eye', cx + 1,  9, 'h');
put('thorntotem_eye', cx,     11, 'h');    // glow below

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

emit('thorntotem_body');
emit('thorntotem_face');
emit('thorntotem_thorns');
emit('thorntotem_eye');
