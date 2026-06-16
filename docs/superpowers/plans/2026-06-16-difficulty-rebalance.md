# Difficulty Rebalance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the runaway multiplicative difficulty multiplier with a class-aware, diminishing-returns model so basic enemies scale gently, elites carry the difficulty (extra hp/damage + bounded resist), and the curve stays sustainable as more worlds are added.

**Architecture:** Difficulty math lives in the pure (Phaser-free) `src/systems/Difficulty.js`, driven by constants in `src/data/tuning.js`. The new `difficultyContext(save, levelIndex)` returns separate `basicMult` / `eliteMult` / `eliteResist`; `scaleEnemyDef(def, ctx)` discriminates on the existing `def.elite` flag. `GameScene` computes the context once per run and passes it to every spawn. The legacy `levelMultiplier` scalar is retained untouched, used only for the gold reward and debug readout so the economy is unaffected.

**Tech Stack:** Native ES modules, Phaser 3 (CDN), `node:test` + `node:assert/strict` for the pure logic.

---

## File Structure

- `src/data/tuning.js` — **modify**: add 7 balance constants. `BASE_CURVE` stays as the single source of depth.
- `src/systems/Difficulty.js` — **modify**: add `depthBonus`, `powerBonus`, `combineResist`, `difficultyContext`; rewrite `scaleEnemyDef(def, ctx)`; keep `difficultyMultiplier`/`levelMultiplier` as legacy gold/debug scalars.
- `tests/Difficulty.test.js` — **rewrite**: cover the new model (old tests use the removed `(def, number)` signature).
- `src/scenes/GameScene.js` — **modify**: compute `this.diff` alongside `this.mult`; pass `this.diff` to the 5 `scaleEnemyDef` call sites; scale each boss form in `_applyBossForm`.

---

## Task 1: Balance constants in tuning.js

**Files:**
- Modify: `src/data/tuning.js` (after the `BASE_CURVE` block, before `CONCURRENCY_CAP`)

- [ ] **Step 1: Add the constants**

Open `src/data/tuning.js`. Immediately after the `export const BASE_CURVE = [...]` line and its comment, insert:

```js
// --- Difficulty rebalance (2026-06-16) ---
// Player-power bonus uses diminishing returns so adding worlds/skill points later
// cannot explode the curve. It asymptotes to POWER_CAP (points term) + a small
// linear element term. Basics receive a fraction of this bonus, elites the full
// amount; elites additionally gain bounded damage-reduction (resist) by depth.
export const POWER_CAP = 1.2;            // ceiling of the points-based power bonus
export const POWER_SCALE = 45;           // e-folding constant (~45 pts → 63% of cap)
export const PER_ELEMENT = 0.08;         // additive bonus per mastered element
export const BASIC_POWER_FACTOR = 0.35;  // share of the power bonus basics receive
export const ELITE_POWER_FACTOR = 1.0;   // share of the power bonus elites receive
export const ELITE_RESIST_MAX = 0.30;    // cap on scaling-granted damage reduction
export const ELITE_RESIST_PER_DEPTH = 0.15; // resist per unit of depth bonus
```

- [ ] **Step 2: Verify the file still parses**

Run: `node --check src/data/tuning.js`
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/data/tuning.js
git commit -m "feat(difficulty): add diminishing-returns balance constants"
```

---

## Task 2: New scaling model in Difficulty.js (TDD)

**Files:**
- Modify: `src/systems/Difficulty.js`
- Test: `tests/Difficulty.test.js` (full rewrite)

- [ ] **Step 1: Write the failing tests**

Replace the **entire** contents of `tests/Difficulty.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  powerBonus, depthBonus, combineResist, difficultyContext, scaleEnemyDef,
} from '../src/systems/Difficulty.js';
import { ELITE_RESIST_MAX } from '../src/data/tuning.js';

const fresh = { purchasedNodes: [], elements: [] };

// spentPoints() sums node.cost per id, so repeating the cost-1 node 'dmg1' N times
// yields N spent points. elements only needs a length, so fill with placeholders.
function save(spent, elements = 0) {
  return {
    purchasedNodes: Array(spent).fill('dmg1'),
    elements: Array(elements).fill('x'),
  };
}

test('fresh save: no power bonus, depth bonus 0 at level 0', () => {
  assert.equal(powerBonus(fresh), 0);
  assert.equal(depthBonus(0), 0);
});

test('tolerates missing fields', () => {
  assert.equal(powerBonus({}), 0);
  assert.equal(powerBonus(undefined), 0);
});

test('powerBonus rises with points but is bounded (sustainable)', () => {
  const a = powerBonus(save(40));
  const b = powerBonus(save(110));
  const c = powerBonus(save(200));
  assert.ok(b > a);            // monotonic in points
  assert.ok(c > b);
  assert.ok(c - b < 0.2);      // 110 → 200 barely moves: future-proof
  assert.ok(b < 1.5);          // never runaway
});

test('elements add to the power bonus', () => {
  assert.ok(powerBonus(save(40, 2)) > powerBonus(save(40, 0)));
});

test('difficultyContext: basics scale softer than elites, both >= 1', () => {
  const ctx = difficultyContext(save(110, 4), 7);
  assert.ok(ctx.basicMult >= 1);
  assert.ok(ctx.basicMult < ctx.eliteMult);
});

test('endgame basic stays near x3 (not x15), elite near x4', () => {
  const ctx = difficultyContext(save(110, 4), 7); // nv8 = index 7
  assert.ok(ctx.basicMult > 2.7 && ctx.basicMult < 3.5, `basic=${ctx.basicMult}`);
  assert.ok(ctx.eliteMult > 3.6 && ctx.eliteMult < 4.5, `elite=${ctx.eliteMult}`);
});

test('eliteResist is positive at depth and bounded by ELITE_RESIST_MAX', () => {
  const ctx = difficultyContext(save(110, 4), 7);
  assert.ok(ctx.eliteResist > 0);
  assert.ok(ctx.eliteResist <= ELITE_RESIST_MAX);
});

test('combineResist never reaches 1', () => {
  assert.equal(combineResist(0, 0.3), 0.3);
  assert.equal(combineResist(0.5, 0.2), 0.6);
  assert.ok(combineResist(0.9, 0.9) < 1);
});

test('scaleEnemyDef: basic uses basicMult and adds no resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.25 };
  const def = { key: 'medusa', hp: 20, damage: 8, speed: 90 };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.hp, 40);
  assert.equal(s.damage, 16);
  assert.equal(s.speed, 90);      // untouched fields preserved
  assert.equal(s.resist, undefined);
});

test('scaleEnemyDef: elite uses eliteMult and gains combined resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.25 };
  const def = { key: 'levelboss', hp: 100, damage: 20, elite: true };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.hp, 400);
  assert.equal(s.damage, 80);
  assert.equal(s.resist, 0.25);
});

test('scaleEnemyDef: elite combines innate resist with scaling resist', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.2 };
  const def = { key: 'tb', hp: 100, damage: 20, elite: true, resist: 0.5 };
  const s = scaleEnemyDef(def, ctx);
  assert.equal(s.resist, combineResist(0.5, 0.2)); // 0.6
});

test('scaleEnemyDef: tolerates a form with no damage field', () => {
  const ctx = { basicMult: 2, eliteMult: 4, eliteResist: 0.2 };
  const form = { key: 'dama_form2', hp: 200, elite: true };
  const s = scaleEnemyDef(form, ctx);
  assert.equal(s.hp, 800);
  assert.equal(s.damage, undefined);
});

test('scaleEnemyDef: mult of 1 leaves stats unchanged (never below base)', () => {
  const ctx = { basicMult: 1, eliteMult: 1, eliteResist: 0 };
  const def = { key: 'villager', hp: 20, damage: 8 };
  assert.equal(scaleEnemyDef(def, ctx).hp, 20);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/Difficulty.test.js`
Expected: FAIL — `powerBonus`, `depthBonus`, `combineResist`, `difficultyContext` are not exported (`SyntaxError: ... does not provide an export named 'powerBonus'`), and `scaleEnemyDef` tests fail on the old `(def, number)` behavior.

- [ ] **Step 3: Rewrite Difficulty.js**

Replace the **entire** contents of `src/systems/Difficulty.js` with:

```js
// src/systems/Difficulty.js
// Pure, class-aware difficulty scaling with diminishing returns. No Phaser.
import { SKILL_TREE } from '../data/skilltree.js';
import {
  baseDifficulty,
  POWER_CAP, POWER_SCALE, PER_ELEMENT,
  BASIC_POWER_FACTOR, ELITE_POWER_FACTOR,
  ELITE_RESIST_MAX, ELITE_RESIST_PER_DEPTH,
} from '../data/tuning.js';

function spentPoints(save) {
  return (save.purchasedNodes || []).reduce((sum, id) => {
    const node = SKILL_TREE[id];
    return sum + (node ? node.cost : 0);
  }, 0);
}

// Additive depth bonus (0 at level 0). Reuses BASE_CURVE as the single source.
export function depthBonus(levelIndex) {
  return baseDifficulty(levelIndex) - 1;
}

// Player-power bonus with diminishing returns: the points term asymptotes to
// POWER_CAP, so adding more skill points/levels later cannot explode the curve.
// The element term is a small linear add (only ~4-5 elements ever exist).
export function powerBonus(save) {
  const s = save || {};
  const spent = spentPoints(s);
  const elements = (s.elements || []).length;
  return POWER_CAP * (1 - Math.exp(-spent / POWER_SCALE)) + elements * PER_ELEMENT;
}

// Combine two damage-reduction factors so the result never reaches 1.
export function combineResist(a, b) {
  return 1 - (1 - a) * (1 - b);
}

// Per-run scaling context: separate multipliers for basic vs elite enemies, plus
// the depth-based resist granted to elites.
export function difficultyContext(save, levelIndex) {
  const depth = depthBonus(levelIndex);
  const power = powerBonus(save);
  return {
    basicMult: 1 + depth + BASIC_POWER_FACTOR * power,
    eliteMult: 1 + depth + ELITE_POWER_FACTOR * power,
    eliteResist: Math.min(ELITE_RESIST_MAX, ELITE_RESIST_PER_DEPTH * depth),
  };
}

// Returns a new def with hp/damage scaled by enemy class. Only scales fields that
// are present (boss forms may omit `damage`). Elites also gain combined resist.
export function scaleEnemyDef(def, ctx) {
  const mult = def.elite ? ctx.eliteMult : ctx.basicMult;
  const scaled = { ...def };
  if (typeof def.hp === 'number') scaled.hp = Math.round(def.hp * mult);
  if (typeof def.damage === 'number') scaled.damage = Math.round(def.damage * mult);
  if (def.elite) {
    scaled.resist = combineResist(def.resist ?? 0, ctx.eliteResist);
  }
  return scaled;
}

// --- Legacy scalar: retained ONLY for the gold reward + debug readout. The
// economy is out of scope for the rebalance, so this preserves its old behavior.
export function difficultyMultiplier(save) {
  const s = save || {};
  const elements = (s.elements || []).length;
  return 1 + spentPoints(s) * 0.04 + elements * 0.15;
}

export function levelMultiplier(save, levelIndex) {
  return baseDifficulty(levelIndex) * difficultyMultiplier(save);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/Difficulty.test.js`
Expected: PASS — all tests green.

- [ ] **Step 5: Run the full suite (nothing else broke)**

Run: `node --test`
Expected: PASS — all files green.

- [ ] **Step 6: Commit**

```bash
git add src/systems/Difficulty.js tests/Difficulty.test.js
git commit -m "feat(difficulty): class-aware diminishing-returns scaling model"
```

---

## Task 3: Wire GameScene to the new context

**Files:**
- Modify: `src/scenes/GameScene.js` (import line ~14; `init` ~43; call sites ~140, 206, 259, 278, 375; `_applyBossForm` ~151)

> No `node --test` coverage — this file is Phaser-coupled. Verify with `node --check` and a grep assertion, then the manual smoke test in Task 4.

- [ ] **Step 1: Update the import**

In `src/scenes/GameScene.js`, change the line:

```js
import { levelMultiplier, scaleEnemyDef } from '../systems/Difficulty.js';
```

to:

```js
import { levelMultiplier, difficultyContext, scaleEnemyDef } from '../systems/Difficulty.js';
```

- [ ] **Step 2: Compute the context in `init`**

Find (around line 43):

```js
    this.mult = levelMultiplier(save, this.levelIndex);
```

Replace with (keep `this.mult` for gold/debug, add `this.diff` for enemy scaling):

```js
    this.mult = levelMultiplier(save, this.levelIndex); // legacy scalar: gold + debug only
    this.diff = difficultyContext(save, this.levelIndex);
```

- [ ] **Step 3: Repoint the 5 `scaleEnemyDef` call sites**

In the same file, change `scaleEnemyDef(<def>, this.mult)` to `scaleEnemyDef(<def>, this.diff)` at each of these (the def argument stays the same):

- `spawnBoss` (~140): `new Boss(this, GAME_WIDTH / 2, -40, scaleEnemyDef(def, this.diff));`
- multi-boss spawn (~206): `const b = new Boss(this, x, -40, scaleEnemyDef(def, this.diff));`
- enemy spawn (~259): `const e = new Enemy(this, x, y, scaleEnemyDef(def, this.diff));`
- miniboss/other (~278): `const scaled = scaleEnemyDef(def, this.diff);`
- split children (~375): `const scaled = scaleEnemyDef(childDef, this.diff);`

- [ ] **Step 4: Scale each boss form in `_applyBossForm`**

Find (around line 151-156):

```js
  _applyBossForm(boss, formIndex) {
    const form = boss._formSeq.forms[formIndex];
    // Merge form fields onto def (movement, speed, hp, resist).
    boss.def = { ...boss.def, ...form };
    boss.hp = form.hp;
    boss.maxHp = form.hp;
```

Replace with (each form is an elite creature; scale its hp/damage and combine its resist before merging, otherwise the raw `form.hp` bypasses difficulty):

```js
  _applyBossForm(boss, formIndex) {
    const form = boss._formSeq.forms[formIndex];
    // Each form is an elite creature; scale its hp/damage + combine resist the same
    // way spawnBoss scaled the base def, otherwise raw form.hp bypasses difficulty.
    const scaledForm = scaleEnemyDef({ elite: true, ...form }, this.diff);
    // Merge scaled form fields onto def (movement, speed, hp, damage, resist).
    boss.def = { ...boss.def, ...scaledForm };
    boss.hp = scaledForm.hp;
    boss.maxHp = scaledForm.hp;
```

> Note: `{ elite: true, ...form }` puts `elite: true` first so a form that already sets `elite` wins; every current form should be treated as elite regardless.

- [ ] **Step 5: Verify the file parses**

Run: `node --check src/scenes/GameScene.js`
Expected: no output (exit 0).

- [ ] **Step 6: Assert no `scaleEnemyDef` still receives the legacy scalar**

Run: `grep -n "scaleEnemyDef(.*this.mult)" src/scenes/GameScene.js`
Expected: no matches (exit 1 / empty output).

Run: `grep -c "scaleEnemyDef(.*this.diff)" src/scenes/GameScene.js`
Expected: `5`

- [ ] **Step 7: Confirm gold + debug still use the legacy scalar**

Run: `grep -n "this.mult" src/scenes/GameScene.js`
Expected: 3 matches — the assignment (~43), `goldReward(this.level, this.mult, clearMs)` (~449), and the debug `x${this.mult.toFixed(2)}` (~667). No others.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(difficulty): wire GameScene + boss forms to class-aware context"
```

---

## Task 4: Manual smoke test (in-browser)

**Files:** none (verification only)

- [ ] **Step 1: Serve the game**

Run: `python3 -m http.server 8000`
Then open `http://localhost:8000` in a portrait mobile viewport (device toolbar).

- [ ] **Step 2: Verify basic-enemy feel**

Play a fire region level. Confirm basic enemies die in a sensible number of hits — clearly squishier than before at the same save power. The debug overlay (if `?debug`) shows `x<mult>`; this is the legacy gold scalar and is expected to be unchanged.

- [ ] **Step 3: Verify elite toughness**

Reach a miniboss/levelboss and a multi-form temple boss (e.g. water's Dama del Lago). Confirm: elites are noticeably tankier than basics, multi-form bosses keep their toughness across form swaps (hp bar scales per form, not snapping to raw values), and no enemy is invulnerable (resist is capped).

- [ ] **Step 4: Verify the economy is unchanged**

Clear a level and confirm the gold reward is in the same ballpark as before this change (it derives from the retained legacy `this.mult`, so it should not have shifted).

- [ ] **Step 5: Final full-suite run**

Run: `node --test`
Expected: PASS — all green.

---

## Done criteria

- `node --test` passes; `tests/Difficulty.test.js` covers monotonicity, the sustainability bound (110 → 200 pts), basic < elite, resist cap, the missing-`damage` form case, and the endgame `~x3` basic / `~x4` elite targets.
- A basic nv8 endgame enemy scales ~x3.1 (was ~x15.6); elites ~x4.0 + ~24% resist.
- Gold rewards and the debug readout are unchanged (legacy scalar retained).
- Multi-form bosses scale per form.

## Out of scope (separate sub-projects)

i18n (A), pixel art / hitboxes (C), animations (D); gold economy; skill-tree costs; per-enemy base-stat tuning.
