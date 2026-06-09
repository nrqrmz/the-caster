# The Caster — Campaign Scenario Dynamics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single hardcoded scenario with an explorable campaign: 4 elemental branches (fire/water/air/earth), each a linear path of 7 levels ending in a temple boss, plus a King's Castle branch gated behind mastering all 4 elements — navigated through a two-screen map, with power-scaled difficulty and per-level save progress.

**Architecture:** Pure, Phaser-free logic (generalized `WaveRunner`, new `Campaign`, `Difficulty`, level builder, and a `SaveSystem` v2 migration) is built first with `node --test`. The Phaser layer then consumes it: `GameScene` becomes phase-driven (it runs whatever ordered `phases` a level declares), a `BossMechanics` engine gives temple bosses elemental attacks, and two new scenes (`MapScene` portals, `BranchScene` path) drive navigation. Content is data-driven: regions/levels are built by compact factory helpers, art is reused geometric textures.

**Tech Stack:** Phaser 3.80 (CDN), vanilla ES modules, localStorage, Node `--test` for pure-logic units. No build step.

---

## Conventions used throughout this plan

- Run from `the-caster/`. Tests: `node --test` (Node 18+). Game: `python3 -m http.server 8000`, open in a portrait mobile viewport / device toolbar.
- **Commit after every task** (Conventional Commits).
- Pure logic (`src/systems/{WaveRunner,Campaign,Difficulty,SaveSystem}`, `src/data/*`) imports **no Phaser**. Phaser-coupled code (`scenes/*`, `objects/*`, `BossMechanics`) is verified by playtest.
- Texture/color keys come from `config.js` (`TEX`, `COLORS`) — never inline a key or hex.

## File Structure

**Create:**
- `src/data/levelBuilder.js` — pure: `KIND_PHASES`, `makeLevel()` (expands a `kind` + spec into a level with an ordered `phases` array).
- `src/data/regions.js` — pure: region/level content for the 4 elements + castle, plus `REGIONS`, `REGION_ORDER`, `CASTLE_ID`, `REQUIRED_ELEMENTS`.
- `src/systems/Campaign.js` — pure: unlock/progress rules (`isLevelUnlocked`, `clearedCount`, `isRegionComplete`, `isCastleUnlocked`, `grantClear`).
- `src/systems/Difficulty.js` — pure: `difficultyMultiplier(save)`, `scaleEnemyDef(def, mult)`.
- `src/systems/BossMechanics.js` — Phaser-coupled: timed elemental attacks for bosses.
- `src/scenes/MapScene.js` — portals: 4 elements + castle (locked), skill-tree access.
- `src/scenes/BranchScene.js` — the 7-node path of one region.
- `tests/levelBuilder.test.js`, `tests/Difficulty.test.js`, `tests/Campaign.test.js`, `tests/regions.test.js`.

**Modify:**
- `src/systems/WaveRunner.js` — generalize to a phase-list sequencer.
- `src/systems/SaveSystem.js` — v2 shape + v1→v2 migration.
- `src/scenes/GameScene.js` — phase-driven; consumes a level; applies difficulty; finishes via `Campaign`.
- `src/scenes/MenuScene.js` — start the campaign at `MapScene`.
- `src/scenes/SkillTreeScene.js` — "Continuar" returns to `MapScene`.
- `src/main.js` — register `MapScene`, `BranchScene`.
- `tests/WaveRunner.test.js`, `tests/SaveSystem.test.js` — rewrite for the new APIs.

**Left as-is / deferred:** `objects/{Caster,Enemy,Boss,Temple}.js`, `ProjectilePool`, `InputSystem`, `UIScene`, `DialogueScene`, `BootScene`. `data/scenarios.js` becomes unused (see Task 5.1).

---

## PHASE 0 — Pure logic foundation (TDD)

### Task 0.1: Generalize `WaveRunner` to a phase-list sequencer

`WaveRunner` stops hardcoding `wave→miniboss→temple→boss`. It walks whatever ordered `phases` array a level declares. `phase` becomes a getter returning the current phase's `type` (or `'done'`).

**Files:**
- Modify: `src/systems/WaveRunner.js` (full rewrite)
- Modify: `tests/WaveRunner.test.js` (full rewrite)

- [ ] **Step 1: Rewrite the test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveRunner } from '../src/systems/WaveRunner.js';

const level = {
  phases: [
    { type: 'wave', spawns: [{ type: 'villager', count: 2 }], spawnDelay: 100 },
    { type: 'wave', spawns: [{ type: 'villager', count: 1 }], spawnDelay: 100 },
    { type: 'miniboss', enemyDef: { hp: 10 } },
    { type: 'levelBoss', enemyDef: { hp: 20 } },
  ],
};

test('starts at the first phase', () => {
  const r = new WaveRunner(level);
  assert.equal(r.phase, 'wave');
  assert.equal(r.index, 0);
  assert.equal(r.currentPhase().spawns[0].count, 2);
});

test('onCleared walks the phase list then reports done', () => {
  const r = new WaveRunner(level);
  assert.equal(r.phase, 'wave');
  r.onCleared(); assert.equal(r.phase, 'wave');
  assert.equal(r.currentPhase().spawns[0].count, 1);
  r.onCleared(); assert.equal(r.phase, 'miniboss');
  r.onCleared(); assert.equal(r.phase, 'levelBoss');
  r.onCleared(); assert.equal(r.phase, 'done');
});

test('isComplete only true past the last phase', () => {
  const r = new WaveRunner(level);
  assert.equal(r.isComplete(), false);
  for (let i = 0; i < 4; i++) r.onCleared();
  assert.equal(r.isComplete(), true);
  assert.equal(r.currentPhase(), null);
});

test('a temple level with a single templeBoss phase', () => {
  const r = new WaveRunner({ phases: [{ type: 'templeBoss', enemyDef: { hp: 99 } }] });
  assert.equal(r.phase, 'templeBoss');
  r.onCleared();
  assert.equal(r.phase, 'done');
  assert.equal(r.isComplete(), true);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/WaveRunner.test.js`
Expected: FAIL (old `WaveRunner` has no `index`/`currentPhase`; `phase` is a property, not a getter over `phases`).

- [ ] **Step 3: Rewrite `src/systems/WaveRunner.js`**

```js
// src/systems/WaveRunner.js
// Generic sequencer over a level's ordered `phases` array. No hardcoded order.
export class WaveRunner {
  constructor(level) {
    this.level = level;
    this.phases = level.phases || [];
    this.index = 0;
  }

  // Current phase's type string, or 'done' when past the last phase.
  get phase() {
    const p = this.phases[this.index];
    return p ? p.type : 'done';
  }

  // The full descriptor for the current phase (spawns, enemyDef, mechanics…), or null.
  currentPhase() {
    return this.phases[this.index] || null;
  }

  // Called by GameScene when the current phase is cleared.
  onCleared() {
    if (this.index < this.phases.length) this.index += 1;
  }

  isComplete() {
    return this.index >= this.phases.length;
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/WaveRunner.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/WaveRunner.js tests/WaveRunner.test.js
git commit -m "refactor: generalize WaveRunner into a phase-list sequencer"
```

---

### Task 0.2: Level builder (`makeLevel`)

A pure helper that turns a `kind` preset (`basic`/`intermediate`/`pretemple`/`temple`) plus a compact spec into a level object with a fully expanded `phases` array. Keeps `regions.js` DRY.

**Files:**
- Create: `src/data/levelBuilder.js`
- Create: `tests/levelBuilder.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeLevel, KIND_PHASES, DEFAULT_REWARD } from '../src/data/levelBuilder.js';

const waves = [
  { spawnDelay: 700, spawns: [{ type: 'villager', count: 5 }] },
  { spawnDelay: 650, spawns: [{ type: 'villager', count: 4 }] },
  { spawnDelay: 600, spawns: [{ type: 'warrior', count: 2 }] },
];

test('basic kind expands to three wave phases consuming waves in order', () => {
  const lv = makeLevel('fire_1', 'fire', 'basic', { waves });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'wave']);
  assert.equal(lv.phases[0].spawns[0].count, 5);
  assert.equal(lv.phases[2].spawns[0].count, 2);
  assert.equal(lv.id, 'fire_1');
  assert.equal(lv.regionId, 'fire');
  assert.equal(lv.kind, 'basic');
});

test('intermediate kind = two waves + a miniboss phase', () => {
  const lv = makeLevel('fire_4', 'fire', 'intermediate', {
    waves, miniboss: { hp: 300, damage: 18 },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'miniboss']);
  assert.equal(lv.phases[2].enemyDef.hp, 300);
});

test('pretemple kind = two waves + miniboss + levelBoss', () => {
  const lv = makeLevel('fire_6', 'fire', 'pretemple', {
    waves, miniboss: { hp: 300 }, levelBoss: { hp: 600, damage: 22 },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['wave', 'wave', 'miniboss', 'levelBoss']);
  assert.equal(lv.phases[3].enemyDef.hp, 600);
});

test('temple kind = a single templeBoss phase carrying mechanics + minions', () => {
  const lv = makeLevel('fire_7', 'fire', 'temple', {
    templeBoss: { hp: 900, mechanics: [{ type: 'nova', every: 3000 }] },
    minions: [{ type: 'villager', count: 4 }],
    dialogue: { onClear: [{ speaker: 'Mago', text: '...' }] },
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['templeBoss']);
  assert.equal(lv.phases[0].enemyDef.hp, 900);
  assert.equal(lv.phases[0].mechanics[0].type, 'nova');
  assert.deepEqual(lv.phases[0].minions, [{ type: 'villager', count: 4 }]);
  assert.deepEqual(lv.dialogue.onClear[0].speaker, 'Mago');
});

test('reward defaults by kind, override-able', () => {
  assert.equal(makeLevel('a', 'r', 'basic', { waves }).reward.skillPoints, DEFAULT_REWARD.basic);
  assert.equal(makeLevel('b', 'r', 'temple', { templeBoss: {} }).reward.skillPoints, DEFAULT_REWARD.temple);
  assert.equal(makeLevel('c', 'r', 'basic', { waves, skillPoints: 9 }).reward.skillPoints, 9);
});

test('unknown kind throws', () => {
  assert.throws(() => makeLevel('x', 'r', 'nope', {}), /kind desconocido/);
});

test('KIND_PHASES documents the presets', () => {
  assert.deepEqual(KIND_PHASES.basic, ['wave', 'wave', 'wave']);
  assert.deepEqual(KIND_PHASES.temple, ['templeBoss']);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/levelBuilder.test.js`
Expected: FAIL — cannot find module `../src/data/levelBuilder.js`.

- [ ] **Step 3: Write `src/data/levelBuilder.js`**

```js
// src/data/levelBuilder.js
// Pure: expands a level `kind` preset + compact spec into a level with an
// ordered `phases` array consumed by WaveRunner/GameScene. No Phaser.

export const KIND_PHASES = {
  basic:        ['wave', 'wave', 'wave'],
  intermediate: ['wave', 'wave', 'miniboss'],
  pretemple:    ['wave', 'wave', 'miniboss', 'levelBoss'],
  temple:       ['templeBoss'],
};

export const DEFAULT_REWARD = { basic: 1, intermediate: 2, pretemple: 3, temple: 4 };

function buildPhase(type, spec, waveCursor) {
  if (type === 'wave') {
    const w = spec.waves[waveCursor.i++ % spec.waves.length];
    return { type: 'wave', spawnDelay: w.spawnDelay, spawns: w.spawns };
  }
  if (type === 'miniboss')  return { type: 'miniboss', enemyDef: spec.miniboss, minions: spec.minions };
  if (type === 'levelBoss') return { type: 'levelBoss', enemyDef: spec.levelBoss, minions: spec.minions };
  if (type === 'templeBoss') {
    return { type: 'templeBoss', enemyDef: spec.templeBoss, mechanics: spec.templeBoss?.mechanics, minions: spec.minions };
  }
  throw new Error(`fase desconocida: ${type}`);
}

export function makeLevel(id, regionId, kind, spec = {}) {
  const types = KIND_PHASES[kind];
  if (!types) throw new Error(`kind desconocido: ${kind}`);
  const waveCursor = { i: 0 };
  const phases = types.map((t) => buildPhase(t, spec, waveCursor));
  return {
    id,
    regionId,
    kind,
    phases,
    dialogue: spec.dialogue || {},
    reward: { skillPoints: spec.skillPoints ?? DEFAULT_REWARD[kind] },
  };
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/levelBuilder.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/levelBuilder.js tests/levelBuilder.test.js
git commit -m "feat: pure level builder expanding kind presets into phases"
```

---

### Task 0.3: `SaveSystem` v2 + v1→v2 migration

Save grows `elements` (mastered) and `regionProgress`, drops `currentScenario`. A stored v1 save migrates (not discarded); unknown versions still reset.

**Files:**
- Modify: `src/systems/SaveSystem.js` (full rewrite)
- Modify: `tests/SaveSystem.test.js` (full rewrite)

- [ ] **Step 1: Rewrite the test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSystem, DEFAULT_SAVE, SAVE_VERSION } from '../src/systems/SaveSystem.js';

function memStorage(seed) {
  const m = new Map(seed ? [['the-caster:save', JSON.stringify(seed)]] : []);
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('fresh default has v2 shape', () => {
  const s = new SaveSystem(memStorage()).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 2);
  assert.equal(s.skillPoints, 0);
  assert.deepEqual(s.purchasedNodes, []);
  assert.deepEqual(s.unlockedSkills, []);
  assert.deepEqual(s.elements, []);
  assert.deepEqual(s.regionProgress, {});
  assert.equal('currentScenario' in s, false);
});

test('save then load round-trips v2 state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load();
  s.skillPoints = 5;
  s.elements.push('fire');
  s.regionProgress.fire = { cleared: 3 };
  save.write(s);
  const r = new SaveSystem(storage).load();
  assert.equal(r.skillPoints, 5);
  assert.deepEqual(r.elements, ['fire']);
  assert.deepEqual(r.regionProgress.fire, { cleared: 3 });
});

test('migrates a v1 save: keeps points/nodes/skills, derives elements from unlockedTemples', () => {
  const v1 = {
    version: 1, skillPoints: 7, purchasedNodes: ['basic_dmg_1'],
    unlockedSkills: ['fireball'], unlockedTemples: ['fire'], currentScenario: 'scenario1',
  };
  const s = new SaveSystem(memStorage(v1)).load();
  assert.equal(s.version, 2);
  assert.equal(s.skillPoints, 7);
  assert.deepEqual(s.purchasedNodes, ['basic_dmg_1']);
  assert.deepEqual(s.unlockedSkills, ['fireball']);
  assert.deepEqual(s.elements, ['fire']);
  assert.deepEqual(s.regionProgress, {});
  assert.equal('currentScenario' in s, false);
});

test('unknown version resets to fresh default', () => {
  const s = new SaveSystem(memStorage({ version: 999, skillPoints: 50 })).load();
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.skillPoints, 0);
});

test('reset clears stored state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const s = save.load(); s.skillPoints = 9; save.write(s);
  save.reset();
  assert.equal(save.load().skillPoints, 0);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/SaveSystem.test.js`
Expected: FAIL (current `SAVE_VERSION` is 1; default has `currentScenario`, no `elements`/`regionProgress`; no migration).

- [ ] **Step 3: Rewrite `src/systems/SaveSystem.js`**

```js
// src/systems/SaveSystem.js
export const SAVE_VERSION = 2;
const SAVE_KEY = 'the-caster:save';

export const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  skillPoints: 0,
  purchasedNodes: [],
  unlockedSkills: [],
  elements: [],        // elements mastered (temple completed)
  regionProgress: {},  // { fire: { cleared: N }, ... }
};

function freshSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

// v1 → v2: keep progression, derive elements from old unlockedTemples, drop currentScenario.
function migrateV1toV2(old) {
  return {
    ...freshSave(),
    skillPoints: old.skillPoints || 0,
    purchasedNodes: old.purchasedNodes || [],
    unlockedSkills: old.unlockedSkills || [],
    elements: old.unlockedTemples || [],
    regionProgress: {},
  };
}

export class SaveSystem {
  constructor(storage) {
    this.storage = storage; // must implement getItem/setItem/removeItem
  }

  load() {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version === SAVE_VERSION) return { ...freshSave(), ...parsed };
      if (parsed.version === 1) return migrateV1toV2(parsed);
      return freshSave();
    } catch {
      return freshSave();
    }
  }

  write(state) {
    this.storage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  reset() {
    this.storage.removeItem(SAVE_KEY);
  }
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/SaveSystem.test.js`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/SaveSystem.js tests/SaveSystem.test.js
git commit -m "feat: SaveSystem v2 with v1 migration (elements, regionProgress)"
```

---

### Task 0.4: `Difficulty` module

A pure multiplier driven by the save: more skill points spent and more elements mastered → harder enemies. So the branch you leave for last is always the toughest.

**Files:**
- Create: `src/systems/Difficulty.js`
- Create: `tests/Difficulty.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficultyMultiplier, scaleEnemyDef } from '../src/systems/Difficulty.js';

test('base multiplier is 1 for a fresh save', () => {
  assert.equal(difficultyMultiplier({ purchasedNodes: [], elements: [] }), 1);
});

test('multiplier rises with spent points and mastered elements', () => {
  const m1 = difficultyMultiplier({ purchasedNodes: ['basic_dmg_1'], elements: [] }); // cost 1
  const m2 = difficultyMultiplier({ purchasedNodes: ['basic_dmg_1'], elements: ['fire'] });
  assert.ok(m1 > 1);
  assert.ok(m2 > m1);
});

test('tolerates missing fields', () => {
  assert.equal(difficultyMultiplier({}), 1);
});

test('scaleEnemyDef scales hp and damage, never below base, and keeps other fields', () => {
  const def = { key: 'villager', hp: 20, damage: 8, speed: 90 };
  const scaled = scaleEnemyDef(def, 1.5);
  assert.equal(scaled.hp, 30);
  assert.equal(scaled.damage, 12);
  assert.equal(scaled.speed, 90);
  assert.equal(scaled.key, 'villager');
  const same = scaleEnemyDef(def, 1);
  assert.equal(same.hp, 20);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/Difficulty.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/systems/Difficulty.js`**

```js
// src/systems/Difficulty.js
// Pure power-based difficulty scaling. No Phaser.
import { SKILL_TREE } from '../data/skilltree.js';

const PER_POINT = 0.04;    // each skill point spent
const PER_ELEMENT = 0.15;  // each element mastered

function spentPoints(save) {
  return (save.purchasedNodes || []).reduce((sum, id) => {
    const node = SKILL_TREE[id];
    return sum + (node ? node.cost : 0);
  }, 0);
}

export function difficultyMultiplier(save) {
  const spent = spentPoints(save || {});
  const elements = ((save && save.elements) || []).length;
  return 1 + spent * PER_POINT + elements * PER_ELEMENT;
}

// Returns a new def with hp/damage scaled (mult >= 1, so never below base).
export function scaleEnemyDef(def, mult) {
  return { ...def, hp: Math.round(def.hp * mult), damage: Math.round(def.damage * mult) };
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/Difficulty.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/systems/Difficulty.js tests/Difficulty.test.js
git commit -m "feat: power-based difficulty multiplier and enemy scaling"
```

---

### Task 0.5: `Campaign` module

Pure unlock/progress rules. Content-dependent functions take the region object (or required-elements list) as an argument, so they're testable without importing real content.

**Files:**
- Create: `src/systems/Campaign.js`
- Create: `tests/Campaign.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearedCount, isLevelUnlocked, isRegionComplete, isCastleUnlocked, grantClear,
} from '../src/systems/Campaign.js';

// Fake region: 3 levels, last is the temple granting 'fire'.
const region = {
  id: 'fire', element: 'fire', grantsSkill: 'fireball',
  levels: [
    { kind: 'basic',  reward: { skillPoints: 1 } },
    { kind: 'basic',  reward: { skillPoints: 1 } },
    { kind: 'temple', reward: { skillPoints: 4 } },
  ],
};
const fresh = () => ({ skillPoints: 0, elements: [], unlockedSkills: [], regionProgress: {} });

test('clearedCount defaults to 0', () => {
  assert.equal(clearedCount(fresh(), 'fire'), 0);
});

test('only level 0 unlocked initially; next unlocks as you clear', () => {
  const s = fresh();
  assert.equal(isLevelUnlocked(s, 'fire', 0), true);
  assert.equal(isLevelUnlocked(s, 'fire', 1), false);
  const s1 = grantClear(s, region, 0);
  assert.equal(isLevelUnlocked(s1, 'fire', 1), true);
  assert.equal(isLevelUnlocked(s1, 'fire', 2), false);
});

test('grantClear advances cleared, adds reward points, only on the NEXT level', () => {
  const s = grantClear(fresh(), region, 0);
  assert.equal(clearedCount(s, 'fire'), 1);
  assert.equal(s.skillPoints, 1);
  // re-clearing an already-cleared level is a no-op (returns same save)
  const again = grantClear(s, region, 0);
  assert.equal(again, s);
  // clearing a not-yet-unlocked level is a no-op
  assert.equal(grantClear(s, region, 2), s);
});

test('grantClear does not mutate the input save', () => {
  const s = fresh();
  grantClear(s, region, 0);
  assert.equal(s.skillPoints, 0);
  assert.deepEqual(s.regionProgress, {});
});

test('clearing a temple level masters the element and grants its skill', () => {
  let s = fresh();
  s = grantClear(s, region, 0);
  s = grantClear(s, region, 1);
  s = grantClear(s, region, 2); // temple
  assert.deepEqual(s.elements, ['fire']);
  assert.deepEqual(s.unlockedSkills, ['fireball']);
  assert.equal(isRegionComplete(s, region), true);
});

test('castle unlocks only when all required elements are mastered', () => {
  const req = ['fire', 'water', 'air', 'earth'];
  assert.equal(isCastleUnlocked({ elements: ['fire', 'water', 'air'] }, req), false);
  assert.equal(isCastleUnlocked({ elements: ['fire', 'water', 'air', 'earth'] }, req), true);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node --test tests/Campaign.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/systems/Campaign.js`**

```js
// src/systems/Campaign.js
// Pure campaign progress rules. No Phaser. Content is passed in as arguments.

export function clearedCount(save, regionId) {
  return (save.regionProgress && save.regionProgress[regionId] && save.regionProgress[regionId].cleared) || 0;
}

// Linear within a branch: level 0 always open; level i opens once i levels are cleared.
export function isLevelUnlocked(save, regionId, index) {
  return index <= clearedCount(save, regionId);
}

export function isRegionComplete(save, region) {
  return clearedCount(save, region.id) >= region.levels.length;
}

export function isCastleUnlocked(save, requiredElements) {
  const owned = (save && save.elements) || [];
  return requiredElements.every((el) => owned.includes(el));
}

// Returns a NEW save advancing the region by one, awarding the level's reward.
// Only the next-in-line level (index === clearedCount) advances; anything else is a no-op.
export function grantClear(save, region, index) {
  const cur = clearedCount(save, region.id);
  if (index !== cur) return save;

  const level = region.levels[index];
  const next = {
    ...save,
    regionProgress: { ...save.regionProgress, [region.id]: { cleared: cur + 1 } },
    skillPoints: (save.skillPoints || 0) + ((level.reward && level.reward.skillPoints) || 0),
  };

  if (level.kind === 'temple' && region.element) {
    const owned = save.elements || [];
    if (!owned.includes(region.element)) next.elements = [...owned, region.element];
    if (region.grantsSkill) {
      const skills = save.unlockedSkills || [];
      if (!skills.includes(region.grantsSkill)) next.unlockedSkills = [...skills, region.grantsSkill];
    }
  }
  return next;
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node --test tests/Campaign.test.js`
Expected: PASS — 6 tests.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS — WaveRunner, levelBuilder, SaveSystem, Difficulty, Campaign, plus the untouched SkillTree/CombatSystem suites.

- [ ] **Step 6: Commit**

```bash
git add src/systems/Campaign.js tests/Campaign.test.js
git commit -m "feat: pure campaign unlock/progress rules"
```

---

## PHASE 1 — Content data

### Task 1.1: `regions.js` — the 4 elemental regions + the castle

Compact factory helpers build the standard 7-level branch (3 basic · 2 intermediate · 1 pretemple · 1 temple) and the 5-level castle. Enemy art is reused geometric textures; temple bosses carry elemental `mechanics` (implemented in Phase 3). Dialogue carries the Council-of-Mages story beats.

**Files:**
- Create: `src/data/regions.js`

- [ ] **Step 1: Write `src/data/regions.js`**

```js
// src/data/regions.js
// Data-driven campaign content. Pure (no Phaser). Enemy textures are reused
// geometric keys; temple/level bosses reuse TEX.miniboss / TEX.boss.
import { TEX, COLORS } from '../config.js';
import { makeLevel } from './levelBuilder.js';

const wave = (spawnDelay, spawns) => ({ spawnDelay, spawns });
const ramp = (base, tier) => Math.round(base * (1 + 0.4 * (tier - 1)));

// Three escalating waves for a `basic` level at depth `tier` (1..3).
function basicWaves(tier) {
  return [
    wave(700, [{ type: 'villager', count: ramp(5, tier) }]),
    wave(650, [{ type: 'villager', count: ramp(4, tier) }, { type: 'archer', count: tier }]),
    wave(600, [{ type: 'warrior', count: ramp(2, tier) }, { type: 'archer', count: tier }]),
  ];
}
// Two waves for an `intermediate`/`pretemple` level at depth `tier`.
function interWaves(tier) {
  return [
    wave(620, [{ type: 'villager', count: ramp(4, tier) }, { type: 'archer', count: tier + 1 }]),
    wave(560, [{ type: 'warrior', count: ramp(3, tier) }, { type: 'archer', count: tier + 1 }]),
  ];
}

const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 22, behavior: 'chase' });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 28, behavior: 'chase' });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 32, behavior: 'chase', mechanics });

// Elemental temple-boss mechanics (each temple feels distinct). See BossMechanics.
const MECHANICS = {
  fire:  [{ type: 'nova', every: 3000, count: 10, speed: 240, damage: 12 }, { type: 'boulder', every: 2200, speed: 220, damage: 22 }],
  water: [{ type: 'nova', every: 2400, count: 14, speed: 210, damage: 10 }],
  air:   [{ type: 'boulder', every: 1700, speed: 320, damage: 16 }, { type: 'nova', every: 3200, count: 8, speed: 270, damage: 10 }],
  earth: [{ type: 'poisonFloor', every: 3200, radius: 70, dps: 30, duration: 4000 }, { type: 'boulder', every: 2400, speed: 170, damage: 28 }],
};

// Build a standard elemental branch: 7 levels.
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines }) {
  const levels = [
    makeLevel(`${id}_1`, id, 'basic', { waves: basicWaves(1), dialogue: { onEnter: intro } }),
    makeLevel(`${id}_2`, id, 'basic', { waves: basicWaves(2) }),
    makeLevel(`${id}_3`, id, 'basic', { waves: basicWaves(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: interWaves(2), miniboss: mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: interWaves(3), miniboss: mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'pretemple', { waves: interWaves(4), miniboss: mb(380, 20), levelBoss: lb(650, 24) }),
    makeLevel(`${id}_7`, id, 'temple', {
      templeBoss: tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'The Caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels };
}

// The castle: 5 hard levels; final 'temple' phase is the King (puppet) reveal.
function makeCastle() {
  const id = 'castle';
  const levels = [
    makeLevel(`${id}_1`, id, 'intermediate', { waves: interWaves(4), miniboss: mb(420, 22),
      dialogue: { onEnter: [{ speaker: 'Narrador', text: 'Las puertas del castillo se abren. Los que amaban a quienes mataste te esperan.' }] } }),
    makeLevel(`${id}_2`, id, 'intermediate', { waves: interWaves(5), miniboss: mb(460, 24) }),
    makeLevel(`${id}_3`, id, 'pretemple', { waves: interWaves(5), miniboss: mb(480, 24), levelBoss: lb(800, 28) }),
    makeLevel(`${id}_4`, id, 'pretemple', { waves: interWaves(6), miniboss: mb(520, 26), levelBoss: lb(900, 30) }),
    makeLevel(`${id}_5`, id, 'temple', {
      templeBoss: tb(1400, 30, [...MECHANICS.fire, ...MECHANICS.earth]),
      minions: [{ type: 'warrior', count: 4 }],
      dialogue: { onClear: [
        { speaker: 'The Caster', text: 'Abuelo… el Rey. Por fin.' },
        { speaker: '???', text: 'No queda nada de él que puedas matar. Hace años que el Rey está muerto.' },
        { speaker: 'The Caster', text: '¿Quién eres? Conocías a mi padre…' },
        { speaker: '???', text: 'Su amigo. Y quien mueve este cadáver con magia. Tu venganza apenas comienza, niña.' },
        { speaker: 'Narrador', text: 'CONTINUARÁ…' },
      ] },
    }),
  ];
  return { id, element: null, name: 'El Castillo', grantsSkill: null, locked: true, levels };
}

export const REGIONS = {
  fire: makeBranch({
    id: 'fire', element: 'fire', name: 'El Volcán', grantsSkill: 'fireball',
    intro: [
      { speaker: 'Narrador', text: 'Un amor prohibido entre una princesa y un hechicero fue castigado por el Consejo de Magos.' },
      { speaker: 'Narrador', text: 'Tu madre, exiliada. Tu padre, asesinado. Tú, la huérfana que descendió al volcán por venganza.' },
    ],
    mageName: 'Mago del Fuego',
    mageLines: [
      'Yo encendí la pira de tu padre. Ardió pidiendo clemencia.',
      'Entonces aprenderé tu fuego, y haré que cada mago del Consejo arda igual.',
    ],
  }),
  water: makeBranch({
    id: 'water', element: 'water', name: 'El Lago', grantsSkill: 'freeze',
    intro: [{ speaker: 'Narrador', text: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' }],
    mageName: 'Dama del Lago',
    mageLines: [
      'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
      'Pues estas aguas ahora son mías.',
    ],
  }),
  air: makeBranch({
    id: 'air', element: 'air', name: 'La Montaña', grantsSkill: 'thunderbolt',
    intro: [{ speaker: 'Narrador', text: 'En la cima, el mago que falsificó la sentencia de tu padre te observa caer y subir.' }],
    mageName: 'Mago del Aire',
    mageLines: [
      'Yo redacté la mentira que condenó a tu padre. El Consejo solo asintió.',
      'Entonces tu rayo escribirá la verdad sobre tu tumba.',
    ],
  }),
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'El Bosque', grantsSkill: 'poison',
    intro: [{ speaker: 'Narrador', text: 'El bosque esconde al más viejo del Consejo, el que envenenó el oído del Rey.' }],
    mageName: 'Mago de la Tierra',
    mageLines: [
      'Yo le susurré al Rey que tu familia era una amenaza. Y me creyó.',
      'El Rey ya no te servirá de nada. Lo verás tú misma.',
    ],
  }),
  castle: makeCastle(),
};

export const REGION_ORDER = ['fire', 'water', 'air', 'earth'];
export const CASTLE_ID = 'castle';
export const REQUIRED_ELEMENTS = ['fire', 'water', 'air', 'earth'];
```

- [ ] **Step 2: Sanity-check it loads under Node**

Run: `node -e "import('./src/data/regions.js').then(m => { const r = m.REGIONS; console.log(Object.keys(r), r.fire.levels.length, r.castle.levels.length, r.fire.levels[6].phases[0].type); })"`
Expected: prints `[ 'fire', 'water', 'air', 'earth', 'castle' ] 7 5 templeBoss` (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/data/regions.js
git commit -m "feat: campaign content — 4 elemental branches + castle"
```

---

### Task 1.2: Region structure test

Locks the content invariants the scenes and `Campaign` rely on (level counts, temple placement, the earth mechanic the boss engine must handle).

**Files:**
- Create: `tests/regions.test.js`

- [ ] **Step 1: Write the test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REGION_ORDER, REQUIRED_ELEMENTS } from '../src/data/regions.js';

test('four elemental regions each have 7 levels ending in a temple', () => {
  for (const id of REGION_ORDER) {
    const r = REGIONS[id];
    assert.equal(r.levels.length, 7, `${id} level count`);
    assert.equal(r.levels[6].kind, 'temple', `${id} last is temple`);
    assert.equal(r.levels[6].phases[0].type, 'templeBoss');
    assert.ok(Array.isArray(r.levels[6].phases[0].mechanics), `${id} temple boss has mechanics`);
    assert.equal(r.element, id);
    assert.ok(r.grantsSkill, `${id} grants a skill`);
  }
});

test('standard branch kind layout is 3 basic, 2 intermediate, 1 pretemple, 1 temple', () => {
  const kinds = REGIONS.fire.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'pretemple', 'temple']);
});

test('castle is locked, has no element, and ends in the King reveal', () => {
  const c = REGIONS.castle;
  assert.equal(c.locked, true);
  assert.equal(c.element, null);
  assert.equal(c.levels.length, 5);
  assert.equal(c.levels[4].kind, 'temple');
  const lastLine = c.levels[4].dialogue.onClear.at(-1).text;
  assert.match(lastLine, /CONTINUARÁ/);
});

test('required elements match the elemental region ids', () => {
  assert.deepEqual([...REQUIRED_ELEMENTS].sort(), [...REGION_ORDER].sort());
});
```

- [ ] **Step 2: Run it, verify it passes**

Run: `node --test tests/regions.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 3: Commit**

```bash
git add tests/regions.test.js
git commit -m "test: lock campaign content structure invariants"
```

---

## PHASE 2 — GameScene becomes phase-driven

### Task 2.1: Rewrite `GameScene` to run any level's phases with scaled difficulty

`GameScene` now receives `{ regionId, levelIndex, stats }`, looks up the level in `REGIONS`, and drives it through the generalized `WaveRunner`. It scales every spawned enemy by `difficultyMultiplier`, branches `beginPhase` on `phase.type` (including `templeBoss`, which has no waves), and on completion calls `Campaign.grantClear`, persists, shows reward/story dialogue, and returns to `BranchScene`. Death restarts the same level. Boss mechanics hooks are added but no-op until Phase 3.

**Files:**
- Modify: `src/scenes/GameScene.js` (full rewrite)
- Modify: `src/scenes/BootScene.js` (temporary: start `Game` with a fire level for this task; reverted in Task 4.3)

- [ ] **Step 1: Rewrite `src/scenes/GameScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX } from '../config.js';
import { REGIONS } from '../data/regions.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import { applyDamage } from '../systems/CombatSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { difficultyMultiplier, scaleEnemyDef } from '../systems/Difficulty.js';
import { grantClear } from '../systems/Campaign.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.regionId = data.regionId || 'fire';
    this.levelIndex = data.levelIndex || 0;
    this.region = REGIONS[this.regionId];
    this.level = this.region.levels[this.levelIndex];
    this.stats = data.stats || { ...BASE_STATS };

    const save = new SaveSystem(window.localStorage).load();
    this.mult = difficultyMultiplier(save);
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.caster = new Caster(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.stats);
    this.joystick = new VirtualJoystick(this);
    this.orbs = new ProjectilePool(this);
    this.enemyShots = new ProjectilePool(this);
    this.enemies = this.physics.add.group();

    this.fireballCdRemaining = 0;
    this.boss = null;
    this.bossMechanics = null;   // set in Phase 3
    this.poisonZones = [];       // set in Phase 3
    this.scene.launch('UI', { gameScene: this });

    this.runner = new WaveRunner(this.level);
    this.debug = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000);

    this.setupCollisions();

    const intro = this.level.dialogue && this.level.dialogue.onEnter;
    if (intro && intro.length) {
      this.scene.pause();
      this.scene.launch('Dialogue', { lines: intro, onDone: () => { this.scene.resume(); this.beginPhase(); } });
    } else {
      this.beginPhase();
    }
  }

  setupCollisions() {
    this.physics.add.overlap(this.orbs.group, this.enemies, (orb, enemy) => {
      if (!orb.active || !enemy.active) return;
      this.hitEnemy(enemy, orb.damage);
      if (orb.aoeRadius > 0) this.explode(orb, enemy);
      this.orbs.despawn(orb);
    });
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16);
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      this.enemyShots.despawn(shot);
    });
  }

  beginPhase() {
    const phase = this.runner.currentPhase();
    if (!phase) { this.finishLevel(); return; }
    if (phase.type === 'wave') {
      this.spawnWave(phase);
    } else if (phase.type === 'miniboss' || phase.type === 'levelBoss') {
      this.spawnMinions(phase.minions);
      this.spawnBoss(phase.enemyDef);
    } else if (phase.type === 'templeBoss') {
      this.spawnMinions(phase.minions);
      this.spawnBoss(phase.enemyDef);
      this.attachBossMechanics(phase.mechanics); // no-op until Phase 3
    }
  }

  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, scaleEnemyDef(def, this.mult));
    this.enemies.add(this.boss);
  }

  // Hook implemented in Phase 3 (Task 3.2).
  attachBossMechanics(_mechanics) {}

  spawnMinions(minions) {
    if (!minions) return;
    for (const m of minions) {
      for (let i = 0; i < m.count; i++) this.spawnEnemy(ENEMY_TYPES[m.type]);
    }
  }

  spawnWave(phase) {
    if (this.spawnEvent) { this.spawnEvent.remove(false); this.spawnEvent = null; }
    const queue = [];
    for (const s of phase.spawns) {
      for (let i = 0; i < s.count; i++) queue.push(s.type);
    }
    this.spawnQueue = queue;
    this.spawnEvent = this.time.addEvent({
      delay: phase.spawnDelay,
      repeat: queue.length - 1,
      callback: () => {
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
      },
    });
  }

  spawnEnemy(def) {
    const edge = Phaser.Math.Between(0, 3);
    let x = 0; let y = 0;
    if (edge === 0) { x = Phaser.Math.Between(0, GAME_WIDTH); y = -20; }
    else if (edge === 1) { x = GAME_WIDTH + 20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    else if (edge === 2) { x = Phaser.Math.Between(0, GAME_WIDTH); y = GAME_HEIGHT + 20; }
    else { x = -20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    const e = new Enemy(this, x, y, scaleEnemyDef(def, this.mult));
    this.enemies.add(e);
    return e;
  }

  hitEnemy(enemy, damage) {
    const r = applyDamage({ hp: enemy.hp }, damage);
    enemy.hp = r.hp;
    if (r.dead) {
      if (enemy === this.boss) this.boss = null;
      enemy.destroy();
      this.checkPhaseCleared();
    }
  }

  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) targets.push(e);
      return true;
    });
    for (const e of targets) this.hitEnemy(e, orb.damage);
  }

  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) {
      this.scene.stop('UI');
      // restart THIS level only; progress is preserved in the save.
      this.scene.start('Game', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
    }
  }

  checkPhaseCleared() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      const alive = this.enemies.countActive(true);
      const stillSpawning = this.spawnEvent && this.spawnEvent.getRepeatCount() > 0;
      if (alive === 0 && !stillSpawning) { this.runner.onCleared(); this.beginPhase(); }
    } else if (phase === 'miniboss' || phase === 'levelBoss' || phase === 'templeBoss') {
      // boss phase clears only when the boss AND any minions are gone.
      if (this.enemies.countActive(true) === 0) {
        this.bossMechanics = null;
        const dialogue = this.runner.currentPhase().dialogue || this.phaseStoryDialogue(phase);
        if (dialogue && dialogue.length) {
          this.scene.pause();
          this.scene.launch('Dialogue', { lines: dialogue, onDone: () => { this.scene.resume(); this.runner.onCleared(); this.beginPhase(); } });
        } else {
          this.runner.onCleared();
          this.beginPhase();
        }
      }
    }
  }

  // The temple level's story lives on level.dialogue.onClear; surface it as the
  // templeBoss-defeat dialogue.
  phaseStoryDialogue(phase) {
    if (phase === 'templeBoss') return this.level.dialogue && this.level.dialogue.onClear;
    return null;
  }

  finishLevel() {
    this.physics.pause();
    const save = new SaveSystem(window.localStorage);
    let state = save.load();
    state = grantClear(state, this.region, this.levelIndex);
    save.write(state);

    // The castle's final temple level is the campaign's (incomplete) ending.
    const isEnding = this.regionId === 'castle' && this.levelIndex === this.region.levels.length - 1;
    const reward = this.level.reward.skillPoints;

    this.scene.stop('UI');
    this.scene.launch('Dialogue', {
      lines: [{ speaker: 'Narrador', text: `Nivel superado. +${reward} punto(s) de habilidad.` }],
      onDone: () => {
        if (isEnding) this.scene.start('Map');
        else this.scene.start('Branch', { regionId: this.regionId });
      },
    });
  }

  fireOrb(target) {
    this.orbs.fire(TEX.orb, this.caster.x, this.caster.y, target.x, target.y, 420, this.stats.basicDamage, 0);
  }

  fireArrow(enemy) {
    this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, this.caster.x, this.caster.y, 260, enemy.def.damage, 0);
  }

  tryCastFireball() {
    if (!this.stats.hasFireball) return;
    if (this.fireballCdRemaining > 0) return;
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    const target = this.caster.nearestEnemy(liveEnemies);
    if (!target) return;
    this.fireballCdRemaining = this.stats.fireballCooldown;
    this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, 70);
  }

  update(time, delta) {
    if (this.fireballCdRemaining > 0) this.fireballCdRemaining -= delta;
    this.caster.moveBy(this.joystick.vector);
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    this.caster.updateAutoAim(time, delta, liveEnemies, (t) => this.fireOrb(t));
    for (const e of liveEnemies) e.updateBehavior(delta, this.caster, (en) => this.fireArrow(en));
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    if (this.bossMechanics) this.bossMechanics.update(delta);
    this.updatePoisonZones(delta); // no-op until Phase 3
    this.debug.setText(`${this.regionId} L${this.levelIndex + 1}  x${this.mult.toFixed(2)}  ${this.runner.phase}  e:${liveEnemies.length}`);
    if (this.boss && this.boss.active) this.boss.drawBar();
  }

  // Implemented in Phase 3 (Task 3.2).
  updatePoisonZones(_delta) {}
}
```

- [ ] **Step 2: Temporarily start `Game` with a fire level from Boot**

In `src/scenes/BootScene.js`, change the last line of `create()` from `this.scene.start('Menu');` to:

```js
    this.scene.start('Game', { regionId: 'fire', levelIndex: 0, stats: { ...(await import('../data/stats.js')).BASE_STATS } });
```

If `create()` is not async, instead add this import at the top of `BootScene.js`:

```js
import { BASE_STATS } from '../data/stats.js';
```

and use the synchronous form for the last line:

```js
    this.scene.start('Game', { regionId: 'fire', levelIndex: 0, stats: { ...BASE_STATS } });
```

(Use the synchronous form.)

- [ ] **Step 3: Verify in browser (portrait device toolbar, touch on)**

Run: `python3 -m http.server 8000`, open `http://localhost:8000`.
Expected: fire intro dialogue → 3 waves of villagers/archers/warriors → on clearing the last wave the level ends with "Nivel superado. +1 punto(s)…" then a crash-free attempt to start the `Branch` scene (which doesn't exist yet → console error is expected at this step; the combat + phase flow up to `finishLevel` is what you're verifying). Joystick moves; orbs auto-fire. Debug line shows region/level/multiplier/phase.

- [ ] **Step 4: Verify a boss level**

Temporarily set `levelIndex: 3` (an `intermediate` level) in BootScene, reload.
Expected: 2 waves then a purple miniboss with a health bar; defeating it ends the level. Revert `levelIndex` to `0`.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js src/scenes/BootScene.js
git commit -m "feat: phase-driven GameScene consuming campaign levels with scaled difficulty"
```

---

## PHASE 3 — Boss mechanics engine

### Task 3.1: `BossMechanics` system

A small Phaser-coupled engine: each temple/level boss carries a `mechanics` array of timed attacks. The engine ticks each mechanic's timer and dispatches to a handler. Handlers reuse the existing `enemyShots` pool (nova ring, boulder) or ask the scene for a poison zone.

**Files:**
- Create: `src/systems/BossMechanics.js`

- [ ] **Step 1: Write `src/systems/BossMechanics.js`**

```js
// src/systems/BossMechanics.js
// Timed elemental attacks for a boss. Phaser-coupled (uses scene pools/caster);
// verified by playtest. Mechanics are declared as data on a boss def:
//   { type: 'nova'|'boulder'|'poisonFloor', every: ms, ...params }
import { TEX } from '../config.js';

const HANDLERS = {
  // Ring of projectiles outward from the boss.
  nova(scene, boss, def) {
    const n = def.count || 10;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const tx = boss.x + Math.cos(a) * 100;
      const ty = boss.y + Math.sin(a) * 100;
      scene.enemyShots.fire(TEX.arrow, boss.x, boss.y, tx, ty, def.speed || 220, def.damage || 10, 0);
    }
  },
  // One slow, heavy projectile aimed at the caster.
  boulder(scene, boss, def) {
    const p = scene.enemyShots.fire(TEX.fireball, boss.x, boss.y, scene.caster.x, scene.caster.y, def.speed || 200, def.damage || 22, 0);
    if (p) p.setScale(1.6);
  },
  // A lingering damage zone dropped on the caster's current position.
  poisonFloor(scene, boss, def) {
    scene.spawnPoisonZone(scene.caster.x, scene.caster.y, def.radius || 70, def.dps || 30, def.duration || 4000);
  },
};

export class BossMechanics {
  constructor(scene, boss, mechanics) {
    this.scene = scene;
    this.boss = boss;
    // start each on a fraction of its period so they don't all fire on frame 1
    this.timers = (mechanics || []).map((m, i) => ({ def: m, remaining: m.every * (0.5 + i * 0.25) }));
  }

  update(delta) {
    if (!this.boss || !this.boss.active) return;
    for (const t of this.timers) {
      t.remaining -= delta;
      if (t.remaining <= 0) {
        t.remaining = t.def.every;
        const h = HANDLERS[t.def.type];
        if (h) h(this.scene, this.boss, t.def);
      }
    }
  }
}
```

- [ ] **Step 2: Sanity-check it loads under Node**

Run: `node -e "import('./src/systems/BossMechanics.js').then(m => console.log(typeof m.BossMechanics))"`
Expected: prints `function` (no import errors — note it imports only `config.js`, which is Phaser-free).

- [ ] **Step 3: Commit**

```bash
git add src/systems/BossMechanics.js
git commit -m "feat: BossMechanics engine (nova, boulder, poisonFloor)"
```

---

### Task 3.2: Wire mechanics + poison zones into `GameScene`

Replace the two `GameScene` hooks (`attachBossMechanics`, `updatePoisonZones`) with real implementations and add `spawnPoisonZone`.

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Import `BossMechanics`**

Add to the imports at the top of `src/scenes/GameScene.js`:

```js
import { BossMechanics } from '../systems/BossMechanics.js';
```

- [ ] **Step 2: Replace the `attachBossMechanics` stub**

Replace this method:

```js
  // Hook implemented in Phase 3 (Task 3.2).
  attachBossMechanics(_mechanics) {}
```

with:

```js
  attachBossMechanics(mechanics) {
    if (!mechanics || !this.boss) return;
    this.bossMechanics = new BossMechanics(this, this.boss, mechanics);
  }
```

- [ ] **Step 3: Replace the `updatePoisonZones` stub and add `spawnPoisonZone`**

Replace this method:

```js
  // Implemented in Phase 3 (Task 3.2).
  updatePoisonZones(_delta) {}
```

with:

```js
  spawnPoisonZone(x, y, radius, dps, duration) {
    const gfx = this.add.circle(x, y, radius, 0x7cb342, 0.30).setDepth(5);
    this.poisonZones.push({ x, y, radius, dps, remaining: duration, gfx });
  }

  updatePoisonZones(delta) {
    if (!this.poisonZones.length) return;
    for (const z of this.poisonZones) {
      z.remaining -= delta;
      if (this.caster && Phaser.Math.Distance.Between(this.caster.x, this.caster.y, z.x, z.y) <= z.radius) {
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

- [ ] **Step 4: Clear poison zones on level restart**

So zones don't leak across a death-restart, ensure the array starts empty each `create()`. It already does (`this.poisonZones = []` in `create()`), so no change is needed — confirm that line is present.

- [ ] **Step 5: Verify the fire temple in browser**

Temporarily set `levelIndex: 6` (the fire temple) in `BootScene.js`, reload `http://localhost:8000`.
Expected: a single red boss (no waves) that periodically emits a **ring of arrows** (nova) and lobs an oversized **fireball** (boulder) at you; the boss health bar drains; on defeat the Mago del Fuego story dialogue plays, then it tries to go to `Branch`. Then set `levelIndex: 6` with `regionId: 'earth'`: confirm a **green poison zone** drops on your position and damages you while standing in it. Revert BootScene to `regionId: 'fire', levelIndex: 0`.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: temple bosses cast elemental mechanics; poison zones damage the caster"
```

---

## PHASE 4 — Map & navigation

### Task 4.1: `BranchScene` — the 7-node path of one region

Shows a region's levels as a vertical path: cleared nodes are done (not replayable), the next node is playable, later nodes are locked. Launching a node starts `GameScene` with runtime stats (including the `hasFireball` flag derived from the save).

**Files:**
- Create: `src/scenes/BranchScene.js`

- [ ] **Step 1: Write `src/scenes/BranchScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { REGIONS } from '../data/regions.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getStats } from '../systems/SkillTree.js';
import { clearedCount, isLevelUnlocked } from '../systems/Campaign.js';

const KIND_LABEL = { basic: 'Básico', intermediate: 'Intermedio', pretemple: 'Pre-templo', temple: 'Templo' };

export default class BranchScene extends Phaser.Scene {
  constructor() { super('Branch'); }

  init(data) { this.regionId = data.regionId || 'fire'; }

  // Runtime stats = skill-tree stats + unlocked active-skill flags.
  runtimeStats(save) {
    const stats = getStats(save);
    stats.hasFireball = (save.unlockedSkills || []).includes('fireball');
    return stats;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = new SaveSystem(window.localStorage).load();
    const region = REGIONS[this.regionId];
    const cleared = clearedCount(save, this.regionId);

    this.add.text(GAME_WIDTH / 2, 40, region.name, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    region.levels.forEach((level, i) => {
      const y = 110 + i * 92;
      const unlocked = isLevelUnlocked(save, this.regionId, i);
      const done = i < cleared;
      const playable = unlocked && !done; // no replay of finished levels

      const fill = done ? 0x1b3a1b : (playable ? 0x241c33 : 0x161320);
      const stroke = done ? 0x66bb6a : (playable ? 0x4fc3f7 : 0x444444);
      const node = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 60, 72, fill)
        .setStrokeStyle(2, stroke, playable ? 1 : 0.5);

      const tag = level.kind === 'temple' ? '⛩️ ' : '';
      this.add.text(50, y - 14, `${tag}Nivel ${i + 1} — ${KIND_LABEL[level.kind]}`, {
        fontFamily: 'sans-serif', fontSize: '16px', color: playable || done ? '#fff' : '#777',
      });
      const status = done ? '✔ completado' : (playable ? '▶ jugar' : '🔒 bloqueado');
      this.add.text(GAME_WIDTH - 50, y, status, {
        fontFamily: 'sans-serif', fontSize: '14px', color: done ? '#66bb6a' : (playable ? '#ffd54f' : '#777'),
      }).setOrigin(1, 0.5);

      if (playable) {
        node.setInteractive();
        node.on('pointerdown', () => {
          this.scene.start('Game', { regionId: this.regionId, levelIndex: i, stats: this.runtimeStats(save) });
        });
      }
    });

    const back = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 180, 44, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '← Mapa', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#fff',
    }).setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start('Map'));
  }
}
```

- [ ] **Step 2: Register `BranchScene` and temporarily route Boot to it**

In `src/main.js`, import and register it:

```js
import BranchScene from './scenes/BranchScene.js';
```

and add `BranchScene` to the `scene` array (anywhere after `GameScene`):

```js
  scene: [BootScene, MenuScene, GameScene, BranchScene, UIScene, DialogueScene, SkillTreeScene],
```

Temporarily change `BootScene.create()`'s last line to:

```js
    this.scene.start('Branch', { regionId: 'fire' });
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:8000`.
Expected: "El Volcán" with 7 nodes; only **Nivel 1** is playable (▶), the rest 🔒. Tap Nivel 1 → plays the level → on clearing, returns to this branch with **Nivel 1** now ✔ and **Nivel 2** playable. "← Mapa" tries to start `Map` (not built yet → console error expected at this step).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BranchScene.js src/main.js src/scenes/BootScene.js
git commit -m "feat: BranchScene linear node path with unlock/clear states"
```

---

### Task 4.2: `MapScene` — element portals + locked castle + skill-tree access

**Files:**
- Create: `src/scenes/MapScene.js`

- [ ] **Step 1: Write `src/scenes/MapScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { REGIONS, REGION_ORDER, CASTLE_ID, REQUIRED_ELEMENTS } from '../data/regions.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { isCastleUnlocked, isRegionComplete } from '../systems/Campaign.js';

const PORTAL_ICON = { fire: '🔥', water: '💧', air: '💨', earth: '🌿', castle: '👑' };

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = new SaveSystem(window.localStorage).load();

    this.add.text(GAME_WIDTH / 2, 50, 'EL MAPA', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 86, `Elementos dominados: ${(save.elements || []).length}/4`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Four element portals in a 2×2 grid.
    REGION_ORDER.forEach((id, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = GAME_WIDTH / 2 + (col === 0 ? -100 : 100);
      const y = 200 + row * 150;
      const region = REGIONS[id];
      const complete = isRegionComplete(save, region);
      this.portal(x, y, region.name, PORTAL_ICON[id], complete, true, () => this.scene.start('Branch', { regionId: id }));
    });

    // Castle portal (gated by all 4 elements).
    const castleOpen = isCastleUnlocked(save, REQUIRED_ELEMENTS);
    this.portal(GAME_WIDTH / 2, 540, REGIONS[CASTLE_ID].name, PORTAL_ICON.castle, false, castleOpen,
      () => this.scene.start('Branch', { regionId: CASTLE_ID }),
      castleOpen ? null : 'Requiere los 4 elementos');

    // Skill tree access.
    const st = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 60, 220, 50, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, `🌳 Árbol  (${save.skillPoints} pts)`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);
    st.on('pointerdown', () => this.scene.start('SkillTree'));
  }

  portal(x, y, name, icon, complete, enabled, onTap, lockNote) {
    const stroke = complete ? 0x66bb6a : (enabled ? 0xffd54f : 0x555555);
    const box = this.add.rectangle(x, y, 150, 110, 0x241c33, enabled ? 1 : 0.6)
      .setStrokeStyle(3, stroke);
    this.add.text(x, y - 18, icon, { fontSize: '40px' }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.5);
    this.add.text(x, y + 30, name, {
      fontFamily: 'sans-serif', fontSize: '15px', color: enabled ? '#fff' : '#777',
    }).setOrigin(0.5);
    if (complete) this.add.text(x + 58, y - 42, '✔', { fontSize: '20px', color: '#66bb6a' }).setOrigin(0.5);
    if (lockNote) this.add.text(x, y + 48, lockNote, { fontFamily: 'sans-serif', fontSize: '11px', color: '#999' }).setOrigin(0.5);
    if (enabled) { box.setInteractive(); box.on('pointerdown', onTap); }
  }
}
```

- [ ] **Step 2: Register `MapScene` and temporarily route Boot to it**

In `src/main.js` import and register:

```js
import MapScene from './scenes/MapScene.js';
```

Add `MapScene` to the `scene` array (after `BranchScene`):

```js
  scene: [BootScene, MenuScene, GameScene, MapScene, BranchScene, UIScene, DialogueScene, SkillTreeScene],
```

Temporarily change `BootScene.create()`'s last line to:

```js
    this.scene.start('Map');
```

- [ ] **Step 3: Verify in browser**

Reload. Expected: "EL MAPA", four element portals (🔥💧💨🌿) all enabled, a 👑 Castillo portal greyed with "Requiere los 4 elementos", and a "🌳 Árbol (N pts)" button. Tapping an element opens its branch; "← Mapa" returns here. Tapping Árbol opens the skill tree.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/MapScene.js src/main.js src/scenes/BootScene.js
git commit -m "feat: MapScene portals with castle gating and skill-tree access"
```

---

### Task 4.3: Wire the real flow (Menu→Map, SkillTree→Map) and restore Boot

**Files:**
- Modify: `src/scenes/MenuScene.js`
- Modify: `src/scenes/SkillTreeScene.js`
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Menu starts the campaign at the Map**

In `src/scenes/MenuScene.js`, replace `startCampaign()`:

```js
  startCampaign() {
    this.scene.start('Map');
  }
```

(The unused `getStats`/`SaveSystem` imports may remain or be removed; removing keeps it clean:)

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
```

(Delete the now-unused `SaveSystem` and `getStats` import lines at the top of `MenuScene.js`.)

- [ ] **Step 2: SkillTree "Continuar" returns to the Map**

In `src/scenes/SkillTreeScene.js`, change the continue handler:

```js
    cont.on('pointerdown', () => this.scene.start('Map'));
```

- [ ] **Step 3: Restore `BootScene` to start the Menu**

In `src/scenes/BootScene.js`, set the last line of `create()` back to:

```js
    this.scene.start('Menu');
```

If you added an unused `import { BASE_STATS }` in Task 2.1, remove it.

- [ ] **Step 4: Full-flow playtest**

Reload `http://localhost:8000`. Run this end-to-end:
1. Menu → "TAP PARA JUGAR" → Map.
2. Open 🔥 El Volcán → play Nivel 1 → returns to branch with Nivel 1 ✔, Nivel 2 ▶.
3. "← Mapa" → open 💧 El Lago → confirm you can start a different branch without finishing fire (interleaving).
4. Open 🌳 Árbol → buy a node → Continuar → back to Map.
5. Confirm 👑 Castillo stays locked until all 4 elements are mastered.

Expected: no console errors; progress persists across branches; difficulty debug multiplier rises after buying skill nodes / mastering an element.

- [ ] **Step 5: Run the full test suite**

Run: `node --test`
Expected: PASS — all suites green.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.js src/scenes/SkillTreeScene.js src/scenes/BootScene.js
git commit -m "feat: wire campaign flow Menu→Map→Branch→Game and SkillTree→Map"
```

---

## PHASE 5 — Cleanup & verification

### Task 5.1: Remove dead scenario code and document scope

`GameScene` no longer uses `data/scenarios.js` (fire content now lives in `regions.js`). Remove the dead module and confirm nothing imports it.

**Files:**
- Delete: `src/data/scenarios.js`

- [ ] **Step 1: Confirm nothing imports `scenarios.js`**

Run: `grep -rn "scenarios" src/`
Expected: no matches (if any remain, they are stale imports — remove them).

- [ ] **Step 2: Delete the file**

```bash
git rm src/data/scenarios.js
```

- [ ] **Step 3: Run the full suite and a final playtest**

Run: `node --test` — expected all green.
Then `python3 -m http.server 8000` and walk the full flow once more (Menu→Map→Branch→Game→Branch, buy a skill, switch branches). Expected: no console errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused scenarios.js (superseded by regions.js)"
```

---

### Task 5.2: Update CLAUDE.md and README for the campaign model

**Files:**
- Modify: `the-caster/CLAUDE.md`
- Modify: `the-caster/README.md`

- [ ] **Step 1: Update the architecture notes in `CLAUDE.md`**

Under "Data-driven content", replace the `scenarios.js` bullet with:

```md
- `regions.js` — the campaign: `REGIONS` keyed by id (`fire`/`water`/`air`/`earth`/`castle`), built by `makeBranch`/`makeCastle`. A region has `element`, `grantsSkill`, and an array of `levels`. A level is built by `makeLevel` (`data/levelBuilder.js`) from a `kind` preset (`basic`/`intermediate`/`pretemple`/`temple`) into an ordered `phases` array. `REGION_ORDER`, `CASTLE_ID`, `REQUIRED_ELEMENTS` drive the map and gating.
```

Under "Scene flow", replace the flow line with:

```md
`Boot → Menu → Map (portals) → Branch (level path) → Game (+ UI overlay)`, with `Dialogue` as a pause-overlay and `SkillTree` reachable from `Map`. `WaveRunner` is now a generic sequencer over `level.phases`; `GameScene.beginPhase()` branches on `phase.type` (`wave`/`miniboss`/`levelBoss`/`templeBoss`). `Campaign` (pure) owns unlock/progress; `Difficulty` (pure) scales enemies by skill points spent + elements mastered; temple bosses run `BossMechanics`.
```

- [ ] **Step 2: Update `README.md` description**

Replace the one-line gameplay summary with:

```md
Play as an orphaned sorceress avenging her parents against the Council of Mages: explore a map of 4 elemental branches (volcano/lake/mountain/forest) in any order, clear each branch's 7 levels to its temple boss, master all 4 elements to unlock the King's Castle, and spend skill points in a persistent skill tree. Difficulty scales with your power.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update CLAUDE.md and README for the campaign model"
```

---

## Out of scope (deferred to later cycles)

- **Skill-tree expansion** (branching tree, per-element nodes) — its own spec/plan cycle.
- **Playable non-fire active skills** (thunderbolt/poison/freeze casting + multi-button HUD). This plan *unlocks and records* each element on temple completion (for castle gating and difficulty), but only Fireball is castable today; the other three are wired as unlock state, not yet as gameplay.
- **Full elemental-mechanic catalog** (e.g., earth's wall-trap). This plan ships `nova`, `boulder`, and `poisonFloor` and assigns them across temple bosses.
- **Deeper King/Castle content and bespoke King mechanics** — the castle ships as 5 playable levels with the cliffhanger reveal; richer set-pieces come later.
- **Final art, audio, and fine balance tuning** (multiplier constants, HP/damage curves).
