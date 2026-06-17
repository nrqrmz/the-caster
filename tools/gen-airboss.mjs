// BLOOD KNIGHT boss (caballero_sangre) — bespoke res:32 parts for the air-world nv4 boss.
// A vampire-lord heavy armored figure: full visored helm with a 5-spike crown,
// broad spiked pauldrons, breastplate + tabard, greaves. Clearly imposing, NOT
// the same silhouette as the fodder guardia_nocturno (which uses the plain KNIGHT_VAMP set).
//
// Parts emitted:
//   bk_body  — full-height (h≈32, anchor y≈0) armored lord (crown atop helm)
//   bk_sword — large two-handed greatsword with blood-gleam accent pixels
//   bk_eyes  — red glowing eyes (will use the vampglow palette)
//
// Run: node tools/gen-airboss.mjs
const N = 32, cx = 16, cy = 16;
const layers = {
  bk_body: {}, bk_eyes: {}, bk_sword: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const Rd = (v) => Math.round(v);
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
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2; if (d > 1) continue;
      let r = role;
      if (d > 0.82) r = 'o';
      else if ((y - cy0) / ry < -0.45) r = 'h';
      else if ((y - cy0) / ry > 0.55) r = 's';
      put(L, x, y, r);
    }
}

// ============================ BK_BODY (blood-knight lord, full height) ============================
// ---- Crown: 5 sharp spikes above the helm ----
// Central tallest spike (y0=0)
for (const [vx, heights] of [[cx, 4], [cx - 2, 3], [cx + 2, 3], [cx - 4, 2], [cx + 4, 2]]) {
  for (let k = 0; k < heights; k++) put('bk_body', vx, k, k === 0 ? 'h' : (k < heights - 1 ? 'b' : 'o'));
}
// Crown base band across y=4
for (let x = cx - 5; x <= cx + 5; x++) put('bk_body', x, 4, 'o');
for (let x = cx - 4; x <= cx + 4; x++) put('bk_body', x, 5, 'b');
for (let x = cx - 4; x <= cx + 4; x++) put('bk_body', x, 5, x === cx - 4 || x === cx + 4 ? 'o' : (x === cx - 3 ? 'h' : 'b'));

// ---- Full visored helm (y 5..14) ----
// Helm skull — tapers slightly from mid to sides
for (let y = 5; y <= 13; y++) {
  const half = (y <= 7) ? 4 : (y <= 10) ? 4.5 : (y <= 12) ? 4.2 : 3.8;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';
    else if (x >= Rx - 1) r = 's';
    put('bk_body', x, y, r);
  }
}
// T-visor slit: horizontal bar at y=9, vertical slit center
for (let x = cx - 4; x <= cx + 4; x++) put('bk_body', x, 9, 'o');
put('bk_body', cx, 8, 'o');
put('bk_body', cx, 10, 'o');
// Nose-bridge ridge
for (let y = 7; y <= 11; y++) put('bk_body', cx, y, 'o');

// ---- Broad spiked pauldrons (shoulders, y 11..18) ----
// Left pauldron: disk centered at cx-9,14 + spike tips
disk('bk_body', cx - 9, 14, 3.8, 'b');
disk('bk_body', cx - 9, 14, 1.4, 'h');
line('bk_body', cx - 9, 11, cx - 10, 8, 'h');  // outer spike
line('bk_body', cx - 7, 11, cx - 7, 8, 'h');   // inner spike
put('bk_body', cx - 9, 10, 'o'); put('bk_body', cx - 10, 7, 'o');
put('bk_body', cx - 7, 10, 'o'); put('bk_body', cx - 7, 7, 'o');
// Right pauldron
disk('bk_body', cx + 9, 14, 3.8, 'b');
disk('bk_body', cx + 9, 14, 1.4, 'h');
line('bk_body', cx + 9, 11, cx + 10, 8, 'h');
line('bk_body', cx + 7, 11, cx + 7, 8, 'h');
put('bk_body', cx + 9, 10, 'o'); put('bk_body', cx + 10, 7, 'o');
put('bk_body', cx + 7, 10, 'o'); put('bk_body', cx + 7, 7, 'o');

// ---- Arms (y 14..24) ----
for (let y = 14; y <= 24; y++) {
  for (const x of [cx - 10, cx - 11]) put('bk_body', x, y, x === cx - 11 ? 'o' : 'b');
  for (const x of [cx + 10, cx + 11]) put('bk_body', x, y, x === cx + 11 ? 'o' : 'b');
}

// ---- Breastplate with tabard (y 13..23) ----
for (let y = 13; y <= 23; y++) {
  // Taper wider at torso, narrower at waist bottom
  const half = (y <= 16) ? 7.5 : (y <= 20) ? 7 + (23 - y) * 0.15 : 6.5;
  const Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';
    else if (x >= Rx - 1) r = 's';
    // Horizontal plate bands every 3 rows
    if ((y - 13) % 3 === 0 && x > Lx + 1 && x < Rx - 1) r = 's';
    else if ((y - 14) % 3 === 0 && x > Lx + 1 && x < Rx - 1) r = 'h';
    // Central ridge down the breastplate
    if (x === cx) r = 'h';
    put('bk_body', x, y, r);
  }
}
// Tabard chevron mark at y 17..18 (blood accent shape, rendered as 's' recess)
for (const [dx, dy] of [[-2, 17], [-1, 18], [0, 19], [1, 18], [2, 17]]) put('bk_body', cx + dx, dy, 's');

// ---- Faulds / lower armor (y 23..28) ----
for (let y = 23; y <= 27; y++) {
  const half = 6, Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    put('bk_body', x, y, x === Lx || x === Rx ? 'o' : ((y - 23) % 2 === 0 ? 's' : 'b'));
  }
}
// Greaves (y 27..31)
for (let y = 27; y <= 31; y++) {
  for (const x of [12, 13, 14]) put('bk_body', x, y, x === 12 ? 'o' : 'b');
  for (const x of [18, 19, 20]) put('bk_body', x, y, x === 20 ? 'o' : 'b');
  // greave highlight ridge
  put('bk_body', 13, y, 'h'); put('bk_body', 19, y, 'h');
}
// Sabaton / foot plates at y 31
for (const x of [11, 12, 13, 14, 15]) put('bk_body', x, 31, x === 11 || x === 15 ? 'o' : 'b');
for (const x of [17, 18, 19, 20, 21]) put('bk_body', x, 31, x === 17 || x === 21 ? 'o' : 'b');

// ---- Eyes (just the glow holes in the visor) ----
// Left eye: x13-14, y7-8; Right: x18-19, y7-8
for (const [ex, ey] of [[14, 7], [14, 8], [18, 7], [18, 8]]) {
  put('bk_eyes', ex, ey, 'b');
}
put('bk_eyes', 14, 7, 'h'); put('bk_eyes', 18, 7, 'h');

// ============================ BK_SWORD (great-sword, right side) ============================
// A greatsword larger than the fodder knight_sword: blade runs y=2..24, crossguard at y=24..25
// Blade: 3px wide at cx+10..+12, tip at cx+11
for (let y = 2; y <= 23; y++) {
  put('bk_sword', cx + 10, y, 'o');
  put('bk_sword', cx + 11, y, 'h');
  put('bk_sword', cx + 12, y, 'b');
}
// Blood gleam accent pixels near mid-blade
for (const [gx, gy] of [[cx + 11, 10], [cx + 11, 14], [cx + 11, 18]]) put('bk_sword', gx, gy, 'a');
// Pointed tip
put('bk_sword', cx + 11, 1, 'h');
put('bk_sword', cx + 11, 0, 'o');
// Crossguard (wide sweep y=24..25)
for (let x = cx + 7; x <= cx + 15; x++) put('bk_sword', x, 24, 'o');
for (let x = cx + 8; x <= cx + 14; x++) put('bk_sword', x, 25, x === cx + 8 || x === cx + 14 ? 'o' : 'b');
// Grip below crossguard
for (let y = 26; y <= 28; y++) put('bk_sword', cx + 11, y, 'b');
// Pommel
disk('bk_sword', cx + 11, 29, 1.5, 'b');

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
emit('bk_sword');
emit('bk_body');
emit('bk_eyes');
