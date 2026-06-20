// Mushroom silhouette — top-down front-facing 32-grid.
// Serves: hongo_esporario (spore-violet 0x8e24aa) + brote_pustula (vineGreen 0x33691e recolor).
//
// Parts authored:
//   mush_cap    — domed mushroom cap (large dome blob) with pale highlight spots and
//                 darker shade edge. 'b' fill, 'h' spots, 's' lower-rim, 'o' outline.
//   mush_stem   — thick cylindrical stem below the cap with vertical shading.
//                 'b' fill, 'h' left edge, 's' right edge, 'o' outline.
//   mush_spores — 5–6 floating spore dots drifting above the cap (palette: sporeglow).
//                 Small 'b'/'h' dots scattered in a halo above the dome.
// Run: node tools/gen-mushroom.mjs

const N = 32, cx = 16;
const layers = {
  mush_cap:    {},
  mush_stem:   {},
  mush_spores: {},
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

// ============================ MUSH_CAP (domed mushroom cap) ============================
// Wide flat-bottom dome: wide ellipse centered at y=13. The cap overhangs the stem.

blob('mush_cap', cx, 13, 9, 6);

// Characteristic mushroom pale highlight SPOTS — 3 irregular round spots in upper area
disk('mush_cap', cx - 3, 10, 1.5, 'h');   // left spot
disk('mush_cap', cx + 2, 9, 1.2, 'h');    // right spot
disk('mush_cap', cx - 1, 12, 1.0, 'h');   // center spot

// Cap underside: flat bottom edge (gills suggestion) — shade row at bottom of cap
for (let x = cx - 7; x <= cx + 7; x++) {
  if (layers['mush_cap'][`${x},18`]) put('mush_cap', x, 18, 's');
}
// Re-enforce outline at very bottom of cap overhang
for (let x = cx - 8; x <= cx + 8; x++) {
  if (layers['mush_cap'][`${x},19`]) put('mush_cap', x, 19, 'o');
}

// ============================ MUSH_STEM (cylindrical stem) ============================
// Stem: 5 pixels wide, from y=18 (below cap) to y=27 (base).
// Left column highlights, right column shaded.

for (let y = 18; y <= 27; y++) {
  // Stem width: 5px (cx-2 to cx+2)
  for (let x = cx - 2; x <= cx + 2; x++) {
    let r = 'b';
    if (x === cx - 2 || y === 27) r = 'o';      // left edge + base = outline
    else if (x === cx + 2) r = 'o';              // right edge = outline
    else if (x === cx - 1) r = 'h';              // highlight left inner
    else if (x === cx + 1) r = 's';              // shade right inner
    put('mush_stem', x, y, r);
  }
}
// Top of stem where it meets the cap underside
for (let x = cx - 2; x <= cx + 2; x++) put('mush_stem', x, 18, 'o');

// ============================ MUSH_SPORES (floating spore dots above cap) ============================
// 6 scattered spore dots floating above and around the cap (palette: sporeglow).
// Arranged in an irregular arc above the dome.

const sporeDots = [
  [cx - 6, 5],   // far left high
  [cx - 2, 3],   // left-center top
  [cx + 1, 2],   // center top
  [cx + 5, 4],   // right high
  [cx + 7, 7],   // far right
  [cx - 8, 8],   // far left lower
];
for (const [sx, sy] of sporeDots) {
  put('mush_spores', sx, sy, 'b');
  put('mush_spores', sx + 1, sy, 'h');  // tiny 2-pixel dot with highlight
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

emit('mush_cap');
emit('mush_stem');
emit('mush_spores');
