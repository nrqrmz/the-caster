// Stone Golem silhouette — front-facing, 32-grid.
// Serves: golem_piedra (stoneGrey 0x9e9e9e, size 64).
// Silhouette: ANGULAR, BLOCKY humanoid of stacked ROCK SLABS.
//   Hard geometric torso (rectangular blocks), squared boulder shoulders,
//   blocky fists, sharp straight edges, visible CRACKS.
//   DELIBERATELY ANGULAR and BLOCKY — opposite of the round mud golem.
//   Must read as clearly different from the mud golem: sharp lines vs soft drips.
//
// Parts authored:
//   stone_body   — angular rectangular slab torso + block shoulders + blocky fists.
//                  'b' base, 's' shade right/bottom, 'h' highlight left/top, 'o' outline.
//                  Hard rectilinear shapes only — NO round blobs.
//   stone_cracks — internal crack lines ('s'/'o') across the body blocks.
//                  palette: shadow.
//   stone_eyes   — two glowing eyes (palette: glow).
// Run: node tools/gen-golem-stone.mjs

const N = 32, cx = 16;
const layers = {
  stone_body:   {},
  stone_cracks: {},
  stone_eyes:   {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// Helper: fill a rectangle (ANGULAR - no blobs, no disks, all straight lines)
function rect(L, x0, y0, x1, y1, role = 'b', shadeRight = true, highlightLeft = true) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let r = role;
      // Outline border (hard edges — key for angular look)
      if (y === y0 || y === y1 || x === x0 || x === x1) { r = 'o'; }
      else if (highlightLeft && x === x0 + 1) r = 'h';
      else if (shadeRight && x === x1 - 1) r = 's';
      else if (shadeRight && y === y1 - 1) r = 's';
      put(L, x, y, r);
    }
  }
}

// ============================ STONE_BODY (angular block structure) ============================

// 1. MAIN TORSO SLAB — a wide rectangular block (the primary mass).
//    Flat top, flat sides. Stone reads as a BLOCK, not a blob.
rect('stone_body', cx - 8, 9, cx + 8, 22);

// 2. BOULDER SHOULDERS — two wide flat-topped rectangular blocks.
//    They sit above the torso as distinct slabs (squared, overhanging).
rect('stone_body', cx - 11, 7, cx - 5, 12);    // left shoulder slab
rect('stone_body', cx + 5,  7, cx + 11, 12);   // right shoulder slab

// 3. HEAD BLOCK — a squared rectangular head slab (flat, boxy, massive).
//    Broader than a human head, flat top.
rect('stone_body', cx - 5, 3, cx + 5, 9);

// 4. BLOCKY ARMS — rectangular arm column on each side.
//    Short, stout rectangular columns, clearly rectilinear.
rect('stone_body', cx - 13, 12, cx - 9, 20);    // left arm column
rect('stone_body', cx + 9,  12, cx + 13, 20);   // right arm column

// 5. BLOCKY FISTS — wider rectangular blocks at the end of the arms.
//    Square-ended (not round), wider than the arm for a fist-like shape.
rect('stone_body', cx - 14, 19, cx - 8, 24);    // left fist block
rect('stone_body', cx + 8,  19, cx + 14, 24);   // right fist block

// 6. LEGS — two short rectangular columns at the bottom of the torso.
//    Wide, squat, flat-bottomed.
rect('stone_body', cx - 7, 22, cx - 2, 29);     // left leg
rect('stone_body', cx + 2, 22, cx + 7, 29);     // right leg

// 7. FEET — slightly wider flat blocks at the bottom of legs.
rect('stone_body', cx - 8, 28, cx - 1, 31);     // left foot
rect('stone_body', cx + 1, 28, cx + 8, 31);     // right foot

// ============================ STONE_CRACKS (shadow palette — internal cracks) ============================
// Diagonal and angular crack lines across the main block surfaces.
// These are hard angular lines (like cracks in stone — not curves).

// Main torso crack 1: diagonal across the left side of the torso
line('stone_cracks', cx - 6, 11, cx - 2, 15, 'o');
line('stone_cracks', cx - 6, 11, cx - 7, 13, 's');   // crack branch

// Main torso crack 2: across the right side of the torso
line('stone_cracks', cx + 3, 13, cx + 7, 18, 'o');
line('stone_cracks', cx + 7, 18, cx + 6, 20, 's');   // crack branch

// Head crack
line('stone_cracks', cx - 2, 5, cx + 1, 8, 'o');

// Left shoulder crack
line('stone_cracks', cx - 10, 8, cx - 7, 10, 's');

// Right shoulder crack
line('stone_cracks', cx + 6, 8, cx + 9, 10, 's');

// Fist cracks
line('stone_cracks', cx - 13, 20, cx - 9, 23, 's');
line('stone_cracks', cx + 9,  20, cx + 13, 22, 's');

// ============================ STONE_EYES (glow palette) ============================
// Two small glowing eyes set in the flat head block.
put('stone_eyes', cx - 2, 6, 'b');
put('stone_eyes', cx - 2, 7, 'h');   // left eye
put('stone_eyes', cx - 1, 6, 'h');

put('stone_eyes', cx + 1, 6, 'b');
put('stone_eyes', cx + 1, 7, 'h');   // right eye
put('stone_eyes', cx + 2, 6, 'h');

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

emit('stone_body');
emit('stone_cracks');
emit('stone_eyes');
