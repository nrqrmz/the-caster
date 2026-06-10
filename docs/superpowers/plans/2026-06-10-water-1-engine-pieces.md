# Water Engine Pieces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 8 new engine pieces the Water world needs (caster slow, burrow movement, splitsOnDeath, generational spawning, WhirlpoolHazard, form sequencer, resist/CC-immunity, and tuning params) with full pure-logic unit test coverage and Phaser wiring stubs.

**Architecture:** Every decision-making piece lives in `src/systems/` or `src/data/tuning.js` (no Phaser import), exercised by `node --test`. `Caster` and `Enemy` grow the stateful fields needed by the new mechanics; `GameScene` executes the results (rendering, invuln gating, whirlpool force, form HP bar hand-off to UIScene). `BossBrain` is extended by a pure `FormSequencer` that sits on top of the existing phase engine. No content (enemy defs, boss defs, wave tables) is added in this plan — that is Plans 2 and 3.

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN), node:test for pure logic.

**Spec:** docs/superpowers/specs/2026-06-10-water-world-design.md
**Depends on:** none (this is the foundation; Plans 2 & 3 depend on it)

---

## Task 1: Tuning params for Water mechanics

**Files:**
- Modify: `src/data/tuning.js`
- Modify: `tests/Tuning.test.js`

Add all Water-specific knobs to the central tuning module first so every subsequent task can import concrete values.

- [ ] **Step 1: Write failing test** — append to `tests/Tuning.test.js`:

```js
import {
  CASTER_SLOW_FLOOR,
  WHIRLPOOL_RADIUS, WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS,
  WHIRLPOOL_ACTIVE_MS, WHIRLPOOL_COOLDOWN_MS, WHIRLPOOL_TELEGRAPH_MS,
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../src/data/tuning.js';

test('Water tuning constants are defined and in-range', () => {
  assert.equal(typeof CASTER_SLOW_FLOOR, 'number');
  assert.ok(CASTER_SLOW_FLOOR > 0 && CASTER_SLOW_FLOOR < 1);
  assert.equal(CASTER_SLOW_FLOOR, 0.45);

  assert.ok(WHIRLPOOL_RADIUS > 0);
  assert.equal(WHIRLPOOL_CENTER_PULL, 0.7);
  assert.ok(WHIRLPOOL_CENTER_DPS > 0);

  assert.ok(BURROW_SUBMERGE_MS > 0);
  assert.ok(BURROW_TELEGRAPH_MS > 0);
  assert.ok(BURROW_RECOVER_MS > 0);

  assert.equal(EGG_HATCH_MS, 3500);
  assert.equal(TADPOLE_GROW_MS, 6000);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/Tuning.test.js
```

Expected: `SyntaxError` or `Error [ERR_MODULE_NOT_FOUND]` — the named exports do not exist yet.

- [ ] **Step 3: Implement** — append to `src/data/tuning.js`:

```js
// --- Water world ---

// Caster slow (onHitSlow applied by water enemies).
export const CASTER_SLOW_FLOOR = 0.45; // never below 45% speed

// Whirlpool / Maelstrom hazard.
export const WHIRLPOOL_RADIUS = 120;          // px, influence circle
export const WHIRLPOOL_CENTER_PULL = 0.7;     // fraction of caster speed at the very center
export const WHIRLPOOL_CENTER_DPS = 16;       // damage/sec when caster is within 20% of center
export const WHIRLPOOL_TELEGRAPH_MS = 1200;   // warning before the vortex activates
export const WHIRLPOOL_ACTIVE_MS = 4500;      // vortex is live for this long
export const WHIRLPOOL_COOLDOWN_MS = 5000;    // gap before the boss can trigger it again

// Burrow movement.
export const BURROW_SUBMERGE_MS = 1500;       // invuln + hidden window
export const BURROW_TELEGRAPH_MS = 400;       // surface-warning ring duration
export const BURROW_RECOVER_MS = 600;         // vulnerable window after the dash

// Frog lifecycle (generational summon).
export const EGG_HATCH_MS = 3500;             // egg → tadpole
export const TADPOLE_GROW_MS = 6000;          // tadpole → adult frog
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/Tuning.test.js
```

Expected: all Tuning tests pass (the new test plus any pre-existing ones).

- [ ] **Step 5: Commit**

```
git add src/data/tuning.js tests/Tuning.test.js
git commit -m "feat(water): add Water tuning constants to tuning.js"
```

---

## Task 2: Caster slow (`onHitSlow`)

**Files:**
- Modify: `src/systems/CombatSystem.js`
- Modify: `src/objects/Caster.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `tests/CombatSystem.test.js`

The caster can be slowed by enemies that carry `{ type:'onHitSlow', factor:0.6, ms:1200 }`. Pure math (apply/refresh/floor/expire) lives in `CombatSystem`; `Caster.moveBy` multiplies by the active factor; `GameScene` calls `applyCasterSlow` in the two overlap handlers that can deliver the modifier.

- [ ] **Step 1: Write failing tests** — append to `tests/CombatSystem.test.js`:

```js
import { applyCasterSlow, tickCasterSlow, getCasterSpeedMul } from '../src/systems/CombatSystem.js';
import { CASTER_SLOW_FLOOR } from '../src/data/tuning.js';

test('applyCasterSlow sets factor and remaining on a fresh state', () => {
  const state = { slowRemaining: 0, slowFactor: 1 };
  applyCasterSlow(state, 0.6, 1200);
  assert.equal(state.slowFactor, 0.6);
  assert.equal(state.slowRemaining, 1200);
});

test('applyCasterSlow refreshes duration when hit again while slowed', () => {
  const state = { slowRemaining: 600, slowFactor: 0.6 };
  applyCasterSlow(state, 0.6, 1200);
  assert.equal(state.slowRemaining, 1200); // refreshed
  assert.equal(state.slowFactor, 0.6);
});

test('applyCasterSlow keeps the stronger (lower) factor when stacking', () => {
  const state = { slowRemaining: 800, slowFactor: 0.6 };
  applyCasterSlow(state, 0.8, 1200); // weaker slow
  assert.equal(state.slowFactor, 0.6); // original factor retained
});

test('applyCasterSlow never goes below CASTER_SLOW_FLOOR', () => {
  const state = { slowRemaining: 0, slowFactor: 1 };
  applyCasterSlow(state, 0.1, 1200); // extreme slow
  assert.ok(state.slowFactor >= CASTER_SLOW_FLOOR);
  assert.equal(state.slowFactor, CASTER_SLOW_FLOOR);
});

test('tickCasterSlow decrements remaining and resets to 1 when expired', () => {
  const state = { slowRemaining: 100, slowFactor: 0.6 };
  tickCasterSlow(state, 50);
  assert.equal(state.slowRemaining, 50);
  assert.equal(state.slowFactor, 0.6);
  tickCasterSlow(state, 60); // expires
  assert.equal(state.slowRemaining, 0);
  assert.equal(state.slowFactor, 1); // back to full
});

test('getCasterSpeedMul returns slowFactor while active, 1 when idle', () => {
  const active = { slowRemaining: 500, slowFactor: 0.6 };
  assert.equal(getCasterSpeedMul(active), 0.6);
  const idle = { slowRemaining: 0, slowFactor: 1 };
  assert.equal(getCasterSpeedMul(idle), 1);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/CombatSystem.test.js
```

Expected: `SyntaxError` — the named exports do not exist yet.

- [ ] **Step 3: Implement pure helpers** — append to `src/systems/CombatSystem.js`:

```js
import { CASTER_SLOW_FLOOR } from '../data/tuning.js';

// state: { slowRemaining, slowFactor }  (fields live on Caster instance)
export function applyCasterSlow(state, factor, ms) {
  // Clamp factor to floor so no enemy can freeze the caster.
  const clampedFactor = Math.max(CASTER_SLOW_FLOOR, factor);
  if (state.slowRemaining > 0) {
    // Stacking: keep the stronger (lower) factor, refresh duration.
    state.slowFactor = Math.min(state.slowFactor, clampedFactor);
    state.slowRemaining = Math.max(state.slowRemaining, ms);
  } else {
    state.slowFactor = clampedFactor;
    state.slowRemaining = ms;
  }
}

export function tickCasterSlow(state, delta) {
  if (state.slowRemaining <= 0) return;
  state.slowRemaining -= delta;
  if (state.slowRemaining <= 0) {
    state.slowRemaining = 0;
    state.slowFactor = 1;
  }
}

export function getCasterSpeedMul(state) {
  return state.slowRemaining > 0 ? state.slowFactor : 1;
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/CombatSystem.test.js
```

Expected: all CombatSystem tests pass.

- [ ] **Step 5: Wire into Caster** — modify `src/objects/Caster.js`:

Add two new fields in the constructor (after `this._shotTimer = 0`):
```js
    this.slowRemaining = 0;   // ms
    this.slowFactor = 1;      // speed multiplier (floor = CASTER_SLOW_FLOOR)
```

Change `moveBy` to apply the slow:
```js
  moveBy(vector) {
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    this.setVelocity(vector.x * this.stats.moveSpeed * mul, vector.y * this.stats.moveSpeed * mul);
  }
```

> Note: `Caster.js` imports Phaser — no unit test covers this method. Verify by playtest.

- [ ] **Step 6: Wire into GameScene** — modify `src/scenes/GameScene.js`:

Add import at the top (with the existing CombatSystem import line):
```js
import { applyDamage, applyCasterSlow, tickCasterSlow } from '../systems/CombatSystem.js';
import { CASTER_SLOW_FLOOR } from '../data/tuning.js';
```

In `setupCollisions`, extend the caster/enemies overlap handler to apply the slow on contact:
```js
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
      const slow = findModifier(enemy.def, 'onHitSlow');
      if (slow) applyCasterSlow(this.caster, slow.factor ?? 0.6, slow.ms ?? 1200);
    });
```

In the caster/enemyShots overlap handler, also apply slow from shots:
```js
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      if (shot.burnDps > 0) this.applyCasterBurn(shot.burnDps, shot.burnMs);
      if (shot.slowFactor) applyCasterSlow(this.caster, shot.slowFactor, shot.slowMs ?? 1200);
      this.enemyShots.despawn(shot);
    });
```

In `update`, tick the slow each frame (after the cooldowns block):
```js
    tickCasterSlow(this.caster, delta);
```

> Note: the slow visual (tint flash on the caster) is a playtest-verified polish item. For a clear signal, add a brief blue tint in `applyCasterSlow` wiring: `this.caster.setTint(COLORS.ice); this.time.delayedCall(200, () => this.caster.clearTint());`

- [ ] **Step 7: Run full suite and commit**

```
node --test
```

Expected: all tests pass (CombatSystem additions green, no regressions).

```
git add src/systems/CombatSystem.js src/objects/Caster.js src/scenes/GameScene.js tests/CombatSystem.test.js
git commit -m "feat(water): implement onHitSlow caster slow (pure logic + Caster/GameScene wiring)"
```

---

## Task 3: `resist` damage reduction and elite CC immunity

**Files:**
- Modify: `src/scenes/GameScene.js`
- Modify: `src/objects/Enemy.js`
- Modify: `tests/CombatSystem.test.js`

`resist` (0..1) reduces incoming damage in `hitEnemy`. Elite enemies (`def.elite === true`) ignore `applyFreeze` and `applySlow`. Both are simple guards — keep tests first.

- [ ] **Step 1: Write failing tests** — append to `tests/CombatSystem.test.js`:

```js
import { applyResist } from '../src/systems/CombatSystem.js';

test('applyResist reduces damage by the resist fraction', () => {
  assert.equal(applyResist(100, 0.3), 70);
  assert.equal(applyResist(100, 0), 100);
  assert.equal(applyResist(100, 1), 0);
});

test('applyResist clamps resist to [0,1]', () => {
  assert.equal(applyResist(100, -0.5), 100); // negative resist = no reduction
  assert.equal(applyResist(100, 1.5), 0);    // over 1 = full immunity
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/CombatSystem.test.js
```

Expected: import error for `applyResist`.

- [ ] **Step 3: Implement** — append to `src/systems/CombatSystem.js`:

```js
export function applyResist(damage, resist) {
  const r = Math.max(0, Math.min(1, resist ?? 0));
  return damage * (1 - r);
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/CombatSystem.test.js
```

- [ ] **Step 5: Wire resist into GameScene.hitEnemy**

In `src/scenes/GameScene.js`, import `applyResist` and update `hitEnemy`:

```js
import { applyDamage, applyCasterSlow, tickCasterSlow, applyResist } from '../systems/CombatSystem.js';
```

In `hitEnemy`, apply resist before the shield reduction:
```js
  hitEnemy(enemy, damage) {
    // Burrow invuln gate (added in Task 4).
    if (enemy._burrowed) return;
    // Resist (base damage reduction, e.g. boss forms).
    const resistedDmg = enemy.def.resist ? applyResist(damage, enemy.def.resist) : damage;
    const shield = findModifier(enemy.def, 'shielded');
    const dmg = shield ? resistedDmg * (1 - (shield.reduce ?? 0.5)) : resistedDmg;
    // ... rest unchanged
```

> Note: `enemy._burrowed` guard is a forward reference; add it as a no-op for now (the field won't exist on non-burrow enemies so it is always falsy). Task 4 sets it.

- [ ] **Step 6: Wire elite CC immunity into Enemy.js**

In `src/objects/Enemy.js`, guard `applyFreeze` and `applySlow`:

```js
  applyFreeze(ms) {
    if (this.def.elite) return; // elites resist CC (freeze/slow ignored)
    this.freezeRemaining = Math.max(this.freezeRemaining, ms);
  }

  applySlow(factor, ms) {
    if (this.def.elite) return;
    this.slowFactor = this.slowRemaining > 0 ? Math.min(this.slowFactor, factor) : factor;
    this.slowRemaining = Math.max(this.slowRemaining, ms);
  }
```

> Note: Enemy.js is Phaser-coupled — no unit test covers this. Verify by playtest: cast Freeze at an elite boss (e.g. the Tiburón Abisal) and confirm no slowdown.

- [ ] **Step 7: Run full suite and commit**

```
node --test
```

```
git add src/systems/CombatSystem.js src/objects/Enemy.js src/scenes/GameScene.js tests/CombatSystem.test.js
git commit -m "feat(water): resist damage reduction + elite CC immunity"
```

---

## Task 4: `burrow` movement in EnemyBrain

**Files:**
- Modify: `src/systems/EnemyBrain.js`
- Modify: `src/objects/Enemy.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `tests/EnemyBrain.test.js`

Pure state machine: `submerged` → `reposition` → `telegraph` → `attack` → `recover` → loop. The `GameScene` renders the surface ring and respects the invuln gate already planted in Task 3.

- [ ] **Step 1: Write failing tests** — append to `tests/EnemyBrain.test.js`:

```js
import { MOVEMENTS } from '../src/systems/EnemyBrain.js';
import { BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS } from '../src/data/tuning.js';

// Helper: run burrow for `ms` ms in one step.
function runBurrow(state, ms, ctx) {
  return MOVEMENTS.burrow({ ...ctx, params: {}, state, dt: ms });
}

const burrowCtx = () => ({
  self: { x: 0, y: 0 },
  target: { x: 100, y: 100 },
  speed: 80,
  dt: 16,
});

test('burrow: starts in submerged state with zero velocity', () => {
  const state = {};
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state });
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
  assert.equal(state.mode, 'submerged');
  assert.equal(v.submerged, true);
});

test('burrow: stays submerged until BURROW_SUBMERGE_MS elapses', () => {
  const state = {};
  // Consume all but the last ms.
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_SUBMERGE_MS - 1 });
  assert.equal(state.mode, 'submerged');
});

test('burrow: transitions to reposition after submerge window', () => {
  const state = {};
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_SUBMERGE_MS + 1 });
  assert.equal(state.mode, 'reposition');
});

test('burrow: reposition snaps to near target immediately (same frame)', () => {
  const state = { mode: 'reposition', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 16 });
  // After reposition the mode advances to 'telegraph'.
  assert.equal(state.mode, 'telegraph');
  // Velocity during reposition is zero (snap is a position write, not velocity).
  assert.equal(v.x, 0);
  assert.equal(v.y, 0);
  // The intent carries a reposition target.
  assert.ok(v.repositionTo, 'should carry repositionTo {x,y}');
});

test('burrow: telegraph mode signals surfacing for BURROW_TELEGRAPH_MS', () => {
  const state = { mode: 'telegraph', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_TELEGRAPH_MS - 1 });
  assert.equal(v.surfacing, true);
  assert.equal(state.mode, 'telegraph');
});

test('burrow: telegraph transitions to attack after window', () => {
  const state = { mode: 'telegraph', t: 0 };
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_TELEGRAPH_MS + 1 });
  assert.equal(state.mode, 'attack');
});

test('burrow: attack mode fires a dashStrike and transitions to recover', () => {
  const state = { mode: 'attack', t: 0 };
  const v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 16 });
  assert.equal(v.dashStrike, true);
  assert.equal(state.mode, 'recover');
});

test('burrow: recover is vulnerable and returns to submerged after BURROW_RECOVER_MS', () => {
  const state = { mode: 'recover', t: 0 };
  let v = MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: BURROW_RECOVER_MS - 1 });
  assert.equal(v.vulnerable, true);
  assert.equal(state.mode, 'recover');
  MOVEMENTS.burrow({ ...burrowCtx(), params: {}, state, dt: 2 }); // push past threshold
  assert.equal(state.mode, 'submerged');
});

test('every movement type (including burrow) returns finite velocity', () => {
  for (const type of Object.keys(MOVEMENTS)) {
    const v = MOVEMENTS[type]({ self: { x: 0, y: 0 }, target: { x: 100, y: 0 }, speed: 60, dt: 16, params: {}, state: {} });
    assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y), `${type} produced NaN`);
  }
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/EnemyBrain.test.js
```

Expected: `MOVEMENTS.burrow is not a function`.

- [ ] **Step 3: Implement** — add `burrow` to `MOVEMENTS` in `src/systems/EnemyBrain.js`:

```js
  burrow({ self, target, speed, dt, params, state }) {
    const submergeMs    = params?.submergeMs    ?? BURROW_SUBMERGE_MS;
    const telegraphMs   = params?.surfaceTelegraphMs ?? BURROW_TELEGRAPH_MS;
    const recoverMs     = params?.recoverMs     ?? BURROW_RECOVER_MS;
    const dashSpeed     = speed * (params?.dashMul ?? 3.5);

    state.mode = state.mode || 'submerged';
    state.t    = (state.t || 0) + dt;

    if (state.mode === 'submerged') {
      if (state.t >= submergeMs) { state.mode = 'reposition'; state.t = 0; }
      return { x: 0, y: 0, submerged: true };
    }

    if (state.mode === 'reposition') {
      // Teleport to a spot near the target (caller handles the position write).
      state.mode = 'telegraph';
      state.t = 0;
      // Offset so the enemy doesn't land exactly on the caster.
      const a = angleBetween(target.x, target.y, self.x, self.y);
      const dist = 80;
      const rx = target.x + Math.cos(a) * dist;
      const ry = target.y + Math.sin(a) * dist;
      return { x: 0, y: 0, repositionTo: { x: rx, y: ry } };
    }

    if (state.mode === 'telegraph') {
      if (state.t >= telegraphMs) { state.mode = 'attack'; state.t = 0; }
      return { x: 0, y: 0, surfacing: true };
    }

    if (state.mode === 'attack') {
      // Fire once, immediately transition to recover.
      state.mode = 'recover';
      state.t = 0;
      const heading = angleBetween(self.x, self.y, target.x, target.y);
      state.dashHeading = heading;
      return { x: Math.cos(heading) * dashSpeed, y: Math.sin(heading) * dashSpeed, dashStrike: true };
    }

    if (state.mode === 'recover') {
      if (state.t >= recoverMs) { state.mode = 'submerged'; state.t = 0; }
      return { x: 0, y: 0, vulnerable: true };
    }

    return { x: 0, y: 0 }; // fallback
  },
```

Also add the import at the top of `EnemyBrain.js` (after the utility functions):
```js
import { BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS } from '../data/tuning.js';
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/EnemyBrain.test.js
```

Expected: all EnemyBrain tests pass.

- [ ] **Step 5: Wire burrow state into Enemy** — modify `src/objects/Enemy.js`:

The `think` method needs to pass the special burrow return values back so `GameScene` can act on them. Add `_burrowed` / `_surfacing` flags that `hitEnemy` and the renderer can check:

In `think`, after `computeMovement`:
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

> Note: `this.x = ...` is a Phaser write — tested by playtest, not unit test.

- [ ] **Step 6: Wire GameScene for burrow rendering and invuln gate**

The `hitEnemy` guard `if (enemy._burrowed) return;` was already planted in Task 3.

In `GameScene.update`, in the per-enemy loop where `intent.fires` is processed, add the surfacing telegraph:

```js
      // Burrow surface telegraph: draw warning ring while _surfacing.
      if (e._surfacing) {
        this.telegraphGfx.lineStyle(3, 0x00bcd4, 0.85);
        this.telegraphGfx.strokeCircle(e.x, e.y, (e.def.radius || 20) + 24);
      }
      // Hide the sprite while submerged; show it otherwise.
      e.setAlpha(e._burrowed ? 0.15 : 1);
```

> Note: alpha-fade to 0.15 instead of 0 so the position is still faintly readable for debugging. Playtest to tune.

- [ ] **Step 7: Run full suite and commit**

```
node --test
```

```
git add src/systems/EnemyBrain.js src/objects/Enemy.js src/scenes/GameScene.js tests/EnemyBrain.test.js
git commit -m "feat(water): add burrow movement — submerge/reposition/telegraph/attack/recover state machine"
```

---

## Task 5: `splitsOnDeath` modifier

**Files:**
- Modify: `src/scenes/GameScene.js`
- Modify: `tests/EnemyBrain.test.js`

On death, spawn `count` scaled children; children carry `_split=true` so they never re-split. The pure part is the "should this enemy split" logic + child def construction (no Phaser). GameScene.onEnemyDeath already calls `findModifier`.

- [ ] **Step 1: Write failing tests** — append to `tests/EnemyBrain.test.js`:

```js
import { buildSplitChildren } from '../src/systems/EnemyBrain.js';

test('buildSplitChildren returns count child defs scaled to 0.5x hp/radius', () => {
  const def = { hp: 80, radius: 18, speed: 60, tex: 'circle', damage: 6,
                modifiers: [{ type: 'splitsOnDeath', spawnType: null, count: 2 }] };
  const children = buildSplitChildren(def);
  assert.equal(children.length, 2);
  for (const c of children) {
    assert.equal(c.hp, 40);
    assert.ok(c.radius < def.radius);
    assert.equal(c._split, true);
  }
});

test('buildSplitChildren returns [] when modifier absent or _split is already set', () => {
  const def = { hp: 80, modifiers: [] };
  assert.deepEqual(buildSplitChildren(def), []);

  const split = { hp: 80, modifiers: [{ type: 'splitsOnDeath', count: 2 }], _split: true };
  assert.deepEqual(buildSplitChildren(split), []);
});

test('buildSplitChildren respects custom spawnType by recording it on the child def', () => {
  const def = { hp: 100, radius: 20, speed: 70, tex: 'circle', damage: 8,
                modifiers: [{ type: 'splitsOnDeath', spawnType: 'medusaChild', count: 2 }] };
  const children = buildSplitChildren(def);
  assert.equal(children[0]._spawnType, 'medusaChild');
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/EnemyBrain.test.js
```

Expected: `buildSplitChildren is not a function`.

- [ ] **Step 3: Implement** — append to `src/systems/EnemyBrain.js`:

```js
// Builds the child enemy defs when an enemy with splitsOnDeath dies.
// Returns [] if the modifier is absent or the enemy is already a split child.
export function buildSplitChildren(def) {
  if (def._split) return []; // one generation only
  const mod = findModifier(def, 'splitsOnDeath');
  if (!mod) return [];
  const count = mod.count ?? 2;
  const children = [];
  for (let i = 0; i < count; i++) {
    const child = {
      ...def,
      hp: Math.max(1, Math.round((def.hp ?? 40) * 0.5)),
      radius: Math.round((def.radius ?? 16) * 0.7),
      _split: true, // prevents re-splitting
      _spawnType: mod.spawnType || null,
      // Strip splitsOnDeath from children so they definitely cannot split again.
      modifiers: (def.modifiers || []).filter(
        (m) => (typeof m === 'string' ? m : m.type) !== 'splitsOnDeath'
      ),
    };
    children.push(child);
  }
  return children;
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/EnemyBrain.test.js
```

- [ ] **Step 5: Wire into GameScene.onEnemyDeath**

Import `buildSplitChildren` at the top of `src/scenes/GameScene.js`:
```js
import { buildProjectiles, findModifier, buildSplitChildren } from '../systems/EnemyBrain.js';
```

In `onEnemyDeath`, add after the existing `explodesOnDeath` block:
```js
    const split = buildSplitChildren(enemy.def);
    for (const childDef of split) {
      // Respect CONCURRENCY_CAP: only spawn if there is room.
      if (this.enemies.countActive(true) >= CONCURRENCY_CAP) break;
      const scaled = scaleEnemyDef(childDef, this.mult);
      const e = new Enemy(this, enemy.x + Phaser.Math.Between(-20, 20), enemy.y + Phaser.Math.Between(-20, 20), scaled);
      this.enemies.add(e);
      if (childDef.radius) e.setDisplaySize(childDef.radius * 2, childDef.radius * 2);
    }
```

> Note: Phaser-coupled spawn — verified by playtest. Kill a Medusa and confirm two smaller copies appear; confirm those copies do not split again.

- [ ] **Step 6: Run full suite and commit**

```
node --test
```

```
git add src/systems/EnemyBrain.js src/scenes/GameScene.js tests/EnemyBrain.test.js
git commit -m "feat(water): splitsOnDeath — pure buildSplitChildren + GameScene spawn on death"
```

---

## Task 6: Generational summon (frog lifecycle)

**Files:**
- Modify: `src/systems/EnemyBrain.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `tests/EnemyBrain.test.js`

Pure: a small per-enemy lifecycle timer that tracks `egg → tadpole → adult`. GameScene runs a `promoteEgg / promoteTadpole` step each frame and handles the Phaser spawn side.

- [ ] **Step 1: Write failing tests** — append to `tests/EnemyBrain.test.js`:

```js
import { tickLifecycle, LIFECYCLE } from '../src/systems/EnemyBrain.js';
import { EGG_HATCH_MS, TADPOLE_GROW_MS } from '../src/data/tuning.js';

test('tickLifecycle: egg stays egg until EGG_HATCH_MS elapses', () => {
  const state = { lifecycle: LIFECYCLE.EGG, lifecycleTimer: 0 };
  const result = tickLifecycle(state, EGG_HATCH_MS - 1);
  assert.equal(result.promote, false);
  assert.equal(state.lifecycle, LIFECYCLE.EGG);
});

test('tickLifecycle: egg promotes to tadpole after EGG_HATCH_MS', () => {
  const state = { lifecycle: LIFECYCLE.EGG, lifecycleTimer: 0 };
  const result = tickLifecycle(state, EGG_HATCH_MS + 1);
  assert.equal(result.promote, true);
  assert.equal(result.promoteTo, LIFECYCLE.TADPOLE);
  assert.equal(state.lifecycle, LIFECYCLE.TADPOLE);
  assert.equal(state.lifecycleTimer, 0);
});

test('tickLifecycle: tadpole promotes to adult after TADPOLE_GROW_MS', () => {
  const state = { lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: 0 };
  tickLifecycle(state, TADPOLE_GROW_MS + 1);
  const result = tickLifecycle({ lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: TADPOLE_GROW_MS + 1 }, 0);
  // Direct: force already-elapsed.
  const s2 = { lifecycle: LIFECYCLE.TADPOLE, lifecycleTimer: TADPOLE_GROW_MS + 100 };
  const r2 = tickLifecycle(s2, 0);
  assert.equal(r2.promote, true);
  assert.equal(r2.promoteTo, LIFECYCLE.ADULT);
});

test('tickLifecycle: adult has no further promotion', () => {
  const state = { lifecycle: LIFECYCLE.ADULT, lifecycleTimer: 99999 };
  const result = tickLifecycle(state, 0);
  assert.equal(result.promote, false);
});

test('tickLifecycle: no lifecycle field → no promotion (non-frog enemy)', () => {
  const state = {};
  const result = tickLifecycle(state, 1000);
  assert.equal(result.promote, false);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/EnemyBrain.test.js
```

Expected: `tickLifecycle is not a function` and `LIFECYCLE is not defined`.

- [ ] **Step 3: Implement** — append to `src/systems/EnemyBrain.js`:

```js
export const LIFECYCLE = Object.freeze({ EGG: 'egg', TADPOLE: 'tadpole', ADULT: 'adult' });

// Ticks the per-enemy lifecycle timer (egg→tadpole→adult).
// state: { lifecycle?: string, lifecycleTimer?: number }
// Returns { promote: bool, promoteTo?: string }.
export function tickLifecycle(state, delta) {
  if (!state.lifecycle) return { promote: false };
  state.lifecycleTimer = (state.lifecycleTimer ?? 0) + delta;

  if (state.lifecycle === LIFECYCLE.EGG) {
    if (state.lifecycleTimer >= EGG_HATCH_MS) {
      state.lifecycle = LIFECYCLE.TADPOLE;
      state.lifecycleTimer = 0;
      return { promote: true, promoteTo: LIFECYCLE.TADPOLE };
    }
    return { promote: false };
  }

  if (state.lifecycle === LIFECYCLE.TADPOLE) {
    if (state.lifecycleTimer >= TADPOLE_GROW_MS) {
      state.lifecycle = LIFECYCLE.ADULT;
      state.lifecycleTimer = 0;
      return { promote: true, promoteTo: LIFECYCLE.ADULT };
    }
    return { promote: false };
  }

  // ADULT: no further promotion.
  return { promote: false };
}
```

Also add the tuning import at the top of EnemyBrain.js (extend the existing import):
```js
import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../data/tuning.js';
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/EnemyBrain.test.js
```

- [ ] **Step 5: Wire lifecycle ticking into GameScene.update**

In `src/scenes/GameScene.js`, import `tickLifecycle` and `LIFECYCLE`:
```js
import { buildProjectiles, findModifier, buildSplitChildren, tickLifecycle, LIFECYCLE } from '../systems/EnemyBrain.js';
import { ENEMY_TYPES } from '../data/enemies.js'; // already imported
```

In the `update` per-enemy loop, after `this.containEnemy(e)`:
```js
      // Lifecycle promotion (egg→tadpole→adult).
      if (e.brainState && e.brainState.lifecycle !== undefined) {
        const life = tickLifecycle(e.brainState, delta);
        if (life.promote) this.promoteEnemy(e, life.promoteTo);
      }
```

Add the new `promoteEnemy` method:
```js
  promoteEnemy(enemy, toLifecycle) {
    // Respect CONCURRENCY_CAP.
    if (this.enemies.countActive(true) >= CONCURRENCY_CAP) { enemy.destroy(); return; }
    const typeKey = toLifecycle === LIFECYCLE.TADPOLE ? (enemy.def._hatchType || 'tadpole')
                                                       : (enemy.def._growType  || 'adultFrog');
    const def = ENEMY_TYPES[typeKey];
    if (!def) { enemy.destroy(); return; }
    const scaled = scaleEnemyDef(def, this.mult);
    const e = new Enemy(this, enemy.x, enemy.y, scaled);
    // Carry lifecycle state through so adults can continue to adult.
    if (toLifecycle === LIFECYCLE.TADPOLE) {
      e.brainState.lifecycle = LIFECYCLE.TADPOLE;
      e.brainState.lifecycleTimer = 0;
    }
    this.enemies.add(e);
    enemy.destroy();
  }
```

Enemy defs for `egg`, `tadpole`, and `adultFrog` carry `_hatchType` / `_growType` fields set in the content plan (Plan 2). The engine pieces here are complete regardless; when those defs are absent `ENEMY_TYPES[typeKey]` is undefined and the egg silently disappears (safe fallback, not a crash).

> Note: Phaser spawn — verify by playtest: place a Huevo de Sapo and watch it hatch, grow, and eventually spawn eggs (via `summon` on the adult def). Confirm the CONCURRENCY_CAP prevents screen flooding.

- [ ] **Step 6: Run full suite and commit**

```
node --test
```

```
git add src/systems/EnemyBrain.js src/scenes/GameScene.js tests/EnemyBrain.test.js
git commit -m "feat(water): generational frog lifecycle — tickLifecycle pure helper + GameScene promotion"
```

---

## Task 7: `WhirlpoolHazard` pure module

**Files:**
- Create: `src/systems/WhirlpoolHazard.js`
- Create: `tests/WhirlpoolHazard.test.js`

Mirror `TriangleHazard.js` structure: pure module, no Phaser import, all math exported and unit-tested.

- [ ] **Step 1: Write failing tests** — create `tests/WhirlpoolHazard.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  forceAt, isInside, centerDot, scaleForPhase,
} from '../src/systems/WhirlpoolHazard.js';
import { WHIRLPOOL_RADIUS, WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS } from '../src/data/tuning.js';

const CENTER = { x: 240, y: 427 };
const R = WHIRLPOOL_RADIUS;

test('isInside: true when within radius, false outside', () => {
  assert.equal(isInside(CENTER, R, { x: CENTER.x, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R - 1, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R + 1, y: CENTER.y }), false);
});

test('forceAt: zero force at the edge (distance = radius)', () => {
  const pos = { x: CENTER.x + R, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3);
});

test('forceAt: max force at the center (= WHIRLPOOL_CENTER_PULL * casterSpeed)', () => {
  const casterSpeed = 100;
  const v = forceAt(CENTER, R, CENTER, casterSpeed);
  const mag = Math.hypot(v.x, v.y);
  // At the center, distance = 0. forceAt should return 0 velocity (nowhere to pull toward).
  // The force direction is toward center; at center itself, the force magnitude is maximum
  // but direction is undefined — implementation may return zero or a stable fallback.
  // We test a point very close to center instead.
  const nearCenter = { x: CENTER.x + 1, y: CENTER.y };
  const v2 = forceAt(CENTER, R, nearCenter, casterSpeed);
  const mag2 = Math.hypot(v2.x, v2.y);
  assert.ok(mag2 > WHIRLPOOL_CENTER_PULL * casterSpeed * 0.9,
    `expected near-max force, got ${mag2}`);
});

test('forceAt: force is directed toward center', () => {
  const pos = { x: CENTER.x + 40, y: CENTER.y }; // to the right of center
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(v.x < 0, 'force should pull left (toward center)');
  assert.ok(Math.abs(v.y) < 1, 'force should be mostly horizontal');
});

test('forceAt: force grows from 0 at edge to max near center (monotone)', () => {
  const casterSpeed = 100;
  const distances = [R * 0.9, R * 0.6, R * 0.3, R * 0.05];
  let prevMag = 0;
  for (const d of distances.reverse()) { // from near-center outward
    const pos = { x: CENTER.x + d, y: CENTER.y };
    const v = forceAt(CENTER, R, pos, casterSpeed);
    const mag = Math.hypot(v.x, v.y);
    assert.ok(mag >= prevMag - 1e-6, `force not monotone at d=${d}: ${mag} < ${prevMag}`);
    prevMag = mag;
  }
});

test('centerDot: returns DPS when inside center zone, 0 outside', () => {
  const centerZoneRadius = R * 0.2;
  assert.ok(centerDot(CENTER, R, CENTER) > 0);
  const outside = { x: CENTER.x + R * 0.5, y: CENTER.y };
  assert.equal(centerDot(CENTER, R, outside), 0);
});

test('centerDot: center DPS matches WHIRLPOOL_CENTER_DPS at the very center', () => {
  assert.equal(centerDot(CENTER, R, CENTER), WHIRLPOOL_CENTER_DPS);
});

test('scaleForPhase: phase 1 returns 1.0, phase 3 returns a larger multiplier', () => {
  const p1 = scaleForPhase(1);
  const p3 = scaleForPhase(3);
  assert.equal(p1, 1.0);
  assert.ok(p3 > p1);
});

test('forceAt outside radius returns zero vector', () => {
  const pos = { x: CENTER.x + R + 50, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-6);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/WhirlpoolHazard.test.js
```

Expected: `Error [ERR_MODULE_NOT_FOUND]` — module does not exist yet.

- [ ] **Step 3: Implement** — create `src/systems/WhirlpoolHazard.js`:

```js
// src/systems/WhirlpoolHazard.js
// Pure (no Phaser). Force field and damage math for the whirlpool/maelstrom hazard.
// Mirror of TriangleHazard — all geometry exported and unit-tested.

import { WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS } from '../data/tuning.js';

// Returns true if `pos` is within the whirlpool's influence circle.
export function isInside(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius;
}

// Returns the pull-force vector applied to the caster this frame.
// Force = 0 at the edge (dist = radius), WHIRLPOOL_CENTER_PULL × casterSpeed at the center.
// Linear interpolation: strength = (1 - dist/radius) × WHIRLPOOL_CENTER_PULL × casterSpeed.
export function forceAt(center, radius, pos, casterSpeed) {
  const dx = center.x - pos.x;
  const dy = center.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return { x: 0, y: 0 };
  // t = 0 at edge, 1 at center.
  const t = 1 - dist / radius;
  const magnitude = t * WHIRLPOOL_CENTER_PULL * casterSpeed;
  if (dist < 1e-4) return { x: 0, y: 0 }; // at center: no defined direction, no net pull
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: nx * magnitude, y: ny * magnitude };
}

// Returns damage-per-second when the caster is inside the center zone (inner 20% of radius).
// Returns 0 outside the center zone.
export function centerDot(center, radius, pos) {
  const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
  return dist <= radius * 0.2 ? WHIRLPOOL_CENTER_DPS : 0;
}

// Phase scaling multiplier (1.0 at phase 1, increases for later phases).
// Used by GameScene to intensify the vortex in later boss phases.
export function scaleForPhase(phase) {
  // Phase 1 = 1.0×, phase 2 = 1.25×, phase 3 = 1.6×.
  const table = [1.0, 1.0, 1.25, 1.6];
  return table[Math.min(phase, table.length - 1)] ?? 1.0;
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/WhirlpoolHazard.test.js
```

Expected: all 9 WhirlpoolHazard tests pass.

- [ ] **Step 5: Wire WhirlpoolHazard into GameScene**

Add import in `src/scenes/GameScene.js`:
```js
import { forceAt, isInside, centerDot, scaleForPhase } from '../systems/WhirlpoolHazard.js';
import {
  WHIRLPOOL_RADIUS, WHIRLPOOL_ACTIVE_MS, WHIRLPOOL_COOLDOWN_MS, WHIRLPOOL_TELEGRAPH_MS,
} from '../data/tuning.js';
```

Add `this.whirlpool = null;` in `create()` (near `this.triangle = null`).

Add `spawnWhirlpool` hook inside `runBossHook`:
```js
  runBossHook(boss, hook) {
    if (hook === 'spawnLavaFloor') { /* ... existing ... */ }
    if (hook === 'spawnWhirlpool') {
      const phase = typeof boss._whirlpoolPhase === 'number' ? boss._whirlpoolPhase : 1;
      this.whirlpool = {
        center: { x: Phaser.Math.Between(80, GAME_WIDTH - 80), y: Phaser.Math.Between(80, GAME_HEIGHT - 80) },
        radius: WHIRLPOOL_RADIUS,
        phase,
        mode: 'telegraph',
        t: WHIRLPOOL_TELEGRAPH_MS,
      };
    }
  }
```

Add `updateWhirlpool` method:
```js
  updateWhirlpool(delta) {
    if (!this.whirlpool) return;
    const w = this.whirlpool;
    w.t -= delta;

    // Clear old spiral each frame.
    if (!this.whirlpoolGfx) this.whirlpoolGfx = this.add.graphics().setDepth(7);
    this.whirlpoolGfx.clear();

    if (w.mode === 'telegraph') {
      // Draw dashed warning circle.
      this.whirlpoolGfx.lineStyle(2, 0x00bcd4, 0.5);
      this.whirlpoolGfx.strokeCircle(w.center.x, w.center.y, w.radius);
      if (w.t <= 0) { w.mode = 'active'; w.t = WHIRLPOOL_ACTIVE_MS; }
      return;
    }

    if (w.mode === 'active') {
      // Draw animated spiral (approximate with concentric arcs).
      const phaseMul = scaleForPhase(w.phase);
      const activeRadius = w.radius * phaseMul;
      this.whirlpoolGfx.lineStyle(3, 0x0288d1, 0.75);
      this.whirlpoolGfx.strokeCircle(w.center.x, w.center.y, activeRadius);
      this.whirlpoolGfx.lineStyle(1, 0x0288d1, 0.4);
      this.whirlpoolGfx.strokeCircle(w.center.x, w.center.y, activeRadius * 0.5);

      // Apply force to caster.
      if (this.caster && this.caster.hp > 0 && isInside(w.center, activeRadius, this.caster)) {
        const f = forceAt(w.center, activeRadius, this.caster, this.stats.moveSpeed);
        this.caster.x += f.x * (delta / 1000);
        this.caster.y += f.y * (delta / 1000);
        this.caster.x = Phaser.Math.Clamp(this.caster.x, 0, GAME_WIDTH);
        this.caster.y = Phaser.Math.Clamp(this.caster.y, 0, GAME_HEIGHT);
        // Center DoT.
        const dot = centerDot(w.center, activeRadius, this.caster);
        if (dot > 0) this.damageCaster(dot * (delta / 1000));
      }

      if (w.t <= 0) { w.mode = 'cooldown'; w.t = WHIRLPOOL_COOLDOWN_MS; }
      return;
    }

    if (w.mode === 'cooldown') {
      if (w.t <= 0) this.whirlpool = null; // boss will re-trigger via hook
    }
  }
```

Call `this.updateWhirlpool(delta)` in `update()` (after `updateTriangle`).

Also clear `this.whirlpool = null` and `this.whirlpoolGfx && this.whirlpoolGfx.clear()` in `checkPhaseCleared` alongside the existing `this.triangle = null` cleanup.

> Note: The spiral visual is a playtest item. The force math is covered by unit tests. Verify by playtest: stand near a boss that fires `spawnWhirlpool`, observe the pull, confirm you can fight out of the center.

- [ ] **Step 6: Run full suite and commit**

```
node --test
```

```
git add src/systems/WhirlpoolHazard.js tests/WhirlpoolHazard.test.js src/scenes/GameScene.js
git commit -m "feat(water): WhirlpoolHazard pure module + GameScene integration (force + DoT + render)"
```

---

## Task 8: Form sequencer (shapeshifter)

**Files:**
- Create: `src/systems/FormSequencer.js`
- Create: `tests/FormSequencer.test.js`
- Modify: `src/objects/Enemy.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `src/scenes/UIScene.js`

Pure: `FormSequencer` sits on top of `BossBrain` — tracks the active form, handles HP-zero → transform → next form, and signals "fight over" only on the last form's death.

- [ ] **Step 1: Write failing tests** — create `tests/FormSequencer.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FormSequencer } from '../src/systems/FormSequencer.js';

const FORMS = [
  { hp: 200, resist: 0,   movement: { type: 'kite' } },
  { hp: 300, resist: 0.2, movement: { type: 'burrow' } },
  { hp: 400, resist: 0.4, movement: { type: 'static' } },
  { hp: 100, resist: 0.5, movement: { type: 'flee' } }, // last / maga-final
];

test('FormSequencer starts on form 0 with that form hp', () => {
  const fs = new FormSequencer(FORMS);
  assert.equal(fs.activeFormIndex, 0);
  assert.equal(fs.currentHp, FORMS[0].hp);
  assert.equal(fs.isLastForm(), false);
});

test('applyDamage reduces hp within a form', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(50);
  assert.equal(fs.currentHp, 150);
  assert.equal(fs.transformPending, false);
  assert.equal(fs.fightOver, false);
});

test('applyDamage at zero hp triggers transformPending on non-last form', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(200); // exactly kills form 0
  assert.equal(fs.currentHp, 0);
  assert.equal(fs.transformPending, true);
  assert.equal(fs.fightOver, false);
});

test('completeTransform advances to next form with full hp', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(200);
  fs.completeTransform();
  assert.equal(fs.activeFormIndex, 1);
  assert.equal(fs.currentHp, FORMS[1].hp);
  assert.equal(fs.transformPending, false);
});

test('killing all forms except the last triggers fightOver on the last form', () => {
  const fs = new FormSequencer(FORMS);
  // Kill forms 0, 1, 2.
  for (let i = 0; i < 3; i++) {
    fs.applyDamage(fs.currentHp);
    fs.completeTransform();
  }
  assert.equal(fs.activeFormIndex, 3);
  assert.equal(fs.isLastForm(), true);
  // Now kill the last form.
  fs.applyDamage(fs.currentHp);
  assert.equal(fs.fightOver, true);
  assert.equal(fs.transformPending, false);
});

test('resist increases with each form', () => {
  const fs = new FormSequencer(FORMS);
  assert.equal(fs.activeForm().resist, 0);
  fs.applyDamage(200); fs.completeTransform();
  assert.equal(fs.activeForm().resist, 0.2);
  fs.applyDamage(300); fs.completeTransform();
  assert.equal(fs.activeForm().resist, 0.4);
});

test('applyDamage respects active form resist', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(300); fs.completeTransform(); // advance to form 1 (resist 0.2)
  const hp = fs.currentHp;
  fs.applyDamage(100); // 100 × (1 - 0.2) = 80 actual damage
  assert.equal(fs.currentHp, hp - 80);
});

test('hp cannot go below zero', () => {
  const fs = new FormSequencer(FORMS);
  fs.applyDamage(9999);
  assert.ok(fs.currentHp <= 0);
});

test('Dama revert pattern: last form is maga_final with very low hp', () => {
  // Mirrors the real boss: last form has ~20 HP.
  const dama = [
    { hp: 200, resist: 0 },
    { hp: 300, resist: 0.2 },
    { hp: 20, resist: 0 }, // maga_final
  ];
  const fs = new FormSequencer(dama);
  fs.applyDamage(200); fs.completeTransform();
  fs.applyDamage(300); fs.completeTransform();
  assert.equal(fs.isLastForm(), true);
  assert.equal(fs.currentHp, 20);
  fs.applyDamage(20);
  assert.equal(fs.fightOver, true);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/FormSequencer.test.js
```

Expected: `Error [ERR_MODULE_NOT_FOUND]`.

- [ ] **Step 3: Implement** — create `src/systems/FormSequencer.js`:

```js
// src/systems/FormSequencer.js
// Pure (no Phaser). Manages multi-form boss lifecycle (shapeshifter).
// Each form has independent hp, resist, and a full movement/phase kit.
// applyDamage reduces current form hp (after resist). When a form hits 0:
//   - If not the last form: sets transformPending = true (caller triggers transform).
//   - If the last form: sets fightOver = true.
// completeTransform() advances to the next form with full hp.

export class FormSequencer {
  constructor(forms) {
    if (!forms || forms.length === 0) throw new Error('FormSequencer requires at least one form');
    this.forms = forms;
    this.activeFormIndex = 0;
    this.currentHp = forms[0].hp;
    this.transformPending = false;
    this.fightOver = false;
  }

  activeForm() {
    return this.forms[this.activeFormIndex];
  }

  isLastForm() {
    return this.activeFormIndex === this.forms.length - 1;
  }

  // Apply damage to the current form, accounting for its resist.
  applyDamage(rawDamage) {
    if (this.fightOver || this.transformPending) return;
    const resist = this.activeForm().resist ?? 0;
    const actual = rawDamage * (1 - Math.max(0, Math.min(1, resist)));
    this.currentHp = Math.max(0, this.currentHp - actual);
    if (this.currentHp <= 0) {
      if (this.isLastForm()) {
        this.fightOver = true;
      } else {
        this.transformPending = true;
      }
    }
  }

  // Called by GameScene after the transform animation completes.
  completeTransform() {
    if (!this.transformPending) return;
    this.activeFormIndex += 1;
    this.currentHp = this.forms[this.activeFormIndex].hp;
    this.transformPending = false;
  }

  // Convenience: hp fraction for the UI bar.
  hpFraction() {
    return this.currentHp / (this.activeForm().hp || 1);
  }
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/FormSequencer.test.js
```

Expected: all 9 tests pass.

- [ ] **Step 5: Wire form sequencer into Enemy and GameScene**

In `src/objects/Enemy.js`, add an optional `_formSeq` field:

In the constructor, after `this.brainState = ...`:
```js
    this._formSeq = null; // set by GameScene when the boss has `forms`
```

Override `think` to use `_formSeq.activeForm()` when present for movement and speed (BossBrain still handles phases within the active form). The simplest wiring: when `def.forms` exists, GameScene replaces `def` on the boss with `activeForm()` after each transform, so `think` sees the correct `def` and BossBrain uses it normally.

In `src/scenes/GameScene.js`, add import:
```js
import { FormSequencer } from '../systems/FormSequencer.js';
```

In `spawnBoss`, after `this.boss = new Boss(...)`:
```js
    if (def.forms && def.forms.length) {
      this.boss._formSeq = new FormSequencer(def.forms);
      // Bootstrap the boss def to the first form.
      this._applyBossForm(this.boss, 0);
    }
```

Add `_applyBossForm`:
```js
  _applyBossForm(boss, formIndex) {
    const form = boss._formSeq.forms[formIndex];
    // Merge form fields onto def (movement, speed, hp, resist).
    boss.def = { ...boss.def, ...form };
    boss.hp = form.hp;
    boss.maxHp = form.hp;
    if (form.color) boss.setTint(form.color);
    if (form.radius) boss.setDisplaySize(form.radius * 2, form.radius * 2);
    // Reset BossBrain phase state for the new form.
    boss.brainState.boss = {};
  }
```

In `hitEnemy`, intercept the damage path for form-sequencer bosses before calling `applyDamage`:
```js
  hitEnemy(enemy, damage) {
    if (enemy._burrowed) return;
    // Form sequencer: route damage through FormSequencer and handle transform.
    if (enemy._formSeq) {
      enemy._formSeq.applyDamage(damage);
      enemy.hp = enemy._formSeq.currentHp; // keep hp in sync for BossBrain hpFrac
      if (enemy._formSeq.fightOver) {
        this.onEnemyDeath(enemy);
        enemy.destroy();
        this.checkPhaseCleared();
        return;
      }
      if (enemy._formSeq.transformPending && !enemy._transforming) {
        this._beginBossTransform(enemy);
      }
      return;
    }
    // ... existing hitEnemy logic unchanged below
```

Add `_beginBossTransform`:
```js
  _beginBossTransform(boss) {
    boss._transforming = true;
    boss.setAlpha(0.3); // brief dim during transform telegraph
    // Clear this form's adds.
    const live = this.enemies.getChildren().filter((e) => e.active && e !== boss);
    for (const e of live) e.destroy();
    this.time.delayedCall(1000, () => { // ~1000ms telegraph/invuln window
      if (!boss.active) return;
      boss._transforming = false;
      boss.setAlpha(1);
      boss._formSeq.completeTransform();
      this._applyBossForm(boss, boss._formSeq.activeFormIndex);
      boss.clearTint();
      if (boss._formSeq.activeForm().color) boss.setTint(boss._formSeq.activeForm().color);
    });
  }
```

> Note: Phaser-coupled (tween, tint, delayedCall) — verify by playtest: fight a multi-form boss def, confirm HP bar refills, form changes look telegraphed, adds get cleared.

- [ ] **Step 6: Wire per-form HP bar into UIScene**

In `src/scenes/UIScene.js`, in the boss HP bar update logic (wherever it reads `boss.hp / boss.maxHp`), add support for `_formSeq`:

```js
  // In UIScene's update / drawBossBar:
  updateBossBar() {
    const gs = this.gameScene;
    const boss = gs && gs.boss;
    if (!boss || !boss.active) { /* hide bar */ return; }
    let frac, label;
    if (boss._formSeq) {
      frac = boss._formSeq.hpFraction();
      const idx = boss._formSeq.activeFormIndex + 1;
      const total = boss._formSeq.forms.length;
      label = `${idx}/${total}`;
    } else {
      frac = boss.hp / boss.maxHp;
      label = '';
    }
    // Draw bar using frac ... (existing drawing code, just swap the fraction source)
    // Optionally display `label` next to the bar so the player sees which form they're on.
  }
```

> Note: UIScene is Phaser-coupled — verify by playtest. The form index label (`2/5`, etc.) is a minimal affordance so the player understands there are more forms coming.

- [ ] **Step 7: Run full suite and commit**

```
node --test
```

```
git add src/systems/FormSequencer.js tests/FormSequencer.test.js src/objects/Enemy.js src/scenes/GameScene.js src/scenes/UIScene.js
git commit -m "feat(water): FormSequencer pure class + shapeshifter boss wiring (transform, per-form HP bar)"
```

---

## Task 9: Full suite regression check

**Files:** none (verification only)

Run every test in the project to confirm all Water engine pieces are green and that Fire-world behavior is unbroken (the pieces new to Water are gated by the presence of the new fields/modifiers; enemies that don't declare them take no new code paths).

- [ ] **Step 1: Run the full suite**

```
node --test
```

Expected output: all test files pass with zero failures. Key files exercised:
- `tests/EnemyBrain.test.js` — including new `burrow`, `buildSplitChildren`, `tickLifecycle` tests.
- `tests/CombatSystem.test.js` — including `applyCasterSlow`, `tickCasterSlow`, `getCasterSpeedMul`, `applyResist`.
- `tests/WhirlpoolHazard.test.js` — all 9 pure geometry tests.
- `tests/FormSequencer.test.js` — all 9 sequencer tests.
- `tests/Tuning.test.js` — Water constant assertions.
- `tests/BossBrain.test.js` — untouched; existing 4 tests must still pass (FormSequencer sits on top, does not change BossBrain).
- `tests/TriangleHazard.test.js` — untouched; Fire hazard unbroken.

- [ ] **Step 2: Manual playtest checklist (Phaser-coupled items)**

Open `http://localhost:8000` in a portrait mobile viewport (`python3 -m http.server 8000` from the repo root).

```
[ ] Caster slow: enemy with onHitSlow modifier hits the caster → visible movement reduction,
    recovers after 1200ms, never drops below 45% (walk straight, count steps per second).
[ ] Burrow: enemy with burrow movement submerges (fades), reappears near caster with ring
    warning, dashes, then is vulnerable. Hitting it while submerged does nothing.
[ ] splitsOnDeath: enemy with splitsOnDeath modifier spawns 2 smaller children on death;
    children do NOT split again.
[ ] Generational frog: egg hatches after ~3.5s into tadpole, tadpole grows after ~6s into
    adult frog; CONCURRENCY_CAP prevents overflow.
[ ] Whirlpool: boss triggers spawnWhirlpool hook → spiral renders, caster feels pull toward
    center, center zone damages the caster; vortex expires after ~4.5s.
[ ] Form sequencer: multi-form boss HP bar refills each form; transform animation fires
    briefly between forms; fight ends after last form dies; adds clear on transform.
[ ] Resist: boss with resist:0.3 takes visibly less damage per shot than resist:0.
[ ] Elite CC immunity: cast Freeze on enemy with elite:true → no freeze/slow applied.
```

- [ ] **Step 3: Final commit if any last-minute fixes were needed**

If any Phaser-wiring bug was found in playtest and fixed:
```
git add <fixed files>
git commit -m "fix(water): playtest fixes — <brief description>"
```

---

## Summary: Files created / modified

**New:**
- `src/systems/WhirlpoolHazard.js`
- `src/systems/FormSequencer.js`
- `tests/WhirlpoolHazard.test.js`
- `tests/FormSequencer.test.js`

**Modified:**
- `src/data/tuning.js` — Water constants (Task 1)
- `src/systems/CombatSystem.js` — `applyCasterSlow`, `tickCasterSlow`, `getCasterSpeedMul`, `applyResist` (Tasks 2, 3)
- `src/systems/EnemyBrain.js` — `burrow` movement, `buildSplitChildren`, `tickLifecycle`, `LIFECYCLE` (Tasks 4, 5, 6)
- `src/objects/Caster.js` — `slowRemaining`/`slowFactor` fields + `moveBy` slow multiply (Task 2)
- `src/objects/Enemy.js` — elite CC guards, burrow flag side-effects, `_formSeq` field (Tasks 3, 4, 8)
- `src/scenes/GameScene.js` — slow wiring, resist in `hitEnemy`, burrow render, splits on death, lifecycle promotion, whirlpool update/render/force, form sequencer boss wiring (Tasks 2–8)
- `src/scenes/UIScene.js` — per-form HP bar (Task 8)
- `tests/Tuning.test.js` — Water constant assertions (Task 1)
- `tests/CombatSystem.test.js` — slow and resist tests (Tasks 2, 3)
- `tests/EnemyBrain.test.js` — burrow, splitChildren, lifecycle tests (Tasks 4, 5, 6)
