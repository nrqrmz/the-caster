// High-craft winged / floating creatures, each a distinct designed creature:
//   fenix_menor — fiery phoenix, spread wings + flame crest & tail (revives once)
//   avispa_brasa — ember wasp, membrane wings + striped abdomen + stinger (fast)
//   totem (pira/escarcha) — floating carved idol with a glowing eye (static); one
//     shared body serves both the fire (glow eye) and frost (orbblue eye) variants.
// Body/wings take the creature's type color; crest/tail = ember+glow, wasp wings =
// bone (pale membrane), eyes glow/shadow, totem eye glow|orbblue. Run: node tools/gen-winged.mjs
const N = 32, cx = 16;
const layers = {
  fenix_body: {}, fenix_crest: {}, fenix_eyes: {},
  avispa_body: {}, avispa_wings: {}, avispa_eyes: {},
  totem_body: {}, totem_face: {}, totem_eye: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
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

// ============================ FENIX_MENOR (phoenix, front, wings spread) ============================
// wings: feathers fanning out from each shoulder
for (const s of [-1, 1]) {
  const sh = cx + s * 3;                                  // shoulder
  const tips = [[cx + s * 13, 8], [cx + s * 13, 12], [cx + s * 12, 16], [cx + s * 9, 19]];
  for (const [tx, ty] of tips) { line('fenix_body', sh, 12, tx, ty, 'b'); line('fenix_body', sh, 13, tx, ty + 1, 's'); line('fenix_body', sh, 11, tx, ty - 1, 'h'); }
  put('fenix_body', cx + s * 13, 8, 'o'); put('fenix_body', cx + s * 13, 12, 'o');
}
blob('fenix_body', cx, 15, 3, 4);                         // breast/body
blob('fenix_body', cx, 9, 2.6, 2.6);                      // head
put('fenix_body', cx, 12, 'h'); put('fenix_body', cx - 1, 12, 'a'); put('fenix_body', cx + 1, 12, 'a'); // beak
// flame crest above the head
for (const [bx, ty, h] of [[cx - 2, 3, 4], [cx, 1, 6], [cx + 2, 3, 4]]) for (let k = 0; k < h; k++) put('fenix_crest', bx, ty + k, k < 2 ? 'h' : 'a');
// flame tail fanning below the body
for (const [tx, ty] of [[cx - 4, 29], [cx - 2, 30], [cx, 31], [cx + 2, 30], [cx + 4, 29]]) { line('fenix_crest', cx, 18, tx, ty, 'a'); put('fenix_crest', tx, ty, 'h'); }
line('fenix_crest', cx, 18, cx, 30, 'h');
put('fenix_eyes', cx - 1, 9, 'b'); put('fenix_eyes', cx + 1, 9, 'b');

// ============================ AVISPA_BRASA (ember wasp) ============================
// wings (membrane) spread up-and-out from the thorax
for (const s of [-1, 1]) { for (const [tx, ty] of [[cx + s * 11, 6], [cx + s * 12, 10]]) { line('avispa_wings', cx + s * 2, 12, tx, ty, 'b'); line('avispa_wings', cx + s * 3, 12, tx, ty + 1, 'h'); } put('avispa_wings', cx + s * 11, 6, 'o'); put('avispa_wings', cx + s * 12, 10, 'o'); }
disk('avispa_body', cx, 8, 2.6, 'b');                     // head
for (const s of [-1, 1]) line('avispa_body', cx + s, 6, cx + s * 3, 2, 'o'); // antennae
disk('avispa_body', cx, 12, 2.4, 'b');                    // thorax
blob('avispa_body', cx, 19, 3.6, 5);                      // abdomen
for (const y of [16, 19, 22]) for (let x = cx - 3; x <= cx + 3; x++) put('avispa_body', x, y, 's'); // dark stripes
line('avispa_body', cx, 24, cx, 27, 'o'); put('avispa_body', cx, 27, 'a');   // stinger
put('avispa_eyes', cx - 2, 8, 'b'); put('avispa_eyes', cx + 2, 8, 'b');      // compound eyes

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
