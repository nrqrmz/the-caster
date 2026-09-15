// High-craft floating creatures:
//   totem (pira/escarcha) — floating carved idol with a glowing eye (static); one
//     shared body serves both the fire (glow eye) and frost (orbblue eye) variants.
// Body takes the creature's type color; totem face = shadow, eye glow|orbblue. Run: node tools/gen-winged.mjs
const N = 32, cx = 16;
const layers = {
  totem_body: {}, totem_face: {}, totem_eye: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };

// ============================ TOTEM (floating carved TIKI idol; fire & frost variants) ============================
// Carved idol: a wide "head" block up top, a narrow neck, a banded base — with a
// recessed dark face so the glowing eyes read on any body color.
// A tall narrow vertical COLUMN (constant width) — reads as a totem pole, not a head.
for (let y = 1; y <= 30; y++) {
  const half = y <= 2 ? 3.4 : (y >= 29 ? 4.0 : 4.6);      // small crown top, flat base, straight column
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';
    else if (x >= R - 1) r = 's';
    put('totem_body', x, y, r);
  }
}
// carved grooves dividing the pole into sculpted tiers + small wing-tabs by the top face
for (const gy of [3, 17, 28]) for (let x = cx - 4; x <= cx + 4; x++) put('totem_body', x, gy, 'o');
for (const s of [-1, 1]) for (let y = 7; y <= 10; y++) { put('totem_body', cx + s * 6, y, 'o'); put('totem_body', cx + s * 5, y, 's'); }
// UPPER (main) sculpted face: recessed panel + glowing eyes + carved nose + fanged mouth
for (let y = 5; y <= 14; y++) for (let x = cx - 3; x <= cx + 3; x++) put('totem_face', x, y, y === 5 ? 'o' : 'b');
disk('totem_eye', cx - 2, 8, 1.4, 'b'); disk('totem_eye', cx + 2, 8, 1.4, 'b');
put('totem_eye', cx - 2, 7, 'h'); put('totem_eye', cx + 2, 7, 'h');
for (let y = 10; y <= 11; y++) { put('totem_body', cx, y, 'h'); put('totem_face', cx, y, '.'); } // carved nose ridge shows through
const teethU = [cx - 2, cx, cx + 2];
for (const tx of teethU) put('totem_body', tx, 13, 'h');
for (let x = cx - 3; x <= cx + 3; x++) if (!teethU.includes(x)) put('totem_face', x, 13, 'o');
// LOWER (secondary) sculpted face: smaller, stacked below (totem-pole stacking)
for (let y = 20; y <= 26; y++) for (let x = cx - 3; x <= cx + 3; x++) put('totem_face', x, y, y === 20 ? 'o' : 'b');
disk('totem_eye', cx - 2, 22, 1, 'b'); disk('totem_eye', cx + 2, 22, 1, 'b');
const teethL = [cx - 1, cx + 1];
for (const tx of teethL) put('totem_body', tx, 25, 'h');
for (let x = cx - 2; x <= cx + 2; x++) if (!teethL.includes(x)) put('totem_face', x, 25, 'o');

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
