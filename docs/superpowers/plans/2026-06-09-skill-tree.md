# Skill Tree (Branching, Tabbed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 7-node skill list with a real branching tree — general branches plus 4 element branches (each gated by mastering that element), organized as linear per-attribute tracks — surfaced in a tabbed UI, and wire the two new gameplay bits the tree upgrades (passive health regen and fireball burn).

**Architecture:** The tree is data (`SKILL_TREE` node dict + `SKILL_BRANCHES` tab/track structure) consumed by the existing pure engine (`SkillTree.getStats/canPurchase/purchase`, plus a new pure `isBranchUnlocked`). Most upgrades are pure data — the #1 cast code already reads the stats they modify, so they "just work" through `getStats`. Two upgrades need new gameplay: `healthRegen` (passive HP/s in `GameScene.update`) and burn (a DoT state on `Enemy` applied by fireball hits and ticked in `GameScene`). The `SkillTreeScene` is rewritten to a tabbed layout.

**Tech Stack:** Phaser 3.80 (CDN), vanilla ES modules, no build, Node `--test` for pure logic. No browser available to the implementer — verify Phaser files with `node --check` and keep `node --test` green; the human playtests at the end.

---

## Conventions

- Run from `the-caster/`. Tests: `node --test`. Syntax: `node --check <file>`.
- **Commit after every task** (Conventional Commits).
- Pure logic (`src/data/*`, `src/systems/{SkillTree}`) imports no Phaser. Phaser code verified by `node --check` + final manual playtest.
- Effects use `effect:{ stat, add }`; `add` is negative for `*Cooldown`, `shotRate`, `freezeSlowPct` (lower = better).

## File Structure

**Modify:**
- `src/data/stats.js` — add `healthRegen`, `fireballRadius`, `burnDamage`, `burnDuration` to `BASE_STATS`; add `freezeSlowPct` floor.
- `src/data/skilltree.js` — full rewrite: new `SKILL_TREE` node dict (tracks) + `SKILL_BRANCHES`; remove `SKILL_TREE_ORDER`.
- `src/systems/SkillTree.js` — add pure `isBranchUnlocked(save, branch)`.
- `tests/SkillTree.test.js` — rewrite for new node ids, branches, `isBranchUnlocked`, new stats, consistency.
- `src/objects/Enemy.js` — burn state (`burnRemaining`, `burnDps`, `applyBurn`).
- `src/systems/ProjectilePool.js` — reset `burnDps` on `fire()`.
- `src/scenes/GameScene.js` — passive regen; `cast_fireball` uses `fireballRadius`; apply burn on fireball hit; `updateBurns(delta)`.
- `src/scenes/SkillTreeScene.js` — full rewrite to tabbed UI.

---

## PHASE 0 — Data & pure logic

### Task 0.1: New stats

**Files:**
- Modify: `src/data/stats.js`

- [ ] **Step 1: Replace the ENTIRE contents of `src/data/stats.js` with EXACTLY:**

```js
// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,
  healthRegen: 0,       // hp/sec passive regen (skill-tree)

  // Fireball
  fireballDamage: 40,
  fireballCooldown: 4000,
  fireballRadius: 70,   // explosion radius (skill-tree "Área" track)
  burnDamage: 0,        // burn DoT/sec applied on fireball hit (0 = no burn until unlocked)
  burnDuration: 2500,   // burn duration (ms)

  // Lightning (air): chain strike
  lightningDamage: 30,
  lightningCooldown: 5000,
  lightningChain: 2,
  lightningJumpRadius: 150,

  // Poison (earth): heal-zone at the caster's feet
  poisonDamage: 15,
  poisonCooldown: 7000,
  poisonDuration: 4000,
  poisonRadius: 70,
  poisonHeal: 8,

  // Freeze (water): frost burst on nearest enemy
  freezeCooldown: 8000,
  freezeRadius: 90,
  freezeDuration: 2500,
  freezeSlowPct: 0.5,
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
  lightningCooldown: 1500,
  poisonCooldown: 2000,
  freezeCooldown: 2500,
  freezeSlowPct: 0.2,
};
```

- [ ] **Step 2: Verify** — Run `node --test`. (Existing `SkillTree.test.js` will still pass for now; it's rewritten in Task 0.2.) Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/data/stats.js
git commit -m "feat: stats for regen, fireball radius, and burn"
```

---

### Task 0.2: Branching tree data + `isBranchUnlocked` (TDD)

Full rewrite of the tree data into linear tracks grouped into branches, the new pure `isBranchUnlocked`, and a rewritten test suite. Node ids change (the flat ids like `basic_dmg_1` are replaced).

**Files:**
- Modify: `tests/SkillTree.test.js` (full rewrite)
- Modify: `src/data/skilltree.js` (full rewrite)
- Modify: `src/systems/SkillTree.js` (add `isBranchUnlocked`)

- [ ] **Step 1: Rewrite `tests/SkillTree.test.js` to EXACTLY:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, purchase, getStats, isBranchUnlocked } from '../src/systems/SkillTree.js';
import { SKILL_TREE, SKILL_BRANCHES } from '../src/data/skilltree.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';

function saveWith(overrides) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...overrides };
}

test('cannot purchase without enough points', () => {
  assert.equal(canPurchase(saveWith({ skillPoints: 0 }), 'dmg1').ok, false);
});

test('cannot purchase when the track prerequisite is missing', () => {
  const res = canPurchase(saveWith({ skillPoints: 5 }), 'dmg2'); // requires dmg1
  assert.equal(res.ok, false);
  assert.match(res.reason, /requisito|prereq/i);
});

test('purchase deducts points and records the node (immutably)', () => {
  const save = saveWith({ skillPoints: 3 });
  const next = purchase(save, 'dmg1');
  assert.equal(next.skillPoints, 2);
  assert.deepEqual(next.purchasedNodes, ['dmg1']);
  assert.equal(save.skillPoints, 3); // original unchanged
});

test('getStats applies general bonuses', () => {
  const stats = getStats(saveWith({ purchasedNodes: ['dmg1', 'regen1'] }));
  assert.equal(stats.basicDamage, 15);   // 10 + 5
  assert.equal(stats.healthRegen, 2);    // 0 + 2
});

test('getStats applies elemental bonuses (chain, radius)', () => {
  const stats = getStats(saveWith({ purchasedNodes: ['l_chain1', 'f_area1'] }));
  assert.equal(stats.lightningChain, 3); // 2 + 1
  assert.equal(stats.fireballRadius, 90); // 70 + 20
});

test('getStats clamps freezeSlowPct to its floor', () => {
  // Buy both slow nodes (-0.1 each): 0.5 -> 0.3, still >= floor 0.2
  const stats = getStats(saveWith({ purchasedNodes: ['w_slow1', 'w_slow2'] }));
  assert.ok(stats.freezeSlowPct >= 0.2);
});

test('isBranchUnlocked: general always open, elemental gated by mastery', () => {
  const general = SKILL_BRANCHES.find((b) => b.element === null);
  const fire = SKILL_BRANCHES.find((b) => b.element === 'fire');
  assert.equal(isBranchUnlocked(saveWith({}), general), true);
  assert.equal(isBranchUnlocked(saveWith({ elements: [] }), fire), false);
  assert.equal(isBranchUnlocked(saveWith({ elements: ['fire'] }), fire), true);
});

test('every branch/track node id exists and each track is a valid requires-chain', () => {
  for (const branch of SKILL_BRANCHES) {
    for (const track of branch.tracks) {
      for (let i = 0; i < track.nodes.length; i++) {
        const id = track.nodes[i];
        assert.ok(SKILL_TREE[id], `missing node ${id}`);
        if (i > 0) {
          assert.ok(
            SKILL_TREE[id].requires.includes(track.nodes[i - 1]),
            `${id} must require ${track.nodes[i - 1]}`,
          );
        }
      }
    }
  }
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/SkillTree.test.js`
Expected: FAIL — `isBranchUnlocked` not exported and node ids like `dmg1` don't exist yet.

- [ ] **Step 3: Rewrite `src/data/skilltree.js` to EXACTLY:**

```js
// Each node: id, label (short, shown in its track column), cost (skill points),
// requires (prereq node ids — the previous node in its track), effect { stat, add }.
// `add` is negative for cooldowns / shotRate / freezeSlowPct (lower = better).
export const SKILL_TREE = {
  // General — Ataque básico
  dmg1:  { id: 'dmg1',  label: '+5',     cost: 1, requires: [],        effect: { stat: 'basicDamage', add: 5 } },
  dmg2:  { id: 'dmg2',  label: '+8',     cost: 2, requires: ['dmg1'],  effect: { stat: 'basicDamage', add: 8 } },
  dmg3:  { id: 'dmg3',  label: '+12',    cost: 3, requires: ['dmg2'],  effect: { stat: 'basicDamage', add: 12 } },
  rate1: { id: 'rate1', label: '−60ms',  cost: 1, requires: [],        effect: { stat: 'shotRate', add: -60 } },
  rate2: { id: 'rate2', label: '−80ms',  cost: 2, requires: ['rate1'], effect: { stat: 'shotRate', add: -80 } },
  rate3: { id: 'rate3', label: '−100ms', cost: 3, requires: ['rate2'], effect: { stat: 'shotRate', add: -100 } },
  // General — Vida
  hp1:    { id: 'hp1',    label: '+25', cost: 1, requires: [],         effect: { stat: 'maxHealth', add: 25 } },
  hp2:    { id: 'hp2',    label: '+40', cost: 2, requires: ['hp1'],    effect: { stat: 'maxHealth', add: 40 } },
  hp3:    { id: 'hp3',    label: '+60', cost: 3, requires: ['hp2'],    effect: { stat: 'maxHealth', add: 60 } },
  regen1: { id: 'regen1', label: '+2/s', cost: 2, requires: [],         effect: { stat: 'healthRegen', add: 2 } },
  regen2: { id: 'regen2', label: '+3/s', cost: 3, requires: ['regen1'], effect: { stat: 'healthRegen', add: 3 } },
  // General — Movilidad
  spd1: { id: 'spd1', label: '+25', cost: 1, requires: [],       effect: { stat: 'moveSpeed', add: 25 } },
  spd2: { id: 'spd2', label: '+35', cost: 2, requires: ['spd1'], effect: { stat: 'moveSpeed', add: 35 } },

  // Fuego
  f_dmg1:  { id: 'f_dmg1',  label: '+15',   cost: 2, requires: [],          effect: { stat: 'fireballDamage', add: 15 } },
  f_dmg2:  { id: 'f_dmg2',  label: '+25',   cost: 3, requires: ['f_dmg1'],  effect: { stat: 'fireballDamage', add: 25 } },
  f_cd1:   { id: 'f_cd1',   label: '−800ms', cost: 2, requires: [],         effect: { stat: 'fireballCooldown', add: -800 } },
  f_cd2:   { id: 'f_cd2',   label: '−800ms', cost: 3, requires: ['f_cd1'],  effect: { stat: 'fireballCooldown', add: -800 } },
  f_area1: { id: 'f_area1', label: '+20',   cost: 2, requires: [],          effect: { stat: 'fireballRadius', add: 20 } },
  f_area2: { id: 'f_area2', label: '+25',   cost: 3, requires: ['f_area1'], effect: { stat: 'fireballRadius', add: 25 } },
  f_burn1: { id: 'f_burn1', label: 'Burn +8/s', cost: 3, requires: [],          effect: { stat: 'burnDamage', add: 8 } },
  f_burn2: { id: 'f_burn2', label: '+6/s',  cost: 3, requires: ['f_burn1'], effect: { stat: 'burnDamage', add: 6 } },

  // Aire (lightning)
  l_dmg1:   { id: 'l_dmg1',   label: '+12',   cost: 2, requires: [],           effect: { stat: 'lightningDamage', add: 12 } },
  l_dmg2:   { id: 'l_dmg2',   label: '+18',   cost: 3, requires: ['l_dmg1'],   effect: { stat: 'lightningDamage', add: 18 } },
  l_cd1:    { id: 'l_cd1',    label: '−800ms', cost: 2, requires: [],          effect: { stat: 'lightningCooldown', add: -800 } },
  l_cd2:    { id: 'l_cd2',    label: '−800ms', cost: 3, requires: ['l_cd1'],   effect: { stat: 'lightningCooldown', add: -800 } },
  l_chain1: { id: 'l_chain1', label: '+1',    cost: 3, requires: [],           effect: { stat: 'lightningChain', add: 1 } },
  l_chain2: { id: 'l_chain2', label: '+1',    cost: 3, requires: ['l_chain1'], effect: { stat: 'lightningChain', add: 1 } },
  l_chain3: { id: 'l_chain3', label: '+1',    cost: 4, requires: ['l_chain2'], effect: { stat: 'lightningChain', add: 1 } },

  // Tierra (poison)
  p_dmg1:  { id: 'p_dmg1',  label: '+8/s',   cost: 2, requires: [],          effect: { stat: 'poisonDamage', add: 8 } },
  p_dmg2:  { id: 'p_dmg2',  label: '+10/s',  cost: 3, requires: ['p_dmg1'],  effect: { stat: 'poisonDamage', add: 10 } },
  p_cd1:   { id: 'p_cd1',   label: '−1000ms', cost: 2, requires: [],         effect: { stat: 'poisonCooldown', add: -1000 } },
  p_cd2:   { id: 'p_cd2',   label: '−1000ms', cost: 3, requires: ['p_cd1'],  effect: { stat: 'poisonCooldown', add: -1000 } },
  p_dur1:  { id: 'p_dur1',  label: '+1.5s',  cost: 2, requires: [],          effect: { stat: 'poisonDuration', add: 1500 } },
  p_dur2:  { id: 'p_dur2',  label: '+1.5s',  cost: 3, requires: ['p_dur1'],  effect: { stat: 'poisonDuration', add: 1500 } },
  p_heal1: { id: 'p_heal1', label: '+5/s',   cost: 3, requires: [],          effect: { stat: 'poisonHeal', add: 5 } },
  p_heal2: { id: 'p_heal2', label: '+6/s',   cost: 3, requires: ['p_heal1'], effect: { stat: 'poisonHeal', add: 6 } },

  // Agua (freeze)
  w_cd1:   { id: 'w_cd1',   label: '−1200ms', cost: 2, requires: [],          effect: { stat: 'freezeCooldown', add: -1200 } },
  w_cd2:   { id: 'w_cd2',   label: '−1200ms', cost: 3, requires: ['w_cd1'],   effect: { stat: 'freezeCooldown', add: -1200 } },
  w_area1: { id: 'w_area1', label: '+25',    cost: 2, requires: [],           effect: { stat: 'freezeRadius', add: 25 } },
  w_area2: { id: 'w_area2', label: '+30',    cost: 3, requires: ['w_area1'],  effect: { stat: 'freezeRadius', add: 30 } },
  w_dur1:  { id: 'w_dur1',  label: '+0.8s',  cost: 2, requires: [],           effect: { stat: 'freezeDuration', add: 800 } },
  w_dur2:  { id: 'w_dur2',  label: '+1.0s',  cost: 3, requires: ['w_dur1'],   effect: { stat: 'freezeDuration', add: 1000 } },
  w_slow1: { id: 'w_slow1', label: '−10%',   cost: 3, requires: [],           effect: { stat: 'freezeSlowPct', add: -0.1 } },
  w_slow2: { id: 'w_slow2', label: '−10%',   cost: 4, requires: ['w_slow1'],  effect: { stat: 'freezeSlowPct', add: -0.1 } },
};

// Branches drive the tabbed UI and elemental gating. element=null → always available.
export const SKILL_BRANCHES = [
  { key: 'basic', label: 'Ataque básico', element: null, tracks: [
    { label: 'Daño',     nodes: ['dmg1', 'dmg2', 'dmg3'] },
    { label: 'Cadencia', nodes: ['rate1', 'rate2', 'rate3'] } ] },
  { key: 'vit', label: 'Vida', element: null, tracks: [
    { label: 'Vida máx', nodes: ['hp1', 'hp2', 'hp3'] },
    { label: 'Regen',    nodes: ['regen1', 'regen2'] } ] },
  { key: 'mob', label: 'Movilidad', element: null, tracks: [
    { label: 'Velocidad', nodes: ['spd1', 'spd2'] } ] },
  { key: 'fire', label: '🔥 Fuego', element: 'fire', tracks: [
    { label: 'Daño',      nodes: ['f_dmg1', 'f_dmg2'] },
    { label: '−Cooldown', nodes: ['f_cd1', 'f_cd2'] },
    { label: 'Área',      nodes: ['f_area1', 'f_area2'] },
    { label: 'Quemadura', nodes: ['f_burn1', 'f_burn2'] } ] },
  { key: 'air', label: '⚡ Aire', element: 'air', tracks: [
    { label: 'Daño',      nodes: ['l_dmg1', 'l_dmg2'] },
    { label: '−Cooldown', nodes: ['l_cd1', 'l_cd2'] },
    { label: 'Cadena',    nodes: ['l_chain1', 'l_chain2', 'l_chain3'] } ] },
  { key: 'earth', label: '☠️ Tierra', element: 'earth', tracks: [
    { label: 'Daño',          nodes: ['p_dmg1', 'p_dmg2'] },
    { label: '−Cooldown',     nodes: ['p_cd1', 'p_cd2'] },
    { label: 'Duración',      nodes: ['p_dur1', 'p_dur2'] },
    { label: 'Regen de zona', nodes: ['p_heal1', 'p_heal2'] } ] },
  { key: 'water', label: '❄️ Agua', element: 'water', tracks: [
    { label: '−Cooldown',     nodes: ['w_cd1', 'w_cd2'] },
    { label: 'Área',          nodes: ['w_area1', 'w_area2'] },
    { label: 'Duración',      nodes: ['w_dur1', 'w_dur2'] },
    { label: 'Ralentización', nodes: ['w_slow1', 'w_slow2'] } ] },
];
```

- [ ] **Step 4: Add `isBranchUnlocked` to `src/systems/SkillTree.js`**

Append this export to `src/systems/SkillTree.js` (the existing `canPurchase`/`purchase`/`getStats` stay unchanged):

```js
// A branch is available when it has no element, or when its element is mastered.
export function isBranchUnlocked(save, branch) {
  if (!branch.element) return true;
  return ((save && save.elements) || []).includes(branch.element);
}
```

- [ ] **Step 5: Run tests** — `node --test tests/SkillTree.test.js` → PASS (8 tests). Then full `node --test` — green. Also `grep -rn "SKILL_TREE_ORDER" src/` — expected only a match in `SkillTreeScene.js` (fixed in Task 2.1); no match in `skilltree.js`.

- [ ] **Step 6: Commit**

```bash
git add src/data/skilltree.js src/systems/SkillTree.js tests/SkillTree.test.js
git commit -m "feat: branching skill tree data + isBranchUnlocked"
```

---

## PHASE 1 — Combat gameplay (regen, fireball radius, burn)

### Task 1.1: Burn state on `Enemy`

**Files:**
- Modify: `src/objects/Enemy.js`

- [ ] **Step 1: Add burn state + method to the constructor**

In `src/objects/Enemy.js`, find the constructor's freeze/slow init lines:

```js
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
  }
```

Replace with:

```js
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
    this.burnRemaining = 0;   // ms burning
    this.burnDps = 0;         // burn damage/sec
  }

  applyBurn(dps, ms) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnRemaining = Math.max(this.burnRemaining, ms);
  }
```

(Burn damage itself is ticked in `GameScene` so that enemy death routes through the scene's `hitEnemy`/phase logic — Task 1.2.)

- [ ] **Step 2: Syntax check** — `node --check src/objects/Enemy.js` (exit 0); `node --test` (green).

- [ ] **Step 3: Commit**

```bash
git add src/objects/Enemy.js
git commit -m "feat: Enemy burn state"
```

---

### Task 1.2: Regen, fireball radius, and burn application in GameScene

**Files:**
- Modify: `src/systems/ProjectilePool.js`
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Reset burn fields when a projectile is fired**

In `src/systems/ProjectilePool.js`, find the `fire(...)` method body where it sets `p.damage` and `p.aoeRadius` (just before computing the angle/velocity). Add a reset of the burn fields right after `p.aoeRadius = radius || 0;`:

```js
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    p.burnDps = 0;             // reset; only fireball sets this after fire()
    p.burnMs = 0;
```

- [ ] **Step 2: `cast_fireball` uses `fireballRadius` and tags the orb with burn**

In `src/scenes/GameScene.js`, find `cast_fireball`:

```js
  cast_fireball() {
    const target = this.caster.nearestEnemy(this.liveEnemies());
    if (!target) return false;
    this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, 70);
    return true;
  }
```

Replace it with:

```js
  cast_fireball() {
    const target = this.caster.nearestEnemy(this.liveEnemies());
    if (!target) return false;
    const orb = this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, this.stats.fireballRadius);
    if (orb && this.stats.burnDamage > 0) { orb.burnDps = this.stats.burnDamage; orb.burnMs = this.stats.burnDuration; }
    return true;
  }
```

- [ ] **Step 3: Apply burn where fireball orbs hit**

In `src/scenes/GameScene.js` `setupCollisions()`, find the orb↔enemy overlap:

```js
    this.physics.add.overlap(this.orbs.group, this.enemies, (orb, enemy) => {
      if (!orb.active || !enemy.active) return;
      this.hitEnemy(enemy, orb.damage);
      if (orb.aoeRadius > 0) this.explode(orb, enemy);
      this.orbs.despawn(orb);
    });
```

Replace it with (applies burn to the directly-hit enemy and, for fireballs, to all enemies caught in the explosion):

```js
    this.physics.add.overlap(this.orbs.group, this.enemies, (orb, enemy) => {
      if (!orb.active || !enemy.active) return;
      this.hitEnemy(enemy, orb.damage);
      if (orb.burnDps > 0 && enemy.active) enemy.applyBurn(orb.burnDps, orb.burnMs);
      if (orb.aoeRadius > 0) this.explode(orb, enemy);
      this.orbs.despawn(orb);
    });
```

Then find `explode(orb, centerEnemy)`:

```js
  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) targets.push(e);
      return true;
    });
    for (const e of targets) this.hitEnemy(e, orb.damage);
  }
```

Replace it with:

```js
  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) targets.push(e);
      return true;
    });
    for (const e of targets) {
      if (orb.burnDps > 0) e.applyBurn(orb.burnDps, orb.burnMs);
      this.hitEnemy(e, orb.damage);
    }
  }
```

- [ ] **Step 4: Tick burn + passive regen in `update()`**

In `src/scenes/GameScene.js` `update(time, delta)`, find the cooldown-decrement line:

```js
    for (const k in this.cooldowns) { if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta; }
```

Add, right after it:

```js
    if (this.stats.healthRegen > 0 && this.caster.hp > 0) {
      this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + this.stats.healthRegen * (delta / 1000));
    }
    this.updateBurns(delta);
```

- [ ] **Step 5: Add `updateBurns`**

Add this method to `GameScene` (e.g., right after `updateZones`):

```js
  updateBurns(delta) {
    const dt = delta / 1000;
    // Snapshot (filter returns a new array) so a kill mid-loop can't skip an enemy.
    const live = this.enemies.getChildren().filter((e) => e.active && e.burnRemaining > 0);
    for (const e of live) {
      e.burnRemaining -= delta;
      this.hitEnemy(e, e.burnDps * dt);
    }
  }
```

- [ ] **Step 6: Verify** — `node --check src/systems/ProjectilePool.js src/scenes/GameScene.js` (exit 0); `node --test` (green).

- [ ] **Step 7: Commit**

```bash
git add src/systems/ProjectilePool.js src/scenes/GameScene.js
git commit -m "feat: passive regen, fireball radius stat, and burn DoT"
```

---

## PHASE 2 — Tabbed skill-tree UI

### Task 2.1: Rewrite `SkillTreeScene` to tabs + tracks

**Files:**
- Modify: `src/scenes/SkillTreeScene.js` (full rewrite)

- [ ] **Step 1: Replace the ENTIRE contents of `src/scenes/SkillTreeScene.js` with EXACTLY:**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILL_TREE, SKILL_BRANCHES } from '../data/skilltree.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { canPurchase, purchase, isBranchUnlocked } from '../systems/SkillTree.js';

export default class SkillTreeScene extends Phaser.Scene {
  constructor() { super('SkillTree'); }

  create() {
    this.save = new SaveSystem(window.localStorage);
    this.state = this.save.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 26, 'Árbol de Habilidades', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#fff',
    }).setOrigin(0.5);
    this.pointsText = this.add.text(GAME_WIDTH / 2, 54, '', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Tabs: one "General" (all element===null branches) + one per elemental branch.
    const general = SKILL_BRANCHES.filter((b) => b.element === null);
    const elementals = SKILL_BRANCHES.filter((b) => b.element !== null);
    this.tabs = [{ label: 'General', branches: general, unlocked: true }];
    for (const b of elementals) {
      this.tabs.push({ label: b.label, branches: [b], unlocked: isBranchUnlocked(this.state, b) });
    }

    this.activeTab = 0;
    this.tabObjs = [];
    const tabW = GAME_WIDTH / this.tabs.length;
    this.tabs.forEach((t, i) => {
      const x = tabW * i + tabW / 2;
      const bg = this.add.rectangle(x, 90, tabW - 4, 30, 0x1b1526).setStrokeStyle(1, 0x33294a).setInteractive();
      this.add.text(x, 90, t.label, { fontFamily: 'sans-serif', fontSize: '13px', color: t.unlocked ? '#fff' : '#777' }).setOrigin(0.5);
      bg.on('pointerdown', () => { this.activeTab = i; this.renderTab(); });
      this.tabObjs.push(bg);
    });

    const cont = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 36, 200, 44, 0x4fc3f7, 0.25).setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'Continuar', { fontFamily: 'sans-serif', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    cont.on('pointerdown', () => this.scene.start('Map'));

    this.nodeLayer = this.add.container(0, 0);
    this.renderTab();
  }

  renderTab() {
    this.nodeLayer.removeAll(true);
    this.pointsText.setText(`Puntos: ${this.state.skillPoints}`);
    this.tabObjs.forEach((bg, i) => bg.setFillStyle(i === this.activeTab ? 0x2a1c3e : 0x1b1526));

    const tab = this.tabs[this.activeTab];
    if (!tab.unlocked) {
      this.nodeLayer.add(this.add.text(GAME_WIDTH / 2, 320, 'Domina este elemento\nen su templo', {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#777', align: 'center',
      }).setOrigin(0.5));
      return;
    }

    let topY = 124;
    for (const branch of tab.branches) {
      this.nodeLayer.add(this.add.text(20, topY, branch.label, {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#cdbff0',
      }));
      const colW = (GAME_WIDTH - 40) / branch.tracks.length;
      branch.tracks.forEach((track, ci) => {
        const cx = 20 + colW * ci + colW / 2;
        this.nodeLayer.add(this.add.text(cx, topY + 22, track.label, {
          fontFamily: 'sans-serif', fontSize: '11px', color: '#9b8fb5',
        }).setOrigin(0.5));
        track.nodes.forEach((nodeId, ni) => this.makeNode(nodeId, cx, topY + 44 + ni * 40));
      });
      const maxNodes = Math.max(...branch.tracks.map((t) => t.nodes.length));
      topY += 44 + maxNodes * 40 + 18;
    }
  }

  makeNode(nodeId, x, y) {
    const node = SKILL_TREE[nodeId];
    const owned = this.state.purchasedNodes.includes(nodeId);
    const check = canPurchase(this.state, nodeId);
    const fill = owned ? 0x1b3a1b : (check.ok ? 0x2a1c3e : 0x161320);
    const stroke = owned ? 0x66bb6a : (check.ok ? 0x4fc3f7 : 0x44395e);
    const box = this.add.rectangle(x, y, 96, 34, fill).setStrokeStyle(2, stroke);
    const txt = owned ? `✔ ${node.label}` : `${node.label} · ${node.cost}pt`;
    const label = this.add.text(x, y, txt, {
      fontFamily: 'sans-serif', fontSize: '10px', color: owned || check.ok ? '#fff' : '#777',
      align: 'center', wordWrap: { width: 88 },
    }).setOrigin(0.5);
    if (!owned && check.ok) {
      box.setInteractive();
      box.on('pointerdown', () => {
        const c = canPurchase(this.state, nodeId);
        if (!c.ok) return;
        this.state = purchase(this.state, nodeId);
        this.save.write(this.state);
        this.renderTab();
      });
    }
    this.nodeLayer.add(box);
    this.nodeLayer.add(label);
  }
}
```

- [ ] **Step 2: Verify** — `node --check src/scenes/SkillTreeScene.js` (exit 0); `node --test` (green). Also `grep -rn "SKILL_TREE_ORDER" src/` — expected NO matches now.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/SkillTreeScene.js
git commit -m "feat: tabbed skill-tree UI with per-track nodes"
```

---

## PHASE 3 — Verification

### Task 3.1: Full check + manual playtest checklist

**Files:** none (verification only)

- [ ] **Step 1: Automated**

Run: `node --test` (all green, incl. the rewritten SkillTree suite).
Run: `node --check src/scenes/SkillTreeScene.js src/scenes/GameScene.js src/objects/Enemy.js src/systems/ProjectilePool.js` (each exit 0).
Run: `grep -rn "SKILL_TREE_ORDER" src/` — expected NO matches.

- [ ] **Step 2: Manual playtest (human)**

`python3 -m http.server 8000`, portrait viewport. From the Map open 🌳 Árbol. Verify:
- Tabs: General + one per element; element tabs you haven't mastered show "Domina este elemento" and no buyable nodes; mastered ones show their tracks.
- Buying a node: deducts points, marks ✔, unlocks the next node in that track; you cannot skip a track's prerequisite; Continuar returns to the Map.
- In a level: buying Regen makes HP slowly refill in combat; buying Fireball Área visibly enlarges the explosion; buying Quemadura makes fireball leave enemies taking damage over time; buying Lightning Cadena chains to more enemies; buying Freeze Ralentización slows elites more.

- [ ] **Step 3: Commit any playtest fixes** (if needed), else done.

---

## Out of scope (deferred)

- **Respec** (gold-cost) → economy cycle (#3); see roadmap §5.
- Gold, shop, consumables → economy (#3).
- Fine balance tuning (costs/effects), art/audio, meta-progression (#4).
