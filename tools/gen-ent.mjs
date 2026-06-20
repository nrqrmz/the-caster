// ENT GUARDIAN — giant walking tree, front-facing BOSS, 32-grid.
// Serves: ent_guardian (nv6 tank boss, size 96, baseColor barkBrown 0x6d4c41).
//
// Design: A MASSIVE walking TREE — completely distinct from the feminine dryad.
//   The silhouette is dominated by a HUGE vertical trunk (far wider and bulkier than
//   any humanoid), two gnarled BRANCH-ARMS spreading wide, thick ROOT-FEET at the base,
//   and a leafy CANOPY at the top. A carved hollow FACE sits mid-trunk with glowing eyes.
//   This is a tree-tank: enormous, square-shouldered, rooted.
//
// Layer order (back to front): ent_trunk → ent_canopy → ent_face → ent_eyes
//
// Parts:
//   ent_trunk   — main trunk body + branch-arms + root-feet (baseColor barkBrown)
//   ent_canopy  — leafy crown at top (palette: leafgreen)
//   ent_face    — carved hollow face in trunk (palette: shadow)
//   ent_eyes    — glowing eyes in the face hollow (palette: sporeglow)
//
// Run: node tools/gen-ent.mjs

const N = 32, cx = 16;
const layers = {
  ent_trunk:  {},
  ent_canopy: {},
  ent_face:   {},
  ent_eyes:   {},
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

// ============================ ENT_TRUNK ============================
// The main trunk: a MASSIVE rectangular column running almost the full height.
// Much wider than any humanoid — width ~12 at mid-trunk. This is the defining
// silhouette difference from the dryad.

// --- MAIN TRUNK BODY ---
// Trunk spans y=8 to y=28, width tapers slightly top-to-bottom (wider at base).
for (let y = 8; y <= 28; y++) {
  const t = (y - 8) / 20;
  // Trunk: 10 wide at top, 13 wide at bottom (a tree flares at the base)
  const half = Math.round(5 + t * 1.5);
  const Lx = cx - half, Rx = cx + half;
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';       // left bark highlight (light from left)
    else if (x >= Rx - 2) r = 's';       // right bark shade
    put('ent_trunk', x, y, r);
  }
}

// Bark crack lines (vertical + diagonal, for texture) — 's' lines across the trunk
// Left bark crack
line('ent_trunk', cx - 3, 10, cx - 2, 16, 's');
line('ent_trunk', cx - 2, 16, cx - 4, 22, 's');
// Right bark crack
line('ent_trunk', cx + 3, 11, cx + 2, 18, 's');
line('ent_trunk', cx + 4, 18, cx + 2, 24, 's');
// Center vertical bark split (a deep crack running center-trunk)
line('ent_trunk', cx, 13, cx, 20, 'o');
// Horizontal bark rings — knot lines
for (const ky of [12, 19, 25]) {
  put('ent_trunk', cx - 2, ky, 's');
  put('ent_trunk', cx - 1, ky, 's');
  put('ent_trunk', cx + 1, ky, 's');
  put('ent_trunk', cx + 2, ky, 's');
}

// --- GNARLED BRANCH-ARMS ---
// Two thick, knotted branches spreading wide from upper trunk.
// They extend much further than the dryad's arms — more like a tree's actual branches.
// These are THICK (3-4px wide) and GNARLED (with bends/knots).

// LEFT BRANCH-ARM:
// Main branch: from trunk-left (cx-5, 12) → outer tip (2, 8) with a slight upward curve
// Thick branch shaft (3 lines of pixels wide)
line('ent_trunk', cx - 5, 12, 2,  9, 'b');
line('ent_trunk', cx - 5, 13, 2, 10, 'b');
line('ent_trunk', cx - 6, 12, 1,  9, 'o');
line('ent_trunk', cx - 4, 13, 3, 10, 'b');
// Branch knot / elbow bump at (8, 11) — using blob (supports rx/ry)
blob('ent_trunk', 8, 11, 2.0, 1.5);
// Upper twig from knot
line('ent_trunk', 8, 10, 4, 6, 'b');
line('ent_trunk', 8, 10, 4, 7, 'o');
// Lower twig from elbow
line('ent_trunk', 7, 12, 3, 14, 'b');
put('ent_trunk', 2, 14, 'o');
// Branch tip
put('ent_trunk', 1,  9, 'o');
put('ent_trunk', 2,  8, 'o');

// RIGHT BRANCH-ARM (mirror):
line('ent_trunk', cx + 5, 12, 30,  9, 'b');
line('ent_trunk', cx + 5, 13, 30, 10, 'b');
line('ent_trunk', cx + 6, 12, 31,  9, 'o');
line('ent_trunk', cx + 4, 13, 29, 10, 'b');
// Branch knot / elbow at (24, 11)
blob('ent_trunk', 24, 11, 2.0, 1.5);
// Upper twig from knot
line('ent_trunk', 24, 10, 28, 6, 'b');
line('ent_trunk', 24, 10, 28, 7, 'o');
// Lower twig from elbow
line('ent_trunk', 25, 12, 29, 14, 'b');
put('ent_trunk', 30, 14, 'o');
// Branch tip
put('ent_trunk', 31,  9, 'o');
put('ent_trunk', 30,  8, 'o');

// --- ROOT-FEET ---
// The trunk base flares into spreading gnarled roots at y=28..31.
// Roots spread wider than the trunk, clearly "tree roots" not legs.

// Left root mass
for (let y = 28; y <= 31; y++) {
  const spread = (y - 28) * 2;
  const Lx = cx - 6 - spread, Rx = cx - 2;
  for (let x = Lx; x <= Rx; x++) {
    const r = (x === Lx || x === Rx) ? 'o' : 'b';
    put('ent_trunk', x, y, r);
  }
}
// Center root bulge (trunk base continues into ground)
for (let y = 29; y <= 31; y++) {
  for (let x = cx - 2; x <= cx + 2; x++) {
    put('ent_trunk', x, y, (x === cx - 2 || x === cx + 2) ? 'o' : 'b');
  }
}
// Right root mass
for (let y = 28; y <= 31; y++) {
  const spread = (y - 28) * 2;
  const Lx = cx + 2, Rx = cx + 6 + spread;
  for (let x = Lx; x <= Rx; x++) {
    const r = (x === Lx || x === Rx) ? 'o' : 'b';
    put('ent_trunk', x, y, r);
  }
}
// Root tip dark-cracks
for (const [rtx, rty] of [[cx - 8, 30], [cx - 10, 31], [cx + 8, 30], [cx + 10, 31]]) {
  put('ent_trunk', rtx, rty, 's');
}

// ============================ ENT_CANOPY ============================
// Leafy crown at the top of the trunk — a CLOUD of foliage that makes the ent look
// like a tree. This is a major visual element: wide, irregular, clearly "leaves".
// Centered around (cx, 5), spanning most of the top width.
// Using disk() correctly: (L, cx0, cy0, r, role) — 5 args only.
// Using blob() for elliptical shapes.

// Main canopy mass: overlapping blobs for irregular organic canopy shape
blob('ent_canopy', cx,      4, 10, 4, 'b');    // central canopy mass
blob('ent_canopy', cx - 5,  5,  7, 4, 'b');    // left canopy lobe
blob('ent_canopy', cx + 5,  5,  7, 4, 'b');    // right canopy lobe
// Upper highlights (lit from above)
disk('ent_canopy', cx - 2,  2, 5, 'h');        // upper-left highlight
disk('ent_canopy', cx + 3,  2, 4, 'h');        // upper-right highlight

// Outline edges of canopy — find topmost pixel per column and outline it
for (let x = cx - 11; x <= cx + 11; x++) {
  for (let y = 0; y <= 9; y++) {
    if (layers.ent_canopy[`${x},${y}`]) {
      put('ent_canopy', x, y, 'o');
      break;
    }
  }
}
// Shade underside of canopy (where it meets the trunk)
for (let x = cx - 9; x <= cx + 9; x++) {
  for (let y = 9; y >= 0; y--) {
    if (layers.ent_canopy[`${x},${y}`]) {
      if (y >= 7) put('ent_canopy', x, y, 's');   // shade on underside
      break;
    }
  }
}

// Leaf texture: irregular highlight dots within canopy interior
for (const [lx, ly] of [
  [cx - 7, 4], [cx - 4, 2], [cx - 1, 3], [cx + 2, 1], [cx + 5, 4], [cx + 8, 5],
  [cx - 8, 6], [cx - 5, 7], [cx,     6], [cx + 4, 6], [cx + 7, 7],
]) {
  if (layers.ent_canopy[`${lx},${ly}`]) put('ent_canopy', lx, ly, 'h');
}

// Shade/dark pockets within canopy (shadow areas deep inside foliage)
for (const [lx, ly] of [
  [cx - 6, 6], [cx - 3, 7], [cx + 1, 7], [cx + 5, 7], [cx + 8, 6],
  [cx - 9, 5], [cx + 9, 5],
]) {
  if (layers.ent_canopy[`${lx},${ly}`]) put('ent_canopy', lx, ly, 's');
}

// ============================ ENT_FACE ============================
// A carved HOLLOW FACE in the trunk — not a humanoid face, but a tree-spirit face:
// a wide gaping hollow mouth, deep-set recessed eye sockets, and carved brow-ridge.
// Uses shadow palette so it reads as dark carved wood depressions.
// Face zone: centered at (cx, 16), the mid-trunk area.

// Carved brow ridge — a horizontal thick eyebrow-like ridge
for (let x = cx - 4; x <= cx + 4; x++) {
  put('ent_face', x, 14, 'b');    // brow ridge base
  put('ent_face', x, 15, 's');    // under-brow shadow
}
put('ent_face', cx - 4, 14, 'o');
put('ent_face', cx + 4, 14, 'o');

// Left eye socket — blob ellipse (deep hollow oval, clearly recessed)
blob('ent_face', cx - 3, 17, 2, 2, 'b');
// Right eye socket
blob('ent_face', cx + 3, 17, 2, 2, 'b');

// Gaping mouth (wide, irregular — tree spirit's hollow maw)
// The mouth is a wide arc at y=20..22
for (let x = cx - 4; x <= cx + 4; x++) {
  put('ent_face', x, 20, 'b');
  put('ent_face', x, 21, 's');
}
// Widen the mouth at center
for (let x = cx - 3; x <= cx + 3; x++) {
  put('ent_face', x, 22, 's');
}
put('ent_face', cx - 4, 20, 'o');
put('ent_face', cx + 4, 20, 'o');
put('ent_face', cx - 3, 23, 'o');
put('ent_face', cx + 3, 23, 'o');

// Root-like carved lines around face (texture in the hollow)
line('ent_face', cx - 2, 18, cx - 4, 20, 's');
line('ent_face', cx + 2, 18, cx + 4, 20, 's');

// ============================ ENT_EYES ============================
// Glowing sporeglow eyes within the carved hollow eye-sockets.
// Two luminous disks, centered in each socket.
disk('ent_eyes', cx - 3, 17, 2, 'b');
put('ent_eyes', cx - 3, 16, 'h');
put('ent_eyes', cx - 4, 17, 'h');

disk('ent_eyes', cx + 3, 17, 2, 'b');
put('ent_eyes', cx + 3, 16, 'h');
put('ent_eyes', cx + 4, 17, 'h');

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

emit('ent_trunk');
emit('ent_canopy');
emit('ent_face');
emit('ent_eyes');
