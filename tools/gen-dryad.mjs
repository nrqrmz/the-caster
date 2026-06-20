// DRYAD (Dríada) — plant-woman sorceress, front-facing BOSS, 32-grid.
// Serves: driada (nv6 boss, size 96, baseColor mossGreen 0x558b2f).
//
// Design: A feminine humanoid figure FUSED with plant matter.
//   Body reads as a woman in a flowing LEAF DRESS — the torso and skirt are layered
//   leaves and moss, taking the mossGreen baseColor. Arms outstretched, channeling
//   healing energy. The silhouette is unmistakably female and sorceress-like.
//   Hair is a cascade of VINES and leaf sprigs (leafgreen palette).
//   Face + hands are pale BARK-SKIN tone (skin palette).
//   A healing BLOOM / floral aura radiates from her chest (sporeglow palette).
//
// Layer order (back to front): dryad_body → dryad_hair → dryad_skin → dryad_bloom
//
// Parts:
//   dryad_body  — leaf-dress torso + skirt + outstretched arms (baseColor mossGreen)
//   dryad_hair  — vine hair cascading down (palette: leafgreen)
//   dryad_skin  — oval face + small hands at arm ends (palette: skin)
//   dryad_bloom — healing flower aura at chest center (palette: sporeglow)
//
// Run: node tools/gen-dryad.mjs

const N = 32, cx = 16;
const layers = {
  dryad_body:  {},
  dryad_hair:  {},
  dryad_skin:  {},
  dryad_bloom: {},
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

// ============================ DRYAD_BODY ============================
// Feminine leaf-dress body: slim bodice tapering to waist, flaring leaf skirt below.
// Outstretched arms at sides, reaching wide — a sorceress channeling nature magic.

// --- BODICE (leaf-covered torso) ---
// Slim but clearly feminine: narrow waist at y≈19, wider shoulders and hips.
// Shoulder width ~9 at y=13, waist ~6 at y=18, hips back to ~8 at y=22.
for (let y = 13; y <= 22; y++) {
  const t = (y - 13) / 9;
  // Hourglass: wide→narrow→slightly wider
  const half = (y <= 18)
    ? 4.5 - (y - 13) * 0.25          // shoulders narrowing to waist
    : 3.5 + (y - 19) * 0.35;         // waist flaring to hips
  const Lx = Math.round(cx - half), Rx = Math.round(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1) r = 'h';        // left highlight (light from upper-left)
    else if (x >= Rx - 1) r = 's';        // right shade
    put('dryad_body', x, y, r);
  }
}

// Leaf texture on bodice — individual leaf-tip accents (darker 's' veins + 'h' leaf edges)
// Left bodice leaf veins
line('dryad_body', 13, 14, 12, 17, 's');
line('dryad_body', 14, 15, 13, 18, 's');
// Right bodice leaf veins
line('dryad_body', 19, 14, 20, 17, 's');
line('dryad_body', 18, 15, 19, 18, 's');
// Center highlight line (highlight running down center of bodice)
for (let y = 13; y <= 18; y++) put('dryad_body', cx, y, 'h');

// --- LEAF SKIRT (flaring wide below hips) ---
// A flowing leaf dress: wider at bottom, irregular leaf-hem silhouette.
for (let y = 22; y <= 31; y++) {
  const t = (y - 22) / 9;
  const half = Math.round(4.5 + t * 6.5);   // flares from ~4.5 to ~11
  const Lx = cx - half, Rx = cx + half;
  for (let x = Lx; x <= Rx; x++) {
    let r = 'b';
    if (x === Lx || x === Rx) r = 'o';
    else if (x <= Lx + 1 || x >= Rx - 1) r = 's';
    else if (x === cx || x === cx - 1) r = 'h';
    put('dryad_body', x, y, r);
  }
}

// Leaf hem edges — irregular leaf-tip silhouette on the skirt bottom
// Create leaf-point indentations at the hem (y=31) to break the straight edge
for (const [xGap] of [[cx - 8], [cx - 2], [cx + 4]]) {
  put('dryad_body', xGap, 31, '.');   // gap between leaf tips
}

// Leaf fold lines on skirt — radiating from waist down
line('dryad_body', cx - 2, 22, cx - 5, 30, 's');    // left leaf fold
line('dryad_body', cx + 2, 22, cx + 5, 30, 's');    // right leaf fold
line('dryad_body', cx - 1, 22, cx - 7, 29, 's');    // far left fold
line('dryad_body', cx + 1, 22, cx + 7, 29, 's');    // far right fold
// Highlight leaf ridges between folds
line('dryad_body', cx,     22, cx,     30, 'h');     // center highlight
line('dryad_body', cx - 3, 23, cx - 6, 29, 'h');    // left ridge
line('dryad_body', cx + 3, 23, cx + 6, 29, 'h');    // right ridge

// --- OUTSTRETCHED ARMS ---
// Both arms extend wide and slightly downward, palms up — channeling healing.
// Left arm: shoulder at (cx-4, 14) → hand at (4, 20)
line('dryad_body', cx - 4, 14, 5, 20, 'b');
line('dryad_body', cx - 4, 15, 4, 20, 'b');
line('dryad_body', cx - 5, 14, 3, 20, 'o');
line('dryad_body', cx - 3, 14, 6, 20, 'b');
// Wrist / end of left arm (skin hands are drawn on dryad_skin)

// Right arm: shoulder at (cx+4, 14) → hand at (27, 20)
line('dryad_body', cx + 4, 14, 27, 20, 'b');
line('dryad_body', cx + 4, 15, 28, 20, 'b');
line('dryad_body', cx + 5, 14, 29, 20, 'o');
line('dryad_body', cx + 3, 14, 26, 20, 'b');

// Leaf-sleeves along arms (short leaf-tuft decoration at mid-arm)
for (const [sx, sy, dir] of [
  [10, 18, -1],   // left arm mid-leaf tufts
  [22, 18,  1],   // right arm mid-leaf tufts
]) {
  put('dryad_body', sx,          sy,     'h');
  put('dryad_body', sx + dir,    sy - 1, 'h');
  put('dryad_body', sx + dir * 2, sy,   's');
}

// ============================ DRYAD_HAIR ============================
// Cascading vine hair — long vines with leaf-like nodes hanging down from the head.
// Hair spreads wide then falls down beside the body.

// Hair crown/top — vines radiating from head-top (y≈5..7) in leafgreen
// Crown vines: sprout upward then cascade down both sides
// Left vine cascade: starts at cx-2, y=5 and runs to left, then down
line('dryad_hair', cx - 2, 5, cx - 5, 2, 'b');   // upward vine tip (left)
line('dryad_hair', cx,     4, cx,     2, 'h');    // top center vine
line('dryad_hair', cx + 2, 5, cx + 5, 2, 'b');   // upward vine tip (right)

// Main vine flow: left side cascades down along the body
for (let y = 5; y <= 28; y++) {
  // Left vine column: x=10..11, wiggles slightly
  const lx = 10 + (y % 4 === 0 ? -1 : 0);
  put('dryad_hair', lx,     y, (y % 5 === 0) ? 'h' : 'b');
  put('dryad_hair', lx - 1, y, 'o');
  // Right vine column: x=21..22
  const rx = 21 + (y % 4 === 2 ? 1 : 0);
  put('dryad_hair', rx,     y, (y % 5 === 2) ? 'h' : 'b');
  put('dryad_hair', rx + 1, y, 'o');
}

// Leaf nodes along the vines — small horizontal leaf-pairs at intervals
for (const y of [8, 12, 16, 20, 24]) {
  // Left vine leaf node
  put('dryad_hair',  9, y, 'h');
  put('dryad_hair',  8, y + 1, 'b');
  // Right vine leaf node
  put('dryad_hair', 22, y, 'h');
  put('dryad_hair', 23, y + 1, 'b');
}

// Hair crown blob (the main hair mass at top of head, above face)
for (let y = 4; y <= 7; y++) {
  const half = 3.5 + (7 - y) * 0.5;
  const Lx = Math.round(cx - half), Rx = Math.round(cx + half);
  for (let x = Lx; x <= Rx; x++) {
    const role = (x === Lx || x === Rx) ? 'o' : ((x <= Lx + 1) ? 'h' : 'b');
    put('dryad_hair', x, y, role);
  }
}

// Small leaf sprigs at the crown — pointed tips above head
for (const [lx, ly] of [[cx - 3, 1], [cx, 0], [cx + 3, 1]]) {
  put('dryad_hair', lx,     ly,     'h');
  put('dryad_hair', lx,     ly + 1, 'b');
  put('dryad_hair', lx - 1, ly + 1, 'b');
  put('dryad_hair', lx + 1, ly + 1, 'b');
}

// ============================ DRYAD_SKIN ============================
// Face (oval, centered at cx, y≈10) + small hands at arm ends.

// Face — oval with shading. Clearly feminine face reads over the body.
// Slightly taller than wide: rx=3.5, ry=4.0, centered at (cx, 10)
for (let y = 6; y <= 14; y++) {
  for (let x = cx - 4; x <= cx + 4; x++) {
    const d = ((x - cx) / 3.5) ** 2 + ((y - 10) / 4.0) ** 2;
    if (d > 1) continue;
    let r = 'b';
    if (d > 0.80) r = 'o';
    else if (x <= cx - 2 && y <= 9) r = 'h';   // upper-left highlight
    else if (x >= cx + 1 && y >= 11) r = 's';  // lower-right shade
    put('dryad_skin', x, y, r);
  }
}

// Eyes — two almond-shaped eyes (feminine)
// Left eye at (cx-2, 9..10), right at (cx+2, 9..10)
put('dryad_skin', cx - 2, 9,  'o');
put('dryad_skin', cx - 1, 9,  's');
put('dryad_skin', cx - 2, 10, 's');
put('dryad_skin', cx + 2, 9,  'o');
put('dryad_skin', cx + 1, 9,  's');
put('dryad_skin', cx + 2, 10, 's');

// Small nose dot
put('dryad_skin', cx, 11, 's');

// Lips — gentle curve (2 pixels wide, slightly 's')
put('dryad_skin', cx - 1, 12, 's');
put('dryad_skin', cx,     12, 'h');
put('dryad_skin', cx + 1, 12, 's');

// Small hands at ends of outstretched arms
// Left hand ~(4, 20)
disk('dryad_skin', 4, 20, 1.8, 'b');
put('dryad_skin', 3, 19, 'h');
put('dryad_skin', 5, 21, 's');
put('dryad_skin', 3, 20, 'o');
put('dryad_skin', 5, 20, 'o');

// Right hand ~(28, 20)
disk('dryad_skin', 28, 20, 1.8, 'b');
put('dryad_skin', 27, 19, 'h');
put('dryad_skin', 29, 21, 's');
put('dryad_skin', 27, 20, 'o');
put('dryad_skin', 29, 20, 'o');

// ============================ DRYAD_BLOOM ============================
// Healing bloom / flower aura radiating from her chest — a sporeglow floral glyph.
// A stylized 6-petal flower, small, centered at (cx, 16) on the bodice.

// Central glow core
disk('dryad_bloom', cx, 16, 1.5, 'h');
put('dryad_bloom', cx, 16, 'a');   // brightest center accent

// Six petals radiating outward (sporeglow palette roles: h=bright petal, b=petal body)
// Top petal
line('dryad_bloom', cx,     14, cx,     12, 'b');
put('dryad_bloom', cx, 12, 'h');
// Bottom petal
line('dryad_bloom', cx,     18, cx,     20, 'b');
put('dryad_bloom', cx, 20, 'h');
// Upper-left petal
line('dryad_bloom', cx - 1, 15, cx - 3, 13, 'b');
put('dryad_bloom', cx - 3, 13, 'h');
// Upper-right petal
line('dryad_bloom', cx + 1, 15, cx + 3, 13, 'b');
put('dryad_bloom', cx + 3, 13, 'h');
// Lower-left petal
line('dryad_bloom', cx - 1, 17, cx - 3, 19, 'b');
put('dryad_bloom', cx - 3, 19, 'h');
// Lower-right petal
line('dryad_bloom', cx + 1, 17, cx + 3, 19, 'b');
put('dryad_bloom', cx + 3, 19, 'h');

// Small aura glow dots around petals (faint spore-glow haze)
for (const [ax, ay] of [
  [cx - 4, 14], [cx + 4, 14], [cx - 4, 18], [cx + 4, 18],
  [cx, 11], [cx, 21],
]) {
  put('dryad_bloom', ax, ay, 's');
}

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

emit('dryad_body');
emit('dryad_hair');
emit('dryad_skin');
emit('dryad_bloom');
