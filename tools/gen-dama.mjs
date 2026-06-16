// High-craft DAMA DEL LAGO (Lady of the Lake) boss, size 96 — the water sorceress.
// Shared humanoid design for her three forms (dama_lago / dama_maga / dama_maga_final):
// a beautiful ethereal water queen (princess-level detail), flowing ice gown with gold
// trim + folds, long SILVER hair, a delicate tiara, and a held water orb.
// gown = type color; `a` = GOLD trim (recipe accent); skin = skin; hair = silverhair;
// crown = glow; orb = orbblue. Run: node tools/gen-dama.mjs
const N = 32, cx = 16;
const layers = { dama_gown: {}, dama_skin: {}, dama_hair: {}, dama_crown: {}, dama_orb: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const R = (v) => Math.round(v);
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
function line(L, x0, y0, x1, y1, r) { const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, x = x0, y = y0; for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } } }
const fold = (x) => { const f = Math.sin((x - cx) * 0.8); return f > 0.5 ? 'h' : (f < -0.5 ? 's' : 'b'); };
function drawFace(L) {
  for (let y = 5; y <= 12; y++) for (let x = 12; x <= 20; x++) { const d = ((x - cx) / 3.6) ** 2 + ((y - 8.5) / 4) ** 2; if (d > 1) continue; let r = 'b'; if (x <= 13) r = 'h'; else if (x >= 19 || y >= 11) r = 's'; put(L, x, y, r); }
  put(L, 14, 7, 'o'); put(L, 18, 7, 'o'); put(L, 14, 8, 'o'); put(L, 18, 8, 'o'); put(L, 13, 8, 'h'); put(L, 19, 8, 'h');
  put(L, cx, 9, 'h'); put(L, cx, 10, 's'); for (let x = 15; x <= 17; x++) put(L, x, 11, 's');
}
function drawHair(L, toY) {
  for (let y = 3; y <= 5; y++) { const half = 3 + (y - 3) * 1.0, Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) put(L, x, y, x === Lx || x === Rx ? 'o' : (x <= Lx + 1 ? 'h' : (x >= Rx - 1 ? 's' : 'b'))); }
  for (let y = 5; y <= toY; y++) { const cols = y >= 13 ? [10, 11, 12] : [11, 12], colsR = y >= 13 ? [20, 21, 22] : [20, 21]; cols.forEach((x, i) => put(L, x, y, i === 0 ? 'o' : (y % 6 === 0 ? 'h' : 'b'))); colsR.forEach((x, i, a) => put(L, x, y, i === a.length - 1 ? 'o' : (y % 6 === 0 ? 'h' : 's'))); }
  for (const x of [10, 11, 12, 20, 21, 22]) put(L, x, toY, 's');
}

drawHair('dama_hair', 24);
// slim flowing gown: bodice -> cinched waist (gold sash) -> flaring folded skirt -> gold hem
for (let y = 12; y <= 18; y++) { const half = 4.2 + (y >= 16 ? (y - 16) * 0.4 : 0), Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1 || x >= Rx - 1) r = 's'; put('dama_gown', x, y, r); } }
for (let x = cx - 4; x <= cx + 4; x++) put('dama_gown', x, 18, 'a');         // gold sash
for (let y = 19; y <= 30; y++) { const t = (y - 19) / 11, half = 4 + 3.6 * t, Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 's'; put('dama_gown', x, y, r); } }
for (let x = cx - 8; x <= cx + 8; x++) if (layers.dama_gown[`${x},30`]) put('dama_gown', x, 30, 'a'); // gold hem
for (const x of [cx - 5, cx - 1, cx + 3, cx + 6]) put('dama_gown', x, 31, '.'); // wavy hem
// graceful arms: left lowered to cradle the water orb, right resting at the side
line('dama_gown', cx - 4, 14, cx - 8, 19, 'o'); line('dama_gown', cx - 3, 14, cx - 7, 19, 'b');
for (let y = 14; y <= 22; y++) { put('dama_gown', cx + 6, y, 'b'); put('dama_gown', cx + 7, y, 'o'); }
drawFace('dama_skin');
disk('dama_skin', cx - 8, 20, 1.3, 'b'); disk('dama_skin', cx + 7, 23, 1.2, 'b'); // hands
// delicate gold tiara (water-lily points)
for (let x = cx - 4; x <= cx + 4; x++) put('dama_crown', x, 4, 'a');
for (const [bx, h] of [[cx - 3, 2], [cx, 3], [cx + 3, 2]]) for (let k = 0; k < h; k++) put('dama_crown', bx, 4 - k - 1, k === h - 1 ? 'h' : 'a');
put('dama_crown', cx, 4, 'h');                                              // central jewel
// cradled water orb (orbblue) with a ripple highlight
disk('dama_orb', cx - 8, 21, 2.8, 'b'); disk('dama_orb', cx - 8, 21, 1.4, 'h'); put('dama_orb', cx - 9, 20, 'a');

function emit(name) {
  const keys = Object.keys(layers[name]); if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
for (const k of Object.keys(layers)) emit(k);
