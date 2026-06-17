// High-craft aquatic creatures, each a distinct designed creature:
//   tiburon_joven   — streamlined shark in side profile, dorsal/tail fins + teeth (dashes)
//   serpiente_marina — coiling sea serpent, S-curve body + fanged head (shoots)
//   tortuga_acorazada — armored turtle, plated dome shell + head/flippers (tanky charge)
//   cangrejo_acorazado — armored crab, wide carapace + raised pincers + eyestalks (tanky)
// Body takes the creature's type color; belly = its own highlight; teeth/fangs = bone;
// eyes shadow|glow. Run: node tools/gen-aqua.mjs
const N = 32, cx = 16, cy = 16;
const layers = {
  shark_body: {}, shark_teeth: {}, shark_eye: {},
  serpent_body: {}, serpent_fangs: {}, serpent_eye: {},
  turtle_body: {}, turtle_eye: {},
  crab_body: {}, crab_eye: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
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
      else if ((y - cy0) / ry < -0.45) r = 'h';     // lit top
      else if ((y - cy0) / ry > 0.55) r = 's';      // shaded bottom
      put(L, x, y, r);
    }
}

// ============================ TIBURON_JOVEN (shark, side profile facing left) ============================
// Per-column top (curved back) and bottom (flatter belly) edges → a real shark
// silhouette: pointed snout, humped back, tapering to a thin caudal peduncle.
const topY = {}, botY = {};
for (let x = 2; x <= 24; x++) {
  const t = (x - 2) / 22;
  const env = Math.sin(Math.PI * Math.pow(t, 0.62));       // 0 at snout/tail, peaks early
  const thin = 1 - 0.45 * t;                               // thins toward the tail
  const topH = Math.max(1, Math.round(5.6 * env * thin));  // curved back (taller)
  const botH = Math.max(1, Math.round(4.0 * env * thin));  // flatter belly
  const ty = cy - topH, by = cy + botH;
  topY[x] = ty; botY[x] = by;
  for (let y = ty; y <= by; y++) {
    let r = 'b';
    if (y === ty || y === by || x === 2) r = 'o';
    else if (y >= by - 1) r = 'h';                          // pale underbelly
    else if (y <= ty + 2) r = 's';                          // dark dorsal
    put('shark_body', x, y, r);
  }
}
// dorsal fin — apex leans BACK toward the tail: long leading slope from the front,
// short steep trailing edge (shark faces left, so the tip points up-and-right)
for (let x = 10; x <= 18; x++) { const rise = x <= 16 ? 1 + (x - 10) * 1.1 : Math.max(0, 7 - (x - 16) * 3); const ri = Math.round(rise); for (let y = topY[x] - ri; y < topY[x]; y++) put('shark_body', x, y, y === topY[x] - ri ? 'o' : 'b'); }
// pectoral fin — sweeps DOWN-AND-BACK (longer as it goes toward the tail)
for (let i = 0; i <= 5; i++) { const x = 8 + i, yb = botY[x] + 1 + i; for (let y = botY[x]; y <= yb; y++) put('shark_body', x, y, y === yb ? 'o' : 'b'); }
// caudal (tail) fin — SHORTER than the dorsal, swept back: upper lobe to ~y9 + small lower lobe
for (let x = 24; x <= 30; x++) { const f = (x - 24) / 6, yt = Math.round((cy - 1) + (9 - (cy - 1)) * f), yb = Math.round(cy + (13 - cy) * f); for (let y = yt; y <= yb; y++) put('shark_body', x, y, (y === yt || y === yb) ? 'o' : 'b'); }
for (let x = 24; x <= 28; x++) { const f = (x - 24) / 4, yb = Math.round(18 + (21 - 18) * f); for (let y = 17; y <= yb; y++) put('shark_body', x, y, (y === 17 || y === yb) ? 'o' : 'b'); }
// gills, toothy jaw, eye
for (const gx of [7, 8, 9]) for (let y = topY[gx] + 2; y <= botY[gx] - 1; y++) put('shark_body', gx, y, 's');
for (let x = 2; x <= 9; x++) put('shark_teeth', x, botY[x] - 1, 'b'); for (const tx of [3, 5, 7, 9]) put('shark_teeth', tx, botY[tx], 'h');
put('shark_eye', 6, 13, 'b'); put('shark_eye', 5, 13, 'h');

// ============================ SERPIENTE_MARINA (sea serpent, vertical S-curve) ============================
for (let y = 7; y <= 30; y++) {                           // weaving body
  const xx = Math.round(cx + 6 * Math.sin((y - 7) * 0.5));
  const w = Math.max(1, 3 - Math.floor((y - 7) / 9));     // tapers toward the tail
  for (let d = -w; d <= w; d++) put('serpent_body', xx + d, y, (Math.abs(d) === w) ? 'o' : (d < 0 ? 'h' : (d > 0 ? 's' : 'b')));
}
blob('serpent_body', cx, 6, 3.4, 3);                      // head
for (const s of [-1, 1]) { line('serpent_body', cx + s * 2, 3, cx + s * 3, 1, 'o'); }   // small horns/frills
put('serpent_eye', cx - 2, 5, 'b'); put('serpent_eye', cx + 2, 5, 'b');
for (const fx of [cx - 1, cx + 1]) { put('serpent_fangs', fx, 9, 'b'); put('serpent_fangs', fx, 10, 'h'); } // fangs

// ============================ TORTUGA_ACORAZADA (armored turtle, top-down) ============================
disk('turtle_body', cx, 6, 2.6, 'b');                     // head poking out (front/top)
for (const [hx, hy] of [[8, 9], [24, 9], [8, 24], [24, 24]]) blob('turtle_body', hx, hy, 2.6, 2.2); // 4 flippers
disk('turtle_body', cx, 28, 1.4, 'b');                    // tail
blob('turtle_body', cx, 17, 9, 8);                        // domed shell
// carved plate pattern (shade grooves): center hexagon + radiating seams
disk('turtle_body', cx, 17, 3.4, 's'); disk('turtle_body', cx, 17, 2.4, 'b');
for (const [ax, ay] of [[cx, 10], [cx, 24], [9, 13], [23, 13], [9, 21], [23, 21]]) line('turtle_body', cx, 17, ax, ay, 's');
put('turtle_eye', cx - 1, 5, 'b'); put('turtle_eye', cx + 1, 5, 'b');

// ============================ CANGREJO_ACORAZADO (armored crab, front view) ============================
blob('crab_body', cx, 17, 9, 5);                          // wide carapace
for (let x = cx - 6; x <= cx + 6; x += 3) put('crab_body', x, 14, 'h'); // shell bumps
// 4 pairs of jointed walking legs fanning out below the carapace
for (const [ox, oy, tx, ty] of [[5, 19, 9, 23], [6, 20, 11, 26], [6, 21, 10, 29], [4, 21, 6, 29]]) for (const s of [-1, 1]) {
  line('crab_body', cx + s * ox, oy, cx + s * tx, ty, 'o'); line('crab_body', cx + s * ox, oy + 1, cx + s * tx, ty, 'b');
}
for (const s of [-1, 1]) {                                // big raised pincers
  blob('crab_body', cx + s * 10, 11, 3, 2.6);
  line('crab_body', cx + s * 12, 9, cx + s * 13, 6, 'o'); line('crab_body', cx + s * 11, 11, cx + s * 12, 8, 'o'); // claw prongs
  line('crab_body', cx + s * 8, 14, cx + s * 9, 12, 'b');                                                          // upper arm
}
for (const s of [-1, 1]) { put('crab_body', cx + s * 2, 12, 'b'); put('crab_body', cx + s * 2, 11, 'o'); } // eyestalks
put('crab_eye', cx - 2, 11, 'b'); put('crab_eye', cx + 2, 11, 'b');

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
