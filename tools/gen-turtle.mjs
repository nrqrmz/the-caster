// Tortuga Acorazada — native 64×64 top-down armored turtle (head DOWN), traced from
// tools/refs/tortuga-acorazada.png: the reference fixes layout + colors; plates,
// spikes, rune and claws are drawn explicitly so the pixel art stays crisp.
// Layers (back→front): turtle_legs, turtle_claws, turtle_head, turtle_shell,
// turtle_spikes, turtle_rune, turtle_eyes. All share a 64×64 canvas, anchor (0,0).
// Run: node tools/gen-turtle.mjs  → (re)writes src/data/sprites/partsTurtle.js
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const N = 64;
const LAYERS = ['turtle_legs', 'turtle_claws', 'turtle_head', 'turtle_shell', 'turtle_spikes', 'turtle_rune', 'turtle_eyes'];
const mx = (x) => N - 1 - x; // mirror column across the vertical axis (x = 31.5)
// Deterministic per-pixel noise in [0,1) (integer hash) — same speckle on every run.
const hash = (x, y) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

function newCanvas() { return Object.fromEntries(LAYERS.map((l) => [l, new Map()])); }
function put(C, L, x, y, r) { if (x >= 0 && x < N && y >= 0 && y < N) C[L].set(`${x},${y}`, r); }
function get(C, L, x, y) { return C[L].get(`${x},${y}`); }
// Put on the left half AND its mirror.
function put2(C, L, x, y, r) { put(C, L, x, y, r); put(C, L, mx(x), y, r); }
// Filled ellipse with outline ring + top-left light / bottom-right shade + speckle.
function blob(C, L, cx, cy, rx, ry, { outline = true, speckle = 0.18 } = {}) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry, d = nx * nx + ny * ny;
      if (d > 1) continue;
      let r = 'b';
      if (outline && d > 0.72) r = 'o';
      else if (nx + ny < -0.75) r = 'h';
      else if (nx + ny > 0.65) r = 's';
      else if (hash(x, y) < speckle) r = hash(y, x) < 0.5 ? 's' : 'h';
      put(C, L, x, y, r);
    }
}
// Bone cone claw: root (x,y) 3px wide, tapering to a 1px lit tip along (dx,dy).
function claw(C, x, y, dx, dy, len) {
  const px = dy !== 0 ? 1 : 0, py = dx !== 0 ? 1 : 0; // perpendicular axis
  for (let i = 0; i < len; i++) {
    const cx = x + dx * i, cy = y + dy * i, w = i < len - 2 ? 1 : 0;
    for (let k = -w; k <= w; k++) {
      const r = i === len - 1 ? 'h' : (k === -w && w ? 'h' : (k === w && w ? 's' : 'b'));
      put(C, 'turtle_claws', cx + px * k, cy + py * k, r);
    }
  }
}

// ---- legs (oliveskin) + claws (hornbone). side: -1 left, +1 right. dy = step offset ----
// Legs are chunky scaled ellipses whose inner half hides under the shell.
function frontLeg(C, side, dy) {
  const X = (x) => (side < 0 ? x : mx(x));
  const dir = side < 0 ? -1 : 1;
  blob(C, 'turtle_legs', X(11), 44 + dy * 0.5, 5.5, 5.5);          // forearm (half under the shell)
  blob(C, 'turtle_legs', X(14), 53 + dy, 6.5, 5.5);                // broad webbed foot
  claw(C, X(5), 42 + dy, dir, 0, 4);                          // outward elbow claws
  claw(C, X(5), 46 + dy, dir, 0, 4);
  for (const [tx, len] of [[9, 4], [12, 5], [16, 5], [19, 4]]) claw(C, X(tx), 57 + dy, 0, 1, len); // toes
}
function rearLeg(C, side, dy) {
  const X = (x) => (side < 0 ? x : mx(x));
  const dir = side < 0 ? -1 : 1;
  blob(C, 'turtle_legs', X(11), 14 + dy, 6, 6.5);
  claw(C, X(5), 12 + dy, dir, 0, 4);
  claw(C, X(5), 16 + dy, dir, 0, 4);
  claw(C, X(8), 8 + dy, 0, -1, 4);
  claw(C, X(12), 8 + dy, 0, -1, 4);
}

// ---- head (oliveskin) + eyes (redeye). dy = neck extension ----
function head(C, dy) {
  const L = 'turtle_head';
  blob(C, L, 31.5, 54 + dy, 7.5, 7.5, { speckle: 0.2 });       // skull
  blob(C, L, 31.5, 59 + dy, 5.5, 4, { speckle: 0.1 });         // snout
  for (const [x, y] of [[25, 53], [26, 53], [27, 54], [28, 54], [29, 55]]) put2(C, L, x, y + dy, 'o'); // brow slanting to the axis
  put2(C, L, 30, 61 + dy, 'o');                                // nostrils
  for (const x of [30, 31]) { put2(C, L, x, 50 + dy, 'h'); put2(C, L, x, 51 + dy, 'h'); } // lit crown
  // angry glowing red eyes under the brow (3×2 each)
  for (const [x, y, r] of [[25, 54, 's'], [26, 54, 'b'], [27, 55, 'b'], [28, 55, 'h'], [26, 55, 'o'], [27, 56, 'o'], [28, 56, 's']]) put2(C, 'turtle_eyes', x, y + dy, r);
}

// ---- shell (mossshell): Voronoi plates inside an ellipse ----
const SX = 31.5, SY = 26, SRX = 23, SRY = 23;
const SEEDS = [];
for (const y of [8, 19, 31, 42]) SEEDS.push([SX, y]);                       // vertebral column
for (const [x, y] of [[21, 12], [18, 24], [19, 37]]) { SEEDS.push([x, y]); SEEDS.push([mx(x), y]); } // costals
for (let a = 15; a < 360; a += 30) {                                           // marginal ring
  const rad = (a * Math.PI) / 180;
  SEEDS.push([SX + Math.cos(rad) * SRX * 0.88, SY + Math.sin(rad) * SRY * 0.88]);
}
function cellAt(x, y) {
  let best = -1, bd = Infinity;
  SEEDS.forEach(([sx, sy], i) => { const d = (x - sx) ** 2 + ((y - sy) * 0.95) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}
function inShell(x, y) { const nx = (x - SX) / SRX, ny = (y - SY) / SRY; return nx * nx + ny * ny <= 1; }
function shell(C) {
  const L = 'turtle_shell';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inShell(x, y)) continue;
    const c = cellAt(x, y);
    let r = 'b';
    const edge = !inShell(x + 1, y) || !inShell(x - 1, y) || !inShell(x, y + 1) || !inShell(x, y - 1);
    if (edge || cellAt(x + 1, y) !== c || cellAt(x, y + 1) !== c) r = 'o';          // seams + rim
    else if (cellAt(x - 1, y) !== c || cellAt(x, y - 1) !== c) r = 'h';          // bevel lit top-left
    else if (cellAt(x + 2, y) !== c || cellAt(x, y + 2) !== c) r = 's';          // bevel shade bottom-right
    else if (hash(x, y) < 0.22) r = hash(y, x) < 0.55 ? 's' : 'h';               // mossy speckle
    put(C, L, x, y, r);
  }
  // pale hairline cracks, one short diagonal per plate (accent)
  SEEDS.forEach(([sx, sy], i) => {
    const len = 2 + (i % 3), dir = i % 2 ? 1 : -1;
    for (let k = 0; k < len; k++) {
      const x = Math.round(sx - 1 + k * dir), y = Math.round(sy - 1 + k);
      if (get(C, L, x, y) && get(C, L, x, y) !== 'o') put(C, L, x, y, 'a');
    }
  });
}

// ---- spikes (hornbone): 4-facet pyramids seen from above (lit from the top-left) ----
function spike(C, cx, cy, r) { // cx,cy = left apex column/row; 2px-wide apex
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy);
    for (let dx = -w; dx <= w + 1; dx++) {
      const x = cx + dx, y = cy + dy;
      const border = dx === -w || dx === w + 1;
      let f = dy < 0 ? (dx <= 0 ? 'h' : 'b') : (dx <= 0 ? 'b' : 's');
      put(C, 'turtle_spikes', x, y, border ? 'o' : f);
    }
  }
  put(C, 'turtle_spikes', cx, cy, 'a');
}
function spikes(C) {
  spike(C, 31, 2, 3);                                          // tail-end crest
  for (const [y, r] of [[12, 3], [25, 3], [37, 3], [46, 2]]) spike(C, 31, y, r);
  for (const [x, y, r] of [[17, 13, 3], [12, 26, 3], [15, 39, 2]]) { spike(C, x, y, r); spike(C, mx(x) - 1, y, r); }
}

// ---- rune (bloodrune): hand-authored twin sigil on the vertebral plates ----
const RUNE_TOP = [
  '.b.hb..bh.b.',
  '.bbbbbbbbbb.',
  '...b.bb.b...',
  '.sbbbssbbbs.',
  '..b..bb..b..',
  '.bb.bbbb.bb.',
];
const RUNE_BOT = [
  '....bbbb....',
  '...b....b...',
  '.b.bbhhbb.b.',
  '.bb.b..b.bb.',
  'b...bbbb...b',
  'b..b.bb.b..b',
  '.bb..bb..bb.',
  '..bbbbbbbb..',
];
function rune(C) {
  const stamp = (rows, x0, y0) => rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') put(C, 'turtle_rune', x0 + i, y0 + j, ch); }));
  stamp(RUNE_TOP, 26, 17);
  stamp(RUNE_BOT, 26, 28);
}

// ---- compose a pose ----
function draw({ fl = 0, fr = 0, rl = 0, rr = 0, hd = 0 } = {}) {
  const C = newCanvas();
  rearLeg(C, -1, rl); rearLeg(C, 1, rr);
  frontLeg(C, -1, fl); frontLeg(C, 1, fr);
  head(C, hd);
  shell(C);
  spikes(C);
  rune(C);
  return C;
}
function rows(C, L) {
  const out = [];
  for (let y = 0; y < N; y++) { let s = ''; for (let x = 0; x < N; x++) s += C[L].get(`${x},${y}`) ?? '.'; out.push(s); }
  return out;
}

export const POSES = {
  still: {},
  idle: [{}, { hd: 1 }],
  walk: [{ fl: 2, rr: 2, fr: -1, rl: -1, hd: 1 }, {}, { fr: 2, rl: 2, fl: -1, rr: -1, hd: 1 }, {}],
};
export function build() {
  const still = draw(POSES.still);
  const idle = POSES.idle.map(draw), walk = POSES.walk.map(draw);
  const out = {};
  for (const L of LAYERS) {
    out[L] = { still: rows(still, L) };
    if (L === 'turtle_head' || L === 'turtle_eyes') out[L].idle = idle.map((c) => rows(c, L));
    if (L === 'turtle_legs' || L === 'turtle_claws' || L === 'turtle_head' || L === 'turtle_eyes') out[L].walk = walk.map((c) => rows(c, L));
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2] ?? fileURLToPath(new URL('../src/data/sprites/partsTurtle.js', import.meta.url));
  const data = build();
  const lit = (g) => `[\n${g.map((r) => `      '${r}',`).join('\n')}\n    ]`;
  let body = '';
  for (const [name, d] of Object.entries(data)) {
    body += `  ${name}: {\n    still: ${lit(d.still)},\n`;
    for (const s of ['idle', 'walk']) if (d[s]) body += `    ${s}: [\n${d[s].map((g) => `    ${lit(g)},`).join('\n')}\n    ],\n`;
    body += `  },\n`;
  }
  const file = `// src/data/sprites/partsTurtle.js
// GENERATED by tools/gen-turtle.mjs — do not edit by hand; edit the generator and re-run.
// PURE. Tortuga Acorazada: native 64×64 top-down parts (res 32 → 1 char = 1 canvas px).
// Only the DOWN view (head at the bottom) is stored; up = 180° turn, side = head to the right.
import { rot180, rotHeadRight } from './gridTransform.js';

const DOWN = {
${body}};

function toPart(d) {
  const part = { res: 32, w: 64, h: 64, anchor: { x: 0, y: 0 }, down: d.still, up: rot180(d.still), side: rotHeadRight(d.still) };
  for (const state of ['idle', 'walk']) {
    if (!d[state]) continue;
    part.anim ??= {};
    part.anim[state] = { down: d[state], up: d[state].map(rot180), side: d[state].map(rotHeadRight) };
  }
  return part;
}

export const TURTLE_PARTS = Object.fromEntries(Object.entries(DOWN).map(([name, d]) => [name, toPart(d)]));
`;
  writeFileSync(target, file);
  console.log('wrote', target);
}
