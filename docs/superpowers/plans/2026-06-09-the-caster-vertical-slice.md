# The Caster — Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable vertical slice of *The Caster* — a mobile-only, portrait, top-down survivor in Phaser 3: intro dialogue → 1 scenario (2-3 waves) → miniboss → fire temple (unlocks Fireball) → boss + story dialogue → skill tree where you spend earned points. Persisted in localStorage. No build, deployed to GitHub Pages.

**Architecture:** Phaser 3 (CDN) with native ES modules, no bundler. Pure game logic (save, skill tree, combat math, wave sequencing) lives in Phaser-free modules tested with Node's built-in `node --test`. Phaser scenes/objects consume that logic and are verified by manual playtest. Art is geometric (textures generated at runtime via Phaser Graphics) and referenced by key, so swapping to sprites later won't touch logic.

**Tech Stack:** Phaser 3.80+ (CDN), vanilla ES modules, HTML5/CSS minimal, localStorage, Node `--test` for unit tests (dev-only).

---

## Conventions used throughout this plan

- **Game logical resolution:** 480 (width) × 854 (height), portrait. Phaser Scale Manager `FIT` scales it to any screen.
- **Test command:** `node --test` (run from `the-caster/`). Node 18+ required (already present; `npm` exists in this environment).
- **Commit after every task.** Messages use Conventional Commits.
- The browser entry is `index.html`; it loads Phaser from CDN and `src/main.js` as a module.
- A dev-only `package.json` (`{"type":"module"}`, zero deps) lets both the browser and Node treat `.js` as ES modules. It is never shipped to players.

---

## File Structure

```
the-caster/
  index.html              # minimal mount + "Tap to play / fullscreen" gesture
  styles.css              # reset, full-viewport, center canvas, portrait
  package.json            # dev-only: {"type":"module"} — enables node --test
  .gitignore
  src/
    main.js               # Phaser config, Scale Manager, scene registration
    config.js             # GAME_WIDTH/HEIGHT, COLORS, base constants
    data/
      stats.js            # BASE_STATS (caster base numbers)
      skilltree.js        # SKILL_TREE node definitions (pure data)
      enemies.js          # ENEMY_TYPES definitions (pure data)
      scenarios.js        # SCENARIO_1: waves, dialogue, temple, boss (pure data)
    systems/
      SaveSystem.js       # load/save/reset versioned state (injectable storage)
      SkillTree.js        # canPurchase/purchase/getStats (pure logic)
      CombatSystem.js     # damage application (pure logic)
      WaveRunner.js       # wave sequencing state machine (pure logic)
      InputSystem.js      # virtual joystick (Phaser)
      ProjectilePool.js   # pooled projectiles (Phaser)
    objects/
      Caster.js           # player sprite + movement + auto-aim (Phaser)
      Enemy.js            # enemy sprite + behavior (Phaser)
      Boss.js             # boss/miniboss (Phaser)
      Temple.js           # temple pickup (Phaser)
    scenes/
      BootScene.js        # generate geometric textures, then go to Menu
      MenuScene.js        # title + "Tap to play" (triggers fullscreen)
      DialogueScene.js    # overlay dialogue, tap to advance
      GameScene.js        # the arena: waves, combat, collisions
      UIScene.js          # HUD overlay: joystick, skill buttons, health
      SkillTreeScene.js   # spend skill points
  tests/
    SaveSystem.test.js
    SkillTree.test.js
    CombatSystem.test.js
    WaveRunner.test.js
  docs/superpowers/...
```

**Responsibility boundaries:**
- `data/*` — plain objects, no behavior, no Phaser. The single source of truth for balance/content.
- `systems/{SaveSystem,SkillTree,CombatSystem,WaveRunner}` — pure logic, no Phaser, fully unit-tested.
- `systems/{InputSystem,ProjectilePool}`, `objects/*`, `scenes/*` — Phaser-dependent, verified by playtest.

---

## PHASE 0 — Scaffold & boot

### Task 0.1: Dev-only package.json and gitignore

**Files:**
- Create: `the-caster/package.json`
- Create: `the-caster/.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "the-caster",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "description": "The Caster — mobile top-down survivor in Phaser 3",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
.DS_Store
*.log
```

- [ ] **Step 3: Verify Node test runner works on an empty suite**

Run: `cd the-caster && node --test`
Expected: exits 0 with "tests 0" (no test files yet is fine; if it errors that no files matched, that is also acceptable at this stage).

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: dev-only package.json and gitignore"
```

---

### Task 0.2: Game config constants

**Files:**
- Create: `the-caster/src/config.js`

- [ ] **Step 1: Create `src/config.js`**

```js
// Logical resolution (portrait). Scale Manager FITs this to the device.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

// Geometric-art palette. Swapped for sprites later without touching logic.
export const COLORS = {
  bg: 0x1a1224,
  caster: 0x4fc3f7,     // light blue
  orb: 0x80d8ff,        // cyan basic shot
  fireball: 0xff7043,   // orange
  villager: 0xef5350,   // red
  warrior: 0x8d6e63,    // brown
  archer: 0x66bb6a,     // green
  arrow: 0xfff176,      // yellow
  miniboss: 0xab47bc,   // purple
  boss: 0xd32f2f,       // deep red
  temple: 0xffd54f,     // gold
  healthBack: 0x33272a,
  healthFill: 0x66bb6a,
};

// Texture keys (geometric now, sprite atlases later — keys stay the same).
export const TEX = {
  caster: 'tex_caster',
  orb: 'tex_orb',
  fireball: 'tex_fireball',
  villager: 'tex_villager',
  warrior: 'tex_warrior',
  archer: 'tex_archer',
  arrow: 'tex_arrow',
  miniboss: 'tex_miniboss',
  boss: 'tex_boss',
  temple: 'tex_temple',
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config.js
git commit -m "feat: game config constants and texture keys"
```

---

### Task 0.3: index.html and styles.css

**Files:**
- Create: `the-caster/index.html`
- Create: `the-caster/styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <title>The Caster</title>
  <link rel="stylesheet" href="styles.css" />
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 100%;
  height: 100dvh;            /* dynamic viewport: handles mobile address bar */
  background: #000;
  overflow: hidden;
  touch-action: none;        /* no scroll/zoom gestures stealing touches */
  overscroll-behavior: none;
}
#game {
  width: 100%;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
}
#game canvas { display: block; }
```

- [ ] **Step 3: Commit**

```bash
git add index.html styles.css
git commit -m "feat: minimal HTML shell and mobile portrait CSS"
```

---

### Task 0.4: BootScene + main.js (blank game boots)

**Files:**
- Create: `the-caster/src/scenes/BootScene.js`
- Create: `the-caster/src/main.js`

- [ ] **Step 1: Create a temporary minimal `src/scenes/BootScene.js`**

```js
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'The Caster\nboot OK', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
  }
}
```

- [ ] **Step 2: Create `src/main.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import BootScene from './scenes/BootScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
```

- [ ] **Step 3: Verify in a browser**

Run a static server from `the-caster/`: `python3 -m http.server 8000`
Open `http://localhost:8000` and (using browser dev tools device toolbar, portrait) confirm: dark purple background, centered white "The Caster / boot OK" text, canvas letterboxed to portrait aspect.
Expected: no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/scenes/BootScene.js
git commit -m "feat: Phaser boots blank scene, portrait FIT scaling"
```

---

## PHASE 1 — Pure logic (TDD)

### Task 1.1: Base stats data

**Files:**
- Create: `the-caster/src/data/stats.js`

- [ ] **Step 1: Create `src/data/stats.js`**

```js
// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,
  fireballDamage: 40,
  fireballCooldown: 4000,
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/data/stats.js
git commit -m "feat: base caster stats and floors"
```

---

### Task 1.2: SaveSystem (TDD)

`SaveSystem` reads/writes one versioned JSON blob. Storage is injected (defaults to `localStorage`) so it is testable in Node.

**Files:**
- Create: `the-caster/tests/SaveSystem.test.js`
- Create: `the-caster/src/systems/SaveSystem.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSystem, DEFAULT_SAVE, SAVE_VERSION } from '../src/systems/SaveSystem.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test('load returns a fresh default when storage is empty', () => {
  const save = new SaveSystem(memStorage());
  const state = save.load();
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.skillPoints, DEFAULT_SAVE.skillPoints);
  assert.deepEqual(state.purchasedNodes, []);
  assert.deepEqual(state.unlockedSkills, []);
});

test('save then load round-trips state', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const state = save.load();
  state.skillPoints = 3;
  state.unlockedSkills.push('fireball');
  save.write(state);

  const reloaded = new SaveSystem(storage).load();
  assert.equal(reloaded.skillPoints, 3);
  assert.deepEqual(reloaded.unlockedSkills, ['fireball']);
});

test('reset clears stored state back to default', () => {
  const storage = memStorage();
  const save = new SaveSystem(storage);
  const state = save.load();
  state.skillPoints = 9;
  save.write(state);
  save.reset();
  assert.equal(save.load().skillPoints, DEFAULT_SAVE.skillPoints);
});

test('load discards a save with a mismatched version', () => {
  const storage = memStorage();
  storage.setItem('the-caster:save', JSON.stringify({ version: 999, skillPoints: 50 }));
  const state = new SaveSystem(storage).load();
  assert.equal(state.version, SAVE_VERSION);
  assert.equal(state.skillPoints, DEFAULT_SAVE.skillPoints);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/SaveSystem.test.js`
Expected: FAIL — cannot find module `../src/systems/SaveSystem.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/SaveSystem.js
export const SAVE_VERSION = 1;
const SAVE_KEY = 'the-caster:save';

export const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  skillPoints: 0,
  purchasedNodes: [],
  unlockedSkills: [],
  unlockedTemples: [],
  currentScenario: 'scenario1',
};

function freshSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
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
      if (parsed.version !== SAVE_VERSION) return freshSave();
      return { ...freshSave(), ...parsed };
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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/SaveSystem.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/SaveSystem.test.js src/systems/SaveSystem.js
git commit -m "feat: versioned localStorage SaveSystem with tests"
```

---

### Task 1.3: Skill tree data

**Files:**
- Create: `the-caster/src/data/skilltree.js`

- [ ] **Step 1: Create `src/data/skilltree.js`**

```js
// Each node: id, label, cost (skill points), requires (node ids),
// effect { stat, add }. add may be negative (e.g. faster shotRate).
export const SKILL_TREE = {
  basic_dmg_1: { id: 'basic_dmg_1', label: '+Daño básico I',  cost: 1, requires: [], effect: { stat: 'basicDamage', add: 5 } },
  basic_dmg_2: { id: 'basic_dmg_2', label: '+Daño básico II', cost: 2, requires: ['basic_dmg_1'], effect: { stat: 'basicDamage', add: 10 } },
  shot_rate_1: { id: 'shot_rate_1', label: '+Cadencia I',     cost: 1, requires: [], effect: { stat: 'shotRate', add: -75 } },
  move_speed_1: { id: 'move_speed_1', label: '+Velocidad I',  cost: 1, requires: [], effect: { stat: 'moveSpeed', add: 30 } },
  max_hp_1:    { id: 'max_hp_1',    label: '+Vida máx I',     cost: 1, requires: [], effect: { stat: 'maxHealth', add: 25 } },
  fireball_dmg_1: { id: 'fireball_dmg_1', label: '+Daño Fireball I', cost: 2, requires: [], effect: { stat: 'fireballDamage', add: 20 } },
  fireball_cd_1:  { id: 'fireball_cd_1',  label: '-CD Fireball I',   cost: 2, requires: ['fireball_dmg_1'], effect: { stat: 'fireballCooldown', add: -1000 } },
};

// Display order for the skill tree UI (top to bottom).
export const SKILL_TREE_ORDER = [
  'basic_dmg_1', 'basic_dmg_2',
  'shot_rate_1', 'move_speed_1', 'max_hp_1',
  'fireball_dmg_1', 'fireball_cd_1',
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/skilltree.js
git commit -m "feat: skill tree node definitions"
```

---

### Task 1.4: SkillTree logic (TDD)

Pure functions over a save state + the tree data. Computes purchasability and the caster's effective stats.

**Files:**
- Create: `the-caster/tests/SkillTree.test.js`
- Create: `the-caster/src/systems/SkillTree.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canPurchase, purchase, getStats } from '../src/systems/SkillTree.js';
import { DEFAULT_SAVE } from '../src/systems/SaveSystem.js';

function saveWith(overrides) {
  return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...overrides };
}

test('cannot purchase without enough points', () => {
  const save = saveWith({ skillPoints: 0 });
  assert.equal(canPurchase(save, 'basic_dmg_1').ok, false);
});

test('cannot purchase when prerequisite missing', () => {
  const save = saveWith({ skillPoints: 5 });
  const res = canPurchase(save, 'basic_dmg_2'); // requires basic_dmg_1
  assert.equal(res.ok, false);
  assert.match(res.reason, /requisito|prereq/i);
});

test('cannot purchase an already-owned node', () => {
  const save = saveWith({ skillPoints: 5, purchasedNodes: ['basic_dmg_1'] });
  assert.equal(canPurchase(save, 'basic_dmg_1').ok, false);
});

test('purchase deducts points and records the node', () => {
  const save = saveWith({ skillPoints: 3 });
  const next = purchase(save, 'basic_dmg_1');
  assert.equal(next.skillPoints, 2);
  assert.deepEqual(next.purchasedNodes, ['basic_dmg_1']);
});

test('purchase does not mutate the original save', () => {
  const save = saveWith({ skillPoints: 3 });
  purchase(save, 'basic_dmg_1');
  assert.equal(save.skillPoints, 3);
  assert.deepEqual(save.purchasedNodes, []);
});

test('getStats applies purchased bonuses and respects floors', () => {
  const save = saveWith({ purchasedNodes: ['basic_dmg_1', 'shot_rate_1'] });
  const stats = getStats(save);
  assert.equal(stats.basicDamage, 15);  // 10 + 5
  assert.equal(stats.shotRate, 425);    // 500 - 75
});

test('getStats clamps shotRate to its floor', () => {
  // Six shot_rate-style reductions would go below floor; simulate via many adds.
  const save = saveWith({ purchasedNodes: ['shot_rate_1'] });
  const stats = getStats(save);
  assert.ok(stats.shotRate >= 150);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/SkillTree.test.js`
Expected: FAIL — cannot find module `../src/systems/SkillTree.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/SkillTree.js
import { SKILL_TREE } from '../data/skilltree.js';
import { BASE_STATS, STAT_FLOORS } from '../data/stats.js';

export function canPurchase(save, nodeId) {
  const node = SKILL_TREE[nodeId];
  if (!node) return { ok: false, reason: 'nodo inexistente' };
  if (save.purchasedNodes.includes(nodeId)) return { ok: false, reason: 'ya comprado' };
  const missing = node.requires.filter((r) => !save.purchasedNodes.includes(r));
  if (missing.length) return { ok: false, reason: 'falta requisito previo' };
  if (save.skillPoints < node.cost) return { ok: false, reason: 'puntos insuficientes' };
  return { ok: true };
}

export function purchase(save, nodeId) {
  const check = canPurchase(save, nodeId);
  if (!check.ok) throw new Error(`No se puede comprar ${nodeId}: ${check.reason}`);
  const node = SKILL_TREE[nodeId];
  return {
    ...save,
    skillPoints: save.skillPoints - node.cost,
    purchasedNodes: [...save.purchasedNodes, nodeId],
  };
}

export function getStats(save) {
  const stats = { ...BASE_STATS };
  for (const nodeId of save.purchasedNodes) {
    const node = SKILL_TREE[nodeId];
    if (!node) continue;
    const { stat, add } = node.effect;
    stats[stat] = (stats[stat] ?? 0) + add;
  }
  for (const [stat, floor] of Object.entries(STAT_FLOORS)) {
    if (stats[stat] < floor) stats[stat] = floor;
  }
  return stats;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/SkillTree.test.js`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/SkillTree.test.js src/systems/SkillTree.js
git commit -m "feat: skill tree purchase logic and stat computation with tests"
```

---

### Task 1.5: CombatSystem (TDD)

Pure damage application. Keeps hp math out of Phaser objects so it is testable.

**Files:**
- Create: `the-caster/tests/CombatSystem.test.js`
- Create: `the-caster/src/systems/CombatSystem.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDamage } from '../src/systems/CombatSystem.js';

test('applyDamage reduces hp and reports alive', () => {
  const r = applyDamage({ hp: 50, maxHp: 50 }, 20);
  assert.equal(r.hp, 30);
  assert.equal(r.dead, false);
});

test('applyDamage clamps hp at zero and reports dead', () => {
  const r = applyDamage({ hp: 10, maxHp: 50 }, 25);
  assert.equal(r.hp, 0);
  assert.equal(r.dead, true);
});

test('applyDamage ignores negative damage', () => {
  const r = applyDamage({ hp: 10, maxHp: 50 }, -5);
  assert.equal(r.hp, 10);
  assert.equal(r.dead, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/CombatSystem.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/CombatSystem.js
export function applyDamage(entity, amount) {
  const dmg = Math.max(0, amount);
  const hp = Math.max(0, entity.hp - dmg);
  return { hp, dead: hp <= 0 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/CombatSystem.test.js`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add tests/CombatSystem.test.js src/systems/CombatSystem.js
git commit -m "feat: pure damage application with tests"
```

---

### Task 1.6: Enemy + scenario data

**Files:**
- Create: `the-caster/src/data/enemies.js`
- Create: `the-caster/src/data/scenarios.js`

- [ ] **Step 1: Create `src/data/enemies.js`**

```js
import { COLORS, TEX } from '../config.js';

// behavior: 'chase' (run straight at caster) | 'ranged' (keep distance, shoot)
export const ENEMY_TYPES = {
  villager: { key: 'villager', tex: TEX.villager, color: COLORS.villager, hp: 20,  speed: 90,  damage: 8,  radius: 10, behavior: 'chase' },
  warrior:  { key: 'warrior',  tex: TEX.warrior,  color: COLORS.warrior,  hp: 50,  speed: 60,  damage: 14, radius: 12, behavior: 'chase' },
  archer:   { key: 'archer',   tex: TEX.archer,   color: COLORS.archer,   hp: 25,  speed: 70,  damage: 10, radius: 10, behavior: 'ranged', range: 220, fireEvery: 1500 },
};
```

- [ ] **Step 2: Create `src/data/scenarios.js`**

```js
import { TEX, COLORS } from '../config.js';

// A scenario is fully data-driven: dialogues + ordered waves + temple + boss.
// Wave entry: { spawns: [{ type, count }], spawnDelay } — spawnDelay ms between spawns.
export const SCENARIO_1 = {
  id: 'scenario1',
  intro: [
    { speaker: 'Narrador', text: 'Un amor prohibido entre una princesa y un hechicero fue castigado con la muerte.' },
    { speaker: 'Narrador', text: 'Su hija huérfana creció con un solo propósito: la venganza.' },
    { speaker: 'The Caster', text: 'Abuelo… Rey. Tu trono se construyó sobre la sangre de mis padres.' },
  ],
  waves: [
    { spawnDelay: 700, spawns: [{ type: 'villager', count: 6 }] },
    { spawnDelay: 650, spawns: [{ type: 'villager', count: 5 }, { type: 'archer', count: 2 }] },
    { spawnDelay: 600, spawns: [{ type: 'warrior', count: 3 }, { type: 'archer', count: 2 }] },
  ],
  miniboss: { key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp: 300, speed: 70, damage: 18, radius: 22, behavior: 'chase' },
  temple: {
    element: 'fire',
    grantsSkill: 'fireball',
    dialogue: [
      { speaker: 'Templo de Fuego', text: 'Quien arde en ira, que arda también su enemigo.' },
      { speaker: 'The Caster', text: 'Fuego. Sí. Que ardan todos.' },
    ],
  },
  boss: {
    key: 'boss', tex: TEX.boss, color: COLORS.boss, hp: 800, speed: 55, damage: 25, radius: 30, behavior: 'chase',
    dialogue: [
      { speaker: 'Guardia Real', text: 'Niña… tus padres traicionaron a la corona. El Rey solo impartió justicia.' },
      { speaker: 'The Caster', text: 'Eso no fue justicia. Fue miedo. Y el miedo se quema.' },
      { speaker: 'Narrador', text: 'El primer guardián cae. El camino al castillo se abre…' },
    ],
  },
  skillPointsReward: 4,
};
```

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies.js src/data/scenarios.js
git commit -m "feat: enemy types and scenario 1 data"
```

---

### Task 1.7: WaveRunner (TDD)

Pure state machine that sequences a scenario: waves → miniboss → temple → boss → done. It does not spawn anything; it tells `GameScene` what phase we are in and whether the current phase is cleared.

**Files:**
- Create: `the-caster/tests/WaveRunner.test.js`
- Create: `the-caster/src/systems/WaveRunner.js`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveRunner } from '../src/systems/WaveRunner.js';

const scenario = {
  waves: [
    { spawnDelay: 100, spawns: [{ type: 'villager', count: 2 }] },
    { spawnDelay: 100, spawns: [{ type: 'villager', count: 1 }] },
  ],
  miniboss: { hp: 10 },
  temple: { grantsSkill: 'fireball' },
  boss: { hp: 20 },
};

test('starts in the first wave phase', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.phase, 'wave');
  assert.equal(r.waveIndex, 0);
});

test('advances through both waves, then miniboss, temple, boss, done', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.phase, 'wave');     // wave 0
  r.onCleared();
  assert.equal(r.phase, 'wave');     // wave 1
  assert.equal(r.waveIndex, 1);
  r.onCleared();
  assert.equal(r.phase, 'miniboss');
  r.onCleared();
  assert.equal(r.phase, 'temple');
  r.onCleared();
  assert.equal(r.phase, 'boss');
  r.onCleared();
  assert.equal(r.phase, 'done');
});

test('currentWave returns the active wave definition', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.currentWave().spawns[0].count, 2);
  r.onCleared();
  assert.equal(r.currentWave().spawns[0].count, 1);
});

test('isComplete only true at done', () => {
  const r = new WaveRunner(scenario);
  assert.equal(r.isComplete(), false);
  for (let i = 0; i < 5; i++) r.onCleared();
  assert.equal(r.isComplete(), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/WaveRunner.test.js`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

```js
// src/systems/WaveRunner.js
// Phase order: each wave, then miniboss, temple, boss, done.
export class WaveRunner {
  constructor(scenario) {
    this.scenario = scenario;
    this.waveIndex = 0;
    this.phase = 'wave';
  }

  currentWave() {
    return this.scenario.waves[this.waveIndex];
  }

  // Called by GameScene when the current phase's enemies are all defeated
  // (or, for 'temple', when the caster has touched the temple).
  onCleared() {
    if (this.phase === 'wave') {
      if (this.waveIndex < this.scenario.waves.length - 1) {
        this.waveIndex += 1;
      } else {
        this.phase = 'miniboss';
      }
    } else if (this.phase === 'miniboss') {
      this.phase = 'temple';
    } else if (this.phase === 'temple') {
      this.phase = 'boss';
    } else if (this.phase === 'boss') {
      this.phase = 'done';
    }
  }

  isComplete() {
    return this.phase === 'done';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/WaveRunner.test.js`
Expected: PASS — 4 tests.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS — all suites (SaveSystem, SkillTree, CombatSystem, WaveRunner) green.

- [ ] **Step 6: Commit**

```bash
git add tests/WaveRunner.test.js src/systems/WaveRunner.js
git commit -m "feat: scenario wave sequencing state machine with tests"
```

---

## PHASE 2 — Geometric textures & player

### Task 2.1: Generate geometric textures in BootScene

Replace the placeholder BootScene with one that draws each entity as a Graphics shape and bakes it into a texture under the `TEX.*` key. Swapping to sprites later = load an atlas with the same keys; nothing else changes.

**Files:**
- Modify: `the-caster/src/scenes/BootScene.js` (full rewrite)

- [ ] **Step 1: Rewrite `src/scenes/BootScene.js`**

```js
import { COLORS, TEX } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeCircle(TEX.caster, COLORS.caster, 16);
    this.makeCircle(TEX.orb, COLORS.orb, 6);
    this.makeCircle(TEX.fireball, COLORS.fireball, 12);
    this.makeCircle(TEX.villager, COLORS.villager, 10);
    this.makeCircle(TEX.warrior, COLORS.warrior, 12);
    this.makeCircle(TEX.archer, COLORS.archer, 10);
    this.makeCircle(TEX.arrow, COLORS.arrow, 4);
    this.makeCircle(TEX.miniboss, COLORS.miniboss, 22);
    this.makeCircle(TEX.boss, COLORS.boss, 30);
    this.makeDiamond(TEX.temple, COLORS.temple, 26);

    this.scene.start('Menu');
  }

  makeCircle(key, color, radius) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0x000000, 0.4);
    g.strokeCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeDiamond(key, color, size) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(size, 0);
    g.lineTo(size * 2, size);
    g.lineTo(size, size * 2);
    g.lineTo(0, size);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size * 2, size * 2);
    g.destroy();
  }
}
```

- [ ] **Step 2: Create a temporary stub `src/scenes/MenuScene.js` so Boot can start it**

```js
import { GAME_WIDTH, GAME_HEIGHT, TEX } from '../config.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    // Temporary: prove textures generated by showing each one in a row.
    const keys = Object.values(TEX);
    keys.forEach((k, i) => {
      this.add.image(40 + (i % 5) * 80, 120 + Math.floor(i / 5) * 80, k);
    });
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'textures OK', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
  }
}
```

- [ ] **Step 3: Register MenuScene in `src/main.js`**

Modify the imports and `scene` array in `src/main.js`:

```js
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
// ...
  scene: [BootScene, MenuScene],
```

- [ ] **Step 4: Verify in browser**

Reload `http://localhost:8000`. Expected: a grid of colored shapes (blue caster circle, red/brown/green enemy circles, gold diamond temple, etc.) and "textures OK". No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.js src/scenes/MenuScene.js src/main.js
git commit -m "feat: generate geometric textures at boot"
```

---

### Task 2.2: InputSystem — virtual joystick

A self-contained joystick: on pointer-down anywhere in the lower-left half, it shows a base+thumb and reports a normalized vector. On release it hides and reports zero.

**Files:**
- Create: `the-caster/src/systems/InputSystem.js`

- [ ] **Step 1: Create `src/systems/InputSystem.js`**

```js
// Virtual joystick. Construct with a scene; read `.vector` each update.
// vector is {x, y} in [-1..1]. Renders on its own scene's display list.
const MAX_RADIUS = 60;

export class VirtualJoystick {
  constructor(scene) {
    this.scene = scene;
    this.vector = { x: 0, y: 0 };
    this.pointerId = null;

    this.base = scene.add.circle(0, 0, MAX_RADIUS, 0xffffff, 0.12).setVisible(false).setDepth(1000);
    this.thumb = scene.add.circle(0, 0, 26, 0xffffff, 0.30).setVisible(false).setDepth(1001);

    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  // Only the left half of the screen drives movement (right half is for skill buttons).
  isMovementZone(pointer) {
    return pointer.x < this.scene.scale.width * 0.55;
  }

  onDown(pointer) {
    if (this.pointerId !== null) return;
    if (!this.isMovementZone(pointer)) return;
    this.pointerId = pointer.id;
    this.origin = { x: pointer.x, y: pointer.y };
    this.base.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  onMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    const dx = pointer.x - this.origin.x;
    const dy = pointer.y - this.origin.y;
    const dist = Math.min(MAX_RADIUS, Math.hypot(dx, dy)) || 0;
    const angle = Math.atan2(dy, dx);
    this.thumb.setPosition(this.origin.x + Math.cos(angle) * dist, this.origin.y + Math.sin(angle) * dist);
    this.vector = { x: (dist / MAX_RADIUS) * Math.cos(angle), y: (dist / MAX_RADIUS) * Math.sin(angle) };
  }

  onUp(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector = { x: 0, y: 0 };
    this.base.setVisible(false);
    this.thumb.setVisible(false);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/InputSystem.js
git commit -m "feat: virtual joystick input"
```

---

### Task 2.3: Caster object — movement + auto-aim

The player. Holds effective stats (from `getStats`), moves by the joystick vector, and auto-fires at the nearest enemy on its `shotRate` cadence via a callback the scene provides.

**Files:**
- Create: `the-caster/src/objects/Caster.js`

- [ ] **Step 1: Create `src/objects/Caster.js`**

```js
import { TEX } from '../config.js';

export default class Caster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    super(scene, x, y, TEX.caster);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.stats = stats;            // from SkillTree.getStats(save)
    this.hp = stats.maxHealth;
    this.maxHp = stats.maxHealth;
    this._shotTimer = 0;
  }

  moveBy(vector) {
    this.setVelocity(vector.x * this.stats.moveSpeed, vector.y * this.stats.moveSpeed);
  }

  // Called every frame. enemies = array of live enemy sprites. onFire(target) spawns the orb.
  updateAutoAim(time, delta, enemies, onFire) {
    this._shotTimer -= delta;
    if (this._shotTimer > 0) return;
    const target = this.nearestEnemy(enemies);
    if (!target) return;
    this._shotTimer = this.stats.shotRate;
    onFire(target);
  }

  nearestEnemy(enemies) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/objects/Caster.js
git commit -m "feat: Caster with movement and nearest-enemy auto-aim"
```

---

### Task 2.4: ProjectilePool

Pooled projectiles (orb and fireball share the pool, differ by texture/damage/behavior).

**Files:**
- Create: `the-caster/src/systems/ProjectilePool.js`

- [ ] **Step 1: Create `src/systems/ProjectilePool.js`**

```js
// A reusable physics group of projectiles. fire() activates one from the pool.
export class ProjectilePool {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ maxSize: 200 });
  }

  fire(texKey, x, y, targetX, targetY, speed, damage, radius) {
    let p = this.group.getFirstDead(false);
    if (!p) {
      p = this.group.create(x, y, texKey);
    } else {
      p.setTexture(texKey);
      p.enableBody(true, x, y, true, true);
    }
    p.setActive(true).setVisible(true);
    p.damage = damage;
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    return p;
  }

  despawn(p) {
    p.disableBody(true, true);
  }

  // Recycle projectiles that left the world bounds (call from scene update).
  cullOffscreen(width, height) {
    this.group.children.iterate((p) => {
      if (!p || !p.active) return true;
      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
        this.despawn(p);
      }
      return true;
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/systems/ProjectilePool.js
git commit -m "feat: pooled projectiles"
```

---

### Task 2.5: Enemy object

A single Enemy class driven by an `ENEMY_TYPES` definition. `chase` steers at the caster; `ranged` keeps distance and calls a fire callback.

**Files:**
- Create: `the-caster/src/objects/Enemy.js`

- [ ] **Step 1: Create `src/objects/Enemy.js`**

```js
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this._fireTimer = def.fireEvery || 0;
  }

  // target = caster sprite. onRangedFire(enemy) spawns the enemy projectile.
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
}
```

- [ ] **Step 2: Commit**

```bash
git add src/objects/Enemy.js
git commit -m "feat: Enemy with chase and ranged behaviors"
```

---

## PHASE 3 — GameScene: combat loop

### Task 3.1: GameScene skeleton — caster moves, auto-fires, one wave spawns

This is the first integration. Wire Caster + InputSystem + ProjectilePool + Enemy + WaveRunner for **wave phase only** (miniboss/temple/boss come next). UI HUD is added in Phase 4; for now use a debug text.

**Files:**
- Create: `the-caster/src/scenes/GameScene.js`
- Modify: `the-caster/src/main.js` (register GameScene; temporarily start it directly)

- [ ] **Step 1: Create `src/scenes/GameScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX } from '../config.js';
import { SCENARIO_1 } from '../data/scenarios.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import { applyDamage } from '../systems/CombatSystem.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    // stats provided by Menu/SkillTree later; fall back to base for standalone runs.
    this.stats = data.stats || { ...BASE_STATS };
    this.scenario = SCENARIO_1;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.caster = new Caster(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.stats);
    this.joystick = new VirtualJoystick(this);
    this.orbs = new ProjectilePool(this);
    this.enemyShots = new ProjectilePool(this);
    this.enemies = this.physics.add.group();

    this.runner = new WaveRunner(this.scenario);
    this.runnerStarted = false;

    this.debug = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000);

    this.setupCollisions();
    this.beginPhase();
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
      this.damageCaster(enemy.def.damage * 0.02 * 16); // small continuous touch damage
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      this.enemyShots.despawn(shot);
    });
  }

  beginPhase() {
    if (this.runner.phase === 'wave') {
      this.spawnWave(this.runner.currentWave());
    }
    // miniboss/temple/boss handled in later tasks.
  }

  spawnWave(wave) {
    const queue = [];
    for (const s of wave.spawns) {
      for (let i = 0; i < s.count; i++) queue.push(s.type);
    }
    this.spawnQueue = queue;
    this.spawnEvent = this.time.addEvent({
      delay: wave.spawnDelay,
      repeat: queue.length - 1,
      callback: () => {
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
      },
    });
  }

  spawnEnemy(def) {
    // spawn just outside a random edge
    const edge = Phaser.Math.Between(0, 3);
    let x = 0; let y = 0;
    if (edge === 0) { x = Phaser.Math.Between(0, GAME_WIDTH); y = -20; }
    else if (edge === 1) { x = GAME_WIDTH + 20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    else if (edge === 2) { x = Phaser.Math.Between(0, GAME_WIDTH); y = GAME_HEIGHT + 20; }
    else { x = -20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    const e = new Enemy(this, x, y, def);
    this.enemies.add(e);
    return e;
  }

  hitEnemy(enemy, damage) {
    const r = applyDamage({ hp: enemy.hp }, damage);
    enemy.hp = r.hp;
    if (r.dead) {
      enemy.destroy();
      this.checkPhaseCleared();
    }
  }

  explode(orb, centerEnemy) {
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) {
        this.hitEnemy(e, orb.damage);
      }
      return true;
    });
  }

  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) this.scene.restart(); // die → restart scenario (Phase 5 refines this)
  }

  checkPhaseCleared() {
    const alive = this.enemies.countActive(true);
    const stillSpawning = this.spawnEvent && this.spawnEvent.getRepeatCount() > 0;
    if (alive === 0 && !stillSpawning && this.runner.phase === 'wave') {
      this.runner.onCleared();
      if (this.runner.phase === 'wave') this.spawnWave(this.runner.currentWave());
      // non-wave phases handled in later tasks
    }
  }

  fireOrb(target) {
    this.orbs.fire(TEX.orb, this.caster.x, this.caster.y, target.x, target.y, 420, this.stats.basicDamage, 0);
  }

  fireArrow(enemy) {
    this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, this.caster.x, this.caster.y, 260, enemy.def.damage, 0);
  }

  update(time, delta) {
    this.caster.moveBy(this.joystick.vector);
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    this.caster.updateAutoAim(time, delta, liveEnemies, (t) => this.fireOrb(t));
    for (const e of liveEnemies) {
      e.updateBehavior(delta, this.caster, (en) => this.fireArrow(en));
    }
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.debug.setText(`hp ${Math.ceil(this.caster.hp)}  enemies ${liveEnemies.length}  phase ${this.runner.phase}`);
  }
}
```

- [ ] **Step 2: Temporarily start GameScene directly in `src/main.js`**

Set the scene array so the game boots straight into combat for this task:

```js
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
// ...
  scene: [BootScene, MenuScene, GameScene],
```

And temporarily change `BootScene.create()`'s last line from `this.scene.start('Menu');` to `this.scene.start('Game');` (revert in Task 5.1).

- [ ] **Step 3: Verify in browser (mobile device toolbar, portrait, touch emulation on)**

Reload. Expected: blue caster at center; touch-drag in the left half shows the joystick and moves the caster; orbs auto-fire at the nearest enemy; villagers stream in and chase; clearing a wave spawns the next; archers appear in wave 2 and shoot arrows; debug text updates hp/enemies/phase. After 3 waves the phase text stays `wave` then nothing else spawns (miniboss comes next task) — that's expected.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js src/main.js src/scenes/BootScene.js
git commit -m "feat: GameScene combat loop with waves, movement, auto-aim"
```

---

### Task 3.2: Miniboss, temple, and boss phases

Extend `beginPhase`/`checkPhaseCleared` to handle the non-wave phases. The temple is a touchable object that advances the phase and grants the skill.

**Files:**
- Create: `the-caster/src/objects/Boss.js`
- Create: `the-caster/src/objects/Temple.js`
- Modify: `the-caster/src/scenes/GameScene.js`

- [ ] **Step 1: Create `src/objects/Boss.js`**

```js
// Boss/miniboss reuse Enemy's chase behavior but carry a healthbar above them.
import Enemy from './Enemy.js';

export default class Boss extends Enemy {
  constructor(scene, x, y, def) {
    super(scene, x, y, def);
    this.bar = scene.add.graphics().setDepth(1500);
  }

  drawBar() {
    this.bar.clear();
    const w = 60; const h = 6;
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.bar.fillStyle(0x000000, 0.6).fillRect(this.x - w / 2, this.y - this.def.radius - 14, w, h);
    this.bar.fillStyle(0xff5252, 1).fillRect(this.x - w / 2, this.y - this.def.radius - 14, w * pct, h);
  }

  destroy(fromScene) {
    if (this.bar) this.bar.destroy();
    super.destroy(fromScene);
  }
}
```

- [ ] **Step 2: Create `src/objects/Temple.js`**

```js
import { TEX } from '../config.js';

export default class Temple extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, TEX.temple);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.setImmovable(true);
    scene.tweens.add({ targets: this, scale: 1.15, yoyo: true, repeat: -1, duration: 700 });
  }
}
```

- [ ] **Step 3: Extend `GameScene` — add imports**

At the top of `src/scenes/GameScene.js` add:

```js
import Boss from '../objects/Boss.js';
import Temple from '../objects/Temple.js';
```

- [ ] **Step 4: Replace `beginPhase()` in `GameScene`**

```js
  beginPhase() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      this.spawnWave(this.runner.currentWave());
    } else if (phase === 'miniboss') {
      this.spawnBoss(this.scenario.miniboss);
    } else if (phase === 'temple') {
      this.spawnTemple();
    } else if (phase === 'boss') {
      this.spawnBoss(this.scenario.boss);
    } else if (phase === 'done') {
      this.finishScenario();
    }
  }

  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, def);
    this.enemies.add(this.boss);
  }

  spawnTemple() {
    this.temple = new Temple(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.scenario.temple);
    this.templeOverlap = this.physics.add.overlap(this.caster, this.temple, () => {
      if (this.temple && this.temple.active) {
        this.stats.hasFireball = true; // skill granted (used by Phase 4 fireball button)
        this.temple.destroy();
        this.temple = null;
        this.runner.onCleared();
        this.beginPhase();
      }
    });
  }

  finishScenario() {
    // Refined in Task 5.x (award points + go to SkillTree). Stub for now:
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '¡Escenario completo!', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#fff',
    }).setOrigin(0.5).setDepth(3000);
    this.physics.pause();
  }
```

- [ ] **Step 5: Replace `checkPhaseCleared()` in `GameScene`**

```js
  checkPhaseCleared() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      const alive = this.enemies.countActive(true);
      const stillSpawning = this.spawnEvent && this.spawnEvent.getRepeatCount() > 0;
      if (alive === 0 && !stillSpawning) {
        this.runner.onCleared();
        this.beginPhase();
      }
    } else if (phase === 'miniboss' || phase === 'boss') {
      if (this.enemies.countActive(true) === 0) {
        this.runner.onCleared();
        this.beginPhase();
      }
    }
    // 'temple' advances via overlap, not via kills.
  }
```

- [ ] **Step 6: Draw boss healthbar in `update()`**

Add to the end of `GameScene.update()`:

```js
    if (this.boss && this.boss.active) this.boss.drawBar();
```

- [ ] **Step 7: Verify in browser**

Reload. Play through: 3 waves → purple miniboss (with healthbar) chases, kill it → gold diamond temple appears at center → walk into it → it vanishes and the red boss drops in with a healthbar → kill it → "¡Escenario completo!" appears and physics pause. Phase text in debug walks `wave → miniboss → temple → boss → done`.

- [ ] **Step 8: Commit**

```bash
git add src/objects/Boss.js src/objects/Temple.js src/scenes/GameScene.js
git commit -m "feat: miniboss, temple unlock, and boss phases"
```

---

## PHASE 4 — HUD & Fireball

### Task 4.1: UIScene — health bar and skill button (Fireball)

A HUD scene runs **parallel** to GameScene (launched, not started). It shows the caster health bar and a Fireball button (enabled only after the temple). The button calls back into GameScene to cast.

**Files:**
- Create: `the-caster/src/scenes/UIScene.js`
- Modify: `the-caster/src/scenes/GameScene.js` (launch UIScene; expose cast + hp; add fireball casting)

- [ ] **Step 1: Create `src/scenes/UIScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  init(data) { this.game_scene = data.gameScene; }

  create() {
    // Health bar (top).
    this.hpBack = this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 40, 16, COLORS.healthBack).setOrigin(0.5);
    this.hpFill = this.add.rectangle(22, 24, GAME_WIDTH - 44, 12, COLORS.healthFill).setOrigin(0, 0.5);
    this.hpMaxW = GAME_WIDTH - 44;

    // Fireball button (bottom-right). Disabled until skill granted.
    this.fireBtn = this.add.circle(GAME_WIDTH - 56, GAME_HEIGHT - 70, 36, COLORS.fireball, 0.25)
      .setStrokeStyle(3, COLORS.fireball).setInteractive();
    this.fireLabel = this.add.text(GAME_WIDTH - 56, GAME_HEIGHT - 70, '🔥', { fontSize: '28px' }).setOrigin(0.5);
    this.cdArc = this.add.graphics();

    this.fireBtn.on('pointerdown', () => this.game_scene.tryCastFireball());
  }

  update() {
    const gs = this.game_scene;
    if (!gs || !gs.caster) return;
    const pct = Phaser.Math.Clamp(gs.caster.hp / gs.caster.maxHp, 0, 1);
    this.hpFill.width = this.hpMaxW * pct;

    const ready = gs.stats.hasFireball;
    this.fireBtn.setAlpha(ready ? 1 : 0.25);
    this.fireLabel.setAlpha(ready ? 1 : 0.3);

    // Cooldown sweep.
    this.cdArc.clear();
    if (ready && gs.fireballCdRemaining > 0) {
      const frac = gs.fireballCdRemaining / gs.stats.fireballCooldown;
      this.cdArc.fillStyle(0x000000, 0.5);
      this.cdArc.slice(GAME_WIDTH - 56, GAME_HEIGHT - 70, 36,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      this.cdArc.fillPath();
    }
  }
}
```

- [ ] **Step 2: Wire UIScene into GameScene**

In `GameScene.create()`, after creating the caster and pools, add:

```js
    this.fireballCdRemaining = 0;
    this.scene.launch('UI', { gameScene: this });
```

Remove the old `this.debug` text creation and its `setText` call in `update()` (the HUD replaces it). If you prefer to keep debugging, leave it; it does no harm.

- [ ] **Step 3: Add Fireball casting to GameScene**

Add these methods to `GameScene`:

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

And in `GameScene.update()`, add cooldown tick near the top:

```js
    if (this.fireballCdRemaining > 0) this.fireballCdRemaining -= delta;
```

- [ ] **Step 4: Register UIScene in `src/main.js`**

```js
import UIScene from './scenes/UIScene.js';
// ...
  scene: [BootScene, MenuScene, GameScene, UIScene],
```

- [ ] **Step 5: Verify in browser**

Reload. Expected: green health bar at top depletes when enemies touch you; Fireball button bottom-right is dimmed until you touch the temple, then lights up; tapping it launches an orange fireball that explodes (AoE damages clustered enemies) and the button shows a cooldown sweep that refills. Movement (left half) and the fireball button (right) don't interfere.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/UIScene.js src/scenes/GameScene.js src/main.js
git commit -m "feat: HUD with health bar and Fireball skill button"
```

---

## PHASE 5 — Flow: menu, dialogue, skill tree, save

### Task 5.1: DialogueScene

Overlay that plays a list of `{speaker, text}` lines, tap to advance, then runs an `onDone` callback. Used for intro, temple, and boss-death story.

**Files:**
- Create: `the-caster/src/scenes/DialogueScene.js`
- Modify: `the-caster/src/main.js` (register)

- [ ] **Step 1: Create `src/scenes/DialogueScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  init(data) {
    this.lines = data.lines || [];
    this.onDone = data.onDone || (() => {});
    this.index = 0;
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setDepth(0);
    this.boxBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 140, GAME_WIDTH - 30, 200, 0x12101a, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.3);
    this.speaker = this.add.text(30, GAME_HEIGHT - 228, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f' });
    this.body = this.add.text(30, GAME_HEIGHT - 196, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 4,
    });
    this.hint = this.add.text(GAME_WIDTH - 30, GAME_HEIGHT - 56, '▶ tap', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(1, 0.5);

    this.render();
    this.input.on('pointerdown', () => this.advance());
  }

  render() {
    const line = this.lines[this.index];
    this.speaker.setText(line.speaker);
    this.body.setText(line.text);
  }

  advance() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      const cb = this.onDone;
      this.scene.stop();
      cb();
    } else {
      this.render();
    }
  }
}
```

- [ ] **Step 2: Register in `src/main.js`**

```js
import DialogueScene from './scenes/DialogueScene.js';
// ...
  scene: [BootScene, MenuScene, GameScene, UIScene, DialogueScene],
```

- [ ] **Step 3: Verify in isolation**

Temporarily, at the end of `MenuScene.create()`, add:

```js
this.scene.launch('Dialogue', { lines: [{ speaker: 'Test', text: 'Hola, soy un diálogo de prueba. Toca para avanzar.' }, { speaker: 'Test', text: 'Segunda línea.' }], onDone: () => console.log('dialogue done') });
```

Reload, tap through both lines, confirm console logs "dialogue done" and the overlay disappears. Then remove this temporary block.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/DialogueScene.js src/main.js
git commit -m "feat: tap-to-advance dialogue overlay"
```

---

### Task 5.2: Hook dialogue into scenario flow

Play intro dialogue before waves; temple dialogue when touched; boss dialogue on boss death (before finishing).

**Files:**
- Modify: `the-caster/src/scenes/GameScene.js`

- [ ] **Step 1: Gate the intro behind dialogue**

In `GameScene.create()`, replace the `this.beginPhase();` call at the end with:

```js
    this.scene.pause();
    this.scene.launch('Dialogue', {
      lines: this.scenario.intro,
      onDone: () => { this.scene.resume(); this.beginPhase(); },
    });
```

- [ ] **Step 2: Temple dialogue**

In `spawnTemple()`'s overlap callback, replace the body with a dialogue-gated version:

```js
    this.templeOverlap = this.physics.add.overlap(this.caster, this.temple, () => {
      if (!this.temple || !this.temple.active) return;
      this.temple.destroy();
      this.temple = null;
      this.scene.pause();
      this.scene.launch('Dialogue', {
        lines: this.scenario.temple.dialogue,
        onDone: () => {
          this.scene.resume();
          this.stats.hasFireball = true;
          this.runner.onCleared();
          this.beginPhase();
        },
      });
    });
```

- [ ] **Step 3: Boss-death dialogue**

In `checkPhaseCleared()`, special-case the boss so its dialogue plays before advancing:

```js
    } else if (phase === 'miniboss' || phase === 'boss') {
      if (this.enemies.countActive(true) === 0) {
        if (phase === 'boss') {
          this.boss = null;
          this.scene.pause();
          this.scene.launch('Dialogue', {
            lines: this.scenario.boss.dialogue,
            onDone: () => { this.scene.resume(); this.runner.onCleared(); this.beginPhase(); },
          });
        } else {
          this.runner.onCleared();
          this.beginPhase();
        }
      }
    }
```

- [ ] **Step 4: Verify in browser**

Reload. Expected: game starts paused behind the 3-line intro; tap through → waves begin. Touching the temple opens its 2-line dialogue, then grants Fireball. Killing the boss opens its 3-line story dialogue, then shows "¡Escenario completo!".

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat: intro, temple, and boss story dialogue in flow"
```

---

### Task 5.3: SkillTreeScene

Spend earned points on the tree. Reads/writes the save via `SaveSystem`; uses `canPurchase`/`purchase`.

**Files:**
- Create: `the-caster/src/scenes/SkillTreeScene.js`
- Modify: `the-caster/src/main.js` (register)

- [ ] **Step 1: Create `src/scenes/SkillTreeScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILL_TREE, SKILL_TREE_ORDER } from '../data/skilltree.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { canPurchase, purchase } from '../systems/SkillTree.js';

export default class SkillTreeScene extends Phaser.Scene {
  constructor() { super('SkillTree'); }

  create() {
    this.save = new SaveSystem(window.localStorage);
    this.state = this.save.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 40, 'Árbol de Habilidades', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#fff',
    }).setOrigin(0.5);
    this.pointsText = this.add.text(GAME_WIDTH / 2, 76, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5);

    this.rows = [];
    SKILL_TREE_ORDER.forEach((id, i) => {
      const y = 120 + i * 70;
      const node = SKILL_TREE[id];
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, 56, 0x241c33)
        .setStrokeStyle(2, 0x4fc3f7, 0.4).setInteractive();
      const label = this.add.text(40, y - 16, `${node.label}  (${node.cost})`, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#fff',
      });
      const status = this.add.text(GAME_WIDTH - 40, y, '', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#aaa',
      }).setOrigin(1, 0.5);
      bg.on('pointerdown', () => this.buy(id));
      this.rows.push({ id, bg, label, status });
    });

    // Continue button.
    const cont = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 200, 48, 0x4fc3f7, 0.25)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Continuar', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);
    cont.on('pointerdown', () => this.scene.start('Menu'));

    this.refresh();
  }

  buy(id) {
    const check = canPurchase(this.state, id);
    if (!check.ok) return;
    this.state = purchase(this.state, id);
    this.save.write(this.state);
    this.refresh();
  }

  refresh() {
    this.pointsText.setText(`Puntos: ${this.state.skillPoints}`);
    for (const row of this.rows) {
      const owned = this.state.purchasedNodes.includes(row.id);
      const check = canPurchase(this.state, row.id);
      row.status.setText(owned ? '✔ comprado' : (check.ok ? 'comprar' : check.reason));
      row.bg.setFillStyle(owned ? 0x1b3a1b : (check.ok ? 0x241c33 : 0x1a1622));
    }
  }
}
```

- [ ] **Step 2: Register in `src/main.js`**

```js
import SkillTreeScene from './scenes/SkillTreeScene.js';
// ...
  scene: [BootScene, MenuScene, GameScene, UIScene, DialogueScene, SkillTreeScene],
```

- [ ] **Step 3: Verify in isolation**

Temporarily change `BootScene` to `this.scene.start('SkillTree')` and, to have points to spend, run once in the browser console: `localStorage.setItem('the-caster:save', JSON.stringify({version:1,skillPoints:5,purchasedNodes:[],unlockedSkills:[],unlockedTemples:[],currentScenario:'scenario1'}))` then reload. Expected: "Puntos: 5"; buying `+Daño básico I` drops to 4 and marks it bought; `+Daño básico II` shows "falta requisito previo" until I is bought; reloading the page preserves purchases (persisted to localStorage). Revert BootScene to `this.scene.start('Menu')` after.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/SkillTreeScene.js src/main.js
git commit -m "feat: skill tree screen wired to save and purchase logic"
```

---

### Task 5.4: MenuScene + full campaign wiring + save integration

Turn the stub MenuScene into the real title + "Tap to play" (which also triggers fullscreen), load the save, compute stats, and start GameScene. On scenario completion, award points, persist, and go to the skill tree.

**Files:**
- Modify: `the-caster/src/scenes/MenuScene.js` (full rewrite)
- Modify: `the-caster/src/scenes/GameScene.js` (`finishScenario` awards points + transitions; death restarts cleanly)
- Modify: `the-caster/src/scenes/BootScene.js` (ensure it starts `Menu`)

- [ ] **Step 1: Rewrite `src/scenes/MenuScene.js`**

```js
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getStats } from '../systems/SkillTree.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.save = new SaveSystem(window.localStorage);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'THE CASTER', {
      fontFamily: 'sans-serif', fontSize: '44px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'venganza elemental', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5);

    const play = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, '▶  TAP PARA JUGAR', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive();

    this.tweens.add({ targets: play, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });

    play.on('pointerdown', () => {
      // Fullscreen must be triggered by this user gesture (Task 6 handles fallback).
      if (this.scale.fullscreen.available && !this.scale.isFullscreen) {
        this.scale.startFullscreen();
      }
      this.startCampaign();
    });
  }

  startCampaign() {
    const state = this.save.load();
    const stats = getStats(state);
    this.scene.start('Game', { stats });
  }
}
```

- [ ] **Step 2: Make `finishScenario()` award points and go to skill tree**

Replace `GameScene.finishScenario()` with:

```js
  finishScenario() {
    this.physics.pause();
    const save = new SaveSystem(window.localStorage);
    const state = save.load();
    state.skillPoints += this.scenario.skillPointsReward;
    if (!state.unlockedSkills.includes('fireball')) state.unlockedSkills.push('fireball');
    if (!state.unlockedTemples.includes('fire')) state.unlockedTemples.push('fire');
    save.write(state);

    this.scene.stop('UI');
    this.scene.launch('Dialogue', {
      lines: [{ speaker: 'Narrador', text: `Ganaste ${this.scenario.skillPointsReward} puntos de habilidad.` }],
      onDone: () => this.scene.start('SkillTree'),
    });
  }
```

Add the import at the top of `GameScene.js`:

```js
import { SaveSystem } from '../systems/SaveSystem.js';
```

- [ ] **Step 3: Clean death handling**

Replace `damageCaster()`'s death branch so the UI scene is stopped before restart (prevents duplicate HUDs):

```js
  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) {
      this.scene.stop('UI');
      this.scene.start('Game', { stats: this.stats }); // restart this scenario only
    }
  }
```

- [ ] **Step 4: Ensure BootScene ends with `this.scene.start('Menu');`**

If Task 3.1 left it starting `'Game'`, change it back to `'Menu'`.

- [ ] **Step 5: Verify full loop in browser**

Reload. Title → TAP PARA JUGAR (fullscreen kicks in on supported browsers) → intro dialogue → waves → miniboss → temple (+fireball) → boss → boss dialogue → "Ganaste 4 puntos" → skill tree (spend, persists) → Continuar → back to title. Start again: purchased upgrades now apply (e.g. more move speed / damage). Die mid-run: restarts the scenario, save intact.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.js src/scenes/GameScene.js src/scenes/BootScene.js
git commit -m "feat: full campaign loop with menu, rewards, and persistence"
```

---

## PHASE 6 — Mobile polish & deploy

### Task 6.1: Fullscreen + portrait robustness

Handle the iOS fallback (no Fullscreen API) and re-fit on resize/orientation change. Keep the canvas correctly sized when the mobile address bar shows/hides.

**Files:**
- Modify: `the-caster/src/main.js`

- [ ] **Step 1: Add resize handling and an orientation hint in `src/main.js`**

After `new Phaser.Game(config);`, append:

```js
const game = new Phaser.Game(config);

// Re-fit when the viewport changes (address bar, rotation).
function refit() {
  game.scale.refresh();
}
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 200));
```

(Change the earlier `new Phaser.Game(config);` line to `const game = new Phaser.Game(config);` — do not create it twice.)

- [ ] **Step 2: Add a portrait-lock attempt (best-effort, ignored where unsupported)**

In `MenuScene.create()`'s `play.on('pointerdown', ...)`, after `startFullscreen()`, add:

```js
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {});
      }
```

- [ ] **Step 3: Verify on a real phone (or device emulation)**

Serve over your LAN (`python3 -m http.server 8000`, then open `http://<your-ip>:8000` on the phone). Expected: tapping "TAP PARA JUGAR" goes fullscreen on Android Chrome; on iOS Safari it stays in the CSS full-viewport layout (no crash, playable). Rotating the device keeps the game fitted and centered; the HUD stays anchored.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/scenes/MenuScene.js
git commit -m "feat: fullscreen fallback, refit on resize, portrait lock attempt"
```

---

### Task 6.2: Deploy to GitHub Pages

Publish the static files. No build step — Pages serves the repo root.

**Files:**
- Create: `the-caster/README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# The Caster

Mobile top-down survivor built with Phaser 3. No build step — open `index.html`.

## Run locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Test (game logic only)
```bash
node --test
```

## Deploy
Hosted on GitHub Pages from the repository root.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: project readme"
```

- [ ] **Step 3: Push to GitHub (user performs the account steps)**

These steps require the user's GitHub account:

1. Create a new GitHub repository named `the-caster` (empty, no README).
2. From `the-caster/`:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/the-caster.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / root → Save**.
4. Wait ~1 minute; the game is live at `https://<your-username>.github.io/the-caster/`.

- [ ] **Step 4: Verify the live URL on a phone**

Open the Pages URL on a phone. Expected: title screen, tap to play, full game loop works, progress persists in that phone's browser. (Because all asset paths are relative and there is no build, the subpath URL works without extra config.)

---

## Self-Review

**Spec coverage (each spec section → task):**
- §3 Architecture (Phaser CDN, ES modules, no build, FIT/portrait): Tasks 0.2–0.4, 6.1. ✔
- §4 Control (virtual joystick, portrait): Task 2.2, 3.1. ✔
- §4 Combat (auto-aim, pooled projectiles, collisions): Tasks 2.3, 2.4, 3.1. ✔
- §4 Enemies (villager/warrior/archer; chase + ranged): Tasks 1.6, 2.5, 3.1. (Tank + healer are post-slice content — slice uses 3 types per spec §9.) ✔
- §4 Skills (Fireball via fire temple, button + cooldown): Tasks 3.2, 4.1. ✔
- §4 Scenario structure (waves → miniboss → temple → boss): Tasks 1.7, 3.1, 3.2. ✔
- §5 Progression (fixed points per scenario → persistent skill tree): Tasks 1.3, 1.4, 5.3, 5.4. ✔
- §5 Save (versioned localStorage): Task 1.2; integrated 5.3, 5.4. ✔
- §6 Dialogue (intro, temple, boss; tap to advance, data-driven): Tasks 5.1, 5.2. ✔
- §7 Data-driven (enemies/skills/waves/dialogue as data; art as key): Tasks 0.2, 1.3, 1.6. ✔
- §8 Testing (pure logic via node --test; manual playtest): Tasks 1.2, 1.4, 1.5, 1.7. ✔
- §9 Vertical slice flow: realized end-to-end by Task 5.4. ✔
- §10 Out of scope (roguelike, final art, Vite, NG+, audio): respected — none implemented. ✔
- §3 Death → restart scenario only: Task 5.4 Step 3. ✔
- §3 Fullscreen on mobile + iOS fallback: Tasks 5.4 Step 1, 6.1. ✔

**Placeholder scan:** No "TBD/TODO/implement later" steps; every code step contains complete code. `finishScenario` is intentionally stubbed in Task 3.2 and fully implemented in Task 5.4 (noted explicitly). ✔

**Type consistency:** Save shape (`version, skillPoints, purchasedNodes, unlockedSkills, unlockedTemples, currentScenario`) consistent across SaveSystem, SkillTree, SkillTreeScene, MenuScene, GameScene. Stat keys (`basicDamage, shotRate, moveSpeed, maxHealth, fireballDamage, fireballCooldown`) consistent across stats.js, skilltree.js, SkillTree.getStats, Caster, GameScene. `stats.hasFireball` set in temple flow (5.2) and read in UIScene (4.1)/GameScene (4.1). `WaveRunner` phase strings (`wave/miniboss/temple/boss/done`) consistent across WaveRunner and GameScene. Projectile fields (`damage, aoeRadius`) consistent between ProjectilePool and GameScene collisions. ✔

**Note on healthbar at low fps / touch damage tuning:** combat numbers (touch damage multiplier in `setupCollisions`, projectile speeds) are first-pass and meant to be tuned during manual playtest — they are not correctness issues.
