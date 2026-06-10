# Motor de Enemigos — Plan 2: Contenido de Fuego + Dificultad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poblar el mundo de Fuego con ~20 criaturas únicas (glass-cannon, mayoría ranged, denso en proyectiles), añadir al motor solo los componentes que ese roster necesita, y hacer la dificultad absoluta (curva por profundidad × poder) con oleadas de presión sostenida.

**Architecture:** Extiende el motor puro `EnemyBrain` (Plan 1) con `shootBurst`/`shootHoming` y un lector de modificadores; ejecuta los componentes nuevos (zonas `lobAoe`, `summon`, homing, modificadores de defensa/muerte/aura) en `GameScene`; añade un módulo puro de balance `data/tuning.js` y un modelo de dificultad de dos factores. El contenido vive en un registro `data/enemies/` con `fire.js`.

**Tech Stack:** Phaser 3 (CDN, sin build), módulos ES nativos, `node:test`. Construye sobre el Plan 1 (mergeado a `master`: `EnemyBrain`, `Enemy.think`, `GameScene.executeAttack`).

**Identidad de Fuego (decisión de diseño):** el perfil "glass-cannon" (poca vida, mucho daño) vive en los **stats del roster**, no en el sistema de dificultad. `Difficulty` solo aporta el escalón absoluto × poder como un multiplicador escalar (mantiene `scaleEnemyDef` y los tests del Plan 1 intactos).

**Alcance de este plan.** Componentes nuevos que el roster de Fuego SÍ usa: ataques `shootBurst`, `shootHoming`, `lobAoe`, `summon` (`nova`/`shootStraight`/`shootSpread` ya existen; `dashStrike` se modela como `charge`+`melee`); modificadores `onHitBurn` (quema al jugador), `shielded` (reducción plana de daño), `explodesOnDeath`, `reviveOnce`, `healAllies`, `auraDamage`. **Fuera de alcance (Plan 3 — jefes):** `onHitSlow`, `onHitPoison`, `splitsOnDeath`, `enrageBelowHp`, `beam`, `burrow`, las fases/secuenciador de jefe, el multi-jefe y el triángulo, y los jefes de Fuego (Pyra/Vesta/Favilla/Ignatius). Texturas: el roster **reusa las formas geométricas existentes con tinte** (`setTint(def.color)`); sprites dedicados quedan para después.

---

## Estructura de archivos

**Crear:**
- `src/data/tuning.js` — balance puro: curva base de dificultad, topes de concurrencia/pool.
- `src/data/enemies/index.js` — registro: `ENEMY_TYPES` agregando todos los mundos; resuelve `type` → def.
- `src/data/enemies/fire.js` — las ~20 criaturas de Fuego (data).
- `tests/Tuning.test.js`, ampliaciones a `tests/Difficulty.test.js`, `tests/EnemyBrain.test.js`.

**Modificar:**
- `src/systems/Difficulty.js` — `levelMultiplier(save, levelIndex)` (curva base × poder).
- `src/systems/EnemyBrain.js` — `shootBurst`/`shootHoming` en el secuenciador/builder; `findModifier(def, type)` puro.
- `src/objects/Enemy.js` — `setTint(def.color)`; exponer `maxHp`/`_revived` (ya hay `maxHp`).
- `src/scenes/GameScene.js` — `executeAttack` (homing/lobAoe/summon + onHitBurn en proyectiles); homing steering en `update`; quema al jugador; `hitEnemy` (shielded/explode/revive); auras (`healAllies`/`auraDamage`) en `update`; usar el registro y `levelMultiplier`; tope de concurrencia en `spawnWave`; pool de disparos enemigos dimensionado.
- `src/data/enemies.js` — re-exportar desde el registro (compat) **o** migrar imports; ver Task 8.
- `src/config.js` — colores nuevos de enemigos de Fuego; usar `ENEMY_SHOT_POOL`.
- `src/data/regions.js` — oleadas de Fuego rediseñadas (densas, presión sostenida).

**Nota de compat:** `regions.js` referencia enemigos por `type` string en las oleadas; el registro debe exponer todos esos tipos (los 3 viejos + los de Fuego). Los jefes (mb/lb/tb) siguen igual en este plan (Plan 3 los rehace).

---

## Task 1: Dificultad de dos factores + tuning (puro)

**Files:**
- Create: `src/data/tuning.js`, `tests/Tuning.test.js`
- Modify: `src/systems/Difficulty.js`, `tests/Difficulty.test.js`
- Modify: `src/scenes/GameScene.js` (línea 34 y el import)

- [ ] **Step 1: Test de tuning (falla)**

Crear `tests/Tuning.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseDifficulty, BASE_CURVE, CONCURRENCY_CAP, ENEMY_SHOT_POOL } from '../src/data/tuning.js';

test('base curve starts at 1 and is monotonic non-decreasing', () => {
  assert.equal(BASE_CURVE[0], 1);
  for (let i = 1; i < BASE_CURVE.length; i++) assert.ok(BASE_CURVE[i] >= BASE_CURVE[i - 1]);
});

test('baseDifficulty clamps out-of-range indices', () => {
  assert.equal(baseDifficulty(-3), BASE_CURVE[0]);
  assert.equal(baseDifficulty(999), BASE_CURVE[BASE_CURVE.length - 1]);
  assert.equal(baseDifficulty(2), BASE_CURVE[2]);
});

test('caps are positive', () => {
  assert.ok(CONCURRENCY_CAP > 0);
  assert.ok(ENEMY_SHOT_POOL > 0);
});
```

- [ ] **Step 2: Run `node --test tests/Tuning.test.js` — FAIL (module not found).**

- [ ] **Step 3: Crear `src/data/tuning.js`:**
```js
// src/data/tuning.js
// Pure. Central balance knobs (curves, caps). No Phaser.

// Absolute difficulty by level depth (index 0..6), independent of player power.
export const BASE_CURVE = [1.0, 1.15, 1.3, 1.5, 1.7, 1.95, 2.3];

// Max enemies alive at once; waves keep queuing but the spawner throttles to this.
export const CONCURRENCY_CAP = 16;

// Enemy projectile pool size (Fire is projectile-dense).
export const ENEMY_SHOT_POOL = 400;

export function baseDifficulty(levelIndex) {
  if (levelIndex < 0) return BASE_CURVE[0];
  if (levelIndex >= BASE_CURVE.length) return BASE_CURVE[BASE_CURVE.length - 1];
  return BASE_CURVE[levelIndex];
}
```

- [ ] **Step 4: Run `node --test tests/Tuning.test.js` — PASS.**

- [ ] **Step 5: Test de `levelMultiplier` (falla)** — añadir a `tests/Difficulty.test.js`:
```js
import { levelMultiplier } from '../src/systems/Difficulty.js';

test('levelMultiplier at level 0 equals the power multiplier (base 1.0)', () => {
  const save = { purchasedNodes: [], elements: [] };
  assert.equal(levelMultiplier(save, 0), 1);
});

test('levelMultiplier rises with level depth for the same save', () => {
  const save = { purchasedNodes: [], elements: [] };
  assert.ok(levelMultiplier(save, 6) > levelMultiplier(save, 0));
});

test('levelMultiplier rises with player power at the same depth', () => {
  const weak = { purchasedNodes: [], elements: [] };
  const strong = { purchasedNodes: ['dmg1'], elements: ['fire'] };
  assert.ok(levelMultiplier(strong, 3) > levelMultiplier(weak, 3));
});
```

- [ ] **Step 6: Run `node --test tests/Difficulty.test.js` — FAIL (`levelMultiplier` not exported).**

- [ ] **Step 7: Implementar** — añadir a `src/systems/Difficulty.js`:
```js
import { baseDifficulty } from '../data/tuning.js';

// Absolute difficulty curve (by level depth) × player power.
export function levelMultiplier(save, levelIndex) {
  return baseDifficulty(levelIndex) * difficultyMultiplier(save);
}
```
(Coloca el `import` junto al import existente de `SKILL_TREE` al inicio del archivo; `difficultyMultiplier` ya está definido en el módulo.)

- [ ] **Step 8: Wire en GameScene** — en `src/scenes/GameScene.js`:
  - Cambiar el import de Difficulty a: `import { difficultyMultiplier, levelMultiplier, scaleEnemyDef } from '../systems/Difficulty.js';`
  - Cambiar la línea 34 `this.mult = difficultyMultiplier(save);` por `this.mult = levelMultiplier(save, this.levelIndex);`
  (`this.levelIndex` ya existe en la escena. `scaleEnemyDef` sigue igual.)

- [ ] **Step 9: Run `node --test` — todo pasa. `node --check src/scenes/GameScene.js` — limpio.**

- [ ] **Step 10: Commit**
```bash
git add src/data/tuning.js tests/Tuning.test.js src/systems/Difficulty.js tests/Difficulty.test.js src/scenes/GameScene.js
git commit -m "feat: dificultad de dos factores (curva base × poder) + tuning"
```

---

## Task 2: EnemyBrain — shootBurst, shootHoming, findModifier (puro)

**Files:**
- Modify: `src/systems/EnemyBrain.js`, `tests/EnemyBrain.test.js`

- [ ] **Step 1: Tests (fallan)** — añadir a `tests/EnemyBrain.test.js`:
```js
import { findModifier } from '../src/systems/EnemyBrain.js';

test('shootBurst fires `burst` times spaced by burstGap, then returns to cooldown', () => {
  const att = { type: 'shootBurst', every: 1000, burst: 3, burstGap: 100 };
  const rt = {};
  assert.deepEqual(stepAttack(att, rt, 1000), { fire: true }); // shot 1 (cooldown elapsed)
  assert.deepEqual(stepAttack(att, rt, 100), { fire: true });  // shot 2
  assert.deepEqual(stepAttack(att, rt, 100), { fire: true });  // shot 3
  assert.deepEqual(stepAttack(att, rt, 100), {});              // burst done, cooling down
});

test('buildProjectiles shootHoming makes one homing shot toward the target', () => {
  const projs = buildProjectiles({ type: 'shootHoming', speed: 120, damage: 9 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } });
  assert.equal(projs.length, 1);
  assert.equal(projs[0].homing, true);
  assert.ok(Math.abs(projs[0].angle - 0) < 1e-6);
  assert.equal(projs[0].speed, 120);
});

test('buildProjectiles shootBurst builds one straight shot per fire call', () => {
  const projs = buildProjectiles({ type: 'shootBurst', speed: 300 },
    { self: { x: 0, y: 0 }, target: { x: 0, y: 100 }, damage: 7 });
  assert.equal(projs.length, 1);
  assert.ok(Math.abs(projs[0].angle - Math.PI / 2) < 1e-6);
  assert.equal(projs[0].damage, 7);
});

test('findModifier returns the entry (normalizing string form) or null', () => {
  const def = { modifiers: ['explodesOnDeath', { type: 'onHitBurn', dps: 6, ms: 2000 }] };
  assert.deepEqual(findModifier(def, 'explodesOnDeath'), { type: 'explodesOnDeath' });
  assert.deepEqual(findModifier(def, 'onHitBurn'), { type: 'onHitBurn', dps: 6, ms: 2000 });
  assert.equal(findModifier(def, 'shielded'), null);
  assert.equal(findModifier({}, 'shielded'), null);
});
```

- [ ] **Step 2: Run `node --test tests/EnemyBrain.test.js` — FAIL.**

- [ ] **Step 3: Implementar** — en `src/systems/EnemyBrain.js`:

(a) Reemplazar la función `stepAttack` por esta versión (añade soporte de ráfaga; conserva el resto del contrato):
```js
export function stepAttack(att, rt, dt) {
  // Mid-burst: emit the queued shots spaced by burstGap.
  if (rt.burstLeft > 0) {
    rt.burstTimer -= dt;
    if (rt.burstTimer <= 0) {
      rt.burstLeft -= 1;
      rt.burstTimer = att.burstGap ?? 120;
      return { fire: true };
    }
    return {};
  }
  const every = att.every ?? 1000;
  if (rt.mode === 'telegraph') {
    rt.tele -= dt;
    if (rt.tele <= 0) { rt.mode = 'cooldown'; rt.remaining = every; return startBurstOrFire(att, rt); }
    return { telegraph: true };
  }
  rt.remaining = (rt.remaining === undefined ? every : rt.remaining) - dt;
  if (rt.remaining <= 0) {
    if (att.telegraph > 0) { rt.mode = 'telegraph'; rt.tele = att.telegraph; return { telegraph: true }; }
    rt.remaining = every;
    return startBurstOrFire(att, rt);
  }
  return {};
}

// On a fire trigger, queue the remaining burst shots (if any) and fire the first.
function startBurstOrFire(att, rt) {
  if (att.burst > 1) { rt.burstLeft = att.burst - 1; rt.burstTimer = att.burstGap ?? 120; }
  return { fire: true };
}
```

(b) En `buildProjectiles`, añadir los dos tipos. Después del bloque `} else if (att.type === 'nova') { ... }` y antes del `// melee` comment, insertar:
```js
  } else if (att.type === 'shootHoming') {
    out.push({ angle: base, speed, damage, homing: true });
  } else if (att.type === 'shootBurst') {
    out.push({ angle: base, speed, damage });
```

(c) Añadir al final del archivo:
```js
// --- Modifier lookup ----------------------------------------------------------
// Modifiers live on def.modifiers as strings ('explodesOnDeath') or objects
// ({ type: 'onHitBurn', dps, ms }). Returns the (normalized) entry or null.
export function findModifier(def, type) {
  for (const m of (def && def.modifiers) || []) {
    if (typeof m === 'string') { if (m === type) return { type }; }
    else if (m && m.type === type) return m;
  }
  return null;
}
```

- [ ] **Step 4: Run `node --test` — todo pasa (incluye los tests del Plan 1, sin regresión en stepAttack).**

- [ ] **Step 5: Commit**
```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat: EnemyBrain shootBurst/shootHoming + findModifier (puro)"
```

---

## Task 3: GameScene executeAttack — homing, lobAoe, summon, onHitBurn en proyectiles

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: `executeAttack(enemy, att)` hoy solo dispara proyectiles. Hay que: (a) marcar proyectiles homing y portar `onHitBurn`; (b) `lobAoe` → zona telegrafiada en la posición del jugador; (c) `summon` → spawnear adds. `this.spawnZone({x,y,radius,duration,casterDps,color})`, `this.spawnEnemy(def)`, `ENEMY_TYPES`/registro y `findModifier` están disponibles.

- [ ] **Step 1:** En `src/scenes/GameScene.js`, añadir `findModifier` al import de EnemyBrain:
```js
import { buildProjectiles, findModifier } from '../systems/EnemyBrain.js';
```

- [ ] **Step 2:** Reemplazar el método `executeAttack(enemy, att)` por:
```js
  executeAttack(enemy, att) {
    if (att.type === 'melee') return; // contact damage via the caster/enemies overlap
    if (att.type === 'lobAoe') {
      // Telegraphed fire pool dropped on the caster's current position.
      this.spawnZone({
        x: this.caster.x, y: this.caster.y,
        radius: att.radius ?? 60, duration: att.duration ?? 3000,
        casterDps: att.dps ?? 18, color: COLORS.fireball,
      });
      return;
    }
    if (att.type === 'summon') {
      const def = ENEMY_TYPES[att.spawnType];
      if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(scaleEnemyDef(def, this.mult));
      return;
    }
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
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; }
      if (burn) { shot.burnDps = burn.dps ?? 6; shot.burnMs = burn.ms ?? 2000; }
    }
  }
```
(Nota: `spawnEnemy` ya aplica `scaleEnemyDef` internamente — pero aquí `summon` pasa el def ya escalado; cambia `spawnEnemy` para NO re-escalar, o pasa el def crudo. **Decisión:** pasa el def crudo y deja que `spawnEnemy` escale. Corrige el bloque `summon` a: `if (def) for (...) this.spawnEnemy(def);` — `spawnEnemy(def)` ya hace `scaleEnemyDef(def, this.mult)`. Usa esta versión, sin el `scaleEnemyDef` inline en summon.)

- [ ] **Step 3:** Aplicar la corrección del Step 2: en el bloque `summon`, usar:
```js
      if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(def);
```
(sin `scaleEnemyDef`, porque `spawnEnemy` ya escala).

- [ ] **Step 4:** Hacer que el overlap `caster`↔`enemyShots` aplique la quema. En `setupCollisions`, reemplazar el callback del tercer overlap por:
```js
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      if (shot.burnDps > 0) this.applyCasterBurn(shot.burnDps, shot.burnMs);
      this.enemyShots.despawn(shot);
    });
```
(`applyCasterBurn` se define en la Task 5; este paso solo deja el llamado. Si ejecutas las tasks en orden, define un stub temporal `applyCasterBurn() {}` ahora y complétalo en Task 5, o reordena para hacer Task 5 antes que este overlap. Recomendado: añade el stub vacío ahora.)

- [ ] **Step 5:** Run `node --test` (todo pasa; nada de esto es testeado por node pero no debe romper las suites). `node --check src/scenes/GameScene.js` — limpio.

- [ ] **Step 6: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: executeAttack soporta homing, lobAoe, summon y quema en proyectiles"
```

---

## Task 4: Homing — steering de los proyectiles enemigos

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1:** Añadir un método que reorienta los disparos homing hacia el jugador:
```js
  steerHomingShots(delta) {
    const turn = 0.006 * delta; // rad per frame budget; gentle so it's dodgeable
    this.enemyShots.group.children.iterate((p) => {
      if (!p || !p.active || !p.homing) return true;
      const desired = Phaser.Math.Angle.Between(p.x, p.y, this.caster.x, this.caster.y);
      const current = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      const next = Phaser.Math.Angle.RotateTo(current, desired, turn);
      const s = p.homingSpeed || 120;
      p.setVelocity(Math.cos(next) * s, Math.sin(next) * s);
      return true;
    });
  }
```

- [ ] **Step 2:** Llamarlo en `update`, justo antes de `this.enemyShots.cullOffscreen(...)` (alrededor de la línea 356/362):
```js
    this.steerHomingShots(delta);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
```
Asegúrate de que `ProjectilePool.fire` deja `p.homing` sin definir por defecto para los disparos normales (lo está — solo lo marcamos en `executeAttack`). Para que un cuerpo reciclado no quede "homing" para siempre, en `ProjectilePool.fire` añade `p.homing = false;` junto a los reseteos de `burnDps`/`burnMs`.

- [ ] **Step 3:** En `src/systems/ProjectilePool.js`, dentro de `fire()` donde se hace `p.burnDps = 0; p.burnMs = 0;`, añadir `p.homing = false;`.

- [ ] **Step 4:** `node --test` (sin regresión), `node --check src/scenes/GameScene.js src/systems/ProjectilePool.js` — limpio.

- [ ] **Step 5: Commit**
```bash
git add src/scenes/GameScene.js src/systems/ProjectilePool.js
git commit -m "feat: proyectiles homing (steering suave hacia el jugador)"
```

---

## Task 5: Quema al jugador (caster burn DoT)

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: las quemaduras de enemigos las maneja `updateBurns` (lado enemigo, del fireball del jugador). Falta el lado jugador: cuando un proyectil/contacto con `onHitBurn` toca al caster, este recibe DoT.

- [ ] **Step 1:** En `create()` (junto a `this.zones = []`), inicializar el estado de quema del jugador:
```js
    this.casterBurnRemaining = 0;
    this.casterBurnDps = 0;
```

- [ ] **Step 2:** Reemplazar el stub `applyCasterBurn` (o añadirlo) con:
```js
  applyCasterBurn(dps, ms) {
    this.casterBurnDps = Math.max(this.casterBurnDps, dps);
    this.casterBurnRemaining = Math.max(this.casterBurnRemaining, ms);
  }

  updateCasterBurn(delta) {
    if (this.casterBurnRemaining <= 0) return;
    this.casterBurnRemaining -= delta;
    this.damageCaster(this.casterBurnDps * (delta / 1000));
  }
```

- [ ] **Step 3:** Llamar `this.updateCasterBurn(delta);` en `update`, junto a `this.updateBurns(delta);`.

- [ ] **Step 4:** Que el contacto melee con `onHitBurn` también queme. En `setupCollisions`, reemplazar el callback del overlap `caster`↔`enemies` por:
```js
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
    });
```

- [ ] **Step 5:** `node --test` (sin regresión), `node --check src/scenes/GameScene.js` — limpio.

- [ ] **Step 6: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: quema al jugador (DoT) desde ataques/contacto con onHitBurn"
```

---

## Task 6: Modificadores de defensa/muerte — shielded, explodesOnDeath, reviveOnce

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: `hitEnemy(enemy, damage)` aplica daño y, al morir, destruye + `checkPhaseCleared`. Hay que: reducir daño si `shielded`; resucitar una vez si `reviveOnce`; explotar al morir si `explodesOnDeath`. (`shielded` en Plan 2 = reducción **plana** `reduce`; flanqueo direccional es Plan 3.)

- [ ] **Step 1:** Reemplazar `hitEnemy` por:
```js
  hitEnemy(enemy, damage) {
    const shield = findModifier(enemy.def, 'shielded');
    const dmg = shield ? damage * (1 - (shield.reduce ?? 0.5)) : damage;
    const r = applyDamage({ hp: enemy.hp }, dmg);
    enemy.hp = r.hp;
    if (!r.dead) return;
    if (findModifier(enemy.def, 'reviveOnce') && !enemy._revived) {
      enemy._revived = true;
      enemy.hp = Math.round(enemy.maxHp * 0.4);
      return;
    }
    this.onEnemyDeath(enemy);
    if (enemy === this.boss) this.boss = null;
    enemy.destroy();
    this.checkPhaseCleared();
  }

  onEnemyDeath(enemy) {
    const boom = findModifier(enemy.def, 'explodesOnDeath');
    if (!boom) return;
    const n = boom.count ?? 8;
    const speed = boom.speed ?? 200;
    const dmg = boom.damage ?? Math.round(enemy.def.damage * 0.8);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const tx = enemy.x + Math.cos(a) * 50;
      const ty = enemy.y + Math.sin(a) * 50;
      const shot = this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, tx, ty, speed, dmg, 0);
      if (shot) shot.setTint(COLORS.fireball);
    }
  }
```

- [ ] **Step 2:** `node --test` (sin regresión — `hitEnemy` se sigue llamando igual desde overlaps/zonas; el comportamiento por defecto, sin modificadores, es idéntico al anterior). `node --check src/scenes/GameScene.js` — limpio.

- [ ] **Step 3: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: modificadores shielded / reviveOnce / explodesOnDeath en hitEnemy"
```

---

## Task 7: Auras pasivas — healAllies y auraDamage

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: `healAllies` = el enemigo cura a los enemigos cercanos cada frame; `auraDamage` = el enemigo daña al jugador si está dentro de un radio chico (quema al rozar). Se evalúan en `update` recorriendo los enemigos vivos.

- [ ] **Step 1:** Añadir el método:
```js
  updateAuras(delta) {
    const dt = delta / 1000;
    const live = this.enemies.getChildren().filter((e) => e.active);
    for (const e of live) {
      const heal = findModifier(e.def, 'healAllies');
      if (heal) {
        const r = heal.radius ?? 120; const hps = heal.hps ?? 8;
        for (const o of live) {
          if (o === e || o.hp >= o.maxHp) continue;
          if (Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y) <= r) {
            o.hp = Math.min(o.maxHp, o.hp + hps * dt);
          }
        }
      }
      const aura = findModifier(e.def, 'auraDamage');
      if (aura) {
        const r = aura.radius ?? 40;
        if (Phaser.Math.Distance.Between(e.x, e.y, this.caster.x, this.caster.y) <= r) {
          this.damageCaster((aura.dps ?? 10) * dt);
        }
      }
    }
  }
```

- [ ] **Step 2:** Llamar `this.updateAuras(delta);` en `update` (junto a `this.updateZones(delta);`).

- [ ] **Step 3:** `node --test` (sin regresión), `node --check src/scenes/GameScene.js` — limpio.

- [ ] **Step 4: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: auras pasivas healAllies y auraDamage"
```

---

## Task 8: Registro de enemigos + roster de Fuego + tinte

**Files:**
- Create: `src/data/enemies/index.js`, `src/data/enemies/fire.js`
- Modify: `src/data/enemies.js`, `src/objects/Enemy.js`, `src/config.js`
- Modify (imports): `src/scenes/GameScene.js`

- [ ] **Step 1:** Añadir colores de Fuego a `src/config.js` `COLORS` (después de la entrada `archer`):
```js
  ember: 0xff8a65,      // acólitos / iniciados
  emberDeep: 0xe64a19,  // piromantes / caballeros
  ash: 0x9e9e9e,        // espíritus de ceniza / humo
  magma: 0xff5722,      // larvas / colosos / cans de lava
  salamander: 0xffa726, // salamandras / fénix
  totemFire: 0xffca28,  // tótems / portaestandarte / wisp
```

- [ ] **Step 2:** Tinte por enemigo. En `src/objects/Enemy.js` constructor, tras `this.maxHp = def.hp;`, añadir:
```js
    if (def.color) this.setTint(def.color);
```

- [ ] **Step 3:** Crear `src/data/enemies/fire.js` (reusa formas: `TEX.villager` = básicos/bestias chicas, `TEX.archer` = ranged, `TEX.warrior` = tanques/melee pesados, `TEX.miniboss` = élites grandes). Stats glass-cannon: vida baja, daño alto, mayoría ranged.
```js
import { COLORS, TEX } from '../../config.js';

// Fire world roster (~20). Glass-cannon: low hp, high damage, mostly ranged.
// Recipes use EnemyBrain components. Textures are reused shapes + per-enemy tint.
export const FIRE_ENEMIES = {
  // --- Cultists (human) ---
  acolito_brasa: { key: 'acolito_brasa', tex: TEX.archer, color: COLORS.ember, hp: 16, speed: 70, damage: 9, radius: 10,
    movement: { type: 'kite', range: 210 }, attacks: [{ type: 'shootStraight', every: 1400, speed: 250 }] },
  lanzabrasas: { key: 'lanzabrasas', tex: TEX.archer, color: COLORS.emberDeep, hp: 20, speed: 65, damage: 8, radius: 10,
    movement: { type: 'kite', range: 230 }, attacks: [{ type: 'shootSpread', count: 3, arc: 34, every: 1700, speed: 240 }] },
  iniciado_veloz: { key: 'iniciado_veloz', tex: TEX.villager, color: COLORS.ember, hp: 14, speed: 130, damage: 11, radius: 9,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  piromante: { key: 'piromante', tex: TEX.archer, color: COLORS.emberDeep, hp: 24, speed: 60, damage: 7, radius: 10,
    movement: { type: 'strafe', range: 200 }, attacks: [{ type: 'shootBurst', burst: 4, burstGap: 110, every: 2200, speed: 280 }] },
  encapuchado_pira: { key: 'encapuchado_pira', tex: TEX.archer, color: COLORS.ash, hp: 28, speed: 0, damage: 6, radius: 11,
    movement: { type: 'static' }, attacks: [{ type: 'lobAoe', radius: 60, dps: 20, duration: 3000, every: 2600, telegraph: 500 }] },
  pirovidente: { key: 'pirovidente', tex: TEX.archer, color: COLORS.salamander, hp: 26, speed: 60, damage: 12, radius: 10,
    movement: { type: 'kite', range: 240 }, attacks: [{ type: 'shootHoming', every: 2400, speed: 120, telegraph: 350 }] },
  caballero_brasa: { key: 'caballero_brasa', tex: TEX.warrior, color: COLORS.emberDeep, hp: 70, speed: 75, damage: 16, radius: 12,
    movement: { type: 'charge' }, attacks: [{ type: 'melee' }], modifiers: [{ type: 'shielded', reduce: 0.5 }] },
  sacerdote_llama: { key: 'sacerdote_llama', tex: TEX.archer, color: COLORS.totemFire, hp: 34, speed: 70, damage: 6, radius: 11,
    movement: { type: 'flee' }, attacks: [{ type: 'summon', spawnType: 'imp_brasa', count: 2, every: 3200 }],
    modifiers: [{ type: 'healAllies', hps: 10, radius: 130 }] },
  portaestandarte: { key: 'portaestandarte', tex: TEX.warrior, color: COLORS.totemFire, hp: 40, speed: 55, damage: 8, radius: 12,
    movement: { type: 'orbit' }, attacks: [], modifiers: [{ type: 'auraDamage', dps: 12, radius: 46 }] },

  // --- Beasts (elemental) ---
  larva_magma: { key: 'larva_magma', tex: TEX.villager, color: COLORS.magma, hp: 22, speed: 55, damage: 10, radius: 11,
    movement: { type: 'chase' }, attacks: [{ type: 'melee' }], modifiers: [{ type: 'explodesOnDeath', count: 8, speed: 200 }] },
  salamandra: { key: 'salamandra', tex: TEX.villager, color: COLORS.salamander, hp: 18, speed: 95, damage: 9, radius: 9,
    movement: { type: 'zigzag' }, attacks: [{ type: 'shootStraight', every: 1300, speed: 230 }] },
  espiritu_ceniza: { key: 'espiritu_ceniza', tex: TEX.villager, color: COLORS.ash, hp: 24, speed: 70, damage: 7, radius: 10,
    movement: { type: 'erratic' }, attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 220 }],
    modifiers: [{ type: 'onHitBurn', dps: 6, ms: 2000 }] },
  can_lava: { key: 'can_lava', tex: TEX.villager, color: COLORS.magma, hp: 30, speed: 90, damage: 15, radius: 11,
    movement: { type: 'charge', windup: 500, dash: 350, recover: 600, dashMul: 3.2 }, attacks: [{ type: 'melee' }] },
  elemental_fuego: { key: 'elemental_fuego', tex: TEX.miniboss, color: COLORS.magma, hp: 60, speed: 55, damage: 8, radius: 14,
    movement: { type: 'kite', range: 200 }, attacks: [{ type: 'nova', count: 10, every: 2600, speed: 200, telegraph: 400 }],
    modifiers: [{ type: 'onHitBurn', dps: 8, ms: 2200 }] },
  coloso_magma: { key: 'coloso_magma', tex: TEX.miniboss, color: COLORS.emberDeep, hp: 110, speed: 35, damage: 14, radius: 16,
    movement: { type: 'chase' }, attacks: [{ type: 'lobAoe', radius: 70, dps: 24, duration: 3200, every: 2800, telegraph: 550 }],
    modifiers: [{ type: 'shielded', reduce: 0.45 }] },
  fenix_menor: { key: 'fenix_menor', tex: TEX.miniboss, color: COLORS.salamander, hp: 50, speed: 80, damage: 10, radius: 13,
    movement: { type: 'orbit' }, attacks: [{ type: 'shootBurst', burst: 3, burstGap: 130, every: 2400, speed: 260 }],
    modifiers: ['reviveOnce'] },

  // --- Summoned / ambient ---
  imp_brasa: { key: 'imp_brasa', tex: TEX.villager, color: COLORS.ember, hp: 10, speed: 120, damage: 8, radius: 8,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  avispa_brasa: { key: 'avispa_brasa', tex: TEX.villager, color: COLORS.salamander, hp: 8, speed: 150, damage: 7, radius: 7,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  totem_pira: { key: 'totem_pira', tex: TEX.warrior, color: COLORS.totemFire, hp: 45, speed: 0, damage: 9, radius: 12,
    movement: { type: 'static' }, attacks: [{ type: 'nova', count: 8, every: 3000, speed: 180, telegraph: 500 }],
    modifiers: [{ type: 'auraDamage', dps: 8, radius: 50 }] },
  brasa_errante: { key: 'brasa_errante', tex: TEX.villager, color: COLORS.totemFire, hp: 12, speed: 60, damage: 0, radius: 8,
    movement: { type: 'erratic' }, attacks: [], modifiers: [{ type: 'auraDamage', dps: 10, radius: 40 }] },
};
```

- [ ] **Step 4:** Crear `src/data/enemies/index.js` (registro central):
```js
import { COLORS, TEX } from '../../config.js';
import { FIRE_ENEMIES } from './fire.js';

// Generic enemies shared across worlds (the original three, as recipes).
const GENERIC = {
  villager: { key: 'villager', tex: TEX.villager, color: COLORS.villager, hp: 20, speed: 90, damage: 8, radius: 10,
    movement: { type: 'chase' }, attacks: [] },
  warrior: { key: 'warrior', tex: TEX.warrior, color: COLORS.warrior, hp: 50, speed: 60, damage: 14, radius: 12,
    movement: { type: 'chase' }, attacks: [] },
  archer: { key: 'archer', tex: TEX.archer, color: COLORS.archer, hp: 25, speed: 70, damage: 10, radius: 10,
    movement: { type: 'kite', range: 220 }, attacks: [{ type: 'shootStraight', every: 1500, speed: 260 }] },
};

export const ENEMY_TYPES = { ...GENERIC, ...FIRE_ENEMIES };
```

- [ ] **Step 5:** Apuntar `src/data/enemies.js` al registro (mantiene el path de import existente que usa GameScene):
```js
// Back-compat re-export. The registry lives in data/enemies/index.js.
export { ENEMY_TYPES } from './enemies/index.js';
```

- [ ] **Step 6:** `node --check` sobre los nuevos archivos y `Enemy.js`:
```bash
node --check src/data/enemies/fire.js && node --check src/data/enemies/index.js && node --check src/data/enemies.js && node --check src/objects/Enemy.js
```
Expected: limpio. `node --test` — todo pasa.

- [ ] **Step 7: Commit**
```bash
git add src/config.js src/objects/Enemy.js src/data/enemies/fire.js src/data/enemies/index.js src/data/enemies.js
git commit -m "feat: registro de enemigos + roster de Fuego (~20 criaturas) + tinte"
```

---

## Task 9: Oleadas de Fuego (presión sostenida) + tope de concurrencia + pool

**Files:**
- Modify: `src/data/regions.js`, `src/scenes/GameScene.js`

Contexto: `basicWaves(tier)`/`interWaves(tier)` en `regions.js` son compartidas y usan villager/archer/warrior. Para Fuego hay que oleadas propias con el roster, más densas. El `makeBranch` de Fuego debe usar olas de Fuego; los otros mundos siguen con las genéricas (sin tocar). El tope de concurrencia throttlea el spawner.

- [ ] **Step 1:** Tope de concurrencia en `spawnWave`. En `src/scenes/GameScene.js`, importar el cap:
```js
import { CONCURRENCY_CAP, ENEMY_SHOT_POOL } from '../data/tuning.js';
```
En el callback del `time.addEvent` de `spawnWave`, antes de `const type = this.spawnQueue.shift();`, añadir el throttle:
```js
        if (this.enemies.countActive(true) >= CONCURRENCY_CAP) return; // hold; try again next tick
```
Para que "hold" no consuma el repeat, cambia el evento a repetir indefinido y termina cuando la cola se vacíe. Reemplaza el bloque `this.spawnEvent = this.time.addEvent({...})` por:
```js
    this.spawnEvent = this.time.addEvent({
      delay: phase.spawnDelay,
      loop: true,
      callback: () => {
        if (this.enemies.countActive(true) >= CONCURRENCY_CAP) return;
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
        if (this.spawnQueue.length === 0) { this.spawnEvent.remove(false); this.spawnEvent = null; this.checkPhaseCleared(); }
      },
    });
```
Esto mantiene presión (rellena hasta el cap) y avanza de fase cuando la cola se vacía y no quedan vivos. **Verifica** que `checkPhaseCleared` (que mira `this.spawnEvent`) sigue funcionando: con `spawnEvent` puesto a `null` al vaciar la cola, su chequeo `stillSpawning` será `false` correctamente.

- [ ] **Step 2:** Dimensionar el pool de disparos enemigos. En `GameScene.create`, cambiar `this.enemyShots = new ProjectilePool(this);` por `this.enemyShots = new ProjectilePool(this, ENEMY_SHOT_POOL);`. En `src/systems/ProjectilePool.js`, aceptar el tamaño: `constructor(scene, maxSize = 200) { ... scene.physics.add.group({ maxSize }); }`.

- [ ] **Step 3:** Oleadas de Fuego en `src/data/regions.js`. Añadir, junto a `basicWaves`/`interWaves`:
```js
// Fire waves: denser, mostly ranged, with a melee rusher that forces movement.
function fireWaves(tier) {
  return [
    wave(560, [{ type: 'acolito_brasa', count: ramp(3, tier) }, { type: 'iniciado_veloz', count: ramp(2, tier) }, { type: 'lanzabrasas', count: tier }]),
    wave(520, [{ type: 'lanzabrasas', count: ramp(2, tier) }, { type: 'salamandra', count: ramp(2, tier) }, { type: 'larva_magma', count: tier }]),
    wave(480, [{ type: 'piromante', count: tier + 1 }, { type: 'pirovidente', count: tier }, { type: 'espiritu_ceniza', count: ramp(2, tier) }]),
  ];
}
function fireInterWaves(tier) {
  return [
    wave(500, [{ type: 'acolito_brasa', count: ramp(3, tier) }, { type: 'caballero_brasa', count: 1 }, { type: 'sacerdote_llama', count: 1 }, { type: 'can_lava', count: tier }]),
    wave(440, [{ type: 'piromante', count: ramp(2, tier) }, { type: 'elemental_fuego', count: 1 }, { type: 'avispa_brasa', count: ramp(3, tier) }, { type: 'totem_pira', count: 1 }]),
  ];
}
```

- [ ] **Step 4:** Hacer que la rama de Fuego use sus oleadas. `makeBranch` es genérico para los 4 mundos; añade un parámetro opcional `waveFns` y úsalo solo para Fuego. En `makeBranch`, cambiar la firma a `function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves })` y reemplazar los `basicWaves(...)`/`interWaves(...)` dentro por `basic(...)`/`inter(...)`. Luego, en la llamada de `fire:` dentro de `REGIONS`, pasar `basic: fireWaves, inter: fireInterWaves`. Los otros mundos no pasan nada → usan las genéricas (sin cambio de comportamiento).

- [ ] **Step 5:** `node --test` — todo pasa (regions.js es data; si hay tests de regions, verifícalos). `node --check src/data/regions.js src/scenes/GameScene.js src/systems/ProjectilePool.js` — limpio.

- [ ] **Step 6: Playtest (mobile portrait)** — `python3 -m http.server 8000`. Jugar Fuego niveles 1–3 y un intermedio (4):
  - Variedad real: acólitos kitean y disparan, iniciados zigzaguean al cuerpo, salamandras erráticas, larvas explotan al morir, piromantes en ráfaga, pirovidentes con homing esquivable, caballero tanque (cuesta más matarlo), sacerdote invoca imps y cura (kill prioritario), elemental suelta novas telegrafiadas, espíritus/tótems queman al rozar.
  - Presión sostenida: la arena se mantiene poblada (~hasta 16), no "limpia y respira".
  - Dificultad: se siente retador; los proyectiles enemigos (tinte naranja) se distinguen de los orbes cian.
  - Sin errores en consola.

- [ ] **Step 7: Commit**
```bash
git add src/data/regions.js src/scenes/GameScene.js src/systems/ProjectilePool.js
git commit -m "feat: oleadas de Fuego densas + tope de concurrencia + pool dimensionado"
```

---

## Self-Review

**1. Cobertura (vs spec §3 roster, §5 dificultad):**
- ~20 criaturas de Fuego (cultistas→bestias→invocados), mayoría ranged, glass-cannon → Task 8. ✓ (Can de Lava modela `dashStrike` como `charge`+`melee`; Portaestandarte usa `auraDamage` en vez de buff — documentado en Alcance.)
- Componentes nuevos que usa el roster: `shootBurst`/`shootHoming`/`lobAoe`/`summon` → Tasks 2/3; `onHitBurn`/`shielded`/`explodesOnDeath`/`reviveOnce`/`healAllies`/`auraDamage` → Tasks 3/5/6/7. ✓
- Dificultad de dos factores (curva base × poder) + perfil de mundo en stats del roster → Task 1 + Task 8. ✓
- Presión sostenida (oleadas densas, solape vía cola continua, tope de concurrencia) + lectura visual (tinte) + pool dimensionado → Task 9. ✓
- Diferido explícito (no huecos): `onHitSlow`/`onHitPoison`/`splitsOnDeath`/`enrageBelowHp`/`beam`/`burrow`, fases/multi-jefe/triángulo, y los jefes de Fuego → Plan 3.

**2. Placeholder scan:** sin TBD/TODO; cada step muestra código completo; el único "stub" es `applyCasterBurn(){}` en Task 3 Step 4, completado en Task 5 (anotado explícitamente). ✓

**3. Consistencia de tipos:** `findModifier(def, type)` (Task 2) se usa con esa firma en Tasks 3/5/6/7. Los modificadores en el roster (Task 8) usan exactamente los `type` y params que leen las Tasks 3/5/6/7 (`onHitBurn{dps,ms}`, `shielded{reduce}`, `explodesOnDeath{count,speed,damage?}`, `healAllies{hps,radius}`, `auraDamage{dps,radius}`, `reviveOnce`). Los `att.type` del roster (`shootBurst{burst,burstGap}`, `shootHoming`, `lobAoe{radius,dps,duration}`, `summon{spawnType,count}`, `nova`, `shootSpread`, `shootStraight`, `melee`) coinciden con lo que manejan `stepAttack`/`buildProjectiles`/`executeAttack`. `levelMultiplier(save, levelIndex)` (Task 1) se usa así en GameScene. `ENEMY_TYPES` del registro (Task 8) cubre todos los `type` de las oleadas de Fuego (Task 9) y los genéricos de los otros mundos. ✓

---

## Notas para el Plan 3 (jefes de Fuego)

- Añade fases (umbral de vida) + secuenciador coreografiado de jefe + telegrafías dibujadas; multi-jefe en `WaveRunner`/`beginPhase` (`bosses: [...]`, `clearWhen:'allDead'`); el `TriangleHazard` puro + render.
- Modificadores restantes para jefes: `enrageBelowHp` (Vesta/al morir hermana), `shielded` direccional/por tótems (Favilla), `onHitSlow` si se quiere.
- Las 5 peleas: Pyra (nv4), Vesta (nv5), Favilla (nv6), las tres + triángulo (nv6 levelboss), Ignatius (nv7, 3 fases). Reabsorbe y elimina `BossMechanics`.
- Texturas/sprites dedicados para Fuego (hoy formas reusadas con tinte).
