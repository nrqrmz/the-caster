# Air Difficulty Pass — Plan 3: Jefes ágiles (Caballero + Bruja) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar los minijefes nv4 (Caballero de Sangre = tanque-vampiro veloz) y nv5 (Bruja del Vendaval = jefa-tormenta escurridiza con teleport "Blink de Tormenta").

**Architecture:** Los stats/kits de jefe son datos en `src/data/bosses/air.js` (pinneados en `tests/AirBosses.test.js`). La mecánica nueva Blink de Tormenta es un caso `do: 'blinkStorm'` en `GameScene.executeAttack`, variante del `submerge` del Kraken que **reubica**, más un helper de VFX `verticalBolt`. Se verifica corriendo el juego.

**Tech Stack:** Phaser 3, `node:test`.

## Global Constraints

- **`src/data/bosses/air.js` es Phaser-free**; el cableado (blinkStorm, VFX) va en `src/scenes/GameScene.js`. (CLAUDE.md)
- Claves de color en `config.js`. (CLAUDE.md)
- Player `moveSpeed = 200` (los speeds de jefe se calibran contra esto). (spec §7)

**Depende de:** Plan 1 (drainBite, bloodDart, slowChance).

---

### Task 1: Caballero de Sangre — stats + drainBite + dardo de sangre

**Files:**
- Modify: `src/data/bosses/air.js` (`CABALLERO_SANGRE`)
- Test: `tests/AirBosses.test.js`

**Interfaces:**
- Consumes (Plan 1): modificador `drainBite`, proyectil `bloodDart`, rider `slowChance`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/AirBosses.test.js`:

```js
import { CABALLERO_SANGRE } from '../src/data/bosses/air.js';

test('Caballero de Sangre: tanque-vampiro (640hp, shielded 0.25, speed 180, drainBite 20/150/4000)', () => {
  assert.equal(CABALLERO_SANGRE.hp, 640);
  assert.equal(CABALLERO_SANGRE.speed, 180);
  assert.equal(CABALLERO_SANGRE.radius, 28);
  const sh = CABALLERO_SANGRE.modifiers.find((m) => m.type === 'shielded');
  const db = CABALLERO_SANGRE.modifiers.find((m) => m.type === 'drainBite');
  assert.equal(sh.reduce, 0.25);
  assert.deepEqual([db.amount, db.range, db.cooldown], [20, 150, 4000]);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Actualizar `CABALLERO_SANGRE`**

En `src/data/bosses/air.js`, la cabecera del def y sus modificadores:

```js
export const CABALLERO_SANGRE = {
  key: 'caballero_sangre', tex: TEX.miniboss, color: COLORS.boss,
  hp: 640, speed: 180, damage: 20, radius: 28,
  elite: true,
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  modifiers: [
    { type: 'drainBite', amount: 20, range: 150, cooldown: 4000 }, // muerde a distancia al embestir
    { type: 'shielded', reduce: 0.25 },
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 450 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
      // dardo de sangre violeta, muy veloz, ~35% de slow
      { do: 'shootStraight', projectile: 'bloodDart', speed: 320, damage: 14, slowChance: 0.35, telegraph: 260, dur: 500 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.3, movement: { type: 'evade', range: 120 }, sequence: [
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 300 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 350 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
    ] },
  ],
};
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/bosses/air.js tests/AirBosses.test.js
git commit -m "feat(air): Caballero de Sangre — tanque-vampiro (640/shield0.25/spd180) + drainBite + dardo violeta"
```

---

### Task 2: Helper `verticalBolt` + caso `blinkStorm` en GameScene

La mecánica Blink de Tormenta: rayo vertical → desaparece (untargetable+invisible) + 4 espíritus en el sitio → tras 3600ms reaparece en un punto aleatorio lejos de la princesa (con otro rayo vertical).

**Files:**
- Modify: `src/scenes/GameScene.js` (nuevo helper `verticalBolt`; nuevo caso en `executeAttack` junto a `submerge`, ~línea 818)

**Interfaces:**
- Consumes: `drawZap(points, color)` (Plan 1 Task 2), `spawnEnemy(def)`, `ENEMY_TYPES`, `CONCURRENCY_CAP`, `pushOutsideRing`, `SPAWN_SAFE_DIST`.
- Produces: `verticalBolt(x, y)`; el caso `att.type === 'blinkStorm'` en `executeAttack`.

- [ ] **Step 1: Añadir el helper `verticalBolt`**

En GameScene (junto a `drawZap`):

```js
  // Pilar de rayo vertical: tell del teleport de la Bruja (cae desde arriba al punto).
  verticalBolt(x, y) {
    this.drawZap([{ x, y: 0 }, { x, y }], COLORS.lightning);
    this.flashCircle(x, y, 30, COLORS.lightning);
  }
```

- [ ] **Step 2: Añadir el caso `blinkStorm` en `executeAttack`**

En `executeAttack`, junto al caso `if (att.type === 'submerge') { ... }` (~línea 818):

```js
    if (att.type === 'blinkStorm') {
      const dur = att.duration ?? 3600;
      // Tell + desaparece en el sitio.
      this.verticalBolt(enemy.x, enemy.y);
      enemy._untargetable = true;
      enemy.setVisible(false);
      if (enemy.body) enemy.body.enable = false;
      // Siembra espíritus de tormenta en el punto de desaparición (respeta el cap).
      const sdef = ENEMY_TYPES['espiritu_tormenta'];
      for (let i = 0; i < (att.spiritCount ?? 4); i++) {
        if (!sdef || this.enemies.countActive(true) >= CONCURRENCY_CAP) break;
        const s = this.spawnEnemy(sdef);
        s.x = Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-40, 40), 20, GAME_WIDTH - 20);
        s.y = Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-40, 40), 20, GAME_HEIGHT - 20);
      }
      const bx = enemy.x, by = enemy.y;
      this.time.delayedCall(dur, () => {
        if (!enemy.active) return;
        // Reubicar en un punto aleatorio lejos de la princesa.
        let nx = Phaser.Math.Between(60, GAME_WIDTH - 60);
        let ny = Phaser.Math.Between(120, GAME_HEIGHT - 200);
        const safe = pushOutsideRing({ x: nx, y: ny }, this.caster, SPAWN_SAFE_DIST + 60);
        nx = Phaser.Math.Clamp(safe.x, 40, GAME_WIDTH - 40);
        ny = Phaser.Math.Clamp(safe.y, 100, GAME_HEIGHT - 180);
        enemy.x = nx; enemy.y = ny;
        this.verticalBolt(nx, ny);
        enemy._untargetable = false;
        enemy.setVisible(true);
        if (enemy.body) enemy.body.enable = true;
      });
      return;
    }
```

- [ ] **Step 3: Verificar suite verde (sin regresión de imports/sintaxis)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): mecánica Blink de Tormenta (blinkStorm) + verticalBolt VFX"
```

---

### Task 3: Bruja del Vendaval — stats + summons + Blink

**Files:**
- Modify: `src/data/bosses/air.js` (`BRUJA_VENDAVAL`)
- Test: `tests/AirBosses.test.js`

**Interfaces:**
- Consumes: el caso `blinkStorm` (Task 2).

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/AirBosses.test.js`:

```js
import { BRUJA_VENDAVAL } from '../src/data/bosses/air.js';

test('Bruja del Vendaval: escurridiza (640hp, shielded 0.15, speed 100), Blink + summons no-murciélago', () => {
  assert.equal(BRUJA_VENDAVAL.hp, 640);
  assert.equal(BRUJA_VENDAVAL.speed, 100);
  assert.equal(BRUJA_VENDAVAL.radius, 30);
  assert.equal(BRUJA_VENDAVAL.modifiers.find((m) => m.type === 'shielded').reduce, 0.15);
  const steps = BRUJA_VENDAVAL.phases.flatMap((p) => p.sequence);
  assert.ok(steps.some((s) => s.do === 'blinkStorm'), 'tiene Blink de Tormenta');
  const summons = steps.filter((s) => s.do === 'summon').map((s) => s.spawnType);
  assert.ok(!summons.includes('murcielago'), 'no invoca murciélagos');
  assert.ok(summons.includes('arpia'), 'invoca arpías');
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Actualizar `BRUJA_VENDAVAL`**

```js
export const BRUJA_VENDAVAL = {
  key: 'bruja_vendaval', tex: TEX.miniboss, color: COLORS.lightning,
  hp: 640, speed: 100, damage: 16, radius: 30,
  elite: true,
  movement: { type: 'strafe', range: 260, strafeSpeed: 55 },
  modifiers: [{ type: 'shielded', reduce: 0.15 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 160, telegraph: 0, dur: 650 },
      { do: 'shootHoming', speed: 130, damage: 14, stun: true, telegraph: 420, dur: 900 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 3, respawnMs: 12000, dur: 700 },
      { do: 'summon', spawnType: 'torbellino_errante', count: 1, cap: 2, respawnMs: 14000, dur: 700 },
      { do: 'blinkStorm', duration: 3600, spiritCount: 4, dur: 900 },
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 170, telegraph: 0, dur: 600 },
      { do: 'shootHoming',   projectile: 'tornado', lift: true, damage: 12, speed: 120, telegraph: 0, dur: 600 },
      { do: 'shootSpread', count: 5, arc: 70, speed: 240, damage: 13, stun: true, telegraph: 320, dur: 650 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 3, respawnMs: 10000, dur: 650 },
      { do: 'blinkStorm', duration: 3600, spiritCount: 4, dur: 900 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Verificación manual (correr el juego)**

Nivel de Aire nv5. Confirmar: la Bruja lanza un rayo vertical, desaparece, brotan 4 espíritus donde estaba, y tras ~3.6s reaparece con otro rayo vertical en otro punto lejos de la princesa. Invoca arpías y tornados (no murciélagos). No se encadenan blinks (1 por ciclo).

- [ ] **Step 6: Commit**

```bash
git add src/data/bosses/air.js tests/AirBosses.test.js
git commit -m "feat(air): Bruja del Vendaval — escurridiza (640/shield0.15/spd100) + Blink de Tormenta + summons propios"
```

---

## Self-Review

**Spec coverage:** §7 nv4 Caballero (640/shielded 0.25/speed 180/radius 28, drainBite 20@150/4000, dardo violeta con slowChance 0.35, P2 evade+dash+murciélagos) → Task 1 ✓. §7 nv5 Bruja (640/shielded 0.15/speed 100/radius 30, Blink 3600ms + 4 espíritus + reubicación aleatoria + rayo vertical, summons arpía/espíritu/torbellino, no murciélagos) → Tasks 2,3 ✓.

**Placeholder scan:** sin placeholders; defs completos. ✓

**Type consistency:** `drainBite {amount,range,cooldown}` y `bloodDart`/`slowChance` idénticos a Plan 1. `blinkStorm {duration, spiritCount}` consistente entre `executeAttack` (Task 2) y los steps de la Bruja (Task 3). ✓

**Nota:** el `dur` de cada step es el tiempo que el BossBrain espera antes del siguiente; el `duration` del blinkStorm (3600ms) es la ventana untargetable (delayedCall independiente del `dur` del step). El `dur: 900` del step deja avanzar la secuencia mientras el blink corre en paralelo.
