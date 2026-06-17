// High-craft frog lineage, each distinct & sized by its stats (egg -> tadpole ->
// agile frog -> spitter toad -> big tank toad):
//   huevo_sapo  — frogspawn clump: jelly eggs with dark embryos (static)
//   renacuajo   — tadpole: fat round body + a finned paddle tail + big eyes
//   rana_saltarina — small agile frog, prominent FLEXED hind legs (jumper)
//   sapo_escupidor — medium warty toad, open spitting mouth + puffed throat + legs
//   sapo_adulto — biggest fat warty toad, heavy brow, chunky flexed legs
// Body = type color (belly/warts = its own highlight); embryos/pupils/mouth = shadow.
// Run: node tools/gen-frog.mjs
const N = 32, cx = 16, cy = 16;
const layers = {
  huevo_body: {}, huevo_spots: {},
  tadpole_body: {}, tadpole_eyes: {},
  frog_body: {}, frog_eyes: {},
  toad_body: {}, toad_eyes: {},
  bigtoad_body: {}, bigtoad_eyes: {},
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
      if (d > 0.82) r = 'o';
      else if ((y - cy0) / ry < -0.45) r = 'h';
      else if ((y - cy0) / ry > 0.55) r = 's';
      put(L, x, y, r);
    }
}
// A bent amphibian hind leg on side s, anchored at the hip: thigh out-up to a raised
// knee, shin back down to a webbed foot. `sc` scales the reach (chunkier for toads).
function hindLeg(L, hipx, hipy, s, sc) {
  const kneeX = hipx + s * Math.round(5 * sc), kneeY = hipy - Math.round(3 * sc);
  const footX = hipx + s * Math.round(3 * sc), footY = hipy + Math.round(6 * sc);
  line(L, hipx, hipy, kneeX, kneeY, 'o'); line(L, hipx, hipy + 1, kneeX, kneeY + 1, 'b');   // thigh
  line(L, kneeX, kneeY, footX, footY, 'o'); line(L, kneeX - s, kneeY, footX - s, footY, 'b'); // shin
  blob(L, footX, footY, 2.4 * sc, 1.4 * sc);                                                  // webbed foot
}

// ============================ HUEVO_SAPO (frogspawn clump) ============================
const eggs = [[12, 12], [20, 12], [16, 16], [11, 19], [21, 19], [16, 22]];
for (const [ex, ey] of eggs) blob('huevo_body', ex, ey, 3.3, 3.3);
for (const [ex, ey] of eggs) { disk('huevo_spots', ex, ey, 1.3, 'b'); put('huevo_spots', ex - 1, ey - 1, 'h'); }

// ============================ RENACUAJO (tadpole, side) ============================
blob('tadpole_body', 11, cy, 6, 5.5);                     // fat round body
for (let x = 16; x <= 29; x++) {                          // finned PADDLE tail (dark core + light fin, tapering)
  const t = (x - 16) / 13;
  const half = Math.max(1, Math.round(5.5 * (1 - t)));
  for (let dy = -half; dy <= half; dy++) put('tadpole_body', x, cy + dy, Math.abs(dy) === half ? 'o' : (Math.abs(dy) <= 1 ? 'b' : 'h'));
}
put('tadpole_eyes', 9, 14, 'b'); put('tadpole_eyes', 13, 14, 'b');

// ============================ RANA_SALTARINA (small agile frog, flexed legs) ============================
for (const s of [-1, 1]) hindLeg('frog_body', cx + s * 4, 16, s, 1);     // prominent jumping legs (behind body)
blob('frog_body', cx, 17, 6, 5);                          // sleek body
blob('frog_body', cx - 4, 10, 3, 3); blob('frog_body', cx + 4, 10, 3, 3); // bulging eyes on top
for (let x = cx - 4; x <= cx + 4; x++) put('frog_body', x, 19, 's');      // wide smiling mouth
put('frog_body', cx - 4, 18, 's'); put('frog_body', cx + 4, 18, 's');
for (const s of [-1, 1]) { line('frog_body', cx + s * 3, 20, cx + s * 3, 23, 'o'); blob('frog_body', cx + s * 3, 24, 1.5, 1.2); } // little front arms
put('frog_eyes', cx - 4, 9, 'b'); put('frog_eyes', cx + 4, 9, 'b');

// ============================ SAPO_ESCUPIDOR (medium warty spitter, open mouth) ============================
for (const s of [-1, 1]) hindLeg('toad_body', cx + s * 5, 17, s, 1.1);
blob('toad_body', cx, 18, 7.5, 6);                        // chunky body
blob('toad_body', cx - 5, 11, 3, 2.8); blob('toad_body', cx + 5, 11, 3, 2.8); // eyes
disk('toad_body', cx, 21, 3, 'h');                        // puffed throat
disk('toad_body', cx, 16, 2.4, 's'); disk('toad_body', cx, 16, 1.3, 'o'); // open spitting mouth (dark O)
for (const [wx, wy] of [[cx - 4, 20], [cx + 3, 22], [cx + 6, 18], [cx - 7, 18], [cx - 2, 23]]) put('toad_body', wx, wy, 'h'); // warts
put('toad_eyes', cx - 5, 10, 'b'); put('toad_eyes', cx + 5, 10, 'b');

// ============================ SAPO_ADULTO (biggest fat warty tank toad) ============================
for (const s of [-1, 1]) hindLeg('bigtoad_body', cx + s * 6, 16, s, 1.3);
blob('bigtoad_body', cx, 18, 9.5, 7);                     // huge fat body
blob('bigtoad_body', cx - 6, 11, 3.4, 3.2); blob('bigtoad_body', cx + 6, 11, 3.4, 3.2); // big eyes
for (let x = cx - 8; x <= cx + 8; x++) put('bigtoad_body', x, 9, 's');   // heavy brow ridge
for (let x = cx - 7; x <= cx + 7; x++) put('bigtoad_body', x, 18, 's');  // wide closed grimace
put('bigtoad_body', cx - 7, 17, 's'); put('bigtoad_body', cx + 7, 17, 's');
for (const [wx, wy] of [[cx - 5, 21], [cx, 22], [cx + 5, 21], [cx - 8, 19], [cx + 8, 19], [cx - 2, 24], [cx + 3, 24]]) put('bigtoad_body', wx, wy, 'h'); // many warts
put('bigtoad_eyes', cx - 6, 10, 'b'); put('bigtoad_eyes', cx + 6, 10, 'b');

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
