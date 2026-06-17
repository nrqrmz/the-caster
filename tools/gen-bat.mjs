// Bat silhouette — front-facing, 32-grid.
// Serves: murcielago (swarm bat, size 32, purple) and vampiro_alado (heavy winged
// vampire, size 64, blood-red). BAT parts are also reserved for Galahad's giant-bat
// form (a later task). Keep wings within the 32-grid bounds.
//
// Parts authored:
//   bat_wings — two membranous wings spanning outward from the shoulders (drawn behind body).
//               Scalloped/webbed edges: 'o' outline, 'b' membrane fill, 's'/'h' for depth.
//   bat_body  — small rounded furry body + head with two pointed ears on top.
//               'b' type-color fill, 'o' outline, 's' shade, 'h' highlight.
//   bat_eyes  — two small glowing eyes (palette: glow).
// Run: node tools/gen-bat.mjs

const N = 32, cx = 16;
const layers = {
  bat_wings: {},
  bat_body:  {},
  bat_eyes:  {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
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

// Fill triangle: fill all interior pixels with 'b' (no outline here — caller does outline)
function fillTriFill(L, x0, y0, x1, y1, x2, y2) {
  const xMin = Math.min(x0, x1, x2), xMax = Math.max(x0, x1, x2);
  const yMin = Math.min(y0, y1, y2), yMax = Math.max(y0, y1, y2);
  const cross = (ax, ay, bx, by, px, py) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      const d1 = cross(x0, y0, x1, y1, x, y);
      const d2 = cross(x1, y1, x2, y2, x, y);
      const d3 = cross(x2, y2, x0, y0, x, y);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(hasNeg && hasPos)) put(L, x, y, 'b');
    }
  }
}

// ============================ BAT_WINGS ============================
// Two membranous wings. Each wing fans from the shoulder outward.
// Shoulder/wing-root at (cx±3, y=14).
// Wing shape: two triangular sectors from shoulder to three tip points.
// Draw order: fill → shade → highlight → outline (perimeter only, NOT interior bones)

for (const s of [-1, 1]) {
  const shx = cx + s * 3, shy = 14;   // shoulder / wing root

  // Three wing bone tips
  const [tuX, tuY] = [cx + s * 13, 8];    // upper tip
  const [tmX, tmY] = [cx + s * 14, 13];   // mid tip
  const [tlX, tlY] = [cx + s * 11, 18];   // lower tip

  // Fill membrane (two triangular sectors) — pure 'b' first
  fillTriFill('bat_wings', shx, shy, tuX, tuY, tmX, tmY);
  fillTriFill('bat_wings', shx, shy, tmX, tmY, tlX, tlY);

  // Shade lower-half of membrane (rows 15-18) — overwrite 'b' → 's'
  for (let y = 15; y <= tlY; y++)
    for (let x = 0; x < N; x++)
      if (layers['bat_wings'][`${x},${y}`] === 'b') put('bat_wings', x, y, 's');

  // Highlight upper membrane rows (near shoulder→upper-tip, rows 8-11) — 'b' → 'h'
  for (let y = tuY; y <= 11; y++)
    for (let x = 0; x < N; x++)
      if (layers['bat_wings'][`${x},${y}`] === 'b') put('bat_wings', x, y, 'h');

  // Wing bone lines — draw INSIDE as thin shade/highlight accents (not outline)
  // to suggest the membrane-rib structure without overwriting the fill with 'o'
  line('bat_wings', shx, shy, tuX, tuY, 'h');   // upper bone: lighter
  line('bat_wings', shx, shy, tmX, tmY, 's');   // mid bone: darker
  line('bat_wings', shx, shy, tlX, tlY, 's');   // lower bone: darker

  // Perimeter outline: only the OUTER edges of the wing (trailing edge + tips)
  // Upper trailing edge tip-upper → tip-mid → tip-lower
  line('bat_wings', tuX, tuY, tmX, tmY, 'o');
  line('bat_wings', tmX, tmY, tlX, tlY, 'o');
  // Top edge shoulder → upper-tip
  line('bat_wings', shx, shy, tuX, tuY, 'o');   // re-draw upper bone as outline
  // Bottom edge shoulder → lower-tip
  line('bat_wings', shx, shy, tlX, tlY, 'o');   // re-draw lower bone as outline

  // Scallop notches at the trailing edge midpoints (two small 'o' indentations)
  const n1x = Math.round((tuX + tmX) / 2) - s, n1y = Math.round((tuY + tmY) / 2);
  const n2x = Math.round((tmX + tlX) / 2) - s, n2y = Math.round((tmY + tlY) / 2);
  put('bat_wings', n1x, n1y, 'o');
  put('bat_wings', n2x, n2y, 'o');
}

// ============================ BAT_BODY ============================
// Small rounded furry body + rounded head + two pointed ears on top.

// Ears — two pointed triangular shapes flanking the top of the head
for (const s of [-1, 1]) {
  const ex = cx + s * 3;
  put('bat_body', ex, 7, 'o');          // ear tip
  put('bat_body', ex + s, 7, 'o');      // ear outer tip
  put('bat_body', ex, 8, 'b');          // ear inner mid
  put('bat_body', ex + s, 8, 'b');      // ear outer mid
  put('bat_body', ex - s, 8, 'o');      // ear inner edge
  put('bat_body', ex, 9, 'b');          // ear base
  put('bat_body', ex + s, 9, 'b');      // ear base outer
  put('bat_body', ex - s, 9, 'o');      // ear base inner edge
}

// Head — round blob, centered at (cx, 11)
blob('bat_body', cx, 11, 3.2, 2.5);

// Neck connector
put('bat_body', cx - 1, 13, 'b'); put('bat_body', cx, 13, 'b'); put('bat_body', cx + 1, 13, 'b');

// Body — wider blob below the head, centered at (cx, 17)
blob('bat_body', cx, 17, 3.8, 3.2);

// Feet/claws — small hooks at the bottom
for (const s of [-1, 1]) {
  put('bat_body', cx + s * 2, 21, 'o');
  put('bat_body', cx + s * 3, 21, 'o');
  put('bat_body', cx + s * 3, 22, 'o');
}

// ============================ BAT_EYES ============================
// Two small glowing eyes on the face (glow palette renders 'b' as the glow color).
put('bat_eyes', cx - 1, 11, 'b');
put('bat_eyes', cx + 1, 11, 'b');

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

emit('bat_wings');
emit('bat_body');
emit('bat_eyes');
