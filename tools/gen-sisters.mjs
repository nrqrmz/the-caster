// High-craft FIRE SISTERS bosses (size 96): three beautiful humanoid fire queens,
// detailed to the princess's level (draped folds + GOLD trim via the recipe's `a`).
//   pyra    — heir of Ignatius: LIGHT plate armor, crown of flames, red hair, fire orb
//   vesta   — HEAVY plate armor, big shield + war-hammer, black hair (tank/charger)
//   favilla — flowing ROBE summoner/healer, blonde hair, ornate gold crown, embers
// Armor/robe = type color; `a` = GOLD trim (recipe accent); skin = skin; hair = red/
// black/blond; flames/embers = glow; metal = steel. Run: node tools/gen-sisters.mjs
const N = 32, cx = 16;
const layers = {
  pyra_body: {}, pyra_skin: {}, pyra_hair: {}, pyra_crown: {}, pyra_orb: {},
  vesta_body: {}, vesta_skin: {}, vesta_hair: {}, vesta_shield: {}, vesta_hammer: {},
  favilla_body: {}, favilla_skin: {}, favilla_hair: {}, favilla_crown: {}, favilla_embers: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const R = (v) => Math.round(v);
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
const fold = (x) => { const f = Math.sin((x - cx) * 0.85); return f > 0.5 ? 'h' : (f < -0.5 ? 's' : 'b'); }; // vertical drape folds
// Shared beautiful face (princess-style): skin oval + fine brows, eyes, nose, lips.
function drawFace(L) {
  for (let y = 5; y <= 12; y++) for (let x = 12; x <= 20; x++) { const d = ((x - cx) / 3.6) ** 2 + ((y - 8.5) / 4) ** 2; if (d > 1) continue; let r = 'b'; if (x <= 13) r = 'h'; else if (x >= 19 || y >= 11) r = 's'; put(L, x, y, r); }
  put(L, 14, 7, 'o'); put(L, 18, 7, 'o');
  put(L, 14, 8, 'o'); put(L, 18, 8, 'o'); put(L, 13, 8, 'h'); put(L, 19, 8, 'h');
  put(L, cx, 9, 'h'); put(L, cx, 10, 's');
  for (let x = 15; x <= 17; x++) put(L, x, 11, 's');
}
function drawHair(L, toY) {
  for (let y = 3; y <= 5; y++) { const half = 3 + (y - 3) * 1.0; const Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) put(L, x, y, x === Lx || x === Rx ? 'o' : (x <= Lx + 1 ? 'h' : (x >= Rx - 1 ? 's' : 'b'))); }
  for (let y = 5; y <= toY; y++) { const cols = y >= 13 ? [10, 11, 12] : [11, 12]; const colsR = y >= 13 ? [20, 21, 22] : [20, 21]; cols.forEach((x, i) => put(L, x, y, i === 0 ? 'o' : (y % 6 === 0 ? 'h' : 'b'))); colsR.forEach((x, i, a) => put(L, x, y, i === a.length - 1 ? 'o' : (y % 6 === 0 ? 'h' : 's'))); }
  for (const x of [10, 11, 12, 20, 21, 22]) put(L, x, toY, 's');
}
function legs(L, fromY) { for (let y = fromY; y <= 30; y++) { for (const x of [13, 14]) put(L, x, y, x === 13 ? 'o' : 'b'); for (const x of [18, 19]) put(L, x, y, x === 19 ? 'o' : 'b'); } for (const x of [12, 13, 14]) put(L, x, 31, 'o'); for (const x of [18, 19, 20]) put(L, x, 31, 'o'); }

// ============================ PYRA (light plate armor + gold filigree) ============================
drawHair('pyra_hair', 22);
// fitted cuirass with a central ridge, side shading + GOLD neckline & brooch
for (let y = 13; y <= 19; y++) {
  const half = 5.2 - Math.max(0, (y - 17) * 0.3), Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1 || x >= Rx - 1) r = 's'; put('pyra_body', x, y, r); }
}
for (let x = cx - 4; x <= cx + 4; x++) put('pyra_body', x, 13, 'a');         // gold collar
put('pyra_body', cx, 15, 'a'); put('pyra_body', cx, 16, 'a');               // central brooch
for (let x = cx - 5; x <= cx + 5; x++) put('pyra_body', x, 19, 'a');         // gold belt
for (const s of [-1, 1]) { disk('pyra_body', cx + s * 6, 13, 2, 'b'); put('pyra_body', cx + s * 6, 12, 'a'); put('pyra_body', cx + s * 7, 13, 'o'); } // gold-rimmed pauldrons
// segmented tassets (armored skirt): vertical plates split by dark grooves, gold edges
for (let y = 20; y <= 26; y++) {
  const half = 5 + (y - 20) * 0.55, Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'a'; else if ((x - cx + 60) % 4 === 0) r = 'o'; put('pyra_body', x, y, r); }
}
legs('pyra_body', 26);
for (let y = 14; y <= 23; y++) { put('pyra_body', 9, y, 'o'); put('pyra_body', 10, y, y % 4 === 0 ? 'a' : 'b'); } // left arm w/ banded vambrace
line('pyra_body', 21, 15, 24, 11, 'o'); line('pyra_body', 22, 15, 24, 12, 'b'); // raised right arm
drawFace('pyra_skin');
put('pyra_skin', 9, 24, 'b'); put('pyra_skin', 10, 24, 'h'); disk('pyra_skin', 24, 10, 1.3, 'b'); // hands
for (const [bx, ty, h] of [[cx - 3, 3, 4], [cx, 0, 6], [cx + 3, 3, 4], [cx - 1, 2, 4], [cx + 1, 2, 4]]) for (let k = 0; k < h; k++) put('pyra_crown', bx, ty + k, k < 2 ? 'h' : 'a');
disk('pyra_orb', 24, 9, 2.6, 'b'); disk('pyra_orb', 24, 9, 1.3, 'h'); put('pyra_orb', 24, 9, 'a');

// ============================ VESTA (heavy plate armor + shield + hammer) ============================
for (let y = 3; y <= 6; y++) { const half = Math.min(4.6, 2.8 + (y - 3) * 0.7), Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) put('vesta_hair', x, y, x === Lx || x === Rx ? 'o' : (x <= Lx + 1 ? 'h' : 'b')); }
for (const s of [-1, 1]) for (let y = 6; y <= 11; y++) put('vesta_hair', cx + s * 5, y, s < 0 ? 'h' : 's');
// bulky cuirass with HORIZONTAL plate bands + central boss + gold trim
for (let y = 12; y <= 20; y++) {
  const half = 6.6 - Math.max(0, (y - 18) * 0.2), Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 'h'; else if (x >= Rx - 1) r = 's';
    if ((y - 12) % 3 === 0) r = (x === Lx || x === Rx) ? 'o' : 's';       // plate band crease
    else if ((y - 13) % 3 === 0 && x > Lx + 1 && x < Rx - 1) r = 'h';      // plate top highlight
    put('vesta_body', x, y, r);
  }
}
for (let y = 13; y <= 19; y++) put('vesta_body', cx, y, y % 2 ? 'a' : 'h'); // central boss/trim
for (const s of [-1, 1]) { disk('vesta_body', cx + s * 7, 13, 3.2, 'b'); disk('vesta_body', cx + s * 7, 12, 1.2, 'h'); put('vesta_body', cx + s * 8, 14, 'o'); put('vesta_body', cx + s * 7, 11, 'a'); } // big riveted pauldrons
// heavy faulds: overlapping horizontal lames
for (let y = 20; y <= 28; y++) {
  const half = 6 + (y - 20) * 0.4, Lx = R(cx - half), Rx = R(cx + half);
  for (let x = Lx; x <= Rx; x++) put('vesta_body', x, y, x === Lx || x === Rx ? 'o' : ((y - 20) % 2 === 0 ? 's' : (x === cx ? 'a' : 'b')));
}
legs('vesta_body', 28);
for (let y = 14; y <= 21; y++) { put('vesta_body', 8, y, 'o'); put('vesta_body', 9, y, 'b'); put('vesta_body', 23, y, 'b'); put('vesta_body', 24, y, 'o'); }
drawFace('vesta_skin'); put('vesta_skin', 8, 22, 'b'); put('vesta_skin', 24, 22, 'b');
disk('vesta_shield', 6, 19, 6.5, 'o'); disk('vesta_shield', 6, 19, 5.5, 'h'); disk('vesta_shield', 6, 19, 4.6, 'b'); disk('vesta_shield', 6, 19, 1.8, 'a'); // shield w/ gold boss
for (let y = 8; y <= 26; y++) { put('vesta_hammer', 25, y, 'b'); put('vesta_hammer', 26, y, 's'); }
for (let y = 4; y <= 10; y++) for (let x = 22; x <= 29; x++) if (Math.abs(x - 25.5) <= 3) put('vesta_hammer', x, y, (x <= 23 || x >= 28 || y === 4 || y === 9) ? 'o' : (y <= 6 ? 'h' : 'b'));

// ============================ FAVILLA (flowing robe + gold trim, summoner) ============================
drawHair('favilla_hair', 24);
// bodice -> cinched waist (gold sash) -> flaring FOLDED skirt -> gold hem (princess-style)
for (let y = 12; y <= 18; y++) { const half = 4.4 + (y >= 16 ? (y - 16) * 0.4 : 0), Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1 || x >= Rx - 1) r = 's'; put('favilla_body', x, y, r); } }
for (let x = cx - 4; x <= cx + 4; x++) put('favilla_body', x, 18, 'a');      // gold sash
for (let y = 19; y <= 30; y++) { const t = (y - 19) / 11, half = 4 + 3.4 * t, Lx = R(cx - half), Rx = R(cx + half); for (let x = Lx; x <= Rx; x++) { let r = fold(x); if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 's'; put('favilla_body', x, y, r); } }
for (let x = cx - 8; x <= cx + 8; x++) if (layers.favilla_body[`${x},30`]) put('favilla_body', x, 30, 'a'); // gold hem
for (const x of [cx - 4, cx, cx + 4]) { put('favilla_body', x, 31, '.'); }
// wide summoning sleeves flaring up-out, with fold shading + gold cuffs
for (const s of [-1, 1]) { for (let i = 0; i <= 7; i++) { const x = cx + s * (4 + i), y = 14 - i; put('favilla_body', x, y, i >= 6 ? 'a' : 'b'); put('favilla_body', x, y + 1, i % 2 ? 's' : 'h'); } }
drawFace('favilla_skin');
for (const s of [-1, 1]) disk('favilla_skin', cx + s * 11, 7, 1.3, 'b');     // open hands
for (const [bx, h] of [[cx - 4, 2], [cx - 2, 3], [cx, 4], [cx + 2, 3], [cx + 4, 2]]) for (let k = 0; k < h; k++) put('favilla_crown', bx, 4 - k, k === h - 1 ? 'h' : 'a');
for (let x = cx - 4; x <= cx + 4; x++) put('favilla_crown', x, 4, 'a');
for (const [ex, ey] of [[cx - 12, 5], [cx - 13, 9], [cx + 12, 5], [cx + 13, 9], [cx - 10, 3], [cx + 10, 3]]) { put('favilla_embers', ex, ey, 'a'); put('favilla_embers', ex, ey - 1, 'h'); }

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
