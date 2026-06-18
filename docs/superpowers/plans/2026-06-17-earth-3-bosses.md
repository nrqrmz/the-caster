# Earth World — Bosses Implementation Plan (Plan 3 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five Earth boss fights — El Señor Lobo (nv4), Céfalo & Lélaps → Felino (nv5), La Dríada & su Ent (nv6), El Grifo (nv7), and Circe (nv8) — plus their bespoke setpieces (form transition with a Circe cameo, the petrified-Lélaps block, the Dríada↔Ent death-link, the Grifo flight toggle, Circe's transmute-summon loop and the beasts-revert-to-humans finale), then wire them into the Earth branch.

**Architecture:** Boss data defs live in a new `src/data/bosses/earth.js` (the Air `src/data/bosses/air.js` is the template). Reused engine: `FormSequencer` (2-form Céfalo), `stepBoss` phases, `summon` caps, `healAllies`, `untargetable`, `transmute`/`root` (Plan 1), `lobAoe` poison. New scene support added to `src/scenes/GameScene.js`: a `coBoss` spawn + death-link, a per-frame untargetable gate, a Grifo flight updater, a `transformCameo`, a `StaticBlock` obstacle (no such pattern exists today — modeled on `Temple.js`), and a beasts-revert finale.

**Tech Stack:** Vanilla ES modules, Phaser 3 (CDN), `node:test` for boss-def validation. No bundler, no new deps.

## Global Constraints

- No build step / no bundler / ES modules + Phaser from CDN. — spec §0 / `CLAUDE.md`.
- Pure data in `src/data/`; Phaser-coupled code in `src/scenes/`/`src/objects/`. Texture/color keys via `src/config.js`. — `CLAUDE.md`.
- All boss bars are drawn by `Boss.drawBar()` (reads `_formSeq.hpFraction()` for multi-form, else `hp/maxHp`) — no UIScene change needed for HP bars. — boss-lifecycle report §4.
- A boss phase advances only when `this.bosses.length === 0` (`checkPhaseCleared`). Every boss (and linked co-boss) must end up removed from `this.bosses`. — report §4.
- `step.do` becomes the attack `type` (`Enemy.think` line 77); `executeAttack` handles `melee`/`lobAoe`/`summon`/`submerge`/`transmute` specially and everything else (`shootHoming`/`shootStraight`/`shootSpread`/`dashStrike`/`nova`) via the generic projectile builder. — report §5.
- `enter:` hooks dispatch through `runBossHook(boss, hook)` (GameScene ~line 1015). — report §5.
- All five `branch.kind.*` labels and the 8-level structure already exist; no `levelBuilder`/`Economy`/`BASE_CURVE` changes. — Plan-data report §6/§8.
- **Depends on Plan 1 (engine: `root`/`transmute`/`mutateOnDeath`) and Plan 2 (roster + waves + palette) being merged.**

---

### Task 1: Boss defs scaffold — El Señor Lobo + Circe + validation test

The two bosses that need **no new engine** (pure data over `stepBoss` phases + existing `summon`/`transmute`/`lobAoe`). Create the file with both, plus a validation test for every boss def's cross-references.

**Files:**
- Create: `src/data/bosses/earth.js`
- Test: `tests/EarthBosses.test.js`

**Interfaces:**
- Produces: `SENOR_LOBO`, `CIRCE` (named exports). Both consumed by Task 8's branch wiring. `CIRCE` summons `naufrago_encantado` (captives, from Plan 2) and fires `transmute` (Plan 1) + `lobAoe` with `root` (Plan 1/2).

- [ ] **Step 1: Write the failing validation test**

Create `tests/EarthBosses.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as BOSSES from '../src/data/bosses/earth.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

const named = Object.values(BOSSES).filter((b) => b && b.key);

function checkSummonTargets(def, label) {
  for (const phase of def.phases || []) {
    for (const step of phase.sequence || []) {
      if (step.do === 'summon') {
        const types = step.spawnTypes || [step.spawnType];
        for (const t of types) assert.ok(ENEMY_TYPES[t], `${label} summons unknown type ${t}`);
      }
    }
  }
}

test('every boss def has key + numeric core fields', () => {
  for (const b of named) {
    assert.equal(typeof b.key, 'string');
    for (const f of ['hp', 'speed', 'damage', 'radius']) assert.equal(typeof b[f], 'number', `${b.key}.${f}`);
    assert.ok(b.elite === true, `${b.key} must be elite`);
  }
});

test('boss summon spawnTypes resolve (including inside forms)', () => {
  for (const b of named) {
    checkSummonTargets(b, b.key);
    for (const f of b.forms || []) checkSummonTargets(f, `${b.key}:${f.key}`);
  }
});

test('Señor Lobo and Circe are exported and multi-phase', () => {
  assert.ok(BOSSES.SENOR_LOBO && BOSSES.SENOR_LOBO.phases.length >= 2);
  assert.ok(BOSSES.CIRCE && BOSSES.CIRCE.phases.length === 3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/EarthBosses.test.js`
Expected: FAIL — cannot import `../src/data/bosses/earth.js`.

- [ ] **Step 3: Create the file with both bosses**

Create `src/data/bosses/earth.js`:

```js
// src/data/bosses/earth.js — El Jardín de Circe bosses.
import { COLORS, TEX } from '../../config.js';

// nv4 miniboss — fast licántrope bruiser that harries and calls the pack.
export const SENOR_LOBO = {
  key: 'senor_lobo', tex: TEX.miniboss, color: COLORS.beastFur,
  hp: 460, speed: 120, damage: 18, radius: 22, elite: true,
  modifiers: [{ type: 'drain', heal: 8 }],
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 18, range: 80, telegraph: 320, dur: 420 },
      { do: 'wait', dur: 600 },
      { do: 'summon', spawnType: 'lobo', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.5, speedMul: 1.3, sequence: [
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 280, dur: 380 },
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 260, dur: 360 },
      { do: 'summon', spawnType: 'lobo', count: 3, cap: 6, respawnMs: 10000, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

// nv8 templeboss — Circe, summoner pura. Releases captives and transmutes them into beasts.
// `taunts` drives a floating-text line (Task 7); death triggers revertBeasts (Task 7).
export const CIRCE = {
  key: 'circe', tex: TEX.boss, color: COLORS.sporeViolet,
  hp: 900, speed: 60, damage: 12, radius: 24, elite: true,
  taunts: ['story.earth.circe.taunt.0', 'story.earth.circe.taunt.1'],
  movement: { type: 'kite', range: 240 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 4, respawnMs: 6000, dur: 800 },
      { do: 'transmute', speed: 150, dur: 700 },
      { do: 'shootSpread', count: 3, arc: 50, speed: 210, damage: 11, telegraph: 300, dur: 650 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.66, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 5, respawnMs: 5500, dur: 700 },
      { do: 'transmute', speed: 160, dur: 600 },
      { do: 'lobAoe', radius: 60, dps: 28, duration: 3500, root: true, telegraph: 450, dur: 700 },
      { do: 'summon', spawnType: 'hombre_lobo', count: 1, cap: 1, respawnMs: 14000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.33, speedMul: 1.1, sequence: [
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'lobAoe', radius: 64, dps: 32, duration: 3500, telegraph: 380, dur: 650 },
      { do: 'summon', spawnTypes: ['hombre_lobo', 'oso_jardin'], count: 1, cap: 2, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};
```

- [ ] **Step 4: Run the validation test to verify it passes**

Run: `node --test tests/EarthBosses.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite + commit**

Run: `node --test` (Expected: PASS)
```bash
git add src/data/bosses/earth.js tests/EarthBosses.test.js
git commit -m "feat(earth): boss defs scaffold — Señor Lobo + Circe + validation test"
```

---

### Task 2: `StaticBlock` — petrified-Lélaps obstacle

No movement-blocking obstacle exists (report §6). Create one modeled on `Temple.js` and a scene helper that registers a caster collider. Used by Task 4 (Lélaps petrifies into a 1:1 block).

**Files:**
- Create: `src/objects/StaticBlock.js`
- Modify: `src/scenes/GameScene.js` (import; add `spawnPetrifyBlock(x, y)` helper near `promoteEnemy` ~line 399; init a `this.blocks` array in `create`/constructor)

**Interfaces:**
- Produces: `new StaticBlock(scene, x, y, size)` (immovable Arcade sprite, tinted stone); `this.spawnPetrifyBlock(x, y)` creates one and adds a `physics.add.collider(this.caster, block)` so the caster cannot walk through it (projectiles pass — they only collide via the orb/shot overlaps, not this collider).

- [ ] **Step 1: Create the object**

Create `src/objects/StaticBlock.js`:

```js
// src/objects/StaticBlock.js — an immovable obstacle the caster cannot walk through.
// Movement-only: projectiles are unaffected (they collide via their own overlaps).
import { TEX, COLORS } from '../config.js';

export default class StaticBlock extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, size = 40) {
    super(scene, x, y, TEX.villager); // reuse a generic 32px texture; tinted to stone
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(size, size);
    if (this.body) { this.body.setSize(size, size); }
    this.setImmovable(true);
    this.setTint(COLORS.stoneGrey);
    this.setDepth(5);
  }
}
```

- [ ] **Step 2: Import + init the blocks list in GameScene**

In `src/scenes/GameScene.js`, add the import near the other object imports:

```js
import StaticBlock from '../objects/StaticBlock.js';
```

In `create()` (where other per-run arrays/groups are initialized), add:

```js
    this.blocks = [];
```

- [ ] **Step 3: Add the spawn helper**

In `src/scenes/GameScene.js`, after `promoteEnemy` (~line 399):

```js
  spawnPetrifyBlock(x, y) {
    const block = new StaticBlock(this, x, y, 40);
    this.blocks.push(block);
    if (this.caster) this.physics.add.collider(this.caster, block);
    this.flashCircle(x, y, 34, COLORS.stoneGrey); // petrify tell
    return block;
  }
```

- [ ] **Step 4: Clean up blocks on phase clear**

In `src/scenes/GameScene.js`, in `checkPhaseCleared`'s boss-clear cleanup (where `bossMechanics`/`tornado`/etc. are nulled, ~line 590), add:

```js
        for (const b of this.blocks) if (b && b.active) b.destroy();
        this.blocks = [];
```

- [ ] **Step 5: Smoke test + commit**

Run: `node -e "console.log('StaticBlock module ok')"` (the object isn't unit-tested — it's Phaser-coupled; verified in Task 4 playtest). Run `node --test` (Expected: PASS, unchanged).
```bash
git add src/objects/StaticBlock.js src/scenes/GameScene.js
git commit -m "feat(earth): StaticBlock obstacle + spawnPetrifyBlock helper"
```

---

### Task 3: `coBoss` spawn + death-link engine

Generic support for a boss that brings a second boss: spawn it, track it in `this.bosses`, and optionally link deaths. Serves both Céfalo+Lélaps (Task 4, no kill-link, just a gate) and Dríada+Ent (Task 5, Ent death kills Dríada).

**Files:**
- Modify: `src/scenes/GameScene.js` (`spawnBoss` before `return this.boss` ~line 222; the non-form boss-death sequence in `hitEnemy` ~line 491; add `updateBossGates()` + call it in `update()`)

**Interfaces:**
- Consumes: boss def flags `coBoss` (a full enemy/boss def object), `coBossKillsMaster: boolean`, `gateUntilCoBossDead: boolean`.
- Produces: on spawn, the co-boss is live and in `this.bosses`; `master._gateGuard = co` when gated; `co._linkKillMaster = master` when kill-linked. `updateBossGates()` clears `master._untargetable` once its guard dies. The death sequence destroys the master when a kill-linked co-boss dies.

- [ ] **Step 1: Spawn the co-boss**

In `src/scenes/GameScene.js`, in `spawnBoss(def)`, immediately before `return this.boss;` (~line 222):

```js
    if (def.coBoss) {
      const co = new Boss(this, GAME_WIDTH / 2 + 70, -40, scaleEnemyDef(def.coBoss, this.diff));
      this.enemies.add(co);
      this.bosses.push(co);
      if (def.coBossKillsMaster) co._linkKillMaster = this.boss; // co dies → master dies (Ent → Dríada)
      if (def.gateUntilCoBossDead) this.boss._gateGuard = co;    // master untargetable until co dies (Céfalo ← Lélaps)
    }
```

- [ ] **Step 2: Kill the master when a kill-linked co-boss dies**

In `src/scenes/GameScene.js`, in `hitEnemy`'s non-form boss-death sequence (after `onEnemyDeath(enemy)` and the `this.bosses = this.bosses.filter(...)` line, ~line 491-498), add — BEFORE the final `this.checkPhaseCleared();`:

```js
      if (enemy._linkKillMaster && enemy._linkKillMaster.active) {
        const master = enemy._linkKillMaster;
        this.onEnemyDeath(master);
        this.bosses = this.bosses.filter((b) => b !== master);
        if (master === this.boss) this.boss = null;
        master.destroy();
      }
```

(If the master is a multi-form boss it would route differently, but Dríada — the only kill-linked master — is single-form, so this direct path is correct.)

- [ ] **Step 3: Add the untargetable-gate updater**

In `src/scenes/GameScene.js`, add a method near `updateRitual` (~line 1232):

```js
  updateBossGates() {
    for (const b of this.bosses) {
      if (b && b.active && b._gateGuard && !b._gateGuard.active) b._untargetable = false;
    }
  }
```

In `update()`, near the `this.updateRitual(delta);` call (~line 968):

```js
    this.updateBossGates();
```

- [ ] **Step 4: Regression + commit**

Run: `node --test` (Expected: PASS — pure suite unaffected).
```bash
git add src/scenes/GameScene.js
git commit -m "feat(earth): coBoss spawn + death-link + untargetable gate engine"
```

---

### Task 4: Céfalo & Lélaps → Felino (nv5)

The hunter + hound duo. Lélaps (the guard) must die first (Céfalo is untargetable until then, via Task 3's gate); Lélaps petrifies into a block (Task 2); then Céfalo's form-1 depletes → Circe cameo → transmute → Felino (form 2). Reuses `FormSequencer` + `deathFeint` choreography.

**Files:**
- Modify: `src/data/bosses/earth.js` (add `LELAPS`, the two form defs, and `CEFALO`)
- Modify: `src/scenes/GameScene.js` (`onEnemyDeath`: petrify when `def.petrifyBlock`; `_beginBossTransform`: Circe cameo when `def.transformCameo`; `executeAttack`: generic `att.tint` override for the wood/silver javelin)
- Modify: `tests/EarthBosses.test.js` (assert Céfalo has 2 forms + coBoss)

**Interfaces:**
- Consumes: Task 2 `spawnPetrifyBlock`; Task 3 `coBoss`/`gateUntilCoBossDead`; `FormSequencer` (`forms:`), `deathFeint`, `_beginBossTransform`, `floatText` (Task 7 — but add a local fallback here; see Step 4).
- Produces: `CEFALO` (templeBoss-style miniboss with `forms`, `coBoss: LELAPS`, `gateUntilCoBossDead: true`, `deathFeint: true`, `transformCameo: true`).

- [ ] **Step 1: Add the defs**

In `src/data/bosses/earth.js`, add:

```js
// The hound "that always catches" — guards Céfalo; petrifies into an impassable block on death.
const LELAPS = {
  key: 'lelaps', tex: TEX.miniboss, color: COLORS.stoneGrey,
  hp: 140, speed: 140, damage: 14, radius: 18, elite: true,
  petrifyBlock: true,
  movement: { type: 'chase' },
  attacks: [{ type: 'melee' }],
};

// Form 1 — the marksman: infallible (homing) wood-and-silver javelin, kept at range.
const CEFALO_HUMANO = {
  key: 'cefalo_humano', tex: TEX.miniboss, color: COLORS.barkBrown,
  hp: 300, speed: 70, damage: 14, radius: 24, resist: 0, elite: true,
  movement: { type: 'kite', range: 230 },
  phases: [ { from: 1.0, sequence: [
    { do: 'shootHoming', speed: 130, damage: 14, tint: COLORS.wood, telegraph: 350, dur: 700 },
    { do: 'shootStraight', speed: 230, damage: 12, tint: COLORS.wood, telegraph: 250, dur: 600 },
    { do: 'wait', dur: 500 },
  ] } ],
};

// Form 2 — the feline Circe made of him: fast, dodgy, melee.
const CEFALO_FELINO = {
  key: 'cefalo_felino', tex: TEX.miniboss, color: COLORS.beastFur,
  hp: 360, speed: 150, damage: 18, radius: 22, resist: 0.10, elite: true,
  movement: { type: 'evade', range: 120 },
  phases: [ { from: 1.0, sequence: [
    { do: 'dashStrike', damage: 18, range: 80, telegraph: 280, dur: 380 },
    { do: 'wait', dur: 450 },
  ] } ],
};

export const CEFALO = {
  key: 'cefalo', tex: TEX.miniboss, color: COLORS.barkBrown,
  hp: 300, speed: 70, damage: 14, radius: 24, elite: true,
  untargetable: true,           // guarded by Lélaps (gate clears when Lélaps dies)
  coBoss: LELAPS,
  gateUntilCoBossDead: true,
  deathFeint: true,             // collapse→rise on the form transition
  transformCameo: true,         // Circe appears in the transition
  movement: { type: 'kite', range: 230 },
  forms: [CEFALO_HUMANO, CEFALO_FELINO],
};
```

- [ ] **Step 2: Petrify Lélaps on death**

In `src/scenes/GameScene.js`, at the top of `onEnemyDeath(enemy)` (~line 502, before the summon-slot release):

```js
    if (enemy.def && enemy.def.petrifyBlock) this.spawnPetrifyBlock(enemy.x, enemy.y);
```

- [ ] **Step 3: Generic javelin tint override in executeAttack**

In `src/scenes/GameScene.js`, in `executeAttack`'s projectile loop, right after `shot.setTint(spec.tint);` (~line 742):

```js
      if (att.tint != null) shot.setTint(att.tint); // step-level tint override (Céfalo's wood javelin)
```

- [ ] **Step 4: Circe cameo in the transform**

In `src/scenes/GameScene.js`, in `_beginBossTransform(boss)` after `boss._transforming = true;` (~line 266):

```js
    if (boss.def && boss.def.transformCameo) {
      this.flashCircle(boss.x, boss.y - 10, 40, COLORS.sporeViolet); // Circe arrives
      this.floatText(boss.x, boss.y - 50, t('story.earth.cefalo.cameo'));
    }
```

This uses `floatText` (added in Task 7) and `t` (i18n, already imported in GameScene). If executing Task 4 before Task 7, add this minimal helper near `flashCircle` first:

```js
  floatText(x, y, str) {
    const txt = this.add.text(x, y, str, { fontSize: '12px', color: '#e1bee7', align: 'center', wordWrap: { width: 200 } }).setOrigin(0.5).setDepth(960);
    this.tweens.add({ targets: txt, y: y - 30, alpha: 0, duration: 1800, onComplete: () => txt.destroy() });
  }
```

(If Task 7 already added `floatText`, skip the helper here — do not duplicate it.)

- [ ] **Step 5: Extend the boss test**

In `tests/EarthBosses.test.js`, add:

```js
test('Céfalo is a 2-form boss guarded by a co-boss', () => {
  assert.equal(BOSSES.CEFALO.forms.length, 2);
  assert.ok(BOSSES.CEFALO.coBoss && BOSSES.CEFALO.coBoss.key === 'lelaps');
  assert.equal(BOSSES.CEFALO.gateUntilCoBossDead, true);
  assert.equal(BOSSES.CEFALO.untargetable, true);
});
```

- [ ] **Step 6: Run tests + regression**

Run: `node --test tests/EarthBosses.test.js` then `node --test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/bosses/earth.js src/scenes/GameScene.js tests/EarthBosses.test.js
git commit -m "feat(earth): nv5 Céfalo & Lélaps → Felino (gate, petrify, cameo, 2 forms)"
```

(Playtest deferred to Task 8 once the branch is wired.)

---

### Task 5: La Dríada & su Ent (nv6)

The healer + tank dual boss with the hamadryad death-link: kill the Ent → the Dríada dies too; kill the Dríada → the Ent fights on (no heals/CC). Reuses `healAllies` (Dríada heals Ent), `root` (raíces/pisotón), and Task 3's `coBoss` + `coBossKillsMaster`.

**Files:**
- Modify: `src/data/bosses/earth.js` (add `ENT_GUARDIAN` + `DRIADA`)
- Modify: `tests/EarthBosses.test.js` (assert the link)

**Interfaces:**
- Consumes: Task 3 `coBoss`/`coBossKillsMaster`; `healAllies` modifier; `root` on `lobAoe` (Plan 1/2).
- Produces: `DRIADA` (master, `coBoss: ENT_GUARDIAN`, `coBossKillsMaster: true`).

- [ ] **Step 1: Add the defs**

In `src/data/bosses/earth.js`, add:

```js
// The tank: slow, high-HP, stomps for root. Its death kills the bound Dríada (hamadryad link).
const ENT_GUARDIAN = {
  key: 'ent_guardian', tex: TEX.boss, color: COLORS.barkBrown,
  hp: 520, speed: 40, damage: 18, radius: 26, resist: 0.10, elite: true,
  movement: { type: 'chase' },
  phases: [ { from: 1.0, sequence: [
    { do: 'lobAoe', radius: 55, duration: 1500, root: true, telegraph: 550, dur: 700 }, // pisotón
    { do: 'wait', dur: 700 },
  ] } ],
};

// The brain: mobile (kite, NOT flee), stays at heal range, heals the Ent + roots you with raíces.
export const DRIADA = {
  key: 'driada', tex: TEX.miniboss, color: COLORS.mossGreen,
  hp: 280, speed: 75, damage: 10, radius: 24, elite: true,
  coBoss: ENT_GUARDIAN,
  coBossKillsMaster: true,        // killing the Ent kills the Dríada
  modifiers: [{ type: 'healAllies', hps: 15, radius: 220 }],
  movement: { type: 'kite', range: 230 },
  phases: [ { from: 1.0, sequence: [
    { do: 'lobAoe', radius: 50, duration: 1500, root: true, telegraph: 500, dur: 650 }, // raíces
    { do: 'lobAoe', radius: 60, dps: 26, duration: 3000, telegraph: 450, dur: 700 },     // poison floor
    { do: 'summon', spawnType: 'flor_carnivora', count: 1, cap: 2, respawnMs: 11000, dur: 700 },
    { do: 'wait', dur: 500 },
  ] } ],
};
```

(Note: the Ent is `coBoss` of the Dríada, so the Dríada is the master spawned by `spawnBoss` and the Ent is added to `this.bosses`. `coBossKillsMaster: true` means Ent-death → Dríada-death via Task 3 Step 2.)

- [ ] **Step 2: Extend the boss test**

In `tests/EarthBosses.test.js`, add:

```js
test('Dríada is kill-linked to its Ent and heals allies', () => {
  assert.ok(BOSSES.DRIADA.coBoss && BOSSES.DRIADA.coBoss.key === 'ent_guardian');
  assert.equal(BOSSES.DRIADA.coBossKillsMaster, true);
  assert.ok((BOSSES.DRIADA.modifiers || []).some((m) => m.type === 'healAllies'));
});
```

- [ ] **Step 3: Run tests + regression + commit**

Run: `node --test tests/EarthBosses.test.js` then `node --test` (Expected: PASS)
```bash
git add src/data/bosses/earth.js tests/EarthBosses.test.js
git commit -m "feat(earth): nv6 La Dríada & su Ent (heal + hamadryad death-link)"
```

---

### Task 6: El Grifo (nv7 levelboss)

Aerial boss: untargetable while flying (dive-bombs), reachable on the ground (damage window). A per-frame updater enforces the anti-spam balance — ground is the default and always returns; flight is bounded.

**Files:**
- Modify: `src/data/tuning.js` (add `GRIFFIN_GROUND_MS`, `GRIFFIN_FLIGHT_MS`)
- Modify: `src/data/bosses/earth.js` (add `GRIFO`)
- Modify: `src/scenes/GameScene.js` (add `updateGriffin(delta)`; call it in `update()`)

**Interfaces:**
- Consumes: `flying`/`untargetable` flags; `summon`/`dashStrike` steps.
- Produces: `GRIFO` (`griffin: true`, `flying: true`, high HP); `updateGriffin(delta)` toggles `boss._untargetable` between bounded flight and guaranteed ground windows.

- [ ] **Step 1: Add tuning constants**

In `src/data/tuning.js`, near the other boss-pacing constants (e.g. by `RITUAL_FILL_MS`):

```js
export const GRIFFIN_GROUND_MS = 5000; // reachable window — generous + always returns (anti-spam)
export const GRIFFIN_FLIGHT_MS = 3000; // bounded untargetable dive window
```

- [ ] **Step 2: Add the def**

In `src/data/bosses/earth.js`, add:

```js
// nv7 levelboss — guardian of Circe's sanctum. Alternates flight (untargetable dives) and ground (window).
export const GRIFO = {
  key: 'grifo', tex: TEX.boss, color: COLORS.barkBrown,
  hp: 700, speed: 110, damage: 20, radius: 26, resist: 0.20, elite: true,
  flying: true,
  griffin: true, // drives updateGriffin's flight/ground state machine
  movement: { type: 'charge', windup: 420, dash: 360, recover: 520, dashMul: 3.0 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'lobo', count: 2, cap: 4, respawnMs: 9000, dur: 800 },
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 320, dur: 420 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.45, speedMul: 1.15, sequence: [
      { do: 'summon', spawnTypes: ['lobo', 'jabali'], count: 2, cap: 5, respawnMs: 8000, dur: 750 },
      { do: 'dashStrike', damage: 22, range: 100, telegraph: 280, dur: 400 },
      { do: 'dashStrike', damage: 22, range: 100, telegraph: 260, dur: 380 },
      { do: 'wait', dur: 400 },
    ] },
  ],
};
```

- [ ] **Step 3: Add the flight updater**

In `src/scenes/GameScene.js`, add a method near `updateBossGates` (~line 1232), and import `GRIFFIN_GROUND_MS, GRIFFIN_FLIGHT_MS` from `../data/tuning.js`:

```js
  updateGriffin(delta) {
    for (const b of this.bosses) {
      if (!b || !b.active || !b.def || !b.def.griffin) continue;
      if (b._griffin == null) { b._griffin = { mode: 'ground', t: GRIFFIN_GROUND_MS }; b._untargetable = false; }
      const g = b._griffin;
      g.t -= delta;
      if (g.t <= 0) {
        if (g.mode === 'ground') { g.mode = 'flight'; g.t = GRIFFIN_FLIGHT_MS; b._untargetable = true; b.setAlpha(0.6); }
        else { g.mode = 'ground'; g.t = GRIFFIN_GROUND_MS; b._untargetable = false; b.setAlpha(1); }
      }
    }
  }
```

In `update()`, near `this.updateBossGates();` (Task 3):

```js
    this.updateGriffin(delta);
```

- [ ] **Step 4: Export check in the test**

In `tests/EarthBosses.test.js`, add:

```js
test('Grifo is a high-HP flying griffin', () => {
  assert.ok(BOSSES.GRIFO.griffin === true && BOSSES.GRIFO.flying === true);
  assert.ok(BOSSES.GRIFO.hp >= 650);
});
```

- [ ] **Step 5: Run tests + regression + commit**

Run: `node --test tests/EarthBosses.test.js` then `node --test` (Expected: PASS)
```bash
git add src/data/tuning.js src/data/bosses/earth.js src/scenes/GameScene.js
git commit -m "feat(earth): nv7 El Grifo — flight/ground toggle with anti-spam"
```

---

### Task 7: Circe's taunts + beasts-revert finale

Circe's floating-text taunts during the fight, and the catharsis on her death: surviving beasts revert to fleeing humans.

**Files:**
- Modify: `src/scenes/GameScene.js` (`spawnBoss`: seed `_tauntT` when `def.taunts`; add `floatText` (if not already added in Task 4), `updateBossTaunts(delta)`, `revertBeasts()`; call `updateBossTaunts` in `update()`; trigger `revertBeasts` on Circe's death)
- Modify: `src/data/tuning.js` (add `BOSS_TAUNT_EVERY`)

**Interfaces:**
- Consumes: `CIRCE.taunts` (i18n keys, Task 1); `floatText`.
- Produces: periodic taunt text above Circe; on Circe death, active non-captive beasts become `sierva_jardin` (fleeing humans).

- [ ] **Step 1: Add tuning constant**

In `src/data/tuning.js`:

```js
export const BOSS_TAUNT_EVERY = 7000; // ms between a boss's floating taunts
```

- [ ] **Step 2: Seed the taunt timer on spawn**

In `src/scenes/GameScene.js`, in `spawnBoss(def)` after the `ritual` block (~line 209):

```js
    if (def.taunts && def.taunts.length) { this.boss._tauntT = BOSS_TAUNT_EVERY; this.boss._tauntI = 0; }
```

Import `BOSS_TAUNT_EVERY` from `../data/tuning.js`.

- [ ] **Step 3: Add floatText (if absent), the taunt updater, and revertBeasts**

In `src/scenes/GameScene.js`, near `flashCircle`/`updateGriffin`. Add `floatText` ONLY if Task 4 did not already add it:

```js
  floatText(x, y, str) {
    const txt = this.add.text(x, y, str, { fontSize: '12px', color: '#e1bee7', align: 'center', wordWrap: { width: 200 } }).setOrigin(0.5).setDepth(960);
    this.tweens.add({ targets: txt, y: y - 30, alpha: 0, duration: 1800, onComplete: () => txt.destroy() });
  }

  updateBossTaunts(delta) {
    for (const b of this.bosses) {
      if (!b || !b.active || !b.def || !b.def.taunts || b._tauntT == null) continue;
      b._tauntT -= delta;
      if (b._tauntT <= 0) {
        b._tauntT = BOSS_TAUNT_EVERY;
        const key = b.def.taunts[b._tauntI % b.def.taunts.length];
        b._tauntI += 1;
        this.floatText(b.x, b.y - 40, t(key));
      }
    }
  }

  revertBeasts() {
    const BEASTS = new Set(['lobo', 'jabali', 'oso_jardin', 'hombre_lobo', 'pixie', 'duende_ladron', 'cefalo_felino']);
    this.enemies.getChildren().forEach((e) => {
      if (!e || !e.active || !e.def || !BEASTS.has(e.def.key)) return;
      e.setTint(COLORS.fleshPale); // beast reverts to a freed human
      e.def = { ...e.def, movement: { type: 'flee' }, attacks: [] };
    });
  }
```

In `update()`, near `this.updateGriffin(delta);`:

```js
    this.updateBossTaunts(delta);
```

- [ ] **Step 4: Trigger the finale on Circe's death**

In `src/scenes/GameScene.js`, in `hitEnemy`'s non-form boss-death sequence (~line 491, right after `onEnemyDeath(enemy)`):

```js
      if (enemy.def && enemy.def.key === 'circe') this.revertBeasts();
```

- [ ] **Step 5: Regression + commit**

Run: `node --test` (Expected: PASS).
```bash
git add src/data/tuning.js src/scenes/GameScene.js
git commit -m "feat(earth): Circe taunts + beasts-revert-to-humans finale"
```

---

### Task 8: Wire the bosses into the Earth branch + story strings + full playtest

Connect all five bosses to the branch, add the boss/finale i18n, and play the whole world.

**Files:**
- Modify: `src/data/regions.js` (boss imports; the `earth` branch — `minibosses`, `levelBoss`, `templeBoss`, `onClear`)
- Modify: `src/i18n/locales/es.js` + `src/i18n/locales/en.js` (`story.earth.cefalo.cameo`, `story.earth.circe.taunt.0/1`, `story.earth.circe.clear.*`, `speaker.circe`)

**Interfaces:**
- Consumes: all five boss exports from Task 1/4/5/6.
- Produces: a fully wired, playable 8-level Earth world ending in Circe → Castle unlock.

- [ ] **Step 1: Import the bosses**

In `src/data/regions.js`, near the other boss imports (~line 8):

```js
import { SENOR_LOBO, CEFALO, DRIADA, GRIFO, CIRCE } from './bosses/earth.js';
```

- [ ] **Step 2: Wire the branch**

In `src/data/regions.js`, update the `earth: makeBranch({...})` (from Plan 2 Task 3) to add the bosses + `onClear`:

```js
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'region.earth.name', grantsSkill: 'poison',
    basic: earthWaves, inter: earthInterWaves,
    minibosses: [SENOR_LOBO, CEFALO, DRIADA],
    levelBoss: GRIFO,
    templeBoss: CIRCE,
    intro: [{ speaker: 'speaker.narrator', text: 'story.earth.intro.0' }],
    mageName: 'speaker.mage.earth',
    mageLines: ['story.earth.mage.0', 'story.earth.mage.1'],
    onClear: [
      { speaker: 'speaker.circe',   text: 'story.earth.circe.clear.0' },
      { speaker: 'speaker.caster',  text: 'story.earth.circe.clear.1' },
      { speaker: 'speaker.narrator', text: 'story.earth.circe.clear.2' },
    ],
  }),
```

- [ ] **Step 3: Add the boss/finale strings (es)**

In `src/i18n/locales/es.js`, add at the right nested keys:

```js
// speaker.circe:
'Circe',
// story.earth.cefalo.cameo:
'Un cazador sin su presa… qué triste. Te daré garras propias.',
// story.earth.circe.taunt.0:
'No los odio… solo desperdician la forma que tienen.',
// story.earth.circe.taunt.1:
'Cuando acabe contigo, serás un conejito precioso.',
// story.earth.circe.clear.0:
'No… mi jardín… mis criaturas…',
// story.earth.circe.clear.1:
'Vuelven a ser quienes eran. Tu jardín nunca fue tuyo, Circe.',
// story.earth.circe.clear.2:
'El último elemento es tuyo. Solo queda el castillo… y la verdad que esconde.',
```

- [ ] **Step 4: Add the boss/finale strings (en)**

In `src/i18n/locales/en.js`:

```js
// speaker.circe:
'Circe',
// story.earth.cefalo.cameo:
'A hunter without his quarry… how sad. I will give you claws of your own.',
// story.earth.circe.taunt.0:
"I don't hate them… they simply waste the form they have.",
// story.earth.circe.taunt.1:
"When I'm done with you, you'll be a darling little rabbit.",
// story.earth.circe.clear.0:
'No… my garden… my creatures…',
// story.earth.circe.clear.1:
'They are who they were again. Your garden was never yours, Circe.',
// story.earth.circe.clear.2:
'The last element is yours. Only the castle remains… and the truth it hides.',
```

- [ ] **Step 5: Verify the new keys resolve in both locales**

Run: `node -e "Promise.all([import('./src/i18n/locales/es.js'),import('./src/i18n/locales/en.js')]).then(([es,en])=>{const g=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o.default);for(const p of ['speaker.circe','story.earth.cefalo.cameo','story.earth.circe.taunt.0','story.earth.circe.taunt.1','story.earth.circe.clear.0','story.earth.circe.clear.1','story.earth.circe.clear.2']){if(!g(es,p))throw new Error('es '+p);if(!g(en,p))throw new Error('en '+p);}console.log('all earth boss keys present');})"`
Expected: prints `all earth boss keys present`.

- [ ] **Step 6: Full regression**

Run: `node --test`
Expected: PASS — full suite green (CombatSystem root, EnemyBrain transmute/mutate, EarthRoster, EarthBosses, plus all existing).

- [ ] **Step 7: Full manual playtest (Earth, levels 1–8)**

Run: `python3 -m http.server 8000`. Play the whole Earth branch:
- **nv4 Señor Lobo:** fast charges, drains, summons wolves; phase-2 double charge + bigger pack.
- **nv5 Céfalo & Lélaps:** Céfalo can't be damaged (untargetable) while Lélaps lives; kill Lélaps → it petrifies into a block you can't walk through (orbs still pass); Céfalo becomes targetable; at 0 HP → Circe cameo text + collapse → Felino (fast, dodgy); kill the Felino to clear.
- **nv6 Dríada & Ent:** the Dríada kites at heal-range and heals the Ent; roots you with raíces; verify both routes — killing the Ent also drops the Dríada; killing the Dríada leaves the Ent alive (no more heals). Confirm Fireball burning chews the healed tank.
- **nv7 Grifo:** flies (translucent, untargetable, dive-bombs + summons) for ~3s, then lands (~5s reachable) every cycle — confirm the ground window always returns and the air phase never stalls.
- **nv8 Circe:** releases captives and transmutes them into beasts (race to kill captives first); roots + poison floors; taunts float ("conejito precioso"); on death, surviving beasts turn pale and flee, then the clear dialogue plays and the Castle unlocks.

- [ ] **Step 8: Commit**

```bash
git add src/data/regions.js src/i18n/locales/es.js src/i18n/locales/en.js
git commit -m "feat(earth): wire 5 bosses into the branch + story strings (Circe finale)"
```

---

## Self-Review

**Spec coverage (spec §4):**
- §4.1 Señor Lobo → Task 1. ✓
- §4.2 Céfalo & Lélaps → Felino (gate, petrify block, Circe cameo, 2 forms) → Tasks 2–4. ✓
- §4.3 Dríada & Ent (heal + hamadryad death-link, both routes) → Tasks 3, 5. ✓
- §4.4 Grifo (flight/ground anti-spam, high HP, summons) → Task 6. ✓
- §4.5 Circe (summoner pura, summon+transmute+poison floor+root, 3 phases, taunts, revert finale, onClear → Castle) → Tasks 1, 7, 8. ✓
- §2.5 cages/caves scenery → realized as Circe's `summon` spawn points (existing edge-spawn); the literal tree-cage art is cosmetic/deferred to sprites (spec §8 out-of-scope). Noted.

**Placeholder scan:** none — every boss def, scene method, and string is concrete.

**Type consistency:** `coBoss`/`coBossKillsMaster`/`gateUntilCoBossDead` (Task 3 produces, Tasks 4/5 consume), `petrifyBlock` (Task 4 def → Task 2 helper via Task 4 Step 2), `griffin` (Task 6 def → updater), `taunts`/`_tauntT` (Task 1 def → Task 7), `transformCameo` (Task 4 def → `_beginBossTransform`), `att.tint` (Task 4 step → executeAttack), `floatText` (defined once — Task 4 or Task 7, with an explicit no-duplicate note). All summon `spawnType`s (`lobo`/`jabali`/`oso_jardin`/`hombre_lobo`/`naufrago_encantado`/`flor_carnivora`) exist in the Plan 2 roster; the boss test asserts this.

**Cross-plan dependency:** Plan 1 (`root`/`transmute`) and Plan 2 (roster/waves/palette) must be merged first — Circe's `transmute` step and the captive summons, the Dríada/Ent/Coloso `root`, and every boss color depend on them.
