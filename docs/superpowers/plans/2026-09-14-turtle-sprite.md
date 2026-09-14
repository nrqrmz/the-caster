# Tortuga Acorazada HD Sprite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple `tortuga_acorazada` sprite with a detailed native 64×64 top-down turtle traced from `tools/refs/tortuga-acorazada.png`, with 7 palette layers, breathing idle and a 4-frame leg-paddling walk.

**Architecture:** A deterministic Node dev script (`tools/gen-turtle.mjs`) draws the turtle's layers (Voronoi shell plates, pyramid spikes, rune, head, legs, claws) for each pose and writes the generated module `src/data/sprites/partsTurtle.js`. That module stores only the DOWN view and derives `up` (180° turn) and `side` (head to the right) through the pure helper `src/data/sprites/gridTransform.js`. `parts.js` spreads `TURTLE_PARTS` into `PARTS`; the recipe in `recipes.js` points at the new parts with 5 new named palettes. SpriteForge, spriteBaker, Enemy and the lazy per-world forge are unchanged.

**Tech Stack:** Native ES modules, Phaser 3 (CDN, untouched), SpriteForge (pure), `node --test` + `node:assert/strict`, Playwright MCP for the in-game check.

**Spec:** `docs/superpowers/specs/2026-09-14-turtle-sprite-design.md`

## Global Constraints

- No build step, no bundler, no npm packages in the game runtime. Dev tools in `tools/` may use `node:` built-ins only.
- The runtime loads **no PNG** for the turtle: rows of role chars + palettes only.
- Role chars are only `. o b s h a` (enforced by `tests/sprites/parts.test.js`).
- Canvas is 64×64, `scale: 1`; every turtle part is `res: 32, w: 64, h: 64, anchor: { x: 0, y: 0 }`.
- `src/data/sprites/partsTurtle.js` is GENERATED. Never hand-edit it; edit `tools/gen-turtle.mjs` and re-run.
- Enemy def (`src/data/enemies/water.js`), stats, AI, levels and `COLORS.turtleGreen` stay untouched.
- Pure modules (`gridTransform.js`, `palettes.js`, `recipes.js`, `parts.js`, `partsTurtle.js`) never import Phaser.
- Work on branch `feat/turtle-sprite` (already created). Commit after every task. Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa
  ```

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/data/sprites/gridTransform.js` | Create | Pure `rot180` / `rotHeadRight` for row-string grids |
| `tests/sprites/gridTransform.test.js` | Create | Unit tests for the transforms |
| `src/data/sprites/palettes.js` | Modify | Add `mossshell`, `oliveskin`, `hornbone`, `bloodrune`, `redeye` |
| `tests/sprites/palettes.test.js` | Modify | Palette role-ordering test |
| `tools/gen-turtle.mjs` | Create | Draws all poses, writes `partsTurtle.js` |
| `src/data/sprites/partsTurtle.js` | Generate | `TURTLE_PARTS` (7 parts, down + derived up/side + anim) |
| `src/data/sprites/parts.js` | Modify | Import + spread `TURTLE_PARTS`; delete `turtle_body`/`turtle_eye` |
| `src/data/sprites/recipes.js` | Modify | New `TORTUGA` part list + `tortuga_acorazada` recipe |
| `tools/gen-aqua.mjs` | Modify | Remove the old turtle drawing |
| `tests/sprites/turtle.test.js` | Create | Forge-level tests for the new turtle |
| `tools/preview-turtle.mjs` | Create | Forges the real recipe → enlarged PNG for design review |

---

### Task 1: Grid transforms for top-down facings

**Files:**
- Create: `src/data/sprites/gridTransform.js`
- Test: `tests/sprites/gridTransform.test.js`

**Interfaces:**
- Produces: `rot180(rows: string[]): string[]` (turn 180°) and `rotHeadRight(rows: string[]): string[]` (90° counter-clockwise: the bottom row becomes the right column; a W×H grid becomes H×W). Task 3's generated `partsTurtle.js` imports both.

- [ ] **Step 1: Write the failing test**

Create `tests/sprites/gridTransform.test.js`:

```js
// tests/sprites/gridTransform.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rot180, rotHeadRight } from '../../src/data/sprites/gridTransform.js';

test('rot180 turns rows upside down and reverses each row', () => {
  assert.deepEqual(rot180(['ab', 'cd']), ['dc', 'ba']);
});

test('rotHeadRight moves the bottom row (head) to the right column', () => {
  assert.deepEqual(rotHeadRight(['ab', 'cd']), ['bd', 'ac']);
});

test('rotHeadRight turns a W×H grid into H×W', () => {
  // 3 wide × 2 tall → 2 wide × 3 tall; bottom row 'def' ends up as the right column.
  assert.deepEqual(rotHeadRight(['abc', 'def']), ['cf', 'be', 'ad']);
});

test('two head-right turns equal one 180° turn; four are the identity', () => {
  const g = ['ab.', 'c.d', '.ef'];
  assert.deepEqual(rotHeadRight(rotHeadRight(g)), rot180(g));
  assert.deepEqual(rotHeadRight(rotHeadRight(rotHeadRight(rotHeadRight(g)))), g);
});

test('transforms do not mutate their input', () => {
  const g = ['ab', 'cd'];
  rot180(g); rotHeadRight(g);
  assert.deepEqual(g, ['ab', 'cd']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/gridTransform.test.js`
Expected: FAIL with `Cannot find module` / `ERR_MODULE_NOT_FOUND` for `gridTransform.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/data/sprites/gridTransform.js`:

```js
// src/data/sprites/gridTransform.js
// PURE. Turn row-string grids (SpriteForge part rows) of top-down creatures that are
// authored facing DOWN (head at the bottom) into their other facings.

// 180° turn: facing UP (head at the top). A turn, not a mirror, so asymmetric
// details (runes, alternating steps) stay correct.
export function rot180(rows) {
  return rows.slice().reverse().map((row) => [...row].reverse().join(''));
}

// 90° counter-clockwise: the bottom row (head) becomes the right column → SIDE view
// facing right (FacingController flips it for left). A W×H grid becomes H×W.
export function rotHeadRight(rows) {
  const h = rows.length, w = rows[0].length;
  return Array.from({ length: w }, (_, ny) =>
    Array.from({ length: h }, (_, nx) => rows[nx][w - 1 - ny]).join(''));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/gridTransform.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/gridTransform.js tests/sprites/gridTransform.test.js
git commit -m "feat(sprites): gridTransform puro — rot180 y rotHeadRight para vistas cenitales

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa"
```

---

### Task 2: Turtle palettes

**Files:**
- Modify: `src/data/sprites/palettes.js` (inside `NAMED_PALETTES`, after the `leafgreen` entry, before the closing `};`)
- Test: `tests/sprites/palettes.test.js` (append)

**Interfaces:**
- Produces: `NAMED_PALETTES.mossshell`, `.oliveskin`, `.hornbone`, `.bloodrune`, `.redeye`. Each is `{ outline, base, shade, highlight, accent }` of ints. Task 4's recipe references them by name.

- [ ] **Step 1: Write the failing test**

Append to `tests/sprites/palettes.test.js`:

```js
test('turtle palettes exist with 5 ordered roles (shade < base < highlight)', () => {
  const lum = (c) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
  for (const name of ['mossshell', 'oliveskin', 'hornbone', 'bloodrune', 'redeye']) {
    const p = NAMED_PALETTES[name];
    assert.ok(p, `missing palette ${name}`);
    for (const role of ['outline', 'base', 'shade', 'highlight', 'accent']) {
      assert.equal(typeof p[role], 'number', `${name}.${role}`);
    }
    assert.ok(lum(p.outline) < lum(p.shade), `${name}: outline darker than shade`);
    assert.ok(lum(p.shade) < lum(p.base), `${name}: shade darker than base`);
    assert.ok(lum(p.highlight) > lum(p.base), `${name}: highlight lighter than base`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/palettes.test.js`
Expected: FAIL with `missing palette mossshell`.

- [ ] **Step 3: Write minimal implementation**

In `src/data/sprites/palettes.js`, directly after the `leafgreen: derivePalette(...)` line and before the closing `};` of `NAMED_PALETTES`, add:

```js
  // Water — Tortuga Acorazada (tools/refs/tortuga-acorazada.png). Sampled from the
  // reference and lifted slightly so the dark olive reads on the water background.
  mossshell: derivePalette(0x45432f, { base: 0x45432f, highlight: 0x68664a, shade: 0x2c2a1f, outline: 0x141310, accent: 0xb3a07e }), // carapace plates; accent = pale cracks
  oliveskin: derivePalette(0x5c5638, { base: 0x5c5638, highlight: 0x857c58, shade: 0x3b3624, outline: 0x17120d, accent: 0xa89c70 }), // head + legs
  hornbone: derivePalette(0x9a8064, { base: 0x9a8064, highlight: 0xcdb397, shade: 0x6d5642, outline: 0x2a1e16, accent: 0xe6d3b3 }),  // spikes + claws (tan horn, not white bone)
  bloodrune: derivePalette(0x8e2a26, { base: 0x8e2a26, highlight: 0xb4403a, shade: 0x642221, outline: 0x3a1210, accent: 0xc85a4a }), // carved rune
  redeye: derivePalette(0xc0241c, { base: 0xc0241c, highlight: 0xff5a44, shade: 0x701311, outline: 0x3a0a08, accent: 0xffd0c0 }),    // glowing eyes
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/palettes.test.js`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/palettes.js tests/sprites/palettes.test.js
git commit -m "feat(sprites): paletas de la Tortuga Acorazada (musgo, oliva, cuerno, runa, ojo)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa"
```

---

### Task 3: Turtle generator + generated parts module

**Files:**
- Create: `tools/gen-turtle.mjs`
- Generate: `src/data/sprites/partsTurtle.js`
- Modify: `src/data/sprites/parts.js` (import + spread `TURTLE_PARTS`)
- Test: `tests/sprites/turtle.test.js` (first half: part shape)

**Interfaces:**
- Consumes: `rot180`, `rotHeadRight` from `src/data/sprites/gridTransform.js` (Task 1).
- Produces: `TURTLE_PARTS` exported from `src/data/sprites/partsTurtle.js`, spread into `PARTS`. It contains 7 keys: `turtle_legs`, `turtle_claws`, `turtle_head`, `turtle_shell`, `turtle_spikes`, `turtle_rune`, `turtle_eyes`. Each part is `{ res: 32, w: 64, h: 64, anchor: {x:0,y:0}, down, up, side }`, with rows as 64 strings of 64 chars. `turtle_head`/`turtle_eyes` also carry `anim.idle.{down,up,side}` (2 frames). `turtle_legs`/`turtle_claws`/`turtle_head`/`turtle_eyes` carry `anim.walk.{down,up,side}` (4 frames).

- [ ] **Step 1: Write the failing test**

Create `tests/sprites/turtle.test.js`:

```js
// tests/sprites/turtle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../../src/data/sprites/parts.js';
import { rot180, rotHeadRight } from '../../src/data/sprites/gridTransform.js';

const TURTLE = ['turtle_legs', 'turtle_claws', 'turtle_head', 'turtle_shell', 'turtle_spikes', 'turtle_rune', 'turtle_eyes'];

test('turtle parts are full-canvas 64×64 res-32 stamps', () => {
  for (const name of TURTLE) {
    const p = PARTS[name];
    assert.ok(p, `missing part ${name}`);
    assert.equal(p.res, 32, `${name}.res`);
    assert.equal(p.w, 64, `${name}.w`);
    assert.equal(p.h, 64, `${name}.h`);
    assert.deepEqual(p.anchor, { x: 0, y: 0 }, `${name}.anchor`);
    assert.ok(p.down.some((row) => /[obsha]/.test(row)), `${name}.down is not empty`);
  }
});

test('turtle up/side are the 180° and head-right turns of down', () => {
  for (const name of TURTLE) {
    assert.deepEqual(PARTS[name].up, rot180(PARTS[name].down), `${name}.up`);
    assert.deepEqual(PARTS[name].side, rotHeadRight(PARTS[name].down), `${name}.side`);
  }
});

test('turtle anim frames: idle on head+eyes (2), walk on legs+claws+head+eyes (4)', () => {
  for (const name of ['turtle_head', 'turtle_eyes']) {
    for (const dir of ['down', 'up', 'side']) assert.equal(PARTS[name].anim.idle[dir].length, 2, `${name} idle ${dir}`);
  }
  for (const name of ['turtle_legs', 'turtle_claws', 'turtle_head', 'turtle_eyes']) {
    for (const dir of ['down', 'up', 'side']) assert.equal(PARTS[name].anim.walk[dir].length, 4, `${name} walk ${dir}`);
  }
  for (const name of ['turtle_shell', 'turtle_spikes', 'turtle_rune']) {
    assert.equal(PARTS[name].anim, undefined, `${name} stays still`);
  }
});

test('turtle walk frames move the legs (A and C differ from neutral and from each other)', () => {
  const walk = PARTS.turtle_legs.anim.walk.down;
  assert.notDeepEqual(walk[0], walk[1]);
  assert.notDeepEqual(walk[2], walk[1]);
  assert.notDeepEqual(walk[0], walk[2]);
  assert.deepEqual(walk[1], PARTS.turtle_legs.down, 'frame B is the neutral pose');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/turtle.test.js`
Expected: FAIL with `missing part turtle_legs`.

- [ ] **Step 3: Create the generator**

Create `tools/gen-turtle.mjs` with exactly this content:

```js
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
```

- [ ] **Step 4: Run the generator**

Run: `node tools/gen-turtle.mjs`
Expected output: `wrote /…/the-caster/src/data/sprites/partsTurtle.js`. The file is about 1830 lines, starts with `// src/data/sprites/partsTurtle.js` and ends with `export const TURTLE_PARTS = …`.

- [ ] **Step 5: Spread the parts into PARTS**

In `src/data/sprites/parts.js`, add the import directly above `export const PARTS = {` (after the header comment block):

```js
import { TURTLE_PARTS } from './partsTurtle.js';
```

Then find the comment line `  // --- Fish / serpent / shelled archetype (gen-aqua.mjs) ---` and insert directly **above** it:

```js
  // Tortuga Acorazada — native 64×64 top-down parts, GENERATED by tools/gen-turtle.mjs.
  ...TURTLE_PARTS,

```

(The old `turtle_body`/`turtle_eye` blocks stay for now: they have different keys and are removed in Task 4.)

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/sprites/turtle.test.js tests/sprites/parts.test.js`
Expected: PASS. `parts.test.js` validates that every turtle row is 64 wide × 64 tall and uses only role chars.

- [ ] **Step 7: Verify the generator is reproducible**

Run: `git add src/data/sprites/partsTurtle.js && node tools/gen-turtle.mjs && git diff --exit-code src/data/sprites/partsTurtle.js && echo REPRODUCIBLE`
Expected: last line `REPRODUCIBLE` (no diff).

- [ ] **Step 8: Commit**

```bash
git add tools/gen-turtle.mjs src/data/sprites/partsTurtle.js src/data/sprites/parts.js tests/sprites/turtle.test.js
git commit -m "feat(water): generador de la Tortuga Acorazada HD (64×64 nativa, 7 capas, idle+walk)

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa"
```

---

### Task 4: Wire the recipe and remove the old turtle

**Files:**
- Modify: `src/data/sprites/recipes.js` (comment above `SHARK`, the `TORTUGA` const, the `tortuga_acorazada` recipe line)
- Modify: `src/data/sprites/parts.js` (delete `turtle_body` + `turtle_eye` blocks)
- Modify: `tools/gen-aqua.mjs` (delete the old turtle drawing)
- Test: `tests/sprites/turtle.test.js` (append forge-level tests)

**Interfaces:**
- Consumes: `TURTLE_PARTS` part names (Task 3) and palette names `oliveskin`, `hornbone`, `mossshell`, `bloodrune`, `redeye` (Task 2).
- Produces: `RECIPES.tortuga_acorazada = { archetype: 'shelled', gridW: 64, gridH: 64, scale: 1, anim: { idle: 2, walk: 4 }, parts: TORTUGA }`. `forge()` output: `width === height === 64`; `idle-*` has 2 frames and `walk-*` has 4.

- [ ] **Step 1: Write the failing tests**

Append to `tests/sprites/turtle.test.js`:

```js
import { getRecipe, paletteFor } from '../../src/data/sprites/recipes.js';
import { NAMED_PALETTES } from '../../src/data/sprites/palettes.js';
import { forge } from '../../src/systems/SpriteForge.js';

// Same per-part palette resolution as spriteBaker.resolvePartPalette for named palettes.
const partPalette = (ref) => (ref.palette ? NAMED_PALETTES[ref.palette] : null);
const forgeTurtle = () => forge(getRecipe('tortuga_acorazada'), PARTS, paletteFor('tortuga_acorazada', 0x5a9e57), partPalette);
const grid180 = (g) => g.slice().reverse().map((row) => row.slice().reverse());
const gridHeadRight = (g) => {
  const h = g.length, w = g[0].length;
  return Array.from({ length: w }, (_, ny) => Array.from({ length: h }, (_, nx) => g[nx][w - 1 - ny]));
};

test('tortuga_acorazada forges a native 64×64 sprite: 2 idle + 4 walk frames per facing', () => {
  const r = getRecipe('tortuga_acorazada');
  assert.equal(r.gridW, 64);
  assert.equal(r.gridH, 64);
  assert.equal(r.scale, 1);
  const out = forgeTurtle();
  assert.equal(out.width, 64);
  assert.equal(out.height, 64);
  for (const dir of ['down', 'up', 'side']) {
    assert.equal(out.anims[`idle-${dir}`].length, 2, `idle-${dir}`);
    assert.equal(out.anims[`walk-${dir}`].length, 4, `walk-${dir}`);
    for (const f of [...out.anims[`idle-${dir}`], ...out.anims[`walk-${dir}`]]) {
      assert.equal(f.length, 64, 'frame rows');
      assert.equal(f[0].length, 64, 'frame cols');
    }
  }
});

test('forged turtle: up is the 180° turn of down, side turns the head right', () => {
  const a = forgeTurtle().anims;
  assert.deepEqual(a['idle-up'][0], grid180(a['idle-down'][0]));
  assert.deepEqual(a['idle-side'][0], gridHeadRight(a['idle-down'][0]));
  assert.deepEqual(a['walk-up'][0], grid180(a['walk-down'][0]));
});

test('forged turtle animates: walk frames differ, idle breathes', () => {
  const a = forgeTurtle().anims;
  const flat = (f) => f.flat().map((c) => (c == null ? -1 : c)).join(',');
  assert.notEqual(flat(a['walk-down'][0]), flat(a['walk-down'][1]), 'walk A vs B');
  assert.notEqual(flat(a['walk-down'][2]), flat(a['walk-down'][1]), 'walk C vs B');
  assert.notEqual(flat(a['idle-down'][0]), flat(a['idle-down'][1]), 'idle breath');
});

test('forged turtle shows the moss shell, horn spikes, blood rune and red eyes', () => {
  const colors = new Set(forgeTurtle().anims['idle-down'][0].flat().filter((c) => c != null));
  for (const [pal, role] of [['mossshell', 'base'], ['hornbone', 'highlight'], ['bloodrune', 'base'], ['redeye', 'base'], ['oliveskin', 'base']]) {
    assert.ok(colors.has(NAMED_PALETTES[pal][role]), `${pal}.${role} present`);
  }
});

test('old simple turtle parts are gone', () => {
  assert.equal(PARTS.turtle_body, undefined);
  assert.equal(PARTS.turtle_eye, undefined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/sprites/turtle.test.js`
Expected: FAIL. `r.gridW` is `undefined` (expected 64), and `PARTS.turtle_body` still exists.

- [ ] **Step 3: Update the recipe**

In `src/data/sprites/recipes.js`, replace:

```js
// Fish / serpent / shelled. body = type color (belly = its own highlight); teeth/fangs
// = bone; eyes shadow|glow. Turtle/crab carry their own green/red type colors.
```

with:

```js
// Fish / serpent / shelled. body = type color (belly = its own highlight); teeth/fangs
// = bone; eyes shadow|glow. The crab carries its own red type color; the turtle is a
// native 64×64 multi-palette sprite (parts generated by tools/gen-turtle.mjs).
```

Replace:

```js
const TORTUGA = [{ name: 'turtle_body' }, { name: 'turtle_eye', palette: 'shadow' }];
```

with:

```js
const TORTUGA = [
  { name: 'turtle_legs', palette: 'oliveskin' }, { name: 'turtle_claws', palette: 'hornbone' },
  { name: 'turtle_head', palette: 'oliveskin' }, { name: 'turtle_shell', palette: 'mossshell' },
  { name: 'turtle_spikes', palette: 'hornbone' }, { name: 'turtle_rune', palette: 'bloodrune' },
  { name: 'turtle_eyes', palette: 'redeye' },
];
```

Replace:

```js
  tortuga_acorazada: { archetype: 'shelled', size: 64, parts: TORTUGA },
```

with:

```js
  tortuga_acorazada: { archetype: 'shelled', gridW: 64, gridH: 64, scale: 1, anim: { idle: 2, walk: 4 }, parts: TORTUGA }, // native 64×64 top-down (1:1 on screen)
```

- [ ] **Step 4: Delete the old parts from parts.js**

Run this one-off script, which removes everything from `  turtle_body: {` up to (not including) `  crab_body: {`:

```bash
node -e '
const fs = require("fs"); const f = "src/data/sprites/parts.js";
const s = fs.readFileSync(f, "utf8");
const a = s.indexOf("\n  turtle_body: {"), b = s.indexOf("\n  crab_body: {");
if (a < 0 || b < 0 || b < a) { console.error("markers not found"); process.exit(1); }
const cut = s.slice(a, b);
if (!cut.includes("turtle_eye: {") || cut.includes("crab_")) { console.error("unexpected slice"); process.exit(1); }
fs.writeFileSync(f, s.slice(0, a) + s.slice(b));
console.log("removed", cut.split("\n").length - 1, "lines");
'
```

Expected: `removed 95 lines` (approximately; `turtle_body` + `turtle_eye` blocks).
Then run: `grep -n "turtle_body\|turtle_eye\b" src/data/sprites/parts.js`
Expected: no output.

- [ ] **Step 5: Remove the old turtle drawing from gen-aqua.mjs**

In `tools/gen-aqua.mjs`:
1. Delete the header comment line `//   tortuga_acorazada — armored turtle, plated dome shell + head/flippers (tanky charge)`.
2. Delete the layers line `  turtle_body: {}, turtle_eye: {},`.
3. Delete the whole section from `// ============================ TORTUGA_ACORAZADA (armored turtle, top-down) ============================` through `put('turtle_eye', cx - 1, 5, 'b'); put('turtle_eye', cx + 1, 5, 'b');`, plus the blank line after it. The next remaining line must be `// ============================ CANGREJO_ACORAZADO (armored crab, front view) ============================`.

Run: `grep -n "turtle\|tortuga" tools/gen-aqua.mjs; node tools/gen-aqua.mjs > /dev/null && echo GEN_AQUA_OK`
Expected: no grep matches, then `GEN_AQUA_OK`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test tests/sprites/`
Expected: PASS. This includes `recipes.test.js` "every water enemy has a recipe with known parts" and "every recipe forges without throwing".

- [ ] **Step 7: Run the full suite**

Run: `node --test`
Expected: all tests pass, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add src/data/sprites/recipes.js src/data/sprites/parts.js tools/gen-aqua.mjs tests/sprites/turtle.test.js
git commit -m "feat(water): tortuga_acorazada usa el sprite HD y se retira la tortuga simple

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa"
```

---

### Task 5: Real-forge preview + design review gate

**Files:**
- Create: `tools/preview-turtle.mjs`

**Interfaces:**
- Consumes: `getRecipe('tortuga_acorazada')` (Task 4), `PARTS`, `NAMED_PALETTES`, `forge`.
- Produces: CLI `node tools/preview-turtle.mjs <out.png>`, which writes a PNG strip at 6× scale: `idle-down[0]`, `idle-up[0]`, `idle-side[0]`, `walk-down[0..3]`, `idle-down[1]`.

- [ ] **Step 1: Create the preview tool**

Create `tools/preview-turtle.mjs`:

```js
// Dev preview: forge the REAL tortuga_acorazada recipe (same path as spriteBaker) and
// write an enlarged PNG strip — down, up, side, walk-down ×4, idle breath.
// Run: node tools/preview-turtle.mjs <out.png>
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { forge } from '../src/systems/SpriteForge.js';
import { getRecipe, paletteFor } from '../src/data/sprites/recipes.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { NAMED_PALETTES } from '../src/data/sprites/palettes.js';

const outPath = process.argv[2];
if (!outPath) { console.error('usage: node tools/preview-turtle.mjs <out.png>'); process.exit(1); }

const partPalette = (ref) => (ref.palette ? NAMED_PALETTES[ref.palette] : null);
const { anims } = forge(getRecipe('tortuga_acorazada'), PARTS, paletteFor('tortuga_acorazada', 0x5a9e57), partPalette);
const frames = [anims['idle-down'][0], anims['idle-up'][0], anims['idle-side'][0], ...anims['walk-down'], anims['idle-down'][1]];

const S = 6, PAD = 8, FW = frames[0][0].length, FH = frames[0].length;
const W = frames.length * (FW * S + PAD) + PAD, H = FH * S + 2 * PAD;
const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { rgb[i * 3] = 0x1e; rgb[i * 3 + 1] = 0x3a; rgb[i * 3 + 2] = 0x4a; } // water-ish backdrop
frames.forEach((f, k) => {
  const ox = PAD + k * (FW * S + PAD);
  for (let y = 0; y < FH * S; y++) for (let x = 0; x < FW * S; x++) {
    const c = f[(y / S) | 0][(x / S) | 0];
    if (c == null) continue;
    const i = ((PAD + y) * W + ox + x) * 3;
    rgb[i] = c >> 16; rgb[i + 1] = (c >> 8) & 255; rgb[i + 2] = c & 255;
  }
});

// Minimal RGB PNG encoder (node:zlib only).
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); // filter byte 0 per row
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(outPath, Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]));
console.log('preview', outPath, `${W}×${H}`);
```

- [ ] **Step 2: Render the preview**

Run: `node tools/preview-turtle.mjs "$SCRATCHPAD/turtle-preview.png"` (use the session scratchpad directory, never the repo).
Expected: `preview …/turtle-preview.png 3144×400`. Open the PNG (Read tool) and confirm: 8 turtles; #2 has the head at the top; #3 has the head on the right; #4 and #6 show the diagonal leg pairs stepping; #8 has the head 1px lower.

- [ ] **Step 3: Design gate — user review**

Show the preview PNG to the user and get an explicit OK. If they request tweaks, edit **only** `tools/gen-turtle.mjs` (positions/sizes/rune rows) or the palette hex values from Task 2. Then re-run `node tools/gen-turtle.mjs`, `node --test tests/sprites/` and Step 2, and show it again. Do not proceed without the OK.

- [ ] **Step 4: Commit**

```bash
git add tools/preview-turtle.mjs tools/gen-turtle.mjs src/data/sprites/partsTurtle.js src/data/sprites/palettes.js
git commit -m "chore(tools): preview-turtle — forja real de la tortuga a PNG para revisión

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012coxqgqSMkeKVsCQMwXoWa"
```

---

### Task 6: In-game verification

**Files:** none modified (verification only).

**Interfaces:**
- Consumes: `window.__game` (exposed because `DEBUG = true` in `src/config.js`), scenes `Intro`/`Branch`/`Game`, `GameScene.spawnEnemy(def)`, `ENEMY_TYPES` from `/src/data/enemies.js`, `SaveSystem` from `/src/systems/SaveSystem.js`, `BranchScene.runtimeStats(save)`.

- [ ] **Step 1: Serve the game**

Run (background): `python3 -m http.server 8000` from the repo root.

- [ ] **Step 2: Open in a portrait mobile viewport**

With Playwright MCP: `browser_resize` to 480×854, then `browser_navigate` to `http://localhost:8000`, and wait ~3s for Boot → Menu.

- [ ] **Step 3: Enter the Water world (triggers the lazy Water forge)**

`browser_evaluate`:

```js
async () => {
  const g = window.__game;
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
  g.scene.start('Intro', { regionId: 'water' });
  for (let i = 0; i < 100 && !g.scene.isActive('Branch'); i++) {
    const intro = g.scene.getScene('Intro');
    if (intro && intro.baked && g.scene.isActive('Intro')) intro.proceed();
    await new Promise((r) => setTimeout(r, 200));
  }
  return { branch: g.scene.isActive('Branch'), turtleTex: g.textures.exists('spr_tortuga_acorazada') };
}
```

Expected: `{ branch: true, turtleTex: true }`.

- [ ] **Step 4: Start a Water level and spawn two turtles**

`browser_evaluate`:

```js
async () => {
  const g = window.__game;
  const { SaveSystem } = await import('/src/systems/SaveSystem.js');
  const b = g.scene.getScene('Branch');
  b.scene.start('Game', { regionId: 'water', levelIndex: 0, stats: b.runtimeStats(new SaveSystem(localStorage).load()) });
  for (let i = 0; i < 50 && !g.scene.isActive('Game'); i++) await new Promise((r) => setTimeout(r, 100));
  await new Promise((r) => setTimeout(r, 1500));
  const gs = g.scene.getScene('Game');
  const { ENEMY_TYPES } = await import('/src/data/enemies.js');
  const t = [gs.spawnEnemy(ENEMY_TYPES.tortuga_acorazada), gs.spawnEnemy(ENEMY_TYPES.tortuga_acorazada)];
  return t.map((e) => ({ tex: e.texture.key, w: e.displayWidth, h: e.displayHeight, anim: e.anims.currentAnim?.key ?? null }));
}
```

Expected: two entries with `w: 64, h: 64`. `tex` starts with `spr_tortuga_acorazada`; `anim` is `tortuga_acorazada-walk-…` or `-idle-…` once they update (it may be `null` on the very first frame).

- [ ] **Step 5: Screenshot and console check**

Wait ~2s so the turtles walk in, then `browser_take_screenshot` (save to the scratchpad) and `browser_console_messages`.
Expected: the turtles are visible with the plated shell, spikes, red rune and eyes, and face their movement direction. The console has no errors (`SpriteForge: unknown part`, `unknown part palette`, module 404s).

- [ ] **Step 6: Show the screenshot to the user**

Share the in-game screenshot and report the results of Steps 3–5. Stop the http.server background task. No commit (verification only).

---

## Finishing

After Task 6, use `superpowers:finishing-a-development-branch` (PR to `master` from `feat/turtle-sprite`).
