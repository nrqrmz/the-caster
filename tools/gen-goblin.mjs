// Goblin silhouette — small hunched humanoid, front-facing, 32-grid.
// Serves: duende_ladron (mossGreen 0x558b2f).
//
// Parts authored:
//   goblin_body — short hunched torso with a tattered tunic, stubby arms and legs.
//                 'b' fill, 'h' highlight, 's' shade, 'o' outline.
//   goblin_head — large round head (proportionally big for body) with two LONG
//                 pointed ears extending far to each side, and a prominent hooked
//                 nose. 'b' fill, 'h'/'s' shading, 'o' outline.
//   goblin_eyes — two small glowing eyes (palette: glow).
// Run: node tools/gen-goblin.mjs

const N = 32, cx = 16;
const layers = {
  goblin_body: {},
  goblin_head: {},
  goblin_eyes: {},
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

// ============================ GOBLIN_BODY (hunched torso + limbs) ============================
// The goblin is SHORT and HUNCHED: the torso starts lower on the canvas.
// Shoulders are raised/broad relative to the short height.

// Torso — wide-shouldered, narrow-waisted, slightly hunched (taller on one side)
blob('goblin_body', cx, 20, 4.5, 5);

// Shoulders — wider lumps on each side suggesting a hunched posture
blob('goblin_body', cx - 5, 18, 2.5, 2);   // left shoulder hump
blob('goblin_body', cx + 5, 18, 2.5, 2);   // right shoulder hump

// Tunic detail — a vertical highlight stripe down center chest
for (let y = 17; y <= 23; y++) {
  if (layers['goblin_body'][`${cx},${y}`] === 'b') put('goblin_body', cx, y, 'h');
}

// Arms — short stubby arms reaching slightly downward, bent outward
// Left arm
line('goblin_body', cx - 6, 19, cx - 9, 22, 'b');
line('goblin_body', cx - 7, 19, cx - 10, 22, 's');
put('goblin_body', cx - 9, 22, 'o');
put('goblin_body', cx - 10, 22, 'o');
// Left hand (small claw/fist)
put('goblin_body', cx - 9, 23, 'b');
put('goblin_body', cx - 10, 23, 's');
put('goblin_body', cx - 8, 23, 'o');   // claw tip

// Right arm (mirrored)
line('goblin_body', cx + 6, 19, cx + 9, 22, 'b');
line('goblin_body', cx + 7, 19, cx + 10, 22, 's');
put('goblin_body', cx + 9, 22, 'o');
put('goblin_body', cx + 10, 22, 'o');
// Right hand
put('goblin_body', cx + 9, 23, 'b');
put('goblin_body', cx + 10, 23, 's');
put('goblin_body', cx + 8, 23, 'o');

// Legs — short, slightly bow-legged
// Left leg
for (let y = 25; y <= 30; y++) {
  put('goblin_body', cx - 3, y, 'b');
  put('goblin_body', cx - 2, y, 'h');
  put('goblin_body', cx - 4, y, 'o');
}
put('goblin_body', cx - 3, 30, 'o');
put('goblin_body', cx - 2, 30, 'o');
put('goblin_body', cx - 4, 30, 's');   // foot

// Right leg
for (let y = 25; y <= 30; y++) {
  put('goblin_body', cx + 3, y, 'b');
  put('goblin_body', cx + 2, y, 's');
  put('goblin_body', cx + 4, y, 'o');
}
put('goblin_body', cx + 3, 30, 'o');
put('goblin_body', cx + 2, 30, 'o');
put('goblin_body', cx + 4, 30, 's');

// ============================ GOBLIN_HEAD (big head, long pointed ears, hooked nose) ============================
// The goblin has a characteristically LARGE round head (oversized for the body) —
// and LONG pointed ears extending far to each side (the most distinctive feature).

// Main head blob — large, centered higher than body
blob('goblin_head', cx, 12, 5, 5);

// LONG POINTED EARS — the signature goblin feature. Each ear is a triangular spike
// extending far to the side from the mid-head level.
// Left ear: triangular, pointing left and slightly upward
line('goblin_head', cx - 4, 10, cx - 11, 7, 'b');  // upper edge
line('goblin_head', cx - 4, 12, cx - 11, 10, 's'); // lower edge
// Fill the ear triangle
for (let x = cx - 10; x <= cx - 5; x++) {
  const frac = (x - (cx - 10)) / 5;
  const topY = Math.round(7 + frac * 3);
  const botY = Math.round(10 - frac * 2);
  for (let y = topY; y <= botY; y++) {
    if (!layers['goblin_head'][`${x},${y}`]) put('goblin_head', x, y, 'b');
  }
}
put('goblin_head', cx - 11, 7,  'o');  // ear tip outline
put('goblin_head', cx - 11, 8,  'o');
put('goblin_head', cx - 11, 9,  'o');
put('goblin_head', cx - 11, 10, 'o');
line('goblin_head', cx - 11, 7, cx - 11, 10, 'o');  // ear tip

// Right ear: mirrored
line('goblin_head', cx + 4, 10, cx + 11, 7, 'b');
line('goblin_head', cx + 4, 12, cx + 11, 10, 's');
for (let x = cx + 5; x <= cx + 10; x++) {
  const frac = (x - (cx + 5)) / 5;
  const topY = Math.round(10 - frac * 3);
  const botY = Math.round(12 - frac * 2);
  for (let y = topY; y <= botY; y++) {
    if (!layers['goblin_head'][`${x},${y}`]) put('goblin_head', x, y, 'b');
  }
}
put('goblin_head', cx + 11, 7,  'o');
put('goblin_head', cx + 11, 8,  'o');
put('goblin_head', cx + 11, 9,  'o');
put('goblin_head', cx + 11, 10, 'o');
line('goblin_head', cx + 11, 7, cx + 11, 10, 'o');

// HOOKED NOSE — the second signature feature. A prominent downward-curving hook.
// Nose bridge at center face, curving rightward at tip (classic goblin hook).
put('goblin_head', cx - 1, 13, 'b');  // nose bridge top
put('goblin_head', cx,     13, 'b');
put('goblin_head', cx,     14, 'b');  // nose body
put('goblin_head', cx + 1, 14, 'b');  // hook starts curving right
put('goblin_head', cx + 2, 14, 's');  // hook right
put('goblin_head', cx + 2, 13, 'o');  // hook underside outline
put('goblin_head', cx + 1, 15, 'o');  // nostril/tip outline
put('goblin_head', cx,     15, 'o');  // nostril underside
put('goblin_head', cx - 1, 14, 'o');  // left side of nose

// Mouth — a wide grinning slash (wide grimace)
for (let x = cx - 3; x <= cx + 3; x++) put('goblin_head', x, 16, 'o');
// Corner teeth
put('goblin_head', cx - 3, 16, 's');
put('goblin_head', cx + 3, 16, 's');
put('goblin_head', cx - 2, 17, 'o');  // lower tooth hint
put('goblin_head', cx + 2, 17, 'o');

// ============================ GOBLIN_EYES (palette: glow) ============================
// Two beady glowing eyes, set close together on the big face.

put('goblin_eyes', cx - 2, 11, 'b');
put('goblin_eyes', cx - 1, 11, 'h');   // left eye + glint
put('goblin_eyes', cx + 2, 11, 'b');
put('goblin_eyes', cx + 3, 11, 'h');   // right eye + glint

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

emit('goblin_body');
emit('goblin_head');
emit('goblin_eyes');
