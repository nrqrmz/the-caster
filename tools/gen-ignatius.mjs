// High-craft IGNATIUS — the Fire King (boss, size 96): imposing crowned patriarch,
// father of the three sisters. Centered & symmetric: tall gold crown, a big central
// FLAMING BEARD, broad gold-trimmed fire armor, and a flaming scepter at his side.
// armor/robe = type color; `a` = GOLD (recipe accent); skin = skin; beard/flames =
// ember/glow; scepter = steel. Run: node tools/gen-ignatius.mjs
const N = 32, cx = 16;
const layers = { ign_body: {}, ign_skin: {}, ign_beard: {}, ign_crown: {}, ign_scepter: {}, ign_flame: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const R = (v) => Math.round(v);
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// ---- broad gold-trimmed cuirass (type color, plate grooves; no highlight floods) ----
for (const s of [-1, 1]) { disk('ign_body', cx + s * 8, 14, 3.2, 'b'); put('ign_body', cx + s * 8, 12, 'a'); put('ign_body', cx + s * 9, 14, 'o'); put('ign_body', cx + s * 9, 13, 's'); } // pauldrons + gold crest
for (let y = 12; y <= 22; y++) {
  const half = 7 - Math.max(0, (y - 20) * 0.5), Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) { let r = 'b'; if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1 || x >= Rx - 1) r = 's'; else if ((x - cx) !== 0 && (x - cx + 60) % 3 === 0) r = 's'; put('ign_body', x, y, r); }
}
for (let x = cx - 5; x <= cx + 5; x++) put('ign_body', x, 12, 'a');          // gold gorget collar
for (let x = cx - 6; x <= cx + 6; x++) put('ign_body', x, 22, 'a');          // gold belt
// arms: clean 3px armored vambraces with a gold elbow band, at both sides
for (const s of [-1, 1]) { const ax = cx + s * 7; for (let y = 14; y <= 23; y++) { put('ign_body', ax - 1, y, s < 0 ? 'o' : 'b'); put('ign_body', ax, y, 'b'); put('ign_body', ax + 1, y, s < 0 ? 'b' : 'o'); if (y === 18) for (let d = -1; d <= 1; d++) put('ign_body', ax + d, y, 'a'); } }
// regal lower robe (controlled folds) + hem
for (let y = 23; y <= 30; y++) { const half = 6 + (y - 23) * 0.7, Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) { let r = 'b'; if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 's'; else if ((x - cx + 60) % 4 === 0) r = 's'; put('ign_body', x, y, r); } }
for (const x of [cx - 7, cx - 3, cx + 1, cx + 5]) put('ign_body', x, 31, '.');

// ---- face (skin): heavy brow + glaring eyes (lower face hidden by the beard) ----
for (let y = 4; y <= 10; y++) for (let x = 12; x <= 20; x++) { const d = ((x - cx) / 3.8) ** 2 + ((y - 7) / 3.4) ** 2; if (d > 1) continue; let r = 'b'; if (x <= 13) r = 'h'; else if (x >= 19) r = 's'; put('ign_skin', x, y, r); }
for (let x = 13; x <= 19; x++) put('ign_skin', x, 5, 's');                   // heavy brow ridge
put('ign_skin', 14, 7, 'o'); put('ign_skin', 18, 7, 'o'); put('ign_skin', 13, 6, 'h'); put('ign_skin', 19, 6, 'h'); // glaring eyes
put('ign_skin', cx, 8, 'h');                                                 // nose
disk('ign_skin', cx - 7, 24, 1.3, 'b'); disk('ign_skin', cx + 7, 24, 1.3, 'b'); // hands

// ---- big central FLAMING BEARD (ember): ORANGE body with bright licking tips ----
for (let y = 9; y <= 20; y++) {
  const t = (y - 9) / 11, half = 1.5 + 4.5 * Math.sin(Math.PI * Math.min(1, 0.18 + t * 0.9));
  const Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';                                          // orange flame body
    if (y >= 18) r = (x % 2 === 0 ? 'a' : 'h');           // bright flame tips at the bottom
    else if (x === Lx || x === Rx) r = 'h';               // bright licking edges
    else if ((x + y) % 3 === 0) r = 's';                  // dark inner strands (texture)
    else if (x === cx && y % 2 === 1) r = 'h';            // a few bright center licks
    put('ign_beard', x, y, r);
  }
}
for (const [mx, my] of [[13, 9], [16, 9], [19, 9]]) put('ign_beard', mx, my, 'h'); // moustache wisps

// ---- tall gold crown with flame points + jewels ----
for (let x = 11; x <= 21; x++) put('ign_crown', x, 3, 'a');                  // band
for (const [bx, h] of [[11, 3], [13, 4], [16, 5], [19, 4], [21, 3]]) for (let k = 0; k < h; k++) put('ign_crown', bx, 2 - k, k === h - 1 ? 'h' : 'a'); // points
for (const bx of [13, 16, 19]) put('ign_crown', bx, 3, 'h');                 // jewels

// ---- flaming scepter held at his right side (steel shaft + crowning flame) ----
for (let y = 9; y <= 27; y++) { put('ign_scepter', cx + 9, y, 'o'); put('ign_scepter', cx + 10, y, 'b'); put('ign_scepter', cx + 11, y, 's'); }
for (const [bx, ty, h] of [[cx + 8, 5, 4], [cx + 10, 2, 6], [cx + 12, 5, 4]]) for (let k = 0; k < h; k++) put('ign_flame', bx, ty + k, k < 2 ? 'h' : 'a');
disk('ign_flame', cx + 10, 8, 2.2, 'b'); disk('ign_flame', cx + 10, 8, 1, 'h'); // glowing orb at the scepter neck

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
