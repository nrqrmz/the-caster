# SP-3 — Invocación con topes y setpieces de boss — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistema opt-in de invocación con tope+cooldown; upgrades de Ignatius (giant fireball, summoner, río de lava, menos charcos); retrabajo del trío de hermanas; summons con tope de soldado/abisal/ballena; animaciones de agua (tentáculos, remolino).

**Architecture:** La aritmética del tope vive en un helper puro `summonSlots` (`EnemyBrain.js`). El tracking, los hazards y el render viven en `GameScene.js` (Phaser). Los `enter`-hooks de boss y los steps de secuencia (BossBrain) declaran las mecánicas en datos. Geometría del río de lava en `TriangleHazard.js` (pura, testeable). Sprite del tentáculo vía gen-tool + recipe + `TEX`.

**Tech Stack:** Phaser 3 (CDN, ES modules), `node:test` + `node:assert/strict`, gen-tools en `tools/*.mjs`.

## Global Constraints

- **Sin build step / sin bundler / sin npm en runtime.**
- **Solo módulos puros se unit-testean** (`summonSlots`, `riverEdges`). Tracking/hazards/render → `node --test` verde + playtest portrait 480×854.
- **Claves `TEX`/`COLORS` centralizadas** en `config.js`. El tentáculo añade `TEX.tentacle`.
- **Geometría procedural primero solo donde el spec lo dice; el tentáculo es sprite HD.**
- Sistema de summon es **opt-in**: solo los ataques con `cap` declarado usan el tope; el resto invoca como hoy (global `CONCURRENCY_CAP=16`).
- Comando de tests: `node --test`.

---

### Task 1: Helper puro `summonSlots`

**Files:**
- Modify: `src/systems/EnemyBrain.js` (añadir export `summonSlots`)
- Test: `tests/EnemyBrain.test.js`

**Interfaces:**
- Produces: `summonSlots({ cap, alive, cooldownUntil }, now) → number` — cuántos invocar ahora. `Infinity` si `cap == null` (sin tope). `0` si hay cooldown activo. Si no, `max(0, cap - alive)`.

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/EnemyBrain.test.js`, añadir:

```js
test('summonSlots: sin cap → sin límite propio', () => {
  assert.equal(summonSlots({ cap: null, alive: 99 }, 0), Infinity);
});
test('summonSlots: con cap y sin invocados → cap completo', () => {
  assert.equal(summonSlots({ cap: 3, alive: 0, cooldownUntil: 0 }, 0), 3);
});
test('summonSlots: al tope → 0', () => {
  assert.equal(summonSlots({ cap: 3, alive: 3, cooldownUntil: 0 }, 0), 0);
});
test('summonSlots: en cooldown → 0 aunque haya hueco', () => {
  assert.equal(summonSlots({ cap: 3, alive: 1, cooldownUntil: 5000 }, 1000), 0);
});
test('summonSlots: cooldown expirado → repone el hueco', () => {
  assert.equal(summonSlots({ cap: 3, alive: 1, cooldownUntil: 5000 }, 6000), 2);
});
```

Asegurarse de que el `import` del archivo incluya `summonSlots`:

```js
import { MOVEMENTS, stepAttack, buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, summonSlots } from '../src/systems/EnemyBrain.js';
```

(Ajustar a los símbolos que el test ya importe; añadir `summonSlots`.)

- [ ] **Step 2: Correr los tests (deben fallar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL ("summonSlots is not a function").

- [ ] **Step 3: Implementar el helper**

En `src/systems/EnemyBrain.js`, junto a los otros helpers:

```js
// PURE. Cuántos enemigos puede invocar una instancia de ataque con tope ahora.
// cap == null → sin tope (Infinity). En cooldown (now < cooldownUntil) → 0.
// Si no, los huecos libres: max(0, cap - alive).
export function summonSlots({ cap, alive, cooldownUntil = 0 }, now = 0) {
  if (cap == null) return Infinity;
  if (now < cooldownUntil) return 0;
  return Math.max(0, cap - alive);
}
```

- [ ] **Step 4: Correr los tests (deben pasar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(enemies): helper puro summonSlots (tope + cooldown de invocación)"
```

---

### Task 2: Tracking de invocación con tope en GameScene

**Files:**
- Modify: `src/scenes/GameScene.js` (`executeAttack` rama `summon`; `onEnemyDeath` decremento)

**Interfaces:**
- Consumes: `summonSlots` (Task 1); `this.time.now` (reloj de Phaser); `ENEMY_TYPES`; `this.spawnEnemy(def) → Enemy`.
- Produces: ataques `summon` con `cap`/`respawnMs`/`capKey`/`spawnTypes` respetan el tope; hijos marcados con `_summonedBy`, `_summonCapKey`, `_summonRespawnMs`; el parent lleva `_summonTrackers[key] = { alive, cooldownUntil }`.

- [ ] **Step 1: Importar `summonSlots` en GameScene**

En el import de EnemyBrain (línea ~20):

```js
import { buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, LIFECYCLE, summonSlots } from '../systems/EnemyBrain.js';
```

- [ ] **Step 2: Reescribir la rama `summon` de `executeAttack`**

Reemplazar (líneas ~523-527):

```js
    if (att.type === 'summon') {
      const def = ENEMY_TYPES[att.spawnType];
      if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(def);
      return;
    }
```

por:

```js
    if (att.type === 'summon') {
      const types = att.spawnTypes || [att.spawnType];
      if (att.cap != null) {
        // Summon con tope (opt-in): respeta cap + cooldown por instancia de ataque.
        const key = att.capKey || att.spawnType || types[0];
        enemy._summonTrackers = enemy._summonTrackers || {};
        const tr = enemy._summonTrackers[key] || (enemy._summonTrackers[key] = { alive: 0, cooldownUntil: 0 });
        const slots = summonSlots({ cap: att.cap, alive: tr.alive, cooldownUntil: tr.cooldownUntil }, this.time.now);
        const n = Math.min(att.count ?? 1, slots);
        for (let i = 0; i < n; i++) {
          const t = types[Phaser.Math.Between(0, types.length - 1)];
          const def = ENEMY_TYPES[t];
          if (!def) continue;
          const child = this.spawnEnemy(def);
          child._summonedBy = enemy;
          child._summonCapKey = key;
          child._summonRespawnMs = att.respawnMs ?? 15000;
          tr.alive += 1;
        }
      } else {
        // Sin tope: comportamiento histórico (acotado solo por CONCURRENCY_CAP).
        const def = ENEMY_TYPES[att.spawnType];
        if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(def);
      }
      return;
    }
```

- [ ] **Step 3: Decrementar el tracker al morir un hijo**

En `onEnemyDeath(enemy)`, al inicio del método (antes del bloque `explodesOnDeath`):

```js
    // Si era un invocado con tope, libera su slot e inicia el cooldown del padre.
    if (enemy._summonedBy && enemy._summonedBy.active && enemy._summonCapKey) {
      const tr = enemy._summonedBy._summonTrackers && enemy._summonedBy._summonTrackers[enemy._summonCapKey];
      if (tr) {
        tr.alive = Math.max(0, tr.alive - 1);
        tr.cooldownUntil = this.time.now + (enemy._summonRespawnMs ?? 15000);
      }
    }
```

- [ ] **Step 4: Verificar suite**

Run: `node --test`
Expected: PASS (la aritmética la cubre Task 1; el tracking es de escena).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(game): tracking de invocación con tope+cooldown (opt-in) en executeAttack/onEnemyDeath"
```

---

### Task 3: Summons con tope — bosses de agua

**Files:**
- Modify: `src/data/bosses/water.js` (`SOLDADO_HIELO`, `TIBURON_ABISAL`, `DAMA_BALLENA`)

**Interfaces:**
- Consumes: el sistema de tope (Task 2). Steps `{ do: 'summon', spawnType, count, cap, respawnMs, dur }`.

- [ ] **Step 1: soldado_hielo invoca 2 guardia_hielo**

En `SOLDADO_HIELO`, fase 1 (`from: 1.0`), añadir al final de la `sequence`:

```js
      { do: 'summon', spawnType: 'guardia_hielo', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
```

- [ ] **Step 2: tiburón abisal invoca 1 tiburón joven**

En `TIBURON_ABISAL`, fase 1 (`from: 1.0`), añadir al final de la `sequence`:

```js
      { do: 'summon', spawnType: 'tiburon_joven', count: 1, cap: 1, respawnMs: 15000, dur: 800 },
```

- [ ] **Step 3: dama_ballena invoca cangrejos y pez globo (con tope), además de los ahogados**

En la forma `DAMA_BALLENA`, fase 2 (`from: 0.45`), tras el summon de `ahogado` existente, añadir:

```js
      { do: 'summon', spawnType: 'cangrejo_acorazado', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
      { do: 'summon', spawnType: 'pez_globo', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
```

(El summon de `ahogado` se queda **sin** `cap` → sigue sin tope.)

- [ ] **Step 4: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Playtest**

Pelear soldado_hielo (nv4 agua), tiburón abisal (nv6), Dama del Lago forma ballena (nv8). Verificar topes: ≤2 guardias, ≤1 tiburón joven, ≤2 cangrejos + ≤2 pez globo, con ~15s de espera tras morir uno.

- [ ] **Step 6: Commit**

```bash
git add src/data/bosses/water.js
git commit -m "feat(water-bosses): summons con tope (soldado→guardias, abisal→tiburón, ballena→cangrejos/pez globo)"
```

---

### Task 4: Giant fireball (proyectil grande y lento)

**Files:**
- Modify: `src/systems/EnemyBrain.js` (`buildProjectiles`: rama `giantFireball`)
- Modify: `src/scenes/GameScene.js` (`executeAttack`: escalar el display/cuerpo si `p.big`)
- Test: `tests/EnemyBrain.test.js`

**Interfaces:**
- Produces: `buildProjectiles` para `att.type === 'giantFireball'` emite un único `{ angle, speed, damage, big: true }` recto hacia el objetivo. `executeAttack` agranda el proyectil cuando `p.big`.

- [ ] **Step 1: Escribir el test que falla**

En `tests/EnemyBrain.test.js`:

```js
test('buildProjectiles: giantFireball es un único disparo recto marcado big', () => {
  const out = buildProjectiles(
    { type: 'giantFireball', speed: 120, damage: 28 },
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 } }
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].big, true);
  assert.equal(out[0].speed, 120);
  assert.equal(out[0].damage, 28);
  assert.ok(Math.abs(out[0].angle) < 1e-9); // recto hacia +x
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL (giantFireball produce `[]` hoy).

- [ ] **Step 3: Añadir la rama en `buildProjectiles`**

En `src/systems/EnemyBrain.js`, dentro de `buildProjectiles`, junto a las otras ramas:

```js
  } else if (att.type === 'giantFireball') {
    out.push({ angle: base, speed, damage, big: true });
```

(Insertar antes del comentario final `// melee and not-yet-implemented...`.)

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 5: Escalar el proyectil en `executeAttack`**

En `src/scenes/GameScene.js`, dentro del bucle `for (const p of projs)` de `executeAttack`, tras `shot.setTint(spec.tint);` y antes de las ramas de efecto, añadir:

```js
      if (p.big) {
        shot.setDisplaySize(60, 60);                 // bola enorme reusando TEX.fireball (32px)
        if (shot.body) shot.body.setCircle(28, shot.width / 2 - 28, shot.height / 2 - 28); // hitbox grande
      }
```

- [ ] **Step 6: Verificar suite**

Run: `node --test`
Expected: PASS. (El render/colisión se valida en Task 6 al meter el step en Ignatius.)

- [ ] **Step 7: Commit**

```bash
git add src/systems/EnemyBrain.js src/scenes/GameScene.js tests/EnemyBrain.test.js
git commit -m "feat(projectiles): tipo giantFireball (bola grande y lenta, recta)"
```

---

### Task 5: `lobAoe` por elemento + spawnLavaFloor a 2 carriles

**Files:**
- Modify: `src/scenes/GameScene.js` (`executeAttack` rama `lobAoe`; `runBossHook` `spawnLavaFloor`; `spawnZone`/`updateZones` para estilo agua)

**Interfaces:**
- Produces: las zonas `lobAoe` se pintan según el elemento del mundo (fuego→lava, agua→zona de agua). `spawnZone` acepta `style` (`'fire'`|`'water'`). spawnLavaFloor baja a 2 carriles.

- [ ] **Step 1: `lobAoe` resuelve color/estilo por elemento**

En `executeAttack`, reemplazar la rama `lobAoe` (líneas ~514-522):

```js
    if (att.type === 'lobAoe') {
      const water = this.regionElement === 'water';
      this.spawnZone({
        x: this.caster.x, y: this.caster.y,
        radius: att.radius ?? 60, duration: att.duration ?? 3000,
        casterDps: att.dps ?? 18,
        color: water ? COLORS.water : COLORS.fireball,
        style: water ? 'water' : 'fire',
      });
      return;
    }
```

- [ ] **Step 2: `spawnZone` guarda el `style`**

En `spawnZone(opts)`, calcular `fire` a partir del estilo además del color, y guardar `style`:

```js
  spawnZone(opts) {
    const color = opts.color != null ? opts.color : COLORS.poison;
    const style = opts.style || (color === COLORS.fireball || color === COLORS.magma ? 'fire' : 'flat');
    const fire = style === 'fire' || opts.fire === true;
    const gfx = fire ? null : this.add.circle(opts.x, opts.y, opts.radius, color, 0.30).setDepth(5);
    this.zones.push({
      x: opts.x, y: opts.y, radius: opts.radius, remaining: opts.duration, gfx, fire, style,
      casterDps: opts.casterDps || 0,
      casterHeal: opts.casterHeal || 0,
      enemyDps: opts.enemyDps || 0,
    });
  }
```

(Las zonas de agua usan el disco plano azul existente — `gfx` es el `this.add.circle`. El sprite de tentáculo se añade en Task 8.)

- [ ] **Step 3: spawnLavaFloor → 2 carriles**

En `runBossHook`, hook `spawnLavaFloor`:

```js
    if (hook === 'spawnLavaFloor') {
      const lanes = 2;                                  // antes 4: menos saturación
      for (let i = 0; i < lanes; i++) {
        const x = GAME_WIDTH * (i + 0.5) / lanes;
        this.spawnZone({ x, y: GAME_HEIGHT / 2, radius: 46, duration: 7000, casterDps: 20, color: COLORS.fireball });
      }
    }
```

- [ ] **Step 4: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Playtest**

Kraken (nv7 agua) y Dama ballena: los `lobAoe` ("tentáculos"/maremoto) se ven **azules de agua**, no charcos de lava naranja. Ignatius: solo 2 carriles de lava al cambiar de fase.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "fix(zones): lobAoe se pinta por elemento (agua≠lava) y spawnLavaFloor baja a 2 carriles"
```

---

### Task 6: Setpiece de Ignatius (giant fireball, summoner, menos lava)

**Files:**
- Modify: `src/data/bosses/fire.js` (`IGNATIUS`)

**Interfaces:**
- Consumes: tipo `giantFireball` (Task 4); summon con tope `spawnTypes`/`capKey` (Task 2); hook `startLavaRiver` (Task 7 — el step `enter` se añade aquí pero el hook se implementa en Task 7; ordenar Task 7 antes del playtest).

- [ ] **Step 1: Reescribir las fases de Ignatius**

En `src/data/bosses/fire.js`, reemplazar el bloque `phases` de `IGNATIUS` por (sin `lobAoe` en ciclos; con giant fireball, summon con tope y `startLavaRiver` en fases 2-3):

```js
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 },
      { do: 'giantFireball', projectile: 'fire', speed: 120, damage: 28, telegraph: 600, dur: 900 },
      { do: 'shootHoming', speed: 130, damage: 12, telegraph: 350, dur: 900 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.66, enter: ['spawnLavaFloor', 'startLavaRiver'], sequence: [
      { do: 'nova', count: 12, speed: 220, damage: 13, telegraph: 350, dur: 700 },
      { do: 'summon', spawnTypes: ['brasa_errante', 'elemental_fuego', 'espiritu_ceniza'], count: 1, cap: 3, respawnMs: 20000, capKey: 'ignatius_adds', dur: 900 },
      { do: 'giantFireball', projectile: 'fire', speed: 120, damage: 30, telegraph: 550, dur: 900 },
      { do: 'shootSpread', count: 8, arc: 120, speed: 250, damage: 14, telegraph: 300, dur: 700 },
    ] },
    { from: 0.33, speedMul: 1.35, enter: ['spawnLavaFloor', 'startLavaRiver'], sequence: [
      { do: 'nova', count: 16, speed: 240, damage: 14, telegraph: 280, dur: 600 },
      { do: 'summon', spawnTypes: ['brasa_errante', 'elemental_fuego', 'espiritu_ceniza'], count: 1, cap: 3, respawnMs: 20000, capKey: 'ignatius_adds', dur: 800 },
      { do: 'giantFireball', projectile: 'fire', speed: 130, damage: 32, telegraph: 450, dur: 800 },
      { do: 'shootHoming', speed: 150, damage: 13, telegraph: 250, dur: 600 },
    ] },
  ],
```

(Ignatius conserva su `movement: kite` y `modifiers: onHitBurn`. La lava ahora viene de `spawnLavaFloor` (2 carriles, al entrar a fase) + el río de lava (Task 7), no de `lobAoe` por ciclo.)

- [ ] **Step 2: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/bosses/fire.js
git commit -m "feat(ignatius): giant fireball, summoner con tope (cap 3) y sin charcos por ciclo"
```

---

### Task 7: Río de lava de Ignatius (hazard de línea)

**Files:**
- Modify: `src/data/tuning.js` (constantes del río)
- Modify: `src/systems/TriangleHazard.js` (helper puro `riverEdges`)
- Modify: `src/scenes/GameScene.js` (`runBossHook` `startLavaRiver`; `updateLavaRiver`; llamada en `update`; cleanup en `checkPhaseCleared`; `lavaRiverGfx`)
- Test: `tests/TriangleHazard.test.js`

**Interfaces:**
- Consumes: `drawLavaEdges`/`drawTriangleEdges`/`onAnyEdge` existentes.
- Produces: `riverEdges(orientation, w, h) → [[{x,y},{x,y}]]` (una arista que cruza la pantalla). `this.lavaRiver = { orientation, mode, t }` con su `updateLavaRiver`.

- [ ] **Step 1: Constantes en tuning**

En `src/data/tuning.js` (sección Water/o nueva sección Fuego):

```js
// Río de lava de Ignatius (hazard de línea a pantalla completa).
export const LAVA_RIVER_COOLDOWN_MS = 13000;  // espera entre activaciones (fases 2-3)
export const LAVA_RIVER_TELEGRAPH_MS = 1000;  // aviso antes de encenderse
export const LAVA_RIVER_ACTIVE_MS = 2500;     // dura encendido
export const LAVA_RIVER_DPS = 18;             // menos letal que el triángulo (~28)
```

- [ ] **Step 2: Escribir el test de `riverEdges`**

En `tests/TriangleHazard.test.js` (crear si no existe; importar `riverEdges`):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riverEdges } from '../src/systems/TriangleHazard.js';

test('riverEdges horizontal cruza a media altura', () => {
  const [[a, b]] = riverEdges('horizontal', 480, 854);
  assert.equal(a.y, 427); assert.equal(b.y, 427);
  assert.equal(a.x, 0); assert.equal(b.x, 480);
});
test('riverEdges vertical cruza a media anchura', () => {
  const [[a, b]] = riverEdges('vertical', 480, 854);
  assert.equal(a.x, 240); assert.equal(b.x, 240);
  assert.equal(a.y, 0); assert.equal(b.y, 854);
});
test('riverEdges diagonal va de esquina a esquina', () => {
  const [[a, b]] = riverEdges('diag1', 480, 854);
  assert.deepEqual(a, { x: 0, y: 0 });
  assert.deepEqual(b, { x: 480, y: 854 });
});
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `node --test tests/TriangleHazard.test.js`
Expected: FAIL ("riverEdges is not a function").

- [ ] **Step 4: Implementar `riverEdges`**

En `src/systems/TriangleHazard.js`:

```js
// PURE. Una arista que parte la pantalla según la orientación.
// orientation: 'horizontal' | 'vertical' | 'diag1' (↘) | 'diag2' (↙).
export function riverEdges(orientation, w, h) {
  if (orientation === 'vertical') return [[{ x: w / 2, y: 0 }, { x: w / 2, y: h }]];
  if (orientation === 'diag1')    return [[{ x: 0, y: 0 }, { x: w, y: h }]];
  if (orientation === 'diag2')    return [[{ x: w, y: 0 }, { x: 0, y: h }]];
  return [[{ x: 0, y: h / 2 }, { x: w, y: h / 2 }]]; // horizontal (default)
}
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `node --test tests/TriangleHazard.test.js`
Expected: PASS.

- [ ] **Step 6: Hook + update del río en GameScene**

En el import de TriangleHazard (línea ~22):

```js
import { hazardEdges, onAnyEdge, riverEdges } from '../systems/TriangleHazard.js';
```

E importar las constantes de tuning (donde se importan las otras de tuning):

```js
import { ..., LAVA_RIVER_COOLDOWN_MS, LAVA_RIVER_TELEGRAPH_MS, LAVA_RIVER_ACTIVE_MS, LAVA_RIVER_DPS } from '../data/tuning.js';
```

En `runBossHook`, añadir el hook:

```js
    if (hook === 'startLavaRiver') {
      // Arranca el río en cooldown; se auto-activa periódicamente mientras Ignatius
      // siga en esta fase. Idempotente: no reinicia si ya está activo.
      if (!this.lavaRiver) {
        this.lavaRiver = { orientation: 'horizontal', mode: 'cooldown', t: LAVA_RIVER_COOLDOWN_MS };
      }
    }
```

Añadir el método `updateLavaRiver` (modelado en `updateTriangle`):

```js
  updateLavaRiver(delta) {
    if (!this.lavaRiver) return;
    if (!this.lavaRiverGfx) this.lavaRiverGfx = this.add.graphics().setDepth(6);
    this.lavaRiverGfx.clear();
    const lr = this.lavaRiver;
    lr.t -= delta;
    const edges = riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT);
    if (lr.mode === 'cooldown') {
      if (lr.t <= 0) {
        lr.mode = 'telegraph'; lr.t = LAVA_RIVER_TELEGRAPH_MS;
        const orient = ['horizontal', 'vertical', 'diag1', 'diag2'];
        lr.orientation = orient[Phaser.Math.Between(0, orient.length - 1)];
      }
    } else if (lr.mode === 'telegraph') {
      this._strokeEdgesOn(this.lavaRiverGfx, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT), 0xffffff, 0.5, 2);
      if (lr.t <= 0) { lr.mode = 'active'; lr.t = LAVA_RIVER_ACTIVE_MS; }
    } else if (lr.mode === 'active') {
      this._drawLavaEdgesOn(this.lavaRiverGfx, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT));
      if (onAnyEdge(this.caster.x, this.caster.y, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT), 16)) {
        this.damageCaster(LAVA_RIVER_DPS * (delta / 1000));
        this.applyCasterBurn(8, 1200);
      }
      if (lr.t <= 0) { lr.mode = 'cooldown'; lr.t = LAVA_RIVER_COOLDOWN_MS; }
    }
  }
```

`drawTriangleEdges`/`drawLavaEdges` actuales dibujan en `this.triangleGfx` fijo. Para reusarlos en `this.lavaRiverGfx`, extraer la versión parametrizada por gfx. Refactor mínimo — añadir dos helpers y que los métodos viejos deleguen:

```js
  _strokeEdgesOn(g, edges, color, alpha, width) {
    g.lineStyle(width, color, alpha);
    for (const [a, b] of edges) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath(); }
  }
  _drawLavaEdgesOn(g, edges) {
    const t = this.lavaTime;
    const stroke = (w, col, a) => { g.lineStyle(w, col, a); for (const [p, q] of edges) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.strokePath(); } };
    stroke(40, LAVA.dark, 0.4);
    stroke(32, lerpColor(LAVA.mid, LAVA.hot, lavaPulse(t)), 0.9);
    stroke(10, LAVA.bright, lavaRimAlpha(t));
    for (const [p, q] of edges) for (const e of lavaEdgeEmbers(p, q, t, 7)) { g.fillStyle(LAVA.bright, e.alpha * 0.9); g.fillCircle(e.x, e.y, e.r); }
  }
```

Y que `drawTriangleEdges`/`drawLavaEdges` deleguen a estos pasando `this.triangleGfx` (refactor que no cambia su comportamiento).

- [ ] **Step 7: Llamar a `updateLavaRiver` en el loop y limpiar al terminar la fase**

En `update()`, junto a `this.updateTriangle(delta);`:

```js
    this.updateLavaRiver(delta);
```

En `checkPhaseCleared`, en el bloque de limpieza de hazards de boss (donde ya se anulan `triangle`/`whirlpool`), añadir:

```js
        this.lavaRiver = null;
        if (this.lavaRiverGfx) this.lavaRiverGfx.clear();
```

En `create()`, junto a las inicializaciones de hazards (`this.triangle = null;`), añadir:

```js
    this.lavaRiver = null;
    this.lavaRiverGfx = null;
```

- [ ] **Step 8: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 9: Playtest**

Pelear Ignatius (temple nv8 fuego). Verificar: en fases 2-3 aparece un **río de lava** (horizontal/vertical/diagonal aleatorio) cada ~13s, telegrafiado ~1s, encendido ~2.5s, ~18 dps + burn al tocar. Menos charcos que antes; giant fireball lenta esquivable; ≤3 invocados.

- [ ] **Step 10: Commit**

```bash
git add src/data/tuning.js src/systems/TriangleHazard.js src/scenes/GameScene.js tests/TriangleHazard.test.js
git commit -m "feat(ignatius): río de lava (hazard de línea aleatoria, 18dps+burn) y refactor de dibujo de aristas"
```

---

### Task 8: Sprite HD del tentáculo del Kraken

**Files:**
- Create: `tools/gen-tentacle.mjs` (mirroring un gen-tool existente)
- Modify: `src/data/sprites/recipes.js` (recipe del tentáculo)
- Modify: `src/config.js` (`TEX.tentacle`)
- Modify: `src/scenes/GameScene.js` (`spawnZone`/`updateZones`: render del tentáculo para zonas `style:'water'` de lobAoe)
- Modify: `src/scenes/BootScene.js` (cargar/registrar la textura si aplica, siguiendo el patrón de los demás sprites)

**Interfaces:**
- Consumes: `style: 'water'` en zonas (Task 5).
- Produces: `TEX.tentacle`; las zonas de agua de `lobAoe` se dibujan con un sprite de tentáculo que **crece desde el suelo** al activarse y se retrae al expirar.

- [ ] **Step 1: Leer un gen-tool de referencia**

Leer `tools/gen-proj.mjs` y `tools/gen-waterboss.mjs` para replicar exactamente el patrón de generación (cómo definen el canvas, los frames y cómo escriben el PNG/atlas). El tentáculo es un sprite pixel-art HD vertical de agua.

- [ ] **Step 2: Crear `tools/gen-tentacle.mjs`**

Mirror del gen-tool de referencia, generando un tentáculo vertical de agua (paleta `COLORS.water`/`waterDeep`): base ancha abajo, punta arriba, con 3-4 frames de crecimiento (de bajo a alto) para animar el brote. Tamaño coherente con un `lobAoe` (radio ~60 → sprite ~120px alto). Exportar la textura con la misma convención de nombres que los demás (`tex_tentacle`).

- [ ] **Step 3: Registrar recipe y clave de textura**

En `src/data/sprites/recipes.js`, añadir el recipe del tentáculo siguiendo el formato de los `projectile`/`boss` existentes. En `src/config.js`, añadir a `TEX`:

```js
  tentacle: 'tex_tentacle',
```

- [ ] **Step 4: Render del tentáculo en las zonas de agua**

En `spawnZone`, cuando `style === 'water'` y es una zona de `lobAoe` (radio grande), crear un sprite de tentáculo en `(x, y)` en vez del disco plano, anclado al "suelo" (origen inferior), con escala vertical inicial 0. Guardarlo en la zona (`z.tentacle`). En `updateZones`, para esas zonas, animar la escala vertical: crece de 0→1 en el primer ~30% de la duración, se mantiene, y se retrae a 0 en el último ~30%. Destruir el sprite al expirar la zona (en el filtro de limpieza, junto a `z.gfx`).

Concretamente, en `updateZones`, dentro del `for (const z of this.zones)`:

```js
      if (z.tentacle) {
        const lifeFrac = 1 - z.remaining / z.duration0; // 0→1 en su vida
        const grow = Math.min(1, lifeFrac / 0.3);
        const retract = Math.min(1, Math.max(0, (lifeFrac - 0.7) / 0.3));
        z.tentacle.setScale(1, Math.max(0, grow - retract));
      }
```

(Guardar `duration0: opts.duration` en `spawnZone` para conocer la duración total. Añadir `z.tentacle &&  z.tentacle.destroy()` en el filtro de limpieza de `this.zones`.)

- [ ] **Step 5: Verificar suite + generar la textura**

Run: `node tools/gen-tentacle.mjs` (genera el asset)
Run: `node --test`
Expected: asset generado; tests en PASS.

- [ ] **Step 6: Playtest**

Kraken (nv7) y Dama kraken/ballena: los `lobAoe` se ven como **tentáculos de agua brotando del suelo** y retrayéndose, no charcos.

- [ ] **Step 7: Commit**

```bash
git add tools/gen-tentacle.mjs src/data/sprites/recipes.js src/config.js src/scenes/GameScene.js src/scenes/BootScene.js
git commit -m "feat(water): sprite HD de tentáculo para los lobAoe de agua (Kraken/Dama)"
```

---

### Task 9: Retrabajo del trío de hermanas (nv7 fuego)

**Files:**
- Modify: `src/data/bosses/fire.js` (`SISTERS_TRIO`: hp/movimientos + `soloSequence`)
- Modify: `src/scenes/GameScene.js` (`updateTriangle`: al quedar 1 hermana, intercambiar a su `soloSequence`)

**Interfaces:**
- Produces: variantes de trío con `hp` 360/480/300, movimientos kite/chase/kite, y `soloSequence` (con `lobAoe`) que la superviviente adopta al quedar sola.

- [ ] **Step 1: Reescribir `SISTERS_TRIO`**

En `src/data/bosses/fire.js`, reemplazar el bloque `SISTERS_TRIO` (y su helper `trio`) por:

```js
const stripFloorAndAdds = (seq) => seq.filter((s) => s.do !== 'lobAoe' && s.do !== 'summon');
// soloSeq: lo que hace la hermana cuando queda SOLA (recupera sus charcos de lava).
const trio = (def, hp, movement, seq, soloSequence) => ({
  ...def, hp, movement,
  phases: [{ from: 1.0, sequence: seq }],
  soloSequence,
});
const SOLO_LAVA = { do: 'lobAoe', radius: 64, dps: 22, duration: 3500, telegraph: 500, dur: 900 };
export const SISTERS_TRIO = [
  trio(PYRA, 360, { type: 'kite', range: 240 },
    stripFloorAndAdds(PYRA.phases[0].sequence),
    [SOLO_LAVA, { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 }]),
  trio(VESTA, 480, { type: 'chase' },
    stripFloorAndAdds(VESTA.phases[0].sequence),
    [SOLO_LAVA, { do: 'shootStraight', speed: 260, damage: 12, telegraph: 250, dur: 600 }]),
  trio(FAVILLA, 300, { type: 'kite', range: 240 },
    stripFloorAndAdds(FAVILLA.phases[1].sequence),
    [SOLO_LAVA, { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 }]),
];
```

(Nota: `PYRA`/`VESTA`/`FAVILLA` ya tienen los HP base de SP-1, pero el trío los sobreescribe a 360/480/300. Vesta conserva su `movement: charge` base en su pelea individual; en el trío usa `chase`. Pyra/Favilla usan `kite`.)

- [ ] **Step 2: Intercambio a `soloSequence` al quedar 1 hermana**

En `src/scenes/GameScene.js`, en `updateTriangle(delta)`, tras `const live = this.bosses.filter((b) => b && b.active);`, añadir:

```js
    // Última hermana viva: cancela el triángulo y recupera sus charcos de lava.
    if (live.length === 1 && live[0].def.soloSequence && !live[0]._wentSolo) {
      const b = live[0];
      b.def = { ...b.def, phases: [{ from: 1.0, sequence: b.def.soloSequence }] };
      b.brainState.boss = {};   // reinicia el sequencer a la nueva fase
      b._wentSolo = true;
    }
```

(El `this.triangleGfx.clear()` + el `if (live.length < 2) return;` existentes ya apagan el triángulo cuando queda 1; con esto la superviviente además empieza a dejar lava.)

- [ ] **Step 3: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Playtest**

Nivel 7 de fuego (trío). Verificar: Vesta persigue, Pyra/Favilla kitean → triángulos variados; al matar a dos, la última hermana deja de generar triángulo y **empieza a soltar charcos de lava** mientras pelea sola.

- [ ] **Step 5: Commit**

```bash
git add src/data/bosses/fire.js src/scenes/GameScene.js
git commit -m "feat(sisters): trío con kite/chase para triángulos variados y charcos de lava al quedar la última"
```

---

### Task 10: Animación del remolino del Kraken

**Files:**
- Modify: `src/scenes/GameScene.js` (`updateWhirlpool`: telegraph + espiral rotatoria legible)

**Interfaces:**
- Consumes: `this.whirlpool = { center, radius, phase, mode, t }` (ya existe). No cambia la física (`WhirlpoolHazard`).

- [ ] **Step 1: Mejorar el dibujo del remolino**

En `updateWhirlpool`, en la rama de dibujo (`this.whirlpoolGfx`), reemplazar los círculos concéntricos estáticos por una **espiral rotatoria** que comunique succión, y un telegraph más marcado. Usar `this.lavaTime` (ya se incrementa cada frame) como fase de rotación. Esquema:

```js
      // Telegraph: anillo pulsante de aviso.
      if (w.mode === 'telegraph') {
        const pulse = 0.4 + 0.4 * Math.abs(Math.sin(this.lavaTime * 4));
        this.whirlpoolGfx.lineStyle(3, COLORS.water, pulse);
        this.whirlpoolGfx.strokeCircle(w.center.x, w.center.y, w.radius);
      } else {
        // Active: espiral rotatoria (arms) que converge al centro.
        const arms = 3, turns = 2.4, steps = 40;
        const rot = this.lavaTime * 2; // velocidad de giro
        for (let a = 0; a < arms; a++) {
          this.whirlpoolGfx.lineStyle(2, COLORS.waterDeep, 0.8);
          this.whirlpoolGfx.beginPath();
          for (let s = 0; s <= steps; s++) {
            const f = s / steps;
            const ang = rot + a * (Math.PI * 2 / arms) + f * turns * Math.PI * 2;
            const rad = activeRadius * (1 - f);
            const px = w.center.x + Math.cos(ang) * rad;
            const py = w.center.y + Math.sin(ang) * rad;
            if (s === 0) this.whirlpoolGfx.moveTo(px, py); else this.whirlpoolGfx.lineTo(px, py);
          }
          this.whirlpoolGfx.strokePath();
        }
      }
```

(Integrar respetando las variables ya presentes en `updateWhirlpool`: `w`, `activeRadius`, `this.whirlpoolGfx`. Conservar la lógica de succión/DoT — `forceAt`/`centerDot` — intacta; solo cambia el dibujo. Si `activeRadius` solo existe en la rama active, calcular el radio de telegraph con `w.radius`.)

- [ ] **Step 2: Verificar suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Playtest**

Kraken (nv7) y Dama kraken (nv8): el remolino se **reconoce como remolino** (espiral girando) y el telegraph avisa con claridad antes de activarse la succión.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(kraken): remolino con espiral rotatoria y telegraph legible"
```

---

## Self-Review (SP-3)

- **Cobertura del spec:** §1 sistema summon → Tasks 1-2; defs con tope → Task 3 (agua) + Task 6 (Ignatius); §2a menos lava → Tasks 5-6; §2b giant fireball → Tasks 4, 6; §2c summoner → Tasks 2, 6; §2d río de lava → Task 7; §3 trío → Task 9; §4 summons agua → Task 3; §5a lobAoe por elemento → Task 5; §5b tentáculo HD → Task 8; §5c remolino → Task 10; §5d maremoto → Task 5 (color agua) + Task 8 (no aplica tentáculo al maremoto salvo que se quiera; ver nota). ✔
- **Sin placeholders:** código completo para helpers puros, hazard, trío, remolino. Task 8 (sprite) referencia leer un gen-tool de plantilla — es un paso de arte generativo inherente, con parámetros concretos (tamaño, paleta, frames). ✔
- **Consistencia de tipos:** `summonSlots({cap,alive,cooldownUntil}, now)` igual en Tasks 1-2; `_summonCapKey`/`_summonRespawnMs`/`_summonTrackers` coherentes entre executeAttack y onEnemyDeath; `riverEdges(orientation,w,h)` igual en Task 7; `style`/`duration0`/`z.tentacle` coherentes entre Tasks 5 y 8. ✔

## Notas

- **Orden de ejecución:** Task 6 mete el step `startLavaRiver` en Ignatius pero el hook lo implementa Task 7 — ejecutar Task 7 antes de hacer el playtest de Ignatius (o intercambiar 6↔7). Sin el hook, `startLavaRiver` es un no-op inofensivo.
- **Maremoto de la ballena (§5d):** Task 5 ya lo pinta como agua. Si se quiere que el maremoto también use el sprite de tentáculo (Task 8) en vez del disco azul, es una decisión de playtest; por defecto solo los `lobAoe` "tentáculo" del Kraken usan el sprite y el maremoto grande queda como ola de agua (disco azul) para diferenciarlos visualmente.
- Las defs de datos no llevan unit test (convención del repo); verificación = `node --test` verde + playtest.
