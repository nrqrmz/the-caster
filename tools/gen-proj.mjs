// High-craft projectiles at res:32 (replace the tiny legacy res:16 parts):
//   orb_body   — glowing orb: concentric bright core + a twinkle sparkle
//   flame_body — teardrop fireball pointing RIGHT (+x): bright head, flame tail, hot core
//   arrow_body — sleek arrow pointing RIGHT (+x): fletching, shaft, sharp head
// Each composes against the recipe's baseColor palette (o/b/s/h/a). The pool rotates
// fireball & arrow by their travel angle, so both point along +x. Run: node tools/gen-proj.mjs
const N = 32, cx = 16, cy = 16;
const layers = { orb: {}, flame: {}, arrow: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => { for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++) for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++) if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role); };

// ============================ ORB (glowing sphere + twinkle) ============================
disk('orb', cx, cy, 7, 'o');                              // dark rim
disk('orb', cx, cy, 6.2, 's');
disk('orb', cx, cy, 5.2, 'b');
disk('orb', cx, cy, 3.2, 'h');                            // bright inner glow
disk('orb', cx, cy, 1.4, 'a');                            // white-hot core
for (const [dx, dy, r] of [[0, 0, 'a'], [-1, 0, 'h'], [1, 0, 'h'], [0, -1, 'h'], [0, 1, 'h']]) put('orb', 11 + dx, 11 + dy, r); // twinkle sparkle (upper-left)

// ============================ FLAME (teardrop fireball, head at +x) ============================
for (let x = 6; x <= 20; x++) {                           // flame tail tapering from the left
  const t = (x - 6) / 14, half = Math.max(1, Math.round(1 + 4.6 * t));
  for (let dy = -half; dy <= half; dy++) put('flame', x, cy + dy, Math.abs(dy) === half ? 'o' : (Math.abs(dy) <= 1 ? 'h' : 'b'));
}
disk('flame', 19, cy, 6, 'o');                            // round head
disk('flame', 19, cy, 5, 'b');
disk('flame', 20, cy, 3, 'h');
disk('flame', 21, cy, 1.6, 'a');                          // hot core near the leading edge
for (const [fx, fy] of [[9, 12], [12, 20], [7, 17]]) put('flame', fx, fy, 'a'); // flickering sparks

// ============================ ARROW (sleek, head at +x) ============================
for (let x = 5; x <= 23; x++) { put('arrow', x, cy, 'b'); put('arrow', x, cy - 1, 'h'); put('arrow', x, cy + 1, 's'); } // shaft
for (let x = 22; x <= 28; x++) { const h = 28 - x; for (let dy = -h; dy <= h; dy++) put('arrow', x, cy + dy, (Math.abs(dy) === h || x === 28) ? 'o' : 'a'); } // arrowhead
for (let i = 0; i < 4; i++) { put('arrow', 4 + i, cy - (4 - i), 'h'); put('arrow', 4 + i, cy + (4 - i), 'h'); put('arrow', 4 + i, cy - (4 - i) + 1, 'o'); put('arrow', 4 + i, cy + (4 - i) - 1, 'o'); } // fletching

// ============================ emit ============================
function emit(name, pretty) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${pretty}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: null, side: null,\n  },`);
}
emit('orb', 'orb_body');
emit('flame', 'flame_body');
emit('arrow', 'arrow_body');
