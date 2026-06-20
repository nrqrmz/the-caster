// Circe Entronizada — final temple boss, seated on a majestic stone-and-gold throne
// with vegetal motifs, enveloped by an unreachable green force-field. Front-facing, 32-grid.
// Serves: circe (boss nv8 templeboss, size 128, sporeViolet 0x8e24aa gown).
//
// Layer order (back → front):
//   circe_throne (petrified) → circe_throne_gold (gold) → circe_staff (wood) → circe_orb (sporeglow)
//   → circe_gown (baseColor) → circe_hair (blackhair) → circe_skin (skin) → circe_crown (glow)
//   → circe_field (sporeglow, drawn last = barrier in front)
//
// Run: node tools/gen-circe.mjs

const N = 32, cx = 16;
const layers = {
  circe_throne:      {},
  circe_throne_gold: {},
  circe_staff:       {},
  circe_orb:         {},
  circe_gown:        {},
  circe_hair:        {},
  circe_skin:        {},
  circe_crown:       {},
  circe_field:       {},
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
function span(L, y, x0, x1, role = 'b', edge = true) {
  for (let x = x0; x <= x1; x++) put(L, x, y, (edge && (x === x0 || x === x1)) ? 'o' : role);
}
function outlinePass(L) {
  const keys = Object.keys(layers[L]).map(k => k.split(',').map(Number));
  const get = (xx, yy) => layers[L][`${xx},${yy}`];
  const empty = (xx, yy) => xx < 0 || xx >= N || yy < 0 || yy >= N || !get(xx, yy);
  for (const [x, y] of keys)
    if (get(x, y) !== 'o' && (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1)))
      put(L, x, y, 'o');
}

// ============================ CIRCE_THRONE (petrified stone) ============================
// Tall arched backrest, armrests, seat, throne legs, broad stepped dais.
// Arch top (pointed)
span('circe_throne', 1, 14, 18, 'b', false);
span('circe_throne', 2, 12, 20, 'b', false);
span('circe_throne', 3, 10, 22, 'b', false);
// Backrest slab (its centre is later covered by Circe; the sides frame her)
for (let y = 4; y <= 22; y++) span('circe_throne', y, 7, 25, 'b', false);
// Tall side pillars rising above the arch
for (let y = 0; y <= 4; y++) for (const px of [7, 8, 24, 25]) put('circe_throne', px, y, 'b');
// Armrests (protruding sides) + front posts
for (let y = 15; y <= 16; y++) { span('circe_throne', y, 4, 7, 'b', false); span('circe_throne', y, 25, 28, 'b', false); }
for (let y = 15; y <= 21; y++) for (const px of [4, 5, 27, 28]) put('circe_throne', px, y, 'b');
// Seat
for (let y = 20; y <= 22; y++) span('circe_throne', y, 6, 26, 'b', false);
// Throne legs (seat → dais)
for (let y = 22; y <= 26; y++) { span('circe_throne', y, 6, 8, 'b', false); span('circe_throne', y, 24, 26, 'b', false); }
// Stepped dais (broad, majestic base)
const steps = [[26, 5, 27], [27, 5, 27], [28, 3, 29], [29, 3, 29], [30, 1, 31], [31, 1, 31]];
for (const [y, x0, x1] of steps) span('circe_throne', y, x0, x1, 'b', false);
// Stone lighting: highlight left columns + step tops, shade right columns + step fronts
for (let y = 4; y <= 22; y++) { put('circe_throne', 7, y, 'h'); put('circe_throne', 8, y, 'h'); put('circe_throne', 24, y, 's'); put('circe_throne', 25, y, 's'); }
for (const [y, x0, x1] of steps) for (let x = x0; x <= x1; x++) put('circe_throne', x, y, (y % 2 === 0) ? 'h' : 's');
outlinePass('circe_throne');

// ============================ CIRCE_THRONE_GOLD (gold trim + vegetal motifs) ============================
// Vine-leaf finials atop the side pillars
for (const px of [7, 24]) {
  put('circe_throne_gold', px, 0, 'h'); put('circe_throne_gold', px + 1, 0, 'b');
  put('circe_throne_gold', px - 1, 1, 'b'); put('circe_throne_gold', px + 2, 1, 'b');   // leaf pair
  put('circe_throne_gold', px, -0, 'h');
}
// Gold band tracing the arch edge
for (const [x, y] of [[14, 1], [15, 1], [17, 1], [18, 1], [12, 2], [20, 2], [10, 3], [22, 3]]) put('circe_throne_gold', x, y, 'b');
span('circe_throne_gold', 4, 9, 23, 'h', false);   // gold lintel under the arch
// Vegetal vines climbing the backrest sides (gold leaf nodes)
for (const y of [7, 11, 15]) {
  put('circe_throne_gold', 9, y, 'b'); put('circe_throne_gold', 8, y - 1, 'h');   // left leaf node
  put('circe_throne_gold', 23, y, 'b'); put('circe_throne_gold', 24, y - 1, 'h'); // right leaf node
}
// Armrest front scrolls (gold curls)
for (const ax of [4, 27]) { put('circe_throne_gold', ax, 14, 'h'); put('circe_throne_gold', ax + 1, 14, 'b'); put('circe_throne_gold', ax, 15, 'b'); }
// Gold trim along the seat front
span('circe_throne_gold', 22, 7, 25, 'b', false);
for (let x = 7; x <= 25; x += 2) put('circe_throne_gold', x, 22, 'h');
// Gold studs on the dais step fronts
for (const [y, x0, x1] of [[27, 6, 26], [29, 4, 28], [31, 2, 30]]) for (let x = x0; x <= x1; x += 3) put('circe_throne_gold', x, y, 'b');

// ============================ CIRCE_STAFF (wood) — leaning at her right ============================
for (let y = 6; y <= 24; y++) put('circe_staff', 26, y, 'b');
put('circe_staff', 25, 7, 'h');
put('circe_staff', 26, 24, 'o');

// ============================ CIRCE_ORB (sporeglow) — transmutation orb finial ============================
disk('circe_orb', 26, 5, 2.2, 'b');
put('circe_orb', 25, 4, 'h');
put('circe_orb', 27, 6, 's');

// ============================ CIRCE_GOWN (baseColor violet) — seated figure ============================
// Bodice (shoulders → waist)
for (let y = 8; y <= 15; y++) {
  const half = (y <= 11) ? 4 : 4 + (y - 11) * 0.5;
  span('circe_gown', y, Math.round(cx - half), Math.round(cx + half), 'b');
}
// Lap (seated, knees apart)
for (let y = 16; y <= 20; y++) span('circe_gown', y, 9, 23, 'b');
// Gown drape over the seat front, hem at y25
for (let y = 21; y <= 25; y++) span('circe_gown', y, 8, 24, 'b');
// Arms resting on the armrests
line('circe_gown', 12, 10, 6, 14, 'b'); line('circe_gown', 12, 11, 6, 15, 'b'); line('circe_gown', 11, 11, 6, 16, 'o');
line('circe_gown', 20, 10, 25, 14, 'b'); line('circe_gown', 20, 11, 25, 15, 'b'); line('circe_gown', 21, 11, 25, 16, 'o');
// Central highlight seam + fold lines
for (let y = 8; y <= 25; y++) put('circe_gown', cx, y, 'h');
line('circe_gown', 14, 17, 11, 25, 's'); line('circe_gown', 18, 17, 21, 25, 's');   // drape folds
line('circe_gown', 13, 16, 10, 24, 's'); line('circe_gown', 19, 16, 22, 24, 's');
// Side shades
for (let y = 12; y <= 25; y++) { put('circe_gown', 9, y, 's'); }

// ============================ CIRCE_HAIR (blackhair) — cascade ============================
for (let y = 3; y <= 6; y++) { const half = 3.6 - (6 - y) * 0.3; span('circe_hair', y, Math.round(cx - half), Math.round(cx + half), 'b'); }
for (let y = 7; y <= 18; y++) { put('circe_hair', 11, y, 'b'); put('circe_hair', 12, y, 'b'); put('circe_hair', 20, y, 'b'); put('circe_hair', 21, y, 'b'); }
for (let y = 8; y <= 17; y++) { put('circe_hair', 12, y, 's'); put('circe_hair', 20, y, 's'); }
for (const y of [9, 13, 17]) { put('circe_hair', 11, y, 'h'); put('circe_hair', 21, y, 'h'); }   // strand highlights

// ============================ CIRCE_SKIN (skin) — face + hands ============================
for (let y = 4; y <= 12; y++) for (let x = 12; x <= 20; x++) {
  const d = ((x - cx) / 3) ** 2 + ((y - 8) / 3.6) ** 2;
  if (d > 1) continue;
  let r = 'b';
  if (d > 0.82) r = 'o';
  else if (x <= cx - 2 && y <= 7) r = 'h';
  else if (x >= cx + 1 && y >= 9) r = 's';
  put('circe_skin', x, y, r);
}
// Eyes / nose / lips
put('circe_skin', 14, 7, 'o'); put('circe_skin', 14, 8, 's');
put('circe_skin', 18, 7, 'o'); put('circe_skin', 18, 8, 's');
put('circe_skin', cx, 9, 's');
put('circe_skin', 15, 10, 's'); put('circe_skin', cx, 10, 'h'); put('circe_skin', 17, 10, 's');
// Hands resting on the armrests
disk('circe_skin', 6, 15, 1.5, 'b'); put('circe_skin', 5, 14, 'h'); put('circe_skin', 7, 16, 's');
disk('circe_skin', 25, 15, 1.5, 'b'); put('circe_skin', 24, 14, 'h'); put('circe_skin', 26, 16, 's');

// ============================ CIRCE_CROWN (glow gold) — tall diadem + gem ============================
span('circe_crown', 3, 13, 19, 'b', false);
put('circe_crown', cx, 2, 'b'); put('circe_crown', cx, 1, 'h');   // central spire
put('circe_crown', 13, 2, 'h'); put('circe_crown', 19, 2, 'h');   // side points
put('circe_crown', cx, 3, 'a');                                   // central gem accent

// ============================ CIRCE_FIELD (sporeglow) — unreachable barrier ring ============================
// Dashed oval of energy enclosing the whole tableau (drawn last = in front).
const fcx = 16, fcy = 16, frx = 15.5, fry = 15.5;
for (let deg = 0; deg < 360; deg += 9) {
  const a = deg * Math.PI / 180;
  const x = Math.round(fcx + frx * Math.cos(a));
  const y = Math.round(fcy + fry * Math.sin(a));
  put('circe_field', x, y, (deg % 27 === 0) ? 'h' : 'b');
}
// Faint inner sparkles to read as a charged bubble
for (const [sx, sy] of [[4, 9], [28, 9], [3, 20], [29, 20], [16, 1], [16, 31]]) put('circe_field', sx, sy, 's');

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

emit('circe_throne');
emit('circe_throne_gold');
emit('circe_staff');
emit('circe_orb');
emit('circe_gown');
emit('circe_hair');
emit('circe_skin');
emit('circe_crown');
emit('circe_field');
