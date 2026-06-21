# Lazy Sprite Forging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the ~3.5 s (desktop) / ~10–15 s (mobile) black boot screen by forging only a small CORE sprite set at boot and forging each world's sprite set on demand, masked behind a narrative IntroScene.

**Architecture:** A pure manifest (`regionSpriteKeys`) derives the exact forgeable sprite keys a region needs (walking waves, minions, bosses, shapeshifter `forms`, runtime-swap sprites, and transitive summons). The Phaser-coupled forge logic moves out of `BootScene` into a reusable, chunked-async `bakeSprites(scene, keys)` helper. `BootScene` forges only CORE; a new `IntroScene` (inserted between the Map portal and Branch for the 4 elemental worlds) forges that world's set while the player reads its lore, with a loading-bar fallback.

**Tech Stack:** Phaser 3 (CDN, no bundler), native ES modules, `node:test` for pure logic. Spanish-first i18n via `src/i18n`.

## Global Constraints

- **No build step / no bundler / no npm runtime deps.** Native ES modules only (copied verbatim from spec & CLAUDE.md).
- **Mobile-only, portrait, 480×854 logical.** Do not change resolution or Scale config.
- **Pure logic stays Phaser-free.** `src/data/spriteManifest.js` must import no Phaser; it is unit-tested under `node --test`. Phaser-coupled code (`spriteBaker.js`, `IntroScene.js`, scene edits) gets no unit tests (repo convention — scenes/objects are untested).
- **Texture/color keys centralized.** Reference `config.js` `TEX`/`COLORS`, `spriteKey`/`frameKey`; never inline a key string or hex.
- **Tests:** `node --test` must stay green. Run it as the gate for the pure task.
- **Texture cache is global & session-lived.** Forged textures persist in `game.textures` across scene changes; `bakeSprites` must be idempotent (skip already-forged textures AND already-created anims).

---

## File Structure

- **Create** `src/data/spriteManifest.js` — pure: `regionSpriteKeys(region)`, `CORE_SPRITE_KEYS`.
- **Create** `tests/spriteManifest.test.js` — unit tests for the manifest.
- **Create** `src/scenes/spriteBaker.js` — Phaser-coupled: `bakeSprites(scene, keys, opts)` + forge/paint helpers extracted from BootScene.
- **Create** `src/scenes/IntroScene.js` — per-world lore + masked forge + loading fallback.
- **Modify** `src/data/bosses/air.js` — add `extraSprites: ['galahad_cadaver']` to the Galahad def (manifest hint for the runtime corpse swap).
- **Modify** `src/scenes/BootScene.js` — delegate forging to `bakeSprites`; forge only CORE.
- **Modify** `src/scenes/MapScene.js` — 4 elemental portals → `Intro`; castle stays `Branch`.
- **Modify** `src/data/regions.js` — `makeBranch` exposes `intro` on the region and drops the level-1 `onEnter` intro.
- **Modify** `src/main.js` — register `IntroScene`.
- **Modify** `src/i18n/locales/es.js` & `en.js` — add `ui.continue`, `ui.loading`.

---

## Task 1: Pure sprite manifest (`spriteManifest.js`)

**Files:**
- Create: `src/data/spriteManifest.js`
- Modify: `src/data/bosses/air.js` (add `extraSprites` to Galahad def)
- Test: `tests/spriteManifest.test.js`

**Interfaces:**
- Consumes: `RECIPES` from `./sprites/recipes.js`; `ENEMY_TYPES` from `./enemies/index.js`; `REGIONS` (in tests) from `./regions.js`.
- Produces:
  - `regionSpriteKeys(region) -> Set<string>` — forgeable recipe keys a region needs (excludes geometric placeholders and unused defs).
  - `CORE_SPRITE_KEYS: string[]` — keys forged at boot (hero, generic humans, projectiles, tentacle hazard).

- [ ] **Step 1: Write the failing test**

Create `tests/spriteManifest.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { regionSpriteKeys, CORE_SPRITE_KEYS } from '../src/data/spriteManifest.js';
import { REGIONS } from '../src/data/regions.js';
import { RECIPES } from '../src/data/sprites/recipes.js';

test('fire: includes wave enemies, bosses, and transitive summons', () => {
  const fire = regionSpriteKeys(REGIONS.fire);
  // wave enemies
  for (const k of ['acolito_brasa', 'lanzabrasas', 'salamandra', 'piromante', 'totem_pira']) {
    assert.ok(fire.has(k), `expected fire to include ${k}`);
  }
  // bosses (minibosses + temple boss)
  for (const k of ['pyra', 'vesta', 'favilla', 'ignatius']) {
    assert.ok(fire.has(k), `expected fire to include boss ${k}`);
  }
  // transitive summons: imp_brasa (sacerdote_llama/favilla), brasa_errante (ignatius)
  assert.ok(fire.has('imp_brasa'), 'expected transitive summon imp_brasa');
  assert.ok(fire.has('brasa_errante'), 'expected transitive summon brasa_errante');
});

test('fire: excludes defs no wave or boss references', () => {
  const fire = regionSpriteKeys(REGIONS.fire);
  for (const k of ['encapuchado_pira', 'portaestandarte', 'coloso_magma', 'fenix_menor']) {
    assert.ok(!fire.has(k), `expected fire to exclude unused ${k}`);
  }
});

test('manifest drops geometric placeholders (no recipe)', () => {
  // castle minibosses use geometric keys 'miniboss'/'levelboss'/'templeboss' (no recipe)
  const castle = regionSpriteKeys(REGIONS.castle);
  for (const k of ['miniboss', 'levelboss', 'templeboss']) {
    assert.ok(!castle.has(k), `expected geometric ${k} dropped`);
  }
});

test('castle needs no forged sprite beyond core', () => {
  const castle = regionSpriteKeys(REGIONS.castle);
  for (const k of castle) {
    assert.ok(CORE_SPRITE_KEYS.includes(k), `castle key ${k} should be in core`);
  }
});

test('shapeshifter forms are included (water Dama, air Galahad, earth Cefalo)', () => {
  const water = regionSpriteKeys(REGIONS.water);
  for (const k of ['dama_lago', 'dama_maga', 'dama_tiburon', 'dama_kraken', 'dama_ballena', 'dama_maga_final']) {
    assert.ok(water.has(k), `expected water Dama form ${k}`);
  }
  const air = regionSpriteKeys(REGIONS.air);
  for (const k of ['galahad_humano', 'galahad_rage', 'galahad_murcielago', 'galahad_final']) {
    assert.ok(air.has(k), `expected air Galahad form ${k}`);
  }
  // runtime corpse swap declared via extraSprites
  assert.ok(air.has('galahad_cadaver'), 'expected galahad_cadaver via extraSprites');
  const earth = regionSpriteKeys(REGIONS.earth);
  for (const k of ['cefalo_humano', 'cefalo_felino']) {
    assert.ok(earth.has(k), `expected earth Cefalo form ${k}`);
  }
});

test('every projectile recipe is in CORE_SPRITE_KEYS', () => {
  for (const [k, r] of Object.entries(RECIPES)) {
    if (r.archetype === 'projectile') {
      assert.ok(CORE_SPRITE_KEYS.includes(k), `projectile ${k} must be core`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/spriteManifest.test.js`
Expected: FAIL — `Cannot find module '../src/data/spriteManifest.js'`.

- [ ] **Step 3: Add the `extraSprites` hint to the Galahad def**

In `src/data/bosses/air.js`, find the top-level Galahad def (the one with `forms: [GALAHAD_HUMANO, ...]`, around line 282). Add an `extraSprites` field next to `forms`:

```js
  scaleForms: true,
  extraSprites: ['galahad_cadaver'], // runtime death-swap sprite (GameScene sets it on death); not a form
  forms: [GALAHAD_HUMANO, GALAHAD_RAGE, GALAHAD_RAGE2, GALAHAD_MURCIELAGO, GALAHAD_FINAL],
```

(Match the exact surrounding lines; only add the `extraSprites` line. Keep existing fields intact.)

- [ ] **Step 4: Write the manifest implementation**

Create `src/data/spriteManifest.js`:

```js
// src/data/spriteManifest.js
// Pure (no Phaser). Derives the exact set of forgeable sprite keys a region
// needs, so BootScene can forge only CORE and each world forges its set on
// demand. Walks waves, minions, bosses, shapeshifter `forms`, runtime-swap
// `extraSprites`, and transitive summons (enemy attacks + boss sequences).
import { RECIPES } from './sprites/recipes.js';
import { ENEMY_TYPES } from './enemies/index.js';

// Forged at boot — shared across every world: the hero, the generic humans used
// as temple minions everywhere, all player/enemy projectiles, and the tentacle
// hazard sprite (GameScene renders it directly via spriteKey('tentacle')).
export const CORE_SPRITE_KEYS = [
  'hero',
  'villager', 'villager_blond', 'villager_black', 'warrior', 'archer',
  'orb', 'fireball', 'arrow', 'bolt', 'iceShard', 'poisonGlob',
  'tentacle',
];

function addSummons(step, out, queue) {
  for (const k of [step.spawnType, ...(step.spawnTypes || [])]) {
    if (k && !out.has(k)) { out.add(k); queue.push(k); }
  }
}

export function regionSpriteKeys(region) {
  const out = new Set();
  const queue = [];
  const bossObjs = [];
  const seed = (k) => { if (k && !out.has(k)) { out.add(k); queue.push(k); } };

  // A boss/miniboss/temple def: add its key, its shapeshifter forms, and any
  // runtime-swap sprites; collect the object so its summon sequences get scanned.
  const addBoss = (b) => {
    if (!b) return;
    seed(b.key);
    bossObjs.push(b);
    for (const f of b.forms || []) addBoss(f);
    for (const k of b.extraSprites || []) seed(k);
  };

  for (const level of region.levels) {
    for (const phase of level.phases) {
      if (phase.spawns) for (const s of phase.spawns) seed(s.type);
      if (phase.minions) for (const m of phase.minions) seed(m.type);
      addBoss(phase.enemyDef);
      for (const b of phase.bosses || []) addBoss(b);
    }
  }

  // Boss summons live in the boss object's phase sequences (+ trio soloSequence).
  for (const boss of bossObjs) {
    const steps = [];
    for (const ph of boss.phases || []) steps.push(...(ph.sequence || []));
    steps.push(...(boss.soloSequence || []));
    for (const step of steps) if (step.do === 'summon') addSummons(step, out, queue);
  }

  // Enemy summons live in attack defs; resolve transitively to a fixpoint.
  while (queue.length) {
    const def = ENEMY_TYPES[queue.pop()];
    if (!def) continue;
    for (const att of def.attacks || []) if (att.type === 'summon') addSummons(att, out, queue);
  }

  // Keep only forgeable keys — drop geometric placeholders ('miniboss', etc.).
  return new Set([...out].filter((k) => RECIPES[k]));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/spriteManifest.test.js`
Expected: PASS (6 tests).

Then run the full suite to confirm no regression:
Run: `node --test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/data/spriteManifest.js tests/spriteManifest.test.js src/data/bosses/air.js
git commit -m "feat(perf): pure regionSpriteKeys manifest + CORE_SPRITE_KEYS

Derives exact forgeable sprite set per region (waves, minions, bosses,
shapeshifter forms, extraSprites, transitive summons). Declares Galahad's
runtime corpse sprite via extraSprites so the manifest catches it.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Reusable chunked forge helper (`spriteBaker.js`)

Extract the forge/paint logic from `BootScene` into a reusable, idempotent, chunked-async `bakeSprites`. This task is **behavior-preserving**: `BootScene` still forges every sprite at boot (just via the helper), so the game looks and works exactly as before. Tasks 3–4 then change *what* gets forged *where*.

**Files:**
- Create: `src/scenes/spriteBaker.js`
- Modify: `src/scenes/BootScene.js`

**Interfaces:**
- Consumes (from `BootScene`): nothing new.
- Produces: `async function bakeSprites(scene, keys, { chunkSize = 4, onProgress } = {}) -> Promise<void>` — forges each key in `keys` that has a recipe and is not already in the scene's texture cache, yielding to the browser every `chunkSize` recipes; calls `onProgress(done, total)` after each.

- [ ] **Step 1: Create `spriteBaker.js` with the extracted logic**

Create `src/scenes/spriteBaker.js`. This moves `mirrorFrames`, the per-recipe forge body, `paintForged`, `paintGrid`, and `resolvePartPalette` out of `BootScene`, parameterized by `scene`:

```js
// src/scenes/spriteBaker.js
// Phaser-coupled. Forges a set of sprite recipes into textures + anims on a
// scene's global TextureManager, chunked across frames so it can run during an
// IntroScene without freezing it. Idempotent: skips textures/anims already made.
import { COLORS, spriteKey, frameKey } from '../config.js';
import { RECIPES, paletteFor } from '../data/sprites/recipes.js';
import { PARTS } from '../data/sprites/parts.js';
import { forge } from '../systems/SpriteForge.js';
import { ENEMY_TYPES } from '../data/enemies/index.js';
import { derivePalette, NAMED_PALETTES } from '../data/sprites/palettes.js';

// Mirror every composed frame horizontally (for `flip:true` recipes drawn facing left).
function mirrorFrames(out) {
  for (const frames of Object.values(out.anims)) {
    for (let i = 0; i < frames.length; i++) {
      frames[i] = frames[i].map((row) => [...row].reverse());
    }
  }
}

// A part-ref may name its own palette ({palette:'skin'}) or a base color ({color, accent?}).
function resolvePartPalette(ref) {
  if (typeof ref !== 'object') return null;
  if (ref.palette) {
    const p = NAMED_PALETTES[ref.palette];
    if (!p) throw new Error(`spriteBaker: unknown part palette '${ref.palette}'`);
    return p;
  }
  if (ref.color != null) return derivePalette(ref.color, ref.accent != null ? { accent: ref.accent } : {});
  return null;
}

// grid = 2D array of color ints or null (transparent).
function paintGrid(scene, texKey, grid) {
  const g = scene.add.graphics();
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c == null) continue;
      g.fillStyle(c, 1);
      g.fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture(texKey, grid[0].length, grid.length);
  g.destroy();
}

// Paint every frame to its own texture, register one anim per `${key}-${animName}`,
// and register the base texture spriteKey(key) = idle-down frame 0.
function paintForged(scene, key, out) {
  for (const [animName, frames] of Object.entries(out.anims)) {
    const frameKeys = [];
    for (let i = 0; i < frames.length; i++) {
      const tkey = frameKey(key, animName, i);
      paintGrid(scene, tkey, frames[i]);
      frameKeys.push({ key: tkey });
    }
    const animKey = `${key}-${animName}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: animName.startsWith('attack') ? 0 : -1, // attacks play once
      });
    }
  }
  paintGrid(scene, spriteKey(key), out.anims['idle-down'][0]);
}

// Forge one recipe into its textures + anims.
function bakeOne(scene, key) {
  const recipe = RECIPES[key];
  // Per-creature color: explicit recipe.baseColor (projectiles) > enemy def color > caster fallback.
  const baseColor = recipe.baseColor ?? ENEMY_TYPES[key]?.color ?? COLORS.caster;
  const palette = paletteFor(key, baseColor);
  const out = forge(recipe, PARTS, palette, (ref) => resolvePartPalette(ref));
  if (recipe.flip) mirrorFrames(out);
  paintForged(scene, key, out);
}

const nextFrame = (scene) => new Promise((resolve) => scene.time.delayedCall(0, resolve));

// Forge `keys` (those with a recipe, not already forged), chunked across frames.
export async function bakeSprites(scene, keys, { chunkSize = 4, onProgress } = {}) {
  const todo = [...new Set(keys)].filter((k) => RECIPES[k] && !scene.textures.exists(spriteKey(k)));
  for (let i = 0; i < todo.length; i++) {
    bakeOne(scene, todo[i]);
    if (onProgress) onProgress(i + 1, todo.length);
    if ((i + 1) % chunkSize === 0 && i + 1 < todo.length) await nextFrame(scene);
  }
}
```

- [ ] **Step 2: Refactor `BootScene` to delegate to `bakeSprites` (still forging all)**

Replace `src/scenes/BootScene.js` entirely with the slimmed version. It keeps the geometric primitives and now forges **all** recipes via `bakeSprites`, then starts Menu when done:

```js
// src/scenes/BootScene.js
import { COLORS, TEX } from '../config.js';
import { RECIPES } from '../data/sprites/recipes.js';
import { bakeSprites } from './spriteBaker.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    // Geometric primitives (the original circle/diamond fallbacks).
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

    // Forge every sprite, then enter the menu. (Task 4 narrows this to CORE.)
    bakeSprites(this, Object.keys(RECIPES)).then(() => this.scene.start('Menu'));
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

- [ ] **Step 3: Verify the suite still passes**

Run: `node --test`
Expected: all green (pure logic unaffected).

- [ ] **Step 4: Manually verify the game still boots with all sprites**

Run: `python3 -m http.server 8000` and open `http://localhost:8000` in a portrait mobile viewport (device toolbar).
Expected:
- The menu appears (after the same ~3.5 s as before — this task does not speed up boot yet).
- No console errors; no "missing texture" green boxes.
- Enter Fire level 1 and confirm enemies render as sprites (not geometric).

- [ ] **Step 5: Commit**

```bash
git add src/scenes/spriteBaker.js src/scenes/BootScene.js
git commit -m "refactor(perf): extract chunked bakeSprites helper from BootScene

Behavior-preserving: BootScene still forges all sprites, now via the reusable
idempotent bakeSprites(scene, keys) (skips existing textures/anims, yields
every chunkSize recipes). Enables on-demand forging in later tasks.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: IntroScene + flow wiring (forge path goes live, still redundant)

Add the `IntroScene`, register it, route the 4 elemental portals through it, and move world lore onto the region object. After this task the on-demand forge **runs** but is a no-op (BootScene still forges everything at boot, so `bakeSprites` finds all textures present). The game must work end-to-end with the new intro screen.

**Files:**
- Create: `src/scenes/IntroScene.js`
- Modify: `src/main.js`, `src/scenes/MapScene.js`, `src/data/regions.js`, `src/i18n/locales/es.js`, `src/i18n/locales/en.js`

**Interfaces:**
- Consumes: `regionSpriteKeys` (Task 1), `bakeSprites` (Task 2), `REGIONS`, `t`.
- Produces: scene key `'Intro'`, started with `{ regionId }`; advances to `Branch` with the same `{ regionId }`. `region.intro` (array of `{speaker, text}` i18n keys) is now a public field on elemental regions.

- [ ] **Step 1: Add the two i18n strings**

In `src/i18n/locales/es.js`, line 3, replace:

```js
  ui: { tap: '▶ tap' },
```
with:
```js
  ui: { tap: '▶ tap', continue: 'Continuar', loading: 'Forjando…' },
```

In `src/i18n/locales/en.js`, line 3, replace:

```js
  ui: { tap: '▶ tap' },
```
with:
```js
  ui: { tap: '▶ tap', continue: 'Continue', loading: 'Forging…' },
```

- [ ] **Step 2: Expose `intro` on the region and drop the level-1 onEnter intro**

In `src/data/regions.js`, inside `makeBranch`, find the level-1 builder:

```js
    makeLevel(`${id}_1`, id, 'basic', { waves: basic(1), dialogue: { onEnter: intro } }),
```
replace with:
```js
    makeLevel(`${id}_1`, id, 'basic', { waves: basic(1) }),
```

Then find the `makeBranch` return:

```js
  return { id, element, name, grantsSkill, locked: false, levels };
```
replace with:
```js
  return { id, element, name, grantsSkill, locked: false, levels, intro };
```

(Leave `makeCastle` untouched — the castle keeps its own `castle_1` onEnter narrative and does not use IntroScene.)

- [ ] **Step 3: Create `IntroScene`**

Create `src/scenes/IntroScene.js`:

```js
// src/scenes/IntroScene.js
// Per-world entry screen: shows the region's lore while forging that world's
// sprite set in the background (chunked). On "Continuar": if the forge is done,
// go to Branch; otherwise show a loading bar and advance when it finishes.
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { t } from '../i18n/index.js';
import { REGIONS } from '../data/regions.js';
import { regionSpriteKeys } from '../data/spriteManifest.js';
import { bakeSprites } from './spriteBaker.js';

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  init(data) { this.regionId = data.regionId; }

  create() {
    const region = REGIONS[this.regionId];
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 70, t(region.name), {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd54f', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    const lore = (region.intro || []).map((l) => t(l.text)).join('\n\n');
    this.add.text(GAME_WIDTH / 2, 140, lore, {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff',
      align: 'center', wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 6,
    }).setOrigin(0.5, 0);

    this.btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 90, 220, 56, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.btnLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, t('ui.continue'), {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    this.barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 44, 220, 8, 0x333333).setVisible(false);
    this.barFill = this.add.rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 44, 0, 8, 0x66bb6a)
      .setOrigin(0, 0.5).setVisible(false);

    this.baked = false;
    this.progress = { done: 0, total: 1 };
    this.bakePromise = bakeSprites(this, [...regionSpriteKeys(region)], {
      onProgress: (done, total) => { this.progress = { done, total }; },
    }).then(() => { this.baked = true; });

    this.btn.on('pointerdown', () => this.proceed());
  }

  proceed() {
    if (this.baked) { this.go(); return; }
    // Forge still running: reveal the loading bar and advance when it resolves.
    this.btn.disableInteractive();
    this.btnLabel.setText(t('ui.loading'));
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.bakePromise.then(() => this.go());
  }

  go() { this.scene.start('Branch', { regionId: this.regionId }); }

  update() {
    if (this.barFill.visible) {
      const p = this.progress.total ? this.progress.done / this.progress.total : 1;
      this.barFill.width = 220 * p;
    }
  }
}
```

- [ ] **Step 4: Register `IntroScene` in `main.js`**

In `src/main.js`, add the import after the other scene imports:

```js
import IntroScene from './scenes/IntroScene.js';
```

Then add `IntroScene` to the `scene` array (place it right after `MenuScene`):

```js
  scene: [BootScene, MenuScene, IntroScene, GameScene, MapScene, BranchScene, UIScene, DialogueScene, SkillTreeScene, ShopScene, PauseScene, GameOverScene],
```

- [ ] **Step 5: Route elemental portals through `IntroScene`**

In `src/scenes/MapScene.js`, find the elemental portal line (line 33):

```js
      this.portal(x, y, t(region.name), PORTAL_ICON[id], complete, true, () => this.scene.start('Branch', { regionId: id }));
```
replace with:
```js
      this.portal(x, y, t(region.name), PORTAL_ICON[id], complete, true, () => this.scene.start('Intro', { regionId: id }));
```

(Leave the castle portal at line 38–39 unchanged — it stays `scene.start('Branch', { regionId: CASTLE_ID })`.)

- [ ] **Step 6: Verify the suite still passes**

Run: `node --test`
Expected: all green.

- [ ] **Step 7: Manually verify the new flow**

Run: `python3 -m http.server 8000`, open in a portrait mobile viewport.
Expected:
- Menu → Map. Tap the **Fire** portal → the **IntroScene** appears with the fire title + lore text + a "Continuar" button.
- Tap "Continuar" → goes to the Fire **Branch** (level list). Since boot already forged everything, this is instant (no loading bar).
- Enter Fire level 1 → no lore dialogue plays at combat start anymore (it moved to the intro); enemies render correctly.
- Tap the **Castle** portal (if unlocked, else skip) → goes straight to Branch, no intro.
- No console errors, no missing textures.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/IntroScene.js src/main.js src/scenes/MapScene.js src/data/regions.js src/i18n/locales/es.js src/i18n/locales/en.js
git commit -m "feat(perf): IntroScene masks per-world forge; route elemental portals through it

World lore moves from level-1 onEnter to a per-world IntroScene that forges the
region's sprite set (chunked) with a loading-bar fallback. Castle unaffected.
Forge is still redundant here (boot forges all) — Task 4 flips boot to CORE.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: BootScene forges CORE only (the payoff)

Flip `BootScene` from forging all 129 recipes to forging only `CORE_SPRITE_KEYS`. Now the menu appears fast and each world forges on first entry behind its intro.

**Files:**
- Modify: `src/scenes/BootScene.js`

**Interfaces:**
- Consumes: `CORE_SPRITE_KEYS` (Task 1), `bakeSprites` (Task 2).

- [ ] **Step 1: Change the boot forge set to CORE**

In `src/scenes/BootScene.js`, update the imports — replace:

```js
import { RECIPES } from '../data/sprites/recipes.js';
```
with:
```js
import { CORE_SPRITE_KEYS } from '../data/spriteManifest.js';
```

Then in `create()`, replace:

```js
    bakeSprites(this, Object.keys(RECIPES)).then(() => this.scene.start('Menu'));
```
with:
```js
    bakeSprites(this, CORE_SPRITE_KEYS).then(() => this.scene.start('Menu'));
```

- [ ] **Step 2: Verify the suite still passes**

Run: `node --test`
Expected: all green.

- [ ] **Step 3: Manually verify fast boot + on-demand forge + revisit**

Run: `python3 -m http.server 8000`, portrait mobile viewport.
Expected:
- **Boot to menu is now near-instant** (sub-second on desktop), not ~3.5 s.
- Tap **Fire** portal → intro appears instantly; reading at a normal pace, "Continuar" works with no visible loading bar.
- **Skip-read test:** tap "Continuar" immediately → the loading bar appears briefly, fills, then advances to Branch.
- Play Fire level 1 → all fire enemies/bosses render as sprites (no missing-texture boxes).
- **Revisit test:** back to Map → tap Fire again → intro appears, "Continuar" is instant (sprites cached).
- Repeat the portal test for **Water** (verify Dama del Lago forms render on her temple fight — though that's level 8; at minimum confirm water enemies render), **Air** (Galahad — confirm air enemies render; if reachable, confirm Galahad's death corpse sprite appears, not a green box), and **Earth** (confirm Cefalo's feline transform renders at nv5).
- No console errors anywhere.

- [ ] **Step 4: Measure the boot win (optional but recommended)**

In the browser devtools console on the loaded page, run:
```js
performance.getEntriesByType('navigation')[0].domInteractive
```
and confirm the menu is interactive well under 1 s (vs the prior ~3.5 s). Note the number in the commit body if you capture it.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.js
git commit -m "feat(perf): BootScene forges only CORE; worlds forge on demand

Boot drops from forging all 129 sprites (~3.5s) to the small CORE set
(hero, generic humans, projectiles, tentacle). Each world's set forges on
first entry behind its IntroScene, cached for the session.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Diagnóstico/objetivo (boot < 600 ms, forja enmascarada, revisita instantánea) → Task 4 verification steps.
- Pieza 1 (manifiesto puro) → Task 1 (+ shapeshifter `forms` & `extraSprites`, beyond the spec's prose — a correctness gap found during planning).
- Pieza 2 (bakeSprites troceado idempotente) → Task 2.
- Pieza 3 (IntroScene + lore + loading fallback) → Task 3.
- Flujo: 4 portales elementales → Intro; castillo directo → Task 3 Step 5.
- `region.intro` reubicado desde level-1 onEnter → Task 3 Step 2.
- Pruebas puras del manifiesto (incluye/excluye, castle ⊆ core, transitivos) → Task 1 Step 1.
- Out-of-scope items (background idle, eviction, workers, per-level) → not implemented, as specified.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to". Every code step shows full code; every command shows expected output.

**Type consistency:** `bakeSprites(scene, keys, {chunkSize, onProgress})`, `regionSpriteKeys(region) -> Set`, `CORE_SPRITE_KEYS: string[]`, scene key `'Intro'` with `{regionId}` are used identically across Tasks 1–4. `region.intro` produced in Task 3 Step 2 is consumed by IntroScene in Task 3 Step 3.

**New correctness coverage beyond the spec:** shapeshifter boss forms (Dama/Galahad/Cefalo) and Galahad's runtime corpse swap are referenced by `setTexture` with literal keys the phase/summon graph would miss; Task 1 handles them via `forms[]` traversal + the `extraSprites` declaration, with a dedicated test. The `tentacle` hazard sprite (referenced directly by GameScene) is in CORE.
