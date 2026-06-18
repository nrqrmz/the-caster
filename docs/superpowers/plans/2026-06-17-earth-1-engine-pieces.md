# Earth World — Engine Pieces Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three new engine pieces the Earth world needs — `root` (caster immobilize that keeps the cast), `mutateOnDeath` (modifier that spawns an entity/hazard on death), and `transmute` (a homing bolt that converts a friendly captive minion into a beast) — with pure logic under `node --test` and exact Phaser wiring.

**Architecture:** Follows the project's pure/Phaser split (see `CLAUDE.md`). Decision logic goes into pure modules (`src/systems/CombatSystem.js`, `src/systems/EnemyBrain.js`) tested with `node:test`; the scene (`src/scenes/GameScene.js`) and `src/objects/Caster.js` consume them. New pieces mirror the Air-world precedent (`stun`/`lift`/`drain`/`evade`), which already exists and is the template.

**Tech Stack:** Vanilla ES modules, Phaser 3 (CDN, runtime only), `node:test` + `node:assert/strict` for pure logic. No bundler, no new deps.

## Global Constraints

- No build step, no bundler, no npm packages in the game runtime (ES modules + Phaser from CDN). — verbatim from spec §0 / `CLAUDE.md`.
- Pure logic (testable) lives in `src/systems/` and `src/data/` with **no Phaser import**; Phaser-coupled code lives in `src/scenes/` and `src/objects/`. — `CLAUDE.md`.
- Texture/color keys are centralized in `src/config.js` (`TEX`, `COLORS`); never inline a key string or hex. — `CLAUDE.md`.
- Tests use `node:test` + `node:assert/strict`. Run with `node --test` (alias `npm test`).
- `root` **keeps the cast**: it blocks movement but the caster keeps auto-firing and casting (spec §1, §2.1). This is the one hard behavioral difference vs Air's `stun`/`lift`.
- `root` is **telegraphed and anti-chained**: after a root expires, the shared `CC_IMMUNE_MS` window blocks the next root/stun/lift (spec §2.1).
- `transmute` is **interruptible**: if the captive dies before the bolt arrives, the bolt fizzles (spec §2.2).

---

### Task 1: `root` — pure caster CC logic

Add a `root` crowd-control state to the pure `CombatSystem` CC machinery, mirroring `stun`/`lift` but participating in movement-lock (not cast-lock).

**Files:**
- Modify: `src/data/tuning.js` (add `CASTER_ROOT_MS` next to the control-loss block ~lines 81-84)
- Modify: `src/systems/CombatSystem.js` (extend `applyCasterCc`/`tickCasterCc`; add `isMovementLocked`; ~lines 56-74)
- Test: `tests/CombatSystem.test.js` (add a `root` test block after the existing CC tests ~line 156)

**Interfaces:**
- Consumes: `CC_IMMUNE_MS` (existing, `tuning.js`).
- Produces:
  - `CASTER_ROOT_MS: number` (tuning constant, default `800`).
  - `applyCasterCc(state, kind, ms)` now accepts `kind === 'root'` → sets `state.rootRemaining = Math.max(state.rootRemaining ?? 0, ms)`; still returns `false` during the immunity window.
  - `tickCasterCc(state, delta)` now also decrements `state.rootRemaining` and arms `ccImmuneRemaining` when movement-lock ends.
  - `isMovementLocked(state): boolean` → `stun || lift || root` (used by movement gate + tick arming).
  - `isControlLocked(state)` unchanged: `stun || lift` (the cast-lock set — root is NOT in it, so the caster keeps firing while rooted).

- [ ] **Step 1: Write the failing tests**

Add to `tests/CombatSystem.test.js` (after the existing immunity-window test ~line 156). The import line for CC constants already exists (`CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS`) — extend it to add `CASTER_ROOT_MS`, and extend the CC import to add `isMovementLocked`:

```js
import {
  applyCasterCc, tickCasterCc, isControlLocked, isMovementLocked,
  applyCasterPush, tickCasterPush, getCasterPush, applyDrain,
} from '../src/systems/CombatSystem.js';
import { CASTER_STUN_MS, CASTER_LIFT_MS, CC_IMMUNE_MS, CASTER_ROOT_MS } from '../src/data/tuning.js';
```

(If those two `import {...}` lines already list the other names, just add `isMovementLocked` and `CASTER_ROOT_MS` to them — do not duplicate the import.)

Then add the tests:

```js
test('applyCasterCc root sets rootRemaining and returns true', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  assert.equal(applyCasterCc(s, 'root', CASTER_ROOT_MS), true);
  assert.equal(s.rootRemaining, CASTER_ROOT_MS);
});

test('root locks movement but NOT control (caster keeps casting while rooted)', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 300);
  assert.equal(isMovementLocked(s), true);  // can't move
  assert.equal(isControlLocked(s), false);  // can still cast/fire
});

test('tickCasterCc decrements root and arms ccImmune when it expires', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 100);
  tickCasterCc(s, 60);
  assert.equal(s.rootRemaining, 40);
  assert.equal(s.ccImmuneRemaining, 0); // not expired yet
  tickCasterCc(s, 60); // expires this frame
  assert.equal(s.rootRemaining, 0);
  assert.equal(s.ccImmuneRemaining, CC_IMMUNE_MS);
  assert.equal(isMovementLocked(s), false);
});

test('a root is blocked during the anti-chain immunity window', () => {
  const s = { stunRemaining: 0, liftRemaining: 0, rootRemaining: 0, ccImmuneRemaining: 0 };
  applyCasterCc(s, 'root', 50);
  tickCasterCc(s, 60); // root expires → ccImmune armed
  assert.equal(applyCasterCc(s, 'root', 300), false); // blocked
  tickCasterCc(s, CC_IMMUNE_MS); // immunity decays
  assert.equal(applyCasterCc(s, 'root', 300), true); // allowed again
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/CombatSystem.test.js`
Expected: FAIL — `isMovementLocked` is not exported (`SyntaxError: ... does not provide an export named 'isMovementLocked'`) and `CASTER_ROOT_MS` is `undefined`.

- [ ] **Step 3: Add the tuning constant**

In `src/data/tuning.js`, add to the control-loss block (after `export const CC_IMMUNE_MS = 600;`, ~line 84):

```js
export const CASTER_ROOT_MS  = 800;   // legs rooted (raíces/lodo): can't move, CAN still cast
```

- [ ] **Step 4: Extend CombatSystem**

In `src/systems/CombatSystem.js`, replace `applyCasterCc`, `tickCasterCc`, and `isControlLocked` (~lines 56-74) with:

```js
export function applyCasterCc(state, kind, ms) {
  if ((state.ccImmuneRemaining ?? 0) > 0) return false;
  if (kind === 'lift') state.liftRemaining = Math.max(state.liftRemaining ?? 0, ms);
  else if (kind === 'root') state.rootRemaining = Math.max(state.rootRemaining ?? 0, ms);
  else state.stunRemaining = Math.max(state.stunRemaining ?? 0, ms);
  return true;
}

export function tickCasterCc(state, delta) {
  const wasLocked = isMovementLocked(state);
  if (state.stunRemaining > 0) state.stunRemaining = Math.max(0, state.stunRemaining - delta);
  if (state.liftRemaining > 0) state.liftRemaining = Math.max(0, state.liftRemaining - delta);
  if (state.rootRemaining > 0) state.rootRemaining = Math.max(0, state.rootRemaining - delta);
  // When movement-lock just ended, arm the immunity window.
  if (wasLocked && !isMovementLocked(state)) state.ccImmuneRemaining = CC_IMMUNE_MS;
  else if ((state.ccImmuneRemaining ?? 0) > 0) state.ccImmuneRemaining = Math.max(0, state.ccImmuneRemaining - delta);
}

// stun/lift remove the cast; root does NOT (caster keeps firing while rooted).
export function isControlLocked(state) {
  return (state.stunRemaining ?? 0) > 0 || (state.liftRemaining ?? 0) > 0;
}

// stun/lift/root all block movement; used by Caster.moveBy and the tick's anti-chain arming.
export function isMovementLocked(state) {
  return (state.stunRemaining ?? 0) > 0 || (state.liftRemaining ?? 0) > 0 || (state.rootRemaining ?? 0) > 0;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/CombatSystem.test.js`
Expected: PASS — all CC tests (existing stun/lift + new root) green. The existing stun/lift tests still pass because `isMovementLocked` is a superset of the old `isControlLocked` for stun-only/lift-only states.

- [ ] **Step 6: Run the full suite (regression)**

Run: `node --test`
Expected: PASS — full suite green (no behavior change for Fire/Water/Air; `root` is additive).

- [ ] **Step 7: Commit**

```bash
git add src/data/tuning.js src/systems/CombatSystem.js tests/CombatSystem.test.js
git commit -m "feat(earth): root caster CC — pure logic (keeps cast, anti-chained)"
```

---

### Task 2: `root` — Caster + GameScene wiring

Wire the pure `root` state into the live game: the caster stops moving while rooted (but keeps firing), and enemy attacks/zones can apply it via the same `stun`/`lift` plumbing. Phaser-coupled → verified by playtest.

**Files:**
- Modify: `src/objects/Caster.js` (constructor ~line 21; `moveBy` ~line 31)
- Modify: `src/scenes/GameScene.js` (imports ~line 20; contact handler ~line 142; shot handler ~line 165; `executeAttack` shot flags ~line 753; `lobAoe` zone ~line 674; control-lock tint ~line 925; zone CC application ~line 1324)

**Interfaces:**
- Consumes: `applyCasterCc(state, 'root', ms)`, `CASTER_ROOT_MS` (from Task 1).
- Produces: a rooted caster has `caster.rootRemaining > 0`; movement is zeroed in `moveBy`; auto-fire is unaffected. Enemy attacks carry `root: true` (+ optional `rootMs`); shots carry `shot.rootMs`; zones carry `casterRootMs`; the `onHitRoot` modifier `{ type: 'onHitRoot', ms }` applies root on contact.

- [ ] **Step 1: Add `rootRemaining` to the Caster constructor**

In `src/objects/Caster.js`, after `this.liftRemaining = 0;` (~line 20):

```js
    this.rootRemaining = 0;
```

- [ ] **Step 2: Block movement while rooted (keep the cast)**

In `src/objects/Caster.js`, in `moveBy` (~line 31), extend the `locked` check to include root:

```js
  moveBy(vector) {
    const locked = this.stunRemaining > 0 || this.liftRemaining > 0 || this.rootRemaining > 0;
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    const baseX = locked ? 0 : vector.x * this.stats.moveSpeed * mul;
    const baseY = locked ? 0 : vector.y * this.stats.moveSpeed * mul;
    const px = this.pushRemaining > 0 ? this.pushX : 0;
    const py = this.pushRemaining > 0 ? this.pushY : 0;
    this.setVelocity(baseX + px, baseY + py);
  }
```

Do **NOT** touch `updateAutoAim` (~line 42): its `if (this.stunRemaining > 0 || this.liftRemaining > 0) return;` must stay as-is so the caster keeps auto-firing while rooted.

- [ ] **Step 3: Import the root tuning constant in GameScene**

In `src/scenes/GameScene.js`, find the `tuning.js` import that includes `CASTER_STUN_MS, CASTER_LIFT_MS` and add `CASTER_ROOT_MS` to it. Example (adjust to the actual existing import line):

```js
import { /* ...existing... */ CASTER_STUN_MS, CASTER_LIFT_MS, CASTER_ROOT_MS } from '../data/tuning.js';
```

- [ ] **Step 4: Apply root on contact hit (onHitRoot modifier)**

In `src/scenes/GameScene.js`, in the `caster`×`enemies` overlap handler, after the `onHitStun` block (~line 142):

```js
      const root = findModifier(enemy.def, 'onHitRoot');
      if (root) applyCasterCc(this.caster, 'root', root.ms ?? CASTER_ROOT_MS);
```

- [ ] **Step 5: Apply root on shot hit**

In `src/scenes/GameScene.js`, in the `caster`×`enemyShots` overlap handler, after the `shot.stunMs` line (~line 165):

```js
      if (shot.rootMs) applyCasterCc(this.caster, 'root', shot.rootMs);
```

- [ ] **Step 6: Copy the root flag onto fired shots**

In `src/scenes/GameScene.js`, in `executeAttack`, in the projectile loop after the stun/lift flag block (~line 754):

```js
      if (att.root) shot.rootMs = att.rootMs ?? CASTER_ROOT_MS;
```

- [ ] **Step 7: Support root on lobAoe zones**

In `src/scenes/GameScene.js`, in `executeAttack`'s `lobAoe` branch (~line 674-675), add a `casterRootMs` field to the `spawnZone({...})` call:

```js
        casterLiftMs: att.lift ? CASTER_LIFT_MS : 0,
        casterStunMs: att.stun ? CASTER_STUN_MS : 0,
        casterRootMs: att.root ? (att.rootMs ?? CASTER_ROOT_MS) : 0,
```

- [ ] **Step 8: Apply root from zones**

In `src/scenes/GameScene.js`, find where zones apply `z.casterLiftMs`/`z.casterStunMs` to the caster (~line 1324). Add a root line alongside:

```js
        if (z.casterRootMs) applyCasterCc(this.caster, 'root', z.casterRootMs);
```

- [ ] **Step 9: Tint feedback while rooted**

In `src/scenes/GameScene.js`, in the update loop where the control-lock tint is set (~line 925), include root so the player gets feedback:

```js
    if (this.caster.liftRemaining > 0 || this.caster.stunRemaining > 0 || this.caster.rootRemaining > 0) this.caster.setTint(COLORS.poison);
    else if (this.caster.slowRemaining === 0) this.caster.clearTint();
```

(`tickCasterCc(this.caster, delta)` at ~line 915 already decrements `rootRemaining` — no change needed there.)

- [ ] **Step 10: Run the full suite (regression)**

Run: `node --test`
Expected: PASS — pure suite unaffected by Phaser wiring.

- [ ] **Step 11: Manual playtest**

Run: `python3 -m http.server 8000`, open `http://localhost:8000` in a portrait mobile viewport. Temporarily add `onHitRoot` to a test enemy (or wait for Plan 2's Zarza). Verify: when rooted, the caster freezes in place, the auto-fire orbs **keep firing**, the poison tint shows, movement resumes after ~0.8s, and a second root immediately after is ignored (anti-chain window).

- [ ] **Step 12: Commit**

```bash
git add src/objects/Caster.js src/scenes/GameScene.js
git commit -m "feat(earth): wire root into Caster + GameScene (contact/shot/zone)"
```

---

### Task 3: `mutateOnDeath` — pure resolver

A pure normalizer that reads a `mutateOnDeath` modifier off an enemy def and returns what to spawn on death — either an enemy (`spawnType`) or a hazard zone. Mirrors `findModifier` usage; testable without Phaser.

**Files:**
- Modify: `src/systems/EnemyBrain.js` (add `resolveMutateOnDeath` near `buildSplitChildren` ~line 273; export it)
- Test: `tests/EnemyBrain.test.js` (add a test block; if the file doesn't exist, create it with the standard header)

**Interfaces:**
- Consumes: `findModifier(def, type)` (existing in `EnemyBrain.js`).
- Produces: `resolveMutateOnDeath(def): null | { kind: 'enemy', spawnType: string, count: number } | { kind: 'zone', radius: number, dps: number, duration: number }`.

- [ ] **Step 1: Write the failing tests**

In `tests/EnemyBrain.test.js`, add (create the file with this header if missing):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMutateOnDeath } from '../src/systems/EnemyBrain.js';

test('resolveMutateOnDeath returns null when no modifier', () => {
  assert.equal(resolveMutateOnDeath({ modifiers: [] }), null);
  assert.equal(resolveMutateOnDeath({}), null);
});

test('resolveMutateOnDeath resolves an enemy spawn (lobo -> fleeing human)', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', spawnType: 'cautivo_huye', count: 1 }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'enemy', spawnType: 'cautivo_huye', count: 1 });
});

test('resolveMutateOnDeath resolves a hazard zone (fungus -> spore cloud)', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', zone: { radius: 50, dps: 18, duration: 2500 } }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'zone', radius: 50, dps: 18, duration: 2500 });
});

test('resolveMutateOnDeath defaults count to 1 for enemy spawns', () => {
  const def = { modifiers: [{ type: 'mutateOnDeath', spawnType: 'lobo' }] };
  assert.deepEqual(resolveMutateOnDeath(def), { kind: 'enemy', spawnType: 'lobo', count: 1 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `resolveMutateOnDeath` is not exported.

- [ ] **Step 3: Implement the resolver**

In `src/systems/EnemyBrain.js`, near `buildSplitChildren` (~line 273), add and export:

```js
// Normalizes a `mutateOnDeath` modifier into a spawn directive.
// Returns null, an enemy spawn { kind:'enemy', spawnType, count }, or a hazard { kind:'zone', radius, dps, duration }.
export function resolveMutateOnDeath(def) {
  const m = findModifier(def, 'mutateOnDeath');
  if (!m) return null;
  if (m.zone) {
    return { kind: 'zone', radius: m.zone.radius ?? 50, dps: m.zone.dps ?? 18, duration: m.zone.duration ?? 2500 };
  }
  if (m.spawnType) {
    return { kind: 'enemy', spawnType: m.spawnType, count: m.count ?? 1 };
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (regression)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(earth): resolveMutateOnDeath pure resolver"
```

---

### Task 4: `mutateOnDeath` — GameScene wiring

Spawn the resolved entity/zone when an enemy with `mutateOnDeath` dies. Mirrors the `splitsOnDeath` block in `onEnemyDeath`. Phaser-coupled → playtest.

**Files:**
- Modify: `src/scenes/GameScene.js` (`onEnemyDeath` ~line 539, after the `splitsOnDeath` loop; ensure `resolveMutateOnDeath` is imported from `EnemyBrain.js`)

**Interfaces:**
- Consumes: `resolveMutateOnDeath(def)` (Task 3); existing `scaleEnemyDef`, `ENEMY_TYPES`, `CONCURRENCY_CAP`, `new Enemy(...)`, `this.spawnZone(...)`.
- Produces: an enemy that declares `mutateOnDeath` leaves a beast/human or a poison zone at its corpse on death.

- [ ] **Step 1: Import the resolver**

In `src/scenes/GameScene.js`, add `resolveMutateOnDeath` to the existing import from `../systems/EnemyBrain.js` (the one that already imports `findModifier`, `buildSplitChildren`, `summonSlots`, etc.):

```js
import { /* ...existing... */ buildSplitChildren, resolveMutateOnDeath, summonSlots } from '../systems/EnemyBrain.js';
```

- [ ] **Step 2: Spawn on death**

In `src/scenes/GameScene.js`, at the end of `onEnemyDeath` (after the `splitsOnDeath` loop, ~line 539, before the closing `}`):

```js
    const mutate = resolveMutateOnDeath(enemy.def);
    if (mutate && !enemy._mutated) {
      enemy._mutated = true; // guard: never recurse
      if (mutate.kind === 'zone') {
        this.spawnZone({
          x: enemy.x, y: enemy.y,
          radius: mutate.radius, duration: mutate.duration,
          casterDps: mutate.dps,
          color: COLORS.poison, style: 'fire',
        });
      } else if (mutate.kind === 'enemy' && this.enemies.countActive(true) < CONCURRENCY_CAP) {
        const def = ENEMY_TYPES[mutate.spawnType];
        if (def) {
          const e = new Enemy(this, enemy.x, enemy.y, scaleEnemyDef(def, this.diff));
          this.enemies.add(e);
          if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
        }
      }
    }
```

- [ ] **Step 3: Run the full suite (regression)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Manual playtest**

Run the server (Task 2 step 11). Add a temporary test enemy with `modifiers: [{ type: 'mutateOnDeath', zone: { radius: 50, dps: 18, duration: 2500 } }]` (or wait for Plan 2's Hongo Esporario). Kill it; verify a poison zone appears at the corpse and the corpse enemy is gone. Repeat with `{ type: 'mutateOnDeath', spawnType: 'villager' }` and verify one enemy spawns in place.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(earth): mutateOnDeath spawns entity/zone in onEnemyDeath"
```

---

### Task 5: `transmute` — pure target selection + result map

The signature mechanic's pure core: choose which friendly captive a transmute bolt should hunt, and map a captive to its beast form. No Phaser.

**Files:**
- Modify: `src/systems/EnemyBrain.js` (add `selectTransmuteTarget` + `transmuteBeastKey`; export both)
- Test: `tests/EnemyBrain.test.js` (add a test block)

**Interfaces:**
- Produces:
  - `selectTransmuteTarget(source, candidates): object | null` — `source = { x, y }`; `candidates` = array of enemy-like `{ x, y, active, def, _transmuteLocked }`. Returns the nearest `active`, captive (`def.transmuteTo` truthy), not-already-locked candidate, or `null`.
  - `transmuteBeastKey(captiveDef): string | null` — returns `captiveDef.transmuteTo ?? null`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/EnemyBrain.test.js`:

```js
import { selectTransmuteTarget, transmuteBeastKey } from '../src/systems/EnemyBrain.js';

const cap = (x, y, extra = {}) => ({ x, y, active: true, def: { transmuteTo: 'lobo' }, _transmuteLocked: false, ...extra });

test('selectTransmuteTarget picks the nearest active captive', () => {
  const near = cap(10, 0);
  const far = cap(100, 0);
  const chosen = selectTransmuteTarget({ x: 0, y: 0 }, [far, near]);
  assert.equal(chosen, near);
});

test('selectTransmuteTarget skips inactive, non-captive, and already-locked candidates', () => {
  const inactive = cap(5, 0, { active: false });
  const notCaptive = cap(6, 0, { def: {} });
  const locked = cap(7, 0, { _transmuteLocked: true });
  const valid = cap(50, 0);
  const chosen = selectTransmuteTarget({ x: 0, y: 0 }, [inactive, notCaptive, locked, valid]);
  assert.equal(chosen, valid);
});

test('selectTransmuteTarget returns null when no valid candidate', () => {
  assert.equal(selectTransmuteTarget({ x: 0, y: 0 }, []), null);
  assert.equal(selectTransmuteTarget({ x: 0, y: 0 }, [cap(1, 1, { active: false })]), null);
});

test('transmuteBeastKey returns the captive def transmuteTo, or null', () => {
  assert.equal(transmuteBeastKey({ transmuteTo: 'lobo' }), 'lobo');
  assert.equal(transmuteBeastKey({}), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/EnemyBrain.test.js`
Expected: FAIL — `selectTransmuteTarget`/`transmuteBeastKey` not exported.

- [ ] **Step 3: Implement**

In `src/systems/EnemyBrain.js`, add and export (near `resolveMutateOnDeath` from Task 3):

```js
// Picks the nearest valid friendly captive for a transmute bolt to hunt.
// A valid candidate is active, captive (def.transmuteTo set), and not already locked by another bolt.
export function selectTransmuteTarget(source, candidates) {
  let best = null;
  let bestD = Infinity;
  for (const c of candidates || []) {
    if (!c || !c.active || !c.def || !c.def.transmuteTo || c._transmuteLocked) continue;
    const dx = c.x - source.x;
    const dy = c.y - source.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function transmuteBeastKey(captiveDef) {
  return (captiveDef && captiveDef.transmuteTo) || null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/EnemyBrain.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (regression)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/systems/EnemyBrain.js tests/EnemyBrain.test.js
git commit -m "feat(earth): transmute target selection + beast map (pure)"
```

---

### Task 6: `transmute` — GameScene wiring (bolt + swap)

Special-case `att.type === 'transmute'` in `executeAttack`: pick a captive, fire a homing bolt at it, steer the bolt every frame, and on arrival swap the captive into its beast. If the captive dies first, fizzle the bolt. Phaser-coupled → playtest.

**Files:**
- Modify: `src/scenes/GameScene.js` (import transmute helpers; `executeAttack` special-case near the `summon` branch ~line 704; the `caster`×`enemyShots` overlap ignore guard ~line 159; new `steerTransmuteShots(delta)` method near `steerHomingShots` ~line 810; call it in the update loop ~line 960; new `swapToBeast(captive)` helper near `promoteEnemy` ~line 399)

**Interfaces:**
- Consumes: `selectTransmuteTarget`, `transmuteBeastKey` (Task 5); existing `ENEMY_TYPES`, `scaleEnemyDef`, `new Enemy`, `CONCURRENCY_CAP`, `this.enemyShots`, `COLORS`.
- Produces: a `transmute` attack on a boss/enemy converts the nearest captive into `captive.def.transmuteTo`. Captives are enemy defs that declare `captive: true` and `transmuteTo: '<beastKey>'` (authored in Plan 2).

- [ ] **Step 1: Import the transmute helpers**

In `src/scenes/GameScene.js`, add `selectTransmuteTarget, transmuteBeastKey` to the existing `../systems/EnemyBrain.js` import:

```js
import { /* ...existing... */ resolveMutateOnDeath, selectTransmuteTarget, transmuteBeastKey, summonSlots } from '../systems/EnemyBrain.js';
```

- [ ] **Step 2: Ignore transmute bolts in the caster-shot overlap**

In `src/scenes/GameScene.js`, at the top of the `caster`×`enemyShots` overlap handler (~line 159-160), add a guard so transmute bolts never hit/damage the caster:

```js
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      if (shot._transmute) return; // transmute bolts hunt a captive, not the caster
```

- [ ] **Step 3: Special-case `transmute` in executeAttack**

In `src/scenes/GameScene.js`, in `executeAttack`, add a branch after the `summon` branch (~line 704, before the `submerge` branch):

```js
    if (att.type === 'transmute') {
      const candidates = [];
      this.enemies.children.iterate((e) => { if (e && e.active && e.def && e.def.transmuteTo && !e._transmuteLocked) candidates.push(e); return true; });
      const target = selectTransmuteTarget({ x: enemy.x, y: enemy.y }, candidates);
      if (!target) return;
      target._transmuteLocked = true;
      const shot = this.enemyShots.fire(TEX.poisonGlob, enemy.x, enemy.y, target.x, target.y, att.speed ?? 150, 0, 0);
      if (!shot) { target._transmuteLocked = false; return; }
      shot.setTint(COLORS.poison);
      shot.damage = 0;
      shot._transmute = true;
      shot._transmuteTarget = target;
      return;
    }
```

(`TEX` and `COLORS` are already imported in GameScene.)

- [ ] **Step 4: Add the steer method**

In `src/scenes/GameScene.js`, add a new method right after `steerHomingShots` (~line 810):

```js
  steerTransmuteShots(delta) {
    const turn = 0.02 * delta; // tighter than caster-homing — it must reliably reach its captive
    this.enemyShots.group.children.iterate((p) => {
      if (!p || !p.active || !p._transmute) return true;
      const target = p._transmuteTarget;
      if (!target || !target.active) { this.enemyShots.despawn(p); return true; } // captive died → fizzle
      if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 24) {
        this.swapToBeast(target);
        this.enemyShots.despawn(p);
        return true;
      }
      const desired = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
      const current = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      const next = Phaser.Math.Angle.RotateTo(current, desired, turn);
      const s = p.homingSpeed || 150;
      p.setVelocity(Math.cos(next) * s, Math.sin(next) * s);
      return true;
    });
  }
```

- [ ] **Step 5: Call the steer method in the update loop**

In `src/scenes/GameScene.js`, in `update`, right after the existing `this.steerHomingShots(delta);` call (~line 960):

```js
    this.steerTransmuteShots(delta);
```

- [ ] **Step 6: Add the swap helper**

In `src/scenes/GameScene.js`, add a method right after `promoteEnemy` (~line 399):

```js
  swapToBeast(captive) {
    const key = transmuteBeastKey(captive.def);
    const def = key ? ENEMY_TYPES[key] : null;
    if (def && this.enemies.countActive(true) < CONCURRENCY_CAP) {
      const e = new Enemy(this, captive.x, captive.y, scaleEnemyDef(def, this.diff));
      this.enemies.add(e);
      if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
      this.flashCircle(captive.x, captive.y, (def.radius || 20) + 12, COLORS.poison); // transform tell
    }
    captive.destroy();
  }
```

(`flashCircle` exists — it's used in `executeAttack`'s `submerge` branch.)

- [ ] **Step 7: Run the full suite (regression)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 8: Manual playtest**

Run the server. Temporarily add a captive enemy (`{ key:'cautivo_test', tex:TEX.villager, color:COLORS.poison, hp:18, speed:90, damage:8, radius:16, captive:true, transmuteTo:'warrior', movement:{type:'flee'}, attacks:[] }`) to `ENEMY_TYPES` and an enemy/boss with `attacks:[{ type:'transmute', every:3000, speed:150 }]`. Verify: a tinted bolt leaves the caster, curves toward the fleeing captive, and on contact the captive becomes a `warrior` with a flash; if you kill the captive before the bolt lands, the bolt disappears (fizzle). Remove the temporary defs after verifying.

- [ ] **Step 9: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(earth): transmute bolt — hunt captive, swap to beast, fizzle on death"
```

---

## Self-Review

**Spec coverage (spec §2):**
- §2.1 `root` (keeps cast, telegraphed, anti-chain) → Tasks 1–2. ✓
- §2.2 `transmute` (homing at friendly, swap, fizzle-on-death) → Tasks 5–6. ✓
- §2.3 `mutateOnDeath` (entity or zone) → Tasks 3–4. ✓
- §2.4 `poisonFloor` → REUSE of existing `spawnZone`/`BossMechanics`; no task needed (used directly by Plan 2/3 data). ✓
- §2.5 cages/caves scenery, §2.6 `flee`-rule → data/scene authoring in Plan 3 (Circe arena) / Plan 2 (rosters); no new engine. ✓
- Reused Air pieces (`drain`/`evade`/`flying`/`untargetable`/`onHitSlow`/`shielded`/`resist`) → already exist; no task. ✓

**Placeholder scan:** none — every step has concrete code or an exact command.

**Type consistency:** `applyCasterCc(state, kind, ms)` / `isMovementLocked(state)` / `resolveMutateOnDeath(def)` / `selectTransmuteTarget(source, candidates)` / `transmuteBeastKey(captiveDef)` / `swapToBeast(captive)` / `steerTransmuteShots(delta)` used consistently across tasks. Captive contract is uniform: `def.captive` + `def.transmuteTo` (Task 6 selects on `def.transmuteTo`; Plan 2 authors both fields).

**Note for Plans 2–3:** captive enemy defs must set `transmuteTo: '<beastKey>'` (consumed by Task 6); `mutateOnDeath` users set `{ spawnType }` or `{ zone:{...} }` (Task 4); root sources use `onHitRoot` modifier, `root:true` on a `lobAoe`/shot attack (Task 2).
