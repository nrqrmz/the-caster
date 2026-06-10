# Elemental Skills (Lightning / Poison / Freeze) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three not-yet-playable elemental skills — Lightning (chain), Poison (heal-zone at your feet), Freeze (immobilize weak / slow elites) — castable active abilities with their own cooldowns, surfaced through a multi-button HUD; Fireball is untouched and all skill *upgrades* (burn, +chain, etc.) are deferred to the skill-tree cycle.

**Architecture:** The decidable logic (Lightning's chain target selection, Freeze's per-enemy effect tiering) lives in a Phaser-free, unit-tested module (`SkillTargeting`). The Phaser layer consumes it: `GameScene` gets a per-skill cooldown map + a data-driven `tryCast(key)` dispatch, the existing poison-zone system is generalized to a zone with explicit effects (damage enemies / heal caster / damage caster), `Enemy` gains freeze/slow state, and `UIScene` renders one cooldown button per unlocked skill. New skill stats live in `BASE_STATS` so the tree can later upgrade them.

**Tech Stack:** Phaser 3.80 (CDN), vanilla ES modules, no build step, Node `--test` for the pure module. No browser is available to the implementer — verify Phaser files with `node --check` (syntax) and keep `node --test` green; the human playtests at the end.

---

## Conventions

- Run from `the-caster/`. Tests: `node --test`. Syntax: `node --check <file>`.
- **Commit after every task** (Conventional Commits).
- Pure logic (`src/systems/SkillTargeting.js`, `src/data/*`) imports **no Phaser**. Phaser-coupled code is verified by `node --check` + the final manual playtest.
- Colors/texture keys come from `config.js`.

## File Structure

**Create:**
- `src/systems/SkillTargeting.js` — pure: `chainTargets()`, `freezeEffect()`.
- `src/data/skills.js` — pure data: `SKILLS` registry (key, element, icon, color, HUD order).
- `tests/SkillTargeting.test.js`.

**Modify:**
- `src/config.js` — add `COLORS.lightning`, `COLORS.ice`, `COLORS.poison`.
- `src/data/stats.js` — add elemental skill stats to `BASE_STATS` + cooldown floors.
- `src/data/regions.js` — rename air `grantsSkill` `thunderbolt`→`lightning`; add `elite: true` to boss factories.
- `tests/regions.test.js` — assert the rename + elite flag.
- `src/objects/Enemy.js` — freeze/slow state honored in `updateBehavior`.
- `src/scenes/GameScene.js` — per-skill cooldowns, `tryCast` dispatch, `cast_*` methods, generalized zones, cast visuals.
- `src/scenes/UIScene.js` — multi-skill button HUD.
- `src/scenes/BranchScene.js` — `runtimeStats` exposes `unlockedSkills`.

**Untouched:** `BossMechanics.js` keeps calling `scene.spawnPoisonZone(...)` (kept as a thin wrapper). Fireball gameplay unchanged.

---

## PHASE 0 — Pure targeting logic (TDD)

### Task 0.1: `SkillTargeting` (chain targets + freeze tiering)

**Files:**
- Create: `src/systems/SkillTargeting.js`
- Create: `tests/SkillTargeting.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chainTargets, freezeEffect } from '../src/systems/SkillTargeting.js';

const caster = { x: 0, y: 0 };

test('no enemies yields no targets', () => {
  assert.deepEqual(chainTargets(caster, [], 50, 3), []);
});

test('primary target is nearest to caster and ignores jump radius', () => {
  // single far enemy: still hit as the primary (cast) target
  assert.deepEqual(chainTargets(caster, [{ x: 1000, y: 0 }], 50, 2), [0]);
});

test('maxTargets caps the chain', () => {
  const enemies = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 50, 1), [0]);
});

test('chain hops to the nearest unused within jumpRadius of the last hit, stops when none in range', () => {
  // A(10) -> B(20) reachable (10 apart); C(200) too far from B (180 > 50)
  const enemies = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 200, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 50, 3), [0, 1]);
});

test('each hop picks the nearest remaining and never repeats', () => {
  // nearest to caster is index 1 (x=10); from there nearest is index 2 (x=25); then index 0 (x=30)
  const enemies = [{ x: 30, y: 0 }, { x: 10, y: 0 }, { x: 25, y: 0 }];
  assert.deepEqual(chainTargets(caster, enemies, 100, 3), [1, 2, 0]);
});

test('freezeEffect tiers by elite flag', () => {
  assert.equal(freezeEffect({ elite: true }), 'slow');
  assert.equal(freezeEffect({ elite: false }), 'freeze');
  assert.equal(freezeEffect({}), 'freeze');
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/SkillTargeting.test.js`
Expected: FAIL — cannot find module `../src/systems/SkillTargeting.js`.

- [ ] **Step 3: Write `src/systems/SkillTargeting.js`**

```js
// src/systems/SkillTargeting.js
// Pure helpers for active-skill targeting. No Phaser. Positions are {x, y}.

// Lightning chain: target 1 is the nearest enemy to the caster (no radius limit —
// it's the cast target). Each subsequent hop is the nearest not-yet-chosen enemy
// within jumpRadius of the LAST chosen enemy. Stops at maxTargets or when none in
// range. Returns the chosen enemy indices in hit order.
export function chainTargets(casterPos, enemies, jumpRadius, maxTargets) {
  if (!enemies.length || maxTargets <= 0) return [];
  const chosen = [];
  const used = new Set();
  let from = casterPos;
  for (let step = 0; step < maxTargets; step++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      if (used.has(i)) continue;
      const d = Math.hypot(enemies[i].x - from.x, enemies[i].y - from.y);
      if (step > 0 && d > jumpRadius) continue; // hops are range-limited; primary is not
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best === -1) break;
    used.add(best);
    chosen.push(best);
    from = enemies[best];
  }
  return chosen;
}

// Freeze affects weak enemies differently from elites (miniboss/levelBoss/templeBoss).
export function freezeEffect(def) {
  return def && def.elite ? 'slow' : 'freeze';
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/SkillTargeting.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/SkillTargeting.js tests/SkillTargeting.test.js
git commit -m "feat: pure skill targeting (lightning chain, freeze tiering)"
```

---

## PHASE 1 — Data & stats

### Task 1.1: Elemental skill stats

**Files:**
- Modify: `src/data/stats.js`

- [ ] **Step 1: Add the new stats to `src/data/stats.js`**

Replace the entire file contents with:

```js
// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,

  // Fireball (already playable)
  fireballDamage: 40,
  fireballCooldown: 4000,

  // Lightning (air): chain strike
  lightningDamage: 30,
  lightningCooldown: 5000,
  lightningChain: 2,
  lightningJumpRadius: 150,

  // Poison (earth): heal-zone at the caster's feet
  poisonDamage: 15,     // damage/sec to enemies inside
  poisonCooldown: 7000,
  poisonDuration: 4000,
  poisonRadius: 70,
  poisonHeal: 8,        // hp/sec healed to the caster while inside

  // Freeze (water): frost burst on nearest enemy
  freezeCooldown: 8000,
  freezeRadius: 90,
  freezeDuration: 2500,
  freezeSlowPct: 0.5,   // elite speed multiplier while slowed
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
  lightningCooldown: 1500,
  poisonCooldown: 2000,
  freezeCooldown: 2500,
};
```

- [ ] **Step 2: Verify nothing broke**

Run: `node --test`
Expected: all suites still green (the existing SkillTree tests read `BASE_STATS`; new keys don't affect them).

- [ ] **Step 3: Commit**

```bash
git add src/data/stats.js
git commit -m "feat: base stats for lightning, poison, freeze"
```

---

### Task 1.2: Colors + skills registry

**Files:**
- Modify: `src/config.js`
- Create: `src/data/skills.js`

- [ ] **Step 1: Add colors to `src/config.js`**

In `src/config.js`, inside the `COLORS` object, add these three entries (e.g., right after the `temple: 0xffd54f,` line):

```js
  lightning: 0xfff176,  // yellow zap
  ice: 0x80d8ff,        // cyan freeze flash
  poison: 0x7cb342,     // green poison zone
```

- [ ] **Step 2: Create `src/data/skills.js`**

```js
// src/data/skills.js
// Registry of active skills (pure data). Drives the HUD buttons (icon/color/order)
// and the cast dispatch. The element matches the temple that unlocks the skill.
import { COLORS } from '../config.js';

export const SKILLS = [
  { key: 'fireball',  element: 'fire',  icon: '🔥', color: COLORS.fireball },
  { key: 'lightning', element: 'air',   icon: '⚡', color: COLORS.lightning },
  { key: 'poison',    element: 'earth', icon: '☠️', color: COLORS.poison },
  { key: 'freeze',    element: 'water', icon: '❄️', color: COLORS.ice },
];
```

- [ ] **Step 3: Syntax check + tests**

Run: `node --check src/config.js` and `node -e "import('./src/data/skills.js').then(m => console.log(m.SKILLS.map(s => s.key)))"`
Expected: the second prints `[ 'fireball', 'lightning', 'poison', 'freeze' ]`. Then `node --test` stays green.

- [ ] **Step 4: Commit**

```bash
git add src/config.js src/data/skills.js
git commit -m "feat: skill colors and skills registry"
```

---

### Task 1.3: Rename air skill to `lightning` + mark bosses elite

**Files:**
- Modify: `src/data/regions.js`
- Modify: `tests/regions.test.js`

- [ ] **Step 1: Mark boss factories elite in `src/data/regions.js`**

Find the three boss-factory lines:

```js
const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 22, behavior: 'chase' });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 28, behavior: 'chase' });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 32, behavior: 'chase', mechanics });
```

Replace them with (adds `elite: true` to each):

```js
const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 22, behavior: 'chase', elite: true });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 28, behavior: 'chase', elite: true });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 32, behavior: 'chase', elite: true, mechanics });
```

- [ ] **Step 2: Rename the air skill**

In the same file, in the `air` region definition, change:

```js
    id: 'air', element: 'air', name: 'La Montaña', grantsSkill: 'thunderbolt',
```

to:

```js
    id: 'air', element: 'air', name: 'La Montaña', grantsSkill: 'lightning',
```

- [ ] **Step 3: Add assertions to `tests/regions.test.js`**

Append these two tests to `tests/regions.test.js` (after the existing tests, before EOF):

```js
test('air branch grants the lightning skill', () => {
  assert.equal(REGIONS.air.grantsSkill, 'lightning');
});

test('all temple/level/mini bosses are flagged elite', () => {
  for (const id of REGION_ORDER) {
    for (const level of REGIONS[id].levels) {
      for (const phase of level.phases) {
        if (phase.type === 'miniboss' || phase.type === 'levelBoss' || phase.type === 'templeBoss') {
          assert.equal(phase.enemyDef.elite, true, `${level.id} ${phase.type} elite`);
        }
      }
    }
  }
});
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/regions.test.js`
Expected: PASS (existing tests + the 2 new ones). Then `node --test` full — green.

- [ ] **Step 5: Commit**

```bash
git add src/data/regions.js tests/regions.test.js
git commit -m "feat: rename air skill to lightning; flag bosses elite"
```

---

## PHASE 2 — Enemy control state

### Task 2.1: Freeze / slow on `Enemy`

`Enemy.updateBehavior` honors a freeze timer (velocity 0) and a slow timer (velocity × factor). Bosses inherit this (they're elite → only ever slowed).

**Files:**
- Modify: `src/objects/Enemy.js`

- [ ] **Step 1: Add control state to the constructor**

In `src/objects/Enemy.js`, find the constructor:

```js
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this._fireTimer = def.fireEvery || 0;
  }
```

Replace it with:

```js
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this._fireTimer = def.fireEvery || 0;
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
  }

  applyFreeze(ms) { this.freezeRemaining = Math.max(this.freezeRemaining, ms); }
  applySlow(factor, ms) { this.slowRemaining = Math.max(this.slowRemaining, ms); this.slowFactor = factor; }
```

- [ ] **Step 2: Honor freeze/slow in `updateBehavior`**

Replace the entire `updateBehavior` method:

```js
  updateBehavior(delta, target, onRangedFire) {
    if (!this.active) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    if (this.def.behavior === 'ranged') {
      const desired = this.def.range || 200;
      if (dist > desired + 20) {
        this.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
      } else if (dist < desired - 20) {
        this.setVelocity(-Math.cos(angle) * this.def.speed, -Math.sin(angle) * this.def.speed);
      } else {
        this.setVelocity(0, 0);
      }
      this._fireTimer -= delta;
      if (this._fireTimer <= 0 && dist <= desired + 40) {
        this._fireTimer = this.def.fireEvery;
        onRangedFire(this);
      }
    } else {
      // chase
      this.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
    }
  }
```

with:

```js
  updateBehavior(delta, target, onRangedFire) {
    if (!this.active) return;

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    // Frozen: immobilized and cannot fire.
    if (this.freezeRemaining > 0) { this.setVelocity(0, 0); return; }

    const speed = this.def.speed * (this.slowRemaining > 0 ? this.slowFactor : 1);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    if (this.def.behavior === 'ranged') {
      const desired = this.def.range || 200;
      if (dist > desired + 20) {
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      } else if (dist < desired - 20) {
        this.setVelocity(-Math.cos(angle) * speed, -Math.sin(angle) * speed);
      } else {
        this.setVelocity(0, 0);
      }
      this._fireTimer -= delta;
      if (this._fireTimer <= 0 && dist <= desired + 40) {
        this._fireTimer = this.def.fireEvery;
        onRangedFire(this);
      }
    } else {
      // chase
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }
```

- [ ] **Step 3: Syntax check**

Run: `node --check src/objects/Enemy.js`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/objects/Enemy.js
git commit -m "feat: Enemy freeze (immobilize) and slow state"
```

---

## PHASE 3 — Generalize ground zones

### Task 3.1: Zones with explicit effects (damage enemies / heal caster / damage caster)

Today `GameScene` has `poisonZones`/`spawnPoisonZone`/`updatePoisonZones` that only damage the caster (the earth-boss mechanic). Generalize to a `zones` list where each zone carries `casterDps`, `casterHeal`, `enemyDps`. Keep `spawnPoisonZone` as a thin wrapper so `BossMechanics` is untouched.

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Rename the zone array field in `create()`**

In `src/scenes/GameScene.js` `create()`, find:

```js
    this.zones = [];             // active ground zones (poison, etc.)
```

If that line is not present yet, find instead:

```js
    this.poisonZones = [];       // set in Phase 3
```

and replace it with:

```js
    this.zones = [];             // active ground zones (poison, freeze, boss hazards)
```

- [ ] **Step 2: Replace `spawnPoisonZone` + `updatePoisonZones` with the generalized zone system**

Find these two methods:

```js
  spawnPoisonZone(x, y, radius, dps, duration) {
    const gfx = this.add.circle(x, y, radius, 0x7cb342, 0.30).setDepth(5);
    this.poisonZones.push({ x, y, radius, dps, remaining: duration, gfx });
  }

  updatePoisonZones(delta) {
    if (!this.poisonZones.length) return;
    for (const z of this.poisonZones) {
      z.remaining -= delta;
      if (this.caster && this.caster.hp > 0 && Phaser.Math.Distance.Between(this.caster.x, this.caster.y, z.x, z.y) <= z.radius) {
        this.damageCaster(z.dps * (delta / 1000));
      }
    }
    this.poisonZones = this.poisonZones.filter((z) => {
      if (z.remaining > 0) return true;
      z.gfx.destroy();
      return false;
    });
  }
```

Replace them with:

```js
  // Generic ground zone. opts: { x, y, radius, duration, color?, casterDps?, casterHeal?, enemyDps? }
  spawnZone(opts) {
    const color = opts.color != null ? opts.color : COLORS.poison;
    const gfx = this.add.circle(opts.x, opts.y, opts.radius, color, 0.30).setDepth(5);
    this.zones.push({
      x: opts.x, y: opts.y, radius: opts.radius, remaining: opts.duration, gfx,
      casterDps: opts.casterDps || 0,
      casterHeal: opts.casterHeal || 0,
      enemyDps: opts.enemyDps || 0,
    });
  }

  // Back-compat wrapper used by BossMechanics' poisonFloor (damages the caster).
  spawnPoisonZone(x, y, radius, dps, duration) {
    this.spawnZone({ x, y, radius, duration, casterDps: dps, color: COLORS.poison });
  }

  updateZones(delta) {
    if (!this.zones.length) return;
    const dt = delta / 1000;
    for (const z of this.zones) {
      z.remaining -= delta;
      const casterIn = this.caster && this.caster.hp > 0 &&
        Phaser.Math.Distance.Between(this.caster.x, this.caster.y, z.x, z.y) <= z.radius;
      if (casterIn && z.casterDps) this.damageCaster(z.casterDps * dt);
      if (casterIn && z.casterHeal) {
        this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + z.casterHeal * dt);
      }
      if (z.enemyDps) {
        // Snapshot (filter returns a new array) so a kill mid-loop can't skip an enemy.
        const live = this.enemies.getChildren().filter((e) => e.active);
        for (const e of live) {
          if (Phaser.Math.Distance.Between(e.x, e.y, z.x, z.y) <= z.radius) this.hitEnemy(e, z.enemyDps * dt);
        }
      }
    }
    this.zones = this.zones.filter((z) => {
      if (z.remaining > 0) return true;
      z.gfx.destroy();
      return false;
    });
  }
```

- [ ] **Step 3: Update the `update()` call**

In `update()`, find:

```js
    this.updatePoisonZones(delta);
```

and replace it with:

```js
    this.updateZones(delta);
```

- [ ] **Step 4: Syntax check + tests**

Run: `node --check src/scenes/GameScene.js` (exit 0) and `node --test` (green).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: generalize ground zones (enemy damage / caster heal / caster damage)"
```

---

## PHASE 4 — Casting

### Task 4.1: Per-skill cooldowns, `tryCast` dispatch, and the three new casts

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Import the pure targeting helpers**

At the top of `src/scenes/GameScene.js`, add after the existing `../systems/...` imports (e.g., after the `BossMechanics` import line):

```js
import { chainTargets, freezeEffect } from '../systems/SkillTargeting.js';
```

- [ ] **Step 2: Replace the fireball cooldown field with a cooldown map**

In `create()`, find:

```js
    this.fireballCdRemaining = 0;
```

and replace it with:

```js
    this.cooldowns = {}; // ms remaining per skill key
```

- [ ] **Step 3: Replace `tryCastFireball()` with the generic dispatch + cast methods**

Find the whole `tryCastFireball()` method:

```js
  tryCastFireball() {
    if (!this.stats.hasFireball) return;
    if (this.fireballCdRemaining > 0) return;
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    const target = this.caster.nearestEnemy(liveEnemies);
    if (!target) return;
    this.fireballCdRemaining = this.stats.fireballCooldown;
    this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, 70);
  }
```

Replace it with:

```js
  // Cast a skill by key (from UIScene). A cast only consumes its cooldown if it
  // actually fired (e.g. skills needing a target do nothing when none exist).
  tryCast(key) {
    const unlocked = this.stats.unlockedSkills || [];
    if (!unlocked.includes(key)) return;
    if ((this.cooldowns[key] || 0) > 0) return;
    const cast = this[`cast_${key}`];
    if (!cast) return;
    if (cast.call(this)) this.cooldowns[key] = this.stats[`${key}Cooldown`];
  }

  liveEnemies() {
    return this.enemies.getChildren().filter((e) => e.active);
  }

  cast_fireball() {
    const target = this.caster.nearestEnemy(this.liveEnemies());
    if (!target) return false;
    this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, 70);
    return true;
  }

  cast_lightning() {
    const live = this.liveEnemies();
    if (!live.length) return false;
    const idx = chainTargets({ x: this.caster.x, y: this.caster.y }, live, this.stats.lightningJumpRadius, this.stats.lightningChain);
    if (!idx.length) return false;
    const points = [{ x: this.caster.x, y: this.caster.y }];
    for (const i of idx) points.push({ x: live[i].x, y: live[i].y });
    for (const i of idx) this.hitEnemy(live[i], this.stats.lightningDamage);
    this.drawZap(points);
    return true;
  }

  cast_poison() {
    this.spawnZone({
      x: this.caster.x, y: this.caster.y, radius: this.stats.poisonRadius,
      duration: this.stats.poisonDuration, enemyDps: this.stats.poisonDamage,
      casterHeal: this.stats.poisonHeal, color: COLORS.poison,
    });
    return true;
  }

  cast_freeze() {
    const live = this.liveEnemies();
    const center = this.caster.nearestEnemy(live);
    if (!center) return false;
    for (const e of live) {
      if (Phaser.Math.Distance.Between(center.x, center.y, e.x, e.y) > this.stats.freezeRadius) continue;
      if (freezeEffect(e.def) === 'slow') e.applySlow(this.stats.freezeSlowPct, this.stats.freezeDuration);
      else e.applyFreeze(this.stats.freezeDuration);
    }
    this.flashCircle(center.x, center.y, this.stats.freezeRadius, COLORS.ice);
    return true;
  }

  drawZap(points) {
    const g = this.add.graphics().setDepth(900);
    g.lineStyle(3, COLORS.lightning, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  flashCircle(x, y, radius, color) {
    const c = this.add.circle(x, y, radius, color, 0.35).setDepth(6);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 250, onComplete: () => c.destroy() });
  }
```

- [ ] **Step 4: Decrement all cooldowns each frame**

In `update()`, find:

```js
    if (this.fireballCdRemaining > 0) this.fireballCdRemaining -= delta;
```

and replace it with:

```js
    for (const k in this.cooldowns) { if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta; }
```

- [ ] **Step 5: Syntax check + tests**

Run: `node --check src/scenes/GameScene.js` (exit 0) and `node --test` (green).
Also run `grep -n "fireballCdRemaining\|tryCastFireball\|hasFireball" src/scenes/GameScene.js` — expected: NO matches (all removed from GameScene).

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: per-skill cooldowns and lightning/poison/freeze casting"
```

---

## PHASE 5 — HUD & runtime stats

### Task 5.1: Multi-skill button HUD

**Files:**
- Modify: `src/scenes/UIScene.js` (full rewrite)

- [ ] **Step 1: Replace the entire contents of `src/scenes/UIScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILLS } from '../data/skills.js';

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  init(data) { this.game_scene = data.gameScene; }

  create() {
    // Health bar (top).
    this.hpBack = this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 40, 16, COLORS.healthBack).setOrigin(0.5);
    this.hpFill = this.add.rectangle(22, 24, GAME_WIDTH - 44, 12, COLORS.healthFill).setOrigin(0, 0.5);
    this.hpMaxW = GAME_WIDTH - 44;

    // One cooldown button per UNLOCKED skill, stacked up from the bottom-right.
    const unlocked = (this.game_scene.stats && this.game_scene.stats.unlockedSkills) || [];
    const shown = SKILLS.filter((s) => unlocked.includes(s.key));
    this.buttons = [];
    shown.forEach((s, i) => {
      const x = GAME_WIDTH - 56;
      const y = GAME_HEIGHT - 70 - i * 84;
      const circle = this.add.circle(x, y, 36, s.color, 0.25).setStrokeStyle(3, s.color).setInteractive();
      this.add.text(x, y, s.icon, { fontSize: '26px' }).setOrigin(0.5);
      const cdArc = this.add.graphics();
      circle.on('pointerdown', () => {
        // Only cast while Game is active (it pauses during dialogue overlays).
        if (this.game_scene.scene.isActive('Game')) this.game_scene.tryCast(s.key);
      });
      this.buttons.push({ key: s.key, x, y, cdArc });
    });
  }

  update() {
    const gs = this.game_scene;
    if (!gs || !gs.caster) return;
    const pct = Phaser.Math.Clamp(gs.caster.hp / gs.caster.maxHp, 0, 1);
    this.hpFill.width = this.hpMaxW * pct;

    for (const b of this.buttons) {
      b.cdArc.clear();
      const remaining = (gs.cooldowns && gs.cooldowns[b.key]) || 0;
      const total = gs.stats[`${b.key}Cooldown`] || 1;
      if (remaining > 0) {
        const frac = Phaser.Math.Clamp(remaining / total, 0, 1);
        b.cdArc.fillStyle(0x000000, 0.5);
        b.cdArc.slice(b.x, b.y, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
        b.cdArc.fillPath();
      }
    }
  }
}
```

- [ ] **Step 2: Syntax check**

Run: `node --check src/scenes/UIScene.js`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/UIScene.js
git commit -m "feat: multi-skill cooldown button HUD"
```

---

### Task 5.2: Expose unlocked skills in runtime stats

**Files:**
- Modify: `src/scenes/BranchScene.js`

- [ ] **Step 1: Update `runtimeStats`**

In `src/scenes/BranchScene.js`, find:

```js
  runtimeStats(save) {
    const stats = getStats(save);
    stats.hasFireball = (save.unlockedSkills || []).includes('fireball');
    return stats;
  }
```

Replace it with:

```js
  runtimeStats(save) {
    const stats = getStats(save);
    stats.unlockedSkills = [...(save.unlockedSkills || [])];
    return stats;
  }
```

- [ ] **Step 2: Syntax check + full suite**

Run: `node --check src/scenes/BranchScene.js` (exit 0) and `node --test` (green).
Also: `grep -rn "hasFireball" src/` — expected: NO matches anywhere (the flag is fully replaced by `unlockedSkills`).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BranchScene.js
git commit -m "feat: runtime stats expose unlocked skills for the HUD"
```

---

## PHASE 6 — Verification

### Task 6.1: Full check + manual playtest checklist

**Files:** none (verification only)

- [ ] **Step 1: Full automated check**

Run: `node --test` (expect all green, including the new `SkillTargeting` suite and updated `regions` suite).
Run: `node --check src/scenes/GameScene.js src/scenes/UIScene.js src/scenes/BranchScene.js src/objects/Enemy.js src/data/skills.js src/config.js` (each exit 0).
Run: `grep -rn "thunderbolt\|hasFireball\|poisonZones\|updatePoisonZones\|fireballCdRemaining" src/` — expected: NO matches (all renamed/removed).

- [ ] **Step 2: Manual playtest (human)**

Run `python3 -m http.server 8000`, open in a portrait mobile viewport. To reach unlocked skills quickly you can complete temples (or temporarily seed `localStorage` `the-caster:save` with `unlockedSkills` including the skills under test). Verify:
- The HUD shows one button per unlocked skill, stacked bottom-right; each shows a cooldown sweep after use.
- ⚡ Lightning hits the nearest enemy and a visible zap chains to nearby enemies (up to base 2 targets); chained enemies take damage.
- ☠️ Poison drops a green zone at your feet: enemies inside take damage over time, and standing in it heals you (HP bar rises), for its duration.
- ❄️ Freeze bursts on the nearest enemy: weak enemies stop moving briefly; bosses/minibosses only slow down.
- 🔥 Fireball still works exactly as before.
- The earth temple boss's poison still damages you (the generalized zone didn't break the boss mechanic).

- [ ] **Step 3: Commit any fixes found during playtest** (if applicable), otherwise this phase is complete.

---

## Out of scope (deferred)

- **Burn** (fireball DoT) and all skill *upgrades* (more chain, +damage/area/duration, zone-heal scaling, slow %) → **skill-tree cycle (#2)**.
- Gold, shop, respec → **economy cycle (#3)**.
- Fine balance tuning of all base numbers; final art/audio.
