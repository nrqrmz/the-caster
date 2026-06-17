// tools/gen-lider.mjs
// Generates two parts for lider_cultista (Air region boss):
//   lider_field  — arcane force-field ring encircling the figure
//   lider_staff  — authoritative tall staff with a large glowing crystal orb finial
// Run: node tools/gen-lider.mjs  → paste output into PARTS in src/data/sprites/parts.js
const N = 32;
const layers = { lider_field: {}, lider_staff: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
function disk(L, cx0, cy0, r, role) {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
}
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}

// ============================ LIDER_FIELD (arcane force-field ring) ============================
// A dashed/sparse ellipse ring encircling the whole figure.
// Ellipse centered near cx=15, cy=15; wide rx≈13, tall ry≈13, leaving slim margins.
// Drawn as sparse 'a'/'h' pixels (accent/highlight = bright arcane cyan when palettized with orbblue).
{
  const cx0 = 15, cy0 = 15, rx = 13, ry = 13;
  // Sample the ellipse perimeter, placing pixels with gaps to read as shimmering/dashed.
  const steps = 80;
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    const x = Math.round(cx0 + rx * Math.cos(angle));
    const y = Math.round(cy0 + ry * Math.sin(angle));
    // Skip every ~3rd segment to create gaps (dashed look)
    if (i % 3 === 2) continue;
    const role = (i % 6 < 2) ? 'h' : 'a'; // alternate highlight/accent for sparkle
    put('lider_field', x, y, role);
  }
  // Add a few inner energy arcs (upper arc partial ring, slightly smaller) for depth
  const rx2 = 11, ry2 = 11;
  for (let i = 0; i < steps; i++) {
    const angle = (2 * Math.PI * i) / steps;
    // Only draw upper half of inner arc (creates a partial glow effect)
    if (angle > Math.PI * 0.1 && angle < Math.PI * 0.9) continue;
    const x = Math.round(cx0 + rx2 * Math.cos(angle));
    const y = Math.round(cy0 + ry2 * Math.sin(angle));
    if (i % 4 === 0) put('lider_field', x, y, 'h');
  }
}

// ============================ LIDER_STAFF (authoritative tall staff + crystal orb) ============================
// A tall vertical shaft on the right side of the grid, topped with a large multi-pixel crystal orb.
// The orb is ~7x7 pixels and clearly bigger than cult_ember (6x6, pure highlight square).
// Shaft: col x=25, rows y=8 to y=30 (tall, 22px), role 'b'/'o' (wood palette).
// Crystal orb: centered at x=22, y=4, roughly 7px wide. Roles h/a for glowing gem appearance.
{
  // Shaft (tall wooden pole)
  for (let y = 9; y <= 30; y++) {
    put('lider_staff', 25, y, y % 3 === 0 ? 'h' : 'b');  // slight texture on shaft
    put('lider_staff', 26, y, 'o');                         // outline edge
  }
  // Shaft top connector
  put('lider_staff', 24, 9, 'o');
  put('lider_staff', 25, 8, 'o');
  put('lider_staff', 26, 8, 'o');

  // Crystal / orb finial — large glowing gem at top of staff
  // Center at (23, 4), radius ~4 — noticeably bigger and more ornate than cult_ember
  const ocx = 23, ocy = 4, or = 4;
  for (let y = ocy - or; y <= ocy + or; y++) {
    for (let x = ocx - or; x <= ocx + or; x++) {
      const d2 = ((x - ocx) / or) ** 2 + ((y - ocy) / or) ** 2;
      if (d2 > 1) continue;
      const nx = (x - ocx) / or, ny = (y - ocy) / or;
      let role;
      if (d2 > 0.85) role = 'o';           // outline ring
      else if (nx + ny < -0.5) role = 'h'; // top-left highlight
      else if (nx + ny > 0.5) role = 's';  // bottom-right shade
      else if (d2 < 0.2) role = 'a';       // bright core accent
      else role = 'b';                       // base fill
      put('lider_staff', x, y, role);
    }
  }
  // Extra sparkle accents at top of crystal (makes it read as magical)
  put('lider_staff', 22, 0, 'a');
  put('lider_staff', 23, 1, 'h');
  put('lider_staff', 24, 0, 'a');

  // Connector between crystal and shaft
  put('lider_staff', 24, 8, 'b');
  put('lider_staff', 25, 7, 'b');
  put('lider_staff', 25, 8, 'b');
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
for (const k of Object.keys(layers)) emit(k);
