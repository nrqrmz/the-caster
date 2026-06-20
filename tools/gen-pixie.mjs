// Pixie silhouette — tiny winged fairy, front-facing, 32-grid.
// Serves: pixie (sporeViolet 0x8e24aa).
//
// Parts authored:
//   pixie_wings — two pairs of dragonfly-style wings spread wide behind the body.
//                 Thin elongated ovals, translucent look (sparse 'b'/'h', 'o' outline).
//   pixie_body  — tiny humanoid body: small round head + slim torso + tiny arms/legs.
//                 'b' base, 'h' highlight, 's' shade, 'o' outline. Very compact.
//   pixie_glow  — radiant aura halo (palette: sporeglow). Scattered 'b'/'h' glow
//                 dots around the body suggesting magical light emission.
// Run: node tools/gen-pixie.mjs

const N = 32, cx = 16;
const layers = {
  pixie_wings: {},
  pixie_body:  {},
  pixie_glow:  {},
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

// ============================ PIXIE_WINGS (dragonfly-style wings, behind body) ============================
// 4 wings: 2 upper (large) + 2 lower (smaller), symmetrical about cx.
// Wings are thin elongated ovals rendered as outlines with sparse fill.

for (const s of [-1, 1]) {
  // Upper wing: elongated ellipse going up and to the side
  // Anchor at shoulder (cx ± 2, y=16), tip extends to cx ± 12, y=8
  const uwx = cx + s * 7, uwy = 10, urx = 5, ury = 4;
  for (let y = Math.floor(uwy - ury); y <= Math.ceil(uwy + ury); y++)
    for (let x = Math.floor(uwx - urx); x <= Math.ceil(uwx + urx); x++) {
      const d = ((x - uwx) / urx) ** 2 + ((y - uwy) / ury) ** 2;
      if (d > 1) continue;
      // Wings are translucent — only outline + sparse inner 'h' near top
      if (d > 0.75) { put('pixie_wings', x, y, 'o'); }
      else if (d < 0.4 && y < uwy) { put('pixie_wings', x, y, 'h'); }
      else { put('pixie_wings', x, y, 'b'); }
    }

  // Lower wing: smaller, angled downward
  const lwx = cx + s * 7, lwy = 20, lrx = 4, lry = 3;
  for (let y = Math.floor(lwy - lry); y <= Math.ceil(lwy + lry); y++)
    for (let x = Math.floor(lwx - lrx); x <= Math.ceil(lwx + lrx); x++) {
      const d = ((x - lwx) / lrx) ** 2 + ((y - lwy) / lry) ** 2;
      if (d > 1) continue;
      if (d > 0.75) { put('pixie_wings', x, y, 'o'); }
      else if (d < 0.35) { put('pixie_wings', x, y, 'h'); }
      else { put('pixie_wings', x, y, 'b'); }
    }
}

// ============================ PIXIE_BODY (tiny humanoid) ============================
// Very small fairy: head is 4px wide, body is 2px wide, tiny limbs.
// The whole body sits in the center of the canvas.

// Head — small round blob centered at (cx, 11)
blob('pixie_body', cx, 11, 2.5, 2.5);

// Hair — a few pixels on top
put('pixie_body', cx - 1, 8, 'h');
put('pixie_body', cx,     8, 'h');
put('pixie_body', cx + 1, 8, 's');
put('pixie_body', cx - 2, 9, 'h');
put('pixie_body', cx + 2, 9, 's');

// Eyes on face — 2 tiny dots (will be covered by glow palette part)
put('pixie_body', cx - 1, 11, 'b');
put('pixie_body', cx + 1, 11, 'b');

// Tiny nose
put('pixie_body', cx, 12, 's');

// Torso — narrow column
for (let y = 14; y <= 19; y++) {
  put('pixie_body', cx - 1, y, 'h');
  put('pixie_body', cx,     y, 'b');
  put('pixie_body', cx + 1, y, 's');
}
put('pixie_body', cx - 1, 14, 'o');
put('pixie_body', cx + 1, 14, 'o');
for (let y = 14; y <= 19; y++) {
  put('pixie_body', cx - 2, y, 'o');
  put('pixie_body', cx + 2, y, 'o');
}
put('pixie_body', cx - 1, 19, 'o');
put('pixie_body', cx,     19, 'o');
put('pixie_body', cx + 1, 19, 'o');

// Tiny arms extending sideways from upper torso
// Left arm
put('pixie_body', cx - 3, 15, 'b');
put('pixie_body', cx - 4, 16, 'b');
put('pixie_body', cx - 4, 15, 'o');
// Right arm
put('pixie_body', cx + 3, 15, 'b');
put('pixie_body', cx + 4, 16, 'b');
put('pixie_body', cx + 4, 15, 'o');

// Tiny legs / skirt
for (const s of [-1, 1]) {
  const lx = cx + s * 1;
  for (let y = 20; y <= 24; y++) put('pixie_body', lx, y, 'b');
  put('pixie_body', lx, 20, 'o');
  put('pixie_body', lx + (s > 0 ? 1 : -1), 20, 'o');
  put('pixie_body', lx, 24, 'o');
  // foot
  put('pixie_body', lx + s, 24, 'o');
}

// ============================ PIXIE_GLOW (radiant aura, palette: sporeglow) ============================
// Scattered glow dots around the body in a loose halo.

const glowDots = [
  [cx - 5, 9], [cx + 5, 8], [cx - 4, 19], [cx + 4, 20],
  [cx - 6, 13], [cx + 6, 14], [cx, 6],
  [cx - 3, 6], [cx + 3, 7],
  [cx - 7, 17], [cx + 7, 16],
];
for (const [gx, gy] of glowDots) {
  put('pixie_glow', gx, gy, 'b');
  // Add a tiny 'h' highlight to some dots for sparkle
  if ((gx + gy) % 2 === 0) put('pixie_glow', gx + 1, gy, 'h');
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

emit('pixie_wings');
emit('pixie_body');
emit('pixie_glow');
