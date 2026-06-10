# Motor de Enemigos — Plan 1: Fundación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el comportamiento de enemigos hardcodeado (`chase`/`ranged`) por un motor componible y puro (`EnemyBrain`), re-expresando los 3 enemigos actuales como recetas sin cambiar su comportamiento, y añadir el botón debug de borrar guardado.

**Architecture:** Un módulo puro `systems/EnemyBrain.js` traduce `(def, estado, contexto, dt)` en una *intención* (`{velocity, fires}`). `Enemy.think()` lo invoca y `GameScene` ejecuta la intención (aplica velocidad, spawnea proyectiles vía `ProjectilePool`). La matemática de movimiento y patrones es pura → testeable con `node --test`; lo acoplado a Phaser se valida por playtest.

**Tech Stack:** Phaser 3 (CDN, sin build), módulos ES nativos, `node:test`. Esta es la **spec 1** de la spec `docs/superpowers/specs/2026-06-09-fire-world-enemy-engine-design.md`. Planes 2 (contenido de Fuego + dificultad) y 3 (jefes) vienen después.

**Alcance de este plan (foundation):** las piezas de movimiento `chase, static, flee, kite, zigzag, strafe, orbit, charge, erratic`; las piezas de ataque `melee` (contacto), `shootStraight`, `shootSpread`, `nova`; el secuenciador de ataques con telegrafía; la integración en `Enemy`/`GameScene`; el botón debug. **Fuera de alcance (planes 2/3):** `burrow`, `shootBurst`, `shootHoming`, `lobAoe`, `beam`, `summon`, `dashStrike`, `auraDamage`, los modificadores nuevos, las fases de jefe, el multi-jefe y el triángulo, el roster de Fuego, `tuning.js` y el modelo de dificultad de dos factores.

---

## Estructura de archivos

**Crear:**
- `src/systems/EnemyBrain.js` — motor puro: librerías de movimiento + ataque + secuenciador. Una sola responsabilidad: decidir intención por frame.
- `tests/EnemyBrain.test.js` — tests de la lógica pura del motor.

**Modificar:**
- `src/data/enemies.js` — re-expresar `villager`/`warrior`/`archer` como recetas (`movement`/`attacks`), quitar `behavior`/`range`/`fireEvery`.
- `src/objects/Enemy.js` — reemplazar `updateBehavior(...)` por `think(dt, target)` que usa el brain.
- `src/scenes/GameScene.js` — el loop de update llama `think()` y ejecuta la intención; nuevo `executeAttack()`; borrar `fireArrow()`.
- `src/config.js` — flag `DEBUG`.
- `src/scenes/MenuScene.js` — botón "Borrar guardado" (solo si `DEBUG`).
- `tests/SaveSystem.test.js` — añadir test de `reset()`.

**Nota de compatibilidad:** `Boss extends Enemy` y se añade al grupo `this.enemies`, así que pasa por el mismo loop. Los defs de jefe (`mb`/`lb`/`tb` en `regions.js`) aún usan `behavior:'chase'` y **no** tienen `movement`; el brain cae en `chase` por defecto, así que los jefes siguen persiguiendo. `BossMechanics` sigue intacto en este plan (se reabsorbe en el plan 3). El daño por contacto melee se aplica vía `overlap(this.caster, this.enemies)` (GameScene:80) y no cambia.

---

## Task 1: Botón debug de borrar guardado

**Files:**
- Modify: `src/config.js`
- Modify: `tests/SaveSystem.test.js`
- Modify: `src/scenes/MenuScene.js`

- [ ] **Step 1: Escribir el test que falla para `reset()`**

Añadir al final de `tests/SaveSystem.test.js`:

```js
test('reset() removes the save key so the next load is fresh', () => {
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
  const sys = new SaveSystem(storage);
  const s = sys.load();
  s.skillPoints = 99;
  sys.write(s);
  sys.reset();
  const reloaded = sys.load();
  assert.equal(reloaded.skillPoints, 0);
});
```

Si `tests/SaveSystem.test.js` no importa ya `SaveSystem`, verificar que el import existe al inicio del archivo:
```js
import { SaveSystem } from '../src/systems/SaveSystem.js';
```

- [ ] **Step 2: Correr el test para verlo pasar (la API ya existe)**

Run: `node --test tests/SaveSystem.test.js`
Expected: PASS — `SaveSystem.reset()` ya hace `this.storage.removeItem(SAVE_KEY)`. Este test fija ese contrato (lo usa el botón debug).

- [ ] **Step 3: Añadir el flag `DEBUG` a `config.js`**

Añadir cerca del inicio de `src/config.js`, justo debajo de `GAME_HEIGHT`:
```js
// Debug helpers (oculta el botón de borrar guardado en release con poner false).
export const DEBUG = true;
```

- [ ] **Step 4: Añadir el botón "Borrar guardado" al Menú**

En `src/scenes/MenuScene.js`, cambiar el import de la línea 1:
```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEBUG } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
```

Al final del método `create()` (después del bloque `play.on('pointerdown', ...)`), añadir:
```js
    if (DEBUG) {
      const wipe = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '⟲ borrar guardado (debug)', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#ef5350',
      }).setOrigin(0.5).setInteractive();
      wipe.on('pointerdown', () => {
        if (wipe.getData('armed')) {
          new SaveSystem(window.localStorage).reset();
          this.scene.start('Boot');
        } else {
          wipe.setData('armed', true);
          wipe.setText('⟲ ¿seguro? toca otra vez');
        }
      });
    }
```

- [ ] **Step 5: Playtest del botón**

Run: `python3 -m http.server 8000` y abrir `http://localhost:8000` en viewport mobile.
Expected: en el Menú aparece "borrar guardado (debug)" abajo; primer toque pide confirmación, segundo toque reinicia a Boot con guardado fresco (progreso/poder en cero).

- [ ] **Step 6: Commit**

```bash
git add src/config.js tests/SaveSystem.test.js src/scenes/MenuScene.js
git commit -m "feat: botón debug de borrar guardado en el Menú"
```

---

## Task 2: EnemyBrain — librería de movimiento (puro)

**Files:**
- Create: `src/systems/EnemyBrain.js`
- Create: `tests/EnemyBrain.test.js`

- [ ] **Step 1: Escribir los tests de movimiento que fallan**

Crear `tests/EnemyBrain.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeMovement, MOVEMENTS } from '../src/systems/EnemyBrain.js';

const mag = (v) => Math.hypot(v.x, v.y);
const ctx = (overrides = {}) => ({
  self: { x: 0, y: 0 },
  target: { x: 100, y: 0 },
  speed: 60,
  dt: 16,
  ...overrides,
});

test('chase moves straight toward the target at full speed', () => {
  const v = computeMovement({ movement: { type: 'chase' } }, {}, ctx());
  assert.ok(Math.abs(v.x - 60) < 1e-6);
  assert.ok(Math.abs(v.y) < 1e-6);
});

test('static does not move', () => {
  const v = computeMovement({ movement: { type: 'static' } }, {}, ctx());
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
});

test('flee moves directly away from the target', () => {
  const v = computeMovement({ movement: { type: 'flee' } }, {}, ctx());
  assert.ok(v.x < 0);
  assert.ok(Math.abs(mag(v) - 60) < 1e-6);
});

test('kite advances when too far, retreats when too close, holds in the band', () => {
  const def = { movement: { type: 'kite', range: 200 } };
  const far = computeMovement(def, {}, ctx({ target: { x: 400, y: 0 } }));
  assert.ok(far.x > 0); // approach
  const near = computeMovement(def, {}, ctx({ target: { x: 50, y: 0 } }));
  assert.ok(near.x < 0); // back off
  const inBand = computeMovement(def, {}, ctx({ target: { x: 200, y: 0 } }));
  assert.equal(inBand.x, 0);
  assert.equal(inBand.y, 0);
});

test('unknown movement type falls back to chase', () => {
  const v = computeMovement({ movement: { type: 'nope' } }, {}, ctx());
  assert.ok(v.x > 0);
});

test('charge stays still during windup, then dashes faster than base speed', () => {
  const def = { movement: { type: 'charge', windup: 600, dash: 400, recover: 700, dashMul: 3 } };
  const state = {};
  // first frame: windup
  let v = computeMovement(def, state, ctx({ dt: 100 }));
  assert.equal(mag(v), 0);
  // advance past windup into dash
  computeMovement(def, state, ctx({ dt: 600 }));
  v = computeMovement(def, state, ctx({ dt: 100 }));
  assert.ok(mag(v) > 60); // dashing faster than base
});

test('every movement type returns a finite velocity vector', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = computeMovement({ movement: { type } }, {}, ctx());
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `Cannot find module '../src/systems/EnemyBrain.js'`.

- [ ] **Step 3: Implementar la librería de movimiento**

Crear `src/systems/EnemyBrain.js`:

```js
// src/systems/EnemyBrain.js
// Pure (no Phaser). Turns an enemy def + mutable runtime state into a per-frame
// Intent that GameScene executes. Movement and attack-pattern decisions live here
// so they can be unit-tested under `node --test`.

function angleBetween(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function distance(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

// --- Movement library ---------------------------------------------------------
// Each returns a desired velocity {x,y}.
// args: { self, target, speed, dt, params, state }  (params = def.movement, state mutable)
export const MOVEMENTS = {
  chase({ self, target, speed }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
  },

  static() { return { x: 0, y: 0 }; },

  flee({ self, target, speed }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    return { x: -Math.cos(a) * speed, y: -Math.sin(a) * speed };
  },

  kite({ self, target, speed, params }) {
    const range = (params && params.range) || 200;
    const d = distance(self.x, self.y, target.x, target.y);
    const a = angleBetween(self.x, self.y, target.x, target.y);
    if (d > range + 20) return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
    if (d < range - 20) return { x: -Math.cos(a) * speed, y: -Math.sin(a) * speed };
    return { x: 0, y: 0 };
  },

  zigzag({ self, target, speed, dt, state }) {
    state.phase = (state.phase || 0) + dt / 1000;
    const a = angleBetween(self.x, self.y, target.x, target.y);
    const perp = a + Math.PI / 2;
    const sway = Math.sin(state.phase * 6) * 0.7;
    return {
      x: Math.cos(a) * speed + Math.cos(perp) * speed * sway,
      y: Math.sin(a) * speed + Math.sin(perp) * speed * sway,
    };
  },

  strafe({ self, target, speed, params, state }) {
    const range = (params && params.range) || 180;
    const d = distance(self.x, self.y, target.x, target.y);
    const a = angleBetween(self.x, self.y, target.x, target.y);
    let radial = 0;
    if (d > range + 20) radial = 1; else if (d < range - 20) radial = -1;
    const perp = a + Math.PI / 2;
    state.dir = state.dir || 1;
    return {
      x: Math.cos(a) * speed * radial + Math.cos(perp) * speed * 0.8 * state.dir,
      y: Math.sin(a) * speed * radial + Math.sin(perp) * speed * 0.8 * state.dir,
    };
  },

  orbit({ self, target, speed, state }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    const perp = a + Math.PI / 2;
    state.dir = state.dir || 1;
    return { x: Math.cos(perp) * speed * state.dir, y: Math.sin(perp) * speed * state.dir };
  },

  charge({ self, target, speed, params, dt, state }) {
    const windup = (params && params.windup) || 600;
    const dash = (params && params.dash) || 400;
    const recover = (params && params.recover) || 700;
    const dashSpeed = speed * ((params && params.dashMul) || 3);
    state.mode = state.mode || 'windup';
    state.t = (state.t || 0) + dt;
    if (state.mode === 'windup') {
      if (state.t >= windup) {
        state.mode = 'dash'; state.t = 0;
        state.heading = angleBetween(self.x, self.y, target.x, target.y);
      }
      return { x: 0, y: 0 };
    }
    if (state.mode === 'dash') {
      if (state.t >= dash) { state.mode = 'recover'; state.t = 0; return { x: 0, y: 0 }; }
      return { x: Math.cos(state.heading) * dashSpeed, y: Math.sin(state.heading) * dashSpeed };
    }
    if (state.t >= recover) { state.mode = 'windup'; state.t = 0; }
    return { x: 0, y: 0 };
  },

  erratic({ speed, dt, state }) {
    // Deterministic pseudo-random heading (LCG) so it's testable; reroll every 500ms.
    state.t = (state.t || 0) - dt;
    if (state.heading === undefined || state.t <= 0) {
      state.t = 500;
      state.seed = ((state.seed || 1) * 1103515245 + 12345) & 0x7fffffff;
      state.heading = (state.seed / 0x7fffffff) * Math.PI * 2;
    }
    return { x: Math.cos(state.heading) * speed, y: Math.sin(state.heading) * speed };
  },
};

export function computeMovement(def, state, ctx) {
  const type = def.movement && def.movement.type;
  const fn = MOVEMENTS[type] || MOVEMENTS.chase;
  return fn({ ...ctx, params: def.movement, state });
}
```

- [ ] **Step 4: Correr los tests para verlos pasar**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS (todos los tests de movimiento).

- [ ] **Step 5: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat: EnemyBrain librería de movimiento (puro)"
```

---

## Task 3: EnemyBrain — secuenciador de ataques y proyectiles (puro)

**Files:**
- Modify: `src/systems/EnemyBrain.js`
- Modify: `tests/EnemyBrain.test.js`

- [ ] **Step 1: Escribir los tests que fallan para ataques**

Añadir al final de `tests/EnemyBrain.test.js`:

```js
import { stepAttack, buildProjectiles } from '../src/systems/EnemyBrain.js';

test('stepAttack with no telegraph fires once the cooldown elapses', () => {
  const att = { type: 'shootStraight', every: 1000 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 400), {});       // 600 left
  assert.deepEqual(stepAttack(att, rt, 400), {});       // 200 left
  assert.deepEqual(stepAttack(att, rt, 400), { fire: true }); // crosses 0 -> fire
  // resets to `every`
  assert.deepEqual(stepAttack(att, rt, 400), {});
});

test('stepAttack telegraphs first, then fires after the telegraph window', () => {
  const att = { type: 'shootStraight', every: 1000, telegraph: 300 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 1000), { telegraph: true }); // cooldown done -> begin telegraph
  assert.deepEqual(stepAttack(att, rt, 100), { telegraph: true });  // still warning
  assert.deepEqual(stepAttack(att, rt, 250), { fire: true });       // telegraph elapsed -> fire
});

test('buildProjectiles shootStraight makes one shot aimed at the target', () => {
  const projs = buildProjectiles({ type: 'shootStraight', speed: 200, damage: 5 },
    { self: { x: 0, y: 0 }, target: { x: 0, y: 100 } });
  assert.equal(projs.length, 1);
  assert.ok(Math.abs(projs[0].angle - Math.PI / 2) < 1e-6); // straight down
  assert.equal(projs[0].speed, 200);
  assert.equal(projs[0].damage, 5);
});

test('buildProjectiles shootSpread fans `count` shots across the arc', () => {
  const projs = buildProjectiles({ type: 'shootSpread', count: 3, arc: 90 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 3);
  const arc = (90 * Math.PI) / 180;
  assert.ok(Math.abs(projs[0].angle - (-arc / 2)) < 1e-6);
  assert.ok(Math.abs(projs[1].angle - 0) < 1e-6);
  assert.ok(Math.abs(projs[2].angle - (arc / 2)) < 1e-6);
});

test('buildProjectiles nova spreads `count` shots evenly around the circle', () => {
  const projs = buildProjectiles({ type: 'nova', count: 8 },
    { self: { x: 0, y: 0 }, target: { x: 1, y: 0 } });
  assert.equal(projs.length, 8);
  assert.ok(Math.abs(projs[1].angle - (Math.PI * 2) / 8) < 1e-6);
});

test('buildProjectiles damage falls back to ctx.damage when the attack omits it', () => {
  const projs = buildProjectiles({ type: 'shootStraight' },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, damage: 14 });
  assert.equal(projs[0].damage, 14);
});

test('buildProjectiles returns nothing for a melee attack', () => {
  const projs = buildProjectiles({ type: 'melee' },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 0);
});
```

- [ ] **Step 2: Correr los tests para verlos fallar**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `stepAttack`/`buildProjectiles` no existen.

- [ ] **Step 3: Implementar el secuenciador y el constructor de proyectiles**

Añadir al final de `src/systems/EnemyBrain.js`:

```js
// --- Attack sequencer ---------------------------------------------------------
// Advances one attack's runtime timer. Returns {} | { telegraph: true } | { fire: true }.
// rt is mutable per-attack state: { remaining, mode, tele }.
export function stepAttack(att, rt, dt) {
  if (rt.mode === 'telegraph') {
    rt.tele -= dt;
    if (rt.tele <= 0) { rt.mode = 'cooldown'; rt.remaining = att.every; return { fire: true }; }
    return { telegraph: true };
  }
  rt.remaining = (rt.remaining === undefined ? att.every : rt.remaining) - dt;
  if (rt.remaining <= 0) {
    if (att.telegraph > 0) { rt.mode = 'telegraph'; rt.tele = att.telegraph; return { telegraph: true }; }
    rt.remaining = att.every;
    return { fire: true };
  }
  return {};
}

// --- Projectile builder -------------------------------------------------------
// Turns a fired attack into projectile specs {angle, speed, damage}.
// ctx = { self, target, damage? }  (damage = fallback when the attack omits one)
export function buildProjectiles(att, ctx) {
  const { self, target } = ctx;
  const base = angleBetween(self.x, self.y, target.x, target.y);
  const speed = att.speed || 240;
  const damage = att.damage === undefined ? (ctx.damage === undefined ? 8 : ctx.damage) : att.damage;
  const out = [];
  if (att.type === 'shootStraight') {
    out.push({ angle: base, speed, damage });
  } else if (att.type === 'shootSpread') {
    const n = att.count || 3;
    const arc = ((att.arc || 30) * Math.PI) / 180;
    const start = base - arc / 2;
    const step = n > 1 ? arc / (n - 1) : 0;
    for (let i = 0; i < n; i++) out.push({ angle: start + step * i, speed, damage });
  } else if (att.type === 'nova') {
    const n = att.count || 10;
    for (let i = 0; i < n; i++) out.push({ angle: (Math.PI * 2 * i) / n, speed, damage });
  }
  // melee and not-yet-implemented types produce no projectiles.
  return out;
}
```

- [ ] **Step 4: Correr los tests para verlos pasar**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS (movimiento + ataques).

- [ ] **Step 5: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat: EnemyBrain secuenciador de ataques + proyectiles (puro)"
```

---

## Task 4: Integrar el brain en Enemy/GameScene + recetas (retrocompatibilidad)

**Files:**
- Modify: `src/data/enemies.js`
- Modify: `src/objects/Enemy.js`
- Modify: `src/scenes/GameScene.js:354` (loop de update) y `:267-269` (borrar `fireArrow`)

- [ ] **Step 1: Re-expresar los 3 enemigos como recetas**

Reemplazar el cuerpo de `src/data/enemies.js` por:

```js
import { COLORS, TEX } from '../config.js';

// An enemy is a recipe: movement (1) + attacks (0..N) + modifiers (0..N).
// See systems/EnemyBrain.js for the component libraries.
export const ENEMY_TYPES = {
  villager: {
    key: 'villager', tex: TEX.villager, color: COLORS.villager,
    hp: 20, speed: 90, damage: 8, radius: 10,
    movement: { type: 'chase' }, attacks: [], // contact damage via overlap
  },
  warrior: {
    key: 'warrior', tex: TEX.warrior, color: COLORS.warrior,
    hp: 50, speed: 60, damage: 14, radius: 12,
    movement: { type: 'chase' }, attacks: [],
  },
  archer: {
    key: 'archer', tex: TEX.archer, color: COLORS.archer,
    hp: 25, speed: 70, damage: 10, radius: 10,
    movement: { type: 'kite', range: 220 },
    attacks: [{ type: 'shootStraight', every: 1500, speed: 260 }], // damage falls back to def.damage
  },
};
```

- [ ] **Step 2: Reemplazar `updateBehavior` por `think` en Enemy**

En `src/objects/Enemy.js`, añadir el import al inicio del archivo:
```js
import { computeMovement, stepAttack } from '../systems/EnemyBrain.js';
```

En el `constructor`, después de `this.burnDps = 0;`, añadir el estado del brain:
```js
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})) };
```

Borrar por completo el método `updateBehavior(delta, target, onRangedFire) { ... }` y reemplazarlo por:
```js
  // Returns an intent for GameScene to execute: { velocity, fires }.
  // `fires` is the list of attack defs whose timer fired this frame.
  think(delta, target) {
    if (!this.active) return { velocity: { x: 0, y: 0 }, fires: [] };

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    // Frozen: immobilized and cannot fire.
    if (this.freezeRemaining > 0) return { velocity: { x: 0, y: 0 }, fires: [] };

    const speed = this.def.speed * (this.slowRemaining > 0 ? this.slowFactor : 1);
    const ctx = {
      self: { x: this.x, y: this.y },
      target: { x: target.x, y: target.y },
      speed, dt: delta,
    };
    const velocity = computeMovement(this.def, this.brainState.move, ctx);

    const fires = [];
    const attacks = this.def.attacks || [];
    for (let i = 0; i < attacks.length; i++) {
      const r = stepAttack(attacks[i], this.brainState.attacks[i], delta);
      if (r.fire) fires.push(attacks[i]);
    }
    return { velocity, fires };
  }
```

- [ ] **Step 3: Ejecutar la intención en GameScene + borrar `fireArrow`**

En `src/scenes/GameScene.js`, añadir el import de `buildProjectiles` (línea de imports junto a los demás `systems/`):
```js
import { buildProjectiles } from '../systems/EnemyBrain.js';
```

Reemplazar la línea 354:
```js
    for (const e of liveEnemies) e.updateBehavior(delta, this.caster, (en) => this.fireArrow(en));
```
por:
```js
    for (const e of liveEnemies) {
      const intent = e.think(delta, this.caster);
      e.setVelocity(intent.velocity.x, intent.velocity.y);
      for (const att of intent.fires) this.executeAttack(e, att);
    }
```

Borrar el método `fireArrow` (líneas 267-269) y poner en su lugar:
```js
  executeAttack(enemy, att) {
    if (att.type === 'melee') return; // contact damage handled by the caster/enemies overlap
    const projs = buildProjectiles(att, {
      self: { x: enemy.x, y: enemy.y },
      target: { x: this.caster.x, y: this.caster.y },
      damage: enemy.def.damage,
    });
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
    }
  }
```

- [ ] **Step 4: Correr toda la suite (regresión de la lógica pura)**

Run: `node --test`
Expected: PASS — ninguna suite existente se rompe (los enemigos siguen siendo data; `Difficulty`/`scaleEnemyDef` no cambian).

- [ ] **Step 5: Playtest de retrocompatibilidad**

Run: `python3 -m http.server 8000` y jugar el nivel 1 de Fuego en viewport mobile.
Expected:
- Villager y warrior **persiguen** y dañan al contacto (igual que antes).
- Archer **mantiene distancia** (~220px) y **dispara** flechas amarillas cada ~1.5 s (igual que antes).
- Los minibosses/bosses (def con `behavior:'chase'`, sin `movement`) siguen **persiguiendo** (fallback a `chase`) y `BossMechanics` sigue lanzando sus ataques.
- No hay errores en la consola del navegador.

- [ ] **Step 6: Commit**

```bash
git add src/data/enemies.js src/objects/Enemy.js src/scenes/GameScene.js
git commit -m "feat: enemigos corren sobre EnemyBrain (recetas, retrocompatible)"
```

---

## Self-Review

**1. Cobertura de la spec (alcance de este plan):**
- Esquema de enemigo como receta (movement/attacks/modifiers) → Tasks 2/3/4. ✓
- Librería de movimiento (subconjunto: chase, static, flee, kite, zigzag, strafe, orbit, charge, erratic) → Task 2. ✓ (`burrow` diferido a plan 3, documentado en Alcance.)
- Librería de ataque (subconjunto: melee, shootStraight, shootSpread, nova) + telegrafía → Task 3. ✓ (resto diferido a plan 2, documentado.)
- Límite puro/Phaser (`EnemyBrain` puro, `Enemy`/`GameScene` ejecutan) → Tasks 2/3/4. ✓
- Migración sin romper (3 enemigos como recetas, fallback a chase para jefes) → Task 4. ✓
- Botón de borrar guardado + flag DEBUG → Task 1. ✓
- Diferido explícitamente (no son huecos): modificadores nuevos, registro `data/enemies/`, `tuning.js`, dificultad de dos factores, fases/multi-jefe/triángulo, roster de Fuego, eliminación de `BossMechanics` → planes 2 y 3.

**2. Placeholder scan:** sin TBD/TODO; cada step de código muestra el código completo; comandos con salida esperada. ✓

**3. Consistencia de tipos:** la intención `{ velocity, fires }` la produce `Enemy.think` (Task 4) y la consume el loop de `GameScene` (Task 4). `stepAttack(att, rt, dt)` y `buildProjectiles(att, ctx)` (Task 3) se usan con esas mismas firmas en `Enemy.think`/`executeAttack` (Task 4). `computeMovement(def, state, ctx)` (Task 2) se usa con esa firma en `Enemy.think` (Task 4). `ctx` siempre lleva `self`/`target` como `{x,y}` y `damage` como fallback. ✓

---

## Notas para los planes siguientes

- **Plan 2 (contenido + dificultad):** añade al catálogo `shootBurst`/`shootHoming`/`lobAoe`/`summon`/`auraDamage`/`dashStrike` y los modificadores; crea `data/enemies/index.js` (registro) + `data/enemies/fire.js` (las ~20 criaturas); crea `data/tuning.js` y el modelo de dificultad de dos factores; rediseña las oleadas de Fuego en `regions.js`.
- **Plan 3 (jefes):** añade fases + secuenciador coreografiado de jefe + telegrafías dibujadas; soporte multi-jefe en `WaveRunner`/`beginPhase`; el `TriangleHazard` (puro) + render; las 5 peleas (Pyra/Vesta/Favilla/trío/Ignatius); reabsorbe y elimina `BossMechanics`.
