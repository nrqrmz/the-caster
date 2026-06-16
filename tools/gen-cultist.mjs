// High-craft cultist: a menacing hooded figure, multi-hue via per-part palettes.
// robe/hood = creature's type color; face = deep shadow; eyes = glow; staff = wood + ember.
// Emits parts to splice/preview. Run: node tools/gen-cultist.mjs
const N = 32, cx = 16;
const layers = { hood: {}, robe: {}, face: {}, eyes: {}, staff: {}, ember: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

// ---------- ROBE: long flowing robe, shoulders y15 -> tattered hem y31 ----------
for (let y = 15; y <= 31; y++) {
  const t = (y - 15) / 16, half = 5 + t * 6.5;
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 's';                 // left rim shade
    else if (x >= R - 2) r = 's';                 // right side in shadow
    // vertical fold shadows
    if (Math.abs(x - (cx - half * 0.45)) < 0.7 || Math.abs(x - (cx + half * 0.4)) < 0.7) r = 's';
    if (Math.abs(x - cx) < 0.7 && y < 28) r = 'h';// center sheen
    put('robe', x, y, r);
  }
}
// tattered hem (poke holes on the bottom edge)
for (const x of [cx - 9, cx - 5, cx, cx + 5, cx + 9]) { put('robe', x, 31, '.'); put('robe', x, 30, x === cx ? '.' : 's'); }
// wide sleeves / arms suggested at the sides
for (let y = 16; y <= 23; y++) { put('robe', cx - 7 - ((y - 16) / 3 | 0), y, 'o'); put('robe', cx + 7 + ((y - 16) / 3 | 0), y, 'o'); }
// clasped hands at center (lighter)
for (let y = 21; y <= 23; y++) for (let x = cx - 2; x <= cx + 2; x++) put('robe', x, y, y === 21 ? 'h' : 'b');

// ---------- HOOD: tall pointed cowl framing the face ----------
for (let y = 2; y <= 16; y++) {
  const half = Math.min(8, 1.2 + (y - 2) * 0.9);
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';                 // lit left edge of the cowl
    else if (x >= R - 2) r = 's';                 // shadowed right
    if (y <= 3) r = 'o';                          // peak
    put('hood', x, y, r);
  }
}
// carve the face opening out of the hood (so the face/eyes show through)
for (let y = 9; y <= 16; y++) for (let x = 11; x <= 21; x++)
  if (((x - cx) / 5) ** 2 + ((y - 12.5) / 4) ** 2 <= 1) delete layers.hood[`${x},${y}`];

// ---------- FACE: deep shadow cavity inside the hood ----------
for (let y = 9; y <= 16; y++) for (let x = 11; x <= 21; x++)
  if (((x - cx) / 4.6) ** 2 + ((y - 12.5) / 3.7) ** 2 <= 1) put('face', x, y, y >= 14 ? 'o' : 'b'); // 'b' here = dark face palette base

// ---------- EYES: two glowing slits ----------
for (const x of [cx - 2, cx + 2]) { put('eyes', x, 12, 'h'); put('eyes', x, 12, 'h'); put('eyes', x - 0, 12, 'b'); }
put('eyes', cx - 2, 12, 'h'); put('eyes', cx + 2, 12, 'h');

// ---------- STAFF: dark rod on the right + glowing ember orb ----------
for (let y = 9; y <= 30; y++) { put('staff', 25, y, 'o'); put('staff', 26, y, 'b'); }
for (let y = 4; y <= 9; y++) for (let x = 23; x <= 28; x++) {
  const d = ((x - 25.5) / 3) ** 2 + ((y - 6.5) / 2.8) ** 2;
  if (d <= 1) put('ember', x, y, d > 0.55 ? 'b' : 'h');     // ember orb (glow palette)
}

// ---------- emit ----------
function emit(name, pretty) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${pretty}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
emit('staff', 'cult_staff');
emit('ember', 'cult_ember');
emit('robe', 'cult_robe');
emit('hood', 'cult_hood');
emit('face', 'cult_face');
emit('eyes', 'cult_eyes');
