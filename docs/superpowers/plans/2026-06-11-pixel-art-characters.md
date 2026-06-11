# Pixel-art de personajes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las texturas geométricas por personajes pixel-art reconocibles, animados y a 4 direcciones (héroe, todos los enemigos/bosses de fuego y agua, y los proyectiles), generados proceduralmente en `BootScene` desde *recetas de sprite paramétricas*, sin tocar la lógica de juego.

**Architecture:** Un núcleo PURO (`palettes` + `parts` + `SpriteForge`) compone, a partir de una librería de piezas reutilizables y una paleta de 5 roles, los frames (grids de color) de cada criatura para 3 direcciones (`down`/`up`/`side`, izquierda = `flipX`) con animaciones `idle`/`walk`. `BootScene` pinta esos frames a texturas y registra anims de Phaser; una capa fina de presentación (`FacingController`) en `Caster`/`Enemy`/`Boss` y en `ProjectilePool` elige dirección/rotación desde la velocidad. El combate, los brains y las fases no se tocan.

**Tech Stack:** Phaser 3 (CDN, sin build), ES modules nativos, `node:test` + `node:assert/strict` para la lógica pura.

**Convenciones del repo (recordatorio):**
- Tests: `node --test` (todos) o `node --test tests/X.test.js` (uno). Usan `node:test` + `node:assert/strict`.
- Módulos puros (sin `import` de Phaser): `src/systems/`, `src/data/`. Todo lo demás puede usar Phaser.
- Claves de textura y colores centralizados en `src/config.js` (`TEX`, `COLORS`) — nunca inline.
- Verificación visual: `python3 -m http.server 8000` y abrir en viewport móvil retrato.

**Encoding de pixel-art (usado en todo el plan):**
- Grid de diseño base **`DESIGN = 16`** (16×16). El tamaño final = `DESIGN * scale` con `scale ∈ {1,2,3}` → tamaños 16 (minions), 32 (grandes/minibosses), 48 (bosses).
- Una *pieza* (part) es un stamp con `{ w, h, anchor:{x,y}, down:[…], up:[…], side:[…] }`. Cada dirección es un array de `h` strings de `w` chars. Una dirección puede ser `null` → la pieza no se dibuja en esa dirección.
- Chars de rol: `.`=transparente, `o`=outline, `b`=base, `s`=shade, `h`=highlight, `a`=accent.
- `anchor` = posición top-left del stamp dentro del grid 16×16 (se permiten valores fuera de rango; se recorta).

---

## File Structure

**Crear (puro, sin Phaser):**
- `src/data/sprites/palettes.js` — helpers de color + `derivePalette` + paletas con nombre.
- `src/data/sprites/parts.js` — librería de piezas (stamps) + `PARTS` registry.
- `src/data/sprites/recipes.js` — `RECIPES` por `key` + `getRecipe`/`hasRecipe` + recetas (héroe, rosters, bosses, proyectiles).
- `src/systems/SpriteForge.js` — `forge(recipe, parts, palette)` (puro): compose/transform/scale/resolve.

**Crear (Phaser):**
- `src/objects/FacingController.js` — `pickFacing` (puro) + `FacingController` (toca anims).

**Modificar:**
- `src/config.js` — añadir `spriteKey(key)` y `frameKey(...)`.
- `src/scenes/BootScene.js` — añadir `buildSprites()`.
- `src/objects/Caster.js` — usar sprite del héroe + facing.
- `src/objects/Enemy.js` — usar sprite por-criatura con fallback + facing.
- `src/systems/ProjectilePool.js` — rotación/anim de proyectil en `fire()`.
- (`Boss.js` hereda de `Enemy`, no requiere cambios de sprite.)

**Tests (crear):**
- `tests/sprites/palettes.test.js`
- `tests/sprites/SpriteForge.test.js`
- `tests/sprites/recipes.test.js`
- `tests/sprites/FacingController.test.js`

---

## Phase 1 — Núcleo puro (sin cambio visible)

### Task 1: Paletas y helpers de color

**Files:**
- Create: `src/data/sprites/palettes.js`
- Test: `tests/sprites/palettes.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/sprites/palettes.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { darken, lighten, derivePalette, NAMED_PALETTES } from '../../src/data/sprites/palettes.js';

test('darken/lighten move toward black/white', () => {
  assert.ok(darken(0x808080, 0.5) < 0x808080);
  assert.ok(lighten(0x808080, 0.5) > 0x808080);
  assert.equal(darken(0xffffff, 1), 0x000000);
  assert.equal(lighten(0x000000, 1), 0xffffff);
});

test('derivePalette returns 5 concrete roles', () => {
  const p = derivePalette(0x4fc3f7);
  for (const role of ['outline', 'base', 'shade', 'highlight', 'accent']) {
    assert.equal(typeof p[role], 'number', `${role} must be a number`);
    assert.ok(p[role] >= 0 && p[role] <= 0xffffff);
  }
  assert.equal(p.base, 0x4fc3f7);
  assert.ok(p.shade < p.base || (p.shade & 0xff) <= (p.base & 0xff));
});

test('derivePalette honors overrides', () => {
  const p = derivePalette(0x4fc3f7, { accent: 0xff0000 });
  assert.equal(p.accent, 0xff0000);
});

test('NAMED_PALETTES.hero exists and is full', () => {
  assert.ok(NAMED_PALETTES.hero);
  assert.equal(typeof NAMED_PALETTES.hero.outline, 'number');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/palettes.test.js`
Expected: FAIL (cannot find module `palettes.js`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/data/sprites/palettes.js
// PURE. Color = integer 0xRRGGBB. A palette has 5 roles.

function clamp8(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function toRGB(c) { return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 }; }
function fromRGB(r, g, b) { return (clamp8(r) << 16) | (clamp8(g) << 8) | clamp8(b); }

function mix(c1, c2, t) {
  const a = toRGB(c1), b = toRGB(c2);
  return fromRGB(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

export function darken(c, t) { return mix(c, 0x000000, t); }
export function lighten(c, t) { return mix(c, 0xffffff, t); }

// Build a 5-role palette from one base color; overrides win.
export function derivePalette(base, overrides = {}) {
  return {
    outline: overrides.outline ?? mix(base, 0x000000, 0.78),
    base: overrides.base ?? base,
    shade: overrides.shade ?? mix(base, 0x000000, 0.40),
    highlight: overrides.highlight ?? mix(base, 0xffffff, 0.38),
    accent: overrides.accent ?? mix(base, 0xffffff, 0.60),
  };
}

// Named palettes for special characters (hero, bosses) override the auto-derived one.
export const NAMED_PALETTES = {
  hero: derivePalette(0x4fc3f7, { accent: 0xffd54f }), // light blue robe, gold accent
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/palettes.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/palettes.js tests/sprites/palettes.test.js
git commit -m "feat(sprites): color helpers + derivePalette (5-role palettes)"
```

---

### Task 2: Librería de piezas (formato + piezas base del héroe)

**Files:**
- Create: `src/data/sprites/parts.js`
- Test: `tests/sprites/parts.test.js`

Esta tarea fija el **formato** y crea las piezas que necesita el héroe (Task 8). Las piezas de cada roster se añaden en sus tareas (11–14) siguiendo este mismo formato.

- [ ] **Step 1: Write the failing test**

```js
// tests/sprites/parts.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTS } from '../../src/data/sprites/parts.js';

const ROLE_CHARS = new Set(['.', 'o', 'b', 's', 'h', 'a']);

test('every part has w/h/anchor and at least the down direction', () => {
  for (const [name, p] of Object.entries(PARTS)) {
    assert.equal(typeof p.w, 'number', `${name}.w`);
    assert.equal(typeof p.h, 'number', `${name}.h`);
    assert.ok(p.anchor && typeof p.anchor.x === 'number' && typeof p.anchor.y === 'number', `${name}.anchor`);
    assert.ok(Array.isArray(p.down), `${name}.down must be an array`);
  }
});

test('each direction grid matches declared w/h and uses only role chars', () => {
  for (const [name, p] of Object.entries(PARTS)) {
    for (const dir of ['down', 'up', 'side']) {
      const rows = p[dir];
      if (rows == null) continue; // direction intentionally skipped
      assert.equal(rows.length, p.h, `${name}.${dir} row count`);
      for (const row of rows) {
        assert.equal(row.length, p.w, `${name}.${dir} row width`);
        for (const ch of row) assert.ok(ROLE_CHARS.has(ch), `${name}.${dir} bad char '${ch}'`);
      }
    }
  }
});

test('hero parts are present', () => {
  for (const n of ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff']) {
    assert.ok(PARTS[n], `missing part ${n}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/parts.test.js`
Expected: FAIL (cannot find module `parts.js`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/data/sprites/parts.js
// PURE. Each part is a stamp on a 16x16 design grid.
// Chars: '.'=transparent o=outline b=base s=shade h=highlight a=accent
// A direction set to null means the part is not drawn for that facing.

export const PARTS = {
  // Lower-body robe (humanoid). Bottom 3 rows are the "leg region" that walk-animates.
  body_robe: {
    w: 10, h: 9, anchor: { x: 3, y: 6 },
    down: [
      '...oooo...',
      '..obbbbo..',
      '..obhhbo..',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbbo.',
      '.obssssbo.',
      '.obs..sbo.',
      '.oo....oo.',
    ],
    up: [
      '...oooo...',
      '..obbbbo..',
      '..obbbbo..',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbbo.',
      '.obssssbo.',
      '.obs..sbo.',
      '.oo....oo.',
    ],
    side: [
      '...ooo....',
      '..obbbo...',
      '..obhbo...',
      '..obbbo...',
      '..obbbo...',
      '..obbbbo..',
      '..obssbo..',
      '..obs.bo..',
      '..oo..oo..',
    ],
  },
  // Round head. up = back of head (no face).
  head_round: {
    w: 6, h: 5, anchor: { x: 5, y: 2 },
    down: ['.oooo.', 'obbbbo', 'obhbbo', 'obbbbo', '.oooo.'],
    up: ['.oooo.', 'obbbbo', 'obbbbo', 'obbbbo', '.oooo.'],
    side: ['.oooo.', 'obbbbo', 'obbbho', 'obbbbo', '.oooo.'],
  },
  // Eyes overlay on the face. No eyes on the back (up = null).
  eyes_dots: {
    w: 6, h: 2, anchor: { x: 5, y: 4 },
    down: ['.o..o.', '......'],
    up: null,
    side: ['....o.', '......'],
  },
  // Witch hat (accent-colored).
  hat_witch: {
    w: 8, h: 5, anchor: { x: 4, y: 0 },
    down: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
    up: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
    side: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
  },
  // Staff held on the side only.
  staff: {
    w: 2, h: 11, anchor: { x: 12, y: 3 },
    down: null,
    up: null,
    side: ['aa', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo'],
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/parts.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/parts.js tests/sprites/parts.test.js
git commit -m "feat(sprites): parts library format + hero parts"
```

---

### Task 3: SpriteForge (composición → direcciones → frames → escala → color)

**Files:**
- Create: `src/systems/SpriteForge.js`
- Test: `tests/sprites/SpriteForge.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/sprites/SpriteForge.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forge, composeGrid, DESIGN } from '../../src/systems/SpriteForge.js';

const PARTS = {
  block: {
    w: 4, h: 4, anchor: { x: 6, y: 6 },
    down: ['bbbb', 'bbbb', 'bbbb', 'bbbb'],
    up: ['oooo', 'oooo', 'oooo', 'oooo'],   // back differs from front
    side: ['bbbb', 'bbbb', 'bsbb', 'bbbb'],
  },
};
const PALETTE = { outline: 0x111111, base: 0x4444ff, shade: 0x2222aa, highlight: 0x8888ff, accent: 0xffff00 };

test('composeGrid stamps a part onto a 16x16 role grid', () => {
  const g = composeGrid({ parts: ['block'] }, PARTS, 'down');
  assert.equal(g.length, DESIGN);
  assert.equal(g[0].length, DESIGN);
  assert.equal(g[6][6], 'b');
  assert.equal(g[0][0], '.');
});

test('forge returns 6 anims with correct frame counts and color grids', () => {
  const out = forge({ size: 16, parts: ['block'], anim: { idle: 2, walk: 2 } }, PARTS, PALETTE);
  assert.equal(out.size, 16);
  for (const key of ['idle-down', 'idle-up', 'idle-side', 'walk-down', 'walk-up', 'walk-side']) {
    assert.ok(out.anims[key], `missing ${key}`);
  }
  assert.equal(out.anims['idle-down'].length, 2);
  assert.equal(out.anims['walk-down'].length, 2);
  const frame = out.anims['idle-down'][0];
  assert.equal(frame.length, 16);
  assert.equal(frame[0].length, 16);
  assert.equal(frame[6][6], PALETTE.base); // role 'b' resolved to base color
  assert.equal(frame[0][0], null);         // transparent
});

test('up (back) differs from down, and walk frames differ', () => {
  const out = forge({ size: 16, parts: ['block'], anim: { idle: 1, walk: 2 } }, PARTS, PALETTE);
  assert.notDeepEqual(out.anims['idle-up'][0], out.anims['idle-down'][0]);
  assert.notDeepEqual(out.anims['walk-down'][0], out.anims['walk-down'][1]);
});

test('scale produces a larger grid (size 32 = 2x)', () => {
  const out = forge({ size: 32, parts: ['block'], anim: { idle: 1, walk: 1 } }, PARTS, PALETTE);
  assert.equal(out.size, 32);
  assert.equal(out.anims['idle-down'][0].length, 32);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: FAIL (cannot find module `SpriteForge.js`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/SpriteForge.js
// PURE. Forge a recipe + parts + palette into color-grid frames per anim/direction.

export const DESIGN = 16;
const ROLE_MAP = { o: 'outline', b: 'base', s: 'shade', h: 'highlight', a: 'accent' };
const DIRS = ['down', 'up', 'side'];

function emptyGrid() {
  return Array.from({ length: DESIGN }, () => new Array(DESIGN).fill('.'));
}

// Stamp every part of a recipe onto a DESIGN x DESIGN grid of role chars.
export function composeGrid(recipe, parts, dir) {
  const g = emptyGrid();
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    const rows = part[dir];
    if (rows == null) continue;
    const ax = (typeof ref === 'object' && ref.x != null) ? ref.x : part.anchor.x;
    const ay = (typeof ref === 'object' && ref.y != null) ? ref.y : part.anchor.y;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        const y = ay + r, x = ax + c;
        if (y < 0 || y >= DESIGN || x < 0 || x >= DESIGN) continue;
        g[y][x] = ch;
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

// Shift only the bottom 3 rows (leg region) horizontally — the walk step.
function legShift(grid, dx) {
  const out = grid.map((row) => row.slice());
  for (let y = DESIGN - 3; y < DESIGN; y++) {
    const row = new Array(DESIGN).fill('.');
    for (let x = 0; x < DESIGN; x++) {
      const nx = x + dx;
      if (nx < 0 || nx >= DESIGN) continue;
      row[nx] = grid[y][x];
    }
    out[y] = row;
  }
  return out;
}

function idleFrames(base, count) {
  const frames = [base, shiftV(base, 1)];     // frame 1 = subtle 1px bob down
  return padFrames(frames, count, base);
}

function walkFrames(base, count) {
  const frames = [legShift(base, -1), legShift(base, 1)];
  return padFrames(frames, count, base);
}

function padFrames(frames, count, fallback) {
  if (count <= frames.length) return frames.slice(0, Math.max(1, count));
  const out = frames.slice();
  while (out.length < count) out.push(fallback);
  return out;
}

function resolve(grid, palette) {
  return grid.map((row) => row.map((ch) => (ch === '.' ? null : palette[ROLE_MAP[ch]])));
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

export function forge(recipe, parts, palette) {
  const scale = recipe.scale ?? (recipe.size ? recipe.size / DESIGN : 1);
  const anim = recipe.anim ?? { idle: 2, walk: 2 };
  const anims = {};
  for (const dir of DIRS) {
    const base = composeGrid(recipe, parts, dir);
    const sets = { idle: idleFrames(base, anim.idle ?? 2), walk: walkFrames(base, anim.walk ?? 2) };
    for (const state of ['idle', 'walk']) {
      anims[`${state}-${dir}`] = sets[state].map((g) => scaleGrid(resolve(g, palette), scale));
    }
  }
  return { size: DESIGN * scale, fps: recipe.fps ?? 5, anims };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/systems/SpriteForge.js tests/sprites/SpriteForge.test.js
git commit -m "feat(sprites): SpriteForge compose/direction/anim/scale/resolve (pure)"
```

---

### Task 4: Registro de recetas + receta del héroe

**Files:**
- Create: `src/data/sprites/recipes.js`
- Test: `tests/sprites/recipes.test.js`

`recipes.js` resuelve la paleta de cada criatura: usa `NAMED_PALETTES[name]` si la receta nombra una, si no `derivePalette(baseColor)`. Para enemigos/bosses el `baseColor` lo aportará quien construye el sprite (Task 7) desde `def.color`; la receta solo guarda `archetype/size/parts/anim/palette?/accent?`.

- [ ] **Step 1: Write the failing test**

```js
// tests/sprites/recipes.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, getRecipe, hasRecipe, paletteFor } from '../../src/data/sprites/recipes.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { forge } from '../../src/systems/SpriteForge.js';

test('hero recipe exists and references only known parts', () => {
  assert.ok(hasRecipe('hero'));
  const r = getRecipe('hero');
  for (const ref of r.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    assert.ok(PARTS[name], `hero references unknown part ${name}`);
  }
});

test('every recipe references only parts that exist (integrity)', () => {
  for (const [key, r] of Object.entries(RECIPES)) {
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});

test('paletteFor uses named palette for hero', () => {
  const p = paletteFor('hero', 0x000000);
  assert.equal(typeof p.outline, 'number');
});

test('hero forges without throwing', () => {
  const r = getRecipe('hero');
  const out = forge(r, PARTS, paletteFor('hero', 0x4fc3f7));
  assert.ok(out.anims['idle-down']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL (cannot find module `recipes.js`).

- [ ] **Step 3: Write minimal implementation**

```js
// src/data/sprites/recipes.js
// PURE. Per-creature sprite recipes. key -> { archetype, size, parts, anim, palette?, accent? }
import { derivePalette, NAMED_PALETTES } from './palettes.js';

export const RECIPES = {
  hero: {
    archetype: 'hero', size: 16, palette: 'hero', anim: { idle: 2, walk: 2 }, fps: 5,
    parts: ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff'],
  },
};

export function hasRecipe(key) { return Object.prototype.hasOwnProperty.call(RECIPES, key); }
export function getRecipe(key) { return RECIPES[key]; }

// Resolve a 5-role palette: named palette wins, else derive from the creature's base color.
export function paletteFor(key, baseColor) {
  const r = RECIPES[key];
  if (r && r.palette && NAMED_PALETTES[r.palette]) return NAMED_PALETTES[r.palette];
  return derivePalette(baseColor ?? 0x888888, r && r.accent ? { accent: r.accent } : {});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): recipe registry + hero recipe + paletteFor"
```

---

## Phase 2 — Integración + héroe (primer resultado visible)

### Task 5: Helpers de clave en config

**Files:**
- Modify: `src/config.js` (al final del archivo)

- [ ] **Step 1: Add the key helpers**

Añadir al final de `src/config.js`:

```js
// Per-creature sprite texture keys. Base texture = idle-down frame 0.
export function spriteKey(key) { return `spr_${key}`; }
export function frameKey(key, anim, i) { return `spr_${key}__${anim}__${i}`; }
```

- [ ] **Step 2: Verify it parses**

Run: `node -e "import('./src/config.js').then(m => console.log(m.spriteKey('hero'), m.frameKey('hero','idle-down',0)))"`
Expected: prints `spr_hero spr_hero__idle-down__0`

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(sprites): spriteKey/frameKey helpers in config"
```

---

### Task 6: FacingController (pickFacing puro + controller)

**Files:**
- Create: `src/objects/FacingController.js`
- Test: `tests/sprites/FacingController.test.js`

`pickFacing` es pura y testeable; `FacingController` envuelve un sprite y reproduce la anim (toca Phaser, no se testea).

- [ ] **Step 1: Write the failing test**

```js
// tests/sprites/FacingController.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickFacing } from '../../src/objects/FacingController.js';

test('horizontal dominant -> side, flip when moving left', () => {
  assert.deepEqual(pickFacing(100, 10, 'down'), { dir: 'side', flipX: false });
  assert.deepEqual(pickFacing(-100, 10, 'down'), { dir: 'side', flipX: true });
});

test('vertical dominant -> up/down, never flips', () => {
  assert.deepEqual(pickFacing(10, -100, 'side'), { dir: 'up', flipX: false });
  assert.deepEqual(pickFacing(10, 100, 'side'), { dir: 'down', flipX: false });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sprites/FacingController.test.js`
Expected: FAIL (cannot find module).

- [ ] **Step 3: Write minimal implementation**

```js
// src/objects/FacingController.js
// pickFacing is PURE. FacingController touches Phaser anims (not unit-tested).

export function pickFacing(vx, vy, lastDir = 'down') {
  if (Math.abs(vx) > Math.abs(vy)) return { dir: 'side', flipX: vx < 0 };
  return { dir: vy < 0 ? 'up' : 'down', flipX: false };
}

const MOVE_EPS = 6; // px/s below which we treat the entity as idle

export class FacingController {
  // sprite: a Phaser sprite. key: the creature key (anim keys are `${key}-${state}-${dir}`).
  constructor(sprite, key, lastDir = 'down') {
    this.sprite = sprite;
    this.key = key;
    this.lastDir = lastDir;
  }

  // Call every frame. aim is an optional {x,y} world point to face when idle (hero auto-aim).
  update(vx, vy, aim) {
    const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
    let f;
    if (moving) {
      f = pickFacing(vx, vy, this.lastDir);
    } else if (aim) {
      f = pickFacing(aim.x - this.sprite.x, aim.y - this.sprite.y, this.lastDir);
    } else {
      f = { dir: this.lastDir, flipX: this.sprite.flipX };
    }
    this.lastDir = f.dir;
    this.sprite.setFlipX(f.flipX);
    const state = moving ? 'walk' : 'idle';
    this.sprite.anims.play(`${this.key}-${state}-${f.dir}`, true);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sprites/FacingController.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/objects/FacingController.js tests/sprites/FacingController.test.js
git commit -m "feat(sprites): FacingController + pure pickFacing"
```

---

### Task 7: BootScene.buildSprites (pintar frames + registrar anims)

**Files:**
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Add a sprite builder and call it from create()**

En `src/scenes/BootScene.js`, añadir imports arriba:

```js
import { COLORS, TEX, spriteKey, frameKey } from '../config.js';
import { RECIPES, paletteFor } from '../data/sprites/recipes.js';
import { PARTS } from '../data/sprites/parts.js';
import { forge } from '../systems/SpriteForge.js';
```

En `create()`, antes de `this.scene.start('Menu');`, añadir:

```js
    this.buildSprites();
```

Añadir el método (las paletas de enemigos se derivan del `color` del def; aquí el héroe usa su paleta nombrada, y para el resto pasamos el `color` que la receta conozca por `accent`, o un gris por defecto — Task 8/11+ pasarán el color real al construir. Para BootScene generamos con el color de `COLORS` cuando exista una correspondencia simple; en la práctica el color por-criatura llega vía `def.color` y aquí solo necesitamos un sprite base correcto en forma. Usamos `paletteFor(key, baseColor)` con el color que la receta declare o un fallback):

```js
  buildSprites() {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      const baseColor = recipe.baseColor ?? COLORS.caster; // hero uses named palette anyway
      const palette = paletteFor(key, baseColor);
      const out = forge(recipe, PARTS, palette);
      this.paintForged(key, out);
    }
  }

  // Paint every frame to its own texture, register one anim per `${key}-${animName}`,
  // and register the base texture spriteKey(key) = idle-down frame 0.
  paintForged(key, out) {
    for (const [animName, frames] of Object.entries(out.anims)) {
      const frameKeys = [];
      for (let i = 0; i < frames.length; i++) {
        const tkey = frameKey(key, animName, i);
        this.paintGrid(tkey, frames[i]);
        frameKeys.push({ key: tkey });
      }
      this.anims.create({
        key: `${key}-${animName}`,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: -1,
      });
    }
    // Base texture for object constructors.
    this.paintGrid(spriteKey(key), out.anims['idle-down'][0]);
  }

  // grid = 2D array of color ints or null (transparent).
  paintGrid(texKey, grid) {
    const g = this.add.graphics();
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const c = grid[y][x];
        if (c == null) continue;
        g.fillStyle(c, 1);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.generateTexture(texKey, grid[0].length, grid.length);
    g.destroy();
  }
```

- [ ] **Step 2: Verify the game boots without errors**

Run: `python3 -m http.server 8000` y abrir `http://localhost:8000` en viewport móvil retrato.
Expected: la consola del navegador no muestra errores; el menú carga. (Aún no se ve el héroe nuevo hasta Task 8.)

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.js
git commit -m "feat(sprites): BootScene paints forged frames + registers anims"
```

---

### Task 8: Héroe usa su sprite + facing

**Files:**
- Modify: `src/objects/Caster.js`

- [ ] **Step 1: Wire the hero sprite and facing**

Reescribir `src/objects/Caster.js`:

```js
import { TEX, spriteKey } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';
import { FacingController } from './FacingController.js';

export default class Caster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    const useSprite = hasRecipe('hero');
    super(scene, x, y, useSprite ? spriteKey('hero') : TEX.caster);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.stats = stats;
    this.hp = stats.maxHealth;
    this.maxHp = stats.maxHealth;
    this._shotTimer = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this._aimTarget = null;
    this.facing = useSprite ? new FacingController(this, 'hero') : null;
    if (useSprite) this.setDisplaySize(32, 32); // hero visual footprint ~ old radius 16
  }

  moveBy(vector) {
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    this.setVelocity(vector.x * this.stats.moveSpeed * mul, vector.y * this.stats.moveSpeed * mul);
  }

  updateAutoAim(time, delta, enemies, onFire) {
    this._shotTimer -= delta;
    const target = this.nearestEnemy(enemies);
    this._aimTarget = target ? { x: target.x, y: target.y } : null;
    if (this._shotTimer > 0) return;
    if (!target) return;
    this._shotTimer = this.stats.shotRate;
    onFire(target);
  }

  nearestEnemy(enemies) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.facing) this.facing.update(this.body.velocity.x, this.body.velocity.y, this._aimTarget);
  }
}
```

- [ ] **Step 2: Verify the hero renders and animates**

Run: `python3 -m http.server 8000`, abrir un nivel.
Expected: la heroína se ve como bruja pixel (túnica + sombrero + báculo), camina con animación, encara arriba/abajo/lados al moverse y mira al enemigo al disparar quieta. El hitbox/colisiones se sienten igual que antes.

- [ ] **Step 3: Run the pure tests (no regressions)**

Run: `node --test`
Expected: PASS (todos los tests, incluidos los de sprites).

- [ ] **Step 4: Commit**

```bash
git add src/objects/Caster.js
git commit -m "feat(sprites): hero renders pixel-art sprite with 4-dir facing"
```

---

### Task 9: Enemigos/bosses usan sprite por-criatura con fallback + facing

**Files:**
- Modify: `src/objects/Enemy.js`

`Boss` extiende `Enemy`, así que hereda el cambio. Si una criatura aún no tiene receta, cae al comportamiento actual (forma compartida + tinte).

- [ ] **Step 1: Choose sprite or fallback in the constructor and add facing**

En `src/objects/Enemy.js`, cambiar imports y constructor.

Imports (añadir):

```js
import { spriteKey } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';
import { FacingController } from './FacingController.js';
```

Reemplazar el constructor (líneas que hoy hacen `super(scene, x, y, def.tex)` y `if (def.color) this.setTint(def.color)`):

```js
  constructor(scene, x, y, def) {
    const useSprite = hasRecipe(def.key);
    super(scene, x, y, useSprite ? spriteKey(def.key) : def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    if (useSprite) {
      const px = def.radius * 2;
      this.setDisplaySize(px, px); // visual footprint ~ old circle diameter; physics body unchanged
      this.facing = new FacingController(this, def.key);
    } else {
      if (def.color) this.setTint(def.color);
      this.facing = null;
    }
    this.freezeRemaining = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.burnRemaining = 0;
    this.burnDps = 0;
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})), boss: {} };
    this._formSeq = null;
  }
```

Añadir al final de la clase (después de `think`):

```js
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.facing && this.body) this.facing.update(this.body.velocity.x, this.body.velocity.y);
  }
```

- [ ] **Step 2: Verify fallback (no recipes yet for enemies) still works**

Run: `python3 -m http.server 8000`, jugar un nivel de fuego.
Expected: los enemigos siguen viéndose como antes (forma+tinte) porque aún no tienen receta — el juego no se rompe. El héroe sí es pixel-art.

- [ ] **Step 3: Run the pure tests**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/objects/Enemy.js
git commit -m "feat(sprites): Enemy/Boss use per-creature sprite with fallback + facing"
```

---

## Phase 3 — Proyectiles

### Task 10: Recetas de proyectil + rotación/anim en ProjectilePool

**Files:**
- Modify: `src/data/sprites/parts.js` (añadir piezas de proyectil)
- Modify: `src/data/sprites/recipes.js` (añadir recetas `orb`/`fireball`/`arrow`)
- Modify: `src/systems/ProjectilePool.js`
- Test: `tests/sprites/recipes.test.js` (añadir aserciones)

Los proyectiles usan recetas de un solo "cuerpo" radial; no necesitan sets direccionales. `fireball`/`arrow` rotan hacia la velocidad; `orb` solo hace twinkle.

- [ ] **Step 1: Add the failing test (projectile recipes exist and forge)**

Añadir a `tests/sprites/recipes.test.js`:

```js
test('projectile recipes exist and forge', () => {
  for (const k of ['orb', 'fireball', 'arrow']) {
    assert.ok(hasRecipe(k), `missing projectile recipe ${k}`);
    const out = forge(getRecipe(k), PARTS, paletteFor(k, 0x80d8ff));
    assert.ok(out.anims['idle-down']);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL (`missing projectile recipe orb`).

- [ ] **Step 3: Add projectile parts**

Añadir a `PARTS` en `src/data/sprites/parts.js`:

```js
  // --- Projectile bodies (radial; only 'down' used) ---
  orb_body: {
    w: 6, h: 6, anchor: { x: 5, y: 5 },
    down: ['.hbbh.', 'hbbbbh', 'bbsbbb', 'bbbsbb', 'hbbbbh', '.hbbh.'],
    up: null, side: null,
  },
  flame_body: {
    w: 8, h: 8, anchor: { x: 4, y: 4 },
    down: ['...aa...', '..ahha..', '.ahhhha.', 'ahhbbhha', 'ahbbbbha', '.abbbba.', '..asba..', '...oo...'],
    up: null, side: null,
  },
  arrow_body: {
    w: 10, h: 4, anchor: { x: 3, y: 6 },
    down: ['o.........', 'ahhhhhhbbo', 'ahhhhhhbbo', 'o.........'],
    up: null, side: null,
  },
```

- [ ] **Step 4: Add projectile recipes**

Añadir a `RECIPES` en `src/data/sprites/recipes.js` (con `baseColor` para que BootScene los pinte con su color propio):

```js
  orb: { archetype: 'projectile', size: 8, baseColor: 0x80d8ff, anim: { idle: 2, walk: 1 }, fps: 8, parts: ['orb_body'] },
  fireball: { archetype: 'projectile', size: 16, baseColor: 0xff7043, anim: { idle: 3, walk: 1 }, fps: 10, parts: ['flame_body'] },
  arrow: { archetype: 'projectile', size: 16, baseColor: 0xfff176, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['arrow_body'] },
```

Nota: `orb`/`fireball` reproducen su anim `idle-down` (twinkle/flicker) en `fire()`. `arrow` es 1 frame. `baseColor` lo lee `BootScene.buildSprites` (ya implementado: `recipe.baseColor ?? COLORS.caster`).

- [ ] **Step 5: Run recipe test to verify it passes**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 6: Wire rotation + anim into ProjectilePool.fire**

En `src/systems/ProjectilePool.js`, mapear `texKey` (que hoy es `TEX.orb/fireball/arrow`) a la criatura y su sprite. Añadir arriba:

```js
import { TEX, spriteKey } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';

const PROJECTILE_KEY = { [TEX.orb]: 'orb', [TEX.fireball]: 'fireball', [TEX.arrow]: 'arrow' };
```

En `fire()`, sustituir la creación/seteo de textura y, tras `p.setVelocity(...)`, aplicar el visual. Cuerpo de `fire()` actualizado:

```js
  fire(texKey, x, y, targetX, targetY, speed, damage, radius) {
    const sprKey = PROJECTILE_KEY[texKey];
    const useSprite = sprKey && hasRecipe(sprKey);
    const drawKey = useSprite ? spriteKey(sprKey) : texKey;

    let p = this.group.getFirstDead(false);
    if (!p) {
      p = this.group.create(x, y, drawKey);
    } else {
      p.setTexture(drawKey);
      p.enableBody(true, x, y, true, true);
    }
    p.setActive(true).setVisible(true);
    p.damage = damage;
    p.aoeRadius = radius || 0;
    p.burnDps = 0;
    p.burnMs = 0;
    p.homing = false;
    p.homingLife = 0;
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (useSprite) {
      p.setRotation(0);
      if (sprKey === 'orb' || sprKey === 'fireball') p.anims.play(`${sprKey}-idle-down`, true);
      if (sprKey === 'fireball' || sprKey === 'arrow') p.setRotation(angle);
    } else {
      p.setRotation(0);
    }
    return p;
  }
```

- [ ] **Step 7: Verify projectiles visually**

Run: `python3 -m http.server 8000`, jugar: disparar orbe básico y fireball; provocar disparos de arquero enemigo (flecha).
Expected: el orbe centellea; la fireball es una llama que rota en su trayectoria; la flecha apunta en su dirección. El daño/colisiones funcionan igual.

- [ ] **Step 8: Run full tests**

Run: `node --test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js src/systems/ProjectilePool.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): pixel-art projectiles (orb twinkle, fireball/arrow rotate)"
```

---

## Phase 4 — Roll-out de contenido (recetas + piezas)

> **Patrón de cada tarea de roster:** (1) añadir las **piezas** nuevas que el grupo necesita a `parts.js` siguiendo el formato de Task 2 (cada pieza pasa el test de integridad de `parts.test.js` automáticamente); (2) añadir una **receta por criatura** a `RECIPES` (`archetype/size/parts/anim`; la paleta se deriva de `def.color` en runtime, así que la receta no fija color salvo `accent` opcional); (3) extender `recipes.test.js` con una aserción de cobertura del grupo; (4) verificar visualmente; (5) commit.
>
> Tamaños por `radius`: `radius ≤ 9` → `size 16`; `10–13` → `size 32` (scale 2); `≥ 14` (minibosses/elementales) → `size 32`; bosses → `size 48` (scale 3).
>
> Las piezas nuevas son **contenido artístico** autoría del implementador, con dos puertas de aceptación: el test de integridad/forma de `parts.test.js` (dimensiones y chars válidos) y la verificación visual en el juego. No son placeholders: cada una se entrega como matrices reales en el formato definido.

### Task 11: Roster de fuego (cultistas + bestias + invocados)

**Files:**
- Modify: `src/data/sprites/parts.js`
- Modify: `src/data/sprites/recipes.js`
- Test: `tests/sprites/recipes.test.js`

Criaturas (de `src/data/enemies/` fuego): `acolito_brasa, lanzabrasas, iniciado_veloz, piromante, encapuchado_pira, pirovidente, caballero_brasa, sacerdote_llama, portaestandarte, larva_magma, salamandra, espiritu_ceniza, can_lava, elemental_fuego, coloso_magma, fenix_menor, imp_brasa, avispa_brasa, totem_pira, brasa_errante`.

- [ ] **Step 1: Add the failing coverage test**

Añadir a `tests/sprites/recipes.test.js`:

```js
import { FIRE_ENEMIES } from '../../src/data/enemies/fire.js';

test('every fire enemy has a recipe with known parts', () => {
  for (const key of Object.keys(FIRE_ENEMIES)) {
    assert.ok(hasRecipe(key), `fire enemy '${key}' has no sprite recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

> Nota: si el archivo de fuego exporta con otro nombre/ruta, ajustar el import; comprobar con `grep -n "export" src/data/enemies/fire.js`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL (`fire enemy 'acolito_brasa' has no sprite recipe`).

- [ ] **Step 3: Add the parts this group needs**

Añadir a `PARTS` en `parts.js` las piezas reutilizables del roster de fuego (matrices reales, formato Task 2). Conjunto mínimo a autoría:
- Cuerpos: `body_beast` (cuadrúpedo, para `larva_magma/can_lava/salamandra/espiritu_ceniza`), `body_blob` (`elemental_fuego/brasa_errante/imp_brasa`), `body_winged` (`avispa_brasa/fenix_menor`), `body_armor` (humanoide acorazado, `caballero_brasa`), `body_totem` (estático, `totem_pira/portaestandarte`).
- Cabezas/tocados extra: `head_hood` (cultistas), `horns` (bestias), `crest_flame` (fénix/salamandra).
- Detalles: `banner` (`portaestandarte`), `eye_single` (elementales).

Cada pieza con `down`/`up`/`side` (o `null` donde no aplique) cumpliendo dimensiones declaradas. Ejemplo de formato a seguir (cuerpo bestia, **plantilla real, ajustar a gusto**):

```js
  body_beast: {
    w: 12, h: 8, anchor: { x: 2, y: 7 },
    down: [
      '...oooooo...',
      '..obbbbbbo..',
      '.obbhhhhbbo.',
      '.obbbbbbbbo.',
      '.obssssssbo.',
      '.obo.oo.obo.',
      '.oo.....oo.. ',
      '..o.....o...',
    ].map((r) => r.slice(0, 12)),
    up: null, // derived ≈ down for quadrupeds
    side: [
      '....oooo....',
      '..oobbbboo..',
      '.obbhhhhbbo.',
      'obbbbbbbbbbo',
      'obssssssssbo',
      'obo.oo.oo.bo',
      'oo........oo',
      'o..........o',
    ].map((r) => r.slice(0, 12)),
  },
```

(El resto de piezas se autorían igual; cada commit de esta tarea debe dejar `parts.test.js` en verde.)

- [ ] **Step 4: Add a recipe per fire creature**

Añadir a `RECIPES` en `recipes.js`. Mapeo concreto (archetype/size/parts; `anim` por defecto `{idle:2,walk:2}`):

```js
  // --- Fire cultists (humanoid) ---
  acolito_brasa:   { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots'] },
  lanzabrasas:     { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  iniciado_veloz:  { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  piromante:       { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  encapuchado_pira:{ archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood'] },
  pirovidente:     { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  caballero_brasa: { archetype: 'humanoid', size: 32, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  sacerdote_llama: { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  portaestandarte: { archetype: 'humanoid', size: 32, parts: ['body_armor', 'head_round', 'eyes_dots', 'banner'] },
  // --- Fire beasts ---
  larva_magma:     { archetype: 'beast', size: 32, parts: ['body_beast', 'eye_single'] },
  salamandra:      { archetype: 'beast', size: 16, parts: ['body_beast', 'crest_flame', 'eyes_dots'] },
  espiritu_ceniza: { archetype: 'blob', size: 16, parts: ['body_blob', 'eyes_dots'] },
  can_lava:        { archetype: 'beast', size: 32, parts: ['body_beast', 'horns', 'eyes_dots'] },
  elemental_fuego: { archetype: 'blob', size: 32, parts: ['body_blob', 'eye_single'] },
  coloso_magma:    { archetype: 'beast', size: 32, parts: ['body_beast', 'horns', 'eye_single'] },
  fenix_menor:     { archetype: 'floating', size: 32, parts: ['body_winged', 'crest_flame', 'eyes_dots'] },
  // --- Summoned / ambient ---
  imp_brasa:       { archetype: 'blob', size: 16, parts: ['body_blob', 'horns', 'eyes_dots'] },
  avispa_brasa:    { archetype: 'floating', size: 16, parts: ['body_winged', 'eyes_dots'] },
  totem_pira:      { archetype: 'floating', size: 32, parts: ['body_totem', 'eye_single'] },
  brasa_errante:   { archetype: 'blob', size: 16, parts: ['body_blob'] },
```

- [ ] **Step 5: Run the coverage test**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 6: Verify visually**

Run: `python3 -m http.server 8000`, jugar nv1–nv6 de fuego.
Expected: cada enemigo de fuego se ve como personaje distinto, animado y con facing; colores derivados de su `color`.

- [ ] **Step 7: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): fire roster recipes + parts"
```

---

### Task 12: Bosses de fuego (incl. trío de hermanas)

**Files:**
- Modify: `src/data/sprites/parts.js`
- Modify: `src/data/sprites/recipes.js`
- Test: `tests/sprites/recipes.test.js`

Bosses de fuego (de `src/data/bosses/fire.js`): `favilla, pyra, vesta` (trío de hermanas), `ignatius`, y cualquier otro key exportado allí.

- [ ] **Step 1: Add the failing coverage test**

Añadir a `tests/sprites/recipes.test.js` (ajustar import al export real de `bosses/fire.js`, p.ej. `FIRE_BOSSES`):

```js
import { FIRE_BOSSES } from '../../src/data/bosses/fire.js';

test('every fire boss has a recipe with known parts', () => {
  for (const key of Object.keys(FIRE_BOSSES)) {
    assert.ok(hasRecipe(key), `fire boss '${key}' has no sprite recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

> Verificar el nombre del export con `grep -n "export" src/data/bosses/fire.js` y ajustar.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL (`fire boss 'favilla' has no sprite recipe`).

- [ ] **Step 3: Add boss-grade parts**

Añadir a `PARTS` piezas a medida para bosses (size 48 → scale 3; autoría a 16-design): `body_sister` (humanoide elegante para favilla/pyra/vesta, con variantes de `accent` por hermana vía la receta), `crown`, `body_ignatius` (gran elemental). Mismo formato/puertas que Task 11.

- [ ] **Step 4: Add a recipe per fire boss**

```js
  favilla:  { archetype: 'boss', size: 48, accent: 0xffca28, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  pyra:     { archetype: 'boss', size: 48, accent: 0xff5722, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  vesta:    { archetype: 'boss', size: 48, accent: 0xe64a19, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  ignatius: { archetype: 'boss', size: 48, parts: ['body_ignatius', 'horns', 'eye_single'] },
```

(Si `bosses/fire.js` exporta más keys, añadir una receta para cada uno; el test de cobertura lo exige.)

- [ ] **Step 5: Run the coverage test**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 6: Verify visually**

Run: `python3 -m http.server 8000`, jugar nv7 (trío) y nv8 (templo) de fuego.
Expected: las hermanas se distinguen por color/accent; ignatius es un boss grande pixel-art; barra de vida intacta.

- [ ] **Step 7: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): fire boss recipes (sisters trio + ignatius)"
```

---

### Task 13: Roster de agua

**Files:**
- Modify: `src/data/sprites/parts.js`
- Modify: `src/data/sprites/recipes.js`
- Test: `tests/sprites/recipes.test.js`

Criaturas de agua: las ~20 de `src/data/enemies/` (agua). Familias: cultistas de escarcha (humanoides), ahogados/coristas (humanoides), bestias (tiburón, serpiente, tortuga, cangrejo, pez globo, medusa), linaje rana (huevo→renacuajo→rana→sapo), ambiente (burbuja, tótem).

- [ ] **Step 1: Add the failing coverage test**

Añadir a `tests/sprites/recipes.test.js` (ajustar import al export real, p.ej. `WATER_ENEMIES`):

```js
import { WATER_ENEMIES } from '../../src/data/enemies/water.js';

test('every water enemy has a recipe with known parts', () => {
  for (const key of Object.keys(WATER_ENEMIES)) {
    assert.ok(hasRecipe(key), `water enemy '${key}' has no sprite recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

> Verificar el export real con `grep -n "export" src/data/enemies/water.js` y los keys con `grep -oE "key: '[a-z_]+'" src/data/enemies/water.js`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL.

- [ ] **Step 3: Add water parts**

Añadir a `PARTS` (formato Task 2): `body_fish` (tiburón/pez), `body_serpent`, `body_shell` (tortuga/cangrejo), `body_jelly` (medusa, con tentáculos), `body_frog` + `frog_egg`/`tadpole_tail` (linaje rana), `fin`, `body_bubble`. Reutilizar `body_robe`/`head_hood`/`eyes_dots` para cultistas de agua.

- [ ] **Step 4: Add a recipe per water creature**

Añadir a `RECIPES` una entrada por key de `WATER_ENEMIES`, mapeando a su familia y `size` por `radius` (ver patrón de fase). Ejemplos representativos (completar todos los keys):

```js
  // cultists -> humanoid (paleta derivada de su color frío)
  // beasts -> fish/serpent/shell/jelly; frog lineage -> body_frog/tadpole/egg
  // (una entrada por cada key de WATER_ENEMIES; el test de cobertura exige el set completo)
```

- [ ] **Step 5: Run the coverage test**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 6: Verify visually**

Run: `python3 -m http.server 8000`, jugar niveles de agua.
Expected: criaturas de agua reconocibles (rana, tiburón, tortuga, medusa, cultista de escarcha), animadas con facing.

- [ ] **Step 7: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): water roster recipes + parts"
```

---

### Task 14: Bosses de agua

**Files:**
- Modify: `src/data/sprites/parts.js`
- Modify: `src/data/sprites/recipes.js`
- Test: `tests/sprites/recipes.test.js`

Bosses de agua (de `src/data/bosses/water.js`): `dama_lago, dama_tiburon, dama_ballena, dama_kraken, dama_maga, dama_maga_final, kraken, sapo_desovador, tiburon_abisal, soldado_hielo` y cualquier otro key exportado.

- [ ] **Step 1: Add the failing coverage test**

Añadir a `tests/sprites/recipes.test.js` (ajustar al export real, p.ej. `WATER_BOSSES`):

```js
import { WATER_BOSSES } from '../../src/data/bosses/water.js';

test('every water boss has a recipe with known parts', () => {
  for (const key of Object.keys(WATER_BOSSES)) {
    assert.ok(hasRecipe(key), `water boss '${key}' has no sprite recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL.

- [ ] **Step 3: Add boss parts + recipes**

Añadir piezas boss-grade donde haga falta (`body_kraken` con tentáculos, `body_whale`, `body_shark_big`) y una receta `size: 48` por cada key de `WATER_BOSSES`. Las "Damas" humanoides reutilizan `body_sister`/`body_robe` + `accent` por color.

```js
  dama_lago:       { archetype: 'boss', size: 48, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  dama_tiburon:    { archetype: 'boss', size: 48, parts: ['body_shark_big', 'eyes_dots'] },
  // ... una receta por cada key de WATER_BOSSES (el test de cobertura lo exige)
  kraken:          { archetype: 'boss', size: 48, parts: ['body_kraken', 'eye_single'] },
```

- [ ] **Step 4: Run the coverage test**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 5: Verify visually**

Run: `python3 -m http.server 8000`, jugar los niveles boss de agua.
Expected: cada boss de agua es pixel-art grande y reconocible; mecánicas (burrow/invuln/forms) y barra intactas.

- [ ] **Step 6: Commit**

```bash
git add src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(sprites): water boss recipes + parts"
```

---

### Task 15: Paridad global + pulido

**Files:**
- Test: `tests/sprites/recipes.test.js`
- Modify: `src/data/sprites/recipes.js` / `parts.js` (ajustes de pulido)

- [ ] **Step 1: Add the global parity test (all enemy types covered)**

Añadir a `tests/sprites/recipes.test.js` un test que use el registro agregado `ENEMY_TYPES` de `src/data/enemies.js` (el que consume el juego):

```js
import { ENEMY_TYPES } from '../../src/data/enemies.js';

test('GLOBAL: every registered enemy type has a sprite recipe', () => {
  const missing = Object.keys(ENEMY_TYPES).filter((k) => !hasRecipe(k));
  assert.deepEqual(missing, [], `enemy types without recipe: ${missing.join(', ')}`);
});
```

> Si `ENEMY_TYPES` agrega también los bosses, este test cubre todo; si no, mantener además los tests por-grupo de las tareas 11–14.

- [ ] **Step 2: Run it**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS (si falla, añadir las recetas que falten — la lista del error las nombra).

- [ ] **Step 3: Polish pass (visual)**

Run: `python3 -m http.server 8000`. Revisar: timing de `walk` (subir a `anim.walk: 4` donde luzca a tirones), legibilidad de paletas frías de agua, tamaños de bosses. Ajustar matrices/recetas y re-verificar.

- [ ] **Step 4: Run the full suite**

Run: `node --test`
Expected: PASS (todo).

- [ ] **Step 5: Commit**

```bash
git add src/data/sprites/ tests/sprites/recipes.test.js
git commit -m "feat(sprites): global recipe parity + polish pass"
```

---

## Self-Review (cobertura del spec)

- **Pixel-art por código, sin assets** → Tasks 1–4 (núcleo puro), Task 7 (pinta texturas). ✔
- **4 direcciones (down/up/side + flipX) animado (idle/walk)** → Task 3 (forge) + Task 6 (facing). ✔
- **Lógica intacta; solo presentación** → Tasks 8/9 añaden `preUpdate`+facing y `setDisplaySize`, body de físicas sin tocar. ✔
- **Claves de textura centralizadas (`spriteKey`)** → Task 5. ✔
- **Rollout incremental con fallback** → Task 9 (fallback forma+tinte hasta que exista receta). ✔
- **Héroe + roster fuego + bosses fuego + roster agua + bosses agua** → Tasks 8, 11, 12, 13, 14. ✔
- **Proyectiles (orb/fireball/arrow + rotación)** → Task 10. ✔
- **Fidelidad (16/32/48, idle+walk)** → encoding + patrón de fase 4. ✔
- **Tests puros (paridad, frames, direcciones, paleta, integridad)** → Tasks 1–4, 10, 11–15. ✔

Sin placeholders de tipo "TBD"; las piezas de roster son contenido artístico con formato y puertas de aceptación explícitas (integridad + visual), no huecos de código. Firmas consistentes (`forge`, `composeGrid`, `pickFacing`, `paletteFor`, `spriteKey`/`frameKey`) entre tareas.
