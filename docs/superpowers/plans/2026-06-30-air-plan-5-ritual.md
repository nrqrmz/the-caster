# Air Difficulty Pass — Plan 5: El Ritual de Galahad (nv7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rehacer el Líder Cultista (nv7) como el setpiece del ritual: ataúd sólido central, líder intocable en la cabecera, 6 cultistas flanqueando (reemplazados corriendo desde el borde al morir), gárgola al pie, rito de 3 min con oleadas humanas abundantes.

**Architecture:** El grueso es cableado Phaser en `GameScene` (colocación del setpiece, colisión del ataúd, guardias-a-ranura, exención del cap). `StaticBlock` se extiende a rectángulo. El timer del rito es una constante pura. Las oleadas del canal son datos en el def del líder.

**Tech Stack:** Phaser 3, `node:test`.

## Global Constraints

- Split pure/Phaser (CLAUDE.md). `CONCURRENCY_CAP = 16`.
- El sprite del ataúd es **arte nuevo** (subagent + Playwright, fuera de este plan); aquí se usa un **bloque rectangular tintado** provisional (funcional).
- Claves de color/textura en `config.js`.

**Depende de:** ninguno estricto (usa enemigos existentes).

---

### Task 1: Alargar el rito a 3 minutos

**Files:**
- Modify: `src/data/tuning.js` (`RITUAL_FILL_MS`)
- Test: `tests/Tuning.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { RITUAL_FILL_MS } from '../src/data/tuning.js';
test('el rito dura 3 minutos', () => { assert.equal(RITUAL_FILL_MS, 180000); });
```

- [ ] **Step 2: Correr para verificar que falla**

Run: `node --test tests/Tuning.test.js`
Expected: FAIL (38000).

- [ ] **Step 3: Actualizar la constante**

`src/data/tuning.js`:

```js
export const RITUAL_FILL_MS = 180000; // 3 min — el rito es imposible de evitar
```

- [ ] **Step 4: Correr para verificar que pasa**

Run: `node --test tests/Tuning.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/tuning.js tests/Tuning.test.js
git commit -m "feat(air): el rito de Galahad dura 3 min (RITUAL_FILL_MS 38000->180000)"
```

---

### Task 2: `StaticBlock` acepta ancho×alto (ataúd rectangular)

**Files:**
- Modify: `src/objects/StaticBlock.js`

**Interfaces:**
- Produces: `new StaticBlock(scene, x, y, width, height = width, tint = COLORS.stoneGrey)` — bloque inamovible con hitbox rectangular; retrocompatible (si se pasa un solo tamaño, es cuadrado).

- [ ] **Step 1: Extender el constructor**

Reemplazar `src/objects/StaticBlock.js`:

```js
// src/objects/StaticBlock.js — obstáculo inamovible que el caster no atraviesa.
// Solo movimiento: los proyectiles pasan (colisionan por sus propios overlaps).
import { TEX, COLORS } from '../config.js';

export default class StaticBlock extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, width = 40, height = width, tint = COLORS.stoneGrey) {
    super(scene, x, y, TEX.villager); // textura genérica 32px, tintada
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(width, height);
    if (this.body) { this.body.setSize(width, height); }
    this.setImmovable(true);
    this.setTint(tint);
    this.setDepth(5);
  }
}
```

- [ ] **Step 2: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/objects/StaticBlock.js
git commit -m "feat(air): StaticBlock acepta ancho×alto y tint (para el ataúd)"
```

---

### Task 3: Colocar el setpiece del ritual al spawnear el líder

**Files:**
- Modify: `src/scenes/GameScene.js` (nuevo método `setupRitualSetpiece(boss)`, llamado en `spawnBoss` cuando `def.ritual`)

**Interfaces:**
- Consumes: `StaticBlock` (Task 2), `spawnEnemy`, `ENEMY_TYPES`, `physics.add.collider`.
- Produces: `boss._ritualSlots` (array de {x,y}), el bloque del ataúd en `this.blocks`, 6 guardias flag `_setpieceExempt` + `_ritualSlot`, la gárgola al pie.

- [ ] **Step 1: Añadir el método y llamarlo**

En `spawnBoss`, tras `if (def.ritual) { this.boss._ritual = ...; }`, añadir:

```js
    if (def.ritual) this.setupRitualSetpiece(this.boss);
```

Nuevo método en GameScene:

```js
  // nv7: coloca el ataúd sólido central, ancla al líder en la cabecera, siembra 6
  // cultistas en las ranuras laterales (exentos del cap, reemplazables) y la gárgola al pie.
  setupRitualSetpiece(boss) {
    const cx = GAME_WIDTH / 2;
    // Líder en la cabecera (norte).
    boss.x = cx; boss.y = 200;
    // Ataúd vertical sólido (bloque rectangular provisional; sprite bespoke luego).
    const coffin = new StaticBlock(this, cx, 410, 96, 300, COLORS.stoneGrey);
    this.blocks.push(coffin);
    if (this.caster) this.physics.add.collider(this.caster, coffin);
    // 6 ranuras: 3 izquierda (x=150) + 3 derecha (x=330), y = 300/410/520.
    boss._ritualSlots = [];
    for (const sx of [150, 330]) for (const sy of [300, 410, 520]) {
      const slot = { x: sx, y: sy, guard: null };
      slot.guard = this.spawnRitualGuard(slot);
      boss._ritualSlots.push(slot);
    }
    // Gárgola al pie (sur), exenta del cap.
    const g = this.spawnEnemy(ENEMY_TYPES['gargola_pararrayos']);
    g.x = cx; g.y = 620; g._setpieceExempt = true;
    if (g.body) { g.body.reset(cx, 620); g.body.moves = false; }
    boss._ritualGargoyle = g;
  }

  // Un cultista de ranura: nace en un borde y corre a su ranura (no persigue a la princesa).
  spawnRitualGuard(slot) {
    const guard = this.spawnEnemy(ENEMY_TYPES['guardian_rito']);
    // Nace en un borde aleatorio (spawnEnemy ya lo pone en un borde).
    guard._setpieceExempt = true;   // no cuenta para el cap de oleadas
    guard._ritualSlot = slot;       // corre a esta ranura
    guard._atSlot = false;
    return guard;
  }
```

- [ ] **Step 2: Verificar suite verde (imports/sintaxis)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Verificación manual**

Correr el juego, nv7 de Aire. Confirmar: aparece el ataúd rectangular central sólido (la princesa no lo atraviesa), el líder en la cabecera, 6 cultistas convergiendo a las ranuras laterales, y la gárgola al pie.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): setpiece del ritual — ataúd sólido + 6 ranuras de guardia + gárgola"
```

---

### Task 4: Guardias corren a su ranura + reemplazo al morir + exención del cap

**Files:**
- Modify: `src/scenes/GameScene.js` (nuevo `updateRitualGuards`; helper `liveWaveCount`; reemplazo en `onEnemyDeath`)

- [ ] **Step 1: Helper de conteo que excluye el setpiece**

Añadir en GameScene:

```js
  // Enemigos vivos que SÍ cuentan para el cap de oleadas (excluye el setpiece del ritual).
  liveWaveCount() {
    let n = 0;
    this.enemies.getChildren().forEach((e) => { if (e.active && !e._setpieceExempt) n++; });
    return n;
  }
```

Reemplazar los checks de cap de summon/oleada `this.enemies.countActive(true) >= CONCURRENCY_CAP` por `this.liveWaveCount() >= CONCURRENCY_CAP` en los sitios de spawn de oleada/summon (GameScene ~373, ~411, ~448, ~602). (Los guardias/gárgola exentos no ocupan cupo.)

- [ ] **Step 2: Mover los guardias a su ranura cada frame**

Nuevo método, llamado desde `update()` (junto a `updateRitual`):

```js
  updateRitualGuards() {
    const boss = this.boss;
    if (!boss || !boss.active || !boss._ritualSlots) return;
    for (const slot of boss._ritualSlots) {
      const g = slot.guard;
      if (!g || !g.active) continue;
      if (g._atSlot) { if (g.body) g.body.setVelocity(0, 0); continue; }
      const d = Phaser.Math.Distance.Between(g.x, g.y, slot.x, slot.y);
      if (d < 8) { g._atSlot = true; g.x = slot.x; g.y = slot.y; if (g.body) { g.body.setVelocity(0, 0); g.body.moves = false; } }
      else if (g.body) {
        const a = Phaser.Math.Angle.Between(g.x, g.y, slot.x, slot.y);
        g.body.setVelocity(Math.cos(a) * 140, Math.sin(a) * 140);
      }
    }
  }
```

Y en `update()`:

```js
    this.updateRitualGuards();
```

- [ ] **Step 3: Reemplazar el guardia al morir (nace en borde, corre a la ranura)**

En `onEnemyDeath(enemy)`, al inicio, añadir el reemplazo mientras el rito siga en canal:

```js
    if (enemy._ritualSlot && this.boss && this.boss.active && this.boss._untargetable) {
      const slot = enemy._ritualSlot;
      slot.guard = this.spawnRitualGuard(slot); // nace en borde, corre a la ranura vacía
    }
```

- [ ] **Step 4: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Verificación manual (el detalle anti-bug)**

nv7. Matar un cultista de ranura → confirmar que el reemplazo **NO aparece en el sitio** sino que **nace en un borde y corre a la ranura vacía** para retomar el canto. El rito no se detiene. Los guardias no cuentan para el cap (las oleadas siguen llenando la pantalla aparte).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): guardias del rito corren a su ranura + reemplazo desde borde + exención del cap"
```

---

### Task 5: Oleadas humanas abundantes durante el canal

El líder invoca casters humanoides variados + healer durante la fase 0 (canal), aparte de los 6 guardias del ataúd.

**Files:**
- Modify: `src/data/bosses/air.js` (`LIDER_CULTISTA` fase 0)
- Test: `tests/AirBosses.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
import { LIDER_CULTISTA } from '../src/data/bosses/air.js';
test('Líder Cultista: el canal invoca casters humanoides variados + healer, cap alto', () => {
  const p0 = LIDER_CULTISTA.phases[0].sequence.filter((s) => s.do === 'summon').map((s) => s.spawnType);
  for (const k of ['acolito_trueno','heraldo_rayo','hechicero_viento','tronador','sacerdote_sangre']) {
    assert.ok(p0.includes(k), `invoca ${k}`);
  }
});
```

- [ ] **Step 2: Correr para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Reescribir la fase 0 del `LIDER_CULTISTA`**

Reemplazar la `sequence` de la fase 0 (`from: 1.0`) — invoca casters variados + healer con cap alto (el motor los acota a 16 - guardias exentos):

```js
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'acolito_trueno', count: 2, cap: 4, capKey: 'rite_acolyte', respawnMs: 5000, dur: 700 },
      { do: 'summon', spawnType: 'heraldo_rayo', count: 2, cap: 4, capKey: 'rite_herald', respawnMs: 6000, dur: 700 },
      { do: 'summon', spawnType: 'hechicero_viento', count: 1, cap: 2, capKey: 'rite_windmage', respawnMs: 9000, dur: 700 },
      { do: 'summon', spawnType: 'tronador', count: 2, cap: 3, capKey: 'rite_thunder', respawnMs: 6000, dur: 700 },
      { do: 'summon', spawnType: 'sacerdote_sangre', count: 1, cap: 2, capKey: 'rite_priest', respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 700 },
    ] },
```

(La fase 1 — pelea al completarse el timer — se mantiene igual.)

- [ ] **Step 4: Correr para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Verificación manual del rito completo**

nv7, jugar el rito entero: la barra avanza sola (~3 min), imposible de detener; oleadas humanas abundantes; al completarse, el líder se vuelve targetable y matarlo limpia el nivel.

- [ ] **Step 7: Commit**

```bash
git add src/data/bosses/air.js tests/AirBosses.test.js
git commit -m "feat(air): el canal del rito invoca casters humanoides variados + healer (cap alto)"
```

---

## Self-Review

**Spec coverage:** §7 nv7 — ataúd sólido central (Tasks 2,3), líder en cabecera intocable (Task 3, ya `untargetable`), 6 guardias flanqueando + reemplazo desde borde a la ranura (Tasks 3,4), gárgola al pie (Task 3), setpiece exento del cap (Task 4), rito 3 min (Task 1), oleadas humanas abundantes (Task 5), líder killable al completar (ya en `updateRitual` existente). ✓

**Placeholder scan:** el sprite del ataúd es un bloque tintado provisional declarado explícitamente (spec §10: bespoke luego). Sin TBD. ✓

**Type consistency:** `_setpieceExempt` (Tasks 3,4), `_ritualSlot`/`_atSlot` (Tasks 3,4), `boss._ritualSlots` (Task 3 produce → Task 4 consume), `liveWaveCount()` reemplaza `countActive` consistentemente. ✓

**Nota:** la posición del líder (`boss.y = 200`) sobreescribe el `anchorY`/`startY` por defecto; el `movement: static` del def lo mantiene ahí. La gárgola con `body.moves = false` no deriva.
