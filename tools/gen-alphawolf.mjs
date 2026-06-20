// Alpha Werewolf (Señor Lobo) — front-facing BOSS biped, 32-grid.
// Serves: senor_lobo (alpha lycanthrope boss, size 96, baseColor 0x5d4037).
//
// Design: BIGGER, MORE IMPOSING than the fodder hombre_lobo. Key differences:
//   - MASSIVE mane/ruff of shaggy fur around neck+shoulders (alpha_mane layer, 'h' highlights)
//   - Wider, heavier torso with prominent hunchback silhouette
//   - Larger skull, more pronounced snout with visible fangs
//   - Thick digitigrade legs, huge clawed hands
//   - Battle scars ('o' lines) on the torso
//   - RED glowing eyes (vampglow palette) — alpha status
//   - Erect pointed wolf ears, more massive than werewolf fodder
//
// Parts: alpha_body, alpha_mane, alpha_head, alpha_eyes (vampglow).
// Run: node tools/gen-alphawolf.mjs

const N = 32, cx = 16;
const layers = {
  alpha_body:  {},
  alpha_mane:  {},
  alpha_head:  {},
  alpha_eyes:  {},
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

// ============================ ALPHA_BODY ============================
// MASSIVE torso: alpha is broader and taller than the fodder werewolf.
// rx=7 (extra wide), ry=7 for massive bulk.
blob('alpha_body', cx, 18, 7, 7);

// Extra shoulder mass — even wider than hombre_lobo, the alpha's shoulders
// loom over everything.
blob('alpha_body', cx - 8, 15, 4.5, 3.5);
blob('alpha_body', cx + 8, 15, 4.5, 3.5);

// Thick hunchback column connecting to head
for (let y = 10; y <= 15; y++) {
  put('alpha_body', cx - 2, y, 'b');
  put('alpha_body', cx - 1, y, 'b');
  put('alpha_body', cx,     y, 'b');
  put('alpha_body', cx + 1, y, 'b');
  put('alpha_body', cx + 2, y, 'b');
}

// Battle scars — diagonal 'o' lines on the torso (marks of dominance)
// Left scar: diagonal slash upper-left to lower-right
line('alpha_body', 12, 16, 10, 20, 'o');
// Right scar: counter-diagonal
line('alpha_body', 20, 16, 22, 20, 'o');

// Digitigrade legs — THICK and powerful, wider than fodder:
// Left thigh x10..13 y25..27, shin x9..11 y28..31
for (let y = 25; y <= 27; y++) {
  put('alpha_body', 10, y, 'b'); put('alpha_body', 11, y, 'b');
  put('alpha_body', 12, y, 'b'); put('alpha_body', 13, y, 'b');
}
for (let y = 28; y <= 31; y++) {
  put('alpha_body',  8, y, 'b'); put('alpha_body',  9, y, 'b');
  put('alpha_body', 10, y, 'b'); put('alpha_body', 11, y, 'b');
}
// Left foot claws (wide spread)
put('alpha_body',  7, 31, 'o'); put('alpha_body',  8, 31, 'o');
put('alpha_body',  9, 31, 'h'); put('alpha_body', 10, 31, 'b');
put('alpha_body', 11, 31, 'b'); put('alpha_body', 12, 31, 'o');

// Right leg: mirror
for (let y = 25; y <= 27; y++) {
  put('alpha_body', 19, y, 'b'); put('alpha_body', 20, y, 'b');
  put('alpha_body', 21, y, 'b'); put('alpha_body', 22, y, 'b');
}
for (let y = 28; y <= 31; y++) {
  put('alpha_body', 21, y, 'b'); put('alpha_body', 22, y, 'b');
  put('alpha_body', 23, y, 'b'); put('alpha_body', 24, y, 'b');
}
// Right foot claws
put('alpha_body', 20, 31, 'o'); put('alpha_body', 21, 31, 'b');
put('alpha_body', 22, 31, 'b'); put('alpha_body', 23, 31, 'h');
put('alpha_body', 24, 31, 'o'); put('alpha_body', 25, 31, 'o');

// MASSIVE arms — even thicker and longer than the fodder werewolf:
// Left arm descends wide and heavy with huge clawed hands
line('alpha_body', cx - 8, 15, 5,  22, 'b');
line('alpha_body', cx - 9, 15, 4,  22, 'o');
line('alpha_body', cx - 7, 15, 6,  22, 'b');
line('alpha_body', cx - 6, 15, 7,  22, 'b');
// Left huge clawed hand (5 wide)
put('alpha_body',  3, 23, 'o'); put('alpha_body',  4, 23, 'b');
put('alpha_body',  5, 23, 'b'); put('alpha_body',  6, 23, 'b');
put('alpha_body',  7, 23, 'b'); put('alpha_body',  8, 23, 'o');
put('alpha_body',  3, 24, 'o'); put('alpha_body',  4, 24, 'o');
put('alpha_body',  5, 24, 'h'); put('alpha_body',  7, 24, 'o');
put('alpha_body',  8, 24, 'o');

// Right arm: mirror
line('alpha_body', cx + 8, 15, 27, 22, 'b');
line('alpha_body', cx + 9, 15, 28, 22, 'o');
line('alpha_body', cx + 7, 15, 26, 22, 'b');
line('alpha_body', cx + 6, 15, 25, 22, 'b');
// Right huge clawed hand
put('alpha_body', 24, 23, 'o'); put('alpha_body', 25, 23, 'b');
put('alpha_body', 26, 23, 'b'); put('alpha_body', 27, 23, 'b');
put('alpha_body', 28, 23, 'b'); put('alpha_body', 29, 23, 'o');
put('alpha_body', 24, 24, 'o'); put('alpha_body', 25, 24, 'o');
put('alpha_body', 26, 24, 'h'); put('alpha_body', 28, 24, 'o');
put('alpha_body', 29, 24, 'o');

// ============================ ALPHA_MANE ============================
// The defining feature: a THICK SHAGGY MANE/RUFF around the neck and
// upper shoulders. Multiple radial spike-tufts with 'h' highlights at tips
// (shaggy fur catching light). This is the primary visual differentiator
// from the plain hombre_lobo.
// Mane is a wide collar of fur spikes radiating outward from the neck
// (centered around cx, y12-17).

// Central mane — broad base
for (let x = cx - 5; x <= cx + 5; x++) {
  put('alpha_mane', x, 17, 'b');
  put('alpha_mane', x, 16, 'b');
}

// Mane tufts radiating outward — left side
// Each tuft: base at shoulder, tip with 'h' at outer end
const leftTufts = [
  // [baseX, baseY, tipX, tipY]
  [cx - 4, 15, cx - 6, 12],  // left-upper
  [cx - 5, 16, cx - 8, 14],  // left-mid
  [cx - 6, 17, cx - 9, 16],  // left-lower
  [cx - 3, 14, cx - 5, 11],  // left-top
  [cx - 7, 15, cx - 10, 13], // far-left
];
for (const [bx, by, tx, ty] of leftTufts) {
  line('alpha_mane', bx, by, tx, ty, 'b');
  put('alpha_mane', tx, ty, 'h');              // shaggy tip highlight
  put('alpha_mane', tx, ty - 1, 'h');          // extra tip spike
}

// Mane tufts — right side (mirror)
const rightTufts = [
  [cx + 4, 15, cx + 6, 12],
  [cx + 5, 16, cx + 8, 14],
  [cx + 6, 17, cx + 9, 16],
  [cx + 3, 14, cx + 5, 11],
  [cx + 7, 15, cx + 10, 13],
];
for (const [bx, by, tx, ty] of rightTufts) {
  line('alpha_mane', bx, by, tx, ty, 'b');
  put('alpha_mane', tx, ty, 'h');
  put('alpha_mane', tx, ty - 1, 'h');
}

// Center top mane — a few upward spikes between the ears
for (const [x, yTip] of [[cx - 2, 10], [cx, 9], [cx + 2, 10]]) {
  put('alpha_mane', x,     yTip,     'h');
  put('alpha_mane', x,     yTip + 1, 'b');
  put('alpha_mane', x,     yTip + 2, 'b');
}

// Shade the mane base (underside)
for (let x = cx - 5; x <= cx + 5; x++) put('alpha_mane', x, 18, 's');

// ============================ ALPHA_HEAD ============================
// LARGE lupine skull — bigger than the fodder werewolf.
// Wide cranium rx=6 (vs fodder rx=5), heavy jaw, massive muzzle.
blob('alpha_head', cx, 9, 6, 5.5);

// Massive muzzle — wider and more protruding than the fodder
for (let y = 11; y <= 15; y++) {
  const w = (y <= 12) ? 3 : (y <= 14) ? 2 : 1;
  for (let x = cx - w; x <= cx + w; x++) put('alpha_head', x, y, (x === cx - w || x === cx + w) ? 'o' : 'b');
}
// FANGS — large prominent, ivory-colored (bone)
put('alpha_head', cx - 2, 16, 'h');  // fang highlight
put('alpha_head', cx - 1, 16, 'o');
put('alpha_head', cx,     16, 'h');  // center gap
put('alpha_head', cx + 1, 16, 'o');
put('alpha_head', cx + 2, 16, 'h');  // right fang

// Nose bridge (wide)
put('alpha_head', cx - 2, 11, 's');
put('alpha_head', cx + 2, 11, 's');

// ERECT WOLF EARS — larger and more prominent than fodder
// Left ear: wide triangular, pointing straight up, base at y=6
for (let i = 0; i <= 5; i++) {
  const ey = 6 - i;
  const ex = cx - 7 + Math.floor(i * 0.5);
  const ewidth = 4 - Math.floor(i * 0.6);
  for (let dx = 0; dx <= Math.max(0, ewidth); dx++) {
    const role = (dx === 0 || dx === ewidth) ? 'o' : 'b';
    put('alpha_head', ex + dx, ey, role);
  }
}
put('alpha_head', cx - 5, 1, 'o');  // ear tip

// Right ear: mirror
for (let i = 0; i <= 5; i++) {
  const ey = 6 - i;
  const exRight = cx + 7 - Math.floor(i * 0.5);
  const ewidth  = 4 - Math.floor(i * 0.6);
  for (let dx = 0; dx <= Math.max(0, ewidth); dx++) {
    const role = (dx === 0 || dx === ewidth) ? 'o' : 'b';
    put('alpha_head', exRight - dx, ey, role);
  }
}
put('alpha_head', cx + 5, 1, 'o');

// Heavy brow ridges — more aggressive than fodder
for (const s of [-1, 1]) {
  line('alpha_head', cx + s * 1, 6, cx + s * 4, 8, 'o');
}

// ============================ ALPHA_EYES (vampglow — RED, ALPHA) ============================
// Large RED glowing eyes — the alpha marker (vampglow palette not glow)
put('alpha_eyes', cx - 3, 8, 'h');
put('alpha_eyes', cx - 3, 9, 'b');
put('alpha_eyes', cx - 2, 8, 'h');
put('alpha_eyes', cx + 2, 8, 'h');
put('alpha_eyes', cx + 3, 8, 'b');
put('alpha_eyes', cx + 3, 9, 'h');

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

emit('alpha_body');
emit('alpha_mane');
emit('alpha_head');
emit('alpha_eyes');
