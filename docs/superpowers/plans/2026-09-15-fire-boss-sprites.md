# Sprites de los jefes de Fuego y la Escolta del Templo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir los sprites de `pyra`, `vesta`, `favilla` e `ignatius` por sprites estáticos de frente generados desde `tools/refs/fuego-jefes.png` (lado mayor 48 o 64 a escala 1), y añadir el enemigo `escolta_templo` (arte de `tools/refs/fuego-escolta.png`) como minion del templo de Fuego.

**Architecture:** Tercera hoja sobre el pipeline existente (`tools/lib/png.mjs` → `tools/lib/figure.mjs` → módulo de partes GENERADO → `sheetRecipe` estática con `body`). `convertFigure` gana `fitSide` (lado mayor exacto) y `renderSheetPreview` acepta una imagen por item, porque la hoja usa dos PNG. `makeBranch` gana `templeMinions`. Los jefes ya son `Enemy`, así que `displayFor`/`applyDisplay` los dimensionan sin cambios de motor.

**Tech Stack:** Phaser 3.80.1 (CDN, ES modules nativos), Node 20 (`node:test`, `node:zlib`), Playwright MCP para la verificación en juego.

**Spec:** `docs/superpowers/specs/2026-09-15-fire-boss-sprites-design.md`

## Global Constraints

- Sin build, sin bundler, sin paquetes npm en el runtime ni en las herramientas (solo módulos `node:`).
- Móvil vertical, lienzo lógico 480×854.
- Tamaños (escala 1, hitbox = `radius*2` sin cambios):

  | Clave | Radio | Cuerpo (`bodySize`) | Sprite |
  |---|---|---|---|
  | `pyra` | 24 | 48 | lado mayor de la silueta = 48 (`fitSide: 48`) |
  | `favilla` | 24 | 48 | lado mayor = 48 (`fitSide: 48`) |
  | `vesta` | 32 | 64 | lado mayor = 64 (`fitSide: 64`) |
  | `ignatius` | 30 | 60 | lado mayor = 64 (`fitSide: 64`) |
  | `escolta_templo` | 16 | 32 | ancho ≥ 32 (`minWidth: 32`), alto por ratio |

- Sprites **estáticos de frente**: un frame, la misma vista en `down`/`up`/`side`, nunca se voltean.
- `escolta_templo` = stats y comportamiento de `villager`: hp 20, speed 90, damage 8, radius 16, `movement: { type: 'chase' }`, `attacks: []`. Solo como minion del templo de Fuego (×4). Los templos de Agua, Aire y Tierra siguen con `villager` ×4.
- `src/data/sprites/partsFireBasics.js`, `partsFireAdvanced.js` y `partsFireBosses.js` son GENERADOS: nunca se editan a mano. Los dos primeros deben seguir **byte a byte idénticos** al re-ejecutar sus generadores.
- Máximo **16 colores** por criatura. Prefijo de partes de la hoja nueva: `fj_`.
- Fuera de alcance: animaciones, vistas de espalda/lado, cambios de stats/hitbox/comportamiento de los jefes, escolta en oleadas, minions de otros templos.
- Lógica testeable sin Phaser (`src/systems/`, `src/data/`, `tools/lib/`). Tests con `node:test` + `node:assert/strict`. Para cifras usar `node --test tests/` (`node --test` a secas también recorre `.claude/worktrees`).
- **Gate visual del usuario:** ninguna receta del juego se conecta sin que el usuario haya aprobado el preview (Tareas 4 y 5). Esas revisiones las ejecuta la **sesión principal**, no un subagente.
- Commits en español, estilo `tipo(ámbito): descripción`, terminando con las líneas de atribución de la sesión.
- Rama `feat/fire-boss-sprites` (desde `feat/fire-advanced-sprites`). Suite de partida: **440 tests en verde** (`node --test tests/`).

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `tools/lib/figure.mjs` | Modificar | Opción `fitSide` |
| `tools/lib/sheetPreview.mjs` | Modificar | `item.img` opcional por item |
| `tools/fire-bosses-figures.mjs` | Crear | Rutas de las dos referencias + recortes y parámetros por figura |
| `tools/gen-fire-bosses.mjs` | Crear | Escribe `partsFireBosses.js` |
| `tools/preview-fire-bosses.mjs` | Crear | PNG de revisión |
| `src/data/sprites/partsFireBosses.js` | Generado | `FIRE_BOSS_META`, `FIRE_BOSS_PARTS` |
| `src/data/sprites/parts.js` | Modificar | Expande `FIRE_BOSS_PARTS`; borra partes `pyra_*`/`vesta_*`/`favilla_*`/`ign_*` |
| `src/data/sprites/recipes.js` | Modificar | `fireBossRecipe()`; 5 recetas; borra `PYRA`/`VESTA`/`FAVILLA`/`IGNATIUS` |
| `src/data/enemies/fire.js` | Modificar | `escolta_templo` |
| `src/data/regions.js` | Modificar | `templeMinions` en `makeBranch`; Fuego pasa la escolta |
| `tools/gen-sisters.mjs`, `tools/gen-ignatius.mjs` | Borrar | Arte viejo |
| `CLAUDE.md` | Modificar | Mencionar `partsFireBosses.js` / `gen-fire-bosses.mjs` |
| `tests/tools/figure.test.js`, `tests/sprites/recipes.test.js`, `tests/regions.test.js`, `tests/spriteManifest.test.js` | Modificar | Nuevos casos |
| `tests/tools/sheetPreview.test.js`, `tests/sprites/fireBosses.test.js` | Crear | Nuevos tests |

---

### Task 1: `convertFigure` — opción `fitSide`

**Files:**
- Modify: `tools/lib/figure.mjs`
- Test: `tests/tools/figure.test.js`

**Interfaces:**
- Produces: `convertFigure(img, fig)` acepta `fig.fitSide` (entero > 0; 0/ausente = sin efecto). Con `fitSide`, `scale` se ignora y el lado mayor de la silueta final (ancho o alto, tras pelado y despeckle) es el mayor posible ≤ `fitSide`. `fitSide` junto a `minWidth` > 0 lanza `/exclusive/`. `fitSide` no entero o negativo lanza `/fitSide/`. Resultado sin cambios de forma: `{ gridW, gridH, body: { x, y, size }, colors, rows }`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/tools/figure.test.js` (ya define `sheet`, `fill`, `RED`, `silhouetteW` y `silhouetteH`):

```js
test('convertFigure: fitSide ajusta el lado mayor (alto) de la silueta, sin deformar', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, RED);    // silueta 20×100 (ratio 1:5)
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 119], fitSide: 48, peel: 0 });
  assert.equal(silhouetteH(r), 48);
  assert.equal(silhouetteW(r), 10);   // ceil(20 × 0.48)
});

test('convertFigure: fitSide ajusta el lado mayor (ancho) de una figura apaisada', () => {
  const img = sheet(120, 60);
  fill(img, 10, 10, 109, 49, RED);    // silueta 100×40
  const r = convertFigure(img, { slot: [0, 119], rows: [0, 59], fitSide: 64, peel: 0 });
  assert.equal(silhouetteW(r), 64);
  assert.equal(silhouetteH(r), 26);   // ceil(40 × 0.64)
});

test('convertFigure: fitSide ignora scale', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, RED);
  const a = convertFigure(img, { slot: [0, 59], rows: [0, 119], fitSide: 48, peel: 0 });
  const b = convertFigure(img, { slot: [0, 59], rows: [0, 119], fitSide: 48, scale: 3, peel: 0 });
  assert.deepEqual(b, a);
});

test('convertFigure: fitSide con cuerpo más ancho que la silueta → el lienzo crece hasta el cuadro', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, RED);    // → silueta 10×48
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 119], fitSide: 48, bodySize: 48, peel: 0 });
  assert.deepEqual([r.gridW, r.gridH], [48, 48]);
  assert.deepEqual(r.body, { x: 0, y: 0, size: 48 });
});

test('convertFigure: fitSide compensa el pelado de bordes', () => {
  const img = sheet(60, 120);
  fill(img, 10, 10, 29, 109, 0x201010);  // borde oscuro que el pelado se come
  fill(img, 10, 14, 29, 105, RED);
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 119], fitSide: 48, peel: 2 });
  assert.equal(silhouetteH(r), 48);
});

test('convertFigure: fitSide inválido o combinado con minWidth lanza error', () => {
  const img = sheet(40, 40);
  fill(img, 5, 5, 34, 34, RED);
  const base = { slot: [0, 39], rows: [0, 39], scale: 1 };
  assert.throws(() => convertFigure(img, { ...base, fitSide: 12.5 }), /fitSide/);
  assert.throws(() => convertFigure(img, { ...base, fitSide: -4 }), /fitSide/);
  assert.throws(() => convertFigure(img, { ...base, fitSide: 32, minWidth: 32 }), /exclusive/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/tools/figure.test.js`
Expected: FAIL en los 6 tests nuevos (los antiguos PASS). Los de tamaño fallan porque `scale` es `undefined`; los de error, porque no se lanza nada.

- [ ] **Step 3: Implementar**

En `tools/lib/figure.mjs`:

1. En la cabecera, cambiar la línea 5 por:

```js
// despeckle, contorno, ancho mínimo o lado mayor fijo, y caja del cuerpo (bodySize×bodySize) centrada en la silueta.
```

2. En `DEFAULTS`, tras `minWidth`, añadir:

```js
  fitSide: 0,       // lado mayor exacto de la silueta final en px (0 = sin efecto; excluye minWidth e ignora scale)
```

3. Actualizar el comentario de la firma:

```js
// fig: { slot: [x0, x1], rows: [y0, y1], scale, minWidth? | fitSide?, bodySize?, bodyShift?, ...DEFAULTS overrides, overrides: [[x, y, 0xRRGGBB | null], …] }
```

4. Tras la validación de `bodySize`, añadir:

```js
  if (!Number.isInteger(o.fitSide) || o.fitSide < 0) throw new Error(`convertFigure: fitSide ${o.fitSide} must be a non-negative integer`);
  if (o.fitSide && o.minWidth) throw new Error('convertFigure: fitSide and minWidth are exclusive');
```

5. Sustituir el bloque de escala, desde el comentario `// Escala: \`scale\`, subida si hace falta…` hasta `const ow = grid[0].length, oh = grid.length;` (sin incluir esa línea), por:

```js
  const heightOf = (grid) => grid.filter((row) => row.some((c) => c != null)).length;
  const sideOf = (grid) => Math.max(widthOf(grid), heightOf(grid));

  let grid;
  if (o.fitSide) {
    // Lado mayor fijo: la escala más grande cuya silueta final (tras el pelado) mide ≤ fitSide
    // en su lado mayor. Se sube hasta pasarse y una búsqueda binaria afina. El ratio se conserva.
    let lo = 0, hi = o.fitSide / Math.max(bw, bh);
    for (let tries = 0; sideOf(rasterize(hi)) <= o.fitSide; tries++) {
      if (tries >= 40) throw new Error(`convertFigure: cannot reach fitSide ${o.fitSide}`);
      lo = hi;
      hi *= 1.25;
    }
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (sideOf(rasterize(mid)) <= o.fitSide) lo = mid; else hi = mid;
    }
    if (!lo) throw new Error(`convertFigure: cannot fit ${o.fitSide}`);
    grid = rasterize(lo);
  } else {
    // Escala: `scale`, subida si hace falta para que la silueta final (tras el pelado) mida
    // ≥ minWidth. El pelado puede comerse columnas, así que se sube hasta cumplir y luego una
    // búsqueda binaria afina a la escala más pequeña que cumple. El ratio se conserva.
    grid = rasterize(o.scale);
    if (o.minWidth && widthOf(grid) < o.minWidth) {
      let lo = o.scale, hi = Math.max(o.scale, o.minWidth / bw);
      for (let tries = 0; widthOf(grid = rasterize(hi)) < o.minWidth; tries++) {
        if (tries >= 40) throw new Error(`convertFigure: cannot reach minWidth ${o.minWidth}`);
        lo = hi;
        hi *= 1.25;
      }
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        if (widthOf(rasterize(mid)) >= o.minWidth) hi = mid; else lo = mid;
      }
      grid = rasterize(hi);
    }
  }
```

La rama `else` es el código actual sin cambios (solo reindentado), así que los básicos y los avanzados no cambian.

- [ ] **Step 4: Ejecutar tests y comprobar los generadores existentes**

Run: `node --test tests/tools/figure.test.js tests/sprites/fireAdvanced.test.js tests/sprites/fireBasics.test.js && node tools/gen-fire-basics.mjs && node tools/gen-fire-advanced.mjs && git diff --stat src/data/sprites/`
Expected: todos PASS y `git diff --stat` vacío (los módulos generados no cambian).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/figure.mjs tests/tools/figure.test.js
git commit -m "feat(tools): convertFigure acepta fitSide (lado mayor exacto de la silueta)"
```

---

### Task 2: `renderSheetPreview` — imagen por item

**Files:**
- Modify: `tools/lib/sheetPreview.mjs`
- Test: `tests/tools/sheetPreview.test.js` (crear)

**Interfaces:**
- Produces: `renderSheetPreview(ref, items, { refScale })`, donde cada item es `{ fig, recipe, grid, img? }`. Si `img` (PNG decodificado `{ width, height, data }`) está presente, el recorte de ese item se lee de `img`; si no, de `ref`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/tools/sheetPreview.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetPreview } from '../../tools/lib/sheetPreview.mjs';

const solid = (w, h, [r, g, b]) => {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([r, g, b, 255], i * 4);
  return { width: w, height: h, data };
};
const item = (extra = {}) => ({
  fig: { slot: [0, 3], rows: [0, 3] },
  recipe: { gridW: 1, gridH: 1, body: { x: 0, y: 0, size: 1 } },
  grid: [[0x00ff00]],
  ...extra,
});
// PAD = 12; con refScale 1 el recorte 4×4 va en x = 12, y = H - 12 - 4.
const refPixel = (out) => {
  const i = ((out.height - 12 - 4) * out.width + 12) * 4;
  return [...out.data.slice(i, i + 3)];
};

test('renderSheetPreview: sin img, el recorte sale de ref', () => {
  const out = renderSheetPreview(solid(4, 4, [255, 0, 0]), [item()], { refScale: 1 });
  assert.deepEqual(refPixel(out), [255, 0, 0]);
});

test('renderSheetPreview: con img, el recorte de ese item sale de su imagen', () => {
  const out = renderSheetPreview(solid(4, 4, [255, 0, 0]), [item({ img: solid(4, 4, [0, 0, 255]) })], { refScale: 1 });
  assert.deepEqual(refPixel(out), [0, 0, 255]);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node --test tests/tools/sheetPreview.test.js`
Expected: el primero PASS y el segundo FAIL (`[255, 0, 0]` en vez de `[0, 0, 255]`).

- [ ] **Step 3: Implementar**

En `tools/lib/sheetPreview.mjs`:

1. Cambiar la línea 5 del comentario por:

```js
// ref: PNG decodificado { width, height, data }. items: [{ fig, recipe, grid, img? }] (img = imagen propia del item).
```

2. Sustituir las líneas del bucle:

```js
  for (const { fig, recipe, grid } of items) {
    for (let y = 0; y < refH(fig); y++) for (let x = 0; x < refW(fig); x++) {
      const i = ((fig.rows[0] + Math.floor(y / refScale)) * ref.width + fig.slot[0] + Math.floor(x / refScale)) * 4;
      set(ox + x, H - PAD - refH(fig) + y, (ref.data[i] << 16) | (ref.data[i + 1] << 8) | ref.data[i + 2]);
    }
```

por:

```js
  for (const { fig, recipe, grid, img } of items) {
    const src = img ?? ref;
    for (let y = 0; y < refH(fig); y++) for (let x = 0; x < refW(fig); x++) {
      const i = ((fig.rows[0] + Math.floor(y / refScale)) * src.width + fig.slot[0] + Math.floor(x / refScale)) * 4;
      set(ox + x, H - PAD - refH(fig) + y, (src.data[i] << 16) | (src.data[i + 1] << 8) | src.data[i + 2]);
    }
```

- [ ] **Step 4: Ejecutar tests**

Run: `node --test tests/tools/sheetPreview.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/sheetPreview.mjs tests/tools/sheetPreview.test.js
git commit -m "feat(tools): el preview de hojas acepta una imagen de referencia por item"
```

---

### Task 3: Hoja de jefes — generador, módulo generado, receta y preview (prototipo: Pyra + Ignatius)

**Files:**
- Create: `tools/fire-bosses-figures.mjs`, `tools/gen-fire-bosses.mjs`, `tools/preview-fire-bosses.mjs`, `tests/sprites/fireBosses.test.js`
- Generate: `src/data/sprites/partsFireBosses.js`
- Modify: `src/data/sprites/parts.js`, `src/data/sprites/recipes.js`

**Interfaces:**
- Consumes: `convertFigure` con `fitSide` (Task 1), `renderSheetPreview` con `item.img` (Task 2), `renderSheetParts` y `sheetRecipe` (ya existentes).
- Produces:
  - `FIGURES` en `tools/fire-bosses-figures.mjs`: `{ [key]: { ref, slot, rows, bodySize, fitSide | (minWidth + scale), bg, bgTol, …extra } }`, más las constantes exportadas `SIDE = { pyra: 48, vesta: 64, favilla: 48, ignatius: 64 }` y `BODY = { pyra: 48, vesta: 64, favilla: 48, ignatius: 60, escolta_templo: 32 }`.
  - `FIRE_BOSS_META`: `{ [key]: { gridW, gridH, body: { x, y, size? } } }`.
  - `FIRE_BOSS_PARTS`: `{ ['fj_' + key]: part }`, expandidas en `PARTS`.
  - `fireBossRecipe(key, archetype, extra)` exportada desde `recipes.js`.

- [ ] **Step 1: Crear `tools/fire-bosses-figures.mjs` (prototipo)**

Recortes medidos sobre las referencias: en `fuego-jefes.png` el adorno del subtítulo acaba en y≈101 y el pie "64 x 64 px" empieza en y≈478; los bordes de panel están en x = 9/380, 397/768, 785/1156 y 1173/1544. En `fuego-escolta.png` el subtítulo acaba en y≈107 y el pie empieza en y≈639; el botón "Editar" queda por debajo de y 630.

```js
// tools/fire-bosses-figures.mjs
// Recortes y parámetros por figura de los jefes de Fuego y la Escolta del Templo, sobre dos
// referencias: tools/refs/fuego-jefes.png (1560×523, 4 paneles en fila) y
// tools/refs/fuego-escolta.png (714×717, un panel). ref = PNG de la figura; slot = columnas
// interiores del panel [x0, x1]; rows = filas entre el subtítulo y el pie. Jefes: bodySize =
// radius*2 del jefe (hitbox a escala 1) y fitSide = lado mayor de la silueta (48 o 64). Escolta:
// como los básicos, minWidth 32 con el alto por ratio y scale inicial. Lo demás sobreescribe
// DEFAULTS de tools/lib/figure.mjs. Lo leen gen- y preview-fire-bosses.
import { fileURLToPath } from 'node:url';

const JEFES = fileURLToPath(new URL('./refs/fuego-jefes.png', import.meta.url));
const ESCOLTA = fileURLToPath(new URL('./refs/fuego-escolta.png', import.meta.url));

// Lado mayor de la silueta de cada jefe y lado del cuadro del cuerpo (radius*2) de cada figura.
export const SIDE = { pyra: 48, vesta: 64, favilla: 48, ignatius: 64 };
export const BODY = { pyra: 48, vesta: 64, favilla: 48, ignatius: 60, escolta_templo: 32 };

const ROWS = [103, 474];
const BG_JEFES = [13, 12, 17];
const boss = (key, slot, extra = {}) => ({ ref: JEFES, slot, rows: ROWS, bodySize: BODY[key], fitSide: SIDE[key], bg: BG_JEFES, bgTol: 24, ...extra });

export const FIGURES = {
  pyra:     boss('pyra', [12, 378]),
  ignatius: boss('ignatius', [1176, 1542]),
};
```

`ESCOLTA` queda sin usar hasta la Task 5; se deja declarada para que la Task 5 solo añada entradas.

- [ ] **Step 2: Crear `tools/gen-fire-bosses.mjs` y generar**

```js
// tools/gen-fire-bosses.mjs
// Genera src/data/sprites/partsFireBosses.js desde las referencias de los jefes de Fuego y la
// Escolta del Templo (ver tools/fire-bosses-figures.mjs). Determinista: re-ejecutarlo sin
// cambios deja el archivo idéntico. Run: node tools/gen-fire-bosses.mjs [outPath]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.mjs';
import { convertFigure } from './lib/figure.mjs';
import { renderSheetParts } from './lib/sheetParts.mjs';
import { FIGURES } from './fire-bosses-figures.mjs';

const OUT = process.argv[2] ?? fileURLToPath(new URL('../src/data/sprites/partsFireBosses.js', import.meta.url));

const images = new Map();
const imageOf = (path) => {
  if (!images.has(path)) images.set(path, decodePng(readFileSync(path)));
  return images.get(path);
};
const results = Object.entries(FIGURES).map(([key, fig]) => [key, convertFigure(imageOf(fig.ref), fig)]);

writeFileSync(OUT, renderSheetParts(results, {
  header: [
    '// src/data/sprites/partsFireBosses.js',
    '// GENERATED by tools/gen-fire-bosses.mjs — do not edit by hand; edit the generator (or',
    '// tools/fire-bosses-figures.mjs) and re-run. PURE. Jefes de Fuego y Escolta del Templo:',
    '// sprites estáticos de frente, 1 carácter = 1 píxel, colores propios por parte. `body` =',
    '// esquina y lado (size = radius*2; 32 si falta) del cuadro del cuerpo dentro del lienzo.',
  ],
  prefix: 'fj_',
  metaName: 'FIRE_BOSS_META',
  partsName: 'FIRE_BOSS_PARTS',
}));
for (const [key, r] of results) console.log(`${key}: ${r.gridW}×${r.gridH} body(${r.body.x},${r.body.y},${r.body.size}) ${Object.keys(r.colors).length} colores`);
```

Run: `node tools/gen-fire-bosses.mjs`
Expected: 2 líneas, aproximadamente `pyra: 48×52 body(0,4,48) 11 colores` e `ignatius: 65×64 body(3,4,60) 12 colores` (valores de una prueba previa; pueden variar ±2). Si `convertFigure` lanza `colors > 16`, bajar `colors` en esa figura (`boss('pyra', [12, 378], { colors: 10 })`) y re-ejecutar.

- [ ] **Step 3: Conectar el módulo en `parts.js` y `recipes.js` (sin usarlo aún en recetas)**

En `src/data/sprites/parts.js`, tras `import { FIRE_ADVANCED_PARTS } from './partsFireAdvanced.js';`:

```js
import { FIRE_BOSS_PARTS } from './partsFireBosses.js';
```

y tras las líneas

```js
  // Enemigos restantes de Fuego — sprites estáticos a tamaño real, GENERATED by tools/gen-fire-advanced.mjs.
  ...FIRE_ADVANCED_PARTS,
```

añadir:

```js

  // Jefes de Fuego y Escolta del Templo — sprites estáticos a tamaño real, GENERATED by tools/gen-fire-bosses.mjs.
  ...FIRE_BOSS_PARTS,
```

En `src/data/sprites/recipes.js`, tras `import { FIRE_ADVANCED_META } from './partsFireAdvanced.js';`:

```js
import { FIRE_BOSS_META } from './partsFireBosses.js';
```

y tras la línea `export const fireAdvancedRecipe = …`:

```js
// Jefes de Fuego y Escolta del Templo, a tamaño real (tools/gen-fire-bosses.mjs).
export const fireBossRecipe = (key, archetype, extra) => sheetRecipe(FIRE_BOSS_META, 'fj_', key, archetype, extra);
```

- [ ] **Step 4: Escribir `tests/sprites/fireBosses.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_BOSS_META, FIRE_BOSS_PARTS } from '../../src/data/sprites/partsFireBosses.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireBossRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { PYRA, VESTA, FAVILLA, IGNATIUS } from '../../src/data/bosses/fire.js';
import { FIGURES, SIDE, BODY } from '../../tools/fire-bosses-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-bosses.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireBosses.js', import.meta.url));
const BOSS_DEFS = { pyra: PYRA, vesta: VESTA, favilla: FAVILLA, ignatius: IGNATIUS };
const sizeOf = (key) => FIRE_BOSS_META[key].body.size ?? 32;
const silhouette = (key) => {
  const rows = FIRE_BOSS_PARTS[`fj_${key}`].down;
  let lo = Infinity, hi = -1, h = 0;
  for (const row of rows) {
    if (/[^.]/.test(row)) h++;
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  return { w: hi - lo + 1, h };
};

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_BOSS_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fj_${key}`], FIRE_BOSS_PARTS[`fj_${key}`]);
});

test('cada jefe: bodySize = radius*2 del jefe, y el módulo generado lo respeta', () => {
  for (const key of Object.keys(FIGURES).filter((k) => BOSS_DEFS[k])) {
    const want = BOSS_DEFS[key].radius * 2;
    assert.equal(BODY[key], want, `${key} BODY`);
    assert.equal(FIGURES[key].bodySize, want, `${key} bodySize`);
    assert.equal(sizeOf(key), want, `${key} body.size generado`);
  }
});

test('cada jefe: el lado mayor de la silueta es exactamente su SIDE (48 o 64)', () => {
  for (const key of Object.keys(FIGURES).filter((k) => BOSS_DEFS[k])) {
    const { w, h } = silhouette(key);
    assert.equal(Math.max(w, h), SIDE[key], `${key} ${w}×${h}`);
  }
});

test('cada sprite: cuerpo dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_BOSS_META)) {
    const p = FIRE_BOSS_PARTS[`fj_${key}`], size = sizeOf(key);
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + size <= m.gridW && m.body.y + size <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('fireBossRecipe forja un frame estático del tamaño del lienzo', () => {
  for (const key of Object.keys(FIRE_BOSS_META)) {
    const r = fireBossRecipe(key, 'boss');
    assert.equal(r.static, true);
    assert.equal(r.scale, 1);
    assert.deepEqual(r.parts, [{ name: `fj_${key}` }]);
    assert.deepEqual(r.body, FIRE_BOSS_META[key].body);
    const g = forge(r, PARTS, derivePalette(0x888888)).anims['idle-down'][0];
    assert.equal(g.length, FIRE_BOSS_META[key].gridH);
    assert.equal(g[0].length, FIRE_BOSS_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
  assert.throws(() => fireBossRecipe('no_existe', 'boss'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fire-bosses-'));
  try {
    const out = join(dir, 'parts.js');
    execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
    assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 5: Ejecutar los tests**

Run: `node --test tests/sprites/fireBosses.test.js`
Expected: PASS (6 tests). Si "lado mayor exactamente SIDE" falla por 1 px (un salto de la reducción), probar `peel: 0` o `bgTol` ±6 en esa figura, regenerar y re-ejecutar; no relajar el test.

- [ ] **Step 6: Crear `tools/preview-fire-bosses.mjs` y generar el preview del prototipo**

```js
// tools/preview-fire-bosses.mjs
// PNG de revisión de los jefes de Fuego y la Escolta del Templo (ver tools/lib/sheetPreview.mjs).
// Cada figura lleva su propia referencia (item.img); se muestra a ×1.
// Run: node tools/preview-fire-bosses.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { FIGURES } from './fire-bosses-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBossRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-bosses.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const fig = FIGURES[key];
  const recipe = fireBossRecipe(key, 'boss');
  return { fig, img: decodePng(readFileSync(fig.ref)), recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
const preview = renderSheetPreview(items[0].img, items, { refScale: 1 });
writeFileSync(outPath, encodePng(preview));
console.log('preview', outPath, `${preview.width}×${preview.height}`, keys.join(', '));
```

Run: `mkdir -p .playwright-mcp && node tools/preview-fire-bosses.mjs .playwright-mcp/fire-bosses-proto.png`
Expected: `preview .playwright-mcp/fire-bosses-proto.png …×… pyra, ignatius`.

- [ ] **Step 7: Suite completa**

Run: `node --test tests/`
Expected: todo PASS (440 + 6 de Task 1 + 2 de Task 2 + 6 de esta = 454).

- [ ] **Step 8: Commit**

```bash
git add tools/fire-bosses-figures.mjs tools/gen-fire-bosses.mjs tools/preview-fire-bosses.mjs src/data/sprites/partsFireBosses.js src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/fireBosses.test.js
git commit -m "feat(fire): generador de los jefes desde referencia — prototipo Pyra + Ignatius"
```

---

### Task 4: GATE — revisión del prototipo con el usuario

> La ejecuta la **sesión principal**, porque requiere conversación con el usuario. Todavía no se conecta ninguna receta del juego.

**Files:**
- Modify: `tools/fire-bosses-figures.mjs` (parámetros y `overrides`), `src/data/sprites/partsFireBosses.js` (regenerado)

- [ ] **Step 1: Enviar el preview**

Leer `.playwright-mcp/fire-bosses-proto.png` y enviarlo al usuario (SendUserFile). Explicar qué muestra cada columna: referencia ×1, sprite ×6 con el cuadro del cuerpo en cian y sprite ×2 sobre fondo oscuro y sobre lava. Pedir feedback concreto sobre:
- **pyra (48):** si se lee la cara, la corona y el orbe, y si el pelo en llamas se confunde con el vestido;
- **ignatius (64):** la barba de fuego, el cetro con sol y si la capa de llamas quedó cortada o con halo sucio.

- [ ] **Step 2: Iterar hasta el OK explícito**

Por cada comentario, ajustar en `FIGURES` solo los parámetros de esa figura (tercer argumento de `boss` = `extra`):
- resplandor rojo del fondo pegado a la figura → subir `bgTol` en pasos de 6 (parte de 24);
- llamas amputadas → bajar `bgTol`;
- halo oscuro sucio → `peel` / `peelLum`; armadura oscura que desaparece → `peel: 0`;
- ojos, orbe o llamas apagados → `glowWeight` / `glowLum`;
- dorado o piel pobres → `colors` (≤16);
- hitbox descentrada → `bodyShift: [dx, dy]`;
- píxeles concretos → `overrides: [[x, y, 0xRRGGBB | null], …]`, en coordenadas del lienzo (columna ×6 dividida entre 6);
- recorte que se come parte de la figura → ajustar `slot`/`rows`.

No cambiar `bodySize`, `SIDE` ni `BODY`: los fija la spec. Si el usuario pide otro tamaño, parar y tratarlo como cambio de spec.

Tras cada ajuste:

Run: `node tools/gen-fire-bosses.mjs && node tools/preview-fire-bosses.mjs .playwright-mcp/fire-bosses-proto.png && node --test tests/sprites/fireBosses.test.js`
Expected: generador sin errores y tests PASS. Reenviar el preview.

Repetir hasta que el usuario apruebe explícitamente los dos sprites.

- [ ] **Step 3: Commit**

```bash
git add tools/fire-bosses-figures.mjs src/data/sprites/partsFireBosses.js
git commit -m "feat(fire): ajustes del prototipo Pyra + Ignatius aprobados por el usuario"
```

---

### Task 5: Vesta, Favilla y la Escolta + GATE de revisión

> La parte de revisión (Steps 3–4) la ejecuta la **sesión principal**.

**Files:**
- Modify: `tools/fire-bosses-figures.mjs`, `src/data/sprites/partsFireBosses.js` (regenerado)

**Interfaces:**
- Produces: `FIGURES` y `FIRE_BOSS_META` con las 5 claves en este orden: `pyra, vesta, favilla, ignatius, escolta_templo`.

- [ ] **Step 1: Añadir las figuras**

En `tools/fire-bosses-figures.mjs`, sustituir `FIGURES` por lo siguiente, **conservando exactamente** los parámetros aprobados en la Task 4 para `pyra` e `ignatius` (si allí se añadió un `extra`, se copia):

```js
const BG_ESCOLTA = [15, 13, 16];

export const FIGURES = {
  pyra:     boss('pyra', [12, 378]),         // ← valores aprobados en Task 4
  vesta:    boss('vesta', [400, 766]),
  favilla:  boss('favilla', [788, 1154]),
  ignatius: boss('ignatius', [1176, 1542]),  // ← valores aprobados en Task 4
  escolta_templo: { ref: ESCOLTA, slot: [110, 610], rows: [112, 630], bodySize: BODY.escolta_templo, minWidth: 32, scale: 0.1, bg: BG_ESCOLTA, bgTol: 24 },
};
```

En `tests/sprites/fireBosses.test.js`, añadir al final:

```js
test('la escolta: cuerpo de 32 y silueta de al menos 32 de ancho', () => {
  assert.equal(FIGURES.escolta_templo.bodySize, 32);
  assert.equal(sizeOf('escolta_templo'), 32);
  assert.ok(silhouette('escolta_templo').w >= 32, `ancho ${silhouette('escolta_templo').w}`);
});
```

- [ ] **Step 2: Generar, testear y preparar los previews**

Run: `node tools/gen-fire-bosses.mjs && node --test tests/sprites/fireBosses.test.js && node tools/preview-fire-bosses.mjs .playwright-mcp/fire-bosses-rest.png vesta,favilla && node tools/preview-fire-bosses.mjs .playwright-mcp/fire-bosses-escolta.png escolta_templo`
Expected: 5 líneas del generador (vesta ≈67×66 body 64, favilla ≈48×51 body 48, escolta ≈32–34 de ancho y ~50 de alto con body 32), tests PASS (7) y dos PNG.

- [ ] **Step 3: Enviar al usuario**

Enviar ambos PNG (SendUserFile) con feedback concreto por figura:
- **vesta (64):** el escudo y el martillo desplazan la masa; si el cuadro cian no cae sobre el torso, proponer `bodyShift`. ¿Se lee la coleta negra sobre el fondo?
- **favilla (48):** túnica dorada y pelo blanco a 48 px: si se funden, proponer `colors` o `glowLum`. ¿Sobreviven las dos llamas y el halo?
- **escolta_templo (32 de ancho):** si la lanza y el escudo se leen a ese tamaño y si el penacho quedó.

- [ ] **Step 4: Iterar hasta el OK explícito**

Mismo procedimiento que en la Task 4, Step 2. Tras cada ajuste:

Run: `node tools/gen-fire-bosses.mjs && node --test tests/sprites/fireBosses.test.js` y regenerar el PNG afectado.

Repetir hasta que el usuario apruebe explícitamente las tres.

- [ ] **Step 5: Commit**

```bash
git add tools/fire-bosses-figures.mjs src/data/sprites/partsFireBosses.js tests/sprites/fireBosses.test.js
git commit -m "feat(fire): generar Vesta, Favilla y la Escolta del Templo desde la referencia"
```

---

### Task 6: Enemigo `escolta_templo` y minions del templo de Fuego

**Files:**
- Modify: `src/data/enemies/fire.js`, `src/data/regions.js`, `src/data/sprites/recipes.js`
- Test: `tests/regions.test.js`, `tests/spriteManifest.test.js`, `tests/sprites/fireBosses.test.js`

**Interfaces:**
- Consumes: `fireBossRecipe` y el sprite `fj_escolta_templo` (Tasks 3 y 5).
- Produces: `ENEMY_TYPES.escolta_templo`; `RECIPES.escolta_templo`; `makeBranch({ …, templeMinions })`.

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `tests/regions.test.js`:

```js
test('fire temple minions are 4 escoltas; the other temples keep 4 villagers', () => {
  assert.deepEqual(REGIONS.fire.levels[7].phases[0].minions, [{ type: 'escolta_templo', count: 4 }]);
  for (const id of ['water', 'air', 'earth']) {
    assert.deepEqual(REGIONS[id].levels[7].phases[0].minions, [{ type: 'villager', count: 4 }], `${id} temple minions`);
  }
});
```

En `tests/spriteManifest.test.js`, dentro del primer test (`'fire: includes wave enemies, bosses, and transitive summons'`), antes de su `});` final:

```js
  // temple minions (nv8): the fire-specific escort
  assert.ok(fire.has('escolta_templo'), 'expected fire to include temple minion escolta_templo');
```

Al final de `tests/sprites/fireBosses.test.js`, importando `ENEMY_TYPES` arriba (`import { ENEMY_TYPES } from '../../src/data/enemies/index.js';`):

```js
test('escolta_templo: mismos stats y comportamiento que villager, cuerpo = radius*2 y receta de hoja', () => {
  const e = ENEMY_TYPES.escolta_templo, v = ENEMY_TYPES.villager;
  for (const k of ['hp', 'speed', 'damage', 'radius']) assert.equal(e[k], v[k], k);
  assert.deepEqual(e.movement, v.movement);
  assert.deepEqual(e.attacks, v.attacks);
  assert.equal(BODY.escolta_templo, e.radius * 2);
  const r = getRecipe('escolta_templo');
  assert.equal(r.static, true);
  assert.deepEqual(r.parts, [{ name: 'fj_escolta_templo' }]);
});
```

y añadir `getRecipe` al import de `recipes.js` de ese archivo: `import { fireBossRecipe, getRecipe } from '../../src/data/sprites/recipes.js';`.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/regions.test.js tests/spriteManifest.test.js tests/sprites/fireBosses.test.js`
Expected: FAIL en los tres casos nuevos (minions `villager`, manifiesto sin la escolta, `ENEMY_TYPES.escolta_templo` indefinido).

- [ ] **Step 3: Implementar**

En `src/data/enemies/fire.js`, dentro de `FIRE_ENEMIES`, tras la entrada `brasa_errante`:

```js
  // --- Temple escort (nv8 minions): villager stats/behavior with fire-temple art ---
  escolta_templo: { key: 'escolta_templo', tex: TEX.warrior, color: COLORS.emberDeep, hp: 20, speed: 90, damage: 8, radius: 16,
    movement: { type: 'chase' }, attacks: [] },
```

En `src/data/sprites/recipes.js`, dentro de `RECIPES`, tras `brasa_errante:   fireAdvancedRecipe('brasa_errante', 'blob'),`:

```js
  escolta_templo:  fireBossRecipe('escolta_templo', 'humanoid'),
```

En `src/data/regions.js`:

1. En la firma de `makeBranch`, añadir `templeMinions = [{ type: 'villager', count: 4 }]` tras `templeBoss = null,`:

```js
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, levelBoss = null, templeBoss = null, templeMinions = [{ type: 'villager', count: 4 }], onClear = null }) {
```

2. En el nivel `temple`, sustituir `minions: [{ type: 'villager', count: 4 }],` por:

```js
      minions: templeMinions,
```

3. En la rama `fire: makeBranch({ … })`, tras `templeBoss: IGNATIUS,`:

```js
    templeMinions: [{ type: 'escolta_templo', count: 4 }],
```

- [ ] **Step 4: Ejecutar tests**

Run: `node --test tests/`
Expected: todo PASS. `tests/sprites/recipes.test.js` ya cubre que la escolta tiene receta con partes conocidas (recorre `FIRE_ENEMIES`) y que forja.

- [ ] **Step 5: Commit**

```bash
git add src/data/enemies/fire.js src/data/regions.js src/data/sprites/recipes.js tests/regions.test.js tests/spriteManifest.test.js tests/sprites/fireBosses.test.js
git commit -m "feat(fire): la Escolta del Templo sustituye a los aldeanos en el templo de Fuego"
```

---

### Task 7: Conectar las recetas de los jefes y retirar el arte viejo

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/sprites/parts.js`, `tests/sprites/recipes.test.js`, `CLAUDE.md`
- Delete: `tools/gen-sisters.mjs`, `tools/gen-ignatius.mjs`

**Interfaces:**
- Consumes: `fireBossRecipe` y las partes `fj_pyra`, `fj_vesta`, `fj_favilla`, `fj_ignatius` (Tasks 3–5).
- Produces: `RECIPES.pyra|vesta|favilla|ignatius` = recetas de hoja estáticas.

- [ ] **Step 1: Actualizar el test de recetas de jefes (falla)**

En `tests/sprites/recipes.test.js`, sustituir el test `'every fire boss has a recipe with known parts'` completo por:

```js
test('every fire boss uses its generated sheet sprite (fj_), static with a body box', () => {
  for (const key of ['pyra', 'vesta', 'favilla', 'ignatius']) {
    assert.ok(hasRecipe(key), `fire boss '${key}' has no recipe`);
    const r = getRecipe(key);
    assert.equal(r.static, true, `${key} static`);
    assert.deepEqual(r.parts, [{ name: `fj_${key}` }], `${key} parts`);
    assert.ok(PARTS[`fj_${key}`], `${key} part exists`);
    assert.ok(r.body && typeof r.body.x === 'number', `${key} body`);
  }
});

test('the old hand-drawn fire boss parts are gone', () => {
  const old = Object.keys(PARTS).filter((n) => /^(pyra|vesta|favilla|ign)_/.test(n));
  assert.deepEqual(old, []);
});
```

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL en los dos tests (las recetas siguen siendo las viejas y las partes viejas existen).

- [ ] **Step 2: Conectar las recetas**

En `src/data/sprites/recipes.js`, sustituir:

```js
  // --- Fire bosses (single-form) ---
  favilla:  { archetype: 'boss', size: 96, baseColor: 0xffca28, accent: 0xffd54f, parts: FAVILLA },
  pyra:     { archetype: 'boss', size: 96, baseColor: 0xe64a19, accent: 0xffd54f, parts: PYRA },
  vesta:    { archetype: 'boss', size: 96, baseColor: 0xff5722, accent: 0xffd54f, parts: VESTA },
  ignatius: { archetype: 'boss', size: 96, baseColor: 0xff7043, accent: 0xffd54f, parts: IGNATIUS },
```

por:

```js
  // --- Fire bosses (single-form), a tamaño real desde referencia ---
  pyra:     fireBossRecipe('pyra', 'boss'),
  vesta:    fireBossRecipe('vesta', 'boss'),
  favilla:  fireBossRecipe('favilla', 'boss'),
  ignatius: fireBossRecipe('ignatius', 'boss'),
```

- [ ] **Step 3: Borrar las listas de partes viejas**

En `src/data/sprites/recipes.js`, borrar estas 9 líneas (comentarios incluidos):

```js
// Fire sisters (bosses). armor/robe/shield = type color; `a` = GOLD trim (recipe
// accent); skin face/hands = skin; hair = red/black/blond; flames/embers = glow;
// hammer = steel.
const PYRA = [{ name: 'pyra_body' }, …];
const VESTA = [{ name: 'vesta_body' }, …];
const FAVILLA = [{ name: 'favilla_body' }, …];
// Ignatius, the Fire King — father of the sisters. armor/robe = type color; `a` = gold;
// skin face/hands = skin; flaming beard = ember; crown/scepter-flame = glow; shaft = steel.
const IGNATIUS = [{ name: 'ign_scepter', palette: 'steel' }, …];
```

Verificar: `grep -n "PYRA\|VESTA\|FAVILLA\|IGNATIUS\|pyra_\|vesta_\|favilla_\|ign_" src/data/sprites/recipes.js`
Expected: sin resultados.

- [ ] **Step 4: Borrar las partes viejas de `parts.js`**

El bloque va desde la línea `  // --- Fire sisters bosses (gen-sisters.mjs) ---` hasta la línea anterior a `  // --- Water monster bosses (gen-waterboss.mjs) ---`. Solo contiene `pyra_*`, `vesta_*`, `favilla_*` e `ign_*` (el bloque de Ignatius va dentro). Borrarlo con:

```bash
node -e "
const fs = require('fs'); const f = 'src/data/sprites/parts.js';
const lines = fs.readFileSync(f, 'utf8').split('\n');
const a = lines.indexOf('  // --- Fire sisters bosses (gen-sisters.mjs) ---');
const b = lines.indexOf('  // --- Water monster bosses (gen-waterboss.mjs) ---');
if (a < 0 || b < 0 || b <= a) throw new Error('markers not found');
const cut = lines.slice(a, b);
const keys = cut.map((l) => (l.match(/^  ([a-zA-Z_]+): \{/) || [])[1]).filter(Boolean);
if (!keys.every((k) => /^(pyra|vesta|favilla|ign)_/.test(k))) throw new Error('unexpected part in block: ' + keys.join(','));
lines.splice(a, b - a);
fs.writeFileSync(f, lines.join('\n'));
console.log('removed', b - a, 'lines,', keys.length, 'parts:', keys.join(' '));
"
```

Expected: `removed ~1087 lines, 21 parts: pyra_body … ign_flame`.

Verificar: `grep -rn "pyra_\|vesta_\|favilla_\|ign_" src tests tools | grep -v "tools/gen-sisters.mjs\|tools/gen-ignatius.mjs"`
Expected: sin resultados. (`favilla_adds` en `bosses/fire.js` es una `capKey`, no una parte: si aparece, se ignora.)

- [ ] **Step 5: Borrar los generadores viejos**

```bash
git rm tools/gen-sisters.mjs tools/gen-ignatius.mjs
```

- [ ] **Step 6: Actualizar `CLAUDE.md`**

En la última viñeta de `## Conventions`, sustituir:

```
Parts generated from reference images (e.g. `partsFireBasics.js` / `partsFireAdvanced.js` by `tools/gen-fire-basics.mjs` / `tools/gen-fire-advanced.mjs`, sharing `tools/lib/sheetParts.mjs`) are never hand-edited.
```

por:

```
Parts generated from reference images (e.g. `partsFireBasics.js` / `partsFireAdvanced.js` / `partsFireBosses.js` by `tools/gen-fire-basics.mjs` / `tools/gen-fire-advanced.mjs` / `tools/gen-fire-bosses.mjs`, sharing `tools/lib/sheetParts.mjs`; bosses use `fitSide` for an exact longest side) are never hand-edited.
```

- [ ] **Step 7: Suite completa y reproducibilidad de las tres hojas**

Run: `node --test tests/ && node tools/gen-fire-basics.mjs && node tools/gen-fire-advanced.mjs && node tools/gen-fire-bosses.mjs && git status --short src/data/sprites/`
Expected: todo PASS; `git status` solo muestra `parts.js` y `recipes.js` (cambios de esta tarea), no los tres módulos generados.

- [ ] **Step 8: Commit**

```bash
git add src/data/sprites/recipes.js src/data/sprites/parts.js tests/sprites/recipes.test.js CLAUDE.md
git commit -m "feat(fire): los jefes usan los sprites nuevos y se retira el arte antiguo"
```

---

### Task 8: Verificación en juego

**Files:** ninguno. Es solo verificación; si aparece un bug, se arregla con su test y su commit propio.

- [ ] **Step 1: Servidor**

Run (en segundo plano): `python3 -m http.server 8000`

- [ ] **Step 2: Forjar Fuego y colocar las tres hermanas solas + la escolta**

Con Playwright: `browser_resize` a 480×854, `browser_navigate` a `http://localhost:8000` y `browser_evaluate`:

```js
async () => {
  const g = window.__game;
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
  g.scene.start('Intro', { regionId: 'fire' });
  const keys = ['pyra', 'vesta', 'favilla', 'ignatius', 'escolta_templo'];
  const t0 = Date.now();
  while (!keys.every((k) => g.textures.exists(`spr_${k}`))) {
    if (Date.now() - t0 > 20000) throw new Error('forge timeout');
    await new Promise((r) => setTimeout(r, 100));
  }
  g.scene.stop('Intro');
  g.scene.start('Game', { regionId: 'fire', levelIndex: 0 });
  await new Promise((r) => setTimeout(r, 800));
  const gs = g.scene.getScene('Game');
  if (gs.spawnEvent) { gs.spawnEvent.remove(false); gs.spawnEvent = null; }
  gs.enemies.getChildren().slice().forEach((e) => e.destroy());
  const { PYRA, VESTA, FAVILLA } = await import('/src/data/bosses/fire.js');
  const { ENEMY_TYPES } = await import('/src/data/enemies/index.js');
  gs.physics.world.drawDebug = true;
  if (!gs.physics.world.debugGraphic) gs.physics.world.createDebugGraphic();
  const spots = [[110, 220], [240, 220], [370, 220]];
  const placed = [PYRA, VESTA, FAVILLA].map((def, i) => {
    gs.spawnBoss(def);
    gs.boss.setPosition(...spots[i]);
    const b = gs.boss;
    return { k: def.key, w: Math.round(b.displayWidth), h: Math.round(b.displayHeight), bw: b.body.width, bh: b.body.height, scale: b.scaleX };
  });
  const e = gs.spawnEnemy(ENEMY_TYPES.escolta_templo);
  e.setPosition(240, 420);
  placed.push({ k: 'escolta_templo', w: Math.round(e.displayWidth), h: Math.round(e.displayHeight), bw: e.body.width, bh: e.body.height, scale: e.scaleX });
  await new Promise((r) => setTimeout(r, 150));
  gs.physics.world.pause();
  return placed;
}
```

Expected: 4 filas con `scale` = 1 y:
- `pyra`: `bw` = `bh` = 48, `max(w, h)` entre 48 y ~54;
- `vesta`: `bw` = `bh` = 64, `max(w, h)` entre 64 y ~70;
- `favilla`: `bw` = `bh` = 48, `max(w, h)` entre 48 y ~54;
- `escolta_templo`: `bw` = `bh` = 32, `w` ≥ 32.

`w`/`h` son el lienzo, que puede tener unas filas o columnas transparentes más que la silueta (lo que el pelado y el despeckle vacían). El lado mayor exacto de la silueta ya lo cubre `tests/sprites/fireBosses.test.js`. En una prueba previa con `bgTol: 24` salieron lienzos de Pyra 48×52, Vesta 67×66, Favilla 48×51 e Ignatius 65×64. Si `spawnBoss` o `spawnEnemy` tienen otra firma, buscarla con `grep -n "^  spawnBoss\|^  spawnEnemy" src/scenes/GameScene.js` y ajustar.

`browser_take_screenshot` (`filename: '.playwright-mcp/fire-bosses-sisters.png'`) y `browser_console_messages`.
Expected: sprites nuevos sin deformar, rectángulos de debug sobre el cuadro del cuerpo, barras de vida encima y sin errores de consola (salvo el 404 de `favicon.ico`).

- [ ] **Step 3: Trío del nv7 con el triángulo**

`browser_evaluate`:

```js
async () => {
  const g = window.__game;
  g.scene.stop('Game'); g.scene.stop('UI');
  g.scene.start('Game', { regionId: 'fire', levelIndex: 6 });
  const t0 = Date.now();
  let gs;
  while (!((gs = g.scene.getScene('Game')) && gs.bosses && gs.bosses.length === 3 && gs.bosses.every((b) => b.y > 80))) {
    if (Date.now() - t0 > 15000) throw new Error('trio did not enter: ' + JSON.stringify((gs?.bosses || []).map((b) => [b.def.key, Math.round(b.y)])));
    const d = g.scene.getScene('Dialogue');
    if (d && g.scene.isActive('Dialogue')) d.input.emit('pointerdown');
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 2500));
  return gs.bosses.map((b) => ({ k: b.def.key, x: Math.round(b.x), y: Math.round(b.y), bw: b.body.width, tex: b.texture.key }));
}
```

Expected: 3 filas `pyra`, `vesta`, `favilla` con `bw` 48/64/48 y texturas de sprite (no `miniboss`/`boss` geométricas). Si el diálogo no avanza con `pointerdown`, buscar su handler con `grep -n "pointerdown\|pointerup" src/scenes/DialogueScene.js` y ajustar.

`browser_take_screenshot` (`filename: '.playwright-mcp/fire-bosses-trio.png'`), idealmente con el triángulo de lava encendido (repetir la captura tras unos segundos si hace falta).

- [ ] **Step 4: Templo nv8: Ignatius + 4 escoltas**

`browser_evaluate`:

```js
async () => {
  const g = window.__game;
  g.scene.stop('Game'); g.scene.stop('UI');
  g.scene.start('Game', { regionId: 'fire', levelIndex: 7 });
  const t0 = Date.now();
  let gs;
  while (!((gs = g.scene.getScene('Game')) && gs.boss && gs.boss.def.key === 'ignatius' && gs.boss.y > 80)) {
    if (Date.now() - t0 > 15000) throw new Error('ignatius did not enter');
    const d = g.scene.getScene('Dialogue');
    if (d && g.scene.isActive('Dialogue')) d.input.emit('pointerdown');
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 1500));
  const escorts = gs.enemies.getChildren().filter((e) => e.def.key === 'escolta_templo');
  return {
    ignatius: { w: Math.round(gs.boss.displayWidth), h: Math.round(gs.boss.displayHeight), bw: gs.boss.body.width, scale: gs.boss.scaleX },
    escorts: escorts.length,
    villagers: gs.enemies.getChildren().filter((e) => e.def.key === 'villager').length,
  };
}
```

Expected: `ignatius` con `scale` 1, `bw` 60 y `max(w, h)` ≥ 64; `escorts` = 4 (o menos si alguno ya murió: comprobar en la captura) y `villagers` = 0.

`browser_take_screenshot` (`filename: '.playwright-mcp/fire-bosses-temple.png'`) y `browser_console_messages` (sin errores).

- [ ] **Step 5: Enviar al usuario**

Enviar las tres capturas (SendUserFile) con un resumen: tests en verde (con el número), tamaños 48/64/48/64 + escolta a escala 1, hitbox sin cambios, trío y templo funcionando y sin errores de consola.

- [ ] **Step 6: Parar el servidor**

Detener el `http.server` en segundo plano.
