// Mud Golem Cría silhouette — front-facing, 32-grid.
// Serves: golem_lodo_cria (mudBrown 0x795548, size 32).
// Silhouette: a SMALL, SIMPLE round mud blob with tiny stub arms and ONE glowing eye.
//   Clearly smaller/simpler than the parent golem_lodo. Reads as a
//   baby/splinter mud golem — just a round lump with a tiny face.
//
// Parts authored:
//   mudcria_body — small roundish mud mass with two tiny stub arms.
//                  Rounder and simpler than the parent golem.
//   mudcria_eye  — single central glowing eye (palette: glow).
// Run: node tools/gen-golem-mudcria.mjs

const N = 32, cx = 16;
const layers = {
  mudcria_body: {},
  mudcria_eye:  {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
};
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

// ============================ MUDCRIA_BODY ============================
// A small rounded mud blob — just a single round body mass.
// Simple: one torso blob + two tiny nub arms. Much simpler than parent.
// Centered at cx=16, y=17 (occupies roughly rows 10..27).

// Main body blob (round, small-ish)
blob('mudcria_body', cx, 17, 6, 7);

// Tiny stub arms — just small disks poking out the sides.
// Very short, barely more than bumps (unlike parent's long globby arms).
disk('mudcria_body', cx - 7, 17, 2, 'b');    // left arm nub
disk('mudcria_body', cx + 7, 17, 2, 'b');    // right arm nub
put('mudcria_body', cx - 8, 17, 'o');         // arm tip outline
put('mudcria_body', cx + 8, 17, 'o');

// Small bottom drip (just one — simpler than parent's multiple)
for (let y = 23; y <= 26; y++) {
  put('mudcria_body', cx, y, 'b');
}
disk('mudcria_body', cx, 26, 1.5, 'b');       // drip tip
put('mudcria_body', cx, 28, 'o');             // drip bottom

// Highlight on top
put('mudcria_body', cx, 11, 'h');
put('mudcria_body', cx - 1, 12, 'h');
put('mudcria_body', cx + 1, 12, 'h');

// ============================ MUDCRIA_EYE (glow palette) ============================
// Just ONE central eye (simpler/less developed than the parent's pair).
put('mudcria_eye', cx, 14, 'b');
put('mudcria_eye', cx - 1, 14, 'h');
put('mudcria_eye', cx + 1, 14, 'h');
put('mudcria_eye', cx, 13, 'h');

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

emit('mudcria_body');
emit('mudcria_eye');
