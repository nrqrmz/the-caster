# Air Engine Pieces — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the new engine pieces the Air world needs — caster control-loss (stun/lift/push) with an anti-chain immunity window, the `drain` lifesteal modifier, the `evade` dodge movement, `flying`/`untargetable` flags, the `TornadoHazard` (eye gimmick), a `RitualMeter`, and a meter-driven boss-phase override — with full pure-logic unit test coverage and the Phaser wiring.

**Architecture:** Every decision-making piece lives in `src/systems/` or `src/data/tuning.js` (no Phaser import), exercised by `node --test`. `Caster` grows control-loss state (`stunRemaining`/`liftRemaining`/`ccImmuneRemaining`/`pushX`/`pushY`/`pushRemaining`); `GameScene` applies the new on-hit effects in the two caster overlap handlers and renders/forces the tornado. The shapeshifter engine (`FormSequencer`, `_beginBossTransform`, `_applyBossForm`, per-form HP bar) **already exists** (built for the Dama del Lago) and is reused as-is by Galahad in Plan 3 — no work here. No content (enemy defs, boss defs, wave tables) is added in this plan — that is Plans 2 and 3.

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN), node:test for pure logic.

**Spec:** docs/superpowers/specs/2026-06-17-air-world-design.md
**Depends on:** none (this is the foundation; Plans 2 & 3 depend on it)

## Global Constraints

- No build step, no bundler: native ES modules + Phaser 3 from CDN. (CLAUDE.md)
- Mobile-only, portrait. Logical resolution fixed at 480×854 (`GAME_WIDTH`/`GAME_HEIGHT` in `src/config.js`). Time fields in ms; lower is better.
- Pure/Phaser split: testable logic lives in `src/systems/` or `src/data/` with **no Phaser import** and is covered by `node --test`. `src/scenes/` and `src/objects/` are Phaser-coupled (verified by playtest).
- Texture/color keys are centralized in `src/config.js` (`TEX`, `COLORS`); reference them, never inline a key or hex.
- Tests use `node:test` + `node:assert/strict`. Run a single file with `node --test tests/<file>`; the whole suite with `node --test`.

## Interface Contract (exports this plan introduces; Plans 2 & 3 consume these names verbatim)

`src/data/tuning.js` (new constants):
`CASTER_STUN_MS=300`, `CASTER_LIFT_MS=500`, `CC_IMMUNE_MS=600`, `PUSH_FORCE=220`, `PUSH_MS=250`,
`EVADE_DODGE_EVERY=1400`, `EVADE_DODGE_MS=220`, `EVADE_DODGE_MUL=3.0`,
`TORNADO_RADIUS=130`, `TORNADO_EYE_PULL=0.7`, `TORNADO_EYE_RADIUS_FRAC=0.18`, `TORNADO_ENEMY_PULL=0.25`,
`TORNADO_TELEGRAPH_MS=1100`, `TORNADO_ACTIVE_MS=4500`, `TORNADO_COOLDOWN_MS=4500`,
`RITUAL_FILL_MS=38000`.

`src/systems/CombatSystem.js` (new pure helpers):
`applyCasterCc(state, kind, ms) → boolean` (kind `'stun'|'lift'`; returns false and no-ops if `ccImmuneRemaining>0`),
`tickCasterCc(state, delta)`, `isControlLocked(state) → boolean`,
`applyCasterPush(state, vx, vy, ms)`, `tickCasterPush(state, delta)`, `getCasterPush(state) → {x,y}`,
`applyDrain(entity, heal)` (entity `{hp,maxHp}`; clamps to maxHp).

`src/systems/EnemyBrain.js`: `MOVEMENTS.evade` (movement), `isFlying(def) → boolean`.

`src/systems/SkillTargeting.js`: `chainTargets` skips elements whose `.untargetable` is truthy.

`src/systems/BossBrain.js`: `stepBoss` honors `rt.forcedPhase` (when not null/undefined, overrides the hp-fraction phase pick).

`src/systems/TornadoHazard.js` (new pure module): `isInside(center,radius,pos)`, `forceAt(center,radius,pos,speed)`, `inEye(center,radius,pos)`, `scaleForPhase(phase)`.

`src/systems/RitualMeter.js` (new pure module): `tickRitual(state, dt) → {full}`, `ritualFraction(state) → 0..1`.

`src/objects/Caster.js`: constructor adds the CC/push fields; `moveBy` zeroes input velocity while control-locked and always adds the push velocity; `nearestEnemy` skips enemies whose `_untargetable` is truthy.

---

## Task 1: Air tuning constants

**Files:**
- Modify: `src/data/tuning.js`
- Modify: `tests/Tuning.test.js`

Add all Air-specific knobs to the central tuning module first so every subsequent task imports concrete values.

- [ ] **Step 1: Write failing test** — append to `tests/Tuning.test.js`:

```js
import {
  CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS, PUSH_FORCE, PUSH_MS,
  EVADE_DODGE_EVERY, EVADE_DODGE_MS, EVADE_DODGE_MUL,
  TORNADO_RADIUS, TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC, TORNADO_ENEMY_PULL,
  TORNADO_TELEGRAPH_MS, TORNADO_ACTIVE_MS, TORNADO_COOLDOWN_MS,
  RITUAL_FILL_MS,
} from '../src/data/tuning.js';

test('Air tuning constants are defined and in-range', () => {
  assert.equal(CASTER_STUN_MS, 300);
  assert.equal(CASTER_LIFT_MS, 500);
  assert.equal(CC_IMMUNE_MS, 600);
  assert.ok(PUSH_FORCE > 0);
  assert.ok(PUSH_MS > 0);

  assert.ok(EVADE_DODGE_EVERY > EVADE_DODGE_MS);
  assert.ok(EVADE_DODGE_MUL > 1);

  assert.ok(TORNADO_RADIUS > 0);
  assert.equal(TORNADO_EYE_PULL, 0.7);
  assert.ok(TORNADO_EYE_RADIUS_FRAC > 0 && TORNADO_EYE_RADIUS_FRAC < 1);
  assert.ok(TORNADO_ENEMY_PULL >= 0 && TORNADO_ENEMY_PULL < TORNADO_EYE_PULL);

  assert.ok(RITUAL_FILL_MS > 0);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/Tuning.test.js
```

Expected: `SyntaxError` / `ERR_MODULE_NOT_FOUND` — the named exports do not exist yet.

- [ ] **Step 3: Implement** — append to `src/data/tuning.js`:

```js
// --- Air world (La Torre Montaña) ---

// Caster control-loss (velocidad + desplazamiento). Brief but consequential.
export const CASTER_STUN_MS = 300;   // total control loss (electric discharge)
export const CASTER_LIFT_MS = 500;   // lifted by a small tornado (can't move/dodge)
export const CC_IMMUNE_MS   = 600;   // anti-chain window after a stun/lift expires

// Directional push (onHitPush / gust). Impulse the caster receives on hit.
export const PUSH_FORCE = 220;       // px/sec impulse magnitude
export const PUSH_MS    = 250;       // how long the impulse decays over

// evade movement (dodging duelists). Periodic perpendicular dash.
export const EVADE_DODGE_EVERY = 1400; // ms between dodges
export const EVADE_DODGE_MS    = 220;  // dodge dash duration
export const EVADE_DODGE_MUL   = 3.0;  // dash speed = base speed × this

// Tornado-ojo hazard (the eye is the trap, not the damage — inverse of the whirlpool).
export const TORNADO_RADIUS          = 130;  // px, influence circle
export const TORNADO_EYE_PULL        = 0.7;  // fraction of caster speed pulling toward the eye
export const TORNADO_EYE_RADIUS_FRAC = 0.18; // inner "eye" zone (calm: ~0 pull, no DoT)
export const TORNADO_ENEMY_PULL      = 0.25; // light pull applied to NON-flying enemies (visual + makes `flying` matter)
export const TORNADO_TELEGRAPH_MS    = 1100; // warning before the vortex activates
export const TORNADO_ACTIVE_MS       = 4500; // vortex is live for this long
export const TORNADO_COOLDOWN_MS     = 4500; // gap before it reforms at a new spot

// Ritual meter (nv7 cultist leader). Fills while the leader channels (untargetable).
export const RITUAL_FILL_MS = 38000; // time to fill from empty to full
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/Tuning.test.js
```

Expected: all Tuning tests pass.

- [ ] **Step 5: Commit**

```
git add src/data/tuning.js tests/Tuning.test.js
git commit -m "feat(air): add Air tuning constants to tuning.js"
```

---

## Task 2: Caster control-loss (stun / lift / push) pure helpers

**Files:**
- Modify: `src/systems/CombatSystem.js`
- Modify: `tests/CombatSystem.test.js`

Pure state machine for caster stun/lift (with an anti-chain immunity window) and a decaying directional push. State fields live on the `Caster` instance; the math is here so it is unit-tested.

- [ ] **Step 1: Write failing tests** — append to `tests/CombatSystem.test.js`:

```js
import {
  applyCasterCc, tickCasterCc, isControlLocked,
  applyCasterPush, tickCasterPush, getCasterPush, applyDrain,
} from '../src/systems/CombatSystem.js';
import { CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS } from '../src/data/tuning.js';

function freshCc() {
  return { stunRemaining: 0, liftRemaining: 0, ccImmuneRemaining: 0 };
}

test('applyCasterCc sets stun and returns true on a fresh state', () => {
  const s = freshCc();
  assert.equal(applyCasterCc(s, 'stun', CASTER_STUN_MS), true);
  assert.equal(s.stunRemaining, CASTER_STUN_MS);
  assert.equal(isControlLocked(s), true);
});

test('applyCasterCc sets lift independently of stun', () => {
  const s = freshCc();
  applyCasterCc(s, 'lift', CASTER_LIFT_MS);
  assert.equal(s.liftRemaining, CASTER_LIFT_MS);
  assert.equal(isControlLocked(s), true);
});

test('applyCasterCc is ignored (returns false) while ccImmune is active', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, ccImmuneRemaining: 200 };
  assert.equal(applyCasterCc(s, 'stun', CASTER_STUN_MS), false);
  assert.equal(s.stunRemaining, 0);
  assert.equal(isControlLocked(s), false);
});

test('tickCasterCc decrements stun and arms ccImmune when it expires', () => {
  const s = freshCc();
  applyCasterCc(s, 'stun', 100);
  tickCasterCc(s, 60);
  assert.equal(s.stunRemaining, 40);
  assert.equal(s.ccImmuneRemaining, 0); // not expired yet
  tickCasterCc(s, 60); // expires this frame
  assert.equal(s.stunRemaining, 0);
  assert.equal(s.ccImmuneRemaining, CC_IMMUNE_MS);
  assert.equal(isControlLocked(s), false);
});

test('a second stun is blocked during the immunity window, then allowed after it decays', () => {
  const s = freshCc();
  applyCasterCc(s, 'stun', 50);
  tickCasterCc(s, 60); // stun expires → ccImmune armed
  assert.equal(applyCasterCc(s, 'stun', 300), false); // blocked
  tickCasterCc(s, CC_IMMUNE_MS); // immunity decays to 0
  assert.equal(s.ccImmuneRemaining, 0);
  assert.equal(applyCasterCc(s, 'stun', 300), true); // allowed again
});

test('applyCasterPush sets a decaying impulse; getCasterPush returns it then zero', () => {
  const s = { pushX: 0, pushY: 0, pushRemaining: 0 };
  applyCasterPush(s, 200, 0, 250);
  assert.deepEqual(getCasterPush(s), { x: 200, y: 0 });
  tickCasterPush(s, 250); // fully decays
  assert.equal(s.pushRemaining, 0);
  assert.deepEqual(getCasterPush(s), { x: 0, y: 0 });
});

test('applyDrain heals an entity, clamped to maxHp', () => {
  const e = { hp: 30, maxHp: 50 };
  applyDrain(e, 8);
  assert.equal(e.hp, 38);
  applyDrain(e, 999);
  assert.equal(e.hp, 50); // clamped
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/CombatSystem.test.js
```

Expected: import error — the named exports do not exist yet.

- [ ] **Step 3: Implement** — append to `src/systems/CombatSystem.js`:

```js
import { CC_IMMUNE_MS } from '../data/tuning.js';

// --- Air: caster control-loss (stun/lift) with anti-chain immunity ---
// state: { stunRemaining, liftRemaining, ccImmuneRemaining }  (fields live on Caster)

// Apply a control-loss effect. Returns false (no-op) while the immunity window is up
// so a swarm can't perma-lock the player. kind: 'stun' | 'lift'.
export function applyCasterCc(state, kind, ms) {
  if ((state.ccImmuneRemaining ?? 0) > 0) return false;
  if (kind === 'lift') state.liftRemaining = Math.max(state.liftRemaining ?? 0, ms);
  else state.stunRemaining = Math.max(state.stunRemaining ?? 0, ms);
  return true;
}

export function tickCasterCc(state, delta) {
  const wasLocked = isControlLocked(state);
  if (state.stunRemaining > 0) state.stunRemaining = Math.max(0, state.stunRemaining - delta);
  if (state.liftRemaining > 0) state.liftRemaining = Math.max(0, state.liftRemaining - delta);
  // When control-lock just ended, arm the immunity window.
  if (wasLocked && !isControlLocked(state)) state.ccImmuneRemaining = CC_IMMUNE_MS;
  else if ((state.ccImmuneRemaining ?? 0) > 0) state.ccImmuneRemaining = Math.max(0, state.ccImmuneRemaining - delta);
}

export function isControlLocked(state) {
  return (state.stunRemaining ?? 0) > 0 || (state.liftRemaining ?? 0) > 0;
}

// --- Air: decaying directional push (onHitPush / gust) ---
// state: { pushX, pushY, pushRemaining }
export function applyCasterPush(state, vx, vy, ms) {
  state.pushX = vx;
  state.pushY = vy;
  state.pushRemaining = ms;
}

export function tickCasterPush(state, delta) {
  if ((state.pushRemaining ?? 0) <= 0) return;
  state.pushRemaining = Math.max(0, state.pushRemaining - delta);
  if (state.pushRemaining === 0) { state.pushX = 0; state.pushY = 0; }
}

export function getCasterPush(state) {
  return (state.pushRemaining ?? 0) > 0 ? { x: state.pushX, y: state.pushY } : { x: 0, y: 0 };
}

// --- Air: drain (lifesteal). Heals entity {hp,maxHp}, clamped. ---
export function applyDrain(entity, heal) {
  entity.hp = Math.min(entity.maxHp ?? entity.hp, entity.hp + Math.max(0, heal));
}
```

> Note: the existing `import { CASTER_SLOW_FLOOR } from '../data/tuning.js';` line at the top of CombatSystem.js stays. Add `CC_IMMUNE_MS` to that import instead of a second import line if you prefer one import; either parses.

- [ ] **Step 4: Run to see it pass**

```
node --test tests/CombatSystem.test.js
```

Expected: all CombatSystem tests pass (new + pre-existing).

- [ ] **Step 5: Commit**

```
git add src/systems/CombatSystem.js tests/CombatSystem.test.js
git commit -m "feat(air): caster stun/lift (anti-chain immunity) + push + drain pure helpers"
```

---

## Task 3: Wire caster control-loss into Caster + GameScene

**Files:**
- Modify: `src/objects/Caster.js`
- Modify: `src/scenes/GameScene.js`

`Caster` grows the CC/push fields and `moveBy` honors them; `GameScene` ticks them each frame and applies `onHitStun`/`onHitPush`/`drain` in the two caster overlap handlers (mirroring how `onHitSlow` is already applied). Phaser-coupled — verified by playtest.

- [ ] **Step 1: Add state fields to Caster** — in `src/objects/Caster.js` constructor, after `this.slowFactor = 1;`:

```js
    this.stunRemaining = 0;
    this.liftRemaining = 0;
    this.ccImmuneRemaining = 0;
    this.pushX = 0;
    this.pushY = 0;
    this.pushRemaining = 0;
```

- [ ] **Step 2: Honor CC + push in `moveBy`** — replace the `moveBy` method in `src/objects/Caster.js` with:

```js
  moveBy(vector) {
    const locked = this.stunRemaining > 0 || this.liftRemaining > 0;
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    const baseX = locked ? 0 : vector.x * this.stats.moveSpeed * mul;
    const baseY = locked ? 0 : vector.y * this.stats.moveSpeed * mul;
    const px = this.pushRemaining > 0 ? this.pushX : 0;
    const py = this.pushRemaining > 0 ? this.pushY : 0;
    this.setVelocity(baseX + px, baseY + py);
  }
```

> Note: while lifted/stunned you can still be pushed (you get shoved with no control) — that is the intended feel.

- [ ] **Step 3: Block auto-fire while control-locked** — in `src/objects/Caster.js` `updateAutoAim`, add a guard right after `this._shotTimer -= delta;`:

```js
    if (this.stunRemaining > 0 || this.liftRemaining > 0) return; // no firing while stunned/lifted
```

- [ ] **Step 4: Import + tick in GameScene** — in `src/scenes/GameScene.js`, extend the CombatSystem import:

```js
import {
  applyDamage, applyCasterSlow, tickCasterSlow, applyResist, tryMeleeContact,
  applyCasterCc, tickCasterCc, applyCasterPush, tickCasterPush, applyDrain,
} from '../systems/CombatSystem.js';
```

In `update(time, delta)`, right after the existing `tickCasterSlow(this.caster, delta);` line:

```js
    tickCasterCc(this.caster, delta);
    tickCasterPush(this.caster, delta);
```

- [ ] **Step 5: Apply onHitStun / onHitPush / drain on caster contact** — in `setupCollisions`, in the `caster` vs `enemies` overlap handler, after the existing `onHitSlow` block, add:

```js
      const stun = findModifier(enemy.def, 'onHitStun');
      if (stun) applyCasterCc(this.caster, stun.kind === 'lift' ? 'lift' : 'stun', stun.ms ?? (stun.kind === 'lift' ? 500 : 300));
      const push = findModifier(enemy.def, 'onHitPush');
      if (push) {
        const a = Math.atan2(this.caster.y - enemy.y, this.caster.x - enemy.x);
        applyCasterPush(this.caster, Math.cos(a) * (push.force ?? 220), Math.sin(a) * (push.force ?? 220), push.ms ?? 250);
      }
      const drain = findModifier(enemy.def, 'drain');
      if (drain) applyDrain(enemy, drain.heal ?? 4);
```

- [ ] **Step 6: Apply onHitStun / onHitPush from enemy shots** — in the `caster` vs `enemyShots.group` overlap handler, after the existing `slowFactor` block, add:

```js
      if (shot.stunMs) applyCasterCc(this.caster, shot.liftKind ? 'lift' : 'stun', shot.stunMs);
      if (shot.pushForce) {
        const a = Math.atan2(this.caster.y - shot.y, this.caster.x - shot.x);
        applyCasterPush(this.caster, Math.cos(a) * shot.pushForce, Math.sin(a) * shot.pushForce, shot.pushMs ?? 250);
      }
```

> Note: `shot.stunMs` / `shot.liftKind` / `shot.pushForce` / `shot.pushMs` are projectile fields set by `executeAttack` when an attack carries a `stun`/`lift`/`push` flag (Plan 2 wires the air projectile defs; until then these are simply undefined → no-ops). The drain heal on the shot path is intentionally omitted (drain is a melee/contact mechanic in this world).

- [ ] **Step 7: Caster lift/stun visual** — in `update`, where the caster is processed, add a tint cue (after `this.caster.moveBy(...)`):

```js
    if (this.caster.liftRemaining > 0 || this.caster.stunRemaining > 0) this.caster.setTint(COLORS.lightning);
    else if (this.caster.slowRemaining === 0) this.caster.clearTint();
```

> Note: playtest the tint cue alongside the existing slow tint; ensure the two don't fight (slow uses no tint today, so this is safe).

- [ ] **Step 8: Run full suite and commit**

```
node --test
```

Expected: all tests pass (no regressions; this task is Phaser wiring).

```
git add src/objects/Caster.js src/scenes/GameScene.js
git commit -m "feat(air): wire caster stun/lift/push + drain into Caster.moveBy and GameScene overlaps"
```

---

## Task 4: `evade` movement in EnemyBrain

**Files:**
- Modify: `src/systems/EnemyBrain.js`
- Modify: `tests/EnemyBrain.test.js`

A pure movement: chase/kite toward range, but every `EVADE_DODGE_EVERY` ms perform a quick perpendicular dash (`EVADE_DODGE_MS` at `EVADE_DODGE_MUL`× speed) — making the auto-fire (which aims at the nearest enemy's current position) miss, forcing the player to reposition.

- [ ] **Step 1: Write failing tests** — append to `tests/EnemyBrain.test.js`:

```js
import { EVADE_DODGE_EVERY, EVADE_DODGE_MS, EVADE_DODGE_MUL } from '../src/data/tuning.js';

const evadeCtx = () => ({ self: { x: 0, y: 0 }, target: { x: 200, y: 0 }, speed: 80, dt: 16 });

test('evade: approaches the target when out of range and not dodging', () => {
  const state = {};
  const v = MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state });
  assert.ok(v.x > 0, 'should move toward target on +x');
  assert.ok(Math.abs(v.y) < 1e-6, 'no lateral component when not dodging');
});

test('evade: triggers a perpendicular dash after EVADE_DODGE_EVERY ms', () => {
  const state = {};
  // Accumulate just past the dodge interval in one step.
  const v = MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_EVERY + 1 });
  assert.equal(state.mode, 'dodge');
  // During a dodge the velocity is mostly lateral (perpendicular to the target heading, which is +x → lateral is ±y).
  assert.ok(Math.abs(v.y) > Math.abs(v.x), 'dodge is lateral');
  const mag = Math.hypot(v.x, v.y);
  assert.ok(mag > 80 * (EVADE_DODGE_MUL - 1), `dodge is fast, got ${mag}`);
});

test('evade: returns to approach after the dodge window elapses', () => {
  const state = {};
  MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_EVERY + 1 }); // enter dodge
  MOVEMENTS.evade({ ...evadeCtx(), params: { range: 60 }, state, dt: EVADE_DODGE_MS + 1 });     // dodge ends
  assert.equal(state.mode, 'approach');
});

test('evade: every movement type still returns finite velocity (regression)', () => {
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

Expected: `MOVEMENTS.evade is not a function`.

- [ ] **Step 3: Implement** — add `evade` to the `MOVEMENTS` object in `src/systems/EnemyBrain.js` (place it after `charge`):

```js
  evade({ self, target, speed, dt, params, state }) {
    const range = params?.range ?? 120;
    const every = params?.dodgeEvery ?? EVADE_DODGE_EVERY;
    const dodgeMs = params?.dodgeMs ?? EVADE_DODGE_MS;
    const dodgeMul = params?.dodgeMul ?? EVADE_DODGE_MUL;
    state.mode = state.mode || 'approach';
    state.t = (state.t || 0) + dt;
    const a = angleBetween(self.x, self.y, target.x, target.y);

    if (state.mode === 'approach') {
      if (state.t >= every) {
        state.mode = 'dodge'; state.t = 0;
        state.dir = (state.dir === 1 ? -1 : 1); // alternate dodge sides
      } else {
        // Hold the kite band: approach if far, back off if close, else strafe slowly.
        const d = distance(self.x, self.y, target.x, target.y);
        if (d > range + 20) return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
        if (d < range - 20) return { x: -Math.cos(a) * speed, y: -Math.sin(a) * speed };
        return { x: 0, y: 0 };
      }
    }

    if (state.mode === 'dodge') {
      if (state.t >= dodgeMs) { state.mode = 'approach'; state.t = 0; return { x: 0, y: 0 }; }
      const perp = a + Math.PI / 2;
      const dir = state.dir || 1;
      return { x: Math.cos(perp) * speed * dodgeMul * dir, y: Math.sin(perp) * speed * dodgeMul * dir };
    }

    return { x: 0, y: 0 };
  },
```

Extend the tuning import at the top of `EnemyBrain.js` to include the evade constants:

```js
import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_SURFACE_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS, SPAWN_SAFE_DIST,
  EVADE_DODGE_EVERY, EVADE_DODGE_MS, EVADE_DODGE_MUL,
} from '../data/tuning.js';
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/EnemyBrain.test.js
```

Expected: all EnemyBrain tests pass.

- [ ] **Step 5: Commit**

```
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(air): evade movement — periodic perpendicular dodge dash"
```

---

## Task 5: `flying` flag + helper + tornado enemy-pull guard

**Files:**
- Modify: `src/systems/EnemyBrain.js`
- Modify: `tests/EnemyBrain.test.js`

`isFlying(def)` is a tiny pure helper. Its only consumer is the tornado (Task 7): non-flying enemies get a light pull toward the eye (debris feel + makes `flying` meaningful); flying enemies are unaffected.

- [ ] **Step 1: Write failing test** — append to `tests/EnemyBrain.test.js`:

```js
import { isFlying } from '../src/systems/EnemyBrain.js';

test('isFlying reads the flying flag', () => {
  assert.equal(isFlying({ flying: true }), true);
  assert.equal(isFlying({ flying: false }), false);
  assert.equal(isFlying({}), false);
  assert.equal(isFlying(null), false);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/EnemyBrain.test.js
```

Expected: `isFlying is not a function`.

- [ ] **Step 3: Implement** — append to `src/systems/EnemyBrain.js`:

```js
// PURE. True if the enemy def is a flyer (immune to ground hazards like the tornado).
export function isFlying(def) {
  return !!(def && def.flying);
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/EnemyBrain.test.js
```

- [ ] **Step 5: Commit**

```
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(air): isFlying helper (flag consumed by the tornado enemy-pull guard)"
```

---

## Task 6: `untargetable` flag — skip in auto-aim, lightning chain, and damage

**Files:**
- Modify: `src/objects/Caster.js`
- Modify: `src/systems/SkillTargeting.js`
- Modify: `src/scenes/GameScene.js`
- Modify: `tests/SkillTargeting.test.js`

An enemy flagged `_untargetable` (runtime flag, seeded from `def.untargetable`) is invisible to the auto-fire and Lightning, and takes no damage — used by the nv7 cultist leader while channeling. The pure part is the chain-targeting skip.

- [ ] **Step 1: Write failing test** — append to `tests/SkillTargeting.test.js`:

```js
test('chainTargets skips untargetable enemies', () => {
  const caster = { x: 0, y: 0 };
  const enemies = [
    { x: 10, y: 0, untargetable: true },  // nearest but shielded — must be skipped
    { x: 40, y: 0 },                      // chosen primary
    { x: 70, y: 0 },                      // chain hop
  ];
  const hits = chainTargets(caster, enemies, 100, 3);
  assert.deepEqual(hits, [1, 2]);
});
```

> Note: `chainTargets` is already imported at the top of `tests/SkillTargeting.test.js`. If not, add `import { chainTargets } from '../src/systems/SkillTargeting.js';`.

- [ ] **Step 2: Run to see it fail**

```
node --test tests/SkillTargeting.test.js
```

Expected: the new test fails — index 0 is currently chosen.

- [ ] **Step 3: Implement the skip in chainTargets** — in `src/systems/SkillTargeting.js`, inside the inner `for` loop of `chainTargets`, add a guard as the first line of the loop body (right after `if (used.has(i)) continue;`):

```js
      if (enemies[i].untargetable) continue;
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/SkillTargeting.test.js
```

- [ ] **Step 5: Skip untargetable in auto-aim** — in `src/objects/Caster.js` `nearestEnemy`, add inside the loop after `if (!e.active) continue;`:

```js
      if (e._untargetable) continue;
```

- [ ] **Step 6: Ignore damage to untargetable enemies + filter the lightning list** — in `src/scenes/GameScene.js`:

In `hitEnemy(enemy, damage)`, add as the very first line (before the `_burrowed` guard):

```js
    if (enemy._untargetable) return;
```

In `castLightning` (the method that calls `chainTargets`), ensure the enemy list it builds carries the runtime flag so the pure skip fires. Where it collects live enemies for the chain, map the flag through, e.g.:

```js
    const live = this.enemies.getChildren().filter((e) => e.active).map((e) => {
      e.untargetable = !!e._untargetable; // expose runtime flag to the pure targeter
      return e;
    });
```

> Note: if `castLightning` already passes Enemy instances straight to `chainTargets`, just set `e.untargetable = !!e._untargetable` on them before the call (the pure function only reads `.x`, `.y`, `.untargetable`). Verify by playtest in Plan 3: the channeling leader can't be hit by orbs or Lightning until the ritual bar fills.

- [ ] **Step 7: Run full suite and commit**

```
node --test
```

```
git add src/objects/Caster.js src/systems/SkillTargeting.js src/scenes/GameScene.js tests/SkillTargeting.test.js
git commit -m "feat(air): untargetable flag — skip in auto-aim, lightning chain, and hitEnemy"
```

---

## Task 7: `TornadoHazard` pure module + GameScene integration

**Files:**
- Create: `src/systems/TornadoHazard.js`
- Create: `tests/TornadoHazard.test.js`
- Modify: `src/scenes/GameScene.js`

Mirror `WhirlpoolHazard`, with the key inversion: **the eye is calm (no center DoT)** — the danger is being trapped in a predictable spot. Also exposes a light enemy-pull (skips flyers via Task 5's `isFlying`).

- [ ] **Step 1: Write failing tests** — create `tests/TornadoHazard.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isInside, forceAt, inEye, scaleForPhase } from '../src/systems/TornadoHazard.js';
import { TORNADO_RADIUS, TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC } from '../src/data/tuning.js';

const CENTER = { x: 240, y: 427 };
const R = TORNADO_RADIUS;

test('isInside: true within radius, false outside', () => {
  assert.equal(isInside(CENTER, R, { x: CENTER.x, y: CENTER.y }), true);
  assert.equal(isInside(CENTER, R, { x: CENTER.x + R + 1, y: CENTER.y }), false);
});

test('forceAt: zero at the edge', () => {
  const v = forceAt(CENTER, R, { x: CENTER.x + R, y: CENTER.y }, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3);
});

test('forceAt: directed toward the eye, near-max just outside the eye', () => {
  const pos = { x: CENTER.x + R * 0.5, y: CENTER.y };
  const v = forceAt(CENTER, R, pos, 100);
  assert.ok(v.x < 0, 'pulls left toward center');
  assert.ok(Math.abs(v.y) < 1, 'mostly horizontal');
  const near = { x: CENTER.x + R * (TORNADO_EYE_RADIUS_FRAC + 0.02), y: CENTER.y };
  const vn = forceAt(CENTER, R, near, 100);
  assert.ok(Math.hypot(vn.x, vn.y) > TORNADO_EYE_PULL * 100 * 0.6, 'strong pull just outside the eye');
});

test('forceAt: monotonically grows from edge inward to the eye', () => {
  let prev = 0;
  for (const d of [R * 0.9, R * 0.6, R * 0.3, R * (TORNADO_EYE_RADIUS_FRAC + 0.01)]) {
    const v = forceAt(CENTER, R, { x: CENTER.x + d, y: CENTER.y }, 100);
    const mag = Math.hypot(v.x, v.y);
    assert.ok(mag >= prev - 1e-6, `not monotone at d=${d}`);
    prev = mag;
  }
});

test('inEye: true within the calm eye, and the eye has ZERO pull (inverse of whirlpool DoT)', () => {
  assert.equal(inEye(CENTER, R, CENTER), true);
  const eyePos = { x: CENTER.x + R * TORNADO_EYE_RADIUS_FRAC * 0.5, y: CENTER.y };
  const v = forceAt(CENTER, R, eyePos, 100);
  assert.ok(Math.hypot(v.x, v.y) < 1e-3, 'no pull inside the calm eye');
  assert.equal(inEye(CENTER, R, { x: CENTER.x + R * 0.5, y: CENTER.y }), false);
});

test('scaleForPhase: phase 1 = 1.0, later phases stronger', () => {
  assert.equal(scaleForPhase(1), 1.0);
  assert.ok(scaleForPhase(3) > scaleForPhase(1));
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/TornadoHazard.test.js
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement** — create `src/systems/TornadoHazard.js`:

```js
// src/systems/TornadoHazard.js
// Pure (no Phaser). Force field for the tornado-ojo. Mirror of WhirlpoolHazard, but
// the EYE IS CALM (no center DoT) — the danger is being trapped in a predictable spot.
// All geometry exported and unit-tested.

import { TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC } from '../data/tuning.js';

export function isInside(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius;
}

// True when pos is within the calm inner eye.
export function inEye(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius * TORNADO_EYE_RADIUS_FRAC;
}

// Pull-force vector toward the eye. 0 at the edge (dist=radius) and 0 inside the calm
// eye; grows toward TORNADO_EYE_PULL × speed just outside the eye.
export function forceAt(center, radius, pos, speed) {
  const dx = center.x - pos.x;
  const dy = center.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return { x: 0, y: 0 };
  const eyeR = radius * TORNADO_EYE_RADIUS_FRAC;
  if (dist <= eyeR) return { x: 0, y: 0 }; // calm eye: no pull
  // t = 0 at edge, 1 at the eye boundary.
  const t = (radius - dist) / (radius - eyeR);
  const magnitude = t * TORNADO_EYE_PULL * speed;
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: nx * magnitude, y: ny * magnitude };
}

// Phase scaling: stronger pull / smaller safe space in later boss phases.
export function scaleForPhase(phase) {
  const table = [1.0, 1.0, 1.25, 1.6];
  return table[Math.min(phase, table.length - 1)] ?? 1.0;
}
```

- [ ] **Step 4: Run to see it pass**

```
node --test tests/TornadoHazard.test.js
```

Expected: all TornadoHazard tests pass.

- [ ] **Step 5: Wire TornadoHazard into GameScene** — in `src/scenes/GameScene.js`:

Add the import (next to the WhirlpoolHazard import):

```js
import { isInside as inTornado, forceAt as tornadoForce, inEye as inTornadoEye, scaleForPhase as tornadoPhase } from '../systems/TornadoHazard.js';
import {
  TORNADO_RADIUS, TORNADO_ACTIVE_MS, TORNADO_COOLDOWN_MS, TORNADO_TELEGRAPH_MS, TORNADO_ENEMY_PULL,
} from '../data/tuning.js';
```

> Note: aliased imports avoid colliding with the whirlpool's `isInside`/`forceAt`/`inEye`/`scaleForPhase` already imported. `isFlying` is exported by EnemyBrain — extend the existing EnemyBrain import in GameScene to include `isFlying`.

Add `this.tornado = null;` and `this.tornadoGfx = null;` in `create()` (near `this.whirlpool = null;`).

Add the `spawnTornado` hook inside `runBossHook(boss, hook)`:

```js
    if (hook === 'spawnTornado') {
      const phase = typeof boss._tornadoPhase === 'number' ? boss._tornadoPhase : 1;
      this.tornado = {
        center: { x: Phaser.Math.Between(80, GAME_WIDTH - 80), y: Phaser.Math.Between(120, GAME_HEIGHT - 160) },
        radius: TORNADO_RADIUS,
        phase,
        mode: 'telegraph',
        t: TORNADO_TELEGRAPH_MS,
      };
    }
```

Add the `updateTornado` method:

```js
  updateTornado(delta) {
    if (!this.tornado) return;
    const w = this.tornado;
    w.t -= delta;
    if (!this.tornadoGfx) this.tornadoGfx = this.add.graphics().setDepth(7);
    this.tornadoGfx.clear();

    if (w.mode === 'telegraph') {
      this.tornadoGfx.lineStyle(2, COLORS.ash, 0.5);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, w.radius);
      if (w.t <= 0) { w.mode = 'active'; w.t = TORNADO_ACTIVE_MS; }
      return;
    }

    if (w.mode === 'active') {
      const r = w.radius * tornadoPhase(w.phase);
      this.tornadoGfx.lineStyle(3, COLORS.ash, 0.75);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, r);
      this.tornadoGfx.lineStyle(2, COLORS.lightning, 0.6);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, r * 0.5);

      // Pull the caster toward the eye (full strength).
      if (this.caster && this.caster.hp > 0 && inTornado(w.center, r, this.caster)) {
        const f = tornadoForce(w.center, r, this.caster, this.stats.moveSpeed);
        this.caster.x = Phaser.Math.Clamp(this.caster.x + f.x * (delta / 1000), 0, GAME_WIDTH);
        this.caster.y = Phaser.Math.Clamp(this.caster.y + f.y * (delta / 1000), 0, GAME_HEIGHT);
      }
      // Light pull on NON-flying enemies (debris feel; flyers are immune).
      for (const e of this.enemies.getChildren()) {
        if (!e.active || isFlying(e.def)) continue;
        if (!inTornado(w.center, r, e)) continue;
        const ef = tornadoForce(w.center, r, e, e.def.speed * TORNADO_ENEMY_PULL);
        e.x += ef.x * (delta / 1000);
        e.y += ef.y * (delta / 1000);
      }

      if (w.t <= 0) { w.mode = 'cooldown'; w.t = TORNADO_COOLDOWN_MS; }
      return;
    }

    if (w.mode === 'cooldown') {
      if (w.t <= 0) this.tornado = null; // boss re-triggers via the spawnTornado hook
    }
  }
```

Call `this.updateTornado(delta);` in `update()` right after `this.updateWhirlpool(delta);`.

In `checkPhaseCleared`, alongside the existing `this.whirlpool = null;` cleanup, add:

```js
      this.tornado = null;
      if (this.tornadoGfx) this.tornadoGfx.clear();
```

> Note: the spiral/funnel visual is a playtest item; the force math is unit-tested. Verify by playtest in Plan 3 (the Elemental de Tormenta): the eye drags you to a predictable spot, you can fight out of it, and flyers are not dragged.

- [ ] **Step 6: Run full suite and commit**

```
node --test
```

```
git add src/systems/TornadoHazard.js tests/TornadoHazard.test.js src/scenes/GameScene.js
git commit -m "feat(air): TornadoHazard pure module (calm eye) + GameScene force/render/enemy-pull"
```

---

## Task 8: Meter-driven boss phase (`forcedPhase`) + `RitualMeter`

**Files:**
- Modify: `src/systems/BossBrain.js`
- Modify: `tests/BossBrain.test.js`
- Create: `src/systems/RitualMeter.js`
- Create: `tests/RitualMeter.test.js`

`stepBoss` gains an `rt.forcedPhase` override so a boss can advance phases by an external signal (the ritual bar filling) instead of by HP. `RitualMeter` is the pure fill timer. GameScene wiring lives in Plan 3 (the leader fight), but the engine + tests land here.

- [ ] **Step 1: Write failing test for forcedPhase** — append to `tests/BossBrain.test.js`:

```js
import { stepBoss } from '../src/systems/BossBrain.js';

test('stepBoss: rt.forcedPhase overrides the hp-fraction phase pick', () => {
  const def = { movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
    { from: 0.0, sequence: [{ do: 'shootStraight', dur: 100 }] },
  ] };
  // hpFrac is full (1.0) → without an override this picks phase 0.
  const rt = { phaseIndex: -1, stepIndex: 0, stepTimer: 0, fired: false, forcedPhase: 1 };
  const out = stepBoss(def, rt, 1.0, 16);
  assert.equal(out.phaseIndex, 1, 'forcedPhase wins over hpFrac');
});

test('stepBoss: forcedPhase null/undefined falls back to hp-fraction pick (regression)', () => {
  const def = { movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
    { from: 0.5, sequence: [{ do: 'wait', dur: 100 }] },
  ] };
  const rt = { phaseIndex: -1, stepIndex: 0, stepTimer: 0, fired: false };
  assert.equal(stepBoss(def, rt, 1.0, 16).phaseIndex, 0);
  const rt2 = { phaseIndex: -1, stepIndex: 0, stepTimer: 0, fired: false };
  assert.equal(stepBoss(def, rt2, 0.4, 16).phaseIndex, 1);
});
```

- [ ] **Step 2: Run to see it fail**

```
node --test tests/BossBrain.test.js
```

Expected: the forcedPhase test fails (override not honored yet).

- [ ] **Step 3: Implement forcedPhase** — in `src/systems/BossBrain.js`, in `stepBoss`, change the phase-pick line:

```js
  const pi = (rt.forcedPhase != null)
    ? Math.max(0, Math.min(rt.forcedPhase, phases.length - 1))
    : (phases.length ? activePhase(phases, hpFrac) : 0);
```

(Replaces the existing `const pi = phases.length ? activePhase(phases, hpFrac) : 0;`.)

- [ ] **Step 4: Run to see it pass**

```
node --test tests/BossBrain.test.js
```

- [ ] **Step 5: Write failing tests for RitualMeter** — create `tests/RitualMeter.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickRitual, ritualFraction } from '../src/systems/RitualMeter.js';
import { RITUAL_FILL_MS } from '../src/data/tuning.js';

test('tickRitual fills over time and reports full once filled', () => {
  const s = { filled: 0, total: RITUAL_FILL_MS };
  let r = tickRitual(s, RITUAL_FILL_MS / 2);
  assert.equal(r.full, false);
  assert.ok(Math.abs(ritualFraction(s) - 0.5) < 1e-6);
  r = tickRitual(s, RITUAL_FILL_MS); // overshoot
  assert.equal(r.full, true);
  assert.equal(ritualFraction(s), 1);
});

test('tickRitual stays full and clamps fraction at 1', () => {
  const s = { filled: RITUAL_FILL_MS, total: RITUAL_FILL_MS };
  const r = tickRitual(s, 1000);
  assert.equal(r.full, true);
  assert.equal(ritualFraction(s), 1);
});

test('ritualFraction defaults total when missing', () => {
  const s = { filled: 0 };
  assert.equal(ritualFraction(s), 0);
});
```

- [ ] **Step 6: Run to see it fail**

```
node --test tests/RitualMeter.test.js
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 7: Implement RitualMeter** — create `src/systems/RitualMeter.js`:

```js
// src/systems/RitualMeter.js
// Pure (no Phaser). The nv7 ritual bar: fills while the cultist leader channels.
// state: { filled, total }  (ms). When full, the leader becomes targetable and fights.

import { RITUAL_FILL_MS } from '../data/tuning.js';

export function tickRitual(state, dt) {
  const total = state.total ?? RITUAL_FILL_MS;
  state.total = total;
  state.filled = Math.min(total, (state.filled ?? 0) + dt);
  return { full: state.filled >= total };
}

export function ritualFraction(state) {
  const total = state.total ?? RITUAL_FILL_MS;
  return Math.max(0, Math.min(1, (state.filled ?? 0) / total));
}
```

- [ ] **Step 8: Run to see it pass + commit**

```
node --test tests/RitualMeter.test.js
node --test
```

Expected: all tests pass.

```
git add src/systems/BossBrain.js tests/BossBrain.test.js src/systems/RitualMeter.js tests/RitualMeter.test.js
git commit -m "feat(air): meter-driven boss phase (forcedPhase) + RitualMeter pure timer"
```

---

## Done

After Task 8, the Air engine is complete and fully unit-tested. Plans 2 (roster/waves) and 3 (bosses) consume the Interface Contract above. The shapeshifter (Galahad) needs no engine work — `FormSequencer` + `_beginBossTransform`/`_applyBossForm` already exist; Plan 3 only adds form data and the corpse/burn transition flavor.
