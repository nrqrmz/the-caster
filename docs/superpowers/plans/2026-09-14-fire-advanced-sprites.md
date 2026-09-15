# Sprites de los 10 enemigos restantes de Fuego — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir los sprites de `caballero_brasa`, `portaestandarte`, `can_lava`, `coloso_magma`, `elemental_fuego`, `fenix_menor`, `totem_pira`, `avispa_brasa`, `imp_brasa` y `brasa_errante` por sprites estáticos de frente, generados desde `tools/refs/fuego-avanzado.png`, con cuerpo de tamaño real (`radius*2`, escala 1) y el can volteándose hacia la princesa.

**Architecture:** Se reutiliza el pipeline de los básicos (`tools/lib/png.mjs` → `tools/lib/figure.mjs` → módulo de partes GENERADO → receta `static` con `body`). El motor gana dos piezas puras: `body.size` en `displayFor` y `flipLocked(recipe)` para estáticas con `faces: true`. El código de escritura del módulo de partes y del PNG de revisión se extrae a `tools/lib/` y lo comparten `gen-fire-basics` y el nuevo `gen-fire-advanced`.

**Tech Stack:** Phaser 3.80.1 (CDN, ES modules nativos), Node 20 (`node:test`, `node:zlib`), Playwright MCP para la verificación en juego.

**Spec:** `docs/superpowers/specs/2026-09-14-fire-advanced-sprites-design.md`

## Global Constraints

- Sin build, sin bundler, sin paquetes npm en el runtime ni en las herramientas (solo módulos `node:`).
- Móvil vertical, lienzo lógico 480×854.
- Cuerpo del sprite = **`radius*2` px a escala 1**:

  | Enemigo | Radio | Cuerpo |
  |---|---|---|
  | `avispa_brasa`, `imp_brasa`, `brasa_errante` | 16 | 32 |
  | `can_lava` | 17 | 34 |
  | `caballero_brasa`, `portaestandarte` | 18 | 36 |
  | `fenix_menor` | 20 | 40 |
  | `elemental_fuego` | 26 | 52 |
  | `coloso_magma` | 30 | 60 |
  | `totem_pira` | 36 | 72 |

- Sprites **estáticos de frente**: un frame, la misma vista en `down`/`up`/`side`. Nunca se voltean, **salvo `can_lava`** (`faces: true`), que se voltea hacia la princesa.
- Lo que sobresale del cuadro del cuerpo (alas, estandarte, cola, llamas) no cambia la hitbox.
- `src/data/sprites/partsFireBasics.js` y `src/data/sprites/partsFireAdvanced.js` son GENERADOS: nunca se editan a mano. Se edita el generador o el archivo de figuras y se re-ejecuta.
- `partsFireBasics.js` debe quedar **byte a byte idéntico** tras extraer el código compartido.
- Máximo **16 colores** por criatura. Las claves de `colors` son `0-9`/`A-F`.
- Fuera de alcance: animaciones, sprite del fénix renacido y stats o comportamiento.
- Lógica testeable sin Phaser (`src/systems/`, `src/data/`, `tools/lib/`). Los tests usan `node:test` + `node:assert/strict`.
- **Gate visual del usuario:** ninguna receta del juego se conecta sin que el usuario haya aprobado el preview (Tareas 6 y 7). Esas revisiones las ejecuta la **sesión principal**, no un subagente.
- Commits en español, estilo `tipo(ámbito): descripción`, terminando con las líneas de atribución de la sesión.
- Suite de partida: **804 tests en verde** (`node --test`).

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/systems/enemyDisplay.js` | Modificar | `body.size` en `displayFor` |
| `src/objects/FacingController.js` | Modificar | `flipLocked(recipe)`; campo `isStatic` → `lockFlip` |
| `src/objects/Enemy.js` | Modificar | `facing.lockFlip = flipLocked(visualRecipe)` |
| `tools/lib/figure.mjs` | Modificar | `bodySize`, `bodyShift`, `body.size` en el resultado |
| `tools/lib/sheetParts.mjs` | Crear | `renderSheetParts()`: texto del módulo de partes generado |
| `tools/lib/sheetPreview.mjs` | Crear | `renderSheetPreview()`: PNG de revisión |
| `tools/gen-fire-basics.mjs`, `tools/preview-fire-basics.mjs` | Modificar | Usar los módulos compartidos |
| `tools/fire-advanced-figures.mjs` | Crear | Ruta de la referencia + recortes y parámetros por criatura |
| `tools/gen-fire-advanced.mjs` | Crear | Escribe `partsFireAdvanced.js` |
| `tools/preview-fire-advanced.mjs` | Crear | PNG de revisión de la hoja nueva |
| `src/data/sprites/partsFireAdvanced.js` | Generado | `FIRE_ADVANCED_META`, `FIRE_ADVANCED_PARTS` |
| `src/data/sprites/parts.js` | Modificar | Expande `FIRE_ADVANCED_PARTS`; borra partes obsoletas |
| `src/data/sprites/recipes.js` | Modificar | `sheetRecipe()`, `fireAdvancedRecipe()`; 10 recetas; borra constantes obsoletas |
| `tools/gen-beast.mjs` | Borrar | Solo generaba can y coloso |
| `tools/gen-blob.mjs`, `tools/gen-winged.mjs` | Modificar | Quitar elemental/imp y fénix/avispa |
| `tests/enemyDisplay.test.js`, `tests/sprites/FacingController.test.js`, `tests/tools/figure.test.js`, `tests/sprites/recipes.test.js` | Modificar | Nuevos casos |
| `tests/tools/sheetParts.test.js`, `tests/sprites/fireAdvanced.test.js` | Crear | Nuevos tests |

---

### Task 1: `displayFor` — cuadro del cuerpo de lado variable

**Files:**
- Modify: `src/systems/enemyDisplay.js`
- Test: `tests/enemyDisplay.test.js`

**Interfaces:**
- Produces: una receta puede declarar `body: { x, y, size }`. `displayFor(recipe, radius)` devuelve `{ scale: radius*2/size, originX: (x+size/2)/gridW, originY: (y+size/2)/gridH, body: { w: size, h: size, x, y }, half: radius }`. Sin `size`, usa `BODY_PX` (32), igual que hoy.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/enemyDisplay.test.js`:

```js
test('con body.size: el cuadro del cuerpo mide ese lado y con radius*2 = size la escala es 1', () => {
  const r = { gridW: 64, gridH: 70, body: { x: 2, y: 6, size: 60 } };
  assert.deepEqual(displayFor(r, 30), {
    scale: 1,
    originX: 32 / 64,
    originY: 36 / 70,
    body: { w: 60, h: 60, x: 2, y: 6 },
    half: 30,
  });
});

test('con body.size y otro radio: la escala es radius*2/size', () => {
  const d = displayFor({ gridW: 40, gridH: 40, body: { x: 0, y: 0, size: 40 } }, 30);
  assert.equal(d.scale, 60 / 40);
  assert.equal(d.originX, 0.5);
  assert.deepEqual(d.body, { w: 40, h: 40, x: 0, y: 0 });
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/enemyDisplay.test.js`
Expected: FAIL en los dos tests nuevos: `scale` sale `60/32` y `body.w` sale `32`.

- [ ] **Step 3: Implementar**

Sustituir el contenido de `src/systems/enemyDisplay.js` por:

```js
// src/systems/enemyDisplay.js
// PURE (no Phaser). Cómo mostrar el sprite de un enemigo normal según su receta.
// Sin `body`: cuadrado de radius*2 (comportamiento histórico). Con `body`: la rejilla
// tiene un cuadro de cuerpo de size×size (body.size, por defecto BODY_PX) en (body.x, body.y);
// el resto (halo, antorchas, alas) sobresale. La escala es uniforme, el origen cae en el
// centro del cuerpo (x,y del enemigo = centro del cuerpo) y el cuerpo físico cubre solo ese
// cuadro. Con size = radius*2 la escala es 1 (sprite a tamaño real).
export const BODY_PX = 32;

export function displayFor(recipe, radius) {
  if (!recipe || !recipe.body) return { square: radius * 2 };
  const { gridW, gridH, body } = recipe;
  if (typeof gridW !== 'number' || typeof gridH !== 'number') {
    throw new Error('displayFor: recipe with body needs gridW and gridH');
  }
  const size = body.size ?? BODY_PX;
  return {
    scale: (radius * 2) / size,
    originX: (body.x + size / 2) / gridW,
    originY: (body.y + size / 2) / gridH,
    body: { w: size, h: size, x: body.x, y: body.y },
    half: radius,
  };
}
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/enemyDisplay.test.js`
Expected: PASS (7 tests; los 5 antiguos sin cambios).

- [ ] **Step 5: Commit**

```bash
git add src/systems/enemyDisplay.js tests/enemyDisplay.test.js
git commit -m "feat(enemies): displayFor admite cuadros de cuerpo de más de 32 px"
```

---

### Task 2: Estáticas que se voltean (`faces`)

**Files:**
- Modify: `src/objects/FacingController.js`, `src/objects/Enemy.js`
- Test: `tests/sprites/FacingController.test.js`

**Interfaces:**
- Produces:
  - `export function flipLocked(recipe): boolean`: `true` solo si `recipe.static && !recipe.faces`.
  - `FacingController#lockFlip` (antes `isStatic`): si es `true`, nunca llama a `setFlipX`.
  - `Enemy` asigna `this.facing.lockFlip = flipLocked(this.visualRecipe)`.

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/sprites/FacingController.test.js`:
1. Cambiar la línea `import { FacingController } from '../../src/objects/FacingController.js';` por `import { FacingController, flipLocked } from '../../src/objects/FacingController.js';`.
2. En los tests `'receta estática: moverse a la izquierda no voltea'` y `'receta estática con facePlayer: tampoco voltea'`, cambiar `fc.isStatic = true;` por `fc.lockFlip = true;`.
3. Añadir al final:

```js
test('flipLocked: solo las recetas estáticas sin faces bloquean el volteo', () => {
  assert.equal(flipLocked({ static: true }), true);
  assert.equal(flipLocked({ static: true, faces: true }), false);
  assert.equal(flipLocked({ archetype: 'beast', flip: true }), false);
  assert.equal(flipLocked(null), false);
});

test('estática con faces + facePlayer: se voltea hacia la princesa en ambos sentidos', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'can_lava');
  fc.lockFlip = flipLocked({ static: true, faces: true });
  fc.facePlayer = true;
  fc.update(0, 0, { x: 10, y: 100 });   // princesa claramente a la izquierda
  fc.update(0, 0, { x: 190, y: 100 });  // y luego claramente a la derecha
  assert.deepEqual(s.calls.flip, [true, false]);
  assert.deepEqual(s.calls.play, ['can_lava-idle-side', 'can_lava-idle-side']);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/FacingController.test.js`
Expected: FAIL. `flipLocked` no existe (SyntaxError de import) y, con `lockFlip`, los tests estáticos voltean.

- [ ] **Step 3: Implementar en `FacingController.js`**

Justo después de `facePlayerFlip` (antes de `const MOVE_EPS`), añadir:

```js
// PURE. ¿La receta bloquea el volteo? Una receta estática es una vista de frente fija que
// nunca se voltea; `faces: true` marca una estática de perfil (dibujada mirando a la
// derecha, la convención de 'side') que sí se voltea.
export function flipLocked(recipe) {
  return !!(recipe && recipe.static && !recipe.faces);
}
```

En el constructor, sustituir:

```js
    this.isStatic = false;   // receta estática: una sola vista de frente, nunca se voltea
```

por:

```js
    this.lockFlip = false;   // nunca voltear (receta estática sin faces, ver flipLocked)
```

Sustituir las **dos** apariciones de `if (!this.isStatic) this.sprite.setFlipX(` por `if (!this.lockFlip) this.sprite.setFlipX(`.

- [ ] **Step 4: Implementar en `Enemy.js`**

Cambiar `import { FacingController } from './FacingController.js';` por `import { FacingController, flipLocked } from './FacingController.js';`, y sustituir:

```js
      this.facing.isStatic = !!this.visualRecipe.static;
```

por:

```js
      this.facing.lockFlip = flipLocked(this.visualRecipe);
```

Run: `grep -rn "isStatic" src tests`
Expected: sin resultados.

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/FacingController.test.js tests/FacingController.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/objects/FacingController.js src/objects/Enemy.js tests/sprites/FacingController.test.js
git commit -m "feat(sprites): las recetas estáticas con faces se voltean hacia la princesa"
```

---

### Task 3: `convertFigure` — `bodySize` y `bodyShift`

**Files:**
- Modify: `tools/lib/figure.mjs`
- Test: `tests/tools/figure.test.js`

**Interfaces:**
- Produces: `convertFigure(img, fig)` acepta:
  - `fig.bodySize`: entero ≥ 1, por defecto `BODY` (32);
  - `fig.bodyShift`: `[dx, dy]`, por defecto `[0, 0]`. Se suma al centrado en cada eje donde la figura mide al menos `bodySize`, y después se contiene dentro de la silueta; en un eje más pequeño que el cuadro se ignora.
  
  El resultado pasa a ser `{ gridW, gridH, body: { x, y, size }, colors, rows }`. `DEFAULTS.minWidth` sigue siendo 0.

- [ ] **Step 1: Actualizar los tests existentes y escribir los nuevos**

En `tests/tools/figure.test.js`, las tres aserciones de `body` pasan a incluir `size: 32`:
- `assert.deepEqual(r.body, { x: 0, y: 0 });` → `assert.deepEqual(r.body, { x: 0, y: 0, size: 32 });`
- `assert.deepEqual(r.body, { x: 0, y: 24 });` → `assert.deepEqual(r.body, { x: 0, y: 24, size: 32 });`
- `assert.deepEqual(r.body, { x: 0, y: 22 });` → `assert.deepEqual(r.body, { x: 0, y: 22, size: 32 });`

Añadir al final:

```js
test('convertFigure: bodySize fija el lado del cuadro del cuerpo, centrado en la masa', () => {
  const img = sheet(80, 100);
  fill(img, 10, 5, 69, 94, RED);      // silueta uniforme 60×90, masa en (29.5, 44.5)
  const r = convertFigure(img, { slot: [0, 79], rows: [0, 99], scale: 1, peel: 0, bodySize: 48 });
  assert.deepEqual([r.gridW, r.gridH], [60, 90]);
  assert.deepEqual(r.body, { x: 6, y: 21, size: 48 });
});

test('convertFigure: figura menor que bodySize → el lienzo crece hasta el cuadro', () => {
  const img = sheet(40, 40);
  fill(img, 10, 5, 29, 34, RED);      // silueta 20×30
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0, bodySize: 48 });
  assert.deepEqual([r.gridW, r.gridH], [48, 48]);
  assert.deepEqual(r.body, { x: 0, y: 0, size: 48 });
  assert.equal(r.rows.length, 48);
  assert.ok(r.rows.every((row) => row.length === 48));
});

test('convertFigure: bodyShift desplaza el cuadro tras centrarlo y lo mantiene dentro de la silueta', () => {
  const img = sheet(60, 90);
  fill(img, 10, 5, 41, 84, RED);      // silueta 32×80: sin desplazar, body y = 24
  const base = { slot: [0, 59], rows: [0, 89], scale: 1, peel: 0 };
  assert.deepEqual(convertFigure(img, { ...base, bodyShift: [0, -10] }).body, { x: 0, y: 14, size: 32 });
  assert.deepEqual(convertFigure(img, { ...base, bodyShift: [5, -100] }).body, { x: 0, y: 0, size: 32 });
});

test('convertFigure: bodySize inválido lanza error', () => {
  const img = sheet(40, 40);
  fill(img, 5, 5, 34, 34, RED);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, bodySize: 0 }), /bodySize/);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, bodySize: 33.5 }), /bodySize/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/tools/figure.test.js`
Expected: FAIL. Las aserciones con `size: 32` fallan porque `body` no trae `size`, y los cuatro tests nuevos fallan.

- [ ] **Step 3: Implementar**

En `tools/lib/figure.mjs`:

1. Cabecera: sustituir `// despeckle, contorno, ancho mínimo y caja del cuerpo de 32×32 centrada en la silueta.` por `// despeckle, contorno, ancho mínimo y caja del cuerpo (bodySize×bodySize) centrada en la silueta.`
2. En `DEFAULTS`, tras la línea de `minWidth`, añadir:

```js
  bodySize: 32,     // lado del cuadro del cuerpo (radius*2 del enemigo; 32 = básicos)
  bodyShift: [0, 0], // desplazamiento del cuadro tras centrarlo (se contiene en la silueta)
```

3. En el comentario de firma, sustituir `// fig: { slot: [x0, x1], rows: [y0, y1], scale, minWidth?, ...DEFAULTS overrides, overrides: [[x, y, 0xRRGGBB | null], …] }` y la línea `// → { gridW, gridH, body: { x, y }, colors: { char: int }, rows: string[] }` por:

```js
// fig: { slot: [x0, x1], rows: [y0, y1], scale, minWidth?, bodySize?, bodyShift?, ...DEFAULTS overrides, overrides: [[x, y, 0xRRGGBB | null], …] }
// → { gridW, gridH, body: { x, y, size }, colors: { char: int }, rows: string[] }
```

4. Tras la línea `if (o.colors > CHARS.length) throw …`, añadir:

```js
  if (!Number.isInteger(o.bodySize) || o.bodySize < 1) throw new Error(`convertFigure: bodySize ${o.bodySize} must be a positive integer`);
```

5. Sustituir el bloque del paso 8, desde el comentario `// 8. Caja del cuerpo 32×32 …` hasta la línea `const gridW = …, gridH = …;` incluida, por:

```js
  // 8. Caja del cuerpo B×B (B = bodySize) centrada en la masa de la silueta, desplazada por
  // bodyShift. En un eje donde la figura mide menos de B el lienzo crece (en vertical, apoyada
  // abajo) y el desplazamiento se ignora; si mide más, la caja queda dentro.
  const B = o.bodySize, [shiftX, shiftY] = o.bodyShift;
  let sumX = 0, sumY = 0, cnt = 0;
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) if (grid[y][x] != null) { sumX += x; sumY += y; cnt++; }
  const centered = (sum, len) => Math.round((cnt ? sum / cnt : len / 2) + 0.5 - B / 2);
  const clampIn = (v, len) => Math.max(0, Math.min(len - B, v));
  const bx = ow >= B ? clampIn(centered(sumX, ow) + shiftX, ow) : centered(sumX, ow);
  const by = oh >= B ? clampIn(centered(sumY, oh) + shiftY, oh) : oh - B;
  const cx0 = Math.min(0, bx), cy0 = Math.min(0, by);
  const gridW = Math.max(ow, bx + B) - cx0, gridH = Math.max(oh, by + B) - cy0;
```

6. En el `return`, sustituir `body: { x: bx - cx0, y: by - cy0 },` por `body: { x: bx - cx0, y: by - cy0, size: B },`.

Run: `grep -n "BODY" tools/lib/figure.mjs`
Expected: solo `export const BODY = 32;` (se mantiene para los tests y como documentación).

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/tools/figure.test.js tests/sprites/fireBasics.test.js`
Expected: PASS. El test de reproducibilidad de los básicos también pasa, porque `gen-fire-basics.mjs` aún escribe `body` sin `size`.

- [ ] **Step 5: Commit**

```bash
git add tools/lib/figure.mjs tests/tools/figure.test.js
git commit -m "feat(tools): convertFigure admite cuadro del cuerpo de lado variable y desplazamiento"
```

---

### Task 4: Código compartido de hojas — módulo de partes y preview

**Files:**
- Create: `tools/lib/sheetParts.mjs`, `tools/lib/sheetPreview.mjs`, `tests/tools/sheetParts.test.js`
- Modify: `tools/gen-fire-basics.mjs`, `tools/preview-fire-basics.mjs`

**Interfaces:**
- Consumes: resultado de `convertFigure` (Task 3): `{ gridW, gridH, body: { x, y, size }, colors, rows }`.
- Produces:
  - `renderSheetParts(results, { header, prefix, metaName, partsName }): string`. `results` es `[[key, convertFigureResult], …]` y `header` son líneas de comentario literales. `META` escribe `size` solo si `body.size` existe y no es 32.
  - `renderSheetPreview(ref, items, { refScale = 2 } = {}): { width, height, data }`. `ref` es un PNG decodificado e `items` es `[{ fig, recipe, grid }]`, con `grid` = frame `idle-down` forjado. El cuadro del cuerpo se dibuja con lado `recipe.body.size ?? 32`.

- [ ] **Step 1: Guardar las salidas actuales como referencia**

Run: `node tools/preview-fire-basics.mjs .playwright-mcp/basics-preview-before.png && cp src/data/sprites/partsFireBasics.js .playwright-mcp/partsFireBasics-before.js`
Expected: sin errores. `.playwright-mcp/` está en `.gitignore`.

- [ ] **Step 2: Escribir el test que falla**

Crear `tests/tools/sheetParts.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSheetParts } from '../../tools/lib/sheetParts.mjs';

const R = { gridW: 3, gridH: 2, body: { x: 0, y: 1, size: 32 }, colors: { '0': 0x000000, '1': 0xff8000 }, rows: ['01.', '.10'] };
const load = (text) => import('data:text/javascript,' + encodeURIComponent(text));

test('renderSheetParts: módulo importable con META y PARTS', async () => {
  const text = renderSheetParts([['bicho', R]], { header: ['// cabecera'], prefix: 'zz_', metaName: 'M', partsName: 'P' });
  assert.ok(text.startsWith('// cabecera\n\nexport const M = {\n'));
  assert.ok(text.endsWith('};\n'));
  const mod = await load(text);
  assert.deepEqual(mod.M, { bicho: { gridW: 3, gridH: 2, body: { x: 0, y: 1 } } });
  assert.deepEqual(mod.P.zz_bicho, {
    res: 32, w: 3, h: 2, anchor: { x: 0, y: 0 },
    colors: { '0': 0x000000, '1': 0xff8000 },
    down: ['01.', '.10'],
  });
});

test('renderSheetParts: body.size solo se escribe cuando no es 32', async () => {
  const text = renderSheetParts(
    [['grande', { ...R, body: { x: 2, y: 3, size: 60 } }], ['sinsize', { ...R, body: { x: 1, y: 1 } }]],
    { header: [], prefix: 'zz_', metaName: 'M', partsName: 'P' },
  );
  const mod = await load(text);
  assert.deepEqual(mod.M.grande.body, { x: 2, y: 3, size: 60 });
  assert.deepEqual(mod.M.sinsize.body, { x: 1, y: 1 });
});
```

- [ ] **Step 3: Ejecutar y ver que falla**

Run: `node --test tests/tools/sheetParts.test.js`
Expected: FAIL con `Cannot find module …/tools/lib/sheetParts.mjs`.

- [ ] **Step 4: Crear `tools/lib/sheetParts.mjs`**

```js
// tools/lib/sheetParts.mjs
// PURE (no fs). Texto de un módulo de partes GENERADO a partir de resultados de convertFigure.
// Lo usan los generadores por hoja de referencia (gen-fire-basics, gen-fire-advanced).
const hex = (c) => `0x${c.toString(16).padStart(6, '0')}`;
// `size` solo cuando el cuadro del cuerpo no mide 32: los módulos de cuerpo 32 no cambian.
const bodyText = (b) => `{ x: ${b.x}, y: ${b.y}${b.size != null && b.size !== 32 ? `, size: ${b.size}` : ''} }`;

// results: [[key, { gridW, gridH, body, colors, rows }], …] en el orden de salida.
// header: líneas de comentario literales. prefix: prefijo de cada parte ('fb_', 'fa_').
export function renderSheetParts(results, { header, prefix, metaName, partsName }) {
  const lines = [
    ...header,
    '',
    `export const ${metaName} = {`,
    ...results.map(([key, r]) => `  ${key}: { gridW: ${r.gridW}, gridH: ${r.gridH}, body: ${bodyText(r.body)} },`),
    '};',
    '',
    `export const ${partsName} = {`,
  ];
  for (const [key, r] of results) {
    lines.push(
      `  ${prefix}${key}: {`,
      `    res: 32, w: ${r.gridW}, h: ${r.gridH}, anchor: { x: 0, y: 0 },`,
      `    colors: { ${Object.entries(r.colors).map(([ch, c]) => `'${ch}': ${hex(c)}`).join(', ')} },`,
      '    down: [',
      ...r.rows.map((row) => `      '${row}',`),
      '    ],',
      '  },',
    );
  }
  lines.push('};', '');
  return lines.join('\n');
}
```

- [ ] **Step 5: Ejecutar y ver que pasa**

Run: `node --test tests/tools/sheetParts.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: `gen-fire-basics.mjs` usa `renderSheetParts`**

Sustituir el contenido de `tools/gen-fire-basics.mjs` por:

```js
// tools/gen-fire-basics.mjs
// Genera src/data/sprites/partsFireBasics.js desde la referencia de los villanos básicos
// de Fuego (ver tools/fire-basics-figures.mjs). Determinista: re-ejecutarlo sin cambios
// deja el archivo idéntico. Run: node tools/gen-fire-basics.mjs [outPath]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.mjs';
import { convertFigure } from './lib/figure.mjs';
import { renderSheetParts } from './lib/sheetParts.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';

const OUT = process.argv[2] ?? fileURLToPath(new URL('../src/data/sprites/partsFireBasics.js', import.meta.url));

const img = decodePng(readFileSync(REF_PATH));
const results = Object.entries(FIGURES).map(([key, fig]) => [key, convertFigure(img, fig)]);

writeFileSync(OUT, renderSheetParts(results, {
  header: [
    '// src/data/sprites/partsFireBasics.js',
    '// GENERATED by tools/gen-fire-basics.mjs — do not edit by hand; edit the generator (or',
    '// tools/fire-basics-figures.mjs) and re-run. PURE. Villanos básicos de Fuego: sprites',
    '// estáticos de frente, 1 carácter = 1 píxel, colores propios por parte. `body` = esquina',
    '// del cuadro de 32×32 del cuerpo dentro del lienzo (lo demás sobresale).',
  ],
  prefix: 'fb_',
  metaName: 'FIRE_BASIC_META',
  partsName: 'FIRE_BASIC_PARTS',
}));
for (const [key, r] of results) console.log(`${key}: ${r.gridW}×${r.gridH} body(${r.body.x},${r.body.y}) ${Object.keys(r.colors).length} colores`);
```

Run: `node tools/gen-fire-basics.mjs && git diff --exit-code src/data/sprites/partsFireBasics.js`
Expected: salida de 10 líneas y `git diff` sin cambios (exit 0).

- [ ] **Step 7: Crear `tools/lib/sheetPreview.mjs`**

```js
// tools/lib/sheetPreview.mjs
// PURE (no fs). PNG de revisión para el usuario: por criatura, el recorte de la referencia
// (×refScale), el sprite forjado con la receta real (×6, cuadro del cuerpo en cian) y el
// sprite a ×2 sobre fondo oscuro y sobre suelo de lava (tamaño aproximado en móvil).
// ref: PNG decodificado { width, height, data }. items: [{ fig, recipe, grid }].
const S = 6, PAD = 12, BACK = 0x1a1224, DARK = 0x0e0a16, LAVA = 0x4a2a1a, BODYLINE = 0x00e5ff;

export function renderSheetPreview(ref, items, { refScale = 2 } = {}) {
  const refW = (f) => (f.slot[1] - f.slot[0] + 1) * refScale, refH = (f) => (f.rows[1] - f.rows[0] + 1) * refScale;
  const cellW = (it) => refW(it.fig) + PAD + it.recipe.gridW * S + PAD + it.recipe.gridW * 2 + PAD * 3;
  const W = PAD + items.reduce((w, it) => w + cellW(it), 0);
  const H = PAD * 2 + Math.max(...items.map((it) => Math.max(refH(it.fig), it.recipe.gridH * S)));
  const data = new Uint8Array(W * H * 4);
  const set = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    data[i] = (c >> 16) & 255; data[i + 1] = (c >> 8) & 255; data[i + 2] = c & 255; data[i + 3] = 255;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, BACK);
  const blit = (grid, ox, oy, k, ground) => {
    for (let y = 0; y < grid.length * k; y++) for (let x = 0; x < grid[0].length * k; x++) {
      const c = grid[(y / k) | 0][(x / k) | 0];
      set(ox + x, oy + y, c ?? ground);
    }
  };

  let ox = PAD;
  for (const { fig, recipe, grid } of items) {
    for (let y = 0; y < refH(fig); y++) for (let x = 0; x < refW(fig); x++) {
      const i = ((fig.rows[0] + Math.floor(y / refScale)) * ref.width + fig.slot[0] + Math.floor(x / refScale)) * 4;
      set(ox + x, H - PAD - refH(fig) + y, (ref.data[i] << 16) | (ref.data[i + 1] << 8) | ref.data[i + 2]);
    }
    ox += refW(fig) + PAD;
    const top = H - PAD - recipe.gridH * S;
    blit(grid, ox, top, S, DARK);
    const bx = ox + recipe.body.x * S, by = top + recipe.body.y * S, side = (recipe.body.size ?? 32) * S;
    for (let t = 0; t < side; t++) { set(bx + t, by, BODYLINE); set(bx + t, by + side - 1, BODYLINE); set(bx, by + t, BODYLINE); set(bx + side - 1, by + t, BODYLINE); }
    ox += recipe.gridW * S + PAD;
    blit(grid, ox, H - PAD - recipe.gridH * 2 * 2 - PAD, 2, DARK);
    blit(grid, ox, H - PAD - recipe.gridH * 2, 2, LAVA);
    ox += recipe.gridW * 2 + PAD * 3;
  }
  return { width: W, height: H, data };
}
```

- [ ] **Step 8: `preview-fire-basics.mjs` usa `renderSheetPreview`**

Sustituir el contenido de `tools/preview-fire-basics.mjs` por:

```js
// tools/preview-fire-basics.mjs
// PNG de revisión de los villanos básicos de Fuego (ver tools/lib/sheetPreview.mjs).
// Run: node tools/preview-fire-basics.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBasicRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-basics.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const recipe = fireBasicRecipe(key, 'humanoid');
  return { fig: FIGURES[key], recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
writeFileSync(outPath, encodePng(renderSheetPreview(decodePng(readFileSync(REF_PATH)), items, { refScale: 2 })));
```

Run: `node tools/preview-fire-basics.mjs .playwright-mcp/basics-preview-after.png && cmp .playwright-mcp/basics-preview-before.png .playwright-mcp/basics-preview-after.png && echo IDENTICAL`
Expected: `IDENTICAL`.

- [ ] **Step 9: Suite completa**

Run: `node --test`
Expected: PASS. Son 804 + 2 (Task 1) + 2 (Task 2) + 4 (Task 3) + 2 (esta tarea) = **814**.

- [ ] **Step 10: Commit**

```bash
git add tools/lib/sheetParts.mjs tools/lib/sheetPreview.mjs tests/tools/sheetParts.test.js tools/gen-fire-basics.mjs tools/preview-fire-basics.mjs
git commit -m "refactor(tools): módulo de partes y preview de hojas de referencia compartidos"
```

---

### Task 5: Hoja nueva — generador, módulo generado, receta y preview (prototipo: can + coloso + brasa)

**Files:**
- Create: `tools/fire-advanced-figures.mjs`, `tools/gen-fire-advanced.mjs`, `tools/preview-fire-advanced.mjs`, `tests/sprites/fireAdvanced.test.js`
- Generate: `src/data/sprites/partsFireAdvanced.js`
- Modify: `src/data/sprites/parts.js`, `src/data/sprites/recipes.js`

**Interfaces:**
- Consumes: `convertFigure` con `bodySize`/`bodyShift` (Task 3), `renderSheetParts` y `renderSheetPreview` (Task 4).
- Produces:
  - `FIGURES` en `tools/fire-advanced-figures.mjs`: `{ [key]: { slot, rows, bodySize, minWidth, scale, bg, …extra } }`, y `REF_PATH`.
  - `FIRE_ADVANCED_META`: `{ [key]: { gridW, gridH, body: { x, y, size? } } }`.
  - `FIRE_ADVANCED_PARTS`: `{ ['fa_' + key]: part }`, expandidas en `PARTS`.
  - `sheetRecipe(meta, prefix, key, archetype, extra = {})`, que devuelve `{ archetype, static: true, scale: 1, gridW, gridH, body, parts: [{ name: prefix + key }], ...extra }` y lanza `no generated sprite` si falta la clave.
  - `fireBasicRecipe(key, archetype)` y `fireAdvancedRecipe(key, archetype, extra)`, ambas exportadas desde `recipes.js`.

- [ ] **Step 1: Crear `tools/fire-advanced-figures.mjs` (prototipo)**

Los recortes están medidos sobre la referencia: el interior de cada panel, entre el adorno del título y el pie "32 × 32 px".

```js
// tools/fire-advanced-figures.mjs
// Recortes y parámetros por criatura sobre tools/refs/fuego-avanzado.png (1536×1024): 2 filas
// de 5 paneles, una figura por panel. slot = columnas interiores del panel [x0, x1]; rows = filas
// entre el adorno del título y el pie "32 × 32 px". bodySize = radius*2 del enemigo (cuerpo a
// escala 1) y minWidth = bodySize (la silueta nunca es más estrecha que su cuerpo). scale es la
// escala inicial (≈ bodySize / ancho de la figura); minWidth la sube si hace falta. Lo demás
// sobreescribe DEFAULTS de tools/lib/figure.mjs. Lo leen gen- y preview-fire-advanced.
import { fileURLToPath } from 'node:url';

export const REF_PATH = fileURLToPath(new URL('./refs/fuego-avanzado.png', import.meta.url));

const TOP = [144, 428], BOTTOM = [560, 856];
const BG = [13, 12, 15];
const fig = (slot, rows, bodySize, scale, extra = {}) => ({ slot, rows, bodySize, minWidth: bodySize, scale, bg: BG, ...extra });

export const FIGURES = {
  can_lava:      fig([620, 912], TOP, 34, 0.12),
  coloso_magma:  fig([937, 1219], TOP, 60, 0.24),
  brasa_errante: fig([1244, 1512], BOTTOM, 32, 0.15),
};
```

- [ ] **Step 2: Crear `tools/gen-fire-advanced.mjs` y generar**

```js
// tools/gen-fire-advanced.mjs
// Genera src/data/sprites/partsFireAdvanced.js desde la referencia de los enemigos restantes
// de Fuego (ver tools/fire-advanced-figures.mjs). Determinista: re-ejecutarlo sin cambios
// deja el archivo idéntico. Run: node tools/gen-fire-advanced.mjs [outPath]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.mjs';
import { convertFigure } from './lib/figure.mjs';
import { renderSheetParts } from './lib/sheetParts.mjs';
import { REF_PATH, FIGURES } from './fire-advanced-figures.mjs';

const OUT = process.argv[2] ?? fileURLToPath(new URL('../src/data/sprites/partsFireAdvanced.js', import.meta.url));

const img = decodePng(readFileSync(REF_PATH));
const results = Object.entries(FIGURES).map(([key, fig]) => [key, convertFigure(img, fig)]);

writeFileSync(OUT, renderSheetParts(results, {
  header: [
    '// src/data/sprites/partsFireAdvanced.js',
    '// GENERATED by tools/gen-fire-advanced.mjs — do not edit by hand; edit the generator (or',
    '// tools/fire-advanced-figures.mjs) and re-run. PURE. Enemigos restantes de Fuego: sprites',
    '// estáticos de frente, 1 carácter = 1 píxel, colores propios por parte. `body` = esquina y',
    '// lado (size = radius*2; 32 si falta) del cuadro del cuerpo dentro del lienzo.',
  ],
  prefix: 'fa_',
  metaName: 'FIRE_ADVANCED_META',
  partsName: 'FIRE_ADVANCED_PARTS',
}));
for (const [key, r] of results) console.log(`${key}: ${r.gridW}×${r.gridH} body(${r.body.x},${r.body.y},${r.body.size}) ${Object.keys(r.colors).length} colores`);
```

Run: `node tools/gen-fire-advanced.mjs`
Expected: 3 líneas. Los valores aproximados son `can_lava` ≈ 34×34 con body size 34, `coloso_magma` ≈ 60×65 con size 60 y `brasa_errante` ≈ 32×42 con size 32, cada uno con ≤16 colores. Si un `convertFigure` lanza error (por ejemplo `colors > 16`), bajar `colors` en esa figura (`fig(…, { colors: 10 })`) y re-ejecutar.

- [ ] **Step 3: Escribir el test que falla**

Crear `tests/sprites/fireAdvanced.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_ADVANCED_META, FIRE_ADVANCED_PARTS } from '../../src/data/sprites/partsFireAdvanced.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireAdvancedRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { ENEMY_TYPES } from '../../src/data/enemies/index.js';
import { FIGURES } from '../../tools/fire-advanced-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-advanced.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireAdvanced.js', import.meta.url));
const sizeOf = (key) => FIRE_ADVANCED_META[key].body.size ?? 32;

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_ADVANCED_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fa_${key}`], FIRE_ADVANCED_PARTS[`fa_${key}`]);
});

test('cada figura: bodySize y minWidth = radius*2 del enemigo, y el módulo generado lo respeta', () => {
  for (const [key, f] of Object.entries(FIGURES)) {
    const want = ENEMY_TYPES[key].radius * 2;
    assert.equal(f.bodySize, want, `${key} bodySize`);
    assert.equal(f.minWidth, want, `${key} minWidth`);
    assert.equal(sizeOf(key), want, `${key} body.size generado`);
  }
});

test('cada sprite: cuerpo dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_ADVANCED_META)) {
    const p = FIRE_ADVANCED_PARTS[`fa_${key}`], size = sizeOf(key);
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + size <= m.gridW && m.body.y + size <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('cada silueta mide al menos lo que su cuerpo de ancho', () => {
  for (const key of Object.keys(FIRE_ADVANCED_META)) {
    let lo = Infinity, hi = -1;
    for (const row of FIRE_ADVANCED_PARTS[`fa_${key}`].down) {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    }
    assert.ok(hi - lo + 1 >= sizeOf(key), `${key} ancho ${hi - lo + 1} < ${sizeOf(key)}`);
  }
});

test('fireAdvancedRecipe forja un frame estático del tamaño del lienzo y pasa los extras', () => {
  for (const key of Object.keys(FIRE_ADVANCED_META)) {
    const r = fireAdvancedRecipe(key, 'beast');
    assert.equal(r.static, true);
    assert.equal(r.scale, 1);
    assert.deepEqual(r.parts, [{ name: `fa_${key}` }]);
    assert.deepEqual(r.body, FIRE_ADVANCED_META[key].body);
    const out = forge(r, PARTS, derivePalette(0x888888));
    const g = out.anims['idle-down'][0];
    assert.equal(out.anims['walk-side'].length, 1);
    assert.equal(g.length, FIRE_ADVANCED_META[key].gridH);
    assert.equal(g[0].length, FIRE_ADVANCED_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
  const key = Object.keys(FIRE_ADVANCED_META)[0];
  assert.equal(fireAdvancedRecipe(key, 'beast', { faces: true }).faces, true);
});

test('fireAdvancedRecipe lanza con una clave sin sprite generado', () => {
  assert.throws(() => fireAdvancedRecipe('no_existe', 'beast'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fire-advanced-'));
  try {
    const out = join(dir, 'parts.js');
    execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
    assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 4: Ejecutar y ver que falla**

Run: `node --test tests/sprites/fireAdvanced.test.js`
Expected: FAIL con `does not provide an export named 'fireAdvancedRecipe'`.

- [ ] **Step 5: Conectar partes y helpers de receta**

En `src/data/sprites/parts.js`, tras `import { FIRE_BASIC_PARTS } from './partsFireBasics.js';`, añadir:

```js
import { FIRE_ADVANCED_PARTS } from './partsFireAdvanced.js';
```

Y tras la línea `  ...FIRE_BASIC_PARTS,`, añadir:

```js

  // Enemigos restantes de Fuego — sprites estáticos a tamaño real, GENERATED by tools/gen-fire-advanced.mjs.
  ...FIRE_ADVANCED_PARTS,
```

En `src/data/sprites/recipes.js`:

1. Sustituir las líneas 3–4 de la cabecera por:

```js
// Also: gridW?/gridH?/scale? for non-square canvases; static? (single front frame,
// never flipped unless faces: true); body? ({x,y,size?} of the body box inside the
// canvas, size defaults to 32 — the rest overflows).
```

2. Tras `import { FIRE_BASIC_META } from './partsFireBasics.js';`, añadir `import { FIRE_ADVANCED_META } from './partsFireAdvanced.js';`.

3. Sustituir el bloque completo de `fireBasicRecipe`, desde su comentario `// Villanos básicos de Fuego: sprite estático…` hasta el `}` de cierre de la función, por:

```js
// Sprite estático de frente generado desde una hoja de referencia (tools/gen-fire-*.mjs).
// Lienzo y cuadro del cuerpo ({x, y, size?}) vienen del módulo generado; `extra` añade
// flags de receta (p. ej. faces: true para una estática de perfil que se voltea).
export function sheetRecipe(meta, prefix, key, archetype, extra = {}) {
  const m = meta[key];
  if (!m) throw new Error(`sheetRecipe: no generated sprite for '${key}' (${prefix})`);
  return {
    archetype, static: true, scale: 1,
    gridW: m.gridW, gridH: m.gridH, body: { ...m.body },
    parts: [{ name: `${prefix}${key}` }],
    ...extra,
  };
}
// Villanos básicos de Fuego (tools/gen-fire-basics.mjs).
export const fireBasicRecipe = (key, archetype) => sheetRecipe(FIRE_BASIC_META, 'fb_', key, archetype);
// Enemigos restantes de Fuego, a tamaño real (tools/gen-fire-advanced.mjs).
export const fireAdvancedRecipe = (key, archetype, extra) => sheetRecipe(FIRE_ADVANCED_META, 'fa_', key, archetype, extra);
```

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/fireAdvanced.test.js tests/sprites/fireBasics.test.js tests/sprites/recipes.test.js tests/sprites/parts.test.js`
Expected: PASS.

- [ ] **Step 7: Crear `tools/preview-fire-advanced.mjs` y generar el preview**

```js
// tools/preview-fire-advanced.mjs
// PNG de revisión de los enemigos restantes de Fuego (ver tools/lib/sheetPreview.mjs). La
// referencia se muestra a ×1 (las figuras ya miden ~280 px de alto).
// Run: node tools/preview-fire-advanced.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { REF_PATH, FIGURES } from './fire-advanced-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireAdvancedRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-advanced.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const recipe = fireAdvancedRecipe(key, 'beast');
  return { fig: FIGURES[key], recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
writeFileSync(outPath, encodePng(renderSheetPreview(decodePng(readFileSync(REF_PATH)), items, { refScale: 1 })));
```

Run: `node tools/preview-fire-advanced.mjs .playwright-mcp/fire-advanced-proto.png`
Expected: sin errores. Se escribe el PNG.

- [ ] **Step 8: Suite completa**

Run: `node --test`
Expected: PASS, **821** (814 + 7).

- [ ] **Step 9: Commit**

```bash
git add tools/fire-advanced-figures.mjs tools/gen-fire-advanced.mjs tools/preview-fire-advanced.mjs src/data/sprites/partsFireAdvanced.js src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/fireAdvanced.test.js
git commit -m "feat(fire): generador de los enemigos restantes desde referencia — prototipo can + coloso + brasa"
```

---

### Task 6: GATE — revisión del prototipo con el usuario

> Esta tarea la ejecuta la **sesión principal**, porque requiere conversación con el usuario. Todavía no se conectan las recetas del juego.

**Files:**
- Modify: `tools/fire-advanced-figures.mjs` (parámetros, `bodyShift` y `overrides`), `src/data/sprites/partsFireAdvanced.js` (regenerado)

- [ ] **Step 1: Enviar el preview**

Leer `.playwright-mcp/fire-advanced-proto.png` y enviarlo al usuario (SendUserFile). Explicar qué muestra cada columna: referencia ×1, sprite ×6 con el cuerpo en cian y sprite ×2 sobre fondo oscuro y sobre lava. Pedir feedback concreto sobre:
- **can_lava:** si se lee a 34 px y si la cabeza y la cola sobresalen bien del cuadro;
- **coloso_magma:** detalle de las grietas y el núcleo, y si la sombra de los pies quedó fuera;
- **brasa_errante:** si las llamas sobreviven y si se echa de menos alguna chispa.

- [ ] **Step 2: Iterar hasta el OK explícito**

Por cada comentario, ajustar en `FIGURES` solo los parámetros de esa criatura. Cuarto argumento de `fig` = `scale`, quinto = `extra`:
- sombra o fondo pegado a la figura → `bgTol` (por defecto 14; subir en pasos de 6);
- halo oscuro sucio o cuerpo oscuro que desaparece → `peel` / `peelLum` (criaturas oscuras: `peel: 0`);
- ojos, grietas o llamas apagados → `glowWeight` / `glowLum`;
- colores pobres o manchados → `colors` (≤16);
- hitbox descentrada → `bodyShift: [dx, dy]`;
- píxeles concretos → `overrides: [[x, y, 0xRRGGBB | null], …]`, en coordenadas del lienzo. Se leen en la columna ×6 dividiendo entre 6.

No cambiar `bodySize` ni `minWidth`: son `radius*2` y los fija la spec. Si el usuario pide otro tamaño, parar y tratarlo como cambio de spec.

Tras cada ajuste:

Run: `node tools/gen-fire-advanced.mjs && node tools/preview-fire-advanced.mjs .playwright-mcp/fire-advanced-proto.png && node --test tests/sprites/fireAdvanced.test.js`
Expected: generador sin errores y tests PASS. Reenviar el preview.

Repetir hasta que el usuario apruebe explícitamente los tres sprites.

- [ ] **Step 3: Commit**

```bash
git add tools/fire-advanced-figures.mjs src/data/sprites/partsFireAdvanced.js
git commit -m "feat(fire): ajustes del prototipo can + coloso + brasa aprobados por el usuario"
```

---

### Task 7: Las 7 figuras restantes + GATE de revisión

> La parte de revisión (Steps 3–4) la ejecuta la **sesión principal**.

**Files:**
- Modify: `tools/fire-advanced-figures.mjs`, `src/data/sprites/partsFireAdvanced.js` (regenerado)

**Interfaces:**
- Produces: `FIGURES` y `FIRE_ADVANCED_META` con las 10 claves en este orden, el de la referencia: `caballero_brasa, portaestandarte, can_lava, coloso_magma, elemental_fuego, fenix_menor, totem_pira, avispa_brasa, imp_brasa, brasa_errante`.

- [ ] **Step 1: Añadir las figuras**

En `tools/fire-advanced-figures.mjs`, sustituir `FIGURES` por lo siguiente. Hay que **conservar exactamente** los parámetros aprobados en la Task 6 para `can_lava`, `coloso_magma` y `brasa_errante`; si allí se añadió un `extra`, se copia.

```js
export const FIGURES = {
  caballero_brasa: fig([24, 297], TOP, 36, 0.18),
  portaestandarte: fig([322, 595], TOP, 36, 0.17),
  can_lava:        fig([620, 912], TOP, 34, 0.12),     // ← valores aprobados en Task 6
  coloso_magma:    fig([937, 1219], TOP, 60, 0.24),    // ← valores aprobados en Task 6
  elemental_fuego: fig([1244, 1512], TOP, 52, 0.25),
  fenix_menor:     fig([24, 297], BOTTOM, 40, 0.16),
  totem_pira:      fig([322, 595], BOTTOM, 72, 0.43),
  avispa_brasa:    fig([620, 912], BOTTOM, 32, 0.14),
  imp_brasa:       fig([937, 1219], BOTTOM, 32, 0.16),
  brasa_errante:   fig([1244, 1512], BOTTOM, 32, 0.15), // ← valores aprobados en Task 6
};
```

- [ ] **Step 2: Generar, testear y preparar el preview**

Run: `node tools/gen-fire-advanced.mjs && node --test tests/sprites/fireAdvanced.test.js && node tools/preview-fire-advanced.mjs .playwright-mcp/fire-advanced-rest.png caballero_brasa,portaestandarte,elemental_fuego,fenix_menor && node tools/preview-fire-advanced.mjs .playwright-mcp/fire-advanced-rest2.png totem_pira,avispa_brasa,imp_brasa`
Expected: 10 líneas del generador, tests PASS y dos PNG. Se parte en dos porque un solo PNG con 7 criaturas sería demasiado ancho para revisarlo.

- [ ] **Step 3: Enviar al usuario**

Enviar ambos PNG (SendUserFile) con feedback concreto por criatura. Avisar explícitamente de lo siguiente:
- **totem_pira:** con cuerpo de 72 y silueta de ≥72 de ancho, el sprite mide unos **72×120 px**, un 14 % del alto de la pantalla. Preguntar si se acepta o si se prefiere bajar su `minWidth`. Bajarlo es cambio de spec: el cuadro del cuerpo sobresaldría a los lados de la silueta.
- **portaestandarte:** si el cuadro del cuerpo (cian) se desplazó hacia la bandera, proponer `bodyShift`.
- **avispa_brasa:** si las alas finas se leen a 32 px.

- [ ] **Step 4: Iterar hasta el OK explícito**

Mismo procedimiento que en la Task 6, Step 2. Tras cada ajuste:

Run: `node tools/gen-fire-advanced.mjs && node --test tests/sprites/fireAdvanced.test.js` y regenerar el PNG afectado.

Repetir hasta que el usuario apruebe explícitamente los 7.

- [ ] **Step 5: Commit**

```bash
git add tools/fire-advanced-figures.mjs src/data/sprites/partsFireAdvanced.js
git commit -m "feat(fire): generar los 7 enemigos restantes desde la referencia"
```

---

### Task 8: Conectar las 10 recetas y retirar el arte obsoleto

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/sprites/parts.js`, `tools/gen-blob.mjs`, `tools/gen-winged.mjs`
- Delete: `tools/gen-beast.mjs`
- Test: `tests/sprites/recipes.test.js`

**Interfaces:**
- Consumes: `fireAdvancedRecipe` (Task 5), `FIRE_ADVANCED_META` con las 10 claves (Task 7), `flipLocked` (Task 2).
- Produces: `getRecipe(key)` de los 10 devuelve la receta generada; `can_lava` lleva `faces: true`.

- [ ] **Step 1: Escribir los tests que fallan**

Al final de `tests/sprites/recipes.test.js`, añadir:

```js
import { FIRE_ADVANCED_META } from '../../src/data/sprites/partsFireAdvanced.js';
import { ENEMY_TYPES } from '../../src/data/enemies/index.js';
import { flipLocked } from '../../src/objects/FacingController.js';

const FIRE_ADVANCED_KEYS = [
  'caballero_brasa', 'portaestandarte', 'can_lava', 'coloso_magma', 'elemental_fuego',
  'fenix_menor', 'totem_pira', 'avispa_brasa', 'imp_brasa', 'brasa_errante',
];

test('los 10 enemigos restantes de Fuego usan su sprite generado estático a tamaño real', () => {
  assert.deepEqual(Object.keys(FIRE_ADVANCED_META), FIRE_ADVANCED_KEYS);
  for (const key of FIRE_ADVANCED_KEYS) {
    const r = getRecipe(key);
    assert.equal(r.static, true, `${key} static`);
    assert.deepEqual(r.parts, [{ name: `fa_${key}` }], `${key} parts`);
    assert.deepEqual(r.body, FIRE_ADVANCED_META[key].body, `${key} body`);
    assert.equal(r.body.size ?? 32, ENEMY_TYPES[key].radius * 2, `${key} body = radius*2`);
    assert.equal(r.flip, undefined, `${key} sin espejado de frames`);
    assert.equal(flipLocked(r), key !== 'can_lava', `${key} volteo`);
    const g = forge(r, PARTS, paletteFor(key, 0x888888)).anims['idle-down'][0];
    assert.equal(g.length, r.gridH);
    assert.equal(g[0].length, r.gridW);
  }
});

test('el arte antiguo de los enemigos restantes de Fuego ya no existe', () => {
  for (const name of [
    'banner',
    'can_body', 'can_glow', 'can_horns', 'can_eyes',
    'coloso_body', 'coloso_core', 'coloso_horns', 'coloso_eyes',
    'fuego_body', 'fuego_core', 'fuego_eyes',
    'imp_body', 'imp_horns', 'imp_eyes',
    'fenix_body', 'fenix_crest', 'fenix_eyes',
    'avispa_body', 'avispa_wings', 'avispa_eyes',
  ]) {
    assert.equal(PARTS[name], undefined, `${name} should be removed`);
  }
});

test('las recetas de otros mundos que compartían arte con Fuego siguen forjando', () => {
  for (const key of ['warrior', 'centinela_piedra', 'fuego_fatuo', 'fuego_fatuo_pantano']) {
    const g = forge(getRecipe(key), PARTS, paletteFor(key, 0x888888)).anims['idle-down'][0];
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL en los dos primeros tests: las recetas aún usan `KNIGHT`/`CAN_LAVA`/… y las partes antiguas existen. El tercero pasa.

- [ ] **Step 3: Conectar las recetas**

En `RECIPES` de `src/data/sprites/recipes.js`, sustituir estas líneas:

```js
  caballero_brasa: { archetype: 'humanoid', size: 64, parts: KNIGHT },
```
```js
  portaestandarte: { archetype: 'humanoid', size: 64, parts: KNIGHT_BANNER },
```
```js
  can_lava:        { archetype: 'beast', size: 64, parts: CAN_LAVA, flip: true },
  elemental_fuego: { archetype: 'blob', size: 64, parts: FUEGO_ELEM },
  coloso_magma:    { archetype: 'beast', size: 64, parts: COLOSO },
  fenix_menor:     { archetype: 'floating', size: 64, parts: FENIX },
```
```js
  imp_brasa:       { archetype: 'blob', size: 32, parts: IMP },
  avispa_brasa:    { archetype: 'floating', size: 32, parts: AVISPA },
  totem_pira:      { archetype: 'floating', size: 64, parts: TOTEM_FIRE },
  brasa_errante:   { archetype: 'blob', size: 32, parts: BRASA },
```

por, respectivamente:

```js
  caballero_brasa: fireAdvancedRecipe('caballero_brasa', 'humanoid'),
```
```js
  portaestandarte: fireAdvancedRecipe('portaestandarte', 'humanoid'),
```
```js
  can_lava:        fireAdvancedRecipe('can_lava', 'beast', { faces: true }),
  elemental_fuego: fireAdvancedRecipe('elemental_fuego', 'blob'),
  coloso_magma:    fireAdvancedRecipe('coloso_magma', 'beast'),
  fenix_menor:     fireAdvancedRecipe('fenix_menor', 'floating'),
```
```js
  imp_brasa:       fireAdvancedRecipe('imp_brasa', 'blob'),
  avispa_brasa:    fireAdvancedRecipe('avispa_brasa', 'floating'),
  totem_pira:      fireAdvancedRecipe('totem_pira', 'floating'),
  brasa_errante:   fireAdvancedRecipe('brasa_errante', 'blob'),
```

- [ ] **Step 4: Borrar las constantes obsoletas de `recipes.js`**

Confirmar primero que solo quedan sus definiciones:

Run: `grep -nwE "KNIGHT_BANNER|CAN_LAVA|COLOSO|FUEGO_ELEM|FENIX|IMP|AVISPA" src/data/sprites/recipes.js`
Expected: exactamente 7 líneas, todas `const X = [...]`. Si aparece otro uso, parar e informar.

Borrar esas 7 líneas `const`. Después, dejar los comentarios de familia sin menciones a lo borrado:
- Borrar las dos líneas de comentario justo encima de `CAN_LAVA` (`// Fire beasts. body = type color; …` y `// horns = \`bone\` …`), porque la familia queda vacía.
- Sustituir las tres líneas de comentario encima de `TOTEM_FIRE`, de `// Winged / floating. …` a `// eye (glow for fire, orbblue for frost) — one body serves both variants.`, por:

```js
// Totem: a columnar pole with a recessed `shadow` face + a glowing eye (glow for the
// stone sentinel, orbblue for frost) — one body serves both variants.
```

- [ ] **Step 5: Borrar las partes obsoletas de `parts.js`**

Confirmar que nada fuera de `parts.js` (y de los generadores que se limpian abajo) las usa:

Run: `grep -rnwE "banner|can_(body|glow|horns|eyes)|coloso_(body|core|horns|eyes)|fuego_(body|core|eyes)|imp_(body|horns|eyes)|fenix_(body|crest|eyes)|avispa_(body|wings|eyes)" src tests --include='*.js' | grep -v "^src/data/sprites/parts.js" | grep -v "should be removed" | grep -v "'banner',"`
Expected: sin resultados. Si aparece alguno, parar e informar.

Borrar los 21 bloques con este script de un solo uso. Cada bloque va desde `  <nombre>: {` hasta la siguiente línea que sea exactamente `  },`:

```bash
node -e '
const fs = require("fs");
const file = "src/data/sprites/parts.js";
const names = ["banner","can_body","can_glow","can_horns","can_eyes","coloso_body","coloso_core","coloso_horns","coloso_eyes","fuego_body","fuego_core","fuego_eyes","imp_body","imp_horns","imp_eyes","fenix_body","fenix_crest","fenix_eyes","avispa_body","avispa_wings","avispa_eyes"];
let lines = fs.readFileSync(file, "utf8").split("\n");
for (const n of names) {
  const start = lines.indexOf(`  ${n}: {`);
  if (start < 0) throw new Error("no encontrado: " + n);
  const end = lines.indexOf("  },", start);
  if (end < 0) throw new Error("sin cierre: " + n);
  lines.splice(start, end - start + 1);
}
fs.writeFileSync(file, lines.join("\n"));
console.log("borrados", names.length);
'
```

Expected: `borrados 21`.

Después, revisar los comentarios que quedaron huérfanos:

Run: `grep -nE "Banner|gen-beast|Fire beast archetype|fenix|avispa|phoenix|wasp|elemental|imp\b" src/data/sprites/parts.js`
Expected: borrar las líneas de comentario que solo presentaban lo eliminado:
- `// Banner/flag overlay — standard bearer flag to one side.`;
- `// --- Fire beast archetype (gen-beast.mjs) ---`;
- cualquier encabezado de sección que ya no tenga partes debajo.

Si un encabezado cubre también partes que siguen existiendo (por ejemplo, un bloque de blobs con `ceniza_*`/`brasa_*` o uno de voladores con `totem_*`), editarlo para quitar solo la mención a lo borrado. No debe quedar ninguna línea en blanco doble seguida.

- [ ] **Step 6: Limpiar los generadores antiguos**

1. `git rm tools/gen-beast.mjs`. Solo definía `can_*` y `coloso_*` (su objeto `layers` no tiene nada más).
2. En `tools/gen-blob.mjs`:
   - borrar las líneas de cabecera `//   elemental_fuego — …` e `//   imp_brasa       — …`;
   - en `layers`, borrar `fuego_body: {}, fuego_core: {}, fuego_eyes: {},` e `imp_body: {}, imp_horns: {}, imp_eyes: {},`;
   - borrar la sección completa desde `// ============================ ELEMENTAL_FUEGO …` hasta la línea anterior a `// ============================ PEZ_GLOBO …` (incluye la sección `IMP_BRASA`).
3. En `tools/gen-winged.mjs`:
   - borrar las líneas de cabecera `//   fenix_menor — …` y `//   avispa_brasa — …`;
   - sustituir `// Body/wings take the creature's type color; crest/tail = ember+glow, wasp wings =` y la línea siguiente por `// Body takes the creature's type color; totem face = shadow, eye glow|orbblue. Run: node tools/gen-winged.mjs`;
   - sustituir la primera línea `// High-craft winged / floating creatures, each a distinct designed creature:` por `// High-craft floating creatures:`;
   - en `layers`, borrar `fenix_body: {}, fenix_crest: {}, fenix_eyes: {},` y `avispa_body: {}, avispa_wings: {}, avispa_eyes: {},`;
   - borrar la sección desde `// ============================ FENIX_MENOR …` hasta la línea anterior a `// ============================ TOTEM …`.

Run: `node tools/gen-blob.mjs | grep -E "^  [a-z_]+: \{" && node tools/gen-winged.mjs | grep -E "^  [a-z_]+: \{"`
Expected:
- `gen-blob` emite solo partes `ceniza_*`, `globo_*`, `brasa_*` y `burbuja_*`;
- `gen-winged` emite solo `totem_body`, `totem_face` y `totem_eye`;
- ninguno de los dos da error. Si alguna función auxiliar queda sin uso, borrarla.

- [ ] **Step 7: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/recipes.test.js tests/sprites/parts.test.js tests/sprites/fireAdvanced.test.js tests/spriteManifest.test.js tests/waterRoster.test.js`
Expected: PASS.

Run: `node --test`
Expected: PASS, **824** (821 + 3).

- [ ] **Step 8: Commit**

```bash
git add -A src/data/sprites/recipes.js src/data/sprites/parts.js tools/gen-blob.mjs tools/gen-winged.mjs tools/gen-beast.mjs tests/sprites/recipes.test.js
git commit -m "feat(fire): los enemigos restantes usan los sprites nuevos y se retira el arte antiguo"
```

---

### Task 9: Verificación en juego

**Files:** ninguno. Es solo verificación; si aparece un bug, se arregla con su test y su commit propio.

- [ ] **Step 1: Servidor**

Run (en segundo plano): `python3 -m http.server 8000`

- [ ] **Step 2: Cargar Fuego y colocar los 10**

Con Playwright: `browser_resize` a 480×854, `browser_navigate` a `http://localhost:8000` y `browser_evaluate`:

```js
async () => {
  const g = window.__game;
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
  g.scene.start('Intro', { regionId: 'fire' });
  const keys = ['caballero_brasa', 'portaestandarte', 'can_lava', 'coloso_magma', 'elemental_fuego',
    'fenix_menor', 'totem_pira', 'avispa_brasa', 'imp_brasa', 'brasa_errante'];
  const t0 = Date.now();
  while (!keys.every((k) => g.textures.exists(`spr_${k}`))) {
    if (Date.now() - t0 > 20000) throw new Error('forge timeout');
    await new Promise((r) => setTimeout(r, 100));
  }
  g.scene.stop('Intro');
  g.scene.start('Game', { regionId: 'fire', levelIndex: 5 });
  await new Promise((r) => setTimeout(r, 800));
  const gs = g.scene.getScene('Game');
  const { ENEMY_TYPES } = await import('/src/data/enemies.js');
  gs.physics.world.drawDebug = true;
  if (!gs.physics.world.debugGraphic) gs.physics.world.createDebugGraphic();
  const spots = [[70, 170], [180, 170], [300, 170], [410, 190], [90, 330], [220, 330], [370, 360], [80, 520], [200, 520], [320, 520]];
  const placed = keys.map((k, i) => {
    const e = gs.spawnEnemy(ENEMY_TYPES[k]);
    e.setPosition(...spots[i]);
    return { k, w: Math.round(e.displayWidth), h: Math.round(e.displayHeight), bw: e.body.width, bh: e.body.height, scale: e.scaleX };
  });
  await new Promise((r) => setTimeout(r, 150));
  gs.physics.world.pause();
  return placed;
}
```

Expected: 10 filas, cada una con:
- `scale` = 1;
- `bw` = `bh` = `radius*2`: 36, 36, 34, 60, 52, 40, 72, 32, 32, 32;
- `w` ≥ `bw`.

Si falla la textura `spr_brasa_errante` o `spr_imp_brasa`, comprobar que el manifiesto de Fuego las incluye como invocaciones (`tests/spriteManifest.test.js` ya lo cubre).

- [ ] **Step 3: Captura y consola**

`browser_take_screenshot` (`filename: '.playwright-mcp/fire-advanced-ingame.png'`) y `browser_console_messages`.
Expected:
- los 10 sprites nuevos visibles, sin deformar;
- los rectángulos de debug de físicas sobre el cuadro del cuerpo;
- los grandes contenidos en pantalla;
- sin errores de consola (salvo el 404 de `favicon.ico`).

- [ ] **Step 4: Volteo del can**

`browser_evaluate`:

```js
async () => {
  const gs = window.__game.scene.getScene('Game');
  gs.physics.world.resume();
  const can = gs.enemies.getChildren().find((e) => e.def.key === 'can_lava');
  const out = {};
  gs.caster.setPosition(40, 700);  can.setPosition(300, 700); await new Promise((r) => setTimeout(r, 300));
  out.princesaIzquierda = can.flipX;
  gs.caster.setPosition(440, 700); can.setPosition(200, 700); await new Promise((r) => setTimeout(r, 300));
  out.princesaDerecha = can.flipX;
  const otros = gs.enemies.getChildren().filter((e) => e.def.key !== 'can_lava' && e.visualRecipe?.static);
  out.otrosVolteados = otros.filter((e) => e.flipX).map((e) => e.def.key);
  gs.physics.world.pause();
  return out;
}
```

Expected: `{ princesaIzquierda: true, princesaDerecha: false, otrosVolteados: [] }`. Si `gs.enemies` o `gs.caster` tienen otro nombre en `GameScene`, buscarlo con `grep -n "this.enemies =\|this.caster =" src/scenes/GameScene.js` y ajustar.

Tomar una captura con el can mirando a cada lado: `.playwright-mcp/fire-advanced-can-left.png` y `.playwright-mcp/fire-advanced-can-right.png` (volver a colocar y hacer `browser_take_screenshot` tras cada posición).

- [ ] **Step 5: Enviar al usuario**

Enviar las capturas (SendUserFile) con un resumen: tests en verde (con el número), cuerpos alineados a tamaño real, can volteándose y sin errores.

- [ ] **Step 6: Parar el servidor**

Detener el `http.server` en segundo plano.
