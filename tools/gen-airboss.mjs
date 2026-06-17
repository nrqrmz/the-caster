// BLOOD KNIGHT boss (caballero_sangre) — bespoke res:32 parts for the air-world nv4 boss.
// Vampire-lord in blood-red + black plate armor: menacing visored helmet (no crown),
// straight vertical black cape hanging behind, slim/tall torso, greaves, greatsword.
//
// Parts emitted (back-to-front composition order):
//   bk_cape      — straight vertical black cape centered behind torso/legs
//   bk_body      — full-height (h=32) armored lord: visor helm, red plate, black undersuit
//   bk_pauldrons — shoulder pauldrons (smaller, boss-worthy but not head-sized)
//   bk_sword     — large two-handed greatsword with blood-gleam accent pixels
//   bk_eyes      — red glowing eyes (vampglow palette)
//
// Run: node tools/gen-airboss.mjs
const N = 32, cx = 16, cy = 16;
const layers = {
  bk_cape: {}, bk_sword: {}, bk_body: {}, bk_pauldrons: {}, bk_eyes: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const Rd = (v) => Math.round(v);

function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function disk(L, cx0, cy0, r, role) {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
}

// ============================ BK_CAPE (straight vertical drape centered behind the body) ============================
// The cape falls STRAIGHT DOWN from the shoulder band at y=11 to the bottom of the figure (y=31).
// Width is UNIFORM (not fanning) — it's a vertical curtain centered on cx.
// Uses vampblack palette: o=outline, b=base(near-black), s=shade, h=highlight(dark-plum)
// Cape width: 13px (cx-6 to cx+6) — narrower than the old fan, clean vertical hang.
const CAPE_HALF = 6; // half-width of the cape body
for (let y = 10; y <= 31; y++) {
  const Lx = cx - CAPE_HALF, Rx = cx + CAPE_HALF;
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1 || x === Rx - 1) r = 's';
    // highlight drape folds: two vertical highlight lines suggesting fabric folds
    else if (x === cx - 2 || x === cx + 2) r = 'h';
    put('bk_cape', x, y, r);
  }
}
// Cape top band at shoulder level (y=9..10) — narrower attachment band
for (let x = cx - 4; x <= cx + 4; x++) {
  put('bk_cape', x, 9, x === cx - 4 || x === cx + 4 ? 'o' : 's');
}
// Horizontal drape accent rows — subtle shade/highlight stripes across the vertical hang
for (let x = cx - CAPE_HALF + 1; x <= cx + CAPE_HALF - 1; x++) {
  if (layers['bk_cape'][`${x},16`] === 'b') put('bk_cape', x, 16, 'h');
  if (layers['bk_cape'][`${x},22`] === 'b') put('bk_cape', x, 22, 's');
  if (layers['bk_cape'][`${x},27`] === 'b') put('bk_cape', x, 27, 'h');
}

// ============================ BK_SWORD (greatsword, right side) ============================
// A menacing greatsword: 3px wide blade (y=1..23), serrated edge detail, wide crossguard, wrapped grip.
// Offset to right side: blade at x=24..26 (anchor will adjust).
// Using steel palette (via recipe): o=outline, h=highlight, b=base, a=blood gleam (type color/red via accent)
const SX = 24; // blade left edge in 32-grid
// Tip
put('bk_sword', SX + 1, 0, 'o');
put('bk_sword', SX + 1, 1, 'h');
// Blade: 3 wide, y=2..22
for (let y = 2; y <= 22; y++) {
  put('bk_sword', SX,     y, 'o');
  put('bk_sword', SX + 1, y, 'h');
  put('bk_sword', SX + 2, y, 'b');
  // Blood gleam (accent = red from type color) every 4 rows
  if (y % 4 === 2) put('bk_sword', SX + 1, y, 'a');
}
// Serration: tiny notch on left edge every 3 rows
for (let y = 5; y <= 20; y += 3) put('bk_sword', SX - 1, y, 'o');
// Crossguard: wide sweep y=23..24
for (let x = SX - 4; x <= SX + 5; x++) put('bk_sword', x, 23, 'o');
for (let x = SX - 3; x <= SX + 4; x++) put('bk_sword', x, 24, x === SX - 3 || x === SX + 4 ? 'o' : (x === SX - 2 || x === SX + 3 ? 'h' : 'b'));
// Grip (wrapped): y=25..27, with alternating h/b for wrapping
for (let y = 25; y <= 27; y++) {
  put('bk_sword', SX + 1, y, y % 2 === 0 ? 'h' : 'b');
}
// Pommel: small disk
disk('bk_sword', SX + 1, 29, 1.5, 'b');
put('bk_sword', SX + 1, 28, 'o');
put('bk_sword', SX,     29, 'o');
put('bk_sword', SX + 2, 29, 'o');
put('bk_sword', SX + 1, 30, 'o');

// ============================ BK_BODY (blood-knight torso — slimmer, taller, red+black) ============================
// Narrower than ice knight (ice_body uses half≈11; we use half≈9 at widest).
// Composition: red plate (b/h/s = type color red) + black undersuit/trim (o = outline/near-black).
// The 'o' chars render with vampblack-like darkness because they map to outline role of
// the type-color palette (derived from 0xb71c1c with derivePalette → outline ≈ 0x280606).

// ---- Full visored helm (y 0..11) — menacing beak visor, no crown ----
// Helm skull: w=9 centered at cx
for (let y = 0; y <= 9; y++) {
  const half = (y <= 2) ? 3.5 : (y <= 5) ? 4.0 : (y <= 7) ? 3.8 : 3.3;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1) r = 'h';
    else if (x === Rx - 1) r = 's';
    put('bk_body', x, y, r);
  }
}
// Beak visor: protruding chin-guard y=8..10 at center, 3px wide
for (let y = 8; y <= 10; y++) {
  const bw = 3 - (y - 8); // narrows: 3,2,1
  for (let x = cx - bw; x <= cx + bw; x++) put('bk_body', x, y, x === cx - bw || x === cx + bw ? 'o' : 's');
}
// T-visor eye slit: horizontal at y=5, vertical nose bridge y=4..6
for (let x = cx - 3; x <= cx + 3; x++) put('bk_body', x, 5, 'o');
put('bk_body', cx, 3, 'o'); put('bk_body', cx, 4, 'o'); put('bk_body', cx, 6, 'o');
// Helm crest ridge (center-back top): a subtle dark line y=0..3
for (let y = 0; y <= 3; y++) { if (!layers['bk_body'][`${cx},${y}`] || layers['bk_body'][`${cx},${y}`] !== 'o') put('bk_body', cx, y, 's'); }
// Helm bottom rim / gorget y=10..12 — collar of black plate
for (let y = 10; y <= 12; y++) {
  const half = 3.5 + (y - 10) * 0.5;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) put('bk_body', x, y, x === Lx || x === Rx ? 'o' : (x % 2 === 0 ? 's' : 'o'));
}

// ---- Slim torso / breastplate (y 12..23) — narrower than ice knight ----
for (let y = 12; y <= 23; y++) {
  // half-width: 7 at shoulder, 5.5 at waist — lean, imposing
  const half = (y <= 14) ? 7.0 : (y <= 18) ? 7.0 - (y - 14) * 0.2 : 6.2 - (y - 18) * 0.1;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1) r = 'h';
    else if (x === Rx - 1) r = 's';
    // Black undersuit trim at edges
    else if (x === Lx + 2 || x === Rx - 2) r = 'o';
    // Plate band lines every 3 rows
    if ((y - 12) % 3 === 0 && x > Lx + 2 && x < Rx - 2) r = 's';
    // Breastplate central ridge
    if (x === cx) r = 'h';
    put('bk_body', x, y, r);
  }
}
// Black center divide stripe (Y-shaped gorget mark) — dark undersuit visible center chest
for (let y = 13; y <= 17; y++) put('bk_body', cx, y, 'o');
// Blood-mark V-notch at chest (y=15..16)
for (const [dx, dy] of [[-2, 15], [-1, 16], [0, 17], [1, 16], [2, 15]]) put('bk_body', cx + dx, dy, 'a');

// ---- Arms (y 13..23) — slim, plate-covered ----
for (let y = 13; y <= 23; y++) {
  // Left arm at x=9..10
  put('bk_body', 9, y, 'o');
  put('bk_body', 10, y, 'b');
  // Right arm at x=22..23
  put('bk_body', 22, y, 'b');
  put('bk_body', 23, y, 'o');
}
// Gauntlets at y=22..24 (wider cuff)
for (let y = 22; y <= 24; y++) {
  for (const x of [8, 9, 10, 11]) put('bk_body', x, y, x === 8 || x === 11 ? 'o' : 's');
  for (const x of [21, 22, 23, 24]) put('bk_body', x, y, x === 21 || x === 24 ? 'o' : 's');
}

// ---- Faulds / hip guards (y 23..25) — NARROWER, no flare ----
// Keep them close to the torso width to avoid wide-hip look
for (let y = 23; y <= 25; y++) {
  const half = 5, Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    put('bk_body', x, y, x === Lx || x === Rx ? 'o' : ((y - 23) % 2 === 0 ? 'b' : 's'));
  }
}

// ---- Greaves (y 25..31) — legs CLOSE TOGETHER, no gap between them ----
// Left greave: x=13..15, Right greave: x=17..19 (only 1-px gap at center)
for (let y = 25; y <= 31; y++) {
  // Left greave: x=13..15
  for (const x of [13, 14, 15]) put('bk_body', x, y, x === 13 || x === 15 ? 'o' : 'b');
  put('bk_body', 14, y, 'h');
  // Right greave: x=17..19
  for (const x of [17, 18, 19]) put('bk_body', x, y, x === 17 || x === 19 ? 'o' : 'b');
  put('bk_body', 18, y, 'h');
}
// Sabatons (foot plates) at y=31
for (const x of [12, 13, 14, 15, 16]) put('bk_body', x, 31, x === 12 || x === 16 ? 'o' : 's');
for (const x of [16, 17, 18, 19, 20]) put('bk_body', x, 31, x === 16 || x === 20 ? 'o' : 's');

// ============================ BK_PAULDRONS (shoulder armor — SMALLER, boss-worthy but not head-sized) ============================
// Drawn in front of body+cape. Inherits recipe's red type-color (no palette override in recipe).
// Left pauldron: center at cx-9, right at cx+9; y range 10..16 (reduced from 9..19).
// Radius ~3 (reduced from 4..4.5), no decorative upper crest to keep footprint down.

// Left pauldron — main plate
for (let y = 10; y <= 15; y++) {
  const r_half = (y <= 11) ? 2.5 : (y <= 13) ? 3.0 : (y <= 14) ? 2.8 : 2.2;
  const px = cx - 9;
  const Lx = Rd(px - r_half), Rx = Rd(px + r_half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1) r = 'h';
    else if (x === Rx - 1) r = 's';
    if (y === 13) r = 'a'; // red accent band mid-pauldron
    if ((x === Lx || x === Rx) && y === 13) r = 'o'; // keep outline
    put('bk_pauldrons', x, y, r);
  }
}
// Left lower rim lames (2 stacked bands)
for (let y = 15; y <= 16; y++) {
  const px = cx - 9;
  const w2 = 3 - (y - 15);
  for (let x = px - w2; x <= px + w2; x++) put('bk_pauldrons', x, y, x === px - w2 || x === px + w2 ? 'o' : 's');
}

// Right pauldron (mirror)
for (let y = 10; y <= 15; y++) {
  const r_half = (y <= 11) ? 2.5 : (y <= 13) ? 3.0 : (y <= 14) ? 2.8 : 2.2;
  const px = cx + 9;
  const Lx = Rd(px - r_half), Rx = Rd(px + r_half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Rx - 1) r = 'h';
    else if (x === Lx + 1) r = 's';
    if (y === 13) r = 'a';
    if ((x === Lx || x === Rx) && y === 13) r = 'o';
    put('bk_pauldrons', x, y, r);
  }
}
for (let y = 15; y <= 16; y++) {
  const px = cx + 9;
  const w2 = 3 - (y - 15);
  for (let x = px - w2; x <= px + w2; x++) put('bk_pauldrons', x, y, x === px - w2 || x === px + w2 ? 'o' : 's');
}

// ============================ BK_EYES (red glow holes in visor) ============================
// Left eye: x=13..14, y=4..5; Right: x=18..19, y=4..5
// (vampglow palette: h=bright red highlight, b=red base)
for (const [ex, ey] of [[13, 4], [14, 4], [13, 5], [14, 5], [18, 4], [19, 4], [18, 5], [19, 5]]) {
  put('bk_eyes', ex, ey, 'b');
}
// Bright center glow pixels
put('bk_eyes', 14, 4, 'h'); put('bk_eyes', 18, 4, 'h');

// ============================ emit ============================
function emit(name) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) {
    let row = '';
    for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.';
    rows.push(row);
  }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  const w = maxx - minx + 1, h = maxy - miny + 1;
  console.log(`  ${name}: {\n    res: 32, w: ${w}, h: ${h}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
emit('bk_cape');
emit('bk_sword');
emit('bk_body');
emit('bk_pauldrons');
emit('bk_eyes');
