// High-craft blobs / elementals, each a distinct designed creature:
//   espiritu_ceniza — ghostly ash wisp with trailing tails (shoots spread)
//   elemental_fuego — blazing flame elemental with a molten core (miniboss, nova)
//   imp_brasa       — little ember imp, horns + fanged grin (fast melee)
//   pez_globo       — spiky pufferfish, big eyes (erratic)
//   brasa_errante   — pure molten ember coal, cracks + core, NO face (damage aura)
//   burbuja_gelida  — translucent ice bubble, sheen + crystals, NO face (damage 0)
// Body takes the creature's type color; cores/cracks use ember/glow, ice sheen
// orbblue, eyes glow/shadow/eyes_living. Emits parts. Run: node tools/gen-blob.mjs
const N = 32, cx = 16;
const layers = {
  ceniza_body: {}, ceniza_eyes: {},
  fuego_body: {}, fuego_core: {}, fuego_eyes: {},
  imp_body: {}, imp_horns: {}, imp_eyes: {},
  globo_body: {}, globo_spikes: {}, globo_eyes: {},
  brasa_body: {}, brasa_glow: {},
  burbuja_body: {}, burbuja_sheen: {}, burbuja_eyes: {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

// Gelatinous orb: bright RIM-LIGHT on the upper-left edge, dark rim lower-right,
// soft inner shading. The signature look for this family.
function orb(L, cx0, cy0, rx, ry) {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2;
      if (d > 1) continue;
      const diag = (x - cx0) / rx + (y - cy0) / ry;
      let r = 'b';
      if (d > 0.84) r = diag < 0 ? 'h' : 'o';          // rim light (top-left) / dark rim
      else if (diag > 0.5) r = 's';
      else if (diag < -0.55) r = 'h';
      put(L, x, y, r);
    }
}
const line = (L, x0, y0, x1, y1, r) => {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
};
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };

// ============================ ESPIRITU_CENIZA (ash ghost; smoke RISES upward) ============================
orb('ceniza_body', cx, 21, 6.5, 6);                       // body sits low
for (let y = 15; y >= 2; y--) {                           // 3 smoke tendrils rising + curling, fading up
  const t = (15 - y) / 13;                                // 0 base -> 1 top
  for (const [bx, ph] of [[cx - 4, 0], [cx, 1.7], [cx + 4, 3.3]]) {
    const wob = Math.round(2.4 * Math.sin((15 - y) * 0.6 + ph) * (0.4 + t));
    const r = t > 0.66 ? 'h' : (Math.abs(bx - cx) > 2 ? 's' : 'b'); // wispier/lighter near the top
    put('ceniza_body', bx + wob, y, r);
    if (y > 6 && t < 0.7) put('ceniza_body', bx + wob + 1, y, 's');
  }
}
put('ceniza_eyes', cx - 3, 20, 'b'); put('ceniza_eyes', cx + 3, 20, 'b'); // hollow glowing eyes
for (let x = cx - 2; x <= cx + 2; x++) put('ceniza_eyes', x, 24, 'b');     // open ghost mouth

// ============================ ELEMENTAL_FUEGO (TERRIFYING flame demon) ============================
orb('fuego_body', cx, 19, 8, 7.5);                        // molten body
// tall SHARP flame spikes/horns clawing upward (jagged, menacing)
for (const [bx, ty] of [[cx - 7, 11], [cx - 4, 7], [cx - 1, 3], [cx + 2, 6], [cx + 5, 8], [cx + 7, 12]]) {
  for (let y = ty; y <= 14; y++) { const xx = bx + Math.round((y - ty) * 0.25 * Math.sign(cx - bx)); put('fuego_body', xx, y, y - ty < 2 ? 'h' : 'b'); put('fuego_body', xx + 1, y, 's'); }
}
// flickering jagged base (lapping flames at the bottom)
for (const x of [cx - 6, cx - 3, cx, cx + 3, cx + 6]) { put('fuego_body', x, 27, '.'); put('fuego_body', x, 26, 'h'); }
disk('fuego_core', cx, 23, 3.2, 'b'); disk('fuego_core', cx, 23, 1.6, 'h'); // white-hot glowing maw
// angry slanted brows + eyes (V-shaped scowl), dark with a hot glint
line('fuego_eyes', cx - 6, 13, cx - 2, 16, 'b'); line('fuego_eyes', cx - 6, 14, cx - 2, 17, 'b');
line('fuego_eyes', cx + 6, 13, cx + 2, 16, 'b'); line('fuego_eyes', cx + 6, 14, cx + 2, 17, 'b');
put('fuego_eyes', cx - 4, 15, 'h'); put('fuego_eyes', cx + 4, 15, 'h');   // burning pupils
// dark fanged maw biting down over the bright core glow
for (let x = cx - 4; x <= cx + 4; x++) put('fuego_eyes', x, 20, 'b');     // dark upper lip
for (const fx of [cx - 3, cx - 1, cx + 1, cx + 3]) { put('fuego_eyes', fx, 21, 'b'); put('fuego_eyes', fx, 22, 'b'); } // hanging fangs

// ============================ IMP_BRASA (ember imp) ============================
orb('imp_body', cx, 17, 6.5, 6);                          // round impish body
for (let y = 22; y <= 27; y++) for (const lx of [cx - 4, cx + 2]) for (let x = lx; x <= lx + 1; x++) put('imp_body', x, y, (y === 27 || x === lx) ? 'o' : 'b'); // stubby legs
for (const [sx, sy] of [[cx - 7, 16], [cx + 6, 16]]) for (let y = sy; y <= sy + 3; y++) put('imp_body', sx, y, 'o'); // little arms
// small horns
line('imp_horns', cx - 3, 12, cx - 4, 8, 'o'); line('imp_horns', cx - 2, 12, cx - 3, 9, 'b');
line('imp_horns', cx + 3, 12, cx + 4, 8, 'o'); line('imp_horns', cx + 2, 12, cx + 3, 9, 'b');
put('imp_eyes', cx - 3, 16, 'b'); put('imp_eyes', cx + 3, 16, 'b');       // glowing eyes
for (let x = cx - 2; x <= cx + 2; x++) put('imp_eyes', x, 19, 'b');        // fanged grin
put('imp_eyes', cx - 2, 20, 'h'); put('imp_eyes', cx + 2, 20, 'h');       // fangs

// ============================ PEZ_GLOBO (pufferfish, SIDE PROFILE facing left) ============================
orb('globo_body', 16, 16, 7, 7);                          // puffed sphere body
put('globo_body', 7, 16, 'o'); put('globo_body', 8, 16, 'b'); put('globo_body', 8, 17, 's'); put('globo_body', 8, 15, 'b'); // pouting beak/lips (front-left)
// tail fin (right): two triangular lobes
for (const [tx, ty] of [[24, 11], [25, 12], [24, 21], [25, 20]]) line('globo_body', 22, 16, tx, ty, 'b');
for (const [tx, ty] of [[25, 12], [25, 20], [26, 16]]) put('globo_body', tx, ty, 'o');
// small pectoral fin (belly)
line('globo_body', 14, 22, 13, 25, 'b'); put('globo_body', 13, 25, 'o');
// spikes radiating up / down / back (not over the face)
for (const [ax, ay] of [[14, 8], [18, 8], [21, 11], [22, 19], [18, 24], [14, 24], [11, 22]]) {
  const dx = Math.sign(ax - 16) || 1, dy = Math.sign(ay - 16) || -1;
  put('globo_spikes', ax, ay, 'o'); put('globo_spikes', ax - dx, ay - dy, 'b');
}
put('globo_eyes', 12, 13, 'b'); put('globo_eyes', 11, 13, 'h');           // big front eye + glint

// ============================ BRASA_ERRANTE (ember coal, no face) ============================
orb('brasa_body', cx, 17, 6.5, 6.5);                      // lumpy coal
orb('brasa_glow', cx, 18, 2.8, 2.8);                      // white-hot core
for (const [x0, y0, x1, y1] of [[cx, 15, cx - 5, 12], [cx, 15, cx + 4, 11], [cx, 20, cx - 4, 23], [cx, 20, cx + 5, 22]])
  line('brasa_glow', x0, y0, x1, y1, 'a');                // molten cracks
for (const [fx, fy] of [[cx - 1, 8], [cx + 1, 9], [cx, 7]]) put('brasa_glow', fx, fy, 'h'); // flame flicker on top

// ============================ BURBUJA_GELIDA (ice bubble WITH a frosty face) ============================
orb('burbuja_body', cx, 16, 7, 7);                        // translucent bubble
for (let i = 0; i < 4; i++) put('burbuja_sheen', cx - 4 + i, 9 + i, 'h'); // bright sheen arc (top-left)
put('burbuja_sheen', cx - 5, 12, 'h'); put('burbuja_sheen', cx - 5, 14, 'h');
for (const [fx, fy] of [[cx + 4, 18], [cx + 5, 17], [cx + 3, 21]]) put('burbuja_sheen', fx, fy, 'a'); // frost facets
put('burbuja_eyes', cx - 3, 15, 'b'); put('burbuja_eyes', cx + 3, 15, 'b'); // eyes
for (let x = cx - 2; x <= cx + 2; x++) put('burbuja_eyes', x, 19, 'b');     // small mouth

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
