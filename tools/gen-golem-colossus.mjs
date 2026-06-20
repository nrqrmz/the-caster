// Moss Colossus silhouette — front-facing, 32-grid (fills canvas densely).
// Serves: coloso_musgoso (mossGreen 0x558b2f, size 80).
// Silhouette: MASSIVE, HULKING boulder-bodied giant covered in MOSS patches.
//   Enormous arms that stretch nearly to the canvas edges, a HUGE torso that
//   fills most of the canvas width. Much bigger/bulkier than the stone or mud golem.
//   The moss is represented by 'h' highlights in a green-leaning way (using the
//   body's own highlight role, which will read as green moss over the mossGreen base).
//   The body is a mixture of round boulders (not purely angular like stone, not
//   purely soft like mud — it's MASSIVE BOULDERS, an intermediate).
//
// Parts authored:
//   colossus_body  — massive hulking boulder torso + enormous arms/fists + head.
//                    Fills most of the 32×32 canvas. 'b' base, 's' shade, 'h' moss
//                    highlights, 'o' outline.
//   colossus_eyes  — two small glowing eyes (palette: glow) in the wide face.
// Run: node tools/gen-golem-colossus.mjs

const N = 32, cx = 16;
const layers = {
  colossus_body: {},
  colossus_eyes: {},
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

// ============================ COLOSSUS_BODY (massive hulking form) ============================
// The colossus FILLS the canvas — it should feel enormous compared to the 32×32 grid.
// It's styled as a BOULDER GIANT: intermediate between round and angular.
// Key: arms nearly reach x=0 and x=31, torso spans x=4..27.

// 1. MASSIVE TORSO — fills the middle, wide and tall.
//    Use a very wide, very tall blob (not a thin humanoid silhouette).
blob('colossus_body', cx, 16, 12, 12);

// 2. ENORMOUS SHOULDERS — giant boulder knobs sitting on top of the torso.
//    Wider than the torso's base width to give that "boulder shoulders" silhouette.
blob('colossus_body', cx - 9, 10, 6, 5);     // left shoulder boulder
blob('colossus_body', cx + 9, 10, 6, 5);     // right shoulder boulder

// 3. HUGE HEAD — a wide, heavy head sitting on top (not a small dot — the colossus is BIG).
blob('colossus_body', cx, 5, 5, 4);

// 4. ENORMOUS ARMS — nearly reach the canvas edges.
//    Long wide arm columns sweeping down from shoulders.
blob('colossus_body', cx - 12, 17, 4, 8);    // left arm (very long)
blob('colossus_body', cx + 12, 17, 4, 8);    // right arm (very long)

// 5. MASSIVE FISTS — giant boulder fists at the end of the long arms.
disk('colossus_body', cx - 12, 26, 4.5, 'b');  // left fist boulder
disk('colossus_body', cx + 12, 26, 4.5, 'b');  // right fist boulder
// Fist outlines (solid, heavy)
put('colossus_body', cx - 12, 31, 'o');
put('colossus_body', cx + 12, 31, 'o');
put('colossus_body', cx - 16, 26, 'o');
put('colossus_body', cx + 16, 26, 'o');

// 6. SHORT WIDE LEGS — massive pillars of stone, very wide/short (barely visible stubs).
blob('colossus_body', cx - 5, 28, 4, 3);     // left leg pillar
blob('colossus_body', cx + 5, 28, 4, 3);     // right leg pillar

// 7. MOSS PATCHES — scattered 'h' highlights across the body surface to simulate
//    moss growing on the boulder surface. Irregular placement.
// Top of head moss clump
put('colossus_body', cx - 2, 2, 'h');
put('colossus_body', cx,     1, 'h');
put('colossus_body', cx + 1, 2, 'h');
put('colossus_body', cx - 3, 3, 'h');

// Left shoulder moss
put('colossus_body', cx - 11, 7, 'h');
put('colossus_body', cx - 9,  7, 'h');
put('colossus_body', cx - 10, 8, 'h');

// Right shoulder moss
put('colossus_body', cx + 9,  7, 'h');
put('colossus_body', cx + 11, 7, 'h');
put('colossus_body', cx + 10, 8, 'h');

// Upper torso moss patches
put('colossus_body', cx - 3, 11, 'h');
put('colossus_body', cx - 4, 12, 'h');
put('colossus_body', cx + 4, 11, 'h');
put('colossus_body', cx + 3, 13, 'h');

// Mid torso moss
put('colossus_body', cx - 6, 16, 'h');
put('colossus_body', cx,     15, 'h');
put('colossus_body', cx + 5, 17, 'h');

// Left arm moss
put('colossus_body', cx - 13, 19, 'h');
put('colossus_body', cx - 11, 21, 'h');

// Right arm moss
put('colossus_body', cx + 13, 20, 'h');
put('colossus_body', cx + 11, 22, 'h');

// 8. Heavy shade along bottom/right for 3D boulder feel
put('colossus_body', cx - 1, 29, 's');
put('colossus_body', cx,     29, 's');
put('colossus_body', cx + 1, 29, 's');

// ============================ COLOSSUS_EYES (glow palette) ============================
// Two small glowing eyes in the wide face (widely spaced for the massive head).
put('colossus_eyes', cx - 2, 4, 'b');
put('colossus_eyes', cx - 2, 5, 'h');    // left eye
put('colossus_eyes', cx - 1, 4, 'h');

put('colossus_eyes', cx + 1, 4, 'b');
put('colossus_eyes', cx + 1, 5, 'h');    // right eye
put('colossus_eyes', cx + 2, 4, 'h');

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

emit('colossus_body');
emit('colossus_eyes');
