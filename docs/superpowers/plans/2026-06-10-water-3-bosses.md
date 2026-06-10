# Water Bosses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the five Water-world boss fights as concrete data in `src/data/bosses/water.js`, extend `makeBranch` to support a single custom levelboss, wire the bosses into `REGIONS.water`, and cover everything with `node:test` assertions.

**Architecture:** Boss defs live in `src/data/bosses/water.js` as pure ES-module exports (same style as `fire.js`), consumed by `regions.js` which calls `makeBranch`; `makeBranch` is extended with an optional `levelBoss` override parameter so Water can pass the Kraken as a single levelboss (today `makeBranch` only supports the trio array via `levelBosses` or the generic blob fallback). All tests are pure `node:test` with no Phaser dependency.

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN), node:test for pure logic.

**Spec:** docs/superpowers/specs/2026-06-10-water-world-design.md
**Depends on:** Plan 1 (engine: burrow, whirlpool, form sequencer, resist) and Plan 2 (roster).

---

## Overview of tasks

| # | Task | File(s) touched |
|---|------|-----------------|
| 1 | Boss defs | `src/data/bosses/water.js` (new) |
| 2 | Extend `makeBranch` | `src/data/regions.js` |
| 3 | Wire `REGIONS.water` | `src/data/regions.js` |
| 4 | Tests | `tests/regions.test.js` + `tests/bosses.water.test.js` (new) |

---

### Task 1 — `src/data/bosses/water.js`

**Files:** `src/data/bosses/water.js` (create)

Create the file from scratch. No Phaser import; imports only `{ COLORS, TEX }` from `../../config.js`, exactly as `fire.js` does. Each export is a named const. Stats are starting values — tuned in playtest (see spec §4, "Vida exacta se afina en playtest").

#### Notes on new mechanics referenced in sequences (provided by Plan 1)

- `enter: ['spawnWhirlpool']` — BossBrain hook; GameScene calls `WhirlpoolHazard.spawn()`. Same pattern as `enter: ['spawnLavaFloor']` in IGNATIUS.
- `{ do: 'dashStrike', ... }` — melee burst, fires at close range; Plan 1 adds this to `stepAttack`.
- `{ do: 'summon', spawnType: 'huevo_sapo', ... }` — reuses the existing `summon` step; GameScene spawns the egg which then runs the generational timer chain (Plan 1 + Plan 2).
- `movement: { type: 'burrow', ... }` — Plan 1's new EnemyBrain movement; params mirror the spec timing.
- `forms: [...]` — Plan 1's FormSequencer extension of BossBrain; each array element is a complete creature def.
- `resist` field on a form def — Plan 1's damage-reduction scalar (0..1; 0 = no reduction).

---

- [ ] **Step 1.1** — Create `src/data/bosses/water.js` with the import header and all five exports. Full content below (copy verbatim; adjust inline comments to taste):

```js
import { COLORS, TEX } from '../../config.js';

// Water-world boss definitions. Stats are pre-scale starting values; GameScene
// applies scaleEnemyDef(def, mult). All bosses flagged elite: true.
// Stat ballpark (from spec §4): miniboss hp 300-520, levelboss ~650,
// templeboss distributed across forms. Tuned in playtest.

// ─── nv4 MINIBOSS ────────────────────────────────────────────────────────────
// Soldado de Hielo — bruiser. Frontal shield + onHitSlow. Read the charge,
// punish the recovery; slow-on-hit makes repositioning expensive.
export const SOLDADO_HIELO = {
  key: 'soldado_hielo', tex: TEX.miniboss, color: COLORS.ice,
  hp: 380, speed: 75, damage: 16, radius: 24,
  elite: true,
  movement: { type: 'charge', windup: 700, dash: 440, recover: 800, dashMul: 2.8 },
  modifiers: [
    { type: 'shielded', reduce: 0.35 },
    { type: 'onHitSlow', factor: 0.6, ms: 1200, floor: 0.45 },
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 700 },                                              // charge windup (movement handles the dash)
      { do: 'dashStrike', damage: 18, range: 60, telegraph: 300, dur: 400 }, // lands onHitSlow via modifier
      { do: 'wait', dur: 800 },                                              // recover (vulnerable window)
      { do: 'shootStraight', speed: 250, damage: 12, telegraph: 280, dur: 600 },
    ] },
    { from: 0.5, speedMul: 1.25, sequence: [
      { do: 'wait', dur: 500 },
      { do: 'dashStrike', damage: 18, range: 60, telegraph: 240, dur: 350 },
      { do: 'wait', dur: 400 },
      { do: 'dashStrike', damage: 18, range: 60, telegraph: 240, dur: 350 }, // double charge
      { do: 'wait', dur: 700 },                                              // recover
      { do: 'shootStraight', speed: 270, damage: 13, telegraph: 250, dur: 550 },
    ] },
  ],
};

// ─── nv5 MINIBOSS ────────────────────────────────────────────────────────────
// Sapo Desovador — summoner/anti-turtle. Generational egg chain punishes
// passivity. Kill eggs before they mature; CONCURRENCY_CAP (16) is the ceiling.
export const SAPO_DESOVADOR = {
  key: 'sapo_desovador', tex: TEX.miniboss, color: COLORS.poison,
  hp: 440, speed: 60, damage: 14, radius: 26,
  elite: true,
  movement: { type: 'strafe', range: 280, strafeSpeed: 55 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'huevo_sapo', count: 1, telegraph: 400, dur: 800 }, // lays one egg
      { do: 'shootStraight', speed: 220, damage: 12, telegraph: 300, dur: 600 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnType: 'huevo_sapo', count: 2, telegraph: 350, dur: 700 }, // two eggs per cycle
      { do: 'shootSpread', count: 5, arc: 70, speed: 230, damage: 11, telegraph: 320, dur: 650 },
      { do: 'wait', dur: 400 },
    ] },
  ],
};

// ─── nv6 MINIBOSS ────────────────────────────────────────────────────────────
// Tiburón Abisal — ambush tank. Burrow movement (Plan 1): submerge → reposition
// → emerge (telegraphed ring) → dashStrike → vulnerable. Read the fin, punish
// the recovery.
export const TIBURON_ABISAL = {
  key: 'tiburon_abisal', tex: TEX.miniboss, color: COLORS.caster,
  hp: 520, speed: 85, damage: 18, radius: 28,
  elite: true,
  movement: { type: 'burrow', submergeMs: 1600, repositionMs: 400, emergeMs: 400, recoverMs: 700, dashMul: 3.2 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 400, dur: 450 }, // telegraphed by emerge ring
      { do: 'wait', dur: 700 },                                               // recover (vulnerable)
    ] },
    { from: 0.4, speedMul: 1.3, sequence: [
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 280, dur: 380 }, // frenzy: shorter submerge + faster emerge
      { do: 'wait', dur: 400 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 280, dur: 380 }, // double strike
      { do: 'wait', dur: 500 },
    ] },
  ],
};

// ─── nv7 LEVELBOSS ───────────────────────────────────────────────────────────
// El Kraken — whirlpool setpiece. Anchored, slow, massive. Three phases:
// p1 tentacle barrages; p2 maelstrom (spawnWhirlpool) + tentacles;
// p3 frenzy (stronger pull, faster tentacles, summons adds).
// The whirlpool is handled by GameScene + WhirlpoolHazard (Plan 1).
export const KRAKEN = {
  key: 'kraken', tex: TEX.boss, color: COLORS.miniboss,
  hp: 650, speed: 28, damage: 20, radius: 42,
  elite: true,
  movement: { type: 'static' }, // anchored — the whirlpool and tentacles do the work
  phases: [
    { from: 1.0, sequence: [
      { do: 'lobAoe', radius: 70, dps: 20, duration: 3000, telegraph: 500, dur: 900 }, // tentacle at player pos
      { do: 'lobAoe', radius: 55, dps: 18, duration: 2500, telegraph: 500, dur: 900 }, // perimeter tentacle
      { do: 'nova', count: 10, speed: 200, damage: 12, telegraph: 380, dur: 700 },     // ink burst
      { do: 'wait', dur: 600 },
    ] },
    { from: 0.6, enter: ['spawnWhirlpool'], sequence: [
      { do: 'lobAoe', radius: 70, dps: 22, duration: 3200, telegraph: 450, dur: 850 }, // tentacle at player
      { do: 'lobAoe', radius: 55, dps: 20, duration: 2800, telegraph: 450, dur: 850 }, // perimeter tentacle
      { do: 'lobAoe', radius: 55, dps: 20, duration: 2800, telegraph: 450, dur: 850 }, // second perimeter
      { do: 'nova', count: 12, speed: 210, damage: 12, telegraph: 350, dur: 650 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.3, speedMul: 1.1, enter: ['spawnWhirlpool'], sequence: [
      { do: 'lobAoe', radius: 75, dps: 26, duration: 3500, telegraph: 380, dur: 750 }, // faster tentacles
      { do: 'lobAoe', radius: 60, dps: 22, duration: 3000, telegraph: 380, dur: 750 },
      { do: 'summon', spawnType: 'anguila', count: 2, telegraph: 300, dur: 700 },      // adds
      { do: 'nova', count: 14, speed: 220, damage: 13, telegraph: 320, dur: 600 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};

// ─── nv8 TEMPLEBOSS ──────────────────────────────────────────────────────────
// La Dama del Lago — cambiaformas. Five forms; each is a complete creature def
// with its own hp/resist/movement/sequence run by the FormSequencer (Plan 1).
// One HP bar per form; hp replenishes fully on transformation; resist climbs.
// Transformation: ~1000 ms telegraph + brief invulnerability + re-tint/re-tex.
// Clearing the ballena form reverts to maga_final (~20 hp, minimal kit);
// maga_final's death fires onClear (the closing dialogue in regions.js).
// All forms carry elite: true; FormSequencer enforces CC immunity.
//
// HP per form (starting values, tuned in playtest):
//   maga=340  tiburon=460  kraken=580  ballena=720  maga_final=20
//
// resist per form (0 = no reduction, 1 = immune):
//   maga=0  tiburon=0.10  kraken=0.20  ballena=0.30  maga_final=0

const DAMA_MAGA = {
  key: 'dama_maga', tex: TEX.boss, color: COLORS.ice,
  hp: 340, speed: 70, damage: 14, radius: 26, resist: 0,
  elite: true,
  movement: { type: 'kite', range: 240 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 5, arc: 80, speed: 230, damage: 12, telegraph: 320, dur: 700 }, // frost spray
      { do: 'shootHoming', speed: 130, damage: 11, telegraph: 380, dur: 900 },                    // tracking shard
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'shootSpread', count: 7, arc: 100, speed: 250, damage: 13, telegraph: 280, dur: 600 },
      { do: 'shootHoming', speed: 150, damage: 12, telegraph: 320, dur: 800 },
      { do: 'nova', count: 8, speed: 200, damage: 10, telegraph: 350, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

const DAMA_TIBURON = {
  key: 'dama_tiburon', tex: TEX.boss, color: COLORS.caster,
  hp: 460, speed: 90, damage: 20, radius: 28, resist: 0.10,
  elite: true,
  movement: { type: 'burrow', submergeMs: 1400, repositionMs: 350, emergeMs: 400, recoverMs: 600, dashMul: 3.0 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 22, range: 65, telegraph: 400, dur: 420 },
      { do: 'wait', dur: 700 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'dashStrike', damage: 22, range: 65, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 400 },
      { do: 'dashStrike', damage: 22, range: 65, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
    ] },
  ],
};

const DAMA_KRAKEN = {
  key: 'dama_kraken', tex: TEX.boss, color: COLORS.miniboss,
  hp: 580, speed: 30, damage: 18, radius: 38, resist: 0.20,
  elite: true,
  movement: { type: 'static' },
  phases: [
    { from: 1.0, enter: ['spawnWhirlpool'], sequence: [
      { do: 'lobAoe', radius: 68, dps: 22, duration: 3000, telegraph: 480, dur: 880 },
      { do: 'lobAoe', radius: 55, dps: 20, duration: 2600, telegraph: 480, dur: 880 },
      { do: 'nova', count: 10, speed: 205, damage: 12, telegraph: 360, dur: 680 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.5, speedMul: 1.05, enter: ['spawnWhirlpool'], sequence: [
      { do: 'lobAoe', radius: 72, dps: 26, duration: 3200, telegraph: 400, dur: 800 },
      { do: 'lobAoe', radius: 60, dps: 22, duration: 2800, telegraph: 400, dur: 800 },
      { do: 'lobAoe', radius: 60, dps: 22, duration: 2800, telegraph: 400, dur: 800 },
      { do: 'nova', count: 12, speed: 215, damage: 13, telegraph: 320, dur: 620 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};

const DAMA_BALLENA = {
  key: 'dama_ballena', tex: TEX.boss, color: COLORS.boss,
  hp: 720, speed: 22, damage: 24, radius: 50, resist: 0.30,
  elite: true,
  movement: { type: 'chase' }, // slow chase — the wall
  phases: [
    { from: 1.0, sequence: [
      { do: 'lobAoe', radius: 90, dps: 28, duration: 4000, telegraph: 550, dur: 1000 }, // tidal wave
      { do: 'wait', dur: 600 },
      { do: 'nova', count: 16, speed: 190, damage: 14, telegraph: 420, dur: 800 },      // pressure burst
      { do: 'wait', dur: 700 },
    ] },
    { from: 0.45, speedMul: 1.1, sequence: [
      { do: 'lobAoe', radius: 95, dps: 30, duration: 4200, telegraph: 500, dur: 950 },
      { do: 'summon', spawnType: 'ahogado', count: 3, telegraph: 350, dur: 800 },        // summons drowned adds
      { do: 'nova', count: 18, speed: 200, damage: 15, telegraph: 380, dur: 750 },
      { do: 'wait', dur: 500 },
    ] },
  ],
};

// maga_final: ~20 HP, minimal kit. Death fires onClear (the closing dialogue).
// FormSequencer revert-to-maga on ballena death produces this form.
const DAMA_MAGA_FINAL = {
  key: 'dama_maga_final', tex: TEX.boss, color: COLORS.ice,
  hp: 20, speed: 55, damage: 10, radius: 24, resist: 0,
  elite: true,
  movement: { type: 'flee' },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 3, arc: 60, speed: 200, damage: 8, telegraph: 300, dur: 600 },
      { do: 'wait', dur: 800 },
    ] },
  ],
};

// The Dama's top-level def. FormSequencer (Plan 1) reads `forms` in order;
// each form runs BossBrain phases internally. The outer hp/speed/etc are the
// defaults used before the sequencer is active (first form takes over on init).
export const DAMA_LAGO = {
  key: 'dama_lago', tex: TEX.boss, color: COLORS.ice,
  hp: 340, speed: 70, damage: 14, radius: 26,
  elite: true,
  movement: { type: 'kite', range: 240 },
  forms: [DAMA_MAGA, DAMA_TIBURON, DAMA_KRAKEN, DAMA_BALLENA, DAMA_MAGA_FINAL],
};
```

- [ ] **Step 1.2** — Smoke-test the file standalone (no Phaser, no test runner — just import):

```bash
node --input-type=module <<'EOF'
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO }
  from './src/data/bosses/water.js';
console.log('bosses loaded:', [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO].map(b => b.key));
console.log('DAMA forms:', DAMA_LAGO.forms.length);
EOF
```

Expected output:
```
bosses loaded: [ 'soldado_hielo', 'sapo_desovador', 'tiburon_abisal', 'kraken', 'dama_lago' ]
DAMA forms: 5
```

- [ ] **Step 1.3** — Commit.

```bash
git add src/data/bosses/water.js
git commit -m "feat(water): add 5 boss defs in src/data/bosses/water.js

Soldado de Hielo, Sapo Desovador, Tiburón Abisal, Kraken, Dama del Lago
(forms: maga→tiburon→kraken→ballena→maga_final). Stats are starting
values, tuned in playtest. Depends on Plan 1 engine pieces."
```

---

### Task 2 — Extend `makeBranch` in `regions.js`

**Files:** `src/data/regions.js`

**Problem today:** `makeBranch` builds the nv7 levelboss as:

```js
const levelBossSpec = levelBosses ? { bosses: levelBosses, triangle: true } : { levelBoss: lb(650, 24) };
```

`levelBosses` is the Fire trio (array). There is no way to pass a custom single-boss def for nv7 without falling through to the generic blob. Water needs the Kraken there.

**Solution:** Add an optional `levelBoss` parameter to the destructured options. When present it takes priority over both `levelBosses` (trio) and the default blob. Fire passes `levelBosses: SISTERS_TRIO` (unchanged); Water passes `levelBoss: KRAKEN`.

- [ ] **Step 2.1** — Update the `makeBranch` signature and the `levelBossSpec` derivation. Exact edit (diff style):

In `src/data/regions.js`, change the function signature line from:

```js
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, templeBoss = null }) {
```

to:

```js
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, levelBoss = null, templeBoss = null }) {
```

And change the `levelBossSpec` line from:

```js
  const levelBossSpec = levelBosses ? { bosses: levelBosses, triangle: true } : { levelBoss: lb(650, 24) };
```

to:

```js
  const levelBossSpec = levelBosses
    ? { bosses: levelBosses, triangle: true }
    : levelBoss
      ? { levelBoss }
      : { levelBoss: lb(650, 24) };
```

- [ ] **Step 2.2** — Verify existing tests still pass (Fire regression):

```bash
node --test tests/regions.test.js
```

Expected: all 6 existing tests pass, 0 failures.

- [ ] **Step 2.3** — Commit.

```bash
git add src/data/regions.js
git commit -m "feat(regions): extend makeBranch with optional single levelBoss override

Adds a `levelBoss` param alongside the existing `levelBosses` (trio) path,
so Water can wire the Kraken as a single custom levelboss without touching
Fire's trio logic or the generic blob fallback."
```

---

### Task 3 — Wire `REGIONS.water`

**Files:** `src/data/regions.js`

Add the import for water bosses and update the `REGIONS.water` call to pass the actual bosses.

- [ ] **Step 3.1** — Add import at the top of `src/data/regions.js`, alongside the fire import:

```js
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO } from './bosses/water.js';
```

- [ ] **Step 3.2** — Replace the `REGIONS.water` call. Change from:

```js
  water: makeBranch({
    id: 'water', element: 'water', name: 'El Lago', grantsSkill: 'freeze',
    intro: [{ speaker: 'Narrador', text: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' }],
    mageName: 'Dama del Lago',
    mageLines: [
      'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
      'Pues estas aguas ahora son mías.',
    ],
  }),
```

to:

```js
  water: makeBranch({
    id: 'water', element: 'water', name: 'El Lago', grantsSkill: 'freeze',
    minibosses: [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL],
    levelBoss: KRAKEN,
    templeBoss: DAMA_LAGO,
    intro: [{ speaker: 'Narrador', text: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' }],
    mageName: 'Dama del Lago',
    mageLines: [
      'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
      'Pues estas aguas ahora son mías.',
    ],
  }),
```

Note: `basic`/`inter` wave functions are intentionally not passed yet — water-specific wave content is Plan 2's scope. The generic fallbacks (`basicWaves`/`interWaves`) remain until Plan 2 provides `waterWaves`/`waterInterWaves`.

- [ ] **Step 3.3** — Run existing tests; all must pass:

```bash
node --test tests/regions.test.js
```

Expected: 6 tests pass. (The "all bosses flagged elite" test will now also check the water minibosses since it iterates `REGION_ORDER`.)

- [ ] **Step 3.4** — Commit.

```bash
git add src/data/regions.js
git commit -m "feat(water): wire 5 water bosses into REGIONS.water

Passes SOLDADO_HIELO/SAPO_DESOVADOR/TIBURON_ABISAL as minibosses,
KRAKEN as the single nv7 levelboss, DAMA_LAGO as the temple boss.
Preserves existing water narrative (intro/mageLines). Wave content
remains generic until Plan 2 provides water-specific waves."
```

---

### Task 4 — Tests

**Files:**
- `tests/regions.test.js` (extend)
- `tests/bosses.water.test.js` (create)

#### 4A — `tests/bosses.water.test.js` (new file)

Sanity checks on the boss defs themselves (pure data, no regions wiring). These tests run purely on the exported objects.

- [ ] **Step 4.1** — Create `tests/bosses.water.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO }
  from '../src/data/bosses/water.js';

const MINIBOSSES = [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL];

test('all water bosses are flagged elite', () => {
  for (const b of [...MINIBOSSES, KRAKEN, DAMA_LAGO]) {
    assert.equal(b.elite, true, `${b.key} must be elite`);
  }
});

test('all water bosses have at least one phase', () => {
  for (const b of [...MINIBOSSES, KRAKEN]) {
    assert.ok(Array.isArray(b.phases) && b.phases.length >= 1, `${b.key} has phases`);
  }
});

test('minibosses each have exactly 2 phases', () => {
  for (const b of MINIBOSSES) {
    assert.equal(b.phases.length, 2, `${b.key} should have 2 phases`);
  }
});

test('Kraken has 3 phases; phase 2 and 3 enter spawnWhirlpool', () => {
  assert.equal(KRAKEN.phases.length, 3);
  assert.ok(KRAKEN.phases[1].enter?.includes('spawnWhirlpool'), 'Kraken p2 enters whirlpool');
  assert.ok(KRAKEN.phases[2].enter?.includes('spawnWhirlpool'), 'Kraken p3 enters whirlpool');
});

test('Kraken phase thresholds: 1.0, 0.6, 0.3 (descending)', () => {
  const froms = KRAKEN.phases.map((p) => p.from);
  assert.deepEqual(froms, [1.0, 0.6, 0.3]);
});

test('Dama has a forms array of length 5', () => {
  assert.ok(Array.isArray(DAMA_LAGO.forms));
  assert.equal(DAMA_LAGO.forms.length, 5);
});

test('all Dama forms are flagged elite', () => {
  for (const f of DAMA_LAGO.forms) {
    assert.equal(f.elite, true, `${f.key} form must be elite`);
  }
});

test('Dama forms have ascending hp across the first four forms', () => {
  const hps = DAMA_LAGO.forms.slice(0, 4).map((f) => f.hp);
  for (let i = 1; i < hps.length; i++) {
    assert.ok(hps[i] > hps[i - 1], `form[${i}].hp (${hps[i]}) should exceed form[${i-1}].hp (${hps[i-1]})`);
  }
});

test('Dama forms have non-decreasing resist across the first four forms', () => {
  const resists = DAMA_LAGO.forms.slice(0, 4).map((f) => f.resist ?? 0);
  for (let i = 1; i < resists.length; i++) {
    assert.ok(resists[i] >= resists[i - 1], `form[${i}].resist should be >= form[${i-1}].resist`);
  }
});

test('last Dama form is maga_final with low hp', () => {
  const last = DAMA_LAGO.forms.at(-1);
  assert.equal(last.key, 'dama_maga_final');
  assert.ok(last.hp <= 20, `maga_final hp should be ≤ 20, got ${last.hp}`);
});

test('Dama form keys in order: maga, tiburon, kraken, ballena, maga_final', () => {
  const keys = DAMA_LAGO.forms.map((f) => f.key);
  assert.deepEqual(keys, ['dama_maga', 'dama_tiburon', 'dama_kraken', 'dama_ballena', 'dama_maga_final']);
});

test('SOLDADO_HIELO has shielded and onHitSlow modifiers', () => {
  const types = SOLDADO_HIELO.modifiers.map((m) => m.type);
  assert.ok(types.includes('shielded'), 'soldado has shielded');
  assert.ok(types.includes('onHitSlow'), 'soldado has onHitSlow');
});

test('SOLDADO_HIELO onHitSlow has the correct floor', () => {
  const slow = SOLDADO_HIELO.modifiers.find((m) => m.type === 'onHitSlow');
  assert.equal(slow.floor, 0.45);
});

test('SAPO_DESOVADOR phase 2 summons 2 eggs per cycle', () => {
  const p2summon = SAPO_DESOVADOR.phases[1].sequence.find((s) => s.do === 'summon');
  assert.ok(p2summon, 'phase 2 has a summon step');
  assert.equal(p2summon.count, 2);
  assert.equal(p2summon.spawnType, 'huevo_sapo');
});

test('TIBURON_ABISAL uses burrow movement', () => {
  assert.equal(TIBURON_ABISAL.movement.type, 'burrow');
});
```

- [ ] **Step 4.2** — Run the new test file:

```bash
node --test tests/bosses.water.test.js
```

Expected: 15 tests pass, 0 failures.

#### 4B — Extend `tests/regions.test.js`

Append new tests at the bottom of the existing file.

- [ ] **Step 4.3** — Append to `tests/regions.test.js`:

```js
// ─── Water wiring ────────────────────────────────────────────────────────────

test('water branch has 8 levels with the standard kind layout', () => {
  const kinds = REGIONS.water.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'intermediate', 'levelboss', 'temple']);
});

test('water nv4/5/6 minibosses are soldado_hielo, sapo_desovador, tiburon_abisal', () => {
  const water = REGIONS.water;
  const mb4 = water.levels[3].phases.find((p) => p.type === 'miniboss');
  const mb5 = water.levels[4].phases.find((p) => p.type === 'miniboss');
  const mb6 = water.levels[5].phases.find((p) => p.type === 'miniboss');
  assert.equal(mb4.enemyDef.key, 'soldado_hielo');
  assert.equal(mb5.enemyDef.key, 'sapo_desovador');
  assert.equal(mb6.enemyDef.key, 'tiburon_abisal');
  // All flagged elite
  assert.equal(mb4.enemyDef.elite, true);
  assert.equal(mb5.enemyDef.elite, true);
  assert.equal(mb6.enemyDef.elite, true);
});

test('water nv7 levelboss is the Kraken (single boss, no trio)', () => {
  const lvl7 = REGIONS.water.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  const phase = lvl7.phases[0];
  assert.equal(phase.type, 'levelBoss');
  // single boss path: enemyDef present, no bosses array
  assert.equal(phase.enemyDef.key, 'kraken');
  assert.equal(phase.enemyDef.elite, true);
  assert.equal(phase.bosses, undefined, 'Kraken is not a trio');
});

test('water nv8 templeboss is DAMA_LAGO with a forms array of length 5', () => {
  const lvl8 = REGIONS.water.levels[7];
  assert.equal(lvl8.kind, 'temple');
  const phase = lvl8.phases[0];
  assert.equal(phase.type, 'templeBoss');
  assert.equal(phase.enemyDef.key, 'dama_lago');
  assert.equal(phase.enemyDef.elite, true);
  assert.ok(Array.isArray(phase.enemyDef.forms));
  assert.equal(phase.enemyDef.forms.length, 5);
  assert.equal(phase.enemyDef.forms.at(-1).key, 'dama_maga_final');
});

test('water region grants freeze skill and preserves narrative', () => {
  const water = REGIONS.water;
  assert.equal(water.grantsSkill, 'freeze');
  const clearDialogue = water.levels[7].dialogue.onClear;
  assert.ok(clearDialogue.length >= 2, 'closing dialogue present');
  const lamaLine = clearDialogue.find((l) => l.speaker === 'Dama del Lago');
  assert.ok(lamaLine, 'Dama del Lago has a closing line');
  assert.match(lamaLine.text, /suplicó/, 'mageLines[0] preserved');
});

// ─── Fire regression ─────────────────────────────────────────────────────────

test('fire nv4/5/6 minibosses are still pyra, vesta, favilla (regression)', () => {
  const fire = REGIONS.fire;
  const mb4 = fire.levels[3].phases.find((p) => p.type === 'miniboss');
  const mb5 = fire.levels[4].phases.find((p) => p.type === 'miniboss');
  const mb6 = fire.levels[5].phases.find((p) => p.type === 'miniboss');
  assert.equal(mb4.enemyDef.key, 'pyra');
  assert.equal(mb5.enemyDef.key, 'vesta');
  assert.equal(mb6.enemyDef.key, 'favilla');
});

test('fire nv7 is still the sisters trio (regression)', () => {
  const lvl7 = REGIONS.fire.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  const phase = lvl7.phases[0];
  assert.ok(Array.isArray(phase.bosses), 'fire nv7 still uses bosses array');
  assert.equal(phase.bosses.length, 3);
  assert.equal(phase.triangle, true);
  // The new levelBoss param must NOT have clobbered fire
  assert.equal(phase.enemyDef, undefined, 'fire nv7 has no single enemyDef — it is a trio');
});

test('fire temple boss is still Ignatius (regression)', () => {
  const tb = REGIONS.fire.levels[7].phases[0];
  assert.equal(tb.enemyDef.key, 'ignatius');
  assert.ok(Array.isArray(tb.enemyDef.phases));
});
```

- [ ] **Step 4.4** — Run all regions tests:

```bash
node --test tests/regions.test.js
```

Expected output (14 tests total — 6 original + 8 new):
```
✔ four elemental regions each have 8 levels ending in a temple (…ms)
✔ standard branch layout: 3 basic, 3 intermediate, 1 levelboss, 1 temple (…ms)
✔ level 7 is a dedicated levelboss level; fire holds the sisters trio there (…ms)
✔ castle is locked, has no element, and ends in the King reveal (…ms)
✔ required elements match the elemental region ids (…ms)
✔ air branch grants the lightning skill (…ms)
✔ all temple/level/mini bosses are flagged elite (…ms)
✔ water branch has 8 levels with the standard kind layout (…ms)
✔ water nv4/5/6 minibosses are soldado_hielo, sapo_desovador, tiburon_abisal (…ms)
✔ water nv7 levelboss is the Kraken (single boss, no trio) (…ms)
✔ water nv8 templeboss is DAMA_LAGO with a forms array of length 5 (…ms)
✔ water region grants freeze skill and preserves narrative (…ms)
✔ fire nv4/5/6 minibosses are still pyra, vesta, favilla (regression) (…ms)
✔ fire nv7 is still the sisters trio (regression) (…ms)
✔ fire temple boss is still Ignatius (regression) (…ms)
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

- [ ] **Step 4.5** — Run the full test suite to catch any regressions across all files:

```bash
node --test
```

Expected: all existing tests pass; no new failures.

- [ ] **Step 4.6** — Commit tests.

```bash
git add tests/bosses.water.test.js tests/regions.test.js
git commit -m "test(water): boss defs sanity + regions wiring assertions

bosses.water.test.js: 15 tests covering all 5 boss defs (elite flag,
phases, forms, ascending hp/resist, maga_final low-hp). Extends
regions.test.js with 8 water-wiring + 3 fire-regression tests."
```

---

## Completion checklist

- [ ] `src/data/bosses/water.js` created with 5 exported bosses + 4 internal Dama-form consts.
- [ ] `makeBranch` in `src/data/regions.js` accepts `levelBoss` override without breaking Fire.
- [ ] `REGIONS.water` wired with all 5 bosses; existing narrative preserved.
- [ ] `tests/bosses.water.test.js` passes (15 tests).
- [ ] `tests/regions.test.js` extended; all 15 tests pass.
- [ ] `node --test` (full suite) passes.
- [ ] Fire regression tests green.

---

## Reference: stat summary

| Boss | Level | HP | Speed | Damage | Radius | Phases |
|------|-------|----|-------|--------|--------|--------|
| Soldado de Hielo | nv4 miniboss | 380 | 75 | 16 | 24 | 2 |
| Sapo Desovador | nv5 miniboss | 440 | 60 | 14 | 26 | 2 |
| Tiburón Abisal | nv6 miniboss | 520 | 85 | 18 | 28 | 2 |
| Kraken | nv7 levelboss | 650 | 28 | 20 | 42 | 3 |
| Dama — Maga | nv8 form 1 | 340 | 70 | 14 | 26 | 2 |
| Dama — Tiburón | nv8 form 2 | 460 | 90 | 20 | 28 | 2 |
| Dama — Kraken | nv8 form 3 | 580 | 30 | 18 | 38 | 2 |
| Dama — Ballena | nv8 form 4 | 720 | 22 | 24 | 50 | 2 |
| Dama — Maga Final | nv8 form 5 | 20 | 55 | 10 | 24 | 1 |

All stats are starting values — tuned in playtest (spec §4: "Vida exacta se afina en playtest").

---

## Reference: key design decisions captured in this plan

1. **`levelBoss` vs `levelBosses`:** The param rename follows the existing `lb()` blob semantics (`levelBoss: lb(650,24)`) so the new override slot is obvious and symmetric. Fire's `levelBosses` (plural, trio array) is untouched.

2. **Kraken as `movement: { type: 'static' }`:** The spec says "anchored/slow — it's enormous." The whirlpool and tentacles do the positional work; movement type `static` matches `IGNATIUS`-style anchored setpiece.

3. **DAMA_LAGO outer def mirrors DAMA_MAGA:** The top-level `hp`/`speed`/`movement` on `DAMA_LAGO` match the first form (maga). This ensures safe fallback if FormSequencer initializes before the first `forms` transition fires.

4. **Water waves left to Plan 2:** `basic` and `inter` wave factories are not passed in the `makeBranch` call, so `basicWaves`/`interWaves` (generic) remain as fallbacks. Plan 2 will add `waterWaves`/`waterInterWaves` and thread them in.

5. **`templeBoss` field on levelBuilder phase:** `buildPhase('templeBoss', ...)` already sets `enemyDef: spec.templeBoss` and `mechanics: spec.templeBoss?.mechanics`. Since `DAMA_LAGO` has no `mechanics` property (she uses `forms`), `mechanics` will be `undefined` on her phase — that is correct; the FormSequencer (Plan 1) reads `enemyDef.forms`, not `mechanics`.
