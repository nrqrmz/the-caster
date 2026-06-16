// High-craft WATER MONSTER bosses (size 96), redrawn per feedback:
//   soldado_hielo  — clearly-armored ICE KNIGHT (full helm + plate + spikes + sword)
//   sapo_desovador — giant spawner toad: FLEXED jump legs + short front legs + egg sacs
//   tiburon_abisal — abyssal shark on the gen-aqua model (connected fins) + maw + lure
//   kraken         — BIG mantle + huge eye + long INDEPENDENT tentacles
//   whale          — higher-res monstrous whale (full body, fluke, blowhole, baleen)
// Body = type color; teeth/tusks = bone; armor/sword = steel; eyes/lure/spout =
// glow/orbblue; sockets/mouth = shadow. Run: node tools/gen-waterboss.mjs
const N = 32, cx = 16, cy = 16;
const layers = {
  ice_body: {}, ice_eyes: {}, ice_sword: {},
  desov_body: {}, desov_eyes: {}, desov_eggs: {},
  abisal_body: {}, abisal_teeth: {}, abisal_eye: {},
  kraken_body: {}, kraken_eye: {},
  whale_body: {}, whale_eye: {}, whale_spout: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const Rd = (v) => Math.round(v);
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++) for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
    const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2; if (d > 1) continue;
    let r = role; if (d > 0.82) r = 'o'; else if ((y - cy0) / ry < -0.45) r = 'h'; else if ((y - cy0) / ry > 0.55) r = 's'; put(L, x, y, r);
  }
}
function hindLeg(L, hipx, hipy, s, sc) { const kx = hipx + s * Math.round(5 * sc), ky = hipy - Math.round(3 * sc), fx = hipx + s * Math.round(3 * sc), fy = hipy + Math.round(6 * sc); line(L, hipx, hipy, kx, ky, 'o'); line(L, hipx, hipy + 1, kx, ky + 1, 'b'); line(L, kx, ky, fx, fy, 'o'); line(L, kx - s, ky, fx - s, fy, 'b'); blob(L, fx, fy, 2.4 * sc, 1.4 * sc); }

// ============================ SOLDADO_HIELO (ice knight) ============================
// full helm with a T-visor + frost crest
for (let y = 3; y <= 12; y++) { const half = 4.6 - Math.max(0, (y - 10) * 0.5), Lx = Rd(cx - half), Rx = Rd(cx + half); for (let x = Lx; x <= Rx; x++) { let r = 'b'; if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 'h'; else if (x >= Rx - 1) r = 's'; put('ice_body', x, y, r); } }
put('ice_body', cx, 4, 'o'); for (let y = 6; y <= 11; y++) put('ice_body', cx, y, 'o'); for (let x = 12; x <= 20; x++) put('ice_body', x, 8, 'o'); // cross visor
for (const [vx, h] of [[13, 3], [16, 5], [19, 3]]) for (let k = 0; k < h; k++) put('ice_body', vx, 3 - k, 'h'); // frost crest spikes
// broad plated cuirass with horizontal plate bands + central ridge
for (let y = 13; y <= 22; y++) {
  const half = 7 - Math.max(0, (y - 19) * 0.2), Lx = Rd(cx - half), Rx = Rd(cx + half);
  for (let x = Lx; x <= Rx; x++) { let r = 'b'; if (x === Lx || x === Rx) r = 'o'; else if (x <= Lx + 1) r = 'h'; else if (x >= Rx - 1) r = 's'; if ((y - 13) % 3 === 0 && x > Lx + 1 && x < Rx - 1) r = 's'; else if ((y - 14) % 3 === 0 && x > Lx + 1 && x < Rx - 1) r = 'h'; if (x === cx) r = 'h'; put('ice_body', x, y, r); }
}
for (const s of [-1, 1]) { disk('ice_body', cx + s * 8, 14, 3.4, 'b'); disk('ice_body', cx + s * 8, 13, 1.2, 'h'); line('ice_body', cx + s * 8, 11, cx + s * 9, 8, 'h'); line('ice_body', cx + s * 6, 11, cx + s * 6, 8, 'h'); } // spiked pauldrons
// faulds + greaves + arms
for (let y = 23; y <= 28; y++) { const half = 6, Lx = Rd(cx - half), Rx = Rd(cx + half); for (let x = Lx; x <= Rx; x++) put('ice_body', x, y, x === Lx || x === Rx ? 'o' : ((y - 23) % 2 === 0 ? 's' : 'b')); }
for (let y = 28; y <= 31; y++) { for (const x of [12, 13, 14]) put('ice_body', x, y, x === 12 ? 'o' : 'b'); for (const x of [18, 19, 20]) put('ice_body', x, y, x === 20 ? 'o' : 'b'); }
for (let y = 15; y <= 24; y++) { for (const x of [cx - 9, cx - 8]) put('ice_body', x, y, x === cx - 9 ? 'o' : 'b'); for (const x of [cx + 8, cx + 9]) put('ice_body', x, y, x === cx + 9 ? 'o' : 'b'); }
for (const ex of [14, 18]) { put('ice_eyes', ex, 8, 'b'); put('ice_eyes', ex, 7, 'h'); }
// great ice sword raised on the right
for (let y = 3; y <= 22; y++) { put('ice_sword', cx + 10, y, 'o'); put('ice_sword', cx + 11, y, 'h'); put('ice_sword', cx + 12, y, 'b'); }
put('ice_sword', cx + 11, 2, 'h'); for (let x = cx + 9; x <= cx + 13; x++) put('ice_sword', x, 23, 'o'); // tip + crossguard

// ============================ SAPO_DESOVADOR (giant spawner toad) ============================
for (const s of [-1, 1]) hindLeg('desov_body', cx + s * 7, 17, s, 1.5);     // big flexed jump legs
for (const s of [-1, 1]) { line('desov_body', cx + s * 5, 23, cx + s * 7, 27, 'o'); blob('desov_body', cx + s * 7, 27, 1.8, 1.2); } // short front legs
blob('desov_body', cx, 19, 9.5, 7);                       // bloated body
blob('desov_body', cx - 5, 12, 2.6, 2.4); blob('desov_body', cx + 5, 12, 2.6, 2.4); // smaller eye bulges
for (let x = cx - 7; x <= cx + 7; x++) put('desov_body', x, 17, 's');       // wide maw
for (const [wx, wy] of [[cx - 5, 21], [cx, 22], [cx + 5, 21], [cx - 8, 18], [cx + 8, 18], [cx - 2, 24]]) put('desov_body', wx, wy, 'h'); // warts
for (const [ex, ey] of [[cx - 7, 24], [cx + 6, 24], [cx, 26]]) { disk('desov_eggs', ex, ey, 2, 'b'); put('desov_eggs', ex, ey, 'h'); disk('desov_eggs', ex, ey, 0.6, 's'); } // egg sacs
put('desov_eyes', cx - 5, 11, 'b'); put('desov_eyes', cx + 5, 11, 'b');

// ============================ TIBURON_ABISAL (abyssal shark, gen-aqua model facing left) ============================
const topY = {}, botY = {};
for (let x = 2; x <= 24; x++) {
  const t = (x - 2) / 22, env = Math.sin(Math.PI * Math.pow(t, 0.55));
  const topH = Math.max(2, Rd(6.4 * env)), botH = Math.max(2, Rd(4.8 * env)); // floor 2 -> SOLID caudal peduncle (no thread)
  const ty = cy - topH, by = cy + botH; topY[x] = ty; botY[x] = by;
  for (let y = ty; y <= by; y++) { let r = 'b'; if (y === ty || y === by || x === 2) r = 'o'; else if (y >= by - 1) r = 'h'; else if (y <= ty + 2) r = 's'; put('abisal_body', x, y, r); }
}
for (let x = 9; x <= 18; x++) { const rise = x <= 16 ? 1 + (x - 9) * 1.0 : Math.max(0, 8 - (x - 16) * 3); const ri = Rd(rise); for (let y = topY[x] - ri; y < topY[x]; y++) put('abisal_body', x, y, y === topY[x] - ri ? 'o' : 'b'); } // dorsal: apex leans BACK toward the tail
for (let i = 0; i <= 5; i++) { const x = 8 + i, yb = botY[x] + 1 + i; for (let y = botY[x]; y <= yb; y++) put('abisal_body', x, y, y === yb ? 'o' : 'b'); } // pectoral
// caudal fin — solidly joined to the 4px peduncle; lobes sweep BACK, upper lobe shorter than the body
for (let x = 24; x <= 30; x++) { const f = (x - 24) / 6, yt = Rd((cy - 2) + (11 - (cy - 2)) * f), yb = Rd((cy + 1) + (15 - (cy + 1)) * f); for (let y = yt; y <= yb; y++) put('abisal_body', x, y, (y === yt || y === yb) ? 'o' : 'b'); } // upper lobe
for (let x = 24; x <= 28; x++) { const f = (x - 24) / 4, yt = Rd((cy + 2) + (17 - (cy + 2)) * f), yb = Rd((cy + 2) + (21 - (cy + 2)) * f); for (let y = yt; y <= yb; y++) put('abisal_body', x, y, (y === yt || y === yb) ? 'o' : 'b'); } // lower lobe (small)
// gaping abyssal maw: upper + lower tooth rows
for (let x = 2; x <= 9; x++) { put('abisal_teeth', x, botY[x] - 2, 'b'); put('abisal_teeth', x, botY[x] + 1, 'b'); } for (const tx of [3, 5, 7, 9]) { put('abisal_teeth', tx, botY[tx] - 1, 'h'); put('abisal_teeth', tx, botY[tx], 'h'); }
disk('abisal_eye', 8, 13, 1.4, 'b'); put('abisal_eye', 8, 13, 'h');

// ============================ KRAKEN (big mantle + WRITHING tentacles) ============================
// The body is ANIMATED: tentacles draw their wobble from sin(k*0.7 + ph + ph0); advancing
// ph0 per frame makes the wave travel down them (a whirlpool/writhe). Mantle + sheen + brow
// knobs are static. Emitted via emitKrakenBody() with anim.idle/walk = KF phase frames.
function blobInto(map, cx0, cy0, rx, ry) {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++) for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
    const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2; if (d > 1) continue;
    let r = 'b'; if (d > 0.82) r = 'o'; else if ((y - cy0) / ry < -0.45) r = 'h'; else if ((y - cy0) / ry > 0.55) r = 's';
    if (x >= 0 && x < N && y >= 0 && y < N) map[`${x},${y}`] = r;
  }
}
function krakenInto(map, ph0) {
  const P = (x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) map[`${x},${y}`] = r; };
  for (const [bx, drift, ph, len] of [[7, -1, 0, 15], [10, -1, 1.4, 13], [13, 0, 2.8, 16], [16, 0, 0.6, 14], [19, 1, 2.0, 16], [22, 1, 3.4, 13], [25, 1, 1.0, 15]]) {
    let px = bx, py = 16;
    for (let k = 0; k < len; k++) { const w = k < len - 3 ? 1 : 0; for (let d = -w; d <= w; d++) P(px + d, py, Math.abs(d) === w && w > 0 ? 'o' : 'b'); if (k % 3 === 2) P(px, py, 's'); px += Math.round(Math.sin(k * 0.7 + ph + ph0) * 1.3) + drift; py += 1; }
  }
  blobInto(map, cx, 11, 10, 9);                            // big bulbous mantle (static)
  for (let x = cx - 7; x <= cx + 7; x++) P(x, 4, 'h');     // mantle sheen
  for (const [hx, hy] of [[cx - 6, 18], [cx + 6, 18], [cx - 9, 14], [cx + 9, 14]]) P(hx, hy, 's'); // brow knobs
}
const KF = 4;                                              // whirlpool loop frames
const krakenFrames = [];
for (let i = 0; i < KF; i++) { const m = {}; krakenInto(m, (i * Math.PI * 2) / KF); krakenFrames.push(m); }
disk('kraken_eye', cx, 12, 3.4, 'b'); disk('kraken_eye', cx, 12, 1.6, 'h'); for (let y = 10; y <= 14; y++) put('kraken_eye', cx, y, 'o'); // huge eye w/ slit pupil (static)

// ============================ WHALE (higher-res monstrous whale, facing left) ============================
for (let x = 2; x <= 28; x++) {
  const t = (x - 2) / 26, top = Rd(cy - (3 + 6 * Math.sin(Math.PI * Math.min(1, 0.1 + t)))), bot = Rd(cy + (2 + 6.5 * Math.sin(Math.PI * Math.min(1, 0.12 + t * 0.95))));
  for (let y = top; y <= bot; y++) { let r = 'b'; if (y === top || y === bot || x === 2) r = 'o'; else if (y >= bot - 2) r = 'h'; else if (y <= top + 2) r = 's'; put('whale_body', x, y, r); }
}
for (let x = 2; x <= 11; x++) put('whale_body', x, cy + 4, 'o'); for (const tx of [3, 5, 7, 9, 11]) put('whale_body', tx, cy + 3, 'h'); // long jaw line + baleen
for (let x = 26; x <= 31; x++) { const f = (x - 26) / 5, yt = Rd((cy - 1) + (6 - (cy - 1)) * f), yb = Rd((cy + 1) + (10 - (cy + 1)) * f); for (let y = yt; y <= yb; y++) put('whale_body', x, y, (y === yt || y === yb) ? 'o' : 'b'); } // fluke upper
for (let x = 26; x <= 30; x++) { const f = (x - 26) / 4, yt = Rd((cy + 2) + (18 - (cy + 2)) * f); for (let y = cy + 2; y <= yt; y++) put('whale_body', x, y, (y === yt) ? 'o' : 'b'); } // fluke lower
for (let i = 0; i < 5; i++) for (let x = 12 + i; x <= 18 - i; x++) put('whale_body', x, cy + 8 + i, 'b'); // pectoral fin (belly)
disk('whale_eye', 8, cy - 1, 1.3, 'b'); put('whale_eye', 8, cy - 1, 'h');
for (let y = 3; y <= cy - 8; y++) put('whale_spout', 9, y, 'h'); for (const [sx, sy] of [[8, 3], [10, 3], [7, 2], [11, 2]]) put('whale_spout', sx, sy, 'h'); // blowhole spout

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
// kraken_body is emitted from its animated frames, not the (empty) static layer.
function emitKrakenBody() {
  let minx = N, maxx = -1, miny = N, maxy = -1;
  for (const m of krakenFrames) for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  const block = (m) => { const rows = []; for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += m[`${x},${y}`] ?? '.'; rows.push(row); } return `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`; };
  const baseB = block(krakenFrames[0]);
  const listB = `[ ${krakenFrames.map(block).join(', ')} ]`;
  console.log(`  kraken_body: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${baseB},\n    up: ${baseB},\n    side: ${baseB},\n    anim: {\n      idle: { down: ${listB}, up: ${listB}, side: ${listB} },\n      walk: { down: ${listB}, up: ${listB}, side: ${listB} },\n    },\n  },`);
}
for (const k of Object.keys(layers)) { if (k === 'kraken_body') continue; emit(k); }
emitKrakenBody();
