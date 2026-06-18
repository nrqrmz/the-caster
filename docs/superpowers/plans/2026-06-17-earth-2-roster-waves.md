# Earth World — Roster & Waves Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the 20-creature Earth roster ("El Jardín de Circe"), register it, give the world its color palette, and wire the 8-level wave calendar so the Earth branch is fully playable end-to-end (with the engine pieces from Plan 1 and temporary generic boss blobs — real bosses arrive in Plan 3).

**Architecture:** Pure data. Enemy recipes go in a new `src/data/enemies/earth.js` (the Air roster `src/data/enemies/air.js` is the template), registered via `src/data/enemies/index.js`. Waves are tier-branched functions in `src/data/regions.js` consumed by `makeBranch`. Colors centralize in `src/config.js`. A pure validation test guards the roster's cross-references.

**Tech Stack:** Vanilla ES modules, `node:test` for the validation test. No bundler, no new deps.

## Global Constraints

- No build step / no bundler / ES modules + Phaser from CDN. — spec §0 / `CLAUDE.md`.
- Texture/color keys centralized in `src/config.js` (`TEX`, `COLORS`); never inline a hex or key string. Earth reuses generic `TEX` keys (`villager`/`warrior`/`archer`/`miniboss`/`boss`) and differentiates by `color` — same approach Air used (no per-enemy `TEX`). — spec §7-report / `CLAUDE.md`.
- Pure data only; no Phaser imports in `src/data/`. — `CLAUDE.md`.
- All UI/story text is in Spanish. — `CLAUDE.md`.
- **Engine contract from Plan 1 (must already be merged):** captive defs set `captive: true` + `transmuteTo: '<beastKey>'`; `mutateOnDeath` users set `{ spawnType }` or `{ zone: { radius, dps, duration } }`; root sources use `onHitRoot` modifier or `root: true` on a `lobAoe` attack.
- Roster = 20 creatures per spec §3; intro calendar per spec §3.7.

---

### Task 1: Earth color palette

Add the Earth (`El Jardín de Circe`) palette to `COLORS`. `poison: 0x7cb342` already exists and is reused.

**Files:**
- Modify: `src/config.js` (`COLORS` map — append an Earth block after the Air block ~line 74)

**Interfaces:**
- Produces: `COLORS.barkBrown`, `COLORS.mossGreen`, `COLORS.stoneGrey`, `COLORS.mudBrown`, `COLORS.vineGreen`, `COLORS.sporeViolet`, `COLORS.fleshPale`, `COLORS.wood`, `COLORS.silver`, `COLORS.beastFur`. (Consumed by Task 2's roster and Plan 3's bosses.)

- [ ] **Step 1: Add the palette**

In `src/config.js`, in the `COLORS` object, after the Air palette block (~line 74), add:

```js
  // Earth world palette — El Jardín de Circe (forest greens/browns, stone, spore violet, captive flesh)
  barkBrown:   0x6d4c41,
  mossGreen:   0x558b2f,
  stoneGrey:   0x9e9e9e,
  mudBrown:    0x795548,
  vineGreen:   0x33691e,
  sporeViolet: 0x8e24aa,
  fleshPale:   0xe0c0a0,
  beastFur:    0x5d4037,
  wood:        0x8d6e63,  // Céfalo's javelin shaft
  silver:      0xcfd8dc,  // Céfalo's javelin tip
```

- [ ] **Step 2: Sanity check (syntax)**

Run: `node -e "import('./src/config.js').then(m => console.log(m.COLORS.mossGreen, m.COLORS.wood))"`
Expected: prints two numbers (e.g. `5602863 9268067`) — confirms the module parses and the keys resolve.

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(earth): add El Jardín de Circe color palette"
```

---

### Task 2: The 20-creature roster + registration + validation test

Create the roster file, register it, and add a pure test that validates every cross-reference (`transmuteTo`, `mutateOnDeath.spawnType`, `splitsOnDeath.spawnType` all resolve to real keys).

**Files:**
- Create: `src/data/enemies/earth.js`
- Modify: `src/data/enemies/index.js` (import + spread `EARTH_ENEMIES` ~lines 4 & 17)
- Test: `tests/EarthRoster.test.js`

**Interfaces:**
- Consumes: `COLORS`, `TEX` (config); Plan 1 contracts (`captive`/`transmuteTo`/`mutateOnDeath`/`onHitRoot`/`root`).
- Produces: `EARTH_ENEMIES` (object keyed by creature key); all keys merged into `ENEMY_TYPES`.

- [ ] **Step 1: Write the failing validation test**

Create `tests/EarthRoster.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_ENEMIES } from '../src/data/enemies/earth.js';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';

const defs = Object.values(EARTH_ENEMIES);

test('every Earth def has the required numeric fields and a matching key', () => {
  for (const [k, d] of Object.entries(EARTH_ENEMIES)) {
    assert.equal(d.key, k, `key mismatch for ${k}`);
    for (const f of ['hp', 'speed', 'damage', 'radius']) {
      assert.equal(typeof d[f], 'number', `${k}.${f} must be a number`);
    }
    assert.ok(d.movement && typeof d.movement.type === 'string', `${k} needs movement.type`);
    assert.ok(Array.isArray(d.attacks), `${k}.attacks must be an array`);
  }
});

test('the roster has exactly 20 player-facing creatures (excluding split children)', () => {
  const facing = defs.filter((d) => !d.key.endsWith('_cria'));
  assert.equal(facing.length, 20);
});

test('every transmuteTo points to a registered enemy type', () => {
  for (const d of defs) {
    if (d.transmuteTo) assert.ok(ENEMY_TYPES[d.transmuteTo], `${d.key}.transmuteTo -> ${d.transmuteTo} not registered`);
  }
});

test('every mutateOnDeath spawnType / splitsOnDeath spawnType resolves', () => {
  for (const d of defs) {
    for (const m of d.modifiers || []) {
      if (m && m.type === 'mutateOnDeath' && m.spawnType) {
        assert.ok(ENEMY_TYPES[m.spawnType], `${d.key} mutateOnDeath -> ${m.spawnType} not registered`);
      }
      if (m && m.type === 'splitsOnDeath' && m.spawnType) {
        assert.ok(ENEMY_TYPES[m.spawnType], `${d.key} splitsOnDeath -> ${m.spawnType} not registered`);
      }
    }
  }
});

test('captives are both flagged captive and have a transmuteTo', () => {
  for (const d of defs) {
    if (d.captive) assert.ok(d.transmuteTo, `${d.key} is captive but has no transmuteTo`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/EarthRoster.test.js`
Expected: FAIL — cannot import `../src/data/enemies/earth.js` (file does not exist).

- [ ] **Step 3: Create the roster file**

Create `src/data/enemies/earth.js`:

```js
// src/data/enemies/earth.js
// El Jardín de Circe (Earth world) roster — 20 creatures + split children.
// Identity: terrain + triage (transmute) + aguante. Recipe shape mirrors air.js.
import { COLORS, TEX } from '../../config.js';

export const EARTH_ENEMIES = {
  // --- Cautivos: víctimas humanas (fodder de transmutación, frágiles) ---
  naufrago_encantado: { key: 'naufrago_encantado', tex: TEX.villager, color: COLORS.fleshPale,
    hp: 18, speed: 90, damage: 8, radius: 16,
    captive: true, transmuteTo: 'lobo',
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  acolito_cautivo: { key: 'acolito_cautivo', tex: TEX.archer, color: COLORS.fleshPale,
    hp: 16, speed: 70, damage: 7, radius: 16,
    captive: true, transmuteTo: 'jabali',
    movement: { type: 'kite', range: 200 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 210 }] },

  sierva_jardin: { key: 'sierva_jardin', tex: TEX.villager, color: COLORS.fleshPale,
    hp: 14, speed: 85, damage: 0, radius: 14,
    captive: true, transmuteTo: 'pixie',
    movement: { type: 'flee' },
    attacks: [],
    modifiers: [{ type: 'mutateOnDeath', zone: { radius: 36, dps: 12, duration: 1500 } }] },

  // --- Bestias: fauna / resultado del transmute ---
  lobo: { key: 'lobo', tex: TEX.villager, color: COLORS.beastFur,
    hp: 30, speed: 130, damage: 11, radius: 16,
    movement: { type: 'evade', range: 110 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'mutateOnDeath', spawnType: 'sierva_jardin' }] },

  jabali: { key: 'jabali', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 60, speed: 100, damage: 16, radius: 18,
    movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.0 },
    attacks: [{ type: 'melee' }] },

  oso_jardin: { key: 'oso_jardin', tex: TEX.warrior, color: COLORS.beastFur,
    hp: 150, speed: 70, damage: 20, radius: 22,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  hombre_lobo: { key: 'hombre_lobo', tex: TEX.warrior, color: COLORS.beastFur,
    hp: 110, speed: 120, damage: 18, radius: 19,
    movement: { type: 'evade', range: 140 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 6 }] },

  // --- Flora / hongos: terreno + veneno, estáticos/lentos ---
  hongo_esporario: { key: 'hongo_esporario', tex: TEX.villager, color: COLORS.sporeViolet,
    hp: 40, speed: 0, damage: 6, radius: 16,
    movement: { type: 'static' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 8, radius: 40 },
      { type: 'mutateOnDeath', zone: { radius: 50, dps: 18, duration: 2500 } },
    ] },

  brote_pustula: { key: 'brote_pustula', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 50, speed: 0, damage: 0, radius: 16,
    movement: { type: 'static' },
    attacks: [{ type: 'lobAoe', every: 3200, radius: 60, dps: 30, duration: 4000 }] },

  zarza_estranguladora: { key: 'zarza_estranguladora', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 70, speed: 0, damage: 8, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'lobAoe', every: 3000, radius: 50, duration: 1500, root: true, telegraph: 500 }] },

  flor_carnivora: { key: 'flor_carnivora', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 60, speed: 0, damage: 9, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'shootHoming', every: 2600, speed: 120, telegraph: 350 }] },

  enredadera_reptante: { key: 'enredadera_reptante', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 45, speed: 45, damage: 10, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [
      { type: 'onHitSlow', factor: 0.6, ms: 1200 },
      { type: 'splitsOnDeath', spawnType: 'enredadera_cria', count: 2, hpMul: 0.6, radiusMul: 0.7 },
    ] },

  enredadera_cria: { key: 'enredadera_cria', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 22, speed: 55, damage: 8, radius: 12,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'onHitSlow', factor: 0.7, ms: 900 }] },

  // --- Fey pequeños: rápidos / enjambre ---
  pixie: { key: 'pixie', tex: TEX.villager, color: COLORS.sporeViolet,
    hp: 16, speed: 135, damage: 5, radius: 12,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  duende_ladron: { key: 'duende_ladron', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 24, speed: 110, damage: 9, radius: 14,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  fuego_fatuo_pantano: { key: 'fuego_fatuo_pantano', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 26, speed: 80, damage: 7, radius: 14,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 8, radius: 40 },
      { type: 'onHitSlow', factor: 0.7, ms: 1000 },
    ] },

  // --- Golems / pétreos: muro, lentos, golpes pesados ---
  golem_lodo: { key: 'golem_lodo', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 90, speed: 50, damage: 12, radius: 20,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [
      { type: 'onHitSlow', factor: 0.6, ms: 1200 },
      { type: 'splitsOnDeath', spawnType: 'golem_lodo_cria', count: 2, hpMul: 0.6, radiusMul: 0.7 },
    ] },

  golem_lodo_cria: { key: 'golem_lodo_cria', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 45, speed: 60, damage: 10, radius: 14,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'onHitSlow', factor: 0.7, ms: 900 }] },

  golem_piedra: { key: 'golem_piedra', tex: TEX.warrior, color: COLORS.stoneGrey,
    hp: 220, speed: 45, damage: 14, radius: 22,
    movement: { type: 'chase' },
    attacks: [{ type: 'lobAoe', every: 2600, radius: 55, dps: 22, duration: 1500, telegraph: 450 }],
    modifiers: [{ type: 'shielded', reduce: 0.3 }] },

  totem_espinas: { key: 'totem_espinas', tex: TEX.warrior, color: COLORS.barkBrown,
    hp: 120, speed: 0, damage: 10, radius: 20,
    movement: { type: 'static' },
    attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 2200, speed: 200 }] },

  coloso_musgoso: { key: 'coloso_musgoso', tex: TEX.warrior, color: COLORS.mossGreen,
    hp: 300, speed: 40, damage: 18, radius: 24,
    movement: { type: 'chase' },
    attacks: [{ type: 'lobAoe', every: 3000, radius: 55, duration: 1500, root: true, telegraph: 550 }] },

  // --- Élite del jardín: la fuente de la mecánica firma ---
  ninfa_transmutadora: { key: 'ninfa_transmutadora', tex: TEX.archer, color: COLORS.sporeViolet,
    hp: 70, speed: 70, damage: 6, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'transmute', every: 5000, speed: 150 }] },
};
```

- [ ] **Step 4: Register the roster**

In `src/data/enemies/index.js`, add the import (~line 4, next to the other roster imports):

```js
import { EARTH_ENEMIES } from './earth.js';
```

Then append `...EARTH_ENEMIES` to the `ENEMY_TYPES` spread (~line 17):

```js
export const ENEMY_TYPES = { ...GENERIC, ...FIRE_ENEMIES, ...WATER_ENEMIES, ...AIR_ENEMIES, ...EARTH_ENEMIES };
```

- [ ] **Step 5: Run the validation test to verify it passes**

Run: `node --test tests/EarthRoster.test.js`
Expected: PASS — 20 player-facing creatures, all cross-references resolve, captives flagged correctly.

- [ ] **Step 6: Run the full suite (regression)**

Run: `node --test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/data/enemies/earth.js src/data/enemies/index.js tests/EarthRoster.test.js
git commit -m "feat(earth): 20-creature roster (El Jardín de Circe) + validation test"
```

---

### Task 3: Earth waves + branch wiring (playable, generic bosses)

Add `earthWaves`/`earthInterWaves` and wire the `earth` branch to use them + the intro/mage dialogue. Real bosses come in Plan 3 — for now the branch falls back to generic `mb`/`lb`/`tb` blobs (already wired through `makeBranch`), so the world is fully playable.

**Files:**
- Modify: `src/data/regions.js` (add `earthWaves`/`earthInterWaves` near `airWaves`/`airInterWaves` ~line 153; replace the `earth: makeBranch({...})` stub ~lines 265-273)

**Interfaces:**
- Consumes: `wave`, `ramp` helpers (existing); `makeBranch`; the roster keys from Task 2.
- Produces: an `earth` branch with 8 levels following the intro calendar (spec §3.7). `MECHANICS.earth` (poisonFloor + boulder) already exists for the temple boss fallback.

- [ ] **Step 1: Add the wave functions**

In `src/data/regions.js`, after `airInterWaves` (~line 153), add (calendar from spec §3.7: nv1 servants/wolves/pixies → nv3 adds boars/totems/sprouts):

```js
function earthWaves(tier) {
  if (tier === 1) {
    return [
      wave(700, [{ type: 'naufrago_encantado', count: ramp(4, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
      wave(650, [{ type: 'lobo', count: ramp(2, tier) }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
      wave(600, [{ type: 'pixie', count: ramp(3, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'naufrago_encantado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    return [
      wave(650, [{ type: 'acolito_cautivo', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(2, tier) }]),
      wave(600, [{ type: 'hongo_esporario', count: ramp(2, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
      wave(550, [{ type: 'acolito_cautivo', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(3, tier) }, { type: 'naufrago_encantado', count: ramp(2, tier) }]),
    ];
  }
  return [
    wave(600, [{ type: 'jabali', count: ramp(2, tier) }, { type: 'totem_espinas', count: 1 }]),
    wave(550, [{ type: 'brote_pustula', count: ramp(2, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
    wave(500, [{ type: 'jabali', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(2, tier) }, { type: 'acolito_cautivo', count: ramp(2, tier) }]),
  ];
}

function earthInterWaves(tier) {
  if (tier <= 2) { // Nv4
    return [
      wave(600, [{ type: 'oso_jardin', count: 1 }, { type: 'lobo', count: ramp(2, tier) }]),
      wave(550, [{ type: 'fuego_fatuo_pantano', count: ramp(2, tier) }, { type: 'golem_lodo', count: 1 }, { type: 'pixie', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 3) { // Nv5 — introduce the transmute anchor
    return [
      wave(600, [{ type: 'ninfa_transmutadora', count: 1 }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
      wave(550, [{ type: 'zarza_estranguladora', count: 2 }, { type: 'lobo', count: ramp(2, tier) }, { type: 'sierva_jardin', count: ramp(2, tier) }]),
    ];
  }
  return [ // Nv6
    wave(550, [{ type: 'hombre_lobo', count: 1 }, { type: 'flor_carnivora', count: 2 }, { type: 'enredadera_reptante', count: ramp(2, tier) }]),
    wave(500, [{ type: 'golem_piedra', count: 1 }, { type: 'ninfa_transmutadora', count: 1 }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
  ];
}
```

- [ ] **Step 2: Wire the branch to use the waves**

In `src/data/regions.js`, replace the current `earth` stub (~lines 265-273):

```js
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'region.earth.name', grantsSkill: 'poison',
    intro: [{ speaker: 'speaker.narrator', text: 'story.earth.intro.0' }],
    mageName: 'speaker.mage.earth',
    mageLines: [
      'story.earth.mage.0',
      'story.earth.mage.1',
    ],
  }),
```

with (adds `basic`/`inter`; bosses remain generic blobs from `makeBranch` defaults until Plan 3):

```js
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'region.earth.name', grantsSkill: 'poison',
    basic: earthWaves, inter: earthInterWaves,
    intro: [{ speaker: 'speaker.narrator', text: 'story.earth.intro.0' }],
    mageName: 'speaker.mage.earth',
    mageLines: [
      'story.earth.mage.0',
      'story.earth.mage.1',
    ],
  }),
```

- [ ] **Step 3: Run the full suite (regression)**

Run: `node --test`
Expected: PASS — region/branch construction stays valid (any regions/campaign tests still green).

- [ ] **Step 4: Manual playtest**

Run: `python3 -m http.server 8000`. Reach the Earth region (you may need a save with Fire/Water/Air cleared, or temporarily unlock). Play levels 1–6: confirm the roster spawns, evade-wolves dodge orbs, the Zarza/Coloso root you (movement stops, fire continues), Brote/Hongo lay poison zones, the Ninfa Transmutadora fires bolts that turn captives into wolves, and killing a captive first fizzles the bolt. Levels 4–8 still use generic boss blobs (expected — Plan 3 replaces them).

- [ ] **Step 5: Commit**

```bash
git add src/data/regions.js
git commit -m "feat(earth): wave calendar + branch wiring (roster live, generic bosses)"
```

---

### Task 4: Earth story strings (i18n)

The branch references `story.earth.intro.0`, `story.earth.mage.0/1`, and `speaker.mage.earth`. Add them in both locale files. (Spec §0 fixes the place as El Jardín de Circe; the mage NPC is the temple-guardian who grants Poison.)

**Files:**
- Modify: `src/i18n/locales/es.js` (add `story.earth.*`; ensure `speaker.mage.earth`, `region.earth.name`)
- Modify: `src/i18n/locales/en.js` (same keys)

**Interfaces:**
- Produces: `story.earth.intro.0`, `story.earth.mage.0`, `story.earth.mage.1`, `speaker.mage.earth`, `region.earth.name` in both locales.

- [ ] **Step 1: Inspect existing Air/Water keys for shape**

Run: `node -e "import('./src/i18n/locales/es.js').then(m => console.log(JSON.stringify({region: m.default.region, mage: m.default.speaker?.mage, air: m.default.story?.air?.intro, earth: m.default.story?.earth}, null, 2)))"`
Expected: shows how `region.*.name`, `speaker.mage.*`, and `story.air.intro` are nested — copy that exact structure for Earth. Note which keys already exist (the stub may already define some).

- [ ] **Step 2: Add the Spanish strings**

In `src/i18n/locales/es.js`, ensure these keys exist (add any missing, matching the existing nesting — `region.earth.name`, `speaker.mage.earth`, `story.earth.*`):

```js
// region.earth.name:
'El Jardín de Circe',
// speaker.mage.earth:
'Guardián del Jardín',
// story.earth.intro.0:
'Cruzas el umbral de un jardín que respira. Las flores te miran. Algo aquí convierte a los hombres en bestias.',
// story.earth.mage.0:
'Llegaste lejos, princesa. Pero este jardín es de Circe, y Circe no perdona a los de tu especie.',
// story.earth.mage.1:
'Toma el veneno de estas tierras. Que la ponzoña que ella cultiva sea ahora tu arma.',
```

(Place each value at its correct nested key, following the structure observed in Step 1.)

- [ ] **Step 3: Add the English strings**

In `src/i18n/locales/en.js`, add the parallel keys:

```js
// region.earth.name:
"Circe's Garden",
// speaker.mage.earth:
'Garden Warden',
// story.earth.intro.0:
'You cross into a garden that breathes. The flowers watch you. Something here turns men into beasts.',
// story.earth.mage.0:
'You came far, princess. But this garden is Circe\'s, and Circe spares none of your kind.',
// story.earth.mage.1:
'Take the venom of this land. Let the poison she cultivates be your weapon now.',
```

- [ ] **Step 4: Verify both locales parse and the keys resolve**

Run: `node -e "Promise.all([import('./src/i18n/locales/es.js'),import('./src/i18n/locales/en.js')]).then(([es,en])=>{const g=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o.default);for(const p of ['region.earth.name','speaker.mage.earth','story.earth.intro.0','story.earth.mage.0','story.earth.mage.1']){if(!g(es,p))throw new Error('es missing '+p);if(!g(en,p))throw new Error('en missing '+p);}console.log('all earth keys present in both locales');})"`
Expected: prints `all earth keys present in both locales`.

- [ ] **Step 5: Run the full suite (regression)**

Run: `node --test`
Expected: PASS (any i18n completeness test stays green).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/locales/es.js src/i18n/locales/en.js
git commit -m "i18n(earth): El Jardín de Circe intro + mage + region name (es/en)"
```

---

## Self-Review

**Spec coverage:**
- §3.1–§3.6 roster (20 creatures + 2 split children) → Task 2. ✓ (validation test asserts exactly 20 player-facing.)
- §3.7 intro calendar → Task 3 wave functions. ✓
- §2.6 `flee`-rule for captives → `sierva_jardin` uses `flee`; all captives flagged + transmute-mapped (test enforces). ✓ (Náufrago/Acólito follow their §3.1 table movements `chase`/`kite`; the flee-rule is honored where the spec table specifies it.)
- §1 player synergy / §7 color palette → Task 1. ✓
- Story/i18n → Task 4. ✓

**Placeholder scan:** none — all defs and strings are concrete.

**Type consistency:** `transmuteTo`, `mutateOnDeath`/`{spawnType|zone}`, `splitsOnDeath.spawnType`, `onHitSlow`, `auraDamage`, `shielded`, `drain`, `root` (on `lobAoe`), `transmute` attack, `flying` — all match the recipe shapes the Air roster uses and the Plan 1 engine contracts. Split children (`enredadera_cria`, `golem_lodo_cria`) mirror the working `medusa`/`medusa_cria` pattern.

**Deviation noted:** spec §3.2 lists `evade` as a *modifier* for Lobo/Hombre Lobo, but the engine implements `evade` as a *movement type* (as Air's Galahad does) — so both use `movement: { type: 'evade', range }`. `dashStrike`/`boulder` (spec flavor terms) are realized with the engine's `charge` movement + `melee` (Jabalí) and `lobAoe` ground-pounds (Golem de Piedra, Coloso), which are the shipped attack/movement types. Tunable in playtest.
