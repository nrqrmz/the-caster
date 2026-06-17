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
  bruja_body: {}, bruja_head: {}, bruja_hair: {}, bruja_staff: {}, bruja_wind: {},
  duelist_blade: {}, duelist_cape: {},
  gar_wings: {}, gar_body: {}, gar_head: {}, gar_eyes: {},
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

// ============================ BRUJA DEL VENDAVAL (air nv5 boss) ============================
// Wind-witch: unmistakably HUMANOID sorceress. Wind blows from RIGHT so hair/hem billow LEFT.
// Parts: bruja_body (purple robe+torso+arms), bruja_head (skin face — rendered ON TOP),
//        bruja_hair (silver, frames face + streams left), bruja_staff (wood+wind orb),
//        bruja_wind (subtle cyan gust accents, NOT a mass).
// Layer order back-to-front: bruja_wind → bruja_body → bruja_hair → bruja_head → bruja_staff
// res:32 canvas; figure head at y=2..10, torso y=10..22, skirt y=22..31.
// Figure is center-right (cx=16) so the staff on x=22..26 stays in the 32-grid.

// ============================ BRUJA_BODY (robe torso + skirt + arms — purple) ============================
// Palette: o=outline, b=base(purple), s=shade(dark purple), h=highlight(light purple), a=accent

// --- Neck stub / collar (y=9..11, centered cx=16) — visible under head ---
for (let y = 9; y <= 11; y++) {
  const half = 1.5 + (y - 9) * 0.5;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) put('bruja_body', x, y, x === Lx || x === Rx ? 'o' : 's');
}

// --- Bodice / torso (y=11..20): shoulders y=11..13, cinched waist y=17..20 ---
for (let y = 11; y <= 20; y++) {
  const half = (y <= 13) ? 5.5 : (y <= 16) ? 5.0 : (y <= 18) ? 4.2 : 3.8; // shoulder → waist taper
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1) r = 'h';
    else if (x === Rx - 1) r = 's';
    if (x === cx) r = 'h';          // center seam highlight
    put('bruja_body', x, y, r);
  }
}
// Robe fold accent line — vertical stripe, suggests fabric drape
for (let y = 12; y <= 20; y++) put('bruja_body', cx - 2, y, 'a');
// Gold/accent sash at waist (y=20)
for (let x = cx - 4; x <= cx + 4; x++) put('bruja_body', x, 20, 'a');

// --- Arms: left arm (cx-6..cx-5, y=12..21) and right arm extended to hold staff (cx+5..cx+6, y=12..19) ---
for (let y = 12; y <= 21; y++) {
  put('bruja_body', cx - 6, y, 'o'); put('bruja_body', cx - 5, y, y >= 16 ? 's' : 'b');
}
for (let y = 12; y <= 19; y++) {
  put('bruja_body', cx + 5, y, y >= 16 ? 's' : 'b'); put('bruja_body', cx + 6, y, 'o');
}
// Left hand (small skin sphere replaced by robe sleeve cuff at y=21..22)
put('bruja_body', cx - 6, 21, 'o'); put('bruja_body', cx - 5, 21, 's');
put('bruja_body', cx - 5, 22, 's'); put('bruja_body', cx - 6, 22, 'o');
// Right hand at staff grip (y=19..20)
put('bruja_body', cx + 5, 19, 's'); put('bruja_body', cx + 6, 19, 'o');
put('bruja_body', cx + 5, 20, 's'); put('bruja_body', cx + 6, 20, 'o');

// --- Skirt / robe hem (y=20..31): A-line flare, slight left billow for wind effect ---
// Right edge near cx+5, left edge fans moderately LEFT (not amorphous — keeps human form readable)
for (let y = 20; y <= 31; y++) {
  const t = (y - 20) / 11;            // 0..1
  const Rx = Rd(cx + 5 - t * 1.5);   // right edge very slightly in
  const Lx = Rd(cx - 5 - t * 6);     // left fans out (wind), max spread = cx-11 = x=5 at y=31
  const lx = Math.max(0, Lx), rx = Math.min(31, Rx);
  for (let x = lx; x <= rx; x++) {
    let r = 'b';
    if (x === lx || x === rx) r = 'o';
    else if (x === lx + 1) r = 'h';   // left edge catch-light (wind-side brightness)
    else if (x === rx - 1) r = 's';
    // Gentle diagonal fold lines — fabric creases, NOT noise
    if ((x - lx) % 4 === 2 && r === 'b') r = 's';
    put('bruja_body', x, y, r);
  }
}
// Hem scallop bottom row (y=31) — slight wavy hem
for (const xOff of [-4, -1, 2, 5]) {
  const xp = cx + xOff;
  if (layers['bruja_body'][`${xp},31`]) put('bruja_body', xp, 31, '.');
}

// ============================ BRUJA_HEAD (skin face — rendered on top of body/hair) ============================
// Head oval centered at cx=16, y=2..10. Princess-style face: eyes, nose, mouth.
// 'b' = skin mid, 'h' = lit cheek, 's' = jaw/cheek shade, 'o' = outline
// (Palette 'skin' drives these to real flesh tones.)

const inHead = (x, y) => ((x - cx) / 3.5) ** 2 + ((y - 6.0) / 4.2) ** 2 <= 1;
for (let y = 2; y <= 10; y++) for (let x = 11; x <= 21; x++) {
  if (!inHead(x, y)) continue;
  let r = 'b';
  if (x <= 13) r = 'h';                      // lit left cheek
  else if (x >= 19 || y >= 9) r = 's';       // right cheek / jaw shadow
  put('bruja_head', x, y, r);
}
// Eyes: dark dots with socket shade (classic princess eyes, slightly narrower set)
put('bruja_head', 14, 5, 'o'); put('bruja_head', 18, 5, 'o');  // eye pupils
put('bruja_head', 13, 5, 's'); put('bruja_head', 19, 5, 's');  // eye sockets
// Nose bridge highlight
put('bruja_head', cx, 6, 'h'); put('bruja_head', cx, 7, 'h');
// Mouth (thin dark line)
for (let x = 15; x <= 17; x++) put('bruja_head', x, 8, 's');
// Slight forehead outline implied by hair (no extra line needed — outline 'o' from oval boundary)

// ============================ BRUJA_HAIR (silver, frames head + streams LEFT for wind) ============================
// Crown cap (y=2..5) frames the head at the top and sides.
// Side curtains fall to shoulders (y=5..14): left side streams LEFT (wind), right side kept tighter.
// Palette: 'silverhair' (b=silver base, h=bright silver, s=shadow, o=outline)

// Rounded crown cap (y=2..5) — hair on top of head, same as mage_hair pattern
for (let y = 2; y <= 5; y++) {
  const half = 2.6 + (y - 2) * 0.9;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';
    else if (x >= Rx - 1) r = 's';
    put('bruja_hair', x, y, r);
  }
}
// Right side curtain (y=5..13, x=19..21) — tight, stays near face, slight taper
for (let y = 5; y <= 13; y++) {
  const cols = y >= 10 ? [19, 20] : [20, 21];
  cols.forEach((x, i, a) => put('bruja_hair', x, y, i === a.length - 1 ? 'o' : (y % 5 === 0 ? 's' : 'b')));
}
// Left side: hair anchored at temple (x=12..13, y=5..6), then streams LEFT as wind tendril
for (let y = 5; y <= 6; y++) {
  put('bruja_hair', 11, y, 'o'); put('bruja_hair', 12, y, 'b'); put('bruja_hair', 13, y, 'b');
}
// Primary wind tendril — sweeps from x=11 at y=6 far left, reaching x=2 by y=12
for (let y = 6; y <= 12; y++) {
  const tx = Rd(11 - (y - 6) * 1.3);
  const x0 = Math.max(0, tx - 1), x1 = Math.max(1, tx + 1);
  for (let x = x0; x <= x1; x++) put('bruja_hair', x, y, x === x0 || x === x1 ? 'o' : 'h');
}
// Secondary, thinner tendril just below (y=7..14, slightly more vertical)
for (let y = 7; y <= 14; y++) {
  const tx = Rd(12 - (y - 7) * 0.8);
  const x = Math.max(0, tx);
  put('bruja_hair', x, y, y % 3 === 0 ? 's' : 'b');
  if (x + 1 <= 15 && x + 1 !== x) put('bruja_hair', x + 1, y, 'b');
}
// Tip ends (y=12..13 left tendril, y=14 secondary)
for (const x of [0, 1, 2]) if (layers['bruja_hair'][`${x},12`]) put('bruja_hair', x, 12, 's');

// ============================ BRUJA_STAFF (wood staff with wind-orb finial, right side) ============================
// Shaft at x=22..23, y=9..31. Storm-wind orb finial at top (y=0..8, center x=23,y=4).
// Palette 'wood': o=outline, b=wood base, h=light grain, s=dark grain, a=accent (storm-cyan wisps).

// Wind orb finial (y=0..8, center cx=23, cy=4, r=4)
disk('bruja_staff', 23, 4, 4, 'b');
disk('bruja_staff', 22, 3, 1.8, 'h');   // inner glow highlight
// Orb outline ring
for (let y = 0; y <= 8; y++) for (let x = 18; x <= 28; x++) {
  const d2 = ((x - 23) ** 2 + (y - 4) ** 2);
  if (d2 >= 13 && d2 <= 17) put('bruja_staff', x, y, 'o');
}
// Wind swirl accent pixels inside orb
for (const [sx, sy] of [[22, 2], [24, 2], [21, 4], [25, 5], [23, 6]]) put('bruja_staff', sx, sy, 'a');

// Staff shaft (y=8..31): 2px wide, wood grain every 3 rows
for (let y = 8; y <= 31; y++) {
  put('bruja_staff', 22, y, 'o');
  put('bruja_staff', 23, y, y % 3 === 0 ? 'h' : 'b');
  // Knot bump every 8 rows
  if (y % 8 === 4 && y >= 12 && y <= 28) {
    put('bruja_staff', 21, y, 'o');
    put('bruja_staff', 24, y, 's');
  }
}

// ============================ BRUJA_WIND (subtle cyan gust accents — NOT a mass) ============================
// Three small crescent/arc glyphs as accents around the figure.
// Kept SPARSE and small so they frame her without obscuring the body.
// Palette 'orbblue' (b=cyan base, h=bright cyan, o=outline).

// Gust accent 1 — upper left, beside face (y=3..5, x=7..10)
for (const [x, y, r] of [
  [8, 3, 'o'], [9, 3, 'b'],
  [7, 4, 'b'], [10, 4, 'h'],
  [8, 5, 'o'], [9, 5, 'b'],
]) put('bruja_wind', x, y, r);

// Gust accent 2 — left of torso (y=14..17, x=2..5)
for (const [x, y, r] of [
  [3, 14, 'o'], [4, 14, 'b'],
  [2, 15, 'b'], [5, 15, 'h'],
  [2, 16, 'o'], [5, 16, 'b'],
  [3, 17, 'o'], [4, 17, 'b'],
]) put('bruja_wind', x, y, r);

// Gust accent 3 — lower hem area (y=25..28, x=4..7)
for (const [x, y, r] of [
  [5, 25, 'o'], [6, 25, 'b'],
  [4, 26, 'b'], [7, 26, 'h'],
  [5, 27, 'o'], [6, 27, 'b'],
]) put('bruja_wind', x, y, r);

// Sparse wisp dots — very minimal, tucked near robe hem
for (const [x, y] of [[3, 22], [1, 28], [6, 30]]) put('bruja_wind', x, y, 'b');

emit('bruja_body');
emit('bruja_head');
emit('bruja_hair');
emit('bruja_staff');
emit('bruja_wind');

// ============================ DUELIST_BLADE (thin rapier — right side, for duelista_nocturno) ============================
// A lean elegant rapier held vertically on the right side of the figure.
// Blade: 1px wide highlight column (x=24) + 1px base/shade (x=25), y=3..21 — very slender.
// Crossguard: short horizontal bar at y=22..23, x=21..27.
// Grip: x=24..25, y=24..26 (wrapped, alternating).
// Pommel: small circle at y=27..28, x=23..25.
// Steel palette: o=outline, h=highlight(bright steel), b=base(steel mid), s=shade(dark steel).
// Anchored right side: blade left edge at x=24. Fits within 32-grid for a 32px humanoid.

// Blade tip
put('duelist_blade', 24, 3, 'h');
put('duelist_blade', 24, 4, 'h');
// Blade shaft: slender 2-px (x=24 highlight, x=25 base), with shade edge
for (let y = 5; y <= 21; y++) {
  put('duelist_blade', 24, y, 'h');
  put('duelist_blade', 25, y, 'b');
  // Subtle shade every 4 rows for gleam effect
  if (y % 4 === 1) put('duelist_blade', 25, y, 's');
}
// Outline (left edge of blade — makes it crisp)
for (let y = 3; y <= 21; y++) put('duelist_blade', 23, y, 'o');
// Right edge outline
for (let y = 5; y <= 21; y++) put('duelist_blade', 26, y, 'o');

// Crossguard: a short horizontal sweep y=22, x=21..27
for (let x = 21; x <= 27; x++) {
  put('duelist_blade', x, 22, x === 21 || x === 27 ? 'o' : (x === 22 || x === 26 ? 's' : (x === 24 ? 'h' : 'b')));
}
// Crossguard lower edge
put('duelist_blade', 21, 23, 'o'); put('duelist_blade', 22, 23, 's');
put('duelist_blade', 26, 23, 's'); put('duelist_blade', 27, 23, 'o');

// Grip: y=24..26, x=23..26 — narrow, alternating wrap
for (let y = 24; y <= 26; y++) {
  put('duelist_blade', 23, y, 'o');
  put('duelist_blade', 24, y, y % 2 === 0 ? 'h' : 'b');
  put('duelist_blade', 25, y, y % 2 === 0 ? 'b' : 's');
  put('duelist_blade', 26, y, 'o');
}

// Pommel: small 3×2 ellipse at y=27..28
for (const [x, y, r] of [
  [23, 27, 'o'], [24, 27, 'h'], [25, 27, 'b'], [26, 27, 'o'],
  [23, 28, 'o'], [24, 28, 'b'], [25, 28, 's'], [26, 28, 'o'],
]) put('duelist_blade', x, y, r);

emit('duelist_blade');

// ============================ DUELIST_CAPE (small dark shoulder cape — elegant flair) ============================
// A SHORT cape anchored behind the shoulders, draping from y=11 to y=22. Kept NARROW (5px)
// so it reads as a fencer's half-cape, not an amorphous mass. Dark (vampblack palette).
// Center at cx=16, width 5px (x=13..17). The shape is slightly angled right for dynamism.

const DCAPE_TOP = 11, DCAPE_BOT = 22;
for (let y = DCAPE_TOP; y <= DCAPE_BOT; y++) {
  const t = (y - DCAPE_TOP) / (DCAPE_BOT - DCAPE_TOP); // 0..1
  // Slight right-lean: right edge stays at cx+2, left edge fans from cx-2 to cx-4
  const Lx = Rd(cx - 2 - t * 2);
  const Rx = Rd(cx + 2 + t * 0.5);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx + 1) r = 's';
    // Subtle fold highlight
    else if (x === Rd((Lx + Rx) / 2)) r = 'h';
    put('duelist_cape', x, y, r);
  }
}
// Short attachment band at shoulders (y=10)
for (let x = cx - 2; x <= cx + 2; x++) {
  put('duelist_cape', x, 10, x === cx - 2 || x === cx + 2 ? 'o' : 's');
}

emit('duelist_cape');

// ============================ GÁRGOLA PARARRAYOS (stone gargoyle — ambient lightning-rod turret) ============================
// A perched/crouching stone GARGOYLE. It's a static floating turret that casts a lightning nova.
// Design: hunched stone beast body, horned grotesque head with a snarling fanged face,
//         bat-like stone wings (folded, spread behind body), clawed forelimbs.
// Palette roles (stone base color 0x546e7a via recipe baseColor, derivePalette):
//   o=outline (very dark blue-grey), b=base (mid stone blue-grey), s=shade (darker stone),
//   h=highlight (lighter stone), a=accent (type color accent — kept minimal).
// Electric eyes rendered as separate gar_eyes part (glow palette).
// Layer order back-to-front: gar_wings → gar_body → gar_head → gar_eyes.
// All on a 32×32 canvas. The gargoyle crouches: head top at y≈4, body y≈12..26, wings y≈6..28.

// ============================ GAR_WINGS (bat-like stone wings, folded behind body) ============================
// Two large folded bat wings symmetrically spread. Each wing has a spine + membrane.
// Left wing: center spine from (cx-5,8) curving out-left to (cx-13,20).
//            membrane fills between spine and body edge.
// Right wing: mirror.
// Stone tone — outline 'o', base 'b', shade 's', highlight 'h'.

// Left wing primary spine: 4 segments arcing out-down
const LW_SPINE = [[11,7],[10,9],[9,11],[8,13],[7,15],[7,17],[8,19],[9,21]];
for (const [x,y] of LW_SPINE) { put('gar_wings',x,y,'o'); if (x+1<N) put('gar_wings',x+1,y,'b'); }
// Left wing membrane: fill between spine and center body
for (const [x,y] of LW_SPINE) {
  for (let fx = x+2; fx <= cx-2; fx++) {
    const r = (fx === cx-2) ? 'o' : ((fx - (x+2)) % 3 === 1 ? 's' : 'b');
    put('gar_wings', fx, y, r);
  }
}
// Left wing leading edge outline (outer edge of membrane)
for (const [x,y] of LW_SPINE) put('gar_wings', x, y, 'o');
// Left tip claw spurs (wing finger tips)
for (const [dx,dy] of [[-1,0],[0,-1]]) {
  const [tx,ty] = LW_SPINE[0]; put('gar_wings', tx+dx, ty+dy, 'o');
}
// Bottom wing claw tip
const [lwbx,lwby] = LW_SPINE[LW_SPINE.length-1];
put('gar_wings', lwbx, lwby+1, 'o'); put('gar_wings', lwbx-1, lwby, 'o');

// Right wing (mirror of left)
const RW_SPINE = LW_SPINE.map(([x,y]) => [31-x, y]);
for (const [x,y] of RW_SPINE) { put('gar_wings',x,y,'o'); if (x-1>=0) put('gar_wings',x-1,y,'b'); }
// Right wing membrane
for (const [x,y] of RW_SPINE) {
  for (let fx = cx+2; fx <= x-2; fx++) {
    const r = (fx === cx+2) ? 'o' : ((fx - (cx+2)) % 3 === 1 ? 's' : 'b');
    put('gar_wings', fx, y, r);
  }
}
for (const [x,y] of RW_SPINE) put('gar_wings', x, y, 'o');
// Right tip claw spurs
const [rwtx,rwty] = RW_SPINE[0];
put('gar_wings', rwtx+1, rwty, 'o'); put('gar_wings', rwtx, rwty-1, 'o');
const [rwbx,rwby] = RW_SPINE[RW_SPINE.length-1];
put('gar_wings', rwbx, rwby+1, 'o'); put('gar_wings', rwbx+1, rwby, 'o');

// Wing fold crease lines (horizontal shade bands across membrane to suggest folded-wing ribs)
for (let y = 8; y <= 20; y += 3) {
  for (let x = 8; x <= cx - 3; x++) {
    if (layers['gar_wings'][`${x},${y}`] === 'b') put('gar_wings', x, y, 's');
  }
  for (let x = cx+3; x <= 23; x++) {
    if (layers['gar_wings'][`${x},${y}`] === 'b') put('gar_wings', x, y, 's');
  }
}

// ============================ GAR_BODY (hunched stone beast — crouching torso + clawed forelimbs) ============================
// The body is a hunched mass, wider at the shoulders (y≈12..16) and narrowing to a squat haunched
// lower body (y≈17..26). Clawed forelimbs extend from shoulder level down-outward.
// 'b' = stone base, 's' = shade (underside/shadow), 'h' = highlight (top/rim catch), 'o' = outline.

// Torso mass (hunched, wider at top — the gargoyle crouches on its perch)
for (let y = 11; y <= 25; y++) {
  // Width: broadest at y=11..14 (hunchback shoulders), narrowing at waist y≈19..22
  const half = (y <= 13) ? 6.5 : (y <= 16) ? 6.0 : (y <= 19) ? 5.2 : (y <= 22) ? 4.5 : 3.8;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx+1) r = 'h';   // catch-light on left face
    else if (x === Rx-1) r = 's';
    // Hunchback ridge: central back-spine highlight at top
    if (x === cx && y <= 15) r = 'h';
    // Belly shadow on lower torso
    if (y >= 20 && x > Lx+1 && x < Rx-1) r = 's';
    if (y >= 20 && x === Lx+2) r = 'b';
    put('gar_body', x, y, r);
  }
}
// Stone texture: a few shade-band lines across the torso (craggy stone effect)
for (let x = cx-4; x <= cx+4; x++) {
  if (layers['gar_body'][`${x},14`] === 'b') put('gar_body', x, 14, 's');
  if (layers['gar_body'][`${x},18`] === 'b') put('gar_body', x, 18, 's');
}
// Central chest ridge (stone crease)
for (let y = 12; y <= 20; y++) {
  if (layers['gar_body'][`${cx},${y}`] && layers['gar_body'][`${cx},${y}`] !== 'o')
    put('gar_body', cx, y, 'h');
}

// Left forelimb: extends from shoulder (x≈cx-6, y≈12) curving down-left to clawed fist (x≈cx-8, y≈22)
line('gar_body', cx-6, 12, cx-9, 18, 'o'); // outer edge
line('gar_body', cx-5, 12, cx-8, 18, 'b'); // inner edge
// Left forearm continuation
line('gar_body', cx-9, 18, cx-9, 22, 'o');
line('gar_body', cx-8, 18, cx-8, 22, 'b');
// Left clawed hand (splayed claws, 3 prongs)
for (const [fx,fy] of [[cx-11,23],[cx-9,24],[cx-7,23]]) {
  put('gar_body',fx,fy,'o'); put('gar_body',fx,fy+1,'o');
}
for (let x = cx-10; x <= cx-8; x++) put('gar_body', x, 23, 'b');

// Right forelimb (mirror)
line('gar_body', cx+6, 12, cx+9, 18, 'o');
line('gar_body', cx+5, 12, cx+8, 18, 'b');
line('gar_body', cx+9, 18, cx+9, 22, 'o');
line('gar_body', cx+8, 18, cx+8, 22, 'b');
for (const [fx,fy] of [[cx+11,23],[cx+9,24],[cx+7,23]]) {
  put('gar_body',fx,fy,'o'); put('gar_body',fx,fy+1,'o');
}
for (let x = cx+8; x <= cx+10; x++) put('gar_body', x, 23, 'b');

// Haunched lower body / crouched legs (y=24..28): two squat stone legs
// Left leg: x=11..13
for (let y = 24; y <= 28; y++) {
  for (const x of [11,12,13]) put('gar_body',x,y, x===11||x===13 ? 'o' : 'b');
}
// Right leg: x=19..21
for (let y = 24; y <= 28; y++) {
  for (const x of [19,20,21]) put('gar_body',x,y, x===19||x===21 ? 'o' : 'b');
}
// Taloned feet (y=28..29)
for (const bx of [10,11,12,13,14]) put('gar_body',bx,29, bx===10||bx===14 ? 'o' : 's');
for (const bx of [18,19,20,21,22]) put('gar_body',bx,29, bx===18||bx===22 ? 'o' : 's');
// Talon claw tips
for (const [tx,ty] of [[10,30],[12,30],[14,30],[18,30],[20,30],[22,30]]) put('gar_body',tx,ty,'o');

// ============================ GAR_HEAD (grotesque horned head, snarling fanged mouth) ============================
// Head placed at top of the hunched body: center cx, y=3..12.
// Round-ish but angular — a grotesque gargoyle face with:
//   - two short up-curved horns (top, y=3..5)
//   - deep-set brow ridge (shadowed, y=6..7)
//   - wide snarling mouth with exposed fangs (y=9..12)
// Palette: stone (same as body). Eyes are NOT drawn here — gar_eyes layer sits on top.

// Main head oval: cx, centered at y=7.5, w≈9, h≈9
for (let y = 4; y <= 12; y++) {
  const half = (y <= 5) ? 2.5 : (y <= 7) ? 4.0 : (y <= 9) ? 4.5 : (y <= 11) ? 4.0 : 2.5;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x === Lx+1) r = 'h';
    else if (x === Rx-1) r = 's';
    put('gar_head', x, y, r);
  }
}

// Brow ridge (heavy, overhanging — gargoyle frown): shade band y=6..7
for (let x = cx-3; x <= cx+3; x++) {
  if (layers['gar_head'][`${x},6`]) put('gar_head', x, 6, 's');
  if (layers['gar_head'][`${x},7`]) put('gar_head', x, 7, 's');
}

// Left horn: two short curving prongs at (cx-3, y=3..5) and (cx-1, y=3..4)
line('gar_head', cx-3, 5, cx-3, 3, 'o');
put('gar_head', cx-2, 4, 'b'); put('gar_head', cx-2, 3, 'o');
put('gar_head', cx-4, 3, 'o'); // horn tip spur
// Right horn (mirror)
line('gar_head', cx+3, 5, cx+3, 3, 'o');
put('gar_head', cx+2, 4, 'b'); put('gar_head', cx+2, 3, 'o');
put('gar_head', cx+4, 3, 'o');

// Snout/muzzle protrusion: wide low chin at y=10..12 (grotesque jaws)
for (let y = 10; y <= 12; y++) {
  const mhalf = (y === 10) ? 4.0 : (y === 11) ? 4.5 : 3.5;
  const MLx = Rd(cx - mhalf), MRx = Rd(cx + mhalf);
  for (let x = MLx; x <= MRx; x++) {
    let r = 'b';
    if (x === MLx || x === MRx) r = 'o';
    else if (x === MLx+1) r = 'h';
    put('gar_head', x, y, r);
  }
}

// Fanged snarling mouth: dark crevice at y=10 center, upper fangs at y=9 pointing down
// Mouth opening (dark line at y=10, center)
for (let x = cx-3; x <= cx+3; x++) put('gar_head', x, 10, 'o');
// Upper fangs (short downward triangles from y=9..10)
for (const fx of [cx-2, cx, cx+2]) {
  put('gar_head', fx, 9, 'h');   // fang tip highlight (bone-like)
  put('gar_head', fx, 10, 'o');  // fang merges into mouth opening
}
// Lower fangs (upward nubs at y=11)
for (const fx of [cx-1, cx+1]) put('gar_head', fx, 11, 'h');

// ============================ GAR_EYES (electric glowing eyes — glow palette) ============================
// Electric, slightly glowing eyes set in deep sockets (brow shadow from gar_head).
// Two pairs of pixels for each eye for a 2×2 glow spot.
// Left eye: center (cx-2, 7.5); Right eye: center (cx+2, 7.5)
// Roles: 'h' = bright electric highlight, 'b' = glow base (mapped to glow palette colors).
// A tiny 'o' outline pixel per eye to give crispness against the stone face.

// Left eye
put('gar_eyes', cx-3, 7, 'o'); put('gar_eyes', cx-2, 7, 'h'); put('gar_eyes', cx-1, 7, 'o');
put('gar_eyes', cx-3, 8, 'o'); put('gar_eyes', cx-2, 8, 'b'); put('gar_eyes', cx-1, 8, 'o');
// Right eye
put('gar_eyes', cx+1, 7, 'o'); put('gar_eyes', cx+2, 7, 'h'); put('gar_eyes', cx+3, 7, 'o');
put('gar_eyes', cx+1, 8, 'o'); put('gar_eyes', cx+2, 8, 'b'); put('gar_eyes', cx+3, 8, 'o');

emit('gar_wings');
emit('gar_body');
emit('gar_head');
emit('gar_eyes');
