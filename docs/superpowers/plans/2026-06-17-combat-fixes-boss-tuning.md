# Combat fixes & boss tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix eight playtest issues across enemies and Fire/Water bosses: actor↔hazard z-order, dog facing toggle, per-frame melee drain, Favilla summon flood, three-sisters clustering, tentacle readability, shark burrow telegraph, and spawn-on-player.

**Architecture:** Decision math lands in pure `src/systems/` modules (unit-tested under `node --test`); rendering and setpiece wiring lands in `src/scenes/GameScene.js` and `src/objects/`. Scenes read resolved values and call pure helpers — no game logic is duplicated in the scene.

**Tech Stack:** Phaser 3 (CDN, native ES modules, no bundler), `node:test` + `node:assert/strict` for the pure-logic suite.

## Global Constraints

- No build step, no bundler, no npm runtime deps — native ES modules + Phaser 3 from CDN. (verbatim from spec / CLAUDE.md)
- Mobile-only, portrait; logical resolution fixed at 480×854 (`GAME_WIDTH`/`GAME_HEIGHT`).
- All persistence is `localStorage`; no server.
- Texture/color keys come from `config.js` (`TEX`, `COLORS`, `spriteKey`) — never inline a key string or hex color.
- Pure logic in `src/systems/` must have NO Phaser import so it runs under `node --test`. Tests exist only for these modules.
- All UI text/comments follow the existing Spanish convention in the file being edited.
- The existing test suite (246 tests) must stay green after every task.
- Tuning values below are starting points (tune by feel in playtest) EXCEPT the 160px spawn safe-distance, which is a hard requirement.

---

## File structure

**Pure logic (unit-tested):**
- `src/systems/CombatSystem.js` — add `tryMeleeContact()` (melee i-frame gate). *(Task 3)*
- `src/objects/FacingController.js` — `facePlayerFlip()` gains hysteresis. *(Task 2)* (pure export; the class around it stays Phaser-coupled and is exercised manually.)
- `src/systems/EnemyBrain.js` — add `pushOutsideRing()` *(Task 6)*, `holdAt` movement + `sisterFormation()` *(Task 7)*, rework `burrow` movement *(Task 9)*.
- `src/data/tuning.js` — new constants: `MELEE_CONTACT_CD`, `SPAWN_SAFE_DIST`. *(Tasks 3, 6, 9)*

**Data (content tuning, verified by playtest + existing structural tests):**
- `src/data/enemies/water.js` — `renacuajo` speed/damage nerf. *(Task 4)*
- `src/data/bosses/fire.js` — Favilla summon caps *(Task 5)*; sister roles/anchors + trio fire-rate damper *(Task 8)*.

**Phaser-coupled (manual playtest):**
- `src/config.js` — `ACTOR_DEPTH` constant. *(Task 1)*
- `src/objects/Caster.js`, `src/objects/Enemy.js` — set actor depth. *(Task 1)*
- `src/scenes/GameScene.js` — wire contact cooldown *(Task 4)*, spawn safe-distance *(Task 6)*, sister formation *(Task 8)*, burrow fin visual *(Task 10)*, tentacle ground circle *(Task 11)*.

**Tests:**
- `tests/FacingController.test.js` (modify), `tests/CombatSystem.test.js` (add), `tests/EnemyBrain.test.js` (add).

---

## Task 1: Actor / hazard z-order (W1)

**Files:**
- Modify: `src/config.js` (add `ACTOR_DEPTH`)
- Modify: `src/objects/Caster.js:5-21` (constructor)
- Modify: `src/objects/Enemy.js:7-36` (constructor) — `Boss extends Enemy`, so bosses inherit the depth.

**Interfaces:**
- Produces: `ACTOR_DEPTH` constant (number) exported from `config.js`.

Ground hazards draw at depth 5 (`lavaGfx`, flat zone disks, water tentacles), triangle edges at 6, whirlpool at 7. Actors currently default to depth 0, so hazards paint over them. Lift all actors to depth 10.

- [ ] **Step 1: Add the depth constant**

In `src/config.js`, after the `ENEMY_MARGIN` export (line 7), add:

```js
// Render order: ground hazards (lava/poison zones, tentacle puddles, triangle/river
// edges) live at depth 5-7; actors render above them (they stand ON the lava, not
// under it). Telegraphs (1400) and bars/UI (1500+) stay above actors.
export const ACTOR_DEPTH = 10;
```

- [ ] **Step 2: Lift the Caster**

In `src/objects/Caster.js`, change the import on line 1 and set depth in the constructor.

Line 1 becomes:
```js
import { TEX, spriteKey, ACTOR_DEPTH } from '../config.js';
```

After line 11 (`this.setCollideWorldBounds(true);`) add:
```js
    this.setDepth(ACTOR_DEPTH);
```

- [ ] **Step 3: Lift enemies & bosses**

In `src/objects/Enemy.js`, add `ACTOR_DEPTH` to the import on line 3:
```js
import { spriteKey, ACTOR_DEPTH } from '../config.js';
```

After line 16 (`scene.physics.add.existing(this);`) add:
```js
    this.setDepth(ACTOR_DEPTH);
```

- [ ] **Step 4: Run the full suite (no regressions)**

Run: `node --test`
Expected: all tests pass (no pure logic changed; this confirms imports resolve).

- [ ] **Step 5: Manual verify**

Run `python3 -m http.server 8000`, open in a portrait mobile viewport, reach a Fire level with lava (e.g. a temple or trio level). Stand the princess in a lava puddle / on a triangle edge: she now renders **above** the lava. Enemies/bosses also render above hazards but below telegraph rings and health bars.

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/objects/Caster.js src/objects/Enemy.js
git commit -m "fix(zorder): actores sobre los charcos/zonas de suelo (depth 10)"
```

---

## Task 2: `facePlayerFlip` hysteresis (W2)

**Files:**
- Modify: `src/objects/FacingController.js:9-13` (`facePlayerFlip`), `:48-49` (caller)
- Test: `tests/FacingController.test.js` (rewrite — signature changes)

**Interfaces:**
- Produces: `facePlayerFlip(spriteX, targetX, currentFlip, deadband=12) -> boolean`.

Root cause: `playAttack()` is only ever called on the Caster (`GameScene.js:647`, `Caster.js:35`), never on enemies, so an enemy's `attacking` flag is always false and the `facePlayer` branch already runs every frame. The bug is the missing dead-band: when the princess is near the dog's x, jitter flips the sprite every frame. Add hysteresis.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `tests/FacingController.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facePlayerFlip } from '../src/objects/FacingController.js';

test('facePlayerFlip voltea a la izquierda cuando la princesa cruza el deadband', () => {
  // mirando a la derecha (false), princesa claramente a la izquierda → voltea
  assert.equal(facePlayerFlip(100, 50, false), true);
});

test('facePlayerFlip vuelve a la derecha cuando la princesa cruza el deadband', () => {
  assert.equal(facePlayerFlip(100, 160, true), false);
});

test('facePlayerFlip NO togglea dentro del deadband (mantiene el estado actual)', () => {
  // princesa a ±10px (dentro del deadband de 12) no debe cambiar el flip
  assert.equal(facePlayerFlip(100, 90, false), false);
  assert.equal(facePlayerFlip(100, 110, false), false);
  assert.equal(facePlayerFlip(100, 90, true), true);
  assert.equal(facePlayerFlip(100, 110, true), true);
});

test('facePlayerFlip respeta un deadband personalizado', () => {
  assert.equal(facePlayerFlip(100, 70, false, 40), false); // 70 > 100-40=60 → mantiene
  assert.equal(facePlayerFlip(100, 55, false, 40), true);  // 55 < 60 → voltea
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/FacingController.test.js`
Expected: FAIL — the current `facePlayerFlip` ignores `currentFlip`, so the "NO togglea dentro del deadband" assertions fail (e.g. `facePlayerFlip(100, 110, true)` currently returns `false`).

- [ ] **Step 3: Implement hysteresis**

In `src/objects/FacingController.js`, replace lines 9-13:

```js
// PURE. flipX para un enemigo que siempre mira a la princesa: voltea cuando ella
// está a la izquierda del sprite. Sin histéresis (banda muerta opcional a futuro).
export function facePlayerFlip(spriteX, targetX) {
  return targetX < spriteX;
}
```

with:

```js
// PURE. flipX para un enemigo que siempre mira a la princesa, CON histéresis:
// solo voltea cuando ella cruza el centro del sprite por más de `deadband` px.
// Dentro de la banda muerta conserva el flip actual (evita el toggle por jitter
// cuando la princesa está casi alineada en x con el enemigo).
export function facePlayerFlip(spriteX, targetX, currentFlip = false, deadband = 12) {
  if (currentFlip && targetX > spriteX + deadband) return false;  // claramente a la derecha
  if (!currentFlip && targetX < spriteX - deadband) return true;  // claramente a la izquierda
  return currentFlip;                                             // dentro de la banda: no cambies
}
```

- [ ] **Step 4: Update the caller to pass current flip**

In the same file, line 49 currently reads:
```js
      const flipX = facePlayerFlip(this.sprite.x, aim.x);
```
Change it to:
```js
      const flipX = facePlayerFlip(this.sprite.x, aim.x, this.sprite.flipX);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/FacingController.test.js`
Expected: PASS (4 tests).

- [ ] **Step 6: Run the full suite**

Run: `node --test`
Expected: all pass.

- [ ] **Step 7: Manual verify**

In-game, lure a `can_lava` dog so the princess is directly above/below it and strafe slightly left/right across its center — the sprite no longer rapidly toggles / faces away.

- [ ] **Step 8: Commit**

```bash
git add src/objects/FacingController.js tests/FacingController.test.js
git commit -m "fix(facing): histéresis en facePlayerFlip para que el perro no togglee la espalda"
```

---

## Task 3: Melee contact cooldown helper (W3a)

**Files:**
- Modify: `src/data/tuning.js` (add `MELEE_CONTACT_CD`)
- Modify: `src/systems/CombatSystem.js` (add `tryMeleeContact`)
- Test: `tests/CombatSystem.test.js` (add a block)

**Interfaces:**
- Produces: `MELEE_CONTACT_CD` (number, ms) and `tryMeleeContact(state, now, cooldownMs) -> boolean`. Mutates `state.contactReadyAt`. Returns `true` (and arms the cooldown) when contact is allowed, `false` while on cooldown.

- [ ] **Step 1: Add the tuning constant**

In `src/data/tuning.js`, after line 22 (`export const CONCURRENCY_CAP = 16;`) add:

```js
// Contacto melee: un enemigo solo puede asestar UN golpe de contacto cada
// MELEE_CONTACT_CD ms (i-frames por enemigo). Antes el overlap drenaba vida cada
// frame (~134 HP/s con un renacuajo); ahora el contacto es un golpe discreto.
export const MELEE_CONTACT_CD = 600;
```

- [ ] **Step 2: Write the failing test**

In `tests/CombatSystem.test.js`, add at the end of the file:

```js
import { tryMeleeContact } from '../src/systems/CombatSystem.js';

test('tryMeleeContact permite el primer golpe y arma el cooldown', () => {
  const e = {};
  assert.equal(tryMeleeContact(e, 1000, 600), true);
  assert.equal(e.contactReadyAt, 1600);
});

test('tryMeleeContact bloquea golpes dentro del cooldown', () => {
  const e = {};
  tryMeleeContact(e, 1000, 600);
  assert.equal(tryMeleeContact(e, 1300, 600), false); // 1300 < 1600
  assert.equal(tryMeleeContact(e, 1599, 600), false);
});

test('tryMeleeContact vuelve a permitir tras el cooldown', () => {
  const e = {};
  tryMeleeContact(e, 1000, 600);
  assert.equal(tryMeleeContact(e, 1600, 600), true); // exactamente al expirar
  assert.equal(e.contactReadyAt, 2200);
});
```

If `tests/CombatSystem.test.js` does not already `import { test } from 'node:test'` / `import assert from 'node:assert/strict'` at the top, they are already present (it is an existing test file). Only the `tryMeleeContact` import line above is new — place it next to the other imports if you prefer, but a second import from the same module is valid ESM.

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/CombatSystem.test.js`
Expected: FAIL — `tryMeleeContact` is not exported.

- [ ] **Step 4: Implement the helper**

In `src/systems/CombatSystem.js`, after the `applyDamage` function (line 8) add:

```js
// Melee contact i-frames. `state` es el enemigo (o cualquier objeto con
// contactReadyAt). Devuelve true y arma el cooldown si el contacto está permitido;
// false mientras sigue en cooldown. PURE (solo muta state.contactReadyAt).
export function tryMeleeContact(state, now, cooldownMs) {
  if ((state.contactReadyAt ?? 0) > now) return false;
  state.contactReadyAt = now + cooldownMs;
  return true;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/CombatSystem.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/tuning.js src/systems/CombatSystem.js tests/CombatSystem.test.js
git commit -m "feat(combat): tryMeleeContact (i-frames de contacto melee por enemigo)"
```

---

## Task 4: Wire contact cooldown + tadpole nerf (W3b)

**Files:**
- Modify: `src/scenes/GameScene.js:115-122` (caster↔enemies overlap)
- Modify: `src/scenes/GameScene.js:21` and `:14` (imports)
- Modify: `src/data/enemies/water.js:62-66` (`renacuajo`)

**Interfaces:**
- Consumes: `tryMeleeContact` (Task 3), `MELEE_CONTACT_CD` (Task 3).

The overlap callback fires every frame the bodies overlap. Gate the damage behind `tryMeleeContact` so each enemy lands one discrete hit per `MELEE_CONTACT_CD`. The discrete hit deals `enemy.def.damage` (the def's `damage` field becomes "damage per contact hit"). On-hit modifiers apply only on a landed hit.

- [ ] **Step 1: Add imports**

In `src/scenes/GameScene.js`, line 14 currently imports from CombatSystem:
```js
import { applyDamage, applyCasterSlow, tickCasterSlow, applyResist } from '../systems/CombatSystem.js';
```
Add `tryMeleeContact`:
```js
import { applyDamage, applyCasterSlow, tickCasterSlow, applyResist, tryMeleeContact } from '../systems/CombatSystem.js';
```

Find the `tuning.js` import (the multi-line import starting at line 5). Add `MELEE_CONTACT_CD` to it. The import block is:
```js
import {
  ... existing names ...
} from '../data/tuning.js';
```
Add `MELEE_CONTACT_CD` to that name list. (Confirm the exact existing names by reading lines 5-9 before editing; append `MELEE_CONTACT_CD,` to the list.)

- [ ] **Step 2: Gate the overlap**

In `src/scenes/GameScene.js`, replace the caster↔enemies overlap (lines 115-122):

```js
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
      const slow = findModifier(enemy.def, 'onHitSlow');
      if (slow) this.applyCasterSlowFx(slow.factor ?? 0.6, slow.ms ?? 1200);
    });
```

with:

```js
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      // Golpe de contacto discreto con i-frames por enemigo (antes drenaba cada frame).
      if (!tryMeleeContact(enemy, this.time.now, MELEE_CONTACT_CD)) return;
      this.damageCaster(enemy.def.damage);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
      const slow = findModifier(enemy.def, 'onHitSlow');
      if (slow) this.applyCasterSlowFx(slow.factor ?? 0.6, slow.ms ?? 1200);
    });
```

- [ ] **Step 3: Nerf the tadpole**

In `src/data/enemies/water.js`, the `renacuajo` def (lines 62-66) currently reads:
```js
  renacuajo: { key: 'renacuajo', tex: TEX.villager, color: COLORS.tadpole,
    hp: 20, speed: 105, damage: 7, radius: 16,
    movement: { type: 'zigzag' },
    attacks: [{ type: 'melee' }],
    _growType: 'sapo_adulto' },
```
Change `speed: 105, damage: 7` to `speed: 70, damage: 5`:
```js
  renacuajo: { key: 'renacuajo', tex: TEX.villager, color: COLORS.tadpole,
    hp: 20, speed: 70, damage: 5, radius: 16,
    movement: { type: 'zigzag' },
    attacks: [{ type: 'melee' }],
    _growType: 'sapo_adulto' },
```

- [ ] **Step 4: Run the full suite**

Run: `node --test`
Expected: all pass. (`tests/waterRoster.test.js` may assert roster structure — confirm it does not hard-code the old `speed: 105` / `damage: 7`; if it does, update that assertion to the new values.)

- [ ] **Step 5: Manual verify**

In-game: brush a single tadpole — it deals a discrete 5 and cannot re-hit for 600ms, no longer emptying the bar. Confirm other melee enemies (e.g. `ahogado`, `caballero_brasa`) hit in discrete ticks rather than continuous drain.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js src/data/enemies/water.js
git commit -m "fix(combat): contacto melee discreto (i-frames) + nerf de velocidad/daño del renacuajo"
```

---

## Task 5: Favilla summon cap (W4)

**Files:**
- Modify: `src/data/bosses/fire.js:47-57` (FAVILLA phases)

**Interfaces:**
- Consumes: existing `summon` `cap`/`capKey`/`respawnMs` fields handled by `summonSlots` + `executeAttack` (`GameScene.js:549-573`).

Favilla's summons omit `cap`, so they are bounded only by the global 16-enemy cap → flood. Add caps (matching the Ignatius cap-3 convention) and lengthen the phase-2 summon cadence so she stays targetable. Keep `healAllies`.

- [ ] **Step 1: Add caps + slow phase-2 summons**

In `src/data/bosses/fire.js`, replace the FAVILLA `phases` array (lines 47-57):

```js
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 1000 },
      { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnType: 'avispa_brasa', count: 3, dur: 900 },
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 900 },
      { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
    ] },
  ],
```

with (adds `cap`/`capKey`/`respawnMs` and lengthens the phase-2 summon holds so adds replenish slowly, plus a `wait` to break the back-to-back summon burst):

```js
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'imp_brasa', count: 2, cap: 3, capKey: 'favilla_adds', respawnMs: 6000, dur: 1600 },
      { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnTypes: ['avispa_brasa', 'imp_brasa'], count: 2, cap: 3, capKey: 'favilla_adds', respawnMs: 6000, dur: 1600 },
      { do: 'wait', dur: 1200 },
      { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
    ] },
  ],
```

Notes: both summon steps share `capKey: 'favilla_adds'`, so phase-1 and phase-2 draw from the SAME cap-3 pool (a tracker is keyed by `capKey`). Phase 2 uses `spawnTypes` (the array form `executeAttack` already supports) to mix wasps + imps within the cap instead of two separate uncapped summons.

- [ ] **Step 2: Run the full suite**

Run: `node --test`
Expected: all pass. (`tests/bosses.water.test.js` covers water bosses; if any Fire-boss structural test asserts Favilla's summon shape, update it.)

- [ ] **Step 3: Manual verify**

Fight Favilla (Fire nv6 solo and the nv7 trio): she now keeps at most ~3 adds alive and stays clickable as the auto-aim target. Killing adds lets her resummon after ~6s.

- [ ] **Step 4: Commit**

```bash
git add src/data/bosses/fire.js
git commit -m "fix(favilla): cap de 3 adds + cadencia de invocación más lenta (deja de inundar)"
```

---

## Task 6: Spawn safe-distance (W8)

**Files:**
- Modify: `src/data/tuning.js` (add `SPAWN_SAFE_DIST`)
- Modify: `src/systems/EnemyBrain.js` (add `pushOutsideRing`)
- Modify: `src/scenes/GameScene.js:269-286` (`spawnEnemy`), imports (line 21)
- Test: `tests/EnemyBrain.test.js` (add a block)

**Interfaces:**
- Produces: `SPAWN_SAFE_DIST` (number, px) and `pushOutsideRing(point, center, minDist) -> {x, y}` — returns `point` unchanged if it is already ≥ `minDist` from `center`, otherwise pushes it out to the `minDist` ring along the same direction (or angle 0 if `point` coincides with `center`).

Done before Task 9 because the burrow rework reuses `SPAWN_SAFE_DIST`.

- [ ] **Step 1: Add the tuning constant**

In `src/data/tuning.js`, directly under the `MELEE_CONTACT_CD` block from Task 3, add:

```js
// Distancia mínima a la princesa al que puede aparecer/emerger un enemigo invocado
// (p. ej. tiburones). 160px es el valor más cercano válido; más lejos siempre vale.
export const SPAWN_SAFE_DIST = 160;
```

- [ ] **Step 2: Write the failing test**

In `tests/EnemyBrain.test.js`, add at the end of the file:

```js
import { pushOutsideRing } from '../src/systems/EnemyBrain.js';

test('pushOutsideRing deja el punto igual si ya está fuera del radio', () => {
  const p = pushOutsideRing({ x: 400, y: 0 }, { x: 0, y: 0 }, 160);
  assert.equal(p.x, 400);
  assert.equal(p.y, 0);
});

test('pushOutsideRing empuja al borde conservando la dirección', () => {
  const p = pushOutsideRing({ x: 30, y: 40 }, { x: 0, y: 0 }, 160); // dist 50 → 160
  assert.ok(Math.abs(Math.hypot(p.x, p.y) - 160) < 1e-6);
  assert.ok(Math.abs(p.x / p.y - 30 / 40) < 1e-6); // misma dirección (3:4)
});

test('pushOutsideRing usa ángulo 0 cuando el punto coincide con el centro', () => {
  const p = pushOutsideRing({ x: 100, y: 100 }, { x: 100, y: 100 }, 160);
  assert.equal(p.x, 260);
  assert.equal(p.y, 100);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `pushOutsideRing` is not exported.

- [ ] **Step 4: Implement the helper**

In `src/systems/EnemyBrain.js`, after the `summonSlots` function (end of file, line ~300) add:

```js
// PURE. Empuja `point` fuera de un anillo seguro de radio `minDist` alrededor de
// `center`. Si ya está fuera, lo devuelve igual. Si coincide con el centro, empuja
// en ángulo 0 (+x). Usado por spawnEnemy y el burrow para no aparecer sobre la princesa.
export function pushOutsideRing(point, center, minDist) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const d = Math.hypot(dx, dy);
  if (d >= minDist) return { x: point.x, y: point.y };
  if (d === 0) return { x: center.x + minDist, y: center.y };
  const k = minDist / d;
  return { x: center.x + dx * k, y: center.y + dy * k };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 6: Wire it into spawnEnemy**

In `src/scenes/GameScene.js`, add `pushOutsideRing` and `SPAWN_SAFE_DIST` to the existing imports. Line 21 is:
```js
import { buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, LIFECYCLE, summonSlots } from '../systems/EnemyBrain.js';
```
becomes:
```js
import { buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, LIFECYCLE, summonSlots, pushOutsideRing } from '../systems/EnemyBrain.js';
```
Add `SPAWN_SAFE_DIST` to the `tuning.js` import name list (same block edited in Task 4).

Then in `spawnEnemy` (lines 269-286), after the edge-position block computes `x`/`y` and before `const e = new Enemy(...)` (line 276), insert:

```js
    // No aparecer sobre la princesa: empuja el spawn fuera del anillo seguro.
    if (this.caster) {
      const safe = pushOutsideRing({ x, y }, this.caster, SPAWN_SAFE_DIST);
      x = safe.x; y = safe.y;
    }
```

(`x`/`y` are declared with `let` on line 271, so reassignment is valid.)

- [ ] **Step 7: Run the full suite + manual verify**

Run: `node --test`
Expected: all pass.

Manual: stand the princess against a screen edge during a wave / shark summon — enemies no longer spawn directly on her; the nearest possible spawn is ~160px away.

- [ ] **Step 8: Commit**

```bash
git add src/data/tuning.js src/systems/EnemyBrain.js src/scenes/GameScene.js tests/EnemyBrain.test.js
git commit -m "feat(spawn): distancia mínima de 160px a la princesa (pushOutsideRing)"
```

---

## Task 7: `holdAt` movement + `sisterFormation` helper (W5a)

**Files:**
- Modify: `src/systems/EnemyBrain.js` — add `holdAt` to `MOVEMENTS`, add `sisterFormation`
- Test: `tests/EnemyBrain.test.js` (add a block)

**Interfaces:**
- Produces:
  - `MOVEMENTS.holdAt` — moves toward `params.point {x,y}`, returns `{x:0,y:0}` within 8px (hold).
  - `sisterFormation(live, anchors) -> movementDef[]`, where `live` is an array of `{ isChaser: boolean, baseMovement: object }` in stable order and `anchors` is an array of `{x,y}`. Returns one movement def per `live` entry: **≥3 alive** → chaser gets `{type:'chase'}`, each flanker consumes the next anchor as `{type:'holdAt', point}`; **2 alive** → both `{type:'kite', range}` with distinct ranges (kept apart); **≤1 alive** → each sister's own `baseMovement`.

- [ ] **Step 1: Write the failing tests**

In `tests/EnemyBrain.test.js`, add at the end of the file:

```js
import { sisterFormation } from '../src/systems/EnemyBrain.js';

test('holdAt avanza hacia el punto y se detiene al llegar', () => {
  const far = computeMovement(
    { movement: { type: 'holdAt', point: { x: 100, y: 0 } } }, {},
    { self: { x: 0, y: 0 }, target: { x: 999, y: 999 }, speed: 60, dt: 16 });
  assert.ok(far.x > 0 && Math.abs(far.y) < 1e-6);            // va hacia el punto, ignora al target
  const near = computeMovement(
    { movement: { type: 'holdAt', point: { x: 3, y: 0 } } }, {},
    { self: { x: 0, y: 0 }, target: { x: 999, y: 0 }, speed: 60, dt: 16 });
  assert.equal(near.x, 0); assert.equal(near.y, 0);          // dentro de 8px: se queda quieto
});

test('sisterFormation con 3 vivas: cazadora persigue, flancos a los anchors', () => {
  const anchors = [{ x: 90, y: 240 }, { x: 390, y: 240 }];
  const live = [
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
    { isChaser: true,  baseMovement: { type: 'chase' } },
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
  ];
  const out = sisterFormation(live, anchors);
  assert.deepEqual(out[0], { type: 'holdAt', point: { x: 90, y: 240 } });
  assert.deepEqual(out[1], { type: 'chase' });
  assert.deepEqual(out[2], { type: 'holdAt', point: { x: 390, y: 240 } });
});

test('sisterFormation con 2 vivas: ambas kite con rangos distintos (separadas)', () => {
  const live = [
    { isChaser: true, baseMovement: { type: 'chase' } },
    { isChaser: false, baseMovement: { type: 'kite', range: 240 } },
  ];
  const out = sisterFormation(live, []);
  assert.equal(out[0].type, 'kite');
  assert.equal(out[1].type, 'kite');
  assert.notEqual(out[0].range, out[1].range); // rangos distintos → no se enciman
});

test('sisterFormation con 1 viva: usa su propio kit (baseMovement)', () => {
  const live = [{ isChaser: false, baseMovement: { type: 'kite', range: 240 } }];
  const out = sisterFormation(live, []);
  assert.deepEqual(out[0], { type: 'kite', range: 240 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `holdAt` is not in `MOVEMENTS` (falls back to `chase`) and `sisterFormation` is not exported.

- [ ] **Step 3: Implement `holdAt`**

In `src/systems/EnemyBrain.js`, inside the `MOVEMENTS` object, after the `erratic` entry (line 150, before the closing `};` on line 151) add:

```js

  holdAt({ self, speed, params }) {
    const p = params?.point;
    if (!p) return { x: 0, y: 0 };
    const d = distance(self.x, self.y, p.x, p.y);
    if (d < 8) return { x: 0, y: 0 }; // llegó al anchor: se queda quieto
    const a = angleBetween(self.x, self.y, p.x, p.y);
    return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
  },
```

- [ ] **Step 4: Implement `sisterFormation`**

In `src/systems/EnemyBrain.js`, after `pushOutsideRing` (added in Task 6, end of file) add:

```js
// PURE. Movimiento de cada hermana viva según cuántas quedan (setpiece nv7 fuego).
// 3+: Vesta (cazadora) persigue; las flanqueadoras sostienen anchors → triángulo amplio.
// 2:  ambas kitean con rangos distintos para mantenerse separadas → la línea de río se ve.
// 1:  cada una usa su propio kit (baseMovement); el río degrada solo.
export function sisterFormation(live, anchors) {
  const n = live.length;
  if (n >= 3) {
    let ai = 0;
    return live.map((s) => (s.isChaser
      ? { type: 'chase' }
      : { type: 'holdAt', point: anchors[ai++] }));
  }
  if (n === 2) {
    const ranges = [200, 290];
    return live.map((_, i) => ({ type: 'kite', range: ranges[i] }));
  }
  return live.map((s) => s.baseMovement);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(sisters): movimiento holdAt + sisterFormation (formación por conteo vivo)"
```

---

## Task 8: Wire sister formation + trio fire-rate (W5b)

**Files:**
- Modify: `src/data/bosses/fire.js:69-87` (trio construction + fire-rate damper)
- Modify: `src/scenes/GameScene.js` — store base movement at spawn; add `updateSisterFormation()`; call it from `updateTriangle`; import `sisterFormation`

**Interfaces:**
- Consumes: `sisterFormation` (Task 7). Identifies the chaser by `def.key === 'vesta'`.

The trio sequences are derived by `stripFloorAndAdds(...)`. Add a `calmTrio` damper that lengthens each step's post-fire hold and trims the densest patterns — trio-only, so the solo miniboss fights (nv4-6) keep their cadence. Drive movement by live count via `sisterFormation`.

- [ ] **Step 1: Add the trio fire-rate damper**

In `src/data/bosses/fire.js`, the `stripFloorAndAdds` helper is on line 69:
```js
const stripFloorAndAdds = (seq) => seq.filter((s) => s.do !== 'lobAoe' && s.do !== 'summon');
```
Directly after it add:
```js
// Amortiguador de cadencia SOLO para el trío (nv7): alarga el hold tras disparar y
// recorta los patrones más densos, para que el volumen combinado sea esquivable.
// Las peleas solo (nv4-6) conservan su cadencia original.
const calmTrio = (seq) => seq.map((s) => {
  const step = { ...s, dur: (s.dur ?? 500) + 600 };
  if (step.do === 'nova' && (step.count ?? 0) > 8) step.count = 8;
  if (step.do === 'shootSpread' && (step.count ?? 0) > 4) step.count = 4;
  return step;
});
```

- [ ] **Step 2: Apply the damper + tag roles in the trio**

In the same file, replace the `SISTERS_TRIO` array (lines 77-87):

```js
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

with (wraps each stripped sequence in `calmTrio`):

```js
export const SISTERS_TRIO = [
  trio(PYRA, 360, { type: 'kite', range: 240 },
    calmTrio(stripFloorAndAdds(PYRA.phases[0].sequence)),
    [SOLO_LAVA, { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 }]),
  trio(VESTA, 480, { type: 'chase' },
    calmTrio(stripFloorAndAdds(VESTA.phases[0].sequence)),
    [SOLO_LAVA, { do: 'shootStraight', speed: 260, damage: 12, telegraph: 250, dur: 600 }]),
  trio(FAVILLA, 300, { type: 'kite', range: 240 },
    calmTrio(stripFloorAndAdds(FAVILLA.phases[1].sequence)),
    [SOLO_LAVA, { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 }]),
];
```

(The chaser is identified at runtime by `key === 'vesta'`; the trio movement on Vesta is already `chase`, so no role field is needed in the data.)

- [ ] **Step 3: Import the helper + store base movement at spawn**

In `src/scenes/GameScene.js`, add `sisterFormation` to the EnemyBrain import (line 21, already edited in Task 6):
```js
import { buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, LIFECYCLE, summonSlots, pushOutsideRing, sisterFormation } from '../systems/EnemyBrain.js';
```

In `spawnBosses` (lines 219-228), store each sister's base movement so the solo path can restore it. Replace:
```js
  spawnBosses(defs) {
    this.boss = null; // multi-boss encounters don't use the single BossMechanics path
    this.bosses = defs.map((def, i) => {
      const x = GAME_WIDTH * (i + 1) / (defs.length + 1);
      const b = new Boss(this, x, -40, scaleEnemyDef(def, this.diff));
      this.enemies.add(b);
      return b;
    });
    return this.bosses;
  }
```
with:
```js
  spawnBosses(defs) {
    this.boss = null; // multi-boss encounters don't use the single BossMechanics path
    this.bosses = defs.map((def, i) => {
      const x = GAME_WIDTH * (i + 1) / (defs.length + 1);
      const b = new Boss(this, x, -40, scaleEnemyDef(def, this.diff));
      b._baseMovement = b.def.movement; // para restaurar su kit cuando quede sola
      this.enemies.add(b);
      return b;
    });
    return this.bosses;
  }
```

- [ ] **Step 4: Add `updateSisterFormation` and call it**

In `src/scenes/GameScene.js`, in `updateTriangle` (lines 877-906), add the formation call right after the early-return guard. The method starts:
```js
  updateTriangle(delta) {
    if (!this.triangle) return;
    const live = this.bosses.filter((b) => b && b.active);
```
Insert immediately after that `const live = ...` line:
```js
    this.updateSisterFormation(live);
```

Then add the new method directly above `updateTriangle` (before line 877):
```js
  // Setpiece de las tres hermanas: asigna el movimiento de cada hermana viva según
  // cuántas quedan (3 → Vesta persigue + flancos en anchors; 2 → kite separadas;
  // 1 → su propio kit). La geometría está en sisterFormation (pura/testeable).
  updateSisterFormation(live) {
    if (!live.length) return;
    const anchors = [
      { x: GAME_WIDTH * 0.18, y: GAME_HEIGHT * 0.28 },
      { x: GAME_WIDTH * 0.82, y: GAME_HEIGHT * 0.28 },
    ];
    const moves = sisterFormation(
      live.map((b) => ({ isChaser: b.def.key === 'vesta', baseMovement: b._baseMovement })),
      anchors,
    );
    for (let i = 0; i < live.length; i++) live[i].def.movement = moves[i];
  }
```

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: all pass.

- [ ] **Step 6: Manual verify**

Fight the Fire nv7 trio. With 3 sisters: Vesta hunts the princess while Pyra & Favilla hold the upper-left/upper-right anchors → a large, visible lava triangle. Kill one: the two survivors kite at different ranges and the river line stays wide. Kill another: the survivor reverts to her own kit and drops lava pools. Combined fire feels dodgeable (slower cadence, Favilla nova trimmed to 8).

- [ ] **Step 7: Commit**

```bash
git add src/data/bosses/fire.js src/scenes/GameScene.js
git commit -m "feat(sisters): formación por conteo vivo (anchors/kite) + cadencia de trío amortiguada"
```

---

## Task 9: Burrow swim rework (W7a)

**Files:**
- Modify: `src/data/tuning.js` (no new constant — reuse `SPAWN_SAFE_DIST`)
- Modify: `src/systems/EnemyBrain.js:99-138` (`burrow` movement)
- Test: `tests/EnemyBrain.test.js` (add a block)

**Interfaces:**
- Consumes: `SPAWN_SAFE_DIST` (Task 6) — import it into `EnemyBrain.js`.
- Produces: reworked `MOVEMENTS.burrow` — submerged phase **swims toward the target** (returns `{x,y,submerged:true}`) and holds once within `SPAWN_SAFE_DIST` of the target; no teleport/reposition. `emerge` (warning ring, still submerged) and `surface` (`vulnerable`, chases) are unchanged.

- [ ] **Step 1: Import the safe-distance constant**

In `src/systems/EnemyBrain.js`, line 10 currently:
```js
import { GAME_WIDTH, GAME_HEIGHT, ENEMY_MARGIN } from '../config.js'; // config.js is Phaser-free (constants only)
```
Add the tuning import. The existing tuning import is on lines 6-9:
```js
import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_SURFACE_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../data/tuning.js';
```
Add `SPAWN_SAFE_DIST`:
```js
import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_SURFACE_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS, SPAWN_SAFE_DIST,
} from '../data/tuning.js';
```

- [ ] **Step 2: Write the failing tests**

In `tests/EnemyBrain.test.js`, add `BURROW_SUBMERGE_MS` to the imports at the top of the file:
```js
import { BURROW_SUBMERGE_MS } from '../src/data/tuning.js';
```
Then add these tests at the end of the file:

```js
test('burrow: sumergido nada HACIA el objetivo (ya no se queda quieto)', () => {
  const state = {};
  const v = computeMovement(
    { movement: { type: 'burrow' } }, state,
    { self: { x: 0, y: 0 }, target: { x: 500, y: 0 }, speed: 100, dt: 16 });
  assert.equal(v.submerged, true);
  assert.ok(v.x > 0);                 // avanza hacia el objetivo (antes era 0)
  assert.ok(Math.abs(v.y) < 1e-6);
});

test('burrow: sumergido se DETIENE dentro del anillo seguro', () => {
  const state = {};
  const v = computeMovement(
    { movement: { type: 'burrow' } }, state,
    { self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, speed: 100, dt: 16 }); // dist 100 < 160
  assert.equal(v.submerged, true);
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
});

test('burrow: tras submergeMs pasa a emerge (anillo de aviso, sigue invuln)', () => {
  const state = {};
  const ctxB = { self: { x: 0, y: 0 }, target: { x: 500, y: 0 }, speed: 100, dt: BURROW_SUBMERGE_MS };
  computeMovement({ movement: { type: 'burrow' } }, state, ctxB); // consume la ventana submerged
  const v = computeMovement({ movement: { type: 'burrow' } }, state, { ...ctxB, dt: 16 });
  assert.equal(v.submerged, true);
  assert.equal(v.surfacing, true);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — the current `burrow` returns `{x:0,y:0,submerged:true}` while submerged (no swim), so "nada HACIA el objetivo" fails.

- [ ] **Step 4: Rework the burrow movement**

In `src/systems/EnemyBrain.js`, replace the entire `burrow` function (lines 99-138):

```js
  burrow({ self, target, speed, dt, params, state }) {
    const submergeMs = params?.submergeMs ?? BURROW_SUBMERGE_MS;
    const emergeMs   = params?.emergeMs ?? params?.surfaceTelegraphMs ?? BURROW_TELEGRAPH_MS;
    const surfaceMs  = params?.surfaceMs ?? BURROW_SURFACE_MS;

    state.mode = state.mode || 'submerged';
    state.t    = (state.t || 0) + dt;

    if (state.mode === 'submerged') {
      // Nada hacia la princesa mostrando solo la aleta (GameScene oculta el cuerpo);
      // se detiene al alcanzar el anillo seguro para no emerger encima de ella.
      if (state.t >= submergeMs) { state.mode = 'emerge'; state.t = 0; return { x: 0, y: 0, submerged: true }; }
      const d = distance(self.x, self.y, target.x, target.y);
      if (d <= SPAWN_SAFE_DIST + 4) return { x: 0, y: 0, submerged: true };
      const a = angleBetween(self.x, self.y, target.x, target.y);
      return { x: Math.cos(a) * speed, y: Math.sin(a) * speed, submerged: true };
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

(This removes the old `reposition` teleport mode entirely.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS. Also run `node --test` — confirm no existing burrow test asserted the old reposition/teleport behavior; if one does (e.g. checks `repositionTo`), update it to the swim model.

- [ ] **Step 6: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(burrow): el tiburón nada sumergido hacia la princesa y se detiene en el anillo seguro"
```

---

## Task 10: Dorsal-fin visual + hide body/bar while submerged (W7b)

**Files:**
- Modify: `src/scenes/GameScene.js:730-737` (update loop visual block), `:748` (boss bar loop)
- Add: `drawDorsalFin(e)` method to `GameScene`

**Interfaces:**
- Consumes: `e._burrowed` / `e._surfacing` flags (already set by `Enemy.think` from the burrow movement), `COLORS.sharkYoung`, `COLORS.water`.

While submerged, hide the shark's body fully and draw a dorsal fin (a small triangle on the telegraph layer) oriented along its travel direction (or toward the princess when holding). The surfacing warning ring stays.

- [ ] **Step 1: Replace the burrow visual block**

In `src/scenes/GameScene.js`, the update loop currently has (lines 730-736):
```js
      // Burrow surface telegraph: draw warning ring while _surfacing.
      if (e._surfacing) {
        this.telegraphGfx.lineStyle(3, COLORS.water, 0.85);
        this.telegraphGfx.strokeCircle(e.x, e.y, (e.def.radius || 20) + 24);
      }
      // Hide the sprite while submerged; show it otherwise.
      if (e._burrowed !== undefined) e.setAlpha(e._burrowed ? 0.15 : 1);
```
Replace with:
```js
      // Burrow surface telegraph: draw warning ring while _surfacing.
      if (e._surfacing) {
        this.telegraphGfx.lineStyle(3, COLORS.water, 0.85);
        this.telegraphGfx.strokeCircle(e.x, e.y, (e.def.radius || 20) + 24);
      }
      // Sumergido: oculta el cuerpo y dibuja solo la aleta dorsal (se ve a dónde va).
      if (e._burrowed !== undefined) {
        if (e._burrowed) { e.setAlpha(0); this.drawDorsalFin(e); }
        else e.setAlpha(1);
      }
```

- [ ] **Step 2: Add the `drawDorsalFin` method**

In `src/scenes/GameScene.js`, add this method directly after `drawTelegraph` (which ends at line 612):

```js
  // Aleta dorsal de un tiburón sumergido: un triángulo en la capa de telegraph que
  // apunta en su dirección de avance (o hacia la princesa si está quieto en el anillo).
  drawDorsalFin(e) {
    const g = this.telegraphGfx;
    const vx = e.body ? e.body.velocity.x : 0;
    const vy = e.body ? e.body.velocity.y : 0;
    const ang = Math.hypot(vx, vy) > 6
      ? Math.atan2(vy, vx)
      : Phaser.Math.Angle.Between(e.x, e.y, this.caster.x, this.caster.y);
    const len = 18, wid = 7;
    const tipX = e.x + Math.cos(ang) * len;
    const tipY = e.y + Math.sin(ang) * len;
    const baseX = e.x - Math.cos(ang) * (len * 0.4);
    const baseY = e.y - Math.sin(ang) * (len * 0.4);
    const px = Math.cos(ang + Math.PI / 2);
    const py = Math.sin(ang + Math.PI / 2);
    g.fillStyle(COLORS.sharkYoung, 1);
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.lineTo(baseX + px * wid, baseY + py * wid);
    g.lineTo(baseX - px * wid, baseY - py * wid);
    g.closePath();
    g.fillPath();
  }
```

- [ ] **Step 3: Hide the boss health bar while submerged**

In `src/scenes/GameScene.js`, the bar loop on line 748 is:
```js
    for (const b of this.bosses) if (b && b.active) b.drawBar();
```
Change it so a submerged boss (e.g. the shark miniboss) doesn't show a floating bar over a hidden body:
```js
    for (const b of this.bosses) { if (b && b.active && !b._burrowed) b.drawBar(); else if (b && b._burrowed) b.bar.clear(); }
```

- [ ] **Step 4: Run the full suite**

Run: `node --test`
Expected: all pass (no pure logic changed).

- [ ] **Step 5: Manual verify**

Fight `tiburon_joven` (Water beast levels) and the `tiburon_abisal` miniboss: while submerged the body is hidden and a dorsal fin glides toward the princess; the warning ring appears as it stops at the safe ring; the shark then surfaces fully visible and vulnerable. No floating health bar over an invisible shark.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(burrow): aleta dorsal visible mientras el tiburón está sumergido (oculta cuerpo/barra)"
```

---

## Task 11: Tentacle ground circle readability (W6)

**Files:**
- Modify: `src/scenes/GameScene.js:761-772` (water-style branch of `spawnZone`)

**Interfaces:**
- Consumes: existing `spawnZone` water-style path; the zone cleanup at lines 953-958 already destroys `z.gfx`, so the ground circle is freed automatically.

The Kraken/Dama tentacle (`lobAoe`) only hurts inside a circle at the base; the tall sprite misleads. Add a visible ground circle matching the exact hitbox radius (`opts.radius`) under the tentacle for the zone's whole life. No mechanic change.

- [ ] **Step 1: Draw the ground circle in the water branch**

In `src/scenes/GameScene.js`, the water-style branch of `spawnZone` (lines 761-772) currently begins:
```js
    if (style === 'water') {
      const r = opts.radius ?? 60;
      // Scale the 32-px texture to radius × 2 (width) and radius × 3 (full height).
      const tsx = (r * 2) / 32;
      const tsy = (r * 3) / 32;
      tentacle = this.add.sprite(opts.x, opts.y, spriteKey('tentacle'))
```
Insert the ground circle right after `const r = opts.radius ?? 60;`:
```js
    if (style === 'water') {
      const r = opts.radius ?? 60;
      // Marca de suelo del MISMO radio que el hitbox: el tentáculo (alto) es cosmético,
      // el daño es este círculo. Persiste toda la vida de la zona (cleanup destruye z.gfx).
      gfx = this.add.circle(opts.x, opts.y, r, color, 0.16).setDepth(5);
      gfx.setStrokeStyle(2, color, 0.7);
      // Scale the 32-px texture to radius × 2 (width) and radius × 3 (full height).
      const tsx = (r * 2) / 32;
      const tsy = (r * 3) / 32;
      tentacle = this.add.sprite(opts.x, opts.y, spriteKey('tentacle'))
```

(`gfx` is already declared `let gfx = null;` on line 759 and pushed into the zone object on line 779, which `updateZones` destroys on expiry — no cleanup change needed.)

- [ ] **Step 2: Run the full suite**

Run: `node --test`
Expected: all pass.

- [ ] **Step 3: Manual verify**

Fight the Kraken and Dama Ballena. Each tentacle now has a clear filled ground ring matching its damage radius for its whole duration: standing just outside the ring takes no damage; inside it does. The danger area is unambiguous.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(tentaculo): círculo de suelo legible del tamaño del hitbox (Kraken/Dama)"
```

---

## Final verification

- [ ] Run the full suite once more: `node --test` → all green (≥246 + the new pure-logic tests).
- [ ] Playtest a Fire run through nv6 (Favilla solo) and nv7 (trio), and a Water run with sharks + tentacle bosses, confirming each W-item by feel.
- [ ] (Branch `feat/combat-fixes-boss-tuning` already exists from the spec commit; open the PR when satisfied.)

---

## Self-review

**Spec coverage:**
- W1 z-order → Task 1. ✓
- W2 dog facing (hysteresis) → Task 2. ✓
- W3 melee contact cooldown + tadpole nerf → Tasks 3 (helper) + 4 (wire + data). ✓
- W4 Favilla cap → Task 5. ✓
- W5 sisters formation + fire rate → Tasks 7 (pure) + 8 (wire + data). ✓
- W6 tentacle readability → Task 11. ✓
- W7 burrow fin + swim → Tasks 9 (movement) + 10 (visual). ✓
- W8 spawn safe distance → Task 6. ✓

**Type/name consistency:** `tryMeleeContact(state, now, cooldownMs)`, `pushOutsideRing(point, center, minDist)`, `sisterFormation(live, anchors)`, `MOVEMENTS.holdAt({params.point})`, `ACTOR_DEPTH`, `MELEE_CONTACT_CD`, `SPAWN_SAFE_DIST`, `_baseMovement`, `_burrowed`/`_surfacing`, `drawDorsalFin(e)`, `updateSisterFormation(live)` — names used identically across the tasks that define and consume them.

**Ordering/deps:** Task 3 before 4 (helper before wiring); Task 6 before 9 (`SPAWN_SAFE_DIST` reused by burrow); Task 7 before 8 (`sisterFormation` before wiring); Task 9 before 10 (movement before its visual).

**Placeholder scan:** No TBD/TODO; every code step shows complete code; tuning values are concrete starting numbers (flagged as tunable except the 160px hard requirement). One illustrative no-op line in Task 9 Step 2 is explicitly called out to be removed.
