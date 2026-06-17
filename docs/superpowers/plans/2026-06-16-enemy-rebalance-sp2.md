# SP-2 — Facing del can_lava y retrabajo del burrow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El can_lava mira siempre a la princesa (flip al cruzar) y el movimiento `burrow` alterna inmersión invulnerable con una ventana de persecución vulnerable larga.

**Architecture:** La lógica nueva vive en módulos puros testeables: un helper de flip en `FacingController.js` y la máquina de estados `MOVEMENTS.burrow` en `EnemyBrain.js`. El cableado de flags (sprite/visibilidad/invuln) vive en `Enemy.js` (Phaser, playtest). Los defs de datos solo cambian campos.

**Tech Stack:** Phaser 3 (CDN, ES modules nativos), `node:test` + `node:assert/strict`.

## Global Constraints

- **Sin build step / sin bundler / sin npm en runtime.**
- **Solo módulos puros se unit-testean** (`FacingController` parte pura, `EnemyBrain`). El cableado en `Enemy.js`/escena se verifica con `node --test` verde + playtest portrait 480×854.
- **Claves `TEX`/`COLORS` centralizadas** en `config.js`.
- Comando de tests: `node --test`.

---

### Task 1: Helper puro de flip hacia la princesa

**Files:**
- Modify: `src/objects/FacingController.js` (añadir export `facePlayerFlip`)
- Test: `tests/FacingController.test.js` (crear si no existe)

**Interfaces:**
- Produces: `facePlayerFlip(spriteX: number, targetX: number) → boolean` — `true` si el objetivo está a la izquierda del sprite (hay que voltear).

- [ ] **Step 1: Escribir el test que falla**

Crear/abrir `tests/FacingController.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facePlayerFlip } from '../src/objects/FacingController.js';

test('facePlayerFlip voltea cuando la princesa está a la izquierda', () => {
  assert.equal(facePlayerFlip(100, 50), true);
});

test('facePlayerFlip no voltea cuando la princesa está a la derecha', () => {
  assert.equal(facePlayerFlip(100, 150), false);
});

test('facePlayerFlip no voltea cuando están alineados', () => {
  assert.equal(facePlayerFlip(100, 100), false);
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `node --test tests/FacingController.test.js`
Expected: FAIL con "facePlayerFlip is not a function" / no exportada.

- [ ] **Step 3: Implementar el helper puro**

En `src/objects/FacingController.js`, debajo de `pickFacing`:

```js
// PURE. flipX para un enemigo que siempre mira a la princesa: voltea cuando ella
// está a la izquierda del sprite. Sin histéresis (banda muerta opcional a futuro).
export function facePlayerFlip(spriteX, targetX) {
  return targetX < spriteX;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `node --test tests/FacingController.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/objects/FacingController.js tests/FacingController.test.js
git commit -m "feat(facing): helper puro facePlayerFlip para enemigos que miran a la princesa"
```

---

### Task 2: Modo facePlayer en FacingController

**Files:**
- Modify: `src/objects/FacingController.js` (`FacingController` class)

**Interfaces:**
- Consumes: `facePlayerFlip` (Task 1).
- Produces: `FacingController` con propiedad pública `facePlayer` (default `false`); cuando es `true` y `update` recibe `aim`, el `flipX` se rige por la posición del objetivo cada frame.

- [ ] **Step 1: Añadir la propiedad `facePlayer` en el constructor**

En `FacingController.constructor`, tras `this.attacking = false;`:

```js
    this.facePlayer = false; // si true, el flipX se rige por `aim` (la princesa) cada frame
```

- [ ] **Step 2: Aplicar el flip por objetivo en `update`**

En `FacingController.update(vx, vy, aim)`, al inicio del cuerpo (tras el early-return de `this.attacking`), añadir la rama facePlayer. La versión final del método:

```js
  update(vx, vy, aim) {
    if (this.attacking) {
      const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
      if (moving) this.lastDir = pickFacing(vx, vy, this.lastDir).dir;
      return;
    }
    const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
    // facePlayer: el flipX se rige por la princesa (aim) cada frame, no por la velocidad.
    // El sprite es de vista lateral: dirección 'side', se voltea al cruzar ella la vertical.
    if (this.facePlayer && aim) {
      const flipX = facePlayerFlip(this.sprite.x, aim.x);
      this.lastDir = 'side';
      this.sprite.setFlipX(flipX);
      const state = moving ? 'walk' : 'idle';
      this.sprite.anims.play(`${this.key}-${state}-side`, true);
      return;
    }
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
```

- [ ] **Step 3: Verificar sin regresión**

Run: `node --test`
Expected: PASS (la parte pura sigue verde; el modo facePlayer es Phaser y se valida en playtest).

- [ ] **Step 4: Commit**

```bash
git add src/objects/FacingController.js
git commit -m "feat(facing): modo facePlayer en FacingController (flip por posición de la princesa)"
```

---

### Task 3: can_lava mira a la princesa (cableado en Enemy + flag de datos)

**Files:**
- Modify: `src/objects/Enemy.js` (constructor: set `facePlayer`; `preUpdate`: pasar `aim`)
- Modify: `src/data/enemies/fire.js` (`can_lava`: añadir `facePlayer: true`)

**Interfaces:**
- Consumes: `FacingController.facePlayer` (Task 2); `this.scene.caster` (la heroína, ya existe en GameScene).
- Produces: enemigos con `def.facePlayer` orientan su sprite a la princesa.

- [ ] **Step 1: Set `facePlayer` al construir el FacingController**

En `src/objects/Enemy.js`, dentro del `if (useSprite) { ... }` del constructor, tras `this.facing = new FacingController(this, visualKey);`:

```js
      this.facing.facePlayer = !!def.facePlayer;
```

- [ ] **Step 2: Pasar `aim` en `preUpdate` para enemigos facePlayer**

En `src/objects/Enemy.js`, reemplazar el `preUpdate`:

```js
  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.facing && this.body) {
      const aim = this.def.facePlayer && this.scene && this.scene.caster
        ? { x: this.scene.caster.x, y: this.scene.caster.y }
        : undefined;
      this.facing.update(this.body.velocity.x, this.body.velocity.y, aim);
    }
  }
```

- [ ] **Step 3: Marcar al can_lava en los datos**

En `src/data/enemies/fire.js`, en la def de `can_lava`, añadir `facePlayer: true` (junto al resto de campos, p. ej. tras `radius: 17,`):

```js
  can_lava: { key: 'can_lava', tex: TEX.villager, color: COLORS.magma, hp: 30, speed: 90, damage: 15, radius: 17, facePlayer: true,
    movement: { type: 'charge', windup: 500, dash: 350, recover: 600, dashMul: 3.2 }, attacks: [{ type: 'melee' }] },
```

- [ ] **Step 4: Verificar sin regresión**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Playtest**

`python3 -m http.server 8000`, viewport portrait. Entrar a un nivel de fuego con can_lava. Verificar: la cabeza del perro apunta a la princesa y el sprite se voltea cuando ella cruza al lado opuesto, incluso durante el windup del charge.

- [ ] **Step 6: Commit**

```bash
git add src/objects/Enemy.js src/data/enemies/fire.js
git commit -m "feat(enemies): el can_lava mira siempre a la princesa (facePlayer)"
```

---

### Task 4: Retrabajo de MOVEMENTS.burrow (máquina de estados pura)

**Files:**
- Modify: `src/data/tuning.js` (añadir `BURROW_SURFACE_MS`, ajustar `BURROW_TELEGRAPH_MS`)
- Modify: `src/systems/EnemyBrain.js:99-146` (`MOVEMENTS.burrow`)
- Test: `tests/EnemyBrain.test.js` (actualizar/añadir tests del burrow)

**Interfaces:**
- Consumes: `BURROW_SUBMERGE_MS`, `BURROW_TELEGRAPH_MS`, `BURROW_SURFACE_MS` de `tuning.js`; `GAME_WIDTH`/`GAME_HEIGHT`/`ENEMY_MARGIN` de `config.js` (ya importados).
- Produces: `MOVEMENTS.burrow(ctx)` emite por frame `{ x, y, submerged?, surfacing?, vulnerable?, repositionTo? }`. Estados: `submerged`(invuln) → `reposition`(teleport) → `emerge`(telegraph, invuln) → `surface`(chase, vulnerable durante `surfaceMs`) → `submerged`.

- [ ] **Step 1: Añadir la constante de superficie en tuning**

En `src/data/tuning.js`, en la sección "Burrow movement":

```js
// Burrow movement.
export const BURROW_SUBMERGE_MS = 1500;       // invuln + hidden window
export const BURROW_TELEGRAPH_MS = 450;       // surface-warning ring duration (antes 400)
export const BURROW_SURFACE_MS = 2500;        // ventana de superficie/persecución vulnerable
export const BURROW_RECOVER_MS = 600;         // (legacy; ya no usado por el nuevo flujo)
```

- [ ] **Step 2: Escribir los tests que fallan**

En `tests/EnemyBrain.test.js`, **reemplazar** los tests existentes del burrow (buscar `burrow` en el archivo) por:

```js
test('burrow: ciclo submerged → reposition → emerge → surface → submerged', () => {
  const self = { x: 100, y: 100, radius: 17 };
  const target = { x: 200, y: 200 };
  const params = { submergeMs: 100, emergeMs: 100, surfaceMs: 300 };
  const state = {};
  const step = () => MOVEMENTS.burrow({ self, target, speed: 100, dt: 100, params, state });

  // 1) submerged: invuln, sin moverse
  let v = step();
  assert.equal(v.submerged, true);
  assert.equal(v.x, 0); assert.equal(v.y, 0);

  // 2) reposition: teletransporta junto al objetivo, sigue submerged
  v = step();
  assert.equal(v.submerged, true);
  assert.ok(v.repositionTo && typeof v.repositionTo.x === 'number');

  // 3) emerge: aviso de superficie, aún invuln (submerged true)
  v = step();
  assert.equal(v.surfacing, true);
  assert.equal(v.submerged, true);

  // 4) surface: vulnerable y persiguiendo al objetivo (velocidad hacia abajo-derecha)
  v = step();
  assert.equal(v.vulnerable, true);
  assert.equal(v.submerged, undefined);
  assert.ok(v.x > 0 && v.y > 0);

  // 5) sigue en surface (300ms de ventana, dt 100 → 3 frames vulnerables)
  v = step();
  assert.equal(v.vulnerable, true);

  // 6) expira la superficie → vuelve a submerged
  v = step();
  assert.equal(v.submerged, true);
});
```

- [ ] **Step 3: Correr los tests (deben fallar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL (el burrow viejo no emite `surface`/`vulnerable` así).

- [ ] **Step 4: Reescribir `MOVEMENTS.burrow`**

Reemplazar el cuerpo de `burrow` en `src/systems/EnemyBrain.js`. Actualizar también el import (quitar `BURROW_RECOVER_MS` si ya no se usa, añadir `BURROW_SURFACE_MS`):

```js
  burrow({ self, target, speed, dt, params, state }) {
    const submergeMs = params?.submergeMs ?? BURROW_SUBMERGE_MS;
    const emergeMs   = params?.emergeMs ?? params?.surfaceTelegraphMs ?? BURROW_TELEGRAPH_MS;
    const surfaceMs  = params?.surfaceMs ?? BURROW_SURFACE_MS;

    state.mode = state.mode || 'submerged';
    state.t    = (state.t || 0) + dt;

    if (state.mode === 'submerged') {
      if (state.t >= submergeMs) { state.mode = 'reposition'; state.t = 0; }
      return { x: 0, y: 0, submerged: true };
    }

    if (state.mode === 'reposition') {
      // Teletransporta a un punto cercano al objetivo (invuln, aún oculto).
      state.mode = 'emerge';
      state.t = 0;
      const a = angleBetween(target.x, target.y, self.x, self.y);
      const dist = 80;
      const r = (self.radius || 16) + ENEMY_MARGIN;
      const rx = clamp(target.x + Math.cos(a) * dist, r, GAME_WIDTH - r);
      const ry = clamp(target.y + Math.sin(a) * dist, r, GAME_HEIGHT - r);
      return { x: 0, y: 0, submerged: true, repositionTo: { x: rx, y: ry } };
    }

    if (state.mode === 'emerge') {
      // Anillo de aviso; sigue invulnerable (submerged) durante el telegraph.
      if (state.t >= emergeMs) { state.mode = 'surface'; state.t = 0; }
      return { x: 0, y: 0, submerged: true, surfacing: true };
    }

    if (state.mode === 'surface') {
      // Nada hacia la princesa, VULNERABLE toda la ventana.
      if (state.t >= surfaceMs) { state.mode = 'submerged'; state.t = 0; return { x: 0, y: 0, submerged: true }; }
      const a = angleBetween(self.x, self.y, target.x, target.y);
      return { x: Math.cos(a) * speed, y: Math.sin(a) * speed, vulnerable: true };
    }

    return { x: 0, y: 0 }; // fallback
  },
```

Y en el import al inicio de `EnemyBrain.js`:

```js
import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_SURFACE_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../data/tuning.js';
```

- [ ] **Step 5: Correr los tests (deben pasar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 6: Verificar toda la suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/systems/EnemyBrain.js src/data/tuning.js tests/EnemyBrain.test.js
git commit -m "feat(enemies): burrow alterna inmersión invulnerable con persecución vulnerable en superficie"
```

---

### Task 5: Cableado de flags de burrow en Enemy + defs de los tiburones

**Files:**
- Modify: `src/objects/Enemy.js:93-105` (`think`, bloque de side-effects del burrow)
- Modify: `src/data/enemies/water.js` (`tiburon_joven` movement)
- Modify: `src/data/bosses/water.js` (`tiburon_abisal` movement, `dama_tiburon` movement)

**Interfaces:**
- Consumes: los campos `{ submerged, surfacing, vulnerable, repositionTo }` que emite `MOVEMENTS.burrow` (Task 4).
- Produces: `_burrowed` (invuln/oculto) verdadero durante `submerged` y `emerge`; falso en `surface`. `_surfacing` verdadero solo en `emerge`.

- [ ] **Step 1: Reescribir el bloque de side-effects del burrow en `Enemy.think`**

El nuevo flujo necesita que `emerge` (que emite `submerged:true` + `surfacing:true`) deje al enemigo **invulnerable** (oculto/faded) mientras muestra el anillo. Reemplazar el bloque actual:

```js
    // Burrow side-effects: write the _burrowed / _surfacing flags that GameScene reads.
    if (velocity.submerged !== undefined) {
      this._burrowed = !!velocity.submerged;
      this._surfacing = false;
    }
    if (velocity.surfacing) {
      this._burrowed = false;
      this._surfacing = true;
    }
    if (velocity.vulnerable || velocity.dashStrike) {
      this._burrowed = false;
      this._surfacing = false;
    }
    if (velocity.repositionTo) {
      this.x = velocity.repositionTo.x;
      this.y = velocity.repositionTo.y;
    }
```

por:

```js
    // Burrow side-effects. El nuevo flujo: `submerged` controla la invulnerabilidad;
    // `surfacing` solo enciende el anillo de aviso (sigue invuln durante el emerge).
    // En `surface` el enemigo es vulnerable (no emite `submerged`).
    if (velocity.submerged !== undefined || velocity.surfacing || velocity.vulnerable) {
      this._burrowed = !!velocity.submerged;
      this._surfacing = !!velocity.surfacing;
    }
    if (velocity.repositionTo) {
      this.x = velocity.repositionTo.x;
      this.y = velocity.repositionTo.y;
    }
```

(`hitEnemy` ya hace `if (enemy._burrowed) return;` → invuln mientras `_burrowed`. El render `setAlpha(e._burrowed ? 0.15 : 1)` deja al tiburón faded bajo el agua y opaco en superficie. El anillo se dibuja con `e._surfacing`.)

- [ ] **Step 2: Actualizar la def del tiburón joven al nuevo esquema**

En `src/data/enemies/water.js`, `tiburon_joven` movement:

```js
    movement: { type: 'burrow', submergeMs: 1500, emergeMs: 450, surfaceMs: 2500 },
```

(Quitar `repositionMs`/`attackMs`/`recoverMs`; conservar `attacks: [{ type: 'dashStrike' }]` — el lunge sigue disponible.)

- [ ] **Step 3: Actualizar las defs de los bosses burrow**

En `src/data/bosses/water.js`:

- `TIBURON_ABISAL` movement → `{ type: 'burrow', submergeMs: 1600, emergeMs: 450, surfaceMs: 2500 }`.
- `DAMA_TIBURON` movement → `{ type: 'burrow', submergeMs: 1400, emergeMs: 450, surfaceMs: 2200 }`.

(Sus secuencias `phases` con `dashStrike`/`wait` se conservan; disparan durante la ventana de superficie. Se afinan en playtest — ver Step 5.)

- [ ] **Step 4: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Playtest**

`python3 -m http.server 8000`, portrait. Pelear contra el tiburón joven (nivel de agua) y el tiburón abisal (miniboss nv6):
- El tiburón **nada visiblemente hacia la princesa ~2.5s recibiendo daño**, luego se hunde ~1.5s invulnerable (faded), reaparece con anillo de aviso.
- La ventana de daño se siente justa, no frustrante. Si los `dashStrike` del abisal caen mientras está sumergido y se sienten random, ajustar los `wait`/`dur` de su secuencia para alinearlos con la fase de superficie (iteración de tuning en `bosses/water.js`).
- Revisar también la forma tiburón de La Dama del Lago (temple boss nv8) tras el cambio.

- [ ] **Step 6: Commit**

```bash
git add src/objects/Enemy.js src/data/enemies/water.js src/data/bosses/water.js
git commit -m "feat(enemies): cablea el nuevo burrow (invuln en emerge, vulnerable en superficie) y ajusta defs de tiburones"
```

---

## Self-Review (SP-2)

- **Cobertura del spec:** §1 facePlayer → Tasks 1-3; §2 burrow rework → Tasks 4-5 (constante, máquina pura, cableado de flags, defs de los 3 burrow users). ✔
- **Sin placeholders:** helper, método `update` completo, máquina de estados completa, defs exactas. ✔
- **Consistencia de tipos:** `facePlayerFlip(spriteX, targetX)` usado igual en Tasks 1-2; campos `{submerged,surfacing,vulnerable,repositionTo}` emitidos por Task 4 y consumidos por Task 5. ✔

## Notas

- El `dashStrike` de lunge es opcional por def: si en playtest se siente injusto con la ventana larga, quitar `attacks` del tiburón joven y dejarlo a persecución + contacto.
- Histéresis del facePlayer: si parpadea con la princesa justo sobre la vertical, añadir banda muerta de ~8px en `facePlayerFlip` (no incluido en SP-2).
