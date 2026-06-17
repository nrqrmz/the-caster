# Proyectiles tipados + contención de cuerpo completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada enemigo lanza su propio tipo de proyectil (flecha/fuego/hielo/veneno) con efecto implícito, y ningún enemigo —incluidos jefes— queda con cuerpo fuera de pantalla.

**Architecture:** Toda la lógica decidible vive en módulos puros sin Phaser (`src/data/projectiles.js`, `src/systems/clampBodyInside.js`) y se testea con `node --test`. Las escenas solo orquestan: `GameScene.executeAttack` resuelve el tipo de proyectil → textura/tinte/efecto, y `GameScene.containEnemy` clampa el cuerpo completo. Los sprites nuevos se generan procedural­mente vía el sistema de recetas existente (`recipes.js` + `parts.js`, forjado en `BootScene`).

**Tech Stack:** Phaser 3 (CDN, ES modules nativos, sin bundler), `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-06-16-projectiles-and-containment-design.md`

---

## File structure

| Archivo | Responsabilidad |
|---|---|
| `src/systems/clampBodyInside.js` | **nuevo** — math pura: clampa un cuerpo (halfW×halfH) dentro de un área con margen. |
| `src/data/projectiles.js` | **nuevo** — tabla `PROJECTILES`, defaults por elemento, `resolveProjectile()`. |
| `src/config.js` | añade `ENEMY_MARGIN`, `TEX.iceShard`, `TEX.poisonGlob`. |
| `src/data/sprites/parts.js` | añade grids `ice_shard` y `poison_glob`. |
| `src/data/sprites/recipes.js` | añade recetas `iceShard` y `poisonGlob`. |
| `src/systems/ProjectilePool.js` | resolución de textura para tipos nuevos + reset de props de efecto. |
| `src/systems/EnemyBrain.js` | margen en el reposicionamiento del `burrow`. |
| `src/scenes/GameScene.js` | `containEnemy` (cuerpo completo), `executeAttack` (tipo→tex/tinte/efecto), canal de veneno del caster. |
| `src/data/enemies/fire.js`, `water.js` | tags `projectile` + migración de modifiers `onHit*`. |
| `tests/clampBodyInside.test.js`, `tests/projectiles.test.js`, `tests/EnemyBrain.test.js` | tests de la lógica pura. |

---

## Task 1: `clampBodyInside` helper puro + `ENEMY_MARGIN`

**Files:**
- Create: `src/systems/clampBodyInside.js`
- Modify: `src/config.js` (sección de constantes, junto a `GAME_WIDTH/HEIGHT`)
- Test: `tests/clampBodyInside.test.js`

- [ ] **Step 1: Write the failing test**

Crear `tests/clampBodyInside.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampBodyInside } from '../src/systems/clampBodyInside.js';

const W = 480, H = 854;

test('un cuerpo ya dentro no se mueve', () => {
  const r = clampBodyInside(240, 400, 16, 16, W, H, 10);
  assert.deepEqual(r, { x: 240, y: 400 });
});

test('empuja el cuerpo adentro en el borde izquierdo/arriba (halfsize + margen)', () => {
  const r = clampBodyInside(0, 0, 16, 16, W, H, 10);
  assert.equal(r.x, 26); // 16 + 10
  assert.equal(r.y, 26);
});

test('empuja el cuerpo adentro en el borde derecho/abajo', () => {
  const r = clampBodyInside(W, H, 16, 20, W, H, 10);
  assert.equal(r.x, W - 26); // 480 - (16 + 10)
  assert.equal(r.y, H - 30); // 854 - (20 + 10)
});

test('respeta esquinas (clampa ambos ejes a la vez)', () => {
  const r = clampBodyInside(-50, 9999, 16, 16, W, H, 10);
  assert.equal(r.x, 26);
  assert.equal(r.y, H - 26);
});

test('margen 0 clampa justo al borde por halfsize', () => {
  const r = clampBodyInside(0, 0, 16, 16, W, H, 0);
  assert.equal(r.x, 16);
  assert.equal(r.y, 16);
});

test('cuerpo más grande que el área degrada al centro del eje', () => {
  // halfW (300) + margen excede el medio-ancho => lo > hi; clamp degrada a hi.
  const r = clampBodyInside(240, 400, 300, 300, W, H, 10);
  // Math.min(Math.max(x, lo), hi) con lo > hi => devuelve hi.
  assert.equal(r.x, W - 310);
  assert.equal(r.y, H - 310);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/clampBodyInside.test.js`
Expected: FAIL — `Cannot find module '../src/systems/clampBodyInside.js'`.

- [ ] **Step 3: Write minimal implementation**

Crear `src/systems/clampBodyInside.js`:

```js
// PURE (no Phaser). Devuelve {x, y} para que un cuerpo de tamaño halfW×halfH
// (medios anchos) quede completo dentro de [0,W] × [0,H], con un margen extra
// contra los bordes. Usado por GameScene.containEnemy y el burrow del EnemyBrain.
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

export function clampBodyInside(x, y, halfW, halfH, W, H, margin = 0) {
  return {
    x: clamp(x, halfW + margin, W - halfW - margin),
    y: clamp(y, halfH + margin, H - halfH - margin),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/clampBodyInside.test.js`
Expected: PASS (6 tests).

- [ ] **Step 5: Add `ENEMY_MARGIN` to config**

En `src/config.js`, justo debajo de la línea `export const GAME_HEIGHT = 854;`, añadir:

```js
// Colchón extra (px) además del radio del enemigo para contenerlo en pantalla:
// nada queda pegado al borde ni escondido bajo el HUD (barra HP arriba, joystick abajo).
export const ENEMY_MARGIN = 10;
```

- [ ] **Step 6: Commit**

```bash
git add src/systems/clampBodyInside.js tests/clampBodyInside.test.js src/config.js
git commit -m "feat(containment): clampBodyInside helper puro + ENEMY_MARGIN"
```

---

## Task 2: `containEnemy` clampa el cuerpo completo

**Files:**
- Modify: `src/scenes/GameScene.js` (import + método `containEnemy`, ~líneas 1 y 303-306)

Este cambio es Phaser-coupled; se verifica manualmente (no hay test unitario para la escena).

- [ ] **Step 1: Importar el helper y la constante**

En `src/scenes/GameScene.js`, línea 1, ampliar el import de `config.js` para incluir `ENEMY_MARGIN`:

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX, DEBUG, spriteKey, ENEMY_MARGIN } from '../config.js';
```

Y añadir el import del helper junto a los demás imports de `../systems/` (por ejemplo bajo el import de `EnemyBrain.js`):

```js
import { clampBodyInside } from '../systems/clampBodyInside.js';
```

- [ ] **Step 2: Reemplazar el cuerpo de `containEnemy`**

Buscar (líneas ~303-306):

```js
  containEnemy(e) {
    e.x = Phaser.Math.Clamp(e.x, 0, GAME_WIDTH);
    e.y = Phaser.Math.Clamp(e.y, 0, GAME_HEIGHT);
  }
```

Reemplazar por:

```js
  containEnemy(e) {
    const halfW = (e.displayWidth  || (e.def.radius || 16) * 2) / 2;
    const halfH = (e.displayHeight || (e.def.radius || 16) * 2) / 2;
    const { x, y } = clampBodyInside(e.x, e.y, halfW, halfH, GAME_WIDTH, GAME_HEIGHT, ENEMY_MARGIN);
    e.x = x;
    e.y = y;
  }
```

(El comentario explicativo encima del método —"No enemy may ever leave the play area…"— se conserva.)

- [ ] **Step 3: Verificación manual**

Run: `python3 -m http.server 8000` y abrir `http://localhost:8000` en un viewport móvil portrait (device toolbar).
Expected:
- Ningún enemigo (incl. minibosses/bosses) queda con medio cuerpo fuera ni pegado al borde; todos muestran su cuerpo completo con ~10px de colchón.
- Los jefes spawnean arriba y aparecen completos dentro (sin asomar por arriba).
- El nivel sigue siendo completable (los enemigos no escapan; `countActive` baja a 0).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "fix(containment): containEnemy mantiene el cuerpo completo en pantalla"
```

---

## Task 3: Margen en el reposicionamiento del `burrow`

**Files:**
- Modify: `src/systems/EnemyBrain.js` (import + función `burrow`, ~líneas 10 y 119-123)
- Test: `tests/EnemyBrain.test.js` (añadir un test)

El reposicionamiento del burrow ya clampa por radio; lo alineamos al mismo `ENEMY_MARGIN` para que el enemigo emergente tampoco quede pegado al borde.

- [ ] **Step 1: Write the failing test**

Añadir al final de `tests/EnemyBrain.test.js`:

```js
import { ENEMY_MARGIN } from '../src/config.js';

test('burrow reposiciona dentro de los bordes respetando radio + ENEMY_MARGIN', () => {
  // target pegado a la esquina superior-izquierda fuerza el clamp del destino.
  const self = { x: 5, y: 5, radius: 16 };
  const target = { x: 0, y: 0 };
  const state = { mode: 'reposition', t: 0 };
  const out = MOVEMENTS.burrow({ self, target, speed: 60, dt: 16, params: {}, state });
  assert.ok(out.repositionTo, 'debe emitir un destino de reposición');
  const min = 16 + ENEMY_MARGIN;
  assert.ok(out.repositionTo.x >= min, `x (${out.repositionTo.x}) >= ${min}`);
  assert.ok(out.repositionTo.y >= min, `y (${out.repositionTo.y}) >= ${min}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `repositionTo.x` vale `16` (radio sin margen), no `>= 26`.

- [ ] **Step 3: Implement**

En `src/systems/EnemyBrain.js`, ampliar el import de `config.js` (línea ~10):

```js
import { GAME_WIDTH, GAME_HEIGHT, ENEMY_MARGIN } from '../config.js'; // config.js is Phaser-free (constants only)
```

En la función `burrow`, dentro del bloque `if (state.mode === 'reposition')` (líneas ~117-123), cambiar el clamp del destino para sumar el margen:

```js
      const a = angleBetween(target.x, target.y, self.x, self.y);
      const dist = 80;
      const r = (self.radius || 16) + ENEMY_MARGIN;
      const rx = clamp(target.x + Math.cos(a) * dist, r, GAME_WIDTH - r);
      const ry = clamp(target.y + Math.sin(a) * dist, r, GAME_HEIGHT - r);
      return { x: 0, y: 0, repositionTo: { x: rx, y: ry } };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS (incluye el test nuevo y todos los existentes).

- [ ] **Step 5: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "fix(containment): el burrow reposiciona con ENEMY_MARGIN de colchón"
```

---

## Task 4: Módulo de datos puro `projectiles.js`

**Files:**
- Create: `src/data/projectiles.js`
- Test: `tests/projectiles.test.js`

Define el catálogo de proyectiles (textura, tinte, efecto), los defaults por elemento del mundo y el resolvedor. Los parámetros de efecto replican el comportamiento actual (`burn` 6/2000, `slow` 0.6/1200) y añaden `poison` 5/2500.

**Nota:** las claves `TEX.iceShard` / `TEX.poisonGlob` se crean en la Task 5. Este módulo las referencia; como `node --test` no carga config con Phaser pero `config.js` es Phaser-free, importarlas funciona. Implementa la Task 4 y la Task 5 en este orden y corre los tests al final de la Task 5 si `TEX.iceShard` aún no existe. (Para evitar el acople, el test de abajo solo verifica los campos `tint`/`effect`/resolución, no el valor exacto de `tex`.)

- [ ] **Step 1: Write the failing test**

Crear `tests/projectiles.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTILES, ELEMENT_DEFAULT_PROJECTILE, resolveProjectile } from '../src/data/projectiles.js';

test('el catálogo tiene los 4 tipos con su efecto', () => {
  assert.equal(PROJECTILES.arrow.effect, null);
  assert.deepEqual(PROJECTILES.fire.effect, { kind: 'burn', dps: 6, ms: 2000 });
  assert.deepEqual(PROJECTILES.ice.effect, { kind: 'slow', factor: 0.6, ms: 1200 });
  assert.deepEqual(PROJECTILES.poison.effect, { kind: 'dot', dps: 5, ms: 2500 });
});

test('cada entrada declara una textura y un tinte', () => {
  for (const k of ['arrow', 'fire', 'ice', 'poison']) {
    assert.ok(PROJECTILES[k].tex, `${k} debe tener tex`);
    assert.equal(typeof PROJECTILES[k].tint, 'number', `${k} debe tener tinte numérico`);
  }
});

test('resolveProjectile: el campo del ataque gana', () => {
  assert.equal(resolveProjectile({ projectile: 'poison' }, 'fire'), 'poison');
});

test('resolveProjectile: sin campo usa el default del elemento', () => {
  assert.equal(resolveProjectile({}, 'fire'), 'fire');
  assert.equal(resolveProjectile({}, 'water'), 'ice');
  assert.equal(resolveProjectile({}, 'air'), 'arrow');
  assert.equal(resolveProjectile({}, 'earth'), 'arrow');
});

test('resolveProjectile: fallback a arrow para elemento desconocido/null', () => {
  assert.equal(resolveProjectile({}, null), 'arrow');
  assert.equal(resolveProjectile({}, 'castle'), 'arrow');
  assert.equal(resolveProjectile(undefined, undefined), 'arrow');
});

test('ELEMENT_DEFAULT_PROJECTILE cubre los mundos elementales', () => {
  assert.equal(ELEMENT_DEFAULT_PROJECTILE.fire, 'fire');
  assert.equal(ELEMENT_DEFAULT_PROJECTILE.water, 'ice');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/projectiles.test.js`
Expected: FAIL — `Cannot find module '../src/data/projectiles.js'`.

- [ ] **Step 3: Write implementation**

Crear `src/data/projectiles.js`:

```js
// PURE data (no Phaser; importa solo constantes de config.js, que es Phaser-free).
// Catálogo de proyectiles enemigos: cada tipo define su sprite, su tinte y el
// efecto implícito que aplica al jugador al impactar. Consumido por
// GameScene.executeAttack (textura/tinte/efecto) vía resolveProjectile().
import { TEX, COLORS } from '../config.js';

export const PROJECTILES = {
  arrow:  { tex: TEX.arrow,      tint: COLORS.arrow,    effect: null },
  fire:   { tex: TEX.fireball,   tint: COLORS.fireball, effect: { kind: 'burn', dps: 6, ms: 2000 } },
  ice:    { tex: TEX.iceShard,   tint: COLORS.ice,      effect: { kind: 'slow', factor: 0.6, ms: 1200 } },
  poison: { tex: TEX.poisonGlob, tint: COLORS.poison,   effect: { kind: 'dot',  dps: 5, ms: 2500 } },
};

// Tipo por defecto según el elemento del mundo (cuando el ataque no lo declara).
export const ELEMENT_DEFAULT_PROJECTILE = {
  fire: 'fire', water: 'ice', air: 'arrow', earth: 'arrow', castle: 'arrow',
};

// El campo del ataque gana; si no, el default del mundo; si no, 'arrow'.
export function resolveProjectile(att, element) {
  return (att && att.projectile) || ELEMENT_DEFAULT_PROJECTILE[element] || 'arrow';
}
```

- [ ] **Step 4: Run test**

Run: `node --test tests/projectiles.test.js`
Expected: el test de resolución/efecto/tinte PASA. El test "cada entrada declara una textura" puede fallar si `TEX.iceShard`/`TEX.poisonGlob` son `undefined` — se arregla en la Task 5. Si falla solo por eso, continúa a la Task 5 y vuelve a correr.

- [ ] **Step 5: Commit**

```bash
git add src/data/projectiles.js tests/projectiles.test.js
git commit -m "feat(projectiles): catálogo PROJECTILES + resolveProjectile (puro)"
```

---

## Task 5: Claves de textura `iceShard` y `poisonGlob`

**Files:**
- Modify: `src/config.js` (objeto `TEX`, líneas ~56-67)

- [ ] **Step 1: Añadir las claves a `TEX`**

En `src/config.js`, dentro de `export const TEX = { … }`, añadir dos entradas junto a `arrow`:

```js
  arrow: 'tex_arrow',
  iceShard: 'tex_iceShard',
  poisonGlob: 'tex_poisonGlob',
```

- [ ] **Step 2: Run the projectiles test (ahora completo)**

Run: `node --test tests/projectiles.test.js`
Expected: PASS (los 6 tests, incluido "cada entrada declara una textura").

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(projectiles): claves TEX iceShard y poisonGlob"
```

---

## Task 6: Grids de pixel-art `ice_shard` y `poison_glob`

**Files:**
- Modify: `src/data/sprites/parts.js` (objeto `PARTS`, junto a `arrow_body` ~línea 925-942)

Convención de caracteres (igual que el resto de `PARTS`): `o`=outline, `b`=base, `h`=highlight, `s`=shade, `a`=accent, `.`=transparente. `res:32` es la resolución de la cuadrícula; `anchor` es el punto de pivote.

- [ ] **Step 1: Añadir las partes**

En `src/data/sprites/parts.js`, justo después de la entrada `arrow_body: { … },` (antes del comentario de la princesa), añadir:

```js
  // --- Proyectiles enemigos extra ---
  // Esquirla de hielo: diamante facetado, brilla al centro. Rota con la dirección.
  ice_shard: {
    res: 32, w: 11, h: 11, anchor: { x: 5, y: 5 },
    down: [
      '.....o.....',
      '....oho....',
      '...ohbho...',
      '..ohbbbho..',
      '.ohbbhbbho.',
      'ohbbbhbbbho',
      '.ohbbhbbho.',
      '..ohbbbho..',
      '...ohbho...',
      '....oho....',
      '.....o.....',
    ], up: null, side: null,
  },
  // Gota de veneno: glóbulo redondo con burbujas (accent) y una gota que escurre.
  poison_glob: {
    res: 32, w: 11, h: 13, anchor: { x: 5, y: 5 },
    down: [
      '....ooo....',
      '..oobbboo..',
      '.obbbhbbbo.',
      'obbbbbbbbbo',
      'obbabbbabbo',
      'obbbbhbbbbo',
      'obbbbbbbbbo',
      '.obbbabbbo.',
      '.obbbbbbbo.',
      '..oobbboo..',
      '...obbbo...',
      '....obo....',
      '.....o.....',
    ], up: null, side: null,
  },
```

- [ ] **Step 2: Verificación de carga (sanity)**

Run: `node -e "import('./src/data/sprites/parts.js').then(m => { const p = m.PARTS; console.log('ice_shard rows', p.ice_shard.down.length, 'wide', p.ice_shard.down.every(r => r.length === p.ice_shard.w)); console.log('poison_glob rows', p.poison_glob.down.length, 'wide', p.poison_glob.down.every(r => r.length === p.poison_glob.w)); })"`
Expected:
```
ice_shard rows 11 wide true
poison_glob rows 13 wide true
```
(Confirma que cada fila tiene exactamente `w` columnas — si `wide` es `false`, hay una fila con largo incorrecto.)

- [ ] **Step 3: Commit**

```bash
git add src/data/sprites/parts.js
git commit -m "feat(sprites): partes ice_shard y poison_glob (proyectiles)"
```

---

## Task 7: Recetas `iceShard` y `poisonGlob`

**Files:**
- Modify: `src/data/sprites/recipes.js` (objeto `RECIPES`, junto a `arrow` ~línea 135)

`BootScene` itera `Object.entries(RECIPES)` y forja cada receta en texturas + anims (`spr_<key>`, `<key>-idle-down`, …), así que añadir las entradas las registra automáticamente. Las recetas de proyectil inlinan su `baseColor` en hex (igual que `arrow`/`orb`/`fireball`); los valores coinciden con `COLORS.ice` (0xb3e5fc) y `COLORS.poison` (0x7cb342).

- [ ] **Step 1: Añadir las recetas**

En `src/data/sprites/recipes.js`, dentro de `export const RECIPES = { … }`, justo después de la línea de `arrow:` (~135), añadir:

```js
  iceShard:   { archetype: 'projectile', size: 32, baseColor: 0xb3e5fc, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['ice_shard'] },
  poisonGlob: { archetype: 'projectile', size: 32, baseColor: 0x7cb342, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['poison_glob'] },
```

- [ ] **Step 2: Verificación de forja**

Run: `node -e "import('./src/data/sprites/recipes.js').then(r => { const R = r.RECIPES; console.log('iceShard?', r.hasRecipe('iceShard'), 'poisonGlob?', r.hasRecipe('poisonGlob')); })"`
Expected: `iceShard? true poisonGlob? true`

- [ ] **Step 3: Verificación visual (manual)**

Run: `python3 -m http.server 8000`, abrir el juego en viewport móvil portrait y entrar a un nivel del mundo de agua.
Expected: los sprites se forjan sin errores en consola (no hay `Texture key ... not found`). La validación de que los enemigos disparan hielo/veneno llega en la Task 9-10; aquí solo confirmamos que las texturas existen.

- [ ] **Step 4: Commit**

```bash
git add src/data/sprites/recipes.js
git commit -m "feat(sprites): recetas iceShard y poisonGlob"
```

---

## Task 8: `ProjectilePool` — resolución de textura + reset de efectos

**Files:**
- Modify: `src/systems/ProjectilePool.js` (líneas 5, 28-31, 35-41)

Dos cambios: (1) mapear las texturas nuevas a sus recetas; (2) **resetear todas las props de efecto** en `fire()` para que un disparo reciclado no arrastre `slowFactor`/`poisonDps` de un uso anterior (hoy `slowFactor`/`slowMs` no se resetean — bug latente que aflora al usar hielo).

- [ ] **Step 1: Extender `PROJECTILE_KEY`**

En `src/systems/ProjectilePool.js`, línea 5, reemplazar:

```js
const PROJECTILE_KEY = { [TEX.orb]: 'orb', [TEX.fireball]: 'fireball', [TEX.arrow]: 'arrow' };
```

por:

```js
const PROJECTILE_KEY = {
  [TEX.orb]: 'orb', [TEX.fireball]: 'fireball', [TEX.arrow]: 'arrow',
  [TEX.iceShard]: 'iceShard', [TEX.poisonGlob]: 'poisonGlob',
};
```

- [ ] **Step 2: Resetear todas las props de efecto en `fire()`**

En `fire()`, localizar el bloque de reset (líneas ~27-31):

```js
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    p.burnDps = 0;             // reset; only fireball sets this after fire()
    p.burnMs = 0;
    p.homing = false;
    p.homingLife = 0;          // reset; only homing enemy shots set this after fire()
```

Reemplazar por (añade slow + poison al reset):

```js
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    p.burnDps = 0;             // reset; effect props se setean tras fire() según el tipo
    p.burnMs = 0;
    p.slowFactor = 0;          // reset; solo los disparos de hielo lo setean
    p.slowMs = 0;
    p.poisonDps = 0;           // reset; solo los disparos de veneno lo setean
    p.poisonMs = 0;
    p.homing = false;
    p.homingLife = 0;          // reset; only homing enemy shots set this after fire()
```

- [ ] **Step 3: Rotar la esquirla de hielo con la dirección**

En el bloque `if (useSprite) { … }` (líneas ~35-41), la línea actual:

```js
      if (sprKey === 'fireball' || sprKey === 'arrow') p.setRotation(angle);
```

cambiar a (incluir `iceShard`; la gota de veneno no rota):

```js
      if (sprKey === 'fireball' || sprKey === 'arrow' || sprKey === 'iceShard') p.setRotation(angle);
```

- [ ] **Step 4: Verificación de carga**

Run: `node --test tests/projectiles.test.js`
Expected: PASS (sin regresiones; este task no cambia datos pero confirma que nada se rompió en imports compartidos).

- [ ] **Step 5: Commit**

```bash
git add src/systems/ProjectilePool.js
git commit -m "feat(projectiles): ProjectilePool resuelve hielo/veneno y resetea efectos"
```

---

## Task 9: `GameScene.executeAttack` tipado + canal de veneno del caster

**Files:**
- Modify: `src/scenes/GameScene.js` (imports, `init`, `setupCollisions` overlap, `executeAttack`, canal de veneno, `update`)

Phaser-coupled → verificación manual. Aquí está el corazón del cambio de proyectiles.

- [ ] **Step 1: Importar el resolvedor y el catálogo**

En `src/scenes/GameScene.js`, añadir junto a los imports de `../data/`:

```js
import { PROJECTILES, resolveProjectile } from '../data/projectiles.js';
```

- [ ] **Step 2: Guardar el elemento del mundo en `init`**

En `init(data)` (línea ~40, tras `this.region = REGIONS[this.regionId];`), añadir:

```js
    this.regionElement = this.region.element; // 'fire'|'water'|… o null (castillo)
```

- [ ] **Step 3: Inicializar el canal de veneno del caster**

Donde se inicializa el burn del caster (líneas ~74-75):

```js
    this.casterBurnRemaining = 0;
    this.casterBurnDps = 0;
```

añadir debajo:

```js
    this.casterPoisonRemaining = 0;
    this.casterPoisonDps = 0;
```

- [ ] **Step 4: Aplicar veneno en el overlap disparo↔caster**

En `setupCollisions`, el overlap `caster ↔ enemyShots` (líneas ~115-121):

```js
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      if (shot.burnDps > 0) this.applyCasterBurn(shot.burnDps, shot.burnMs);
      if (shot.slowFactor) this.applyCasterSlowFx(shot.slowFactor, shot.slowMs ?? 1200);
      this.enemyShots.despawn(shot);
    });
```

añadir la línea de veneno antes del `despawn`:

```js
      if (shot.poisonDps > 0) this.applyCasterPoison(shot.poisonDps, shot.poisonMs);
```

- [ ] **Step 5: Reescribir el bloque de efecto en `executeAttack`**

Localizar (líneas ~519-533):

```js
    const burn = findModifier(enemy.def, 'onHitBurn');
    const projs = buildProjectiles(att, {
      self: { x: enemy.x, y: enemy.y },
      target: { x: this.caster.x, y: this.caster.y },
      damage: enemy.def.damage,
    });
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      const shot = this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
      if (!shot) continue;
      shot.setTint(COLORS.fireball); // enemy shots read clearly distinct from the player's cyan orbs
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; shot.homingLife = HOMING_TTL_MS; }
      if (burn) { shot.burnDps = burn.dps ?? 6; shot.burnMs = burn.ms ?? 2000; }
    }
```

Reemplazar por:

```js
    const type = resolveProjectile(att, this.regionElement);
    const spec = PROJECTILES[type] || PROJECTILES.arrow;
    const eff = spec.effect;
    // Un modifier onHit* presente afina los parámetros del efecto de su tipo
    // (p. ej. elemental_fuego quema más fuerte) sin duplicar la aplicación.
    const burnMod = eff && eff.kind === 'burn' ? findModifier(enemy.def, 'onHitBurn') : null;
    const slowMod = eff && eff.kind === 'slow' ? findModifier(enemy.def, 'onHitSlow') : null;
    const projs = buildProjectiles(att, {
      self: { x: enemy.x, y: enemy.y },
      target: { x: this.caster.x, y: this.caster.y },
      damage: enemy.def.damage,
    });
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      const shot = this.enemyShots.fire(spec.tex, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
      if (!shot) continue;
      shot.setTint(spec.tint); // disparos enemigos distinguibles del orbe cian del jugador
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; shot.homingLife = HOMING_TTL_MS; }
      if (eff && eff.kind === 'burn') { shot.burnDps = burnMod?.dps ?? eff.dps; shot.burnMs = burnMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'slow') { shot.slowFactor = slowMod?.factor ?? eff.factor; shot.slowMs = slowMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'dot') { shot.poisonDps = eff.dps; shot.poisonMs = eff.ms; }
    }
```

- [ ] **Step 6: Añadir `applyCasterPoison` + `updateCasterPoison`**

Junto a `applyCasterBurn` / `updateCasterBurn` (líneas ~877-886), añadir dos métodos (espejo del burn, con feedback verde):

```js
  applyCasterPoison(dps, ms) {
    this.casterPoisonDps = Math.max(this.casterPoisonDps, dps);
    this.casterPoisonRemaining = Math.max(this.casterPoisonRemaining, ms);
    this.caster.setTint(COLORS.poison);
    this.time.delayedCall(200, () => this.caster.clearTint());
  }

  updateCasterPoison(delta) {
    if (this.casterPoisonRemaining <= 0) { this.casterPoisonDps = 0; return; }
    this.casterPoisonRemaining -= delta;
    this.damageCaster(this.casterPoisonDps * (delta / 1000));
  }
```

- [ ] **Step 7: Tickear el veneno en `update`**

Localizar (líneas ~643-644):

```js
    this.updateBurns(delta);
    this.updateCasterBurn(delta);
```

añadir debajo:

```js
    this.updateCasterPoison(delta);
```

- [ ] **Step 8: Verificación manual**

Run: `python3 -m http.server 8000`, abrir en viewport móvil portrait.
Expected:
- **Mundo de fuego:** los disparos enemigos se ven como llamas naranjas (sprite fireball) y queman al jugador (daño residual tras el impacto).
- **Mundo de agua:** los disparos por defecto son esquirlas de hielo (azul pálido) que ralentizan al jugador (tinte azul breve + movimiento más lento).
- No hay error en consola por texturas faltantes.
- (La validación de veneno y de la migración de modifiers se cierra en la Task 10.)

- [ ] **Step 9: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(projectiles): executeAttack tipado + canal de veneno del caster"
```

---

## Task 10: Tags de proyectil en enemigos + migración de modifiers

**Files:**
- Modify: `src/data/enemies/water.js` (acólito de escarcha, sapo adulto, sapo escupidor)
- Modify: `src/data/enemies/fire.js` (espíritu de ceniza)

Regla de migración:
- **Ranged con efecto = el del tipo por defecto** → quitar el modifier redundante (el tipo ya aplica el efecto).
- **Ranged con efecto más fuerte que el default** → conservar el modifier (afina los parámetros vía la lógica de override de la Task 9).
- **Melee/aura con onHit\*** → conservar el modifier (aplica por contacto, no por disparo; `executeAttack` no corre para ellos).
- **Veneno** → etiquetar explícitamente los sapos que escupen.

- [ ] **Step 1: Agua — quitar `onHitSlow` redundante del Acólito de Escarcha**

En `src/data/enemies/water.js`, el enemigo `acolito_escarcha` (líneas ~10-14). Su disparo en mundo de agua ya es de hielo por defecto (ralentiza 0.6/1200 = lo que daba el modifier vacío). Quitar la línea del modifier:

Antes:
```js
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1500, speed: 240 }],
    modifiers: [{ type: 'onHitSlow' }] },
```
Después:
```js
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1500, speed: 240 }] },
```

- [ ] **Step 2: Agua — veneno para los sapos que escupen**

En `sapo_adulto` (líneas ~72-78), etiquetar SOLO el `shootStraight` como veneno (el `summon` no cambia):

Antes:
```js
    attacks: [
      { type: 'shootStraight', every: 1700, speed: 230 },
      { type: 'summon', spawnType: 'huevo_sapo', count: 1, every: 5000 },
    ] },
```
Después:
```js
    attacks: [
      { type: 'shootStraight', projectile: 'poison', every: 1700, speed: 230 },
      { type: 'summon', spawnType: 'huevo_sapo', count: 1, every: 5000 },
    ] },
```

En `sapo_escupidor` (líneas ~87-90), etiquetar su `shootStraight`:

Antes:
```js
    attacks: [{ type: 'shootStraight', every: 1600, speed: 230 }] },
```
Después:
```js
    attacks: [{ type: 'shootStraight', projectile: 'poison', every: 1600, speed: 230 }] },
```

- [ ] **Step 3: Fuego — quitar `onHitBurn` redundante del Espíritu de Ceniza**

En `src/data/enemies/fire.js`, `espiritu_ceniza` (líneas ~32-34). Su disparo en mundo de fuego ya es de fuego por defecto (quema 6/2000 = lo que daba su modifier). Quitar el modifier:

Antes:
```js
  espiritu_ceniza: { key: 'espiritu_ceniza', tex: TEX.villager, color: COLORS.ash, hp: 24, speed: 70, damage: 7, radius: 16,
    movement: { type: 'erratic' }, attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 220 }],
    modifiers: [{ type: 'onHitBurn', dps: 6, ms: 2000 }] },
```
Después:
```js
  espiritu_ceniza: { key: 'espiritu_ceniza', tex: TEX.villager, color: COLORS.ash, hp: 24, speed: 70, damage: 7, radius: 16,
    movement: { type: 'erratic' }, attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 220 }] },
```

**No tocar** `elemental_fuego` (fire.js ~37-39): conserva `onHitBurn {dps:8, ms:2200}` para que su nova queme más fuerte que el default (la lógica de override de la Task 9 usa esos parámetros, sin duplicar). Tampoco tocar `guardia_hielo` ni `burbuja_gelida` (su `onHitSlow` es por contacto melee/aura, no por disparo).

- [ ] **Step 4: Verificar que los datos de enemigos siguen válidos**

Run: `node --test`
Expected: PASS de toda la suite (incluye `waterRoster.test.js`, `bosses.water.test.js`, `EnemyBrain.test.js`, etc.). Si algún test afirmaba la presencia de `onHitSlow`/`onHitBurn` en estos enemigos, actualizarlo a la nueva forma (etiqueta `projectile` / ausencia del modifier).

- [ ] **Step 5: Verificación manual**

Run: `python3 -m http.server 8000`, viewport móvil portrait.
Expected:
- **Agua:** el Acólito de Escarcha sigue ralentizando (ahora vía esquirla de hielo). Los sapos disparan gotas de veneno verdes que aplican daño-por-tiempo (la vida baja un rato tras el impacto, con tinte verde breve).
- **Fuego:** el Espíritu de Ceniza sigue quemando (vía proyectil de fuego). El Elemental de Fuego sigue quemando más fuerte (nova).
- Ningún efecto se duplica (la quemadura/ralentización no aplica dos veces).

- [ ] **Step 6: Commit**

```bash
git add src/data/enemies/water.js src/data/enemies/fire.js
git commit -m "feat(enemies): tags de proyectil (hielo/veneno) + migración de modifiers onHit*"
```

---

## Verificación final

- [ ] **Suite completa de tests**

Run: `node --test`
Expected: todos los tests pasan (incl. los nuevos: `clampBodyInside`, `projectiles`, el caso de burrow en `EnemyBrain`).

- [ ] **Pase manual completo** (viewport móvil portrait, `python3 -m http.server 8000`):
  - Mundo de fuego: proyectiles de fuego (queman); mundo de agua: hielo por defecto (ralentiza); sapos: veneno (DoT).
  - Arqueros genéricos (mundo neutro/castillo) disparan flechas amarillas sin efecto.
  - Ningún enemigo —incl. minibosses y bosses— queda con cuerpo fuera o pegado al borde; todos completos con colchón.
  - Niveles completables; los enemigos no escapan.
