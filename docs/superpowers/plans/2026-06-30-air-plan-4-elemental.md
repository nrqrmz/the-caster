# Air Difficulty Pass — Plan 4: Elemental de Tormenta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el Elemental de Tormenta (nv6) en la esponja-horda "virtualmente infinita": 2000hp, render gigante (256×128) reposicionado, horda no-humanoide escalando por fase, y ojo del tornado reforzado.

**Architecture:** Stats/posición del jefe y su horda son datos en `src/data/bosses/air.js` (pins en `tests/AirBosses.test.js`). El tamaño de display gigante se cablea en el caso especial de `GameScene.spawnBoss`. El ojo del tornado se afina en constantes puras (`src/data/tuning.js`, `src/systems/TornadoHazard.js`) con pins en `Tuning.test.js` / `TornadoHazard.test.js`.

**Tech Stack:** Phaser 3, `node:test`.

## Global Constraints

- Split pure/Phaser (CLAUDE.md). `CONCURRENCY_CAP = 16` es el techo de enemigos vivos (el jefe no cuenta) — red de seguridad de rendimiento; los caps de summon pueden sumar ≥16, el motor los acota. (spec §7)
- Solo summons no-humanoides. (spec §7)

**Depende de:** Plan 1 (no estrictamente; independiente salvo estética).

---

### Task 1: Stats, render gigante y posición del Elemental

**Files:**
- Modify: `src/data/bosses/air.js` (`ELEMENTAL_TORMENTA` cabecera)
- Modify: `src/scenes/GameScene.js:213` (setDisplaySize del caso especial)
- Test: `tests/AirBosses.test.js`

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/AirBosses.test.js`:

```js
import { ELEMENTAL_TORMENTA } from '../src/data/bosses/air.js';

test('Elemental de Tormenta: esponja 2000hp, shielded 0.25, radius 100, anchorY 0.375', () => {
  assert.equal(ELEMENTAL_TORMENTA.hp, 2000);
  assert.equal(ELEMENTAL_TORMENTA.radius, 100);
  assert.equal(ELEMENTAL_TORMENTA.anchorY, 0.375);
  assert.equal(ELEMENTAL_TORMENTA.modifiers.find((m) => m.type === 'shielded').reduce, 0.25);
  assert.equal(ELEMENTAL_TORMENTA.resist, undefined, 'resist reemplazado por shielded');
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Actualizar la cabecera de `ELEMENTAL_TORMENTA`**

En `src/data/bosses/air.js`, cambiar la cabecera del def (mantener las 3 fases; solo se tocan aquí hp/radius/resist→shielded/anchorY):

```js
export const ELEMENTAL_TORMENTA = {
  key: 'elemental_tormenta', tex: TEX.miniboss, color: COLORS.ash,
  hp: 2000, speed: 0, damage: 18, radius: 100,
  anchorY: 0.375, // 3ª banda vertical desde abajo, centrado (x = GAME_WIDTH/2)
  elite: true,
  movement: { type: 'static' },
  modifiers: [{ type: 'shielded', reduce: 0.25 }],
  phases: [ /* … se reescriben los summons en Task 2 … */ ],
};
```

- [ ] **Step 4: Agrandar el render en `spawnBoss`**

En `src/scenes/GameScene.js:213`, cambiar el display size del caso especial:

```js
    if (def.key === 'elemental_tormenta' && def.radius) this.boss.setDisplaySize(256, 128);
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 6: Verificación manual (posición + tamaño)**

Correr el juego, nivel de Aire nv6. Confirmar: el Elemental se dibuja enorme (256×128), centrado horizontalmente, anclado en la banda superior-media (y≈320), despejado de la barra de vida.

- [ ] **Step 7: Commit**

```bash
git add src/data/bosses/air.js src/scenes/GameScene.js tests/AirBosses.test.js
git commit -m "feat(air): Elemental de Tormenta — esponja 2000hp, render 256×128, anchorY 0.375, shielded 0.25"
```

---

### Task 2: Horda no-humanoide escalando por fase

Reescribir los `summon` de las 3 fases: P1 (murciélago+espíritu, cap ~8) → P2 (+arpía+torbellino, ~11) → P3 (5 tipos, tope 16), respawn 7→5→4s.

**Files:**
- Modify: `src/data/bosses/air.js` (`ELEMENTAL_TORMENTA.phases`)
- Test: `tests/AirBosses.test.js`

- [ ] **Step 1: Escribir el test que falla**

```js
test('Elemental: horda escalando, SOLO no-humanoides, más tipos por fase', () => {
  const HUMANOID = ['siervo_torre','duelista_nocturno','acolito_trueno','heraldo_rayo','sacerdote_sangre','guardia_nocturno','hechicero_viento','vastago_vampirico','cultista','cultista_canalizador','guardian_rito'];
  const summonsByPhase = ELEMENTAL_TORMENTA.phases.map(
    (p) => p.sequence.filter((s) => s.do === 'summon').map((s) => s.spawnType));
  summonsByPhase.flat().forEach((t) => assert.ok(!HUMANOID.includes(t), `${t} no-humanoide`));
  assert.ok(summonsByPhase[2].length >= summonsByPhase[0].length + 2, 'P3 tiene más tipos que P1');
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirBosses.test.js`
Expected: FAIL.

- [ ] **Step 3: Reescribir los `summon` de las fases**

En cada fase de `ELEMENTAL_TORMENTA`, dejar los ataques de tornado/nova existentes y reemplazar/añadir los `summon` así:

```js
  // P1 (from 1.0): dejar tornado(lift) + nova×8(stun), reemplazar el summon único por:
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 5, capKey: 'ele_bat', respawnMs: 7000, dur: 400 },
      { do: 'summon', spawnType: 'espiritu_tormenta', count: 2, cap: 3, capKey: 'ele_spirit', respawnMs: 7000, dur: 400 },
  // P2 (from 0.6, enter spawnTornado): dejar tornado + homing(stun) + nova×10, summons:
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 5, capKey: 'ele_bat', respawnMs: 5000, dur: 350 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 4, capKey: 'ele_harpy', respawnMs: 5000, dur: 350 },
      { do: 'summon', spawnType: 'torbellino_errante', count: 1, cap: 2, capKey: 'ele_whirl', respawnMs: 8000, dur: 350 },
  // P3 (from 0.3, enter spawnTornado): dejar tornado×2 + homing(stun), summons (avalancha):
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 5, capKey: 'ele_bat', respawnMs: 4000, dur: 300 },
      { do: 'summon', spawnType: 'espiritu_tormenta', count: 2, cap: 3, capKey: 'ele_spirit', respawnMs: 4000, dur: 300 },
      { do: 'summon', spawnType: 'fuego_fatuo', count: 2, cap: 3, capKey: 'ele_wisp', respawnMs: 5000, dur: 300 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 3, capKey: 'ele_harpy', respawnMs: 4000, dur: 300 },
      { do: 'summon', spawnType: 'torbellino_errante', count: 1, cap: 2, capKey: 'ele_whirl', respawnMs: 8000, dur: 300 },
```

(Cada `summon` con `capKey` distinto para que sus topes sean independientes; el motor acota el total vivo a 16.)

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/bosses/air.js tests/AirBosses.test.js
git commit -m "feat(air): Elemental — horda no-humanoide escalando por fase (cap 8→11→16, respawn 7→5→4s)"
```

---

### Task 3: Reforzar el ojo del tornado

Subir el jalón al centro y acelerar la activación (constantes puras).

**Files:**
- Modify: `src/data/tuning.js` (`TORNADO_EYE_PULL`, `TORNADO_TELEGRAPH_MS`)
- Modify: `src/systems/TornadoHazard.js` (tabla `scaleForPhase`)
- Test: `tests/Tuning.test.js`, `tests/TornadoHazard.test.js`

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/Tuning.test.js`:

```js
import { TORNADO_EYE_PULL, TORNADO_TELEGRAPH_MS } from '../src/data/tuning.js';
test('ojo del tornado reforzado: pull 0.9, telegraph 800', () => {
  assert.equal(TORNADO_EYE_PULL, 0.9);
  assert.equal(TORNADO_TELEGRAPH_MS, 800);
});
```

En `tests/TornadoHazard.test.js`:

```js
import { scaleForPhase } from '../src/systems/TornadoHazard.js';
test('scaleForPhase P3 = 1.9 (frenesí succiona más fuerte)', () => {
  assert.equal(scaleForPhase(3), 1.9);
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `node --test tests/Tuning.test.js tests/TornadoHazard.test.js`
Expected: FAIL (valores viejos 0.7 / 1100 / 1.6).

- [ ] **Step 3: Actualizar las constantes**

`src/data/tuning.js`:

```js
export const TORNADO_EYE_PULL        = 0.9;  // fracción de la velocidad del caster (base 180 px/s)
export const TORNADO_TELEGRAPH_MS    = 800;  // el vórtice entra más rápido
```

`src/systems/TornadoHazard.js`, la tabla de `scaleForPhase`:

```js
  const table = [1.0, 1.0, 1.25, 1.9];
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `node --test tests/Tuning.test.js tests/TornadoHazard.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/tuning.js src/systems/TornadoHazard.js tests/Tuning.test.js tests/TornadoHazard.test.js
git commit -m "feat(air): reforzar ojo del tornado — pull 0.9, telegraph 800, P3 scale 1.9"
```

---

## Self-Review

**Spec coverage:** §7 nv6 Elemental (hp 2000, shielded 0.25, render 256×128, radius ~100, anchorY 0.375 / x=240) → Task 1 ✓. Horda no-humanoide escalando (cap 8→11→16, 2→5 tipos, respawn 7→5→4s) → Task 2 ✓. Ojo del tornado (EYE_PULL 0.9, P3 1.9, telegraph 800) → Task 3 ✓.

**Placeholder scan:** los steps de tornado/nova existentes se conservan (indicados por comentario "dejar …"); solo se reescriben los `summon`, que van completos. Sin TBD. ✓

**Type consistency:** `capKey` únicos por summon (patrón existente del engine). `shielded` reemplaza `resist` (Task 1 test verifica `resist === undefined`). ✓
