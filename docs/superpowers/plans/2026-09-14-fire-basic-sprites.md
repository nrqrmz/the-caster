# Sprites de los villanos básicos de Fuego — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir los sprites de los 10 villanos básicos de Fuego por sprites estáticos de frente, generados desde la referencia `tools/refs/fuego-basicos-small.png`, con capas de colores propios y halos/antorchas que sobresalen del cuadro del cuerpo.

**Architecture:** SpriteForge gana dos capacidades puras (colores por parte y recetas estáticas). Un generador Node sin dependencias (`tools/gen-fire-basics.mjs`, apoyado en `tools/lib/png.mjs` y `tools/lib/figure.mjs`) convierte cada figura en un módulo GENERADO `src/data/sprites/partsFireBasics.js`, que las recetas consumen con `fireBasicRecipe()`. Un helper puro `displayFor()` decide escala/origen/cuerpo físico para que el sprite sobresalga sin deformarse ni cambiar la hitbox.

**Tech Stack:** Phaser 3.80.1 (CDN, ES modules nativos), Node 20 (`node:test`, `node:zlib`), Playwright MCP para la verificación en juego.

**Spec:** `docs/superpowers/specs/2026-09-14-fire-basic-sprites-design.md`

## Global Constraints

- Sin build, sin bundler, sin paquetes npm en el runtime ni en las herramientas (solo módulos `node:`).
- Móvil vertical, lienzo lógico 480×854. Cuerpo del sprite = **32 px** a escala 1 (un carácter de rejilla = un píxel lógico).
- Sprites **estáticos de frente**: un frame, la misma vista en `down`/`up`/`side`, sin volteo horizontal. Nada de perfil, espalda ni caminar.
- Halo, antorchas, llamas y humo **pueden salirse** del cuadro de 32×32; la hitbox sigue siendo el cuerpo.
- `src/data/sprites/partsFireBasics.js` es GENERADO: nunca se edita a mano; se edita el generador o `tools/fire-basics-figures.mjs` y se re-ejecuta.
- Partes con `colors`: caracteres `0-9` y `A-Z` (mayúsculas), máximo **16 colores** por criatura.
- Lógica testeable sin Phaser (`src/systems/`, `src/data/`, `tools/lib/`); tests con `node:test` + `node:assert/strict`.
- Claves de textura vía `spriteKey()` de `config.js`; nunca strings inline.
- **Gate visual del usuario:** ningún sprite se conecta a las recetas del juego sin que el usuario haya aprobado su preview (Tareas 6 y 7). Esas tareas las ejecuta la sesión principal, no un subagente, porque requieren hablar con el usuario.
- Commits en español, estilo `tipo(ámbito): descripción`, terminando con las líneas de atribución de la sesión.

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/systems/SpriteForge.js` | Modificar | `part.colors` y `recipe.static` |
| `src/objects/FacingController.js` | Modificar | `isStatic` → nunca voltea |
| `src/systems/enemyDisplay.js` | Crear | `displayFor(recipe, radius)` puro |
| `src/objects/Enemy.js` | Modificar | `visualRecipe`, `applyDisplay()`, `bodyHalf`, `facing.isStatic` |
| `src/scenes/GameScene.js` | Modificar | 3 `setDisplaySize` → `applyDisplay()`; `containEnemy` usa `bodyHalf` |
| `tools/lib/png.mjs` | Crear | Decodificar/codificar PNG RGBA |
| `tools/lib/figure.mjs` | Crear | `convertFigure`, `medianCut` (puros) |
| `tools/fire-basics-figures.mjs` | Crear | Ruta de la referencia + recortes y parámetros por criatura |
| `tools/gen-fire-basics.mjs` | Crear | Escribe `partsFireBasics.js` |
| `tools/preview-fire-basics.mjs` | Crear | PNG de revisión: referencia + sprite ×6 (con cuadro del cuerpo) + ×2 |
| `src/data/sprites/partsFireBasics.js` | Generado | `FIRE_BASIC_META`, `FIRE_BASIC_PARTS` |
| `src/data/sprites/parts.js` | Modificar | Importa y expande `FIRE_BASIC_PARTS`; borra partes obsoletas |
| `src/data/sprites/recipes.js` | Modificar | `fireBasicRecipe()`; 10 recetas; borra constantes obsoletas |
| `tools/gen-beast.mjs`, `tools/gen-mage.mjs` | Modificar | Quitar larva/salamandra y el garrote |
| `tests/sprites/SpriteForge.test.js`, `tests/sprites/parts.test.js`, `tests/sprites/FacingController.test.js`, `tests/sprites/recipes.test.js` | Modificar | Nuevos casos |
| `tests/enemyDisplay.test.js`, `tests/tools/png.test.js`, `tests/tools/figure.test.js`, `tests/sprites/fireBasics.test.js` | Crear | Nuevos tests |

---

### Task 1: SpriteForge — colores por parte y recetas estáticas

**Files:**
- Modify: `src/systems/SpriteForge.js`
- Test: `tests/sprites/SpriteForge.test.js`, `tests/sprites/parts.test.js`

**Interfaces:**
- Produces: una parte puede declarar `colors: { [char]: 0xRRGGBB }`, que tiene prioridad sobre los roles `o/b/s/h/a`. Una receta con `static: true` hace que `forge()` devuelva `anims` con exactamente `idle-{down,up,side}` y `walk-{down,up,side}`, cada una `[grid]` (1 frame, la vista `down`), sin `attack`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/sprites/SpriteForge.test.js`:

```js
test('composeColorGrid: part.colors tiene prioridad y los roles siguen funcionando', () => {
  const parts = { c: { res: 32, w: 3, h: 1, anchor: { x: 0, y: 0 }, colors: { '1': 0xabcdef, A: 0x123456 }, down: ['1Ab'] } };
  const g = composeColorGrid({ gridW: 3, gridH: 1, parts: ['c'] }, parts, 'down', PAL);
  assert.deepEqual(g[0], [0xabcdef, 0x123456, PAL.base]);
});

test('composeColorGrid: part.colors admite negro (0x000000)', () => {
  const parts = { c: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, colors: { '0': 0x000000 }, down: ['0'] } };
  const g = composeColorGrid({ gridW: 1, gridH: 1, parts: ['c'] }, parts, 'down', PAL);
  assert.equal(g[0][0], 0x000000);
});

test('composeColorGrid: carácter que no está en colors ni en roles lanza error', () => {
  const parts = { c: { res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, colors: { '1': 0xabcdef }, down: ['2'] } };
  assert.throws(() => composeColorGrid({ gridW: 1, gridH: 1, parts: ['c'] }, parts, 'down', PAL), /unknown role char/);
});

test('forge static: 1 frame idéntico (la vista down) en todas las direcciones y estados', () => {
  const parts = { a: { res: 32, w: 2, h: 1, anchor: { x: 0, y: 0 }, colors: { '1': 0xff0000 }, down: ['1b'] } };
  const out = forge({ static: true, gridW: 2, gridH: 1, scale: 1, parts: ['a'], anim: { idle: 2, walk: 4, attack: 2 } }, parts, PAL);
  assert.deepEqual(Object.keys(out.anims).sort(), ['idle-down', 'idle-side', 'idle-up', 'walk-down', 'walk-side', 'walk-up']);
  for (const key of Object.keys(out.anims)) {
    assert.equal(out.anims[key].length, 1, `${key} frames`);
    assert.deepEqual(out.anims[key][0], [[0xff0000, PAL.base]], `${key} grid`);
  }
  assert.equal(out.width, 2);
  assert.equal(out.height, 1);
});
```

En `tests/sprites/parts.test.js`, sustituir el test `'each direction grid matches declared w/h and uses only role chars'` por:

```js
test('each direction grid matches declared w/h and uses only role chars or its own colors', () => {
  for (const [name, p] of Object.entries(PARTS)) {
    const own = new Set(Object.keys(p.colors ?? {}));
    for (const ch of own) assert.match(ch, /^[0-9A-Z]$/, `${name}.colors key '${ch}' must be 0-9 or A-Z`);
    for (const dir of ['down', 'up', 'side']) {
      const rows = p[dir];
      if (rows == null) continue; // direction intentionally skipped
      assert.equal(rows.length, p.h, `${name}.${dir} row count`);
      for (const row of rows) {
        assert.equal(row.length, p.w, `${name}.${dir} row width`);
        for (const ch of row) assert.ok(ROLE_CHARS.has(ch) || own.has(ch), `${name}.${dir} bad char '${ch}'`);
      }
    }
  }
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: FAIL en los tres tests de `colors` (`unknown role char '1'`) y en `forge static` (claves/frames distintos).

- [ ] **Step 3: Implementar**

En `src/systems/SpriteForge.js`, dentro de `composeColorGrid`, sustituir:

```js
        const ch = rows[r][c];
        if (ch === '.') continue;
        const role = ROLE_MAP[ch];
        if (!role) throw new Error(`SpriteForge: unknown role char '${ch}'`);
        const color = pal[role];
```

por:

```js
        const ch = rows[r][c];
        if (ch === '.') continue;
        const color = resolveColor(part, pal, ch);
```

y añadir encima de `composeColorGrid`:

```js
// A part's own `colors` map (char → 0xRRGGBB) wins; else the char is a palette role.
function resolveColor(part, pal, ch) {
  if (part.colors && part.colors[ch] != null) return part.colors[ch];
  const role = ROLE_MAP[ch];
  if (!role) throw new Error(`SpriteForge: unknown role char '${ch}'`);
  return pal[role];
}
```

En `forge`, justo después de calcular `scale`, añadir:

```js
  // Static recipe: one front view, one frame, reused for every direction and state.
  if (recipe.static) {
    const still = scaleGrid(composeColorGrid(recipe, parts, 'down', palette, partPalette), scale);
    const anims = {};
    for (const dir of DIRS) for (const state of ['idle', 'walk']) anims[`${state}-${dir}`] = [still];
    return { size: DESIGN * scale, width: gw * scale, height: gh * scale, fps: recipe.fps ?? 5, anims };
  }
```

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/SpriteForge.test.js tests/sprites/parts.test.js`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/SpriteForge.js tests/sprites/SpriteForge.test.js tests/sprites/parts.test.js
git commit -m "feat(sprites): SpriteForge admite colores por parte y recetas estáticas"
```

---

### Task 2: FacingController — las recetas estáticas no voltean

**Files:**
- Modify: `src/objects/FacingController.js`, `src/objects/Enemy.js`
- Test: `tests/sprites/FacingController.test.js`

**Interfaces:**
- Consumes: `recipe.static` (Task 1).
- Produces: `FacingController#isStatic` (boolean, por defecto `false`). `Enemy` expone `this.visualRecipe` (receta de la clave visual o `null`) y pone `facing.isStatic = !!visualRecipe.static`.

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/sprites/FacingController.test.js`:

```js
import { FacingController } from '../../src/objects/FacingController.js';

function fakeSprite() {
  const calls = { flip: [], play: [] };
  return {
    calls, x: 100, y: 100, flipX: false,
    setFlipX(v) { calls.flip.push(v); this.flipX = v; },
    anims: { play: (key) => calls.play.push(key) },
    scene: { anims: { exists: () => false } },
  };
}

test('receta estática: moverse a la izquierda no voltea', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'acolito_brasa');
  fc.isStatic = true;
  fc.update(-100, 0);
  assert.deepEqual(s.calls.flip, []);
  assert.equal(s.flipX, false);
  assert.deepEqual(s.calls.play, ['acolito_brasa-walk-side']);
});

test('receta estática con facePlayer: tampoco voltea', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'acolito_brasa');
  fc.isStatic = true;
  fc.facePlayer = true;
  fc.update(0, 0, { x: 10, y: 100 });
  assert.deepEqual(s.calls.flip, []);
  assert.deepEqual(s.calls.play, ['acolito_brasa-idle-side']);
});

test('receta no estática: moverse a la izquierda sí voltea (control)', () => {
  const s = fakeSprite();
  const fc = new FacingController(s, 'lobo');
  fc.update(-100, 0);
  assert.deepEqual(s.calls.flip, [true]);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/FacingController.test.js`
Expected: FAIL en los dos tests estáticos (`calls.flip` contiene `true`).

- [ ] **Step 3: Implementar**

En `src/objects/FacingController.js`, en el constructor, añadir tras `this.facePlayer = false; …`:

```js
    this.isStatic = false;   // receta estática: una sola vista de frente, nunca se voltea
```

En `update`, sustituir `this.sprite.setFlipX(flipX);` (rama `facePlayer`) por:

```js
      if (!this.isStatic) this.sprite.setFlipX(flipX);
```

y `this.sprite.setFlipX(f.flipX);` (rama general) por:

```js
    if (!this.isStatic) this.sprite.setFlipX(f.flipX);
```

En `src/objects/Enemy.js`, cambiar el import de recetas a:

```js
import { hasRecipe, getRecipe } from '../data/sprites/recipes.js';
```

y en el constructor, sustituir el bloque:

```js
    if (useSprite) {
      const px = def.radius * 2;
      this.setDisplaySize(px, px); // visual footprint ~ old circle diameter; physics body unchanged
      this.facing = new FacingController(this, visualKey);
      this.facing.facePlayer = !!def.facePlayer;
    } else {
```

por:

```js
    this.visualRecipe = useSprite ? getRecipe(visualKey) : null;
    if (useSprite) {
      const px = def.radius * 2;
      this.setDisplaySize(px, px); // visual footprint ~ old circle diameter; physics body unchanged
      this.facing = new FacingController(this, visualKey);
      this.facing.facePlayer = !!def.facePlayer;
      this.facing.isStatic = !!this.visualRecipe.static;
    } else {
```

(El `setDisplaySize` se sustituye en la Task 3.)

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/FacingController.test.js tests/FacingController.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/objects/FacingController.js src/objects/Enemy.js tests/sprites/FacingController.test.js
git commit -m "feat(sprites): las recetas estáticas nunca se voltean"
```

---

### Task 3: `displayFor` — sprites que sobresalen sin deformarse

**Files:**
- Create: `src/systems/enemyDisplay.js`
- Modify: `src/objects/Enemy.js`, `src/scenes/GameScene.js` (`swapToBeast` ~l.493, hijos de `split` ~l.658, `mutate` enemigo ~l.675, `containEnemy` ~l.512)
- Test: `tests/enemyDisplay.test.js`

**Interfaces:**
- Consumes: `recipe.body = { x, y }`, `recipe.gridW`, `recipe.gridH`; `Enemy#visualRecipe` (Task 2).
- Produces:
  - `displayFor(recipe, radius)` → `{ square: number }` si la receta no tiene `body` (o no hay receta); si la tiene → `{ scale, originX, originY, body: { w: 32, h: 32, x, y }, half: radius }`.
  - `Enemy#applyDisplay()`: aplica lo anterior (no hace nada si `def.radius` es falsy).
  - `Enemy#bodyHalf`: `radius` en modo cuerpo, `null` en modo cuadrado.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/enemyDisplay.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayFor, BODY_PX } from '../src/systems/enemyDisplay.js';

test('BODY_PX es 32', () => { assert.equal(BODY_PX, 32); });

test('sin body (o sin receta): tamaño cuadrado radius*2, como hoy', () => {
  assert.deepEqual(displayFor({ size: 32, parts: [] }, 16), { square: 32 });
  assert.deepEqual(displayFor({ gridW: 64, gridH: 32, parts: [] }, 40), { square: 80 });
  assert.deepEqual(displayFor(null, 17), { square: 34 });
});

test('con body: escala uniforme, origen en el centro del cuerpo y cuerpo físico 32×32 desplazado', () => {
  const r = { gridW: 54, gridH: 45, body: { x: 11, y: 13 } };
  assert.deepEqual(displayFor(r, 16), {
    scale: 1,
    originX: 27 / 54,
    originY: 29 / 45,
    body: { w: 32, h: 32, x: 11, y: 13 },
    half: 16,
  });
});

test('con body y radio 17: la escala crece igual en X e Y', () => {
  const d = displayFor({ gridW: 32, gridH: 36, body: { x: 0, y: 4 } }, 17);
  assert.equal(d.scale, 34 / 32);
  assert.equal(d.originX, 0.5);
  assert.equal(d.originY, 20 / 36);
  assert.equal(d.half, 17);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node --test tests/enemyDisplay.test.js`
Expected: FAIL (`Cannot find module .../enemyDisplay.js`).

- [ ] **Step 3: Implementar el helper puro**

Crear `src/systems/enemyDisplay.js`:

```js
// src/systems/enemyDisplay.js
// PURE (no Phaser). Cómo mostrar el sprite de un enemigo normal según su receta.
// Sin `body`: cuadrado de radius*2 (comportamiento histórico). Con `body`: la rejilla
// tiene un cuadro de cuerpo de BODY_PX×BODY_PX en (body.x, body.y); el resto (halo,
// antorchas, humo) sobresale. La escala es uniforme, el origen cae en el centro del
// cuerpo (x,y del enemigo = centro del cuerpo) y el cuerpo físico cubre solo ese cuadro.
export const BODY_PX = 32;

export function displayFor(recipe, radius) {
  if (!recipe || !recipe.body) return { square: radius * 2 };
  const { gridW, gridH, body } = recipe;
  return {
    scale: (radius * 2) / BODY_PX,
    originX: (body.x + BODY_PX / 2) / gridW,
    originY: (body.y + BODY_PX / 2) / gridH,
    body: { w: BODY_PX, h: BODY_PX, x: body.x, y: body.y },
    half: radius,
  };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node --test tests/enemyDisplay.test.js`
Expected: PASS.

- [ ] **Step 5: Conectar en `Enemy`**

En `src/objects/Enemy.js`, añadir el import:

```js
import { displayFor } from '../systems/enemyDisplay.js';
```

En el constructor, sustituir:

```js
      const px = def.radius * 2;
      this.setDisplaySize(px, px); // visual footprint ~ old circle diameter; physics body unchanged
```

por:

```js
      this.applyDisplay();
```

y añadir, justo después del constructor, el método:

```js
  // Visual size + physics body from the recipe (see systems/enemyDisplay.js). Without a
  // recipe `body` this is the historic radius*2 square; with one, the sprite may overflow
  // its 32×32 body box (halo/torches) while the hitbox stays on the body.
  applyDisplay() {
    const r = this.def.radius;
    if (!r) return;
    const d = displayFor(this.visualRecipe, r);
    if (d.square) {
      this.setDisplaySize(d.square, d.square);
      this.bodyHalf = null;
      return;
    }
    this.setScale(d.scale);
    this.setOrigin(d.originX, d.originY);
    this.body.setSize(d.body.w, d.body.h, false);
    this.body.setOffset(d.body.x, d.body.y);
    this.bodyHalf = d.half;
  }
```

Añadir también, justo encima de `this.visualRecipe = …` (es decir, **antes** del bloque `if (useSprite)`, para no pisar el valor que pone `applyDisplay()`):

```js
    this.bodyHalf = null; // medio lado del cuerpo cuando el sprite sobresale (ver applyDisplay)
```

- [ ] **Step 6: Conectar en `GameScene`**

En `src/scenes/GameScene.js` sustituir las tres líneas:

```js
      if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
```
(en `swapToBeast`)
```js
      if (childDef.radius) e.setDisplaySize(childDef.radius * 2, childDef.radius * 2);
```
(hijos de `buildSplitChildren`)
```js
          if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
```
(`mutate.kind === 'enemy'`)

por, respectivamente:

```js
      e.applyDisplay();
```
```js
      e.applyDisplay();
```
```js
          e.applyDisplay();
```

En `containEnemy`, sustituir:

```js
    const halfW = (e.displayWidth  || (e.def.radius || 16) * 2) / 2;
    const halfH = (e.displayHeight || (e.def.radius || 16) * 2) / 2;
```

por:

```js
    // Sprites que sobresalen (halo/antorchas) se contienen por su cuerpo, no por el dibujo.
    const halfW = e.bodyHalf ?? (e.displayWidth  || (e.def.radius || 16) * 2) / 2;
    const halfH = e.bodyHalf ?? (e.displayHeight || (e.def.radius || 16) * 2) / 2;
```

Comprobar que no queda ningún `setDisplaySize(…radius * 2…)` de enemigos normales:

Run: `grep -n "radius \* 2, .*radius \* 2" src/scenes/GameScene.js src/objects/Enemy.js`
Expected: solo líneas de jefes/formas (`form.radius * 2`), ninguna de `def.radius`/`childDef.radius`.

- [ ] **Step 7: Suite completa**

Run: `node --test`
Expected: PASS (ninguna receta existente tiene `body`, así que el comportamiento en juego no cambia todavía).

- [ ] **Step 8: Commit**

```bash
git add src/systems/enemyDisplay.js src/objects/Enemy.js src/scenes/GameScene.js tests/enemyDisplay.test.js
git commit -m "feat(enemies): displayFor — sprites que sobresalen del cuerpo sin deformarse"
```

---

### Task 4: Librerías del generador — PNG y conversión de figuras

**Files:**
- Create: `tools/lib/png.mjs`, `tools/lib/figure.mjs`
- Test: `tests/tools/png.test.js`, `tests/tools/figure.test.js`

**Interfaces:**
- Produces:
  - `decodePng(buf: Buffer) → { width, height, data: Uint8Array /* RGBA */ }` (8 bits, RGB o RGBA, sin entrelazado; lanza en otro caso).
  - `encodePng({ width, height, data }) → Buffer` (RGBA).
  - `BODY = 32`, `CHARS = '0123456789ABCDEF'`, `DEFAULTS` (ver código).
  - `medianCut(colors: number[], n: number) → number[]` (determinista, ≤ n distintos).
  - `convertFigure(img, fig) → { gridW, gridH, body: { x, y }, colors: { [char]: int }, rows: string[] }`, con `fig = { slot: [x0, x1], rows: [y0, y1], scale, bg?, bgTol?, colors?, cover?, glowLum?, glowWeight?, peel?, peelLum?, overrides?: [x, y, 0xRRGGBB | null][] }`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `tests/tools/png.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodePng, encodePng } from '../../tools/lib/png.mjs';

const REF = new URL('../../tools/refs/fuego-basicos-small.png', import.meta.url);

test('decodePng lee la referencia de Fuego (RGBA 1569×192)', () => {
  const img = decodePng(readFileSync(REF));
  assert.equal(img.width, 1569);
  assert.equal(img.height, 192);
  const i = (100 * img.width + 10) * 4; // panel de fondo
  assert.deepEqual([...img.data.slice(i, i + 4)], [15, 14, 24, 255]);
});

test('encodePng → decodePng conserva los píxeles', () => {
  const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 10, 20, 30, 255]);
  const back = decodePng(encodePng({ width: 2, height: 2, data }));
  assert.equal(back.width, 2);
  assert.equal(back.height, 2);
  assert.deepEqual([...back.data], [...data]);
});

test('decodePng rechaza lo que no es PNG', () => {
  assert.throws(() => decodePng(Buffer.from('hola mundo, no soy un png')), /not a PNG/);
});
```

Crear `tests/tools/figure.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertFigure, medianCut, BODY } from '../../tools/lib/figure.mjs';

const BG = [16, 14, 25];
function sheet(w, h) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = BG[0]; data[i * 4 + 1] = BG[1]; data[i * 4 + 2] = BG[2]; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
}
function fill(img, x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = (c >> 16) & 255; img.data[i + 1] = (c >> 8) & 255; img.data[i + 2] = c & 255;
  }
}
const colorAt = (r, x, y) => { const ch = r.rows[y][x]; return ch === '.' ? null : r.colors[ch]; };
const RED = 0xb03a2e, YELLOW = 0xffd54f;

test('medianCut es determinista y separa grupos distintos', () => {
  const cols = [...new Array(50).fill(0x100000), ...new Array(50).fill(0xf0f0f0)];
  const a = medianCut(cols, 4);
  assert.deepEqual(a, medianCut(cols, 4));
  assert.ok(a.includes(0x100000) && a.includes(0xf0f0f0));
  assert.ok(a.length <= 4);
});

test('convertFigure: figura pequeña → lienzo 32×32 con el cuerpo centrado y el brillo conservado', () => {
  const img = sheet(40, 40);
  fill(img, 10, 5, 29, 34, RED);      // cuerpo 20×30
  fill(img, 18, 18, 21, 21, YELLOW);  // brillo 4×4 en el centro
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0 });
  assert.equal(r.gridW, BODY);
  assert.equal(r.gridH, BODY);
  assert.deepEqual(r.body, { x: 0, y: 0 });
  assert.equal(r.rows.length, 32);
  assert.ok(r.rows.every((row) => row.length === 32));
  // bbox (10,5) → salida (8..11,13..16) → lienzo desplazado (+6,+2)
  assert.equal(colorAt(r, 14, 15), YELLOW);
  assert.equal(colorAt(r, 6, 2), RED);   // esquina: contorno = color más oscuro = rojo
  assert.equal(colorAt(r, 5, 2), null);  // fuera de la figura
});

test('convertFigure: lo que sobresale por arriba amplía el lienzo y el cuerpo queda abajo', () => {
  const img = sheet(60, 70);
  fill(img, 10, 30, 41, 61, RED);     // cuerpo 32×32
  fill(img, 24, 5, 27, 29, YELLOW);   // antorcha 4×25 encima
  const r = convertFigure(img, { slot: [0, 59], rows: [0, 69], scale: 1, peel: 0 });
  assert.equal(r.gridH, 57);
  assert.deepEqual(r.body, { x: 0, y: 25 });
  assert.equal(colorAt(r, 15, 0), YELLOW);
});

test('convertFigure: un píxel color fondo encerrado en la figura no es fondo', () => {
  const img = sheet(40, 40);
  fill(img, 5, 5, 34, 34, RED);
  fill(img, 19, 19, 20, 20, (BG[0] << 16) | (BG[1] << 8) | BG[2]);
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0 });
  assert.notEqual(r.rows[16][15], '.');
});

test('convertFigure: overrides pintan en coordenadas del lienzo y validan límites y colores', () => {
  const img = sheet(40, 40);
  fill(img, 4, 4, 35, 35, RED);
  const r = convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0, overrides: [[3, 3, YELLOW], [4, 4, null]] });
  assert.equal(colorAt(r, 3, 3), YELLOW);
  assert.equal(colorAt(r, 4, 4), null);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, overrides: [[99, 0, YELLOW]] }), /outside/);
  const many = Array.from({ length: 16 }, (_, i) => [i, 10, 0x010101 * (i + 1)]);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, peel: 0, overrides: many }), /colors > 16/);
  assert.throws(() => convertFigure(img, { slot: [0, 39], rows: [0, 39], scale: 1, colors: 17 }), /colors 17 > 16/);
});

test('convertFigure: scale 0.5 reduce a la mitad', () => {
  const img = sheet(80, 80);
  fill(img, 8, 8, 71, 71, RED);
  const r = convertFigure(img, { slot: [0, 79], rows: [0, 79], scale: 0.5, peel: 0 });
  assert.deepEqual([r.gridW, r.gridH], [32, 32]);
  assert.equal(r.rows.join('').replace(/\./g, '').length, 32 * 32);
});

test('convertFigure: slot vacío lanza error', () => {
  assert.throws(() => convertFigure(sheet(10, 10), { slot: [0, 9], rows: [0, 9], scale: 1 }), /empty slot/);
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/tools/`
Expected: FAIL (`Cannot find module .../tools/lib/png.mjs` y `figure.mjs`).

- [ ] **Step 3: Implementar `tools/lib/png.mjs`**

Crear `tools/lib/png.mjs`:

```js
// tools/lib/png.mjs
// Minimal PNG codec for dev tools (node:zlib only). Decodes 8-bit RGB/RGBA,
// non-interlaced PNGs to RGBA; encodes RGBA. Not used by the game runtime.
import { inflateSync, deflateSync } from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

// buf: Buffer of a PNG file → { width, height, data: Uint8Array (RGBA, row-major) }
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('decodePng: not a PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4);
      bitDepth = body[8]; colorType = body[9]; interlace = body[12];
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(`decodePng: unsupported format (depth ${bitDepth}, color ${colorType}, interlace ${interlace})`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1, dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const v = raw[src + x];
      const a = x >= bpp ? px[dst + x - bpp] : 0;
      const b = y > 0 ? px[dst - stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[dst - stride + x - bpp] : 0;
      let out;
      switch (filter) {
        case 0: out = v; break;
        case 1: out = v + a; break;
        case 2: out = v + b; break;
        case 3: out = v + ((a + b) >> 1); break;
        case 4: out = v + paeth(a, b, c); break;
        default: throw new Error(`decodePng: bad filter ${filter}`);
      }
      px[dst + x] = out & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = px[i * bpp]; data[i * 4 + 1] = px[i * bpp + 1]; data[i * 4 + 2] = px[i * bpp + 2];
    data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return { width, height, data };
}

const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// { width, height, data: RGBA } → Buffer (8-bit RGBA PNG, filter 0)
export function encodePng({ width, height, data }) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(data.buffer, data.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
```

- [ ] **Step 4: Implementar `tools/lib/figure.mjs`**

Crear `tools/lib/figure.mjs`:

```js
// tools/lib/figure.mjs
// PURE (no Phaser, no fs). Convierte una figura de una hoja de referencia RGBA en
// un sprite de rejilla con colores propios: fondo por flood fill, cuantizado a
// resolución original, reducción por voto ponderado, pelado de halos oscuros,
// despeckle, contorno y caja del cuerpo de 32×32. Solo herramienta de desarrollo.

export const BODY = 32;
export const CHARS = '0123456789ABCDEF';
export const DEFAULTS = {
  bg: [16, 14, 25], // color del panel de la referencia
  bgTol: 14,        // distancia Manhattan RGB máxima para contar como fondo
  colors: 12,       // tamaño de la paleta por mediana (máx. 16)
  cover: 0.5,       // fracción mínima de píxeles de figura para que un píxel de salida sea opaco
  glowLum: 150,     // luminancia desde la que un color cuenta como brillo
  glowWeight: 3,    // peso del voto de los brillos (ojos, llamas)
  peel: 2,          // pasadas de pelado de bordes oscuros
  peelLum: 45,      // luminancia bajo la que un borde se pela
};

const lum = (c) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
const rgbInt = (r, g, b) => (r << 16) | (g << 8) | b;
const dist2 = (a, b) => {
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255);
  return dr * dr + dg * dg + db * db;
};
const opaqueAt = (g, x, y) => y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] != null;
const isEdge = (g, x, y) => !opaqueAt(g, x + 1, y) || !opaqueAt(g, x - 1, y) || !opaqueAt(g, x, y + 1) || !opaqueAt(g, x, y - 1);

// Mediana determinista: colors (ints 0xRRGGBB) → hasta n colores distintos.
export function medianCut(colors, n) {
  const boxes = [colors.slice()];
  while (boxes.length < n) {
    let best = -1, bestRange = 0, bestCh = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const sh of [16, 8, 0]) {
        let lo = 255, hi = 0;
        for (const c of box) { const v = (c >> sh) & 255; if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = sh; }
      }
    });
    if (best < 0) break;
    const box = boxes[best].slice().sort((a, b) => (((a >> bestCh) & 255) - ((b >> bestCh) & 255)) || (a - b));
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }
  const pal = boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const c of box) { r += (c >> 16) & 255; g += (c >> 8) & 255; b += c & 255; }
    return rgbInt(Math.round(r / box.length), Math.round(g / box.length), Math.round(b / box.length));
  });
  return [...new Set(pal)];
}

// img: { width, height, data: RGBA }.
// fig: { slot: [x0, x1], rows: [y0, y1], scale, ...DEFAULTS overrides, overrides: [[x, y, 0xRRGGBB | null], …] }
// → { gridW, gridH, body: { x, y }, colors: { char: int }, rows: string[] }
export function convertFigure(img, fig) {
  const o = { ...DEFAULTS, ...fig };
  if (o.colors > CHARS.length) throw new Error(`convertFigure: colors ${o.colors} > ${CHARS.length}`);
  const [x0, x1] = o.slot, [y0, y1] = o.rows;
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const px = (x, y) => { const i = ((y0 + y) * img.width + (x0 + x)) * 4; return rgbInt(img.data[i], img.data[i + 1], img.data[i + 2]); };

  // 1. Fondo: flood fill desde el borde del recorte sobre píxeles parecidos al panel.
  const bgLike = (x, y) => {
    const c = px(x, y);
    return Math.abs(((c >> 16) & 255) - o.bg[0]) + Math.abs(((c >> 8) & 255) - o.bg[1]) + Math.abs((c & 255) - o.bg[2]) <= o.bgTol;
  };
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H || bg[y * W + x] || !bgLike(x, y)) continue;
    bg[y * W + x] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // 2. Caja ajustada de la figura.
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (bg[y * W + x]) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('convertFigure: empty slot');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;

  // 3. Paleta por mediana sobre los píxeles originales (colores nítidos, sin mezclas).
  const samples = [];
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (!bg[y * W + x]) samples.push(px(x, y));
  const pal = medianCut(samples, o.colors);
  const nearestIdx = (c) => { let bi = 0, bd = Infinity; pal.forEach((p, i) => { const d = dist2(c, p); if (d < bd) { bd = d; bi = i; } }); return bi; };

  // 4. Reducción por voto: cada píxel de salida toma el color más votado; los brillos votan ×glowWeight.
  const s = o.scale;
  const ow = Math.ceil(bw * s), oh = Math.ceil(bh * s);
  let grid = Array.from({ length: oh }, () => new Array(ow).fill(null));
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const sx0 = Math.floor(ox / s), sx1 = Math.min(bw, Math.ceil((ox + 1) / s));
    const sy0 = Math.floor(oy / s), sy1 = Math.min(bh, Math.ceil((oy + 1) / s));
    let n = 0, fg = 0;
    const votes = new Array(pal.length).fill(0);
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++;
      if (bg[(minY + y) * W + (minX + x)]) continue;
      fg++;
      const i = nearestIdx(px(minX + x, minY + y));
      votes[i] += lum(pal[i]) >= o.glowLum ? o.glowWeight : 1;
    }
    if (!n || fg / n < o.cover) continue;
    let best = 0;
    for (let i = 1; i < votes.length; i++) if (votes[i] > votes[best]) best = i;
    grid[oy][ox] = pal[best];
  }

  // 5. Pelado: quita bordes oscuros (halos de brillo/sombra) `peel` veces.
  for (let pass = 0; pass < o.peel; pass++) {
    const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && lum(c) < o.peelLum && isEdge(prev, x, y) ? null : c)));
  }
  // 6. Despeckle: quita píxeles opacos sin vecinos opacos.
  { const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && !opaqueAt(prev, x + 1, y) && !opaqueAt(prev, x - 1, y) && !opaqueAt(prev, x, y + 1) && !opaqueAt(prev, x, y - 1) ? null : c))); }
  // 7. Contorno: los bordes de la silueta que no son brillo pasan al color más oscuro.
  const darkest = pal.reduce((d, p) => (lum(p) < lum(d) ? p : d), pal[0]);
  { const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && lum(c) < o.glowLum && isEdge(prev, x, y) ? darkest : c))); }

  // 8. Caja del cuerpo: 32×32 apoyada abajo y centrada en la masa de las 32 filas inferiores.
  let sumX = 0, cnt = 0;
  for (let y = Math.max(0, oh - BODY); y < oh; y++) for (let x = 0; x < ow; x++) if (grid[y][x] != null) { sumX += x; cnt++; }
  const bx = Math.round((cnt ? sumX / cnt : ow / 2) + 0.5 - BODY / 2);
  const by = oh - BODY;
  const cx0 = Math.min(0, bx), cy0 = Math.min(0, by);
  const gridW = Math.max(ow, bx + BODY) - cx0, gridH = Math.max(oh, by + BODY) - cy0;
  const canvas = Array.from({ length: gridH }, () => new Array(gridW).fill(null));
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) canvas[y - cy0][x - cx0] = grid[y][x];

  // 9. Retoques a mano en coordenadas del lienzo.
  for (const [x, y, c] of o.overrides ?? []) {
    if (x < 0 || y < 0 || x >= gridW || y >= gridH) throw new Error(`convertFigure: override (${x},${y}) outside ${gridW}×${gridH}`);
    canvas[y][x] = c;
  }

  // 10. Letras por luminancia (oscuro → claro).
  const used = [...new Set(canvas.flat().filter((c) => c != null))].sort((a, b) => lum(a) - lum(b) || a - b);
  if (used.length > CHARS.length) throw new Error(`convertFigure: ${used.length} colors > ${CHARS.length}`);
  const charOf = new Map(used.map((c, i) => [c, CHARS[i]]));
  return {
    gridW, gridH,
    body: { x: bx - cx0, y: by - cy0 },
    colors: Object.fromEntries(used.map((c, i) => [CHARS[i], c])),
    rows: canvas.map((row) => row.map((c) => (c == null ? '.' : charOf.get(c))).join('')),
  };
}
```

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `node --test tests/tools/`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add tools/lib/png.mjs tools/lib/figure.mjs tests/tools/png.test.js tests/tools/figure.test.js
git commit -m "feat(tools): códec PNG y conversión de figuras de referencia a rejilla de colores"
```

---

### Task 5: Generador, módulo generado, helper de receta y preview (prototipo: acólito + pirovidente)

**Files:**
- Create: `tools/fire-basics-figures.mjs`, `tools/gen-fire-basics.mjs`, `tools/preview-fire-basics.mjs`, `src/data/sprites/partsFireBasics.js` (generado), `tests/sprites/fireBasics.test.js`
- Modify: `src/data/sprites/parts.js` (import + spread), `src/data/sprites/recipes.js` (import + `fireBasicRecipe`)

**Interfaces:**
- Consumes: `decodePng`, `encodePng`, `convertFigure` (Task 4); `forge` con `colors`/`static` (Task 1).
- Produces:
  - `tools/fire-basics-figures.mjs`: `REF_PATH` (ruta absoluta del PNG) y `FIGURES` (`{ [key]: fig }`, orden = orden de salida).
  - `src/data/sprites/partsFireBasics.js`: `FIRE_BASIC_META = { [key]: { gridW, gridH, body: { x, y } } }` y `FIRE_BASIC_PARTS = { ['fb_' + key]: { res: 32, w, h, anchor: { x: 0, y: 0 }, colors, down } }`.
  - `recipes.js`: `export function fireBasicRecipe(key, archetype)` → `{ archetype, static: true, scale: 1, gridW, gridH, body: { x, y }, parts: [{ name: 'fb_' + key }] }`; lanza si `key` no está en `FIRE_BASIC_META`.
  - CLI: `node tools/gen-fire-basics.mjs [outPath]` y `node tools/preview-fire-basics.mjs <out.png> [key,key,…]`.

- [ ] **Step 1: Configuración de figuras (solo el prototipo)**

Crear `tools/fire-basics-figures.mjs`:

```js
// tools/fire-basics-figures.mjs
// Recortes y parámetros por criatura sobre tools/refs/fuego-basicos-small.png (1569×192).
// slot = columnas [x0, x1] de la figura IZQUIERDA de cada panel; rows = filas bajo el título.
// scale = píxeles de salida por píxel de referencia (cuerpo ≈ 32 px de alto).
// Los demás campos sobreescriben DEFAULTS de tools/lib/figure.mjs; overrides = retoques
// [x, y, 0xRRGGBB | null] en coordenadas del lienzo final. Lo leen gen- y preview-fire-basics.
import { fileURLToPath } from 'node:url';

export const REF_PATH = fileURLToPath(new URL('./refs/fuego-basicos-small.png', import.meta.url));

const ROWS = [76, 188];

export const FIGURES = {
  acolito_brasa: { slot: [22, 66], rows: ROWS, scale: 0.40 },
  pirovidente:   { slot: [476, 603], rows: ROWS, scale: 0.40 },
};
```

- [ ] **Step 2: Escribir el generador**

Crear `tools/gen-fire-basics.mjs`:

```js
// tools/gen-fire-basics.mjs
// Genera src/data/sprites/partsFireBasics.js desde la referencia de los villanos básicos
// de Fuego (ver tools/fire-basics-figures.mjs). Determinista: re-ejecutarlo sin cambios
// deja el archivo idéntico. Run: node tools/gen-fire-basics.mjs [outPath]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodePng } from './lib/png.mjs';
import { convertFigure } from './lib/figure.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';

const OUT = process.argv[2] ?? fileURLToPath(new URL('../src/data/sprites/partsFireBasics.js', import.meta.url));
const hex = (c) => `0x${c.toString(16).padStart(6, '0')}`;

const img = decodePng(readFileSync(REF_PATH));
const results = Object.entries(FIGURES).map(([key, fig]) => [key, convertFigure(img, fig)]);

const lines = [
  '// src/data/sprites/partsFireBasics.js',
  '// GENERATED by tools/gen-fire-basics.mjs — do not edit by hand; edit the generator (or',
  '// tools/fire-basics-figures.mjs) and re-run. PURE. Villanos básicos de Fuego: sprites',
  '// estáticos de frente, 1 carácter = 1 píxel, colores propios por parte. `body` = esquina',
  '// del cuadro de 32×32 del cuerpo dentro del lienzo (lo demás sobresale).',
  '',
  'export const FIRE_BASIC_META = {',
  ...results.map(([key, r]) => `  ${key}: { gridW: ${r.gridW}, gridH: ${r.gridH}, body: { x: ${r.body.x}, y: ${r.body.y} } },`),
  '};',
  '',
  'export const FIRE_BASIC_PARTS = {',
];
for (const [key, r] of results) {
  lines.push(
    `  fb_${key}: {`,
    `    res: 32, w: ${r.gridW}, h: ${r.gridH}, anchor: { x: 0, y: 0 },`,
    `    colors: { ${Object.entries(r.colors).map(([ch, c]) => `'${ch}': ${hex(c)}`).join(', ')} },`,
    '    down: [',
    ...r.rows.map((row) => `      '${row}',`),
    '    ],',
    '  },',
  );
}
lines.push('};', '');
writeFileSync(OUT, lines.join('\n'));
for (const [key, r] of results) console.log(`${key}: ${r.gridW}×${r.gridH} body(${r.body.x},${r.body.y}) ${Object.keys(r.colors).length} colores`);
```

- [ ] **Step 3: Generar el módulo**

Run: `node tools/gen-fire-basics.mjs`
Expected (valores del prototipo validado):
```
acolito_brasa: 32×36 body(0,4) 10 colores
pirovidente: 52×45 body(10,13) 12 colores
```
y `src/data/sprites/partsFireBasics.js` creado.

- [ ] **Step 4: Escribir los tests que fallan**

Crear `tests/sprites/fireBasics.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_BASIC_META, FIRE_BASIC_PARTS } from '../../src/data/sprites/partsFireBasics.js';
import { PARTS } from '../../src/data/sprites/parts.js';
import { fireBasicRecipe } from '../../src/data/sprites/recipes.js';
import { forge } from '../../src/systems/SpriteForge.js';
import { derivePalette } from '../../src/data/sprites/palettes.js';
import { FIGURES } from '../../tools/fire-basics-figures.mjs';

const GEN = fileURLToPath(new URL('../../tools/gen-fire-basics.mjs', import.meta.url));
const GENERATED = fileURLToPath(new URL('../../src/data/sprites/partsFireBasics.js', import.meta.url));

test('hay un sprite generado por cada figura configurada, y está en PARTS', () => {
  assert.deepEqual(Object.keys(FIRE_BASIC_META), Object.keys(FIGURES));
  for (const key of Object.keys(FIGURES)) assert.equal(PARTS[`fb_${key}`], FIRE_BASIC_PARTS[`fb_${key}`]);
});

test('cada sprite: cuerpo 32×32 dentro del lienzo, ≤16 colores y filas del tamaño declarado', () => {
  for (const [key, m] of Object.entries(FIRE_BASIC_META)) {
    const p = FIRE_BASIC_PARTS[`fb_${key}`];
    assert.equal(p.w, m.gridW, `${key} w`);
    assert.equal(p.h, m.gridH, `${key} h`);
    assert.ok(m.body.x >= 0 && m.body.y >= 0 && m.body.x + 32 <= m.gridW && m.body.y + 32 <= m.gridH, `${key} body inside`);
    assert.ok(Object.keys(p.colors).length <= 16, `${key} colors`);
    assert.equal(p.down.length, m.gridH);
    for (const row of p.down) assert.equal(row.length, m.gridW);
  }
});

test('fireBasicRecipe forja un frame estático del tamaño del lienzo', () => {
  for (const key of Object.keys(FIRE_BASIC_META)) {
    const r = fireBasicRecipe(key, 'humanoid');
    assert.equal(r.static, true);
    assert.deepEqual(r.parts, [{ name: `fb_${key}` }]);
    const out = forge(r, PARTS, derivePalette(0x888888));
    const g = out.anims['idle-down'][0];
    assert.equal(out.anims['walk-side'].length, 1);
    assert.equal(g.length, FIRE_BASIC_META[key].gridH);
    assert.equal(g[0].length, FIRE_BASIC_META[key].gridW);
    assert.ok(g.flat().some((c) => c != null), `${key} not empty`);
  }
});

test('fireBasicRecipe lanza con una clave sin sprite generado', () => {
  assert.throws(() => fireBasicRecipe('no_existe', 'humanoid'), /no generated sprite/);
});

test('el generador es reproducible (re-ejecutarlo da el mismo archivo)', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'fire-basics-')), 'parts.js');
  execFileSync(process.execPath, [GEN, out], { stdio: 'pipe' });
  assert.equal(readFileSync(out, 'utf8'), readFileSync(GENERATED, 'utf8'));
});
```

- [ ] **Step 5: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/fireBasics.test.js`
Expected: FAIL (`fireBasicRecipe` no exportado / `PARTS.fb_*` undefined).

- [ ] **Step 6: Conectar partes y helper**

En `src/data/sprites/parts.js`, añadir tras el bloque de comentarios de cabecera (antes de `export const PARTS = {`):

```js
import { FIRE_BASIC_PARTS } from './partsFireBasics.js';
```

y, dentro de `PARTS`, justo antes del comentario `// --- Fire beast archetype (gen-beast.mjs) ---`:

```js
  // Villanos básicos de Fuego — sprites estáticos con colores propios, GENERATED by tools/gen-fire-basics.mjs.
  ...FIRE_BASIC_PARTS,

```

En `src/data/sprites/recipes.js`, añadir al import de cabecera:

```js
import { FIRE_BASIC_META } from './partsFireBasics.js';
```

y justo antes de `export const RECIPES`:

```js
// Villanos básicos de Fuego: sprite estático de frente generado desde la referencia
// (tools/gen-fire-basics.mjs). Lienzo y cuadro del cuerpo vienen del módulo generado.
export function fireBasicRecipe(key, archetype) {
  const meta = FIRE_BASIC_META[key];
  if (!meta) throw new Error(`fireBasicRecipe: no generated sprite for '${key}'`);
  return {
    archetype, static: true, scale: 1,
    gridW: meta.gridW, gridH: meta.gridH, body: { ...meta.body },
    parts: [{ name: `fb_${key}` }],
  };
}
```


- [ ] **Step 7: Ejecutar y ver que pasan**

Run: `node --test tests/sprites/`
Expected: PASS.

- [ ] **Step 8: Escribir el preview**

Crear `tools/preview-fire-basics.mjs`:

```js
// tools/preview-fire-basics.mjs
// PNG de revisión para el usuario: por criatura, el recorte de la referencia (×2), el sprite
// forjado con la receta real (×6, cuadro del cuerpo en cian) y el sprite a ×2 sobre fondo
// oscuro y sobre suelo de lava (tamaño aproximado en móvil).
// Run: node tools/preview-fire-basics.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBasicRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-basics.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const ref = decodePng(readFileSync(REF_PATH));
const S = 6, PAD = 12, BACK = 0x1a1224, DARK = 0x0e0a16, LAVA = 0x4a2a1a, BODYLINE = 0x00e5ff;
const items = keys.map((key) => {
  const recipe = fireBasicRecipe(key, 'humanoid');
  const grid = forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0];
  return { key, fig: FIGURES[key], recipe, grid };
});
const refW = (f) => (f.slot[1] - f.slot[0] + 1) * 2, refH = (f) => (f.rows[1] - f.rows[0] + 1) * 2;
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
for (const it of items) {
  const { fig, recipe, grid } = it;
  for (let y = 0; y < refH(fig); y++) for (let x = 0; x < refW(fig); x++) {
    const i = ((fig.rows[0] + (y >> 1)) * ref.width + fig.slot[0] + (x >> 1)) * 4;
    set(ox + x, H - PAD - refH(fig) + y, (ref.data[i] << 16) | (ref.data[i + 1] << 8) | ref.data[i + 2]);
  }
  ox += refW(fig) + PAD;
  const top = H - PAD - recipe.gridH * S;
  blit(grid, ox, top, S, DARK);
  const bx = ox + recipe.body.x * S, by = top + recipe.body.y * S, side = 32 * S;
  for (let t = 0; t < side; t++) { set(bx + t, by, BODYLINE); set(bx + t, by + side - 1, BODYLINE); set(bx, by + t, BODYLINE); set(bx + side - 1, by + t, BODYLINE); }
  ox += recipe.gridW * S + PAD;
  blit(grid, ox, H - PAD - recipe.gridH * 2 * 2 - PAD, 2, DARK);
  blit(grid, ox, H - PAD - recipe.gridH * 2, 2, LAVA);
  ox += recipe.gridW * 2 + PAD * 3;
}
writeFileSync(outPath, encodePng({ width: W, height: H, data }));
console.log('preview', outPath, `${W}×${H}`, keys.join(', '));
```

- [ ] **Step 9: Generar el preview y revisarlo tú**

Run: `node tools/preview-fire-basics.mjs .playwright-mcp/fire-basics-proto.png`
Expected: `preview .playwright-mcp/fire-basics-proto.png …` y, al abrir la imagen, acólito y pirovidente reconocibles junto a su referencia; el cuadro cian abarca el cuerpo y el halo del pirovidente sobresale por arriba y a los lados. (`.playwright-mcp/` está en `.gitignore`.)

- [ ] **Step 10: Suite completa y commit**

Run: `node --test`
Expected: PASS.

```bash
git add tools/fire-basics-figures.mjs tools/gen-fire-basics.mjs tools/preview-fire-basics.mjs src/data/sprites/partsFireBasics.js src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/fireBasics.test.js
git commit -m "feat(fire): generador de villanos básicos desde referencia — prototipo acólito + pirovidente"
```

---

### Task 6: GATE — revisión del prototipo con el usuario

> Esta tarea la ejecuta la **sesión principal** (requiere conversación con el usuario). No conectar recetas del juego todavía.

**Files:**
- Modify: `tools/fire-basics-figures.mjs` (parámetros y `overrides`), `src/data/sprites/partsFireBasics.js` (regenerado)

- [ ] **Step 1: Enviar el preview**

Enviar `.playwright-mcp/fire-basics-proto.png` al usuario (SendUserFile, `display: 'render'`), explicando qué es cada columna (referencia ×2, sprite ×6 con cuerpo en cian, sprite ×2 en fondo oscuro y en lava) y pidiendo feedback concreto por criatura.

- [ ] **Step 2: Iterar hasta el OK explícito**

Por cada comentario, ajustar en `FIGURES` solo los parámetros de esa criatura:
- tamaño → `scale`;
- figura "comida" o con fondo pegado → `bgTol`;
- halo oscuro sucio o cuerpo oscuro que desaparece → `peel` / `peelLum` (criaturas oscuras: `peel: 0`);
- ojos o llamas apagados → `glowWeight` / `glowLum`;
- colores pobres o manchados → `colors` (≤16);
- píxeles concretos → `overrides: [[x, y, 0xRRGGBB | null], …]` (coordenadas del lienzo; se leen en la columna ×6 dividiendo entre 6).

Tras cada ajuste:

Run: `node tools/gen-fire-basics.mjs && node tools/preview-fire-basics.mjs .playwright-mcp/fire-basics-proto.png && node --test tests/sprites/fireBasics.test.js`
Expected: generador sin errores, tests PASS; reenviar el preview.

Repetir hasta que el usuario apruebe explícitamente ambos sprites.

- [ ] **Step 3: Commit**

```bash
git add tools/fire-basics-figures.mjs src/data/sprites/partsFireBasics.js
git commit -m "feat(fire): ajustes del prototipo acólito + pirovidente aprobados por el usuario"
```

---

### Task 7: Las 8 figuras restantes + GATE de revisión

> La parte de revisión (Steps 3–4) la ejecuta la **sesión principal**.

**Files:**
- Modify: `tools/fire-basics-figures.mjs`, `src/data/sprites/partsFireBasics.js` (regenerado)

**Interfaces:**
- Produces: `FIGURES` y `FIRE_BASIC_META` con las 10 claves en este orden: `acolito_brasa, lanzabrasas, piromante, pirovidente, sacerdote_llama, encapuchado_pira, iniciado_veloz, salamandra, larva_magma, espiritu_ceniza`.

- [ ] **Step 1: Añadir las figuras**

En `tools/fire-basics-figures.mjs`, sustituir `FIGURES` por (conservando los parámetros aprobados en la Task 6 para `acolito_brasa` y `pirovidente`):

```js
export const FIGURES = {
  acolito_brasa:    { slot: [22, 66], rows: ROWS, scale: 0.40 },   // ← valores aprobados en Task 6
  lanzabrasas:      { slot: [172, 229], rows: ROWS, scale: 0.42 },
  piromante:        { slot: [321, 382], rows: ROWS, scale: 0.42 },
  pirovidente:      { slot: [476, 603], rows: ROWS, scale: 0.40 },  // ← valores aprobados en Task 6
  sacerdote_llama:  { slot: [646, 745], rows: ROWS, scale: 0.40 },
  encapuchado_pira: { slot: [786, 851], rows: ROWS, scale: 0.40 },
  iniciado_veloz:   { slot: [953, 1006], rows: ROWS, scale: 0.46 },
  salamandra:       { slot: [1105, 1156], rows: ROWS, scale: 0.40, peel: 0 }, // cuerpo oscuro: no pelar
  larva_magma:      { slot: [1266, 1316], rows: ROWS, scale: 0.40 },
  espiritu_ceniza:  { slot: [1440, 1481], rows: ROWS, scale: 0.40 },
};
```

- [ ] **Step 2: Generar, testear y previsualizar**

Run: `node tools/gen-fire-basics.mjs && node --test tests/sprites/fireBasics.test.js && node tools/preview-fire-basics.mjs .playwright-mcp/fire-basics-all.png`
Expected: 10 líneas del generador (con los valores por defecto del prototipo: lanzabrasas 32×43, piromante 32×35, sacerdote 40×46, encapuchado 32×34, iniciado 32×33, salamandra 32×36, larva 32×37, espíritu 32×41), tests PASS y preview escrito.

- [ ] **Step 3: Enviar el preview al usuario**

Enviar `.playwright-mcp/fire-basics-all.png` (SendUserFile, `display: 'render'`). Si la imagen es muy ancha, generar dos: `node tools/preview-fire-basics.mjs .playwright-mcp/fire-basics-a.png acolito_brasa,lanzabrasas,piromante,pirovidente,sacerdote_llama` y `… .playwright-mcp/fire-basics-b.png encapuchado_pira,iniciado_veloz,salamandra,larva_magma,espiritu_ceniza`.

- [ ] **Step 4: Iterar hasta el OK explícito**

Mismo procedimiento que la Task 6, Step 2, criatura por criatura, hasta que el usuario apruebe los 10.

- [ ] **Step 5: Commit**

```bash
git add tools/fire-basics-figures.mjs src/data/sprites/partsFireBasics.js
git commit -m "feat(fire): sprites de los 10 villanos básicos aprobados por el usuario"
```

---

### Task 8: Conectar las 10 recetas y retirar el arte obsoleto

**Files:**
- Modify: `src/data/sprites/recipes.js` (l.~343–355 recetas; l.~14–17 `CULT_FACELESS`; l.~155–157 `MAGE_MELEE`; l.~189–190 `LARVA`/`SALAMANDRA`), `src/data/sprites/parts.js` (`mage_club`, `larva_body`, `larva_glow`, `larva_eyes`, `sala_body`, `sala_crest`, `sala_eyes`), `tools/gen-beast.mjs`, `tools/gen-mage.mjs`
- Test: `tests/sprites/recipes.test.js`

**Interfaces:**
- Consumes: `fireBasicRecipe` y `FIRE_BASIC_META` (Task 5) con las 10 claves (Task 7).

- [ ] **Step 1: Escribir los tests que fallan**

Añadir al final de `tests/sprites/recipes.test.js`:

```js
import { FIRE_BASIC_META } from '../../src/data/sprites/partsFireBasics.js';

const FIRE_BASIC_KEYS = [
  'acolito_brasa', 'lanzabrasas', 'piromante', 'pirovidente', 'sacerdote_llama',
  'encapuchado_pira', 'iniciado_veloz', 'salamandra', 'larva_magma', 'espiritu_ceniza',
];

test('los 10 villanos básicos de Fuego usan su sprite generado estático', () => {
  assert.deepEqual(Object.keys(FIRE_BASIC_META).sort(), [...FIRE_BASIC_KEYS].sort());
  for (const key of FIRE_BASIC_KEYS) {
    const r = getRecipe(key);
    assert.equal(r.static, true, `${key} static`);
    assert.deepEqual(r.parts, [{ name: `fb_${key}` }], `${key} parts`);
    assert.deepEqual(r.body, FIRE_BASIC_META[key].body, `${key} body`);
    const g = forge(r, PARTS, paletteFor(key, 0x888888)).anims['idle-down'][0];
    assert.equal(g.length, r.gridH);
    assert.equal(g[0].length, r.gridW);
  }
});

test('el arte antiguo de larva, salamandra y garrote ya no existe', () => {
  for (const name of ['larva_body', 'larva_glow', 'larva_eyes', 'sala_body', 'sala_crest', 'sala_eyes', 'mage_club']) {
    assert.equal(PARTS[name], undefined, `${name} should be removed`);
  }
});
```

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `node --test tests/sprites/recipes.test.js`
Expected: FAIL (`acolito_brasa static` undefined; `larva_body should be removed`).

- [ ] **Step 3: Conectar las recetas**

En `src/data/sprites/recipes.js`, sustituir las 10 líneas de receta por:

```js
  acolito_brasa:   fireBasicRecipe('acolito_brasa', 'humanoid'),
  lanzabrasas:     fireBasicRecipe('lanzabrasas', 'humanoid'),
  iniciado_veloz:  fireBasicRecipe('iniciado_veloz', 'humanoid'),
  piromante:       fireBasicRecipe('piromante', 'humanoid'),
  encapuchado_pira:fireBasicRecipe('encapuchado_pira', 'humanoid'),
  pirovidente:     fireBasicRecipe('pirovidente', 'humanoid'),
```
```js
  sacerdote_llama: fireBasicRecipe('sacerdote_llama', 'humanoid'),
```
```js
  larva_magma:     fireBasicRecipe('larva_magma', 'beast'),
  salamandra:      fireBasicRecipe('salamandra', 'beast'),
  espiritu_ceniza: fireBasicRecipe('espiritu_ceniza', 'blob'),
```

(Las líneas de `caballero_brasa`, `portaestandarte`, `can_lava`, etc. no se tocan.)

- [ ] **Step 4: Borrar constantes sin uso**

Confirmar que solo quedan su definición:

Run: `for c in LARVA SALAMANDRA MAGE_MELEE CULT_FACELESS; do echo "$c $(grep -cw $c src/data/sprites/recipes.js)"; done`
Expected: `LARVA 1`, `SALAMANDRA 1`, `MAGE_MELEE 1`, `CULT_FACELESS 1`.

Borrar de `src/data/sprites/recipes.js`:
- `const CULT_FACELESS = [ … ];` (3 líneas);
- `const MAGE_MELEE = (weapon) => [ … ];` (3 líneas);
- `const LARVA = [ … ];` y `const SALAMANDRA = [ … ];` (1 línea cada una).

- [ ] **Step 5: Borrar partes sin uso**

Confirmar que nada fuera de `parts.js` y los generadores las referencia:

Run: `grep -rn "larva_body\|larva_glow\|larva_eyes\|sala_body\|sala_crest\|sala_eyes\|mage_club" src tests --include='*.js' | grep -v "src/data/sprites/parts.js"`
Expected: solo la línea del test nuevo de `tests/sprites/recipes.test.js`.

Borrar los bloques con este script de un solo uso (elimina cada clave de nivel 2 `  name: {` hasta su `  },`):

```bash
node -e "
const fs = require('fs');
const f = 'src/data/sprites/parts.js';
let lines = fs.readFileSync(f, 'utf8').split('\n');
for (const name of ['mage_club', 'larva_body', 'larva_glow', 'larva_eyes', 'sala_body', 'sala_crest', 'sala_eyes']) {
  const start = lines.indexOf('  ' + name + ': {');
  if (start < 0) throw new Error('missing ' + name);
  const end = lines.indexOf('  },', start);
  lines.splice(start, end - start + 1);
}
fs.writeFileSync(f, lines.join('\n'));
"
```

Si el comentario `// --- Fire beast archetype (gen-beast.mjs) ---` queda sin partes debajo de larva/salamandra, dejarlo: sigue cubriendo `can_*` y `coloso_*`.

- [ ] **Step 6: Limpiar los generadores antiguos**

En `tools/gen-beast.mjs`:
- quitar de la cabecera las líneas `//   larva_magma  — …` y `//   salamandra   — …`;
- quitar de `layers` las líneas `larva_body: {}, larva_glow: {}, larva_eyes: {},` y `sala_body: {}, sala_crest: {}, sala_eyes: {},`;
- quitar las secciones completas `// ===… LARVA_MAGMA (grub) …===` y `// ===… SALAMANDRA (lizard, top-down) …===` (desde su comentario hasta la línea anterior al comentario `CAN_LAVA`).

En `tools/gen-mage.mjs`:
- quitar `club: {},` de `layers` (dejar `fish: {}, bow: {},`);
- quitar la sección `// ---------- CLUB / BAT: … ----------` completa (hasta la línea anterior a `// ---------- FISH`);
- quitar la línea `emit('club', 'mage_club');`.

Verificar que ambos siguen ejecutándose:

Run: `node tools/gen-beast.mjs > /dev/null && node tools/gen-mage.mjs > /dev/null && echo ok`
Expected: `ok`.

- [ ] **Step 7: Suite completa**

Run: `node --test`
Expected: PASS (incluye `every recipe references only parts that exist` y `every fire enemy + generic has a recipe with known parts`).

- [ ] **Step 8: Commit**

```bash
git add src/data/sprites/recipes.js src/data/sprites/parts.js tools/gen-beast.mjs tools/gen-mage.mjs tests/sprites/recipes.test.js
git commit -m "feat(fire): los villanos básicos usan los sprites nuevos y se retira el arte antiguo"
```

---

### Task 9: Verificación en juego

**Files:** ninguno (solo verificación; si aparece un bug, arreglarlo con su test y commit propio).

- [ ] **Step 1: Servidor**

Run (en segundo plano): `python3 -m http.server 8000`

- [ ] **Step 2: Cargar el mundo de Fuego y colocar los 10**

Con Playwright: `browser_resize` a 480×854, `browser_navigate` a `http://localhost:8000`, y `browser_evaluate`:

```js
async () => {
  const g = window.__game;
  for (const s of g.scene.getScenes(true)) g.scene.stop(s.scene.key);
  g.scene.start('Intro', { regionId: 'fire' });
  const keys = ['acolito_brasa', 'lanzabrasas', 'piromante', 'pirovidente', 'sacerdote_llama',
    'encapuchado_pira', 'iniciado_veloz', 'salamandra', 'larva_magma', 'espiritu_ceniza'];
  const t0 = Date.now();
  while (!keys.every((k) => g.textures.exists(`spr_${k}`))) {
    if (Date.now() - t0 > 20000) throw new Error('forge timeout');
    await new Promise((r) => setTimeout(r, 100));
  }
  g.scene.stop('Intro');
  g.scene.start('Game', { regionId: 'fire', levelIndex: 2 });
  await new Promise((r) => setTimeout(r, 800));
  const gs = g.scene.getScene('Game');
  const { ENEMY_TYPES } = await import('/src/data/enemies.js');
  gs.physics.world.drawDebug = true;
  if (!gs.physics.world.debugGraphic) gs.physics.world.createDebugGraphic();
  const placed = keys.map((k, i) => {
    const e = gs.spawnEnemy(ENEMY_TYPES[k]);
    e.setPosition(70 + (i % 5) * 85, 300 + Math.floor(i / 5) * 140);
    return { k, w: e.displayWidth, h: e.displayHeight, bw: e.body.width, bh: e.body.height, flip: e.flipX };
  });
  await new Promise((r) => setTimeout(r, 150));
  gs.physics.world.pause();
  return placed;
}
```

Expected: 10 filas; `bw`/`bh` = 32 (o 34 con radio 17) para todos; `flip` = `false`; `pirovidente` y `sacerdote_llama` con `w` > `bw` (sobresalen).

- [ ] **Step 3: Captura y consola**

`browser_take_screenshot` (`filename: '.playwright-mcp/fire-basics-ingame.png'`) y `browser_console_messages`.
Expected: los 10 sprites nuevos visibles, los rectángulos de debug de físicas sobre el cuerpo (no sobre halo/antorchas), sin errores de consola (salvo `favicon.ico` 404).

- [ ] **Step 4: Enviar al usuario**

Enviar la captura (SendUserFile, `display: 'render'`) con un resumen: tests en verde, cuerpos alineados, sin errores.

- [ ] **Step 5: Parar el servidor**

Detener el `http.server` en segundo plano.
