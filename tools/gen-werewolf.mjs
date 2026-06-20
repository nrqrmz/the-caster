// Werewolf silhouette — front-facing biped, 32-grid.
// Serves: hombre_lobo (bipedal lycanthrope, size 64, no flip).
//
// Parts authored:
//   werewolf_body  — broad-shouldered MUSCULAR torso + digitigrade legs + hanging arms with claws.
//                    Wide 'o' claw tips at hands and feet. Hunchbacked stance.
//                    Torso and arms thickened for imposing bulk (not spindly).
//   werewolf_head  — lupine wolf-head from front: large skull, protruding muzzle pointing down-front,
//                    two ERECT UPRIGHT pointed ears on top of the skull (wolf-style, NOT droopy);
//                    fangs 'o' at jaw.
//   werewolf_eyes  — two amber glowing eyes (palette: glow).
// Run: node tools/gen-werewolf.mjs

const N = 32, cx = 16;
const layers = {
  werewolf_body: {},
  werewolf_head: {},
  werewolf_eyes: {},
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

// ============================ WEREWOLF_BODY (torso + legs + arms with claws) ============================
// MUSCULAR torso: wide shouldered, thick body. rx=6 for broad frame, ry=6 for taller torso.
blob('werewolf_body', cx, 17, 6, 6);

// Extra shoulder mass bumps — very wide, broad-shouldered beast
blob('werewolf_body', cx - 7, 14, 3.5, 3);
blob('werewolf_body', cx + 7, 14, 3.5, 3);

// Thick neck column connecting body upward
for (let y = 11; y <= 14; y++) {
  put('werewolf_body', cx - 1, y, 'b');
  put('werewolf_body', cx,     y, 'b');
  put('werewolf_body', cx + 1, y, 'b');
}

// Digitigrade legs (bent-knee), thicker than before:
// Left leg: thigh x12..14 y23..25, shin x10..12 y26..29, toe-claws
for (let y = 23; y <= 25; y++) {
  put('werewolf_body', 12, y, 'b'); put('werewolf_body', 13, y, 'b'); put('werewolf_body', 14, y, 'b');
}
for (let y = 26; y <= 29; y++) {
  put('werewolf_body', 10, y, 'b'); put('werewolf_body', 11, y, 'b'); put('werewolf_body', 12, y, 'b');
}
put('werewolf_body',  9, 29, 'o'); put('werewolf_body', 10, 30, 'o');
put('werewolf_body', 11, 30, 'o'); put('werewolf_body', 12, 30, 'o'); put('werewolf_body', 13, 29, 'o');

// Right leg: mirror
for (let y = 23; y <= 25; y++) {
  put('werewolf_body', 18, y, 'b'); put('werewolf_body', 19, y, 'b'); put('werewolf_body', 20, y, 'b');
}
for (let y = 26; y <= 29; y++) {
  put('werewolf_body', 20, y, 'b'); put('werewolf_body', 21, y, 'b'); put('werewolf_body', 22, y, 'b');
}
put('werewolf_body', 23, 29, 'o'); put('werewolf_body', 22, 30, 'o');
put('werewolf_body', 21, 30, 'o'); put('werewolf_body', 20, 30, 'o'); put('werewolf_body', 19, 29, 'o');

// Arms — thick and muscular, hanging low with clawed hands:
// Left arm: 3-pixel wide column descending from shoulder to x8 y22
line('werewolf_body', cx - 7, 14, 8,  21, 'b');
line('werewolf_body', cx - 8, 14, 7,  21, 'o');
line('werewolf_body', cx - 6, 14, 9,  21, 'b');
// Left hand claws (spread wide)
put('werewolf_body',  6, 22, 'o');
put('werewolf_body',  7, 22, 'b');
put('werewolf_body',  8, 22, 'b');
put('werewolf_body',  9, 22, 'b');
put('werewolf_body', 10, 22, 'o');
put('werewolf_body',  6, 23, 'o');
put('werewolf_body',  7, 23, 'o');
put('werewolf_body',  9, 23, 'o');
put('werewolf_body', 10, 23, 'o');

// Right arm: mirror
line('werewolf_body', cx + 7, 14, 24, 21, 'b');
line('werewolf_body', cx + 8, 14, 25, 21, 'o');
line('werewolf_body', cx + 6, 14, 23, 21, 'b');
// Right hand claws
put('werewolf_body', 22, 22, 'o');
put('werewolf_body', 23, 22, 'b');
put('werewolf_body', 24, 22, 'b');
put('werewolf_body', 25, 22, 'b');
put('werewolf_body', 26, 22, 'o');
put('werewolf_body', 22, 23, 'o');
put('werewolf_body', 23, 23, 'o');
put('werewolf_body', 25, 23, 'o');
put('werewolf_body', 26, 23, 'o');

// ============================ WEREWOLF_HEAD (lupine, front-facing, ERECT wolf ears) ============================
// Large round skull — slightly wider
blob('werewolf_head', cx, 9, 5, 4.5);

// Muzzle protruding downward-forward from the lower-center of the face
for (let y = 11; y <= 14; y++) {
  const w = (y <= 12) ? 2 : 1;
  for (let x = cx - w; x <= cx + w; x++) put('werewolf_head', x, y, (x === cx - w || x === cx + w) ? 'o' : 'b');
}
// Fangs at jaw bottom
put('werewolf_head', cx - 1, 15, 'o');
put('werewolf_head', cx,     15, 'h');
put('werewolf_head', cx + 1, 15, 'o');

// Nose bridge
put('werewolf_head', cx - 1, 11, 's');
put('werewolf_head', cx + 1, 11, 's');

// ERECT UPRIGHT wolf ears — tall narrow triangles pointing STRAIGHT UP from top of skull
// NOT droopy, NOT sideways — two upright pointed triangles.
// Left ear: a tall upright triangle, base at y=7, tip at y=2, centered around x=12
for (let i = 0; i <= 4; i++) {
  const ey = 7 - i;          // rows 7 down to 3 (tip rows near 3)
  const ex = cx - 5 + Math.floor(i * 0.5);  // left edge drifts inward
  const ewidth = 3 - Math.floor(i * 0.5);   // narrows to 1 at tip
  for (let dx = 0; dx <= ewidth; dx++) {
    const role = (dx === 0 || dx === ewidth) ? 'o' : 'b';
    put('werewolf_head', ex + dx, ey, role);
  }
}
// Ear tip pixel
put('werewolf_head', cx - 4, 2, 'o');
// Right ear: mirror
for (let i = 0; i <= 4; i++) {
  const ey = 7 - i;
  const exRight = cx + 5 - Math.floor(i * 0.5);
  const ewidth  = 3 - Math.floor(i * 0.5);
  for (let dx = 0; dx <= ewidth; dx++) {
    const role = (dx === 0 || dx === ewidth) ? 'o' : 'b';
    put('werewolf_head', exRight - dx, ey, role);
  }
}
put('werewolf_head', cx + 4, 2, 'o');

// Brow ridge — angled furrow above eyes (fierce expression)
for (const s of [-1, 1]) {
  line('werewolf_head', cx + s * 1, 7, cx + s * 3, 8, 'o');
}

// ============================ WEREWOLF_EYES (glow palette) ============================
put('werewolf_eyes', cx - 2, 8, 'h');
put('werewolf_eyes', cx - 2, 9, 'b');
put('werewolf_eyes', cx + 2, 8, 'h');
put('werewolf_eyes', cx + 2, 9, 'b');

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

emit('werewolf_body');
emit('werewolf_head');
emit('werewolf_eyes');
