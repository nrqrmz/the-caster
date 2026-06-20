// Hunter (Céfalo humano) — front-facing BOSS humanoid, 32-grid.
// Serves: cefalo_humano (hunter in leather armor with javelin, size 96, baseColor 0x6d4c41).
//
// Design: CLEARLY HUMANOID — human proportions, upright posture, front view.
// Key features:
//   - Leather armor (layered pauldrons, chest guard, bracers) in base color (barkBrown)
//   - Short hunting cape draped behind shoulders
//   - Javelin held DIAGONALLY across the body (distinguishing weapon silhouette)
//   - Human face with short hair (distinct from beast bosses)
//   - Silver-tipped javelin (hunter_javelin_tip with steel palette)
//   - Leg greaves (lower leg guards)
//
// Parts: hunter_body (body + leather armor), hunter_head (face + hair),
//        hunter_javelin (wooden shaft, wood palette),
//        hunter_javelin_tip (silver tip, steel palette).
// Run: node tools/gen-hunter.mjs

const N = 32, cx = 16;
const layers = {
  hunter_body:        {},
  hunter_head:        {},
  hunter_javelin:     {},
  hunter_javelin_tip: {},
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

// ============================ HUNTER_BODY (torso + leather armor) ============================
// SHORT HUNTING CAPE — drapes behind shoulders (back layer behind body)
// Cape sweeps down from shoulders, slightly asymmetric (pinned on left shoulder)
for (let y = 11; y <= 19; y++) {
  const spread = Math.min(y - 8, 6);
  const x0 = cx - spread - 1, x1 = cx + spread - 2;  // slightly right-biased
  put('hunter_body', x0, y, 'o');  // cape left edge
  put('hunter_body', x0 + 1, y, 's');  // cape shade (interior)
}
// Cape bottom hem
for (let x = cx - 6; x <= cx + 4; x++) put('hunter_body', x, 20, 'o');

// HUMAN TORSO — upright, proportioned humanoid frame (not beast)
// Chest: modest width (not beast-massive)
blob('hunter_body', cx, 17, 5, 5.5);

// LEATHER CHEST GUARD — armor plating over the torso center
// Angular 'b' over the torso with 'h' highlight ridge and 'o' seam lines
for (let y = 13; y <= 20; y++) {
  const w = (y <= 15) ? 3 : (y <= 18) ? 4 : 3;
  for (let x = cx - w; x <= cx + w; x++) {
    if (layers['hunter_body'][`${x},${y}`] === 'b') {
      if (x === cx) put('hunter_body', x, y, 'h');  // armor centerline highlight
    }
  }
}
// Armor seam lines (horizontal straps)
for (const sy of [15, 18, 21]) {
  for (let x = cx - 3; x <= cx + 3; x++) {
    if (layers['hunter_body'][`${x},${sy}`]) put('hunter_body', x, sy, 'o');
  }
}

// PAULDRONS (shoulder guards) — gives that armored hunter look
blob('hunter_body', cx - 6, 12, 2.5, 2);
blob('hunter_body', cx + 6, 12, 2.5, 2);

// ARMS — human proportioned (not beast-length), holding the javelin
// Left arm: raised and extended diagonally (gripping javelin up-left)
line('hunter_body', cx - 6, 13, cx - 9, 10, 'b');  // upper arm
line('hunter_body', cx - 9, 10, cx - 10, 7, 'b');  // forearm (raised)
put('hunter_body', cx - 10, 7, 'o');   // hand
put('hunter_body', cx - 10, 8, 'b');
put('hunter_body', cx - 11, 7, 'o');

// Right arm: angled down-right (gripping javelin lower end)
line('hunter_body', cx + 6, 13, cx + 9, 17, 'b');  // upper arm
line('hunter_body', cx + 9, 17, cx + 11, 20, 'b'); // forearm (lowered)
put('hunter_body', cx + 11, 20, 'o');  // hand
put('hunter_body', cx + 12, 20, 'b');
put('hunter_body', cx + 12, 21, 'o');

// LEGS — human proportioned with light greave guards
// Left leg
for (let y = 23; y <= 28; y++) {
  put('hunter_body', cx - 3, y, 'b');
  put('hunter_body', cx - 2, y, 'b');
  put('hunter_body', cx - 1, y, 'b');
}
for (let y = 29; y <= 31; y++) {
  put('hunter_body', cx - 3, y, 'b');
  put('hunter_body', cx - 2, y, 'b');
}
// Left greave (front armor strip)
for (let y = 26; y <= 30; y++) put('hunter_body', cx - 2, y, 'h');
put('hunter_body', cx - 3, 31, 'o');   // boot
put('hunter_body', cx - 2, 31, 'b');
put('hunter_body', cx - 1, 31, 'o');

// Right leg
for (let y = 23; y <= 28; y++) {
  put('hunter_body', cx + 1, y, 'b');
  put('hunter_body', cx + 2, y, 'b');
  put('hunter_body', cx + 3, y, 'b');
}
for (let y = 29; y <= 31; y++) {
  put('hunter_body', cx + 2, y, 'b');
  put('hunter_body', cx + 3, y, 'b');
}
// Right greave
for (let y = 26; y <= 30; y++) put('hunter_body', cx + 2, y, 'h');
put('hunter_body', cx + 1, 31, 'o');
put('hunter_body', cx + 2, 31, 'b');
put('hunter_body', cx + 3, 31, 'o');

// Belt line
for (let x = cx - 4; x <= cx + 4; x++) put('hunter_body', x, 22, 'o');

// ============================ HUNTER_HEAD (human face + short hair) ============================
// Round human head — clearly humanoid (vs beast boss heads)
blob('hunter_head', cx, 8, 4, 4);

// Human face details:
// Eyes (small, non-glowing — human)
put('hunter_head', cx - 2, 7, 'o');
put('hunter_head', cx + 2, 7, 'o');
// Nose bridge
put('hunter_head', cx, 8, 's');
put('hunter_head', cx, 9, 's');
// Determined/stern mouth
put('hunter_head', cx - 1, 10, 'o');
put('hunter_head', cx,     10, 's');
put('hunter_head', cx + 1, 10, 'o');

// Short hair — close-cropped, masculine hunter
// Hair sits on top and sides of the head
for (let x = cx - 3; x <= cx + 3; x++) {
  put('hunter_head', x, 4, 'b');
  put('hunter_head', x, 5, 'b');
}
put('hunter_head', cx - 4, 5, 'b');
put('hunter_head', cx - 4, 6, 'b');
put('hunter_head', cx + 4, 5, 'b');
put('hunter_head', cx + 4, 6, 'b');
// Hair highlight (top)
for (let x = cx - 2; x <= cx + 2; x++) put('hunter_head', x, 4, 'h');
// Hair outline
for (let x = cx - 3; x <= cx + 3; x++) put('hunter_head', x, 3, 'o');
put('hunter_head', cx - 4, 4, 'o');
put('hunter_head', cx + 4, 4, 'o');

// Brow (determined expression)
put('hunter_head', cx - 3, 6, 'o');
put('hunter_head', cx + 3, 6, 'o');

// Short beard stubble (hunter trait)
put('hunter_head', cx - 1, 11, 's');
put('hunter_head', cx,     11, 's');
put('hunter_head', cx + 1, 11, 's');

// ============================ HUNTER_JAVELIN (wooden shaft, diagonal) ============================
// A DIAGONAL SHAFT from upper-left to lower-right.
// Upper grip around (cx-10, 7), lower end around (cx+12, 22).
// The shaft is 2 pixels thick for visibility at boss size.
// Roles: 'b' base, 'h' highlight edge, 'o' far edge (outline).

// Diagonal line from upper-left to lower-right
line('hunter_javelin', cx - 11, 6, cx + 13, 23, 'b');
// Second parallel line (thicker shaft)
line('hunter_javelin', cx - 10, 7, cx + 14, 24, 'b');
// Highlight edge
line('hunter_javelin', cx - 12, 6, cx + 12, 22, 'h');

// ============================ HUNTER_JAVELIN_TIP (silver tip, steel palette) ============================
// Leaf-shaped silver spearhead at the upper end of the javelin (upper-left).
// The tip is the 'boss' visual accent — silver against the wooden shaft.

// Tip point
put('hunter_javelin_tip', cx - 13, 4, 'h');   // gleaming point
put('hunter_javelin_tip', cx - 14, 5, 'h');
put('hunter_javelin_tip', cx - 13, 5, 'b');
put('hunter_javelin_tip', cx - 12, 5, 'b');
// Tip base (where it meets the shaft)
put('hunter_javelin_tip', cx - 12, 6, 'b');
put('hunter_javelin_tip', cx - 11, 6, 'b');
put('hunter_javelin_tip', cx - 12, 7, 's');
put('hunter_javelin_tip', cx - 11, 7, 's');
// Tip outline
put('hunter_javelin_tip', cx - 15, 5, 'o');
put('hunter_javelin_tip', cx - 14, 4, 'o');
put('hunter_javelin_tip', cx - 13, 3, 'o');   // apex
put('hunter_javelin_tip', cx - 12, 4, 'o');
put('hunter_javelin_tip', cx - 11, 5, 'o');

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

emit('hunter_body');
emit('hunter_head');
emit('hunter_javelin');
emit('hunter_javelin_tip');
