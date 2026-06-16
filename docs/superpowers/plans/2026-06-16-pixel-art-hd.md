# Pixel Art HD (32×32) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the procedural sprite engine from a 16×16 design grid to 32×32, redraw the whole roster at native 32 quality (starting with a redheaded-princess hero), and make small enemies targetable — without ever leaving the game in a broken state.

**Architecture:** `SpriteForge` (pure) gets `DESIGN=32`, a per-part nearest-neighbor upscale (legacy 16-grid parts auto-fill the 32 grid via a `res` field) so migration is incremental, and per-part palettes so one creature can mix hues (skin + red hair + green gown + gold). Parts are re-authored to native `res:32` in waves by family. Enemy on-screen size/hitbox comes from `def.radius`, scaled ×1.5 with a hard floor of 16.

**Tech Stack:** Native ES modules, Phaser 3 (CDN), `node:test` + `node:assert/strict`. Pure modules: `SpriteForge.js`, `recipes.js`, `parts.js`, `palettes.js`, `EnemyBrain.js`.

---

## File Structure

- `src/systems/SpriteForge.js` — **modify**: `DESIGN` 16→32; replace `composeGrid`+`resolve` with `composeColorGrid` (per-part res-upscale + per-part palette); `forge` gains optional `partPalette` resolver. Empty-cell sentinel becomes `null`.
- `src/data/sprites/recipes.js` — **modify**: double every `size` (min 32); hero recipe rewritten with per-part palettes (Task 4); enemy recipes get `res:32` parts as waves land.
- `src/data/sprites/parts.js` — **modify**: every part re-authored to `res:32` over the waves (legacy parts keep working until then via auto-upscale).
- `src/data/sprites/palettes.js` — **modify**: add named palettes (`skin`, `redhair`, `greengown`, `gold`, `orbblue`, plus enemy palettes per wave).
- `src/scenes/BootScene.js` — **modify**: build a `partPalette` resolver and pass it to `forge`.
- `src/systems/EnemyBrain.js` — **modify**: `buildSplitChildren` clamps child `radius` to ≥16.
- `src/data/enemies/*.js` — **modify**: `def.radius` ×1.5 across the roster (Task 2).
- `tests/sprites/SpriteForge.test.js` — **rewrite**: covers the new compose/upscale/palette behavior.
- `tests/sprites/recipes.test.js` — **unchanged** (the forge-every-recipe parity test; must stay green after every task).
- `tests/EnemyBrain.test.js` (or the existing split test) — **modify/extend**: split radius clamp.

---

## Authoring protocol (read before any redraw task)

Parts live in `src/data/sprites/parts.js`. A part is:
```js
name: {
  res: 32,                 // NEW: authored-grid resolution. Omit = legacy 16 (auto-upscaled ×2).
  w: <cols>, h: <rows>, anchor: { x: <col>, y: <row> },  // anchor = top-left placement on the DESIGN grid
  down: [ '<row>', ... ],  // role-char rows; up/side likewise. A null direction = not drawn for that facing.
  up:   [ ... ],
  side: [ ... ],
}
```
Role chars: `o`=outline, `b`=base, `s`=shade, `h`=highlight, `a`=accent, `.`=transparent. Roles resolve to the part's palette (its part-ref override if any, else the recipe palette).

**To re-author a part at native 32 (a redraw wave):**
1. Set `res: 32` and author `down`/`up`/`side` on a grid up to 32×32 (use the extra pixels for shading `s`, highlights `h`, finer silhouette). Keep `w`/`h`/`anchor` consistent with the new rows.
2. Keep the part's role vocabulary (o/b/s/h/a) — colors come from palettes, so the same part renders per-creature.
3. Center content so `legShift` (lower-half horizontal shift) animates the legs/lower body sensibly.
4. **Verify:** `node --test tests/sprites/` (the parity test forges every recipe — a malformed part throws), then the visual smoke test (Task 10 command) to eyeball it in the browser.

The pixel rows themselves are authored by the implementer following these constraints + the silhouette notes in each wave task. This is creative authoring, not boilerplate — the acceptance bar is: forges without error, parity green, and reads clearly at the creature's on-screen size.

---

## Task 1: Engine — DESIGN 32, per-part upscale + palettes

**Files:**
- Modify: `src/systems/SpriteForge.js`
- Modify: `src/data/sprites/recipes.js` (double sizes)
- Rewrite: `tests/sprites/SpriteForge.test.js`

- [ ] **Step 1: Rewrite the SpriteForge unit tests (they import the old `composeGrid`)**

Replace the entire contents of `tests/sprites/SpriteForge.test.js` with:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forge, composeColorGrid, DESIGN } from '../../src/systems/SpriteForge.js';

const PAL = { outline: 0x111111, base: 0x222222, shade: 0x333333, highlight: 0x444444, accent: 0x555555 };
const PARTS = {
  dot16: { res: 16, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['b'], up: ['b'], side: ['b'] },
  dot32: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['h'], up: ['h'], side: ['h'] },
};

test('DESIGN is 32', () => { assert.equal(DESIGN, 32); });

test('composeColorGrid upscales a legacy res:16 part ×2 (fills a 2×2 block)', () => {
  const g = composeColorGrid({ parts: ['dot16'] }, PARTS, 'down', PAL);
  assert.equal(g.length, 32);
  assert.equal(g[0][0], PAL.base);
  assert.equal(g[0][1], PAL.base);
  assert.equal(g[1][0], PAL.base);
  assert.equal(g[1][1], PAL.base);
  assert.equal(g[2][0], null);          // only the 2×2 block is filled
});

test('composeColorGrid stamps a res:32 part 1:1', () => {
  const g = composeColorGrid({ parts: ['dot32'] }, PARTS, 'down', PAL);
  assert.equal(g[0][0], PAL.highlight);
  assert.equal(g[0][1], null);
  assert.equal(g[1][0], null);
});

test('composeColorGrid resolves a part-ref palette override, not the recipe palette', () => {
  const partPalette = (ref) => (ref.color != null ? { ...PAL, base: ref.color } : null);
  const g = composeColorGrid({ parts: [{ name: 'dot16', color: 0xabcdef }] }, PARTS, 'down', PAL, partPalette);
  assert.equal(g[0][0], 0xabcdef);      // override wins
});

test('composeColorGrid throws on unknown part and unknown role char', () => {
  assert.throws(() => composeColorGrid({ parts: ['ghost'] }, {}, 'down', PAL), /unknown part/);
  const bad = { x: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['z'], up: ['z'], side: ['z'] } };
  assert.throws(() => composeColorGrid({ parts: ['x'] }, bad, 'down', PAL), /unknown role char/);
});

test('forge: scale follows size/DESIGN; output texture is DESIGN*scale', () => {
  const out32 = forge({ size: 32, parts: ['dot32'], anim: { idle: 1, walk: 1 } }, PARTS, PAL);
  assert.equal(out32.size, 32);                          // scale 1
  assert.equal(out32.anims['idle-down'][0].length, 32);
  const out64 = forge({ size: 64, parts: ['dot32'], anim: { idle: 1, walk: 1 } }, PARTS, PAL);
  assert.equal(out64.size, 64);                          // scale 2
  assert.equal(out64.anims['idle-down'][0].length, 64);
});

test('forge produces idle and walk frame sets per direction', () => {
  const out = forge({ size: 32, parts: ['dot16'], anim: { idle: 2, walk: 2 } }, PARTS, PAL);
  assert.equal(out.anims['idle-down'].length, 2);
  assert.equal(out.anims['walk-side'].length, 2);
  assert.equal(out.anims['idle-down'][0][0][0], PAL.base); // top-left pixel is the base color
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: FAIL — `composeColorGrid` not exported; `DESIGN` is 16.

- [ ] **Step 3: Rewrite SpriteForge.js**

Replace the entire contents of `src/systems/SpriteForge.js` with:
```js
// src/systems/SpriteForge.js
// PURE. Forge a recipe + parts + palettes into color-grid frames per anim/direction.

export const DESIGN = 32;
const ROLE_MAP = { o: 'outline', b: 'base', s: 'shade', h: 'highlight', a: 'accent' };
const DIRS = ['down', 'up', 'side'];

function emptyGrid() {
  return Array.from({ length: DESIGN }, () => new Array(DESIGN).fill(null));
}

// Compose every part into a DESIGN×DESIGN grid of color ints (or null = transparent).
// Each part resolves against its own palette: partPalette(ref) wins, else `palette`.
// A part authored at res < DESIGN is nearest-neighbor upscaled by DESIGN/res (rows +
// anchor), so legacy 16-grid art fills the 32 grid unchanged.
export function composeColorGrid(recipe, parts, dir, palette, partPalette = () => null) {
  const g = emptyGrid();
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    const rows = part[dir];
    if (rows == null) continue;
    const f = DESIGN / (part.res ?? 16);
    const pal = (typeof ref === 'object' ? partPalette(ref) : null) || palette;
    const ax = ((typeof ref === 'object' && ref.x != null) ? ref.x : part.anchor.x) * f;
    const ay = ((typeof ref === 'object' && ref.y != null) ? ref.y : part.anchor.y) * f;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        const role = ROLE_MAP[ch];
        if (!role) throw new Error(`SpriteForge: unknown role char '${ch}'`);
        const color = pal[role];
        for (let dy = 0; dy < f; dy++) {
          for (let dx = 0; dx < f; dx++) {
            const y = ay + r * f + dy, x = ax + c * f + dx;
            if (y < 0 || y >= DESIGN || x < 0 || x >= DESIGN) continue;
            g[y][x] = color;
          }
        }
      }
    }
  }
  return g;
}

function shiftV(grid, dy) {
  const out = emptyGrid();
  for (let y = 0; y < DESIGN; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= DESIGN) continue;
    for (let x = 0; x < DESIGN; x++) out[ny][x] = grid[y][x];
  }
  return out;
}

// Walk step: shift the lower half (rows >= DESIGN/2) horizontally.
function legShift(grid, dx) {
  const split = (DESIGN / 2) | 0;
  const out = grid.map((row) => row.slice());
  for (let y = split; y < DESIGN; y++) {
    const row = new Array(DESIGN).fill(null);
    for (let x = 0; x < DESIGN; x++) {
      const nx = x + dx;
      if (nx < 0 || nx >= DESIGN) continue;
      row[nx] = grid[y][x];
    }
    out[y] = row;
  }
  return out;
}

function idleFrames(base, count) { return padFrames([base, shiftV(base, 1)], count, base); }
function walkFrames(base, count) { return padFrames([legShift(base, -1), legShift(base, 1)], count, base); }
function padFrames(frames, count, fallback) {
  if (count <= frames.length) return frames.slice(0, Math.max(1, count));
  const out = frames.slice();
  while (out.length < count) out.push(fallback);
  return out;
}

function scaleGrid(grid, f) {
  if (f === 1) return grid;
  const n = grid.length;
  const out = [];
  for (let y = 0; y < n * f; y++) {
    const row = [];
    for (let x = 0; x < n * f; x++) row.push(grid[(y / f) | 0][(x / f) | 0]);
    out.push(row);
  }
  return out;
}

export function forge(recipe, parts, palette, partPalette = () => null) {
  const scale = recipe.scale ?? (recipe.size ? recipe.size / DESIGN : 1);
  const anim = recipe.anim ?? {};
  const anims = {};
  for (const dir of DIRS) {
    const base = composeColorGrid(recipe, parts, dir, palette, partPalette);
    const sets = { idle: idleFrames(base, anim.idle ?? 2), walk: walkFrames(base, anim.walk ?? 2) };
    for (const state of ['idle', 'walk']) {
      anims[`${state}-${dir}`] = sets[state].map((grid) => scaleGrid(grid, scale));
    }
  }
  return { size: DESIGN * scale, fps: recipe.fps ?? 5, anims };
}
```

- [ ] **Step 4: Run the SpriteForge tests to verify they pass**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: PASS.

- [ ] **Step 5: Double every recipe `size` in recipes.js (keep scale ≥ 1)**

In `src/data/sprites/recipes.js`, multiply every `size:` by 2, with a **minimum of 32** (so projectiles don't go below scale 1). Concretely the mapping is: `8 → 32`, `16 → 32`, `32 → 64`, `48 → 96`. Apply to every recipe (hero, orb, fireball, arrow, and all enemies). Example: `hero: { ... size: 16, ... }` → `size: 32`; `warrior: { ... size: 32 ... }` → `size: 64`; `favilla: { ... size: 48 ... }` → `size: 96`; `orb: { ... size: 8 ... }` → `size: 32`.

> Why: with `DESIGN=32`, `scale = size/32`. A size below 32 yields scale < 1 (downscale), which drops pixels. Doubling keeps each sprite's on-texture proportion identical to today while the texture is now higher-resolution (the legacy parts auto-upscale ×2 to match). Visual output is unchanged this task; only the resolution headroom grows.

- [ ] **Step 6: Run the full suite (parity test forges every recipe at DESIGN=32)**

Run: `node --test`
Expected: PASS — `tests/sprites/recipes.test.js` forges every recipe without error.

- [ ] **Step 7: Visual smoke test**

Run: `python3 -m http.server 8000` and open `http://localhost:8000` (portrait). Confirm the game still renders sprites that look the same as before (just crisper headroom) — nothing broken or mis-placed.

- [ ] **Step 8: Commit**

```bash
git add src/systems/SpriteForge.js src/data/sprites/recipes.js tests/sprites/SpriteForge.test.js
git commit -m "feat(sprites): 32x32 design grid with per-part res upscale + per-part palettes"
```

---

## Task 2: Sizes / targeting — radius ×1.5, floor 16, split clamp

**Files:**
- Modify: `src/systems/EnemyBrain.js` (`buildSplitChildren`)
- Modify: `src/data/enemies/*.js` (every `radius:`)
- Test: `tests/EnemyBrain.test.js` (extend) and a new floor test

- [ ] **Step 1: Write the failing tests**

Append to `tests/EnemyBrain.test.js` (create if absent, importing the helper):
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSplitChildren } from '../src/systems/EnemyBrain.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

test('split children clamp radius to a floor of 16', () => {
  const parent = { hp: 40, radius: 18, modifiers: [{ type: 'splitsOnDeath', count: 2, spawnType: 'x' }] };
  const kids = buildSplitChildren(parent);
  assert.equal(kids.length, 2);
  for (const k of kids) assert.ok(k.radius >= 16, `radius ${k.radius} below floor`);
  // 18 * 0.7 = 12.6 -> would be 13, clamped up to 16
  assert.equal(kids[0].radius, 16);
});

test('split children keep ×0.7 when above the floor', () => {
  const parent = { hp: 100, radius: 30, modifiers: [{ type: 'splitsOnDeath', count: 1, spawnType: 'x' }] };
  const kids = buildSplitChildren(parent);
  assert.equal(kids[0].radius, 21); // round(30*0.7)
});

test('no enemy def has a radius below the floor of 16', () => {
  for (const [key, def] of Object.entries(ENEMY_TYPES)) {
    if (typeof def.radius === 'number') assert.ok(def.radius >= 16, `${key} radius ${def.radius} < 16`);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — split children not clamped; some enemy radii below 16.

- [ ] **Step 3: Clamp the split radius in `buildSplitChildren`**

In `src/systems/EnemyBrain.js`, change the child `radius` line:
```js
      radius: Math.round((def.radius ?? 16) * 0.7),
```
to:
```js
      radius: Math.max(16, Math.round((def.radius ?? 16) * 0.7)),
```

- [ ] **Step 4: Scale every enemy radius ×1.5 with a floor of 16**

In each file under `src/data/enemies/`, multiply every `radius:` value by 1.5, round, and floor at 16: `newRadius = Math.max(16, Math.round(oldRadius * 1.5))`. Apply this edit to every enemy/miniboss/levelboss/templeboss def (including the `mb`/`lb`/`tb` helpers in `src/data/regions.js` if they set `radius`). Example: a `radius: 11` → 17; `radius: 22` (miniboss) → 33; `radius: 10` → 16 (floored). Do NOT change any other field.

> Note: `regions.js` `mb/lb/tb` helpers (radius 22/28/32) → 33/42/48. Update those too.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS — clamp works; no def below 16.

- [ ] **Step 6: Full suite + visual smoke**

Run: `node --test` → PASS.
Run the game; confirm medusas and especially split medusa children are now clearly visible and the auto-aim/orbs connect with them.

- [ ] **Step 7: Commit**

```bash
git add src/systems/EnemyBrain.js src/data/enemies src/data/regions.js tests/EnemyBrain.test.js
git commit -m "feat(sprites): enemy radius x1.5 with a hard floor of 16 (split children clamped)"
```

---

## Task 3: New named palettes + BootScene per-part palette wiring

**Files:**
- Modify: `src/data/sprites/palettes.js`
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Add the hero palettes**

In `src/data/sprites/palettes.js`, extend `NAMED_PALETTES`:
```js
export const NAMED_PALETTES = {
  hero: derivePalette(0x4fc3f7, { accent: 0xffd54f }), // legacy; hero recipe moves to per-part palettes
  skin: derivePalette(0xf1c9a5, { shade: 0xd9a87f, outline: 0x7a4a32 }),
  redhair: derivePalette(0xc0392b, { highlight: 0xef6a3d, shade: 0x8e2a1e, outline: 0x511812 }),
  greengown: derivePalette(0x2e8b57, { highlight: 0x49bd7d, shade: 0x1f6b41, accent: 0xffd54f, outline: 0x123d26 }),
  gold: derivePalette(0xffd54f, { shade: 0xc79a2b, outline: 0x6b5310 }),
  orbblue: derivePalette(0x80d8ff, { highlight: 0xdff5ff, outline: 0x2a6a85 }),
  wood: derivePalette(0x6f4a2a, { outline: 0x3a2614 }),
};
```

- [ ] **Step 2: Wire a per-part palette resolver in BootScene and pass it to forge**

In `src/scenes/BootScene.js`, import the palette helpers and build a resolver. Change the import line for recipes/palettes to also bring in what's needed, and update the forge call. Replace the `buildSprites()` body's forge call:
```js
      const out = forge(recipe, PARTS, palette);
```
with a version that passes a resolver:
```js
      const out = forge(recipe, PARTS, palette, (ref) => resolvePartPalette(ref));
```
And add this helper method to the BootScene class (it resolves a part-ref's own palette, or null to use the recipe palette):
```js
  // A part-ref may name its own palette ({name, palette:'skin'}) or a base color
  // ({name, color:0x2e8b57, accent?:0x..}). Returns a 5-role palette or null.
  resolvePartPalette(ref) {
    if (typeof ref !== 'object') return null;
    if (ref.palette) {
      const p = NAMED_PALETTES[ref.palette];
      if (!p) throw new Error(`BootScene: unknown part palette '${ref.palette}'`);
      return p;
    }
    if (ref.color != null) return derivePalette(ref.color, ref.accent != null ? { accent: ref.accent } : {});
    return null;
  }
```
Ensure the top of `BootScene.js` imports `derivePalette` and `NAMED_PALETTES`:
```js
import { paletteFor } from '../data/sprites/recipes.js';
import { derivePalette, NAMED_PALETTES } from '../data/sprites/palettes.js';
```
(Keep the existing `paletteFor` import if already present; add the palettes import.)

- [ ] **Step 3: Verify parse + full suite**

Run: `node --check src/data/sprites/palettes.js && node --check src/scenes/BootScene.js`
Expected: exit 0.
Run: `node --test`
Expected: PASS (parity still green; no recipe uses the new palettes yet, so behavior is unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/data/sprites/palettes.js src/scenes/BootScene.js
git commit -m "feat(sprites): named hero palettes + per-part palette resolver in BootScene"
```

---

## Task 4: Hero — the redheaded princess (native res:32)

**Files:**
- Modify: `src/data/sprites/parts.js` (new princess parts)
- Modify: `src/data/sprites/recipes.js` (hero recipe)
- Test: `tests/sprites/recipes.test.js` (the hero-specific test, if it asserts old parts)

Reference: the approved mockup `.superpowers/brainstorm/*/content/hero-princess-v2.html` — redheaded princess, loose voluminous red hair, bare shoulders + visible arms (one on the staff, one free), green isosceles gown with a gold waistband (marked waist), fine features (brows/eyes/lips), staff with a blue orb.

- [ ] **Step 1: Author the princess parts at res:32 in parts.js**

Add these new parts (follow the Authoring protocol; each `res: 32`, with `down`/`up`/`side`). Silhouette + palette intent per part:
  - `body_gown` — bodice (shoulders ~y13) tapering to a cinched waist (~y17), then an isosceles skirt flaring to the hem (~y30). Use `b`/`s`/`h` for fold shading; a gold waistband row. Palette: `greengown` (its `accent` is gold). Lower rows centered so `legShift` sways the skirt.
  - `hair_long` — voluminous red hair: a rounded cap over the head plus long flowing locks down both sides past the shoulders, with `h` shine strands. Palette: `redhair`. Leaves a face window open.
  - `head_princess` — fine-featured head: skin oval, brows, eyes, lips. Palette: `skin` (eyes/brows via `outline`/`shade`).
  - `arm_staff` — right arm (skin) bent to hold the staff at the side.
  - `arm_free` — left arm (skin) hanging/slightly out (it will read as moving once Sub-project D adds per-frame swing).
  - Reuse `staff` (re-authored in Task 5/own wave) for the rod; add `orb_hero` if a distinct orb tip is wanted (palette `orbblue`).

- [ ] **Step 2: Rewrite the hero recipe with per-part palettes**

In `src/data/sprites/recipes.js`, replace the `hero` recipe:
```js
  hero: {
    archetype: 'hero', size: 32, anim: { idle: 2, walk: 2 }, fps: 5,
    parts: [
      { name: 'body_gown', palette: 'greengown' },
      { name: 'arm_free',  palette: 'skin' },
      { name: 'arm_staff', palette: 'skin' },
      { name: 'head_princess', palette: 'skin' },
      { name: 'hair_long', palette: 'redhair' },
      { name: 'staff',     palette: 'wood' },
    ],
  },
```
(Order matters — later parts draw on top. Hair after head so it frames the face; adjust if the face window needs hair behind it.) The witch hat is gone. There is no top-level `palette: 'hero'` anymore; each part carries its own.

- [ ] **Step 3: Update the hero test if it references old parts**

Open `tests/sprites/recipes.test.js`. If a test asserts the hero recipe contains `hat_witch` or forges against the `hero` named palette in a way that now differs, update it to assert the new parts forge and the princess palettes resolve (e.g. that the forged hero frame contains a `redhair` color and a `greengown` color). If the test only checks "hero forges without error," it needs no change.

- [ ] **Step 4: Verify parity + visual**

Run: `node --test`
Expected: PASS (hero forges; parity green).
Run the game; confirm the hero is the redheaded princess: green isosceles gown with gold waist, loose red hair, visible arms, staff. Walk shows skirt sway.

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): redheaded-princess hero (native 32, per-part palettes), drop witch hat"
```

---

## Tasks 5+: Roster redraw — per-archetype character design

> **REVISED APPROACH (2026-06-16).** The original "redraw shared parametric parts"
> plan was superseded after the first humanoid pass: generic shared parts read as
> flat blobs next to the princess hero. The agreed bar is **hero-level craft for
> every enemy**, achieved by treating each archetype as a designed character — a
> per-creature parametric generator (like `tools/gen-cultist.mjs`) emitting
> detailed multi-part `res:32` role grids, with **per-part palettes** so each
> creature mixes hues: the body/hood/armor takes the creature's **type color**
> (recipe palette, no override) while accents (shadow face, glowing eyes, staff,
> ember, shield) use named palettes. Recipes wire these via shared part-list
> constants (`CULT_*`, `KNIGHT*`, `JELLY`).

**Per-archetype workflow (repeat for each — DO NOT commit art without user approval):**
- [ ] Write `tools/gen-<archetype>.mjs` — emits the archetype's `res:32` parts.
- [ ] Preview live: emit a temp `_preview_*.js` module, dynamic-import it in the
  browser (cache-bust `?v=Date.now()`), forge representative creatures with their
  type colors + the per-part palette resolver, draw scaled, screenshot, **get user
  visual approval** (iterate). Remove the temp module when done.
- [ ] Splice parts into `parts.js`; add named palettes to `palettes.js`; add a
  shared part-list constant + wire the recipes in `recipes.js`.
- [ ] `node --test` (parity green) → commit (`feat(sprites): <archetype> archetype`).

**Status:**
- ✅ **Hooded cultist (fire)** — `gen-cultist.mjs`; `CULT_HOODED/_STAFF/_FACELESS`.
- ✅ **Hooded cultist (water/frost)** — `CULT_HOODED_WATER/_STAFF_WATER` (cyan eyes/orb).
- ✅ **Armored knight (sword + shield)** — `gen-warrior.mjs`; `KNIGHT/_WATER/_BANNER`.
- ✅ **Jellyfish / medusa** — `gen-jelly.mjs`; `JELLY` (medusa + medusa_cria).
- ✅ **Bare-headed mage/acolyte** — `gen-mage.mjs`; part-lists `VILLAGER`/
  `MAGE_MELEE`/`MAGE_DROWNED`/`MAGE_ARCHER`/`MAGE_CASTER`. Per-role design instead
  of one generic face: villager = shirt + trousers + short hair (NO robe/mitre),
  with 3 random hair colors per-instance via `Enemy.def.skins` (`villager`/`_blond`/
  `_black`); iniciado_veloz = robe+mitre+club; ahogado = drowned palette+mitre+fish;
  archer = robe+mitre+recurve bow (fires `TEX.arrow`); nayade/sacerdotisa = loose
  long hair to the waist + staff+orb (sacerdotisa black hair, no mitre). New palettes:
  `hair/blackhair/blondhair/pants/drownedskin/drownedhair/hollow/deadfish`.
- ✅ **Fire beasts** — `gen-beast.mjs`; part-lists `LARVA`/`SALAMANDRA`/`CAN_LAVA`/
  `COLOSO`. Per-creature silhouettes (not shared `body_beast`): larva = segmented
  molten grub; salamandra = top-down lizard + dorsal flame crest; can_lava =
  side-profile hound + filled ivory cow-horns; coloso = hunched brute + glowing
  chest core + bull-horns, `radius` 24→30 (miniboss-tank). New palette `bone`
  (filled ivory horns); cracks/crest/core reuse `ember`, eyes `glow`.
  NOTE: `tiburon_joven` is a fish (uses `body_fish`) — moved to the Fish checkpoint.
- ✅ **Blobs / elementals** — `gen-blob.mjs`; part-lists `CENIZA`/`FUEGO_ELEM`/`IMP`/
  `PEZ_GLOBO`/`BRASA`/`BURBUJA`. Per-creature (gelatinous-orb family): espiritu_ceniza
  = ash ghost w/ smoke tendrils RISING + hollow face; elemental_fuego = terrifying
  flame demon (jagged fire claws, V-scowl, fanged maw over white-hot core), `radius`
  21→26 (miniboss); imp_brasa = ember imp (horns + fanged grin); pez_globo = SIDE-
  profile pufferfish (head/eye + spikes + tail fin); brasa_errante = molten coal,
  no face; burbuja_gelida = ice bubble w/ sheen + frosty face. Body = type color;
  cores/cracks = `ember`/`glow`; ice sheen `orbblue`; eyes `glow`/`shadow`/`eyes_living`.
- ✅ **Winged / floating** — `gen-winged.mjs`; part-lists `FENIX`/`AVISPA`/`TOTEM_FIRE`/
  `TOTEM_FROST`. fenix_menor = phoenix (feathers fanning from shoulders + flame crest
  & tail); avispa_brasa = wasp (membrane wings + antennae + striped abdomen + stinger);
  totem_pira/totem_escarcha = a COLUMNAR totem pole (shared `totem_body`) with two
  stacked sculpted faces (recessed `shadow` cavities + glowing eyes: `glow` fire /
  `orbblue` frost). Body/wings = type color; crest/tail = `ember`; wasp wings = `bone`.
- ✅ **Fish / serpent / shelled** — `gen-aqua.mjs`; part-lists `SHARK`/`SERPIENTE`/
  `TORTUGA`/`CANGREJO`. tiburon_joven = side-profile shark (curved back / flat belly,
  dorsal swept back, heterocercal tail shorter than the dorsal, toothy jaw);
  serpiente_marina = S-curve serpent + fanged head; tortuga_acorazada = plated dome
  shell + head/flippers, recolored GREEN (new `COLORS.turtleGreen`); cangrejo_acorazado
  = wide carapace + 2 pincers + 4 leg pairs + eyestalks, recolored RED (new
  `COLORS.crabRed`). Body = type color; teeth/fangs = `bone`; eyes `shadow`/`glow`.
  (`tiburon_joven` lived here, not in beasts.)
- ✅ **Frog lineage** — `gen-frog.mjs`; part-lists `HUEVO`/`RENACUAJO`/`RANA`/
  `SAPO_ESCUPIDOR`/`SAPO_ADULTO`. huevo_sapo = frogspawn clump; renacuajo = fat body +
  finned paddle tail; rana_saltarina = small agile frog w/ FLEXED hind legs (shared
  `hindLeg` helper); sapo_escupidor = warty toad, open spitting mouth (own `toad_body`,
  radius 16→19, size 32→64); sapo_adulto = biggest fat tank toad, heavy brow (own
  `bigtoad_body`, radius 17→23). Sized/differentiated by stats. Body = type color;
  embryos/pupils/mouth = `shadow`.

**Remaining archetypes (each = generator + recipes + checkpoint):**
- **Bosses** (size 96 — full-grid detail, regal/monstrous silhouettes). Split into
  sub-batches:
  - ✅ **Fire sisters** — `gen-sisters.mjs`; part-lists `PYRA`/`VESTA`/`FAVILLA`. Three
    beautiful humanoid fire queens (princess-level detail: draped folds + GOLD trim via
    the recipe `accent`), differentiated by role — pyra=light gold plate + flame crown +
    red hair + fire orb; vesta=heavy banded plate + shield + steel hammer + black hair;
    favilla=slim gold robe + ornate crown + blonde hair + summoning embers. New `steel`
    palette; hair red/black/blond; flames/embers `glow`.
  - ✅ **Ignatius** (Fire King) — `gen-ignatius.mjs`; part-list `IGNATIUS`. Crowned
    patriarch (father of the sisters): gold crown, central fiery beard (ember), broad
    gold-trimmed fire armor, armored vambraces, flaming steel scepter, robe. Recipe
    gained `accent: 0xffd54f`.
  - ✅ **Water monsters** — `gen-waterboss.mjs`; part-lists `ICE_KNIGHT`/`SAPO_DESOV`/
    `TIBURON_ABISAL`/`KRAKEN`/`WHALE`. soldado_hielo=armored ice knight; sapo_desovador=
    giant spawner toad (flexed legs + egg sacs); tiburon_abisal=abyssal shark (gen-aqua
    model, dorsal swept back, solid peduncle); kraken=big mantle + huge eye + long
    independent tentacles; whale=hi-res whale (wired to `dama_ballena`; `KRAKEN` also
    wired to `dama_kraken`).
  - ⬜ Remaining (Dama del Lago forms): `dama_lago`, `dama_maga`, `dama_tiburon`,
    `dama_maga_final` (+ `dama_kraken`/`dama_ballena` already covered by reused bodies).
- ✅ **Projectiles** — `gen-proj.mjs`; re-authored `orb_body`/`flame_body`/`arrow_body`
  at res:32 (recipes unchanged): orb = glowing sphere + twinkle; fireball = teardrop
  comet (head at +x); arrow = sleek arrow (head at +x). fireball & arrow point along
  +x to match the pool's `setRotation(angle)`. Reads at 1:1 native size.

> Multi-session work. Each archetype lands independently; the game stays runnable
> throughout (un-migrated parts remain auto-upscaled to 32).

### Reusable preview harness (how each archetype was rendered for approval)

The browser caches ES modules, so previews **dynamic-import the source with a
cache-bust** and forge directly (the running game's BootScene is irrelevant). Steps:

1. Serve: `python3 -m http.server 8000`. Emit the generator output as a temp module:
   `{ echo "export const GEN = {"; node tools/gen-<arch>.mjs; echo "};"; } > src/data/sprites/_preview_<arch>.js`
2. In the browser (Playwright `browser_navigate` to `http://localhost:8000/index.html`,
   then `browser_evaluate`), run this — it forges the creatures and draws them scaled,
   then `browser_take_screenshot` to review:

```js
async () => {
  document.getElementById('preview')?.remove();
  const b = '?v=' + Date.now();
  const [SF, P, PAL, GENM] = await Promise.all([
    import('/src/systems/SpriteForge.js' + b), import('/src/data/sprites/parts.js' + b),
    import('/src/data/sprites/palettes.js' + b), import('/src/data/sprites/_preview_<arch>.js' + b),
  ]);
  const allParts = { ...P.PARTS, ...GENM.GEN };
  // map accent parts to named palettes; body parts (no entry) take the type color
  const P2 = { /* e.g. */ knight_visor: PAL.NAMED_PALETTES.shadow, knight_eyes: PAL.NAMED_PALETTES.glow };
  const resolver = (ref) => P2[ref.name] || null;
  const parts = ['part_a', 'part_b'].map(n => ({ name: n })); // back-to-front draw order
  const mk = (color) => SF.forge({ size: 32, anim: { idle: 1, walk: 1 }, parts }, allParts,
    PAL.derivePalette(color), resolver).anims['idle-down'][0];
  const list = [['fire', mk(0xd84315)], ['water', mk(0x4dd0e1)]];
  const S = 11, N = 32, gap = 12, cv = document.createElement('canvas'); cv.id = 'preview';
  cv.width = list.length * (N * S + gap); cv.height = N * S + 24;
  cv.style = 'position:fixed;top:8px;left:8px;z-index:99999;border:2px solid #888;background:#222';
  const ctx = cv.getContext('2d');
  list.forEach(([name, f], i) => { const ox = i * (N * S + gap);
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){ ctx.fillStyle=((x+y)&1)?'#3a3a3a':'#2b2b2b'; ctx.fillRect(ox+x*S,y*S,S,S);}
    for (let y=0;y<N;y++) for (let x=0;x<N;x++){ const c=f[y][x]; if(c==null)continue; ctx.fillStyle='#'+(c&0xffffff).toString(16).padStart(6,'0'); ctx.fillRect(ox+x*S,y*S,S,S);}
    ctx.fillStyle='#fff'; ctx.font='12px sans-serif'; ctx.fillText(name, ox+2, N*S+16); });
  document.body.appendChild(cv); return { ok: true };
}
```
> For `size: 64` creatures the frame is 64×64 — draw with `N = frame.length`, not 32,
> or you'll clip (this caused a bad knight commit; always preview the full frame).
3. After approval: splice parts into `parts.js` (append before the final `};`, or
   replace by a marker comment for re-do), add palettes, add a shared part-list const
   + wire recipes, `rm` the temp `_preview_*.js`, `node --test`, commit.

---

## Task 10: Final visual sweep + parity

**Files:** none (verification; may add small follow-up fixes)

- [ ] **Step 1: Confirm no part is still legacy (all res:32)**

Run: `grep -c "res: 32" src/data/sprites/parts.js` and compare against the part count (`grep -cE "^  [a-z_]+: \{" src/data/sprites/parts.js`). Every authored part should declare `res: 32`. List any without it; if a part was intentionally left legacy, note why in a comment.

- [ ] **Step 2: Full suite green (parity forges every recipe)**

Run: `node --test`
Expected: PASS, including `tests/sprites/recipes.test.js` (every recipe forges) and `tests/sprites/SpriteForge.test.js`.

- [ ] **Step 3: Browser smoke across regions**

Run the game; walk the hero (princess, skirt sway), enter fire and water levels, trigger a medusa split, reach a miniboss and a temple boss. Confirm every creature renders at native-32 quality, nothing is mis-anchored or mono-hued where it should be multi-hued, and small enemies are clearly targetable.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(sprites): final 32x32 redraw cleanups"
```

---

## Done criteria

- `DESIGN=32`; `node --test` green (SpriteForge unit tests + every-recipe parity).
- Every part authored at `res:32` (no legacy auto-upscaled parts remain in the final state).
- Hero is the redheaded princess (green isosceles gown, gold waist, loose red hair, visible arms, staff) with skirt-sway walk.
- Every enemy `def.radius` ×1.5 with a hard floor of 16; split children clamped to ≥16; medusas and split medusas clearly targetable.
- Per-part palettes enable multi-hue creatures; the game stayed runnable after every task.

## Out of scope (Sub-project D)

Per-frame arm swing, kraken whirlpool animation, lava-as-fire VFX, and any richer animation beyond the existing idle-bob + leg/skirt-sway model.
