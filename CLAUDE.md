# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**The Caster** — a mobile-only, portrait top-down "survivor"/twin-stick game built with Phaser 3. A player controls an orphaned sorceress avenging her parents: she moves via a virtual joystick, auto-fires orbs at the nearest enemy, unlocks Fireball at a fire temple, fights waves → miniboss → temple → boss, then spends earned skill points in a persistent skill tree. All UI text and the design docs are in Spanish.

The repo root is `the-caster/`. (The parent `phaser/` directory only holds `.claude/`.)

## Hard constraints (do not violate)

These are fixed design decisions from `docs/superpowers/specs/2026-06-09-the-caster-design.md`:

- **No build step, no Vite, no npm bundler.** Native ES modules + Phaser 3 loaded from CDN (`index.html`). Do not add a bundler or import npm packages into the game runtime unless a concrete wall is hit (and that decision is documented first).
- **Mobile-only, portrait.** Logical resolution is fixed at 480×854 (`src/config.js`); the Scale Manager FITs it to the device. Test in a mobile viewport / device toolbar.
- **Minimal HTML, essential CSS only.** Everything else lives in Phaser.
- **No server.** All persistence is `localStorage`.
- **Geometric art first.** Textures are generated procedurally in `BootScene` (circles/diamonds). The plan is to swap to sprite atlases later *without touching logic* — that's why texture keys are centralized in `config.js` `TEX` and never inlined.

## Commands

```bash
# Run the game (from the-caster/)
python3 -m http.server 8000   # then open http://localhost:8000 in a portrait mobile viewport

# Tests (Phaser-free logic only)
node --test                   # runs all tests in tests/
node --test tests/SaveSystem.test.js   # run a single test file
```

There is no lint/build step. `npm test` aliases `node --test`.

## Architecture

### The Phaser / pure-logic split (most important convention)

Game logic that can be unit-tested is deliberately kept **free of any Phaser dependency** so it runs under `node --test`. Tests only exist for these modules.

- **Pure logic (no Phaser import):** `src/systems/` — `SaveSystem`, `SkillTree`, `CombatSystem`, `WaveRunner`, `EnemyBrain`. Also `src/data/`.
- **Phaser-coupled:** everything in `src/scenes/` and `src/objects/`, plus `ProjectilePool` and `InputSystem` (these extend or wrap Phaser).

When adding logic, push the decision-making (damage math, phase transitions, purchase rules, save shape) into a pure `systems/` module and have the scene call it. Example: `GameScene` computes nothing about damage itself — it calls `applyDamage()` from `CombatSystem`.

### Data-driven content

Content is declarative in `src/data/` and consumed by scenes:
- `regions.js` — the campaign: `REGIONS` keyed by id (`fire`/`water`/`air`/`earth`/`castle`), built by `makeBranch`/`makeCastle`. A region has `element`, `grantsSkill`, and an array of `levels`. A level is built by `makeLevel` (`data/levelBuilder.js`) from a `kind` preset (`basic`/`intermediate`/`pretemple`/`temple`) into an ordered `phases` array. `REGION_ORDER`, `CASTLE_ID`, `REQUIRED_ELEMENTS` drive the map and gating.
- `enemies.js` — enemy defs keyed by type, expressed as **recipes**: `movement` (1 piece) + `attacks` (0..N) + `modifiers` (0..N). The pure `systems/EnemyBrain.js` owns the component libraries (`MOVEMENTS`, `stepAttack`, `buildProjectiles`); `Enemy.think(delta, target)` calls the brain and returns an intent `{velocity, fires}` that `GameScene` executes (sets velocity, spawns projectiles via `executeAttack`). Push new enemy/attack behavior into `EnemyBrain` (testable), never into the scene.
- `skilltree.js` — `SKILL_TREE` nodes (`cost`, `requires` prereq ids, `effect: { stat, add }`; `add` may be negative, e.g. faster `shotRate`) plus `SKILL_BRANCHES` (tabs → tracks → ordered node ids) that drives the tabbed skill-tree UI and elemental gating (`isBranchUnlocked`).
- `stats.js` — `BASE_STATS` (time fields in ms; lower is better) and `STAT_FLOORS` (clamps so reductions can't break the game).

### Scene flow

`Boot → Menu → Map (portals) → Branch (level path) → Game (+ UI overlay)`, with `Dialogue` as a pause-overlay and `SkillTree` reachable from `Map`. `WaveRunner` is now a generic sequencer over `level.phases`; `GameScene.beginPhase()` branches on `phase.type` (`wave`/`miniboss`/`levelBoss`/`templeBoss`). `Campaign` (pure) owns unlock/progress; `Difficulty` (pure) scales enemies by skill points spent + elements mastered; temple bosses run `BossMechanics`. Registered in `src/main.js`.

- **GameScene** is the orchestrator. It owns the run loop, spawns entities, wires Arcade physics colliders/overlaps, and drives phases via a `WaveRunner`. `WaveRunner` is pure state over `level.phases`; `GameScene.beginPhase()` reacts to the current phase type and `checkPhaseCleared()` / overlaps call `runner.onCleared()` to advance.
- **UIScene** runs as a parallel overlay (`scene.launch('UI', { gameScene })`), holding a reference to GameScene to read HP and trigger the Fireball cast.
- **DialogueScene** is launched over a **paused** GameScene with `{ lines, onDone }`. Because Game is paused during dialogue, input handlers must guard against firing — e.g. UIScene's fireball button checks `scene.isActive('Game')` so a dialogue-advance tap doesn't also cast.
- **Death** restarts only the current level (`scene.start('Game', { regionId, levelIndex, stats })`); progress is preserved. **Level completion** writes rewards via `Campaign.grantClear` and returns to `Branch`.

### Stats & progression pipeline

`save (localStorage) → SkillTree.getStats(save) → stats object → Caster + GameScene`. The skill tree mutates the save; `getStats` derives a flat stats object from `BASE_STATS` + purchased node effects (clamped by `STAT_FLOORS`). GameScene/Caster only ever read the resolved `stats` object, never the save directly during play.

### Projectiles

`ProjectilePool` is a recycled Arcade physics group (`maxSize: 200`) used for both player orbs and enemy shots. `fire()` reactivates a dead body; `cullOffscreen()` (called from `GameScene.update`) recycles ones that leave bounds. A projectile with `aoeRadius > 0` explodes on impact (fireball) — see `GameScene.explode()`.

## Conventions

- Texture/color keys are centralized in `config.js` (`TEX`, `COLORS`) — reference them, never hard-code a key string or hex color in scenes/objects.
- Tests use `node:test` + `node:assert/strict`. For storage-dependent logic, inject a fake (`SaveSystem` takes a `storage` implementing `getItem/setItem/removeItem`) rather than touching real `localStorage`.
- Design and implementation-plan docs live in `docs/superpowers/`. The plan doc's Task 6.2 has the GitHub Pages deploy steps (static files from repo root).
