# Air Difficulty Pass — Plan 6: Galahad (nv8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer a Galahad (temple boss nv8, cambiaformas de 5 formas) como el jefe final más duro del juego (suma 3320hp): drainBite por forma, dardos violeta, dashes de frenesí, murciélago gigante, y el deathFeint de 3600ms con cadáver horizontal ("¿ya murió o se levanta otra vez?").

**Architecture:** Los 5 defs de forma son datos en `src/data/bosses/air.js` (pins vía `GALAHAD.forms` en `tests/AirBosses.test.js`). El render de la forma murciélago y los timings del deathFeint son cableado Phaser en `GameScene` (`_applyBossForm` y `_beginBossTransform` / muerte final).

**Tech Stack:** Phaser 3, `node:test`.

## Global Constraints

- Split pure/Phaser (CLAUDE.md). Player `moveSpeed = 200` (speeds hasta 200 = imposible correrle). (spec §7)
- El rojo es exclusivo del tether de drain; los dardos son **violeta** (`bloodDart`). (spec §5)

**Depende de:** Plan 1 (drainBite, bloodDart, slowChance). Comparte el `deathFeint` con el `FormSequencer` existente.

---

### Task 1: Reescribir las 5 formas de Galahad

**Files:**
- Modify: `src/data/bosses/air.js` (`GALAHAD_HUMANO`, `GALAHAD_RAGE`, `GALAHAD_RAGE2`, `GALAHAD_MURCIELAGO`, `GALAHAD_FINAL`, y el `hp` del def top-level `GALAHAD`)
- Test: `tests/AirBosses.test.js`

**Interfaces:**
- Consumes (Plan 1): `drainBite`, proyectil `bloodDart`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/AirBosses.test.js`:

```js
import { GALAHAD } from '../src/data/bosses/air.js';

test('Galahad: 5 formas, suma 3320, resist trepa 0.1->0.3, drainBite en las 4 de combate', () => {
  const hp = GALAHAD.forms.map((f) => f.hp);
  assert.deepEqual(hp, [640, 700, 780, 950, 250]);
  assert.equal(hp.reduce((a, b) => a + b, 0), 3320);
  assert.deepEqual(GALAHAD.forms.map((f) => f.speed), [150, 180, 200, 120, 55]);
  assert.deepEqual(GALAHAD.forms.map((f) => f.resist), [0.10, 0.15, 0.20, 0.30, 0]);
  const dbAmt = GALAHAD.forms.map((f) => (f.modifiers || []).find((m) => m.type === 'drainBite')?.amount);
  assert.deepEqual(dbAmt, [20, 24, 28, 30, undefined]);
});
```

- [ ] **Step 2: Correr para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Reescribir los 5 defs de forma**

En `src/data/bosses/air.js`:

```js
const GALAHAD_HUMANO = {
  key: 'galahad_humano', tex: TEX.boss, color: COLORS.boss,
  hp: 640, speed: 150, damage: 16, radius: 26, resist: 0.10,
  elite: true,
  movement: { type: 'evade', range: 240 }, // esquiva tus orbes
  modifiers: [{ type: 'drainBite', amount: 20, range: 300, cooldown: 4000 }], // sifón de largo alcance
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', projectile: 'bloodDart', speed: 240, damage: 16, telegraph: 320, dur: 650 },
      { do: 'shootSpread', projectile: 'bloodDart', count: 3, arc: 50, speed: 230, damage: 13, telegraph: 340, dur: 700 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'shootStraight', projectile: 'bloodDart', speed: 260, damage: 16, telegraph: 280, dur: 580 },
      { do: 'shootHoming', projectile: 'bloodDart', speed: 150, damage: 14, telegraph: 320, dur: 700 }, // esquirla que persigue
      { do: 'nova', count: 8, speed: 220, damage: 12, telegraph: 340, dur: 700 },
      { do: 'shootSpread', projectile: 'bloodDart', count: 5, arc: 70, speed: 240, damage: 14, telegraph: 300, dur: 620 },
      { do: 'wait', dur: 400 },
    ] },
  ],
};

const GALAHAD_RAGE = {
  key: 'galahad_rage', tex: TEX.boss, color: COLORS.boss,
  hp: 700, speed: 180, damage: 20, radius: 30, resist: 0.15,
  elite: true,
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  modifiers: [{ type: 'drainBite', amount: 24, range: 150, cooldown: 4000 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 450 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [ // triple dash de frenesí
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 200 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 200 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 450 },
    ] },
  ],
};

const GALAHAD_RAGE2 = {
  key: 'galahad_rage2', tex: TEX.boss, color: COLORS.boss,
  hp: 780, speed: 200, damage: 22, radius: 30, resist: 0.20,
  elite: true,
  movement: { type: 'charge', windup: 225, dash: 170, recover: 250, dashMul: 3.2 },
  modifiers: [{ type: 'drainBite', amount: 28, range: 150, cooldown: 4000 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 225 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 200, dur: 220 },
      { do: 'wait', dur: 250 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 9000, dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [ // cuádruple dash
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 },
      { do: 'wait', dur: 150 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 },
      { do: 'wait', dur: 150 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 },
      { do: 'wait', dur: 150 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 },
      { do: 'wait', dur: 250 },
    ] },
  ],
};

const GALAHAD_MURCIELAGO = {
  key: 'galahad_murcielago', tex: TEX.boss, color: COLORS.miniboss,
  hp: 950, speed: 120, damage: 24, radius: 72, resist: 0.30,
  elite: true, flying: true,
  movement: { type: 'charge', windup: 400, dash: 360, recover: 550, dashMul: 3.0 },
  modifiers: [{ type: 'drainBite', amount: 30, range: 180, cooldown: 4000 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 400 },
      { do: 'dashStrike', damage: 24, range: 80, telegraph: 320, dur: 380 },
      { do: 'nova', count: 14, speed: 230, damage: 14, push: { force: 240, ms: 260 }, telegraph: 380, dur: 700 },
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 8, respawnMs: 10000, dur: 800 },
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.45, speedMul: 1.1, sequence: [
      { do: 'wait', dur: 320 },
      { do: 'dashStrike', damage: 24, range: 80, telegraph: 260, dur: 340 },
      { do: 'nova', count: 16, speed: 240, damage: 15, push: { force: 260, ms: 280 }, telegraph: 340, dur: 650 },
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 8, respawnMs: 9000, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

const GALAHAD_FINAL = {
  key: 'galahad_final', tex: TEX.boss, color: COLORS.boss,
  hp: 250, speed: 55, damage: 10, radius: 24, resist: 0,
  elite: true,
  movement: { type: 'flee' },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', projectile: 'bloodDart', count: 3, arc: 60, speed: 210, damage: 10, telegraph: 300, dur: 600 }, // spread violeta desesperado
      { do: 'wait', dur: 700 },
    ] },
  ],
};
```

Y el `hp` del def top-level `GALAHAD` (espejo de la primera forma):

```js
export const GALAHAD = {
  key: 'galahad', tex: TEX.boss, color: COLORS.boss,
  hp: 640, speed: 150, damage: 16, radius: 26,
  elite: true,
  deathFeint: true,
  movement: { type: 'evade', range: 240 },
  extraSprites: ['galahad_cadaver'],
  forms: [GALAHAD_HUMANO, GALAHAD_RAGE, GALAHAD_RAGE2, GALAHAD_MURCIELAGO, GALAHAD_FINAL],
};
```

- [ ] **Step 4: Correr para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/bosses/air.js tests/AirBosses.test.js
git commit -m "feat(air): Galahad 5 formas (suma 3320) — drainBite/dardos violeta/dashes frenesí/murciélago gigante"
```

---

### Task 2: Render gigante de la forma Murciélago (200×100)

**Files:**
- Modify: `src/scenes/GameScene.js:263-264` (`_applyBossForm`)

- [ ] **Step 1: Agrandar el display de la forma murciélago**

Cambiar el caso especial en `_applyBossForm`:

```js
    // galahad_murcielago: textura 2:1 gigante (forma clímax); las demás formas son cuadradas.
    if (form.key === 'galahad_murcielago') {
      boss.setDisplaySize(200, 100);
    } else if (form.radius) {
      boss.setDisplaySize(form.radius * 2, form.radius * 2);
    }
```

- [ ] **Step 2: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Verificación manual**

nv8, llegar a la forma murciélago. Confirmar que se dibuja enorme (200×100), dominando la pantalla.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): forma Murciélago de Galahad render gigante 200×100"
```

---

### Task 3: deathFeint entre formas a 3600ms (cadáver horizontal)

**Files:**
- Modify: `src/scenes/GameScene.js` (`_beginBossTransform`, el `delayedCall(1000, …)` ~línea 317)

- [ ] **Step 1: Alargar la ventana de resurrección a 3600ms**

En `_beginBossTransform`, cambiar el `delayedCall` que levanta la siguiente forma:

```js
    this.time.delayedCall(3600, () => { // yace muerto+unreachable 3600ms antes de levantarse
      if (!boss.active) return;
      boss._transforming = false;
      boss.setAlpha(1);
      boss.scaleY = boss.scaleX;
      boss._formSeq.completeTransform();
      this._applyBossForm(boss, boss._formSeq.activeFormIndex);
      if (!hasRecipe(boss.def.key)) {
        boss.clearTint();
        if (boss._formSeq.activeForm().color) boss.setTint(boss._formSeq.activeForm().color);
      }
      if (feint) this.flashCircle(boss.x, boss.y, (boss.def.radius || 26) + 18, COLORS.lightning);
    });
```

(El cadáver ya se muestra horizontal — `galahad_cadaver` 128×64 — a los 440ms; ahora se sostiene 3.6s antes de resucitar. Sin cambios al swap del cadáver: se mantiene el tamaño consistente 128×64 en cada muerte.)

- [ ] **Step 2: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Verificación manual**

nv8. Confirmar: al agotar cada forma, Galahad cae cadáver **horizontal**, yace ~3.6s intocable, y se levanta como la siguiente forma. Cada muerte se ve igual.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): deathFeint entre formas a 3600ms (cadáver horizontal sostenido)"
```

---

### Task 4: Muerte final — 3600ms de cadáver antes del fuego

Hoy la muerte final se enciende en fuego de inmediato. Debe yacer 3600ms **idéntico a los feints** (no sabes si es el final) y ENTONCES arder + limpiar el nivel.

**Files:**
- Modify: `src/scenes/GameScene.js` (bloque de muerte final de Galahad, ~línea 490-520)

- [ ] **Step 1: Envolver la secuencia de fuego en un delay de 3600ms**

Reemplazar el bloque de la muerte real de Galahad (dentro de `if (enemy._formSeq.fightOver) { if (Galahad) { … } }`):

```js
        if (enemy.def && (enemy.def.deathFeint || (enemy.def.key && String(enemy.def.key).startsWith('galahad')))) {
          enemy._untargetable = true; // intocable; parece un feint más
          if (enemy.def && enemy.def.key && String(enemy.def.key).startsWith('galahad')) {
            enemy.setTexture(spriteKey('galahad_cadaver'));
            enemy.setDisplaySize(128, 64); // cadáver horizontal consistente
          }
          enemy.setAlpha(1);
          // Yace muerto 3600ms IDÉNTICO a los feints; NO sabes si se levantará…
          this.time.delayedCall(3600, () => {
            if (!enemy.active) return;
            // …y ENTONCES se enciende en fuego y termina el nivel.
            this.flashCircle(enemy.x, enemy.y, 80, COLORS.fireball);
            const burn = this.add.circle(enemy.x, enemy.y, 48, COLORS.fireball, 0.65).setDepth(8);
            this.tweens.add({ targets: burn, alpha: 0, scale: 1.9, duration: 800, onComplete: () => burn.destroy() });
            this.tweens.add({
              targets: enemy, alpha: 0, duration: 850, ease: 'Quad.easeIn',
              onComplete: () => {
                if (!enemy.active) return;
                this.onEnemyDeath(enemy);
                if (enemy === this.boss) this.boss = null;
                this.bosses = this.bosses.filter((b) => b !== enemy);
                enemy.destroy();
                this.checkPhaseCleared();
              },
            });
          });
          return;
        }
```

- [ ] **Step 2: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Verificación manual (el clímax)**

nv8, matar la forma Final. Confirmar: Galahad cae cadáver horizontal, yace ~3.6s intocable (idéntico a los feints anteriores — el suspenso), y ENTONCES se enciende en fuego, dispara el diálogo de cierre (onClear) y termina el nivel.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): muerte final de Galahad — cadáver horizontal 3600ms antes del fuego (suspenso)"
```

---

## Self-Review

**Spec coverage:** §7 nv8 — las 5 formas con hp/speed/resist/radius/drainBite (Task 1), dardos violeta bloodDart (Task 1), P2 triple/cuádruple dash (Task 1), murciélago gigante render 200×100 (Task 2), deathFeint 3600ms entre formas + cadáver horizontal (Task 3), muerte final con 3600ms de cadáver antes del fuego (Task 4). ✓

**Placeholder scan:** defs completos; sin TBD. ✓

**Type consistency:** `drainBite {amount,range,cooldown}` y `bloodDart` idénticos a Plan 1. `GALAHAD.forms` (Task 1) consumido por el pin. El bloque de muerte final conserva la firma `onEnemyDeath`/`checkPhaseCleared`/`bosses.filter` existente, solo lo envuelve en el delay. ✓

**Nota:** el drenaje de Galahad ya se enruta por `_formSeq` (cura la forma activa) en el bucle `updateDrainBite` del Plan 1 (Task 4) — no requiere trabajo extra aquí.
