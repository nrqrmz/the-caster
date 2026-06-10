# Water Roster & Waves — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 20-creature Water world roster and Water-specific wave functions (basic + intermediate) wired into `REGIONS.water`, implementing the spec §3 intro schedule and §5 wave-composition rules (anchor + filler + mobility threat).

**Architecture:** Three pure-data files grow: `src/config.js` gets new TEX/COLORS keys for Water tints; a new `src/data/enemies/water.js` holds the 20 recipes in the same shape as `fire.js`; `src/data/enemies/index.js` spreads `WATER_ENEMIES` into `ENEMY_TYPES`; and `src/data/regions.js` gains `waterWaves(tier)` / `waterInterWaves(tier)` functions that are passed as `basic`/`inter` params to `makeBranch` for `REGIONS.water`. Boss wiring is deferred to Plan 3 — this plan leaves a clear TODO comment. All enemy logic already lives in `EnemyBrain`; this plan only adds declarative recipes and wave tables (zero new runtime code).

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN), node:test for pure logic.

**Spec:** docs/superpowers/specs/2026-06-10-water-world-design.md
**Depends on:** Plan 1 (water engine pieces) — burrow, onHitSlow, splitsOnDeath, resist must exist.

---

### Task 1: New TEX/COLORS keys for Water in `config.js`

**Files:**
- Modify: `src/config.js`

Water uses geometric art (same approach as Fire): reuse the four existing TEX shape keys (`TEX.villager` circle, `TEX.warrior` diamond, `TEX.archer` circle-small, `TEX.miniboss` larger-circle) with new ice-blue/deep-blue tints. No new geometry is needed — the tint differentiates the world visually.

**TEX shape reuse mapping (Water → existing TEX key):**
| Water creature group | TEX shape to reuse | Reason |
|---|---|---|
| Human cultists (Acólito, Lanzahielos, Ahogado, Sacerdotisa, Vidente, Corista) | `TEX.archer` / `TEX.villager` | Same silhouette as Fire cultists |
| Guardia de Hielo, Cangrejo Acorazado, Tortuga Acorazada | `TEX.warrior` | Armored/heavy diamond shape |
| Renacuajo, Rana Saltarina, Sapo Escupidor, Pez Globo, Medusa, Burbuja Gélida | `TEX.villager` | Small creature circle |
| Tiburón Joven, Serpiente Marina, Náyade | `TEX.archer` | Slim/medium circle |
| Tótem de Escarcha, Huevo de Sapo | `TEX.warrior` | Static landmark shape |
| (Bosses — Plan 3) | `TEX.miniboss` / `TEX.boss` | Standard boss keys |

No new TEX keys are needed for this plan (bosses are Plan 3). Only COLORS entries are new.

- [ ] **Step 1: Add Water COLORS to `src/config.js`**

In `src/config.js`, add these entries to the `COLORS` object after the `ice` entry (which already exists at `0xb3e5fc`):

```js
// Water world palette (ice blues, deep lake blues, swamp greens)
frostBlue: 0x90caf9,      // Acólito de Escarcha, Vidente de Marea — light cornflower blue
deepBlue: 0x1565c0,       // Ahogado, Corista del Abismo — dark lake blue (drowned hue)
lakeGreen: 0x26a69a,      // Sacerdotisa del Lago, Náyade — teal healer
iceGuard: 0x80deea,       // Guardia de Hielo, Tortuga Acorazada — pale cyan armored
frostSpread: 0xb2ebf2,    // Lanzahielos — very pale ice, area-denial feel
frozenGray: 0x78909c,     // Cangrejo Acorazado — armor grey-blue
tadpole: 0x558b2f,        // Renacuajo — dark swamp green (frog lineage)
frogJump: 0x689f38,       // Rana Saltarina — lighter swamp green
toadSpit: 0x33691e,       // Sapo Escupidor — darker muted toad
globeFish: 0x4dd0e1,      // Pez Globo — bright cyan (inflated)
jellyfish: 0xce93d8,      // Medusa — soft purple (bioluminescence)
sharkYoung: 0x455a64,     // Tiburón Joven — dark blue-grey slate
seaSerpent: 0x006064,     // Serpiente Marina — dark teal
frostBubble: 0xe0f7fa,    // Burbuja Gélida — near-white ice
frostTotem: 0xb0bec5,     // Tótem de Escarcha — cold grey-blue
toadEgg: 0x8d6e63,        // Huevo de Sapo — muddy brown egg
```

After adding, the `COLORS` object's Water section should look exactly like the Fire section did — one line per key, consistent comment style.

- [ ] **Step 2: Verify config loads cleanly**

```bash
node --input-type=module <<'EOF'
import { COLORS, TEX } from './src/config.js';
const waterKeys = ['frostBlue','deepBlue','lakeGreen','iceGuard','frostSpread','frozenGray','tadpole','frogJump','toadSpit','globeFish','jellyfish','sharkYoung','seaSerpent','frostBubble','frostTotem','toadEgg'];
waterKeys.forEach(k => { if (COLORS[k] === undefined) throw new Error('Missing COLORS.' + k); });
console.log('config OK – ' + waterKeys.length + ' Water COLORS registered');
EOF
```

Expected output: `config OK – 16 Water COLORS registered`

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(water): add Water world TEX/COLORS palette keys to config"
```

---

### Task 2: `src/data/enemies/water.js` — creatures #1–10

**Files:**
- Create: `src/data/enemies/water.js`

Write the first half of the 20-creature roster (the 7 human cultists + first 3 lake beasts). All stat numbers are **starting values to be tuned in playtest** — they are calibrated to be in the same ballpark as Fire's roster (Fire cultists: hp 14–40, speed 55–130, damage 6–16; Fire beasts: hp 22–110, speed 35–95, damage 8–15). Water leans toward higher HP and slower speeds (attrition profile, spec §5).

Key mechanics already provided by Plan 1:
- `{ type: 'onHitSlow' }` modifier — applies caster slow on contact/projectile hit.
- `{ type: 'burrow' }` movement — submerge/reposition/emerge cycle for Tiburón Joven (#14) (covered in Task 3).
- `{ type: 'splitsOnDeath', spawnType, count, hpMul, radiusMul }` modifier — for Medusa (#13, Task 3).
- `{ type: 'resist', factor }` modifier — for Tortuga Acorazada (#20, Task 3).

- [ ] **Step 1: Create `src/data/enemies/water.js` with creatures #1–10**

```js
import { COLORS, TEX } from '../../config.js';

// Water world roster (~20). Control + attrition: higher HP and more healers than
// Fire; fewer projectiles. Three enemies apply onHitSlow (capped at 0.45× speed).
// Stat numbers are starting values; tune in playtest.
export const WATER_ENEMIES = {
  // === Cultistas / ahogados (human — nv1–6) ===

  // #1 — Acólito de Escarcha: kite ranged that slows the caster on hit.
  acolito_escarcha: { key: 'acolito_escarcha', tex: TEX.archer, color: COLORS.frostBlue,
    hp: 18, speed: 68, damage: 8, radius: 10,
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1500, speed: 240 }],
    modifiers: [{ type: 'onHitSlow' }] },

  // #2 — Lanzahielos: kite area-denial spread (3 projectiles). No slow.
  lanzahielos: { key: 'lanzahielos', tex: TEX.archer, color: COLORS.frostSpread,
    hp: 22, speed: 62, damage: 7, radius: 10,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootSpread', count: 3, arc: 36, every: 1800, speed: 230 }] },

  // #3 — Ahogado: slow-moving melee swarm filler.
  ahogado: { key: 'ahogado', tex: TEX.villager, color: COLORS.deepBlue,
    hp: 28, speed: 55, damage: 11, radius: 11,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  // #4 — Sacerdotisa del Lago: healer, kill-priority target. Flees, never attacks.
  sacerdotisa_lago: { key: 'sacerdotisa_lago', tex: TEX.archer, color: COLORS.lakeGreen,
    hp: 20, speed: 72, damage: 0, radius: 10,
    movement: { type: 'flee' },
    attacks: [],
    modifiers: [{ type: 'healAllies', hps: 12, radius: 140 }] },

  // #5 — Vidente de Marea: homing shot forces player to dodge actively.
  vidente_marea: { key: 'vidente_marea', tex: TEX.archer, color: COLORS.frostBlue,
    hp: 22, speed: 60, damage: 10, radius: 10,
    movement: { type: 'kite', range: 240 },
    attacks: [{ type: 'shootHoming', every: 2500, speed: 115, telegraph: 350 }] },

  // #6 — Guardia de Hielo: shielded charger + onHitSlow. Flanking bruiser.
  guardia_hielo: { key: 'guardia_hielo', tex: TEX.warrior, color: COLORS.iceGuard,
    hp: 75, speed: 78, damage: 16, radius: 13,
    movement: { type: 'charge', windup: 550, dash: 380, recover: 650, dashMul: 3.0 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.45 }, { type: 'onHitSlow' }] },

  // #7 — Corista del Abismo: orbit + auraDamage aura. Kill-priority; no direct attack.
  corista_abismo: { key: 'corista_abismo', tex: TEX.archer, color: COLORS.deepBlue,
    hp: 26, speed: 65, damage: 0, radius: 10,
    movement: { type: 'orbit' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 11, radius: 48 }] },

  // === Bestias del lago (elemental — nv4–8, first batch) ===

  // #8 — Renacuajo: zigzag melee add; spawned by Huevo de Sapo and Náyade.
  renacuajo: { key: 'renacuajo', tex: TEX.villager, color: COLORS.tadpole,
    hp: 12, speed: 105, damage: 7, radius: 8,
    movement: { type: 'zigzag' },
    attacks: [{ type: 'melee' }] },

  // #9 — Rana Saltarina: erratic melee. Hard to track, low HP.
  rana_saltarina: { key: 'rana_saltarina', tex: TEX.villager, color: COLORS.frogJump,
    hp: 18, speed: 115, damage: 10, radius: 9,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  // #10 — Sapo Escupidor: strafe ranged. Keeps distance, spits single shots.
  sapo_escupidor: { key: 'sapo_escupidor', tex: TEX.villager, color: COLORS.toadSpit,
    hp: 26, speed: 62, damage: 9, radius: 10,
    movement: { type: 'strafe', range: 200 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 230 }] },
};
```

- [ ] **Step 2: Quick smoke-test (node import)**

```bash
node --input-type=module <<'EOF'
import { WATER_ENEMIES } from './src/data/enemies/water.js';
const keys = Object.keys(WATER_ENEMIES);
console.log('water.js loads, creatures #1–10:', keys.join(', '));
if (keys.length !== 10) throw new Error('expected 10, got ' + keys.length);
EOF
```

Expected: prints 10 creature keys, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies/water.js
git commit -m "feat(water): add Water enemy roster creatures #1–10 (cultists + first beasts)"
```

---

### Task 3: `src/data/enemies/water.js` — creatures #11–20

**Files:**
- Modify: `src/data/enemies/water.js`

Add the remaining 10 creatures to `WATER_ENEMIES`. This covers the second batch of lake beasts (#11–16) and the summoned/ambient group (#17–20). Three creatures use Plan 1 engine pieces: Medusa (`splitsOnDeath`), Tiburón Joven (`burrow`), and Tortuga Acorazada (`resist`). Burbuja Gélida gets `onHitSlow`.

- [ ] **Step 1: Append creatures #11–20 to the `WATER_ENEMIES` object in `water.js`**

In `src/data/enemies/water.js`, add these entries into the `WATER_ENEMIES` object (after `sapo_escupidor`):

```js
  // #11 — Pez Globo: erratic melee + explodesOnDeath. Punishes close-range kills.
  pez_globo: { key: 'pez_globo', tex: TEX.villager, color: COLORS.globeFish,
    hp: 20, speed: 88, damage: 12, radius: 10,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'explodesOnDeath', count: 8, speed: 200 }] },

  // #12 — Cangrejo Acorazado: very slow shielded tank. Flanks and soaks damage.
  cangrejo_acorazado: { key: 'cangrejo_acorazado', tex: TEX.warrior, color: COLORS.frozenGray,
    hp: 90, speed: 38, damage: 14, radius: 13,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.5 }] },

  // #13 — Medusa: erratic auraDamage + splitsOnDeath (2 smaller copies, no re-split).
  // spawnType 'medusa_cria' is the scaled-down copy: hp×0.5, radius×0.7, same kit
  // minus the splitsOnDeath modifier (Plan 1 sets the no-re-split flag on children).
  medusa: { key: 'medusa', tex: TEX.villager, color: COLORS.jellyfish,
    hp: 38, speed: 55, damage: 0, radius: 12,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 14, radius: 50 },
      { type: 'splitsOnDeath', spawnType: 'medusa_cria', count: 2, hpMul: 0.5, radiusMul: 0.7 },
    ] },

  // #13b — Medusa cría: the smaller copy spawned by splitsOnDeath (no re-split flag
  // is set by Plan 1 logic — this def has no splitsOnDeath modifier by design).
  medusa_cria: { key: 'medusa_cria', tex: TEX.villager, color: COLORS.jellyfish,
    hp: 19, speed: 60, damage: 0, radius: 8,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 8, radius: 34 }] },

  // #14 — Tiburón Joven: burrow movement (submerge → reposition → emerge → dashStrike).
  // While submerged: invulnerable + hidden. Emerges with telegraphed ring (~400 ms).
  tiburon_joven: { key: 'tiburon_joven', tex: TEX.archer, color: COLORS.sharkYoung,
    hp: 55, speed: 110, damage: 18, radius: 11,
    movement: { type: 'burrow', submergeMs: 1500, repositionMs: 200, emergeMs: 400, attackMs: 600, recoverMs: 700 },
    attacks: [{ type: 'dashStrike' }] },

  // #15 — Serpiente Marina: kite spread ranged. Sinuous, keeps distance.
  serpiente_marina: { key: 'serpiente_marina', tex: TEX.archer, color: COLORS.seaSerpent,
    hp: 28, speed: 65, damage: 8, radius: 10,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 225 }] },

  // #16 — Náyade: flee + summon tadpoles + healAllies. Dual kill-priority threat.
  nayade: { key: 'nayade', tex: TEX.archer, color: COLORS.lakeGreen,
    hp: 30, speed: 70, damage: 0, radius: 11,
    movement: { type: 'flee' },
    attacks: [{ type: 'summon', spawnType: 'renacuajo', count: 2, every: 3500 }],
    modifiers: [{ type: 'healAllies', hps: 10, radius: 130 }] },

  // === Invocados / ambientales ===

  // #17 — Burbuja Gélida: erratic auraDamage + onHitSlow. Floating ambient hazard.
  burbuja_gelida: { key: 'burbuja_gelida', tex: TEX.villager, color: COLORS.frostBubble,
    hp: 14, speed: 52, damage: 0, radius: 9,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 9, radius: 42 }, { type: 'onHitSlow' }] },

  // #18 — Tótem de Escarcha: static turret — slow nova + aura. Fixed hazard.
  totem_escarcha: { key: 'totem_escarcha', tex: TEX.warrior, color: COLORS.frostTotem,
    hp: 50, speed: 0, damage: 8, radius: 12,
    movement: { type: 'static' },
    attacks: [{ type: 'nova', count: 8, every: 3200, speed: 170, telegraph: 550 }],
    modifiers: [{ type: 'auraDamage', dps: 7, radius: 52 }] },

  // #19 — Huevo de Sapo: static, no attack. Hatches into renacuajo after ~3500 ms
  // via generational spawning logic (Plan 1). The hatching timer lives in GameScene /
  // EnemyBrain; this def is the inert spawn target Náyade's summon places on the field.
  huevo_sapo: { key: 'huevo_sapo', tex: TEX.warrior, color: COLORS.toadEgg,
    hp: 8, speed: 0, damage: 0, radius: 9,
    movement: { type: 'static' },
    attacks: [] },

  // #20 — Tortuga Acorazada: charge + heavy shield + resist (flat damage reduction).
  // resist: 0.35 means incoming damage is multiplied by (1 - 0.35) = 0.65 (Plan 1).
  tortuga_acorazada: { key: 'tortuga_acorazada', tex: TEX.warrior, color: COLORS.iceGuard,
    hp: 110, speed: 60, damage: 15, radius: 14,
    movement: { type: 'charge', windup: 600, dash: 450, recover: 750, dashMul: 2.8 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.55 }, { type: 'resist', factor: 0.35 }] },
```

- [ ] **Step 2: Verify the full file imports with all 21 entries (20 + medusa_cria)**

```bash
node --input-type=module <<'EOF'
import { WATER_ENEMIES } from './src/data/enemies/water.js';
const keys = Object.keys(WATER_ENEMIES);
console.log('Total water entries:', keys.length, '-', keys.join(', '));
if (keys.length !== 21) throw new Error('expected 21 (20 creatures + medusa_cria), got ' + keys.length);
// Verify onHitSlow is ONLY on the three intended creatures
const slowHolders = keys.filter(k => (WATER_ENEMIES[k].modifiers || []).some(m => m.type === 'onHitSlow'));
console.log('onHitSlow on:', slowHolders.join(', '));
if (!slowHolders.includes('acolito_escarcha')) throw new Error('missing onHitSlow on acolito_escarcha');
if (!slowHolders.includes('guardia_hielo')) throw new Error('missing onHitSlow on guardia_hielo');
if (!slowHolders.includes('burbuja_gelida')) throw new Error('missing onHitSlow on burbuja_gelida');
if (slowHolders.length !== 3) throw new Error('onHitSlow appears on unexpected creatures: ' + slowHolders);
// Verify splitsOnDeath is only on medusa
const splitters = keys.filter(k => (WATER_ENEMIES[k].modifiers || []).some(m => m.type === 'splitsOnDeath'));
if (!splitters.includes('medusa') || splitters.length !== 1) throw new Error('splitsOnDeath placement wrong: ' + splitters);
// Verify burrow is only on tiburon_joven
const burrowers = keys.filter(k => WATER_ENEMIES[k].movement && WATER_ENEMIES[k].movement.type === 'burrow');
if (!burrowers.includes('tiburon_joven') || burrowers.length !== 1) throw new Error('burrow placement wrong: ' + burrowers);
// Verify resist is only on tortuga_acorazada
const resisters = keys.filter(k => (WATER_ENEMIES[k].modifiers || []).some(m => m.type === 'resist'));
if (!resisters.includes('tortuga_acorazada') || resisters.length !== 1) throw new Error('resist placement wrong: ' + resisters);
console.log('All mechanic-placement checks passed.');
EOF
```

Expected: prints counts, lists 3 onHitSlow carriers, confirms single splitsOnDeath/burrow/resist. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies/water.js
git commit -m "feat(water): add Water enemy roster creatures #11–20 (beasts + ambient)"
```

---

### Task 4: Register the Water roster in `src/data/enemies/index.js`

**Files:**
- Modify: `src/data/enemies/index.js`

- [ ] **Step 1: Add the Water import and spread**

In `src/data/enemies/index.js`, add the `WATER_ENEMIES` import alongside the existing `FIRE_ENEMIES` import, and spread it into `ENEMY_TYPES`:

```js
import { COLORS, TEX } from '../../config.js';
import { FIRE_ENEMIES } from './fire.js';
import { WATER_ENEMIES } from './water.js';

// Generic enemies shared across worlds (the original three, as recipes).
const GENERIC = {
  villager: { key: 'villager', tex: TEX.villager, color: COLORS.villager, hp: 20, speed: 90, damage: 8, radius: 10,
    movement: { type: 'chase' }, attacks: [] },
  warrior: { key: 'warrior', tex: TEX.warrior, color: COLORS.warrior, hp: 50, speed: 60, damage: 14, radius: 12,
    movement: { type: 'chase' }, attacks: [] },
  archer: { key: 'archer', tex: TEX.archer, color: COLORS.archer, hp: 25, speed: 70, damage: 10, radius: 10,
    movement: { type: 'kite', range: 220 }, attacks: [{ type: 'shootStraight', every: 1500, speed: 260 }] },
};

export const ENEMY_TYPES = { ...GENERIC, ...FIRE_ENEMIES, ...WATER_ENEMIES };
```

- [ ] **Step 2: Verify ENEMY_TYPES contains all 20 Water creatures**

```bash
node --input-type=module <<'EOF'
import { ENEMY_TYPES } from './src/data/enemies/index.js';
const waterKeys = [
  'acolito_escarcha','lanzahielos','ahogado','sacerdotisa_lago','vidente_marea',
  'guardia_hielo','corista_abismo','renacuajo','rana_saltarina','sapo_escupidor',
  'pez_globo','cangrejo_acorazado','medusa','medusa_cria','tiburon_joven',
  'serpiente_marina','nayade','burbuja_gelida','totem_escarcha','huevo_sapo','tortuga_acorazada',
];
waterKeys.forEach(k => {
  if (!ENEMY_TYPES[k]) throw new Error('ENEMY_TYPES missing: ' + k);
});
console.log('ENEMY_TYPES: all', waterKeys.length, 'Water entries resolved OK');
// Confirm Fire + generic still intact
['villager','warrior','archer','acolito_brasa','piromante','can_lava'].forEach(k => {
  if (!ENEMY_TYPES[k]) throw new Error('ENEMY_TYPES missing legacy key: ' + k);
});
console.log('Fire + generic keys still present — no regression');
EOF
```

Expected: both success lines, no errors.

- [ ] **Step 3: Run the existing test suite to confirm no regression**

```bash
node --test
```

Expected: all tests pass (0 failures). The change is additive (a spread into `ENEMY_TYPES`); no existing tests should break.

- [ ] **Step 4: Commit**

```bash
git add src/data/enemies/index.js
git commit -m "feat(water): register Water roster in ENEMY_TYPES"
```

---

### Task 5: Water wave functions in `src/data/regions.js`

**Files:**
- Modify: `src/data/regions.js`

Implement `waterWaves(tier)` and `waterInterWaves(tier)` following the `fireWaves` / `fireInterWaves` pattern, then wire them as `basic`/`inter` into the `REGIONS.water` `makeBranch` call. The wave composition rule from spec §5: *anchor* (healer/slower) + *filler* (ahogados/renacuajos) + *mobility threat* (tiburón joven or charger). Intro schedule from spec §3.4 determines which creature types appear per tier.

**Intro schedule mapped to tier (tier = level depth index, 1–6):**
| Tier | Levels | Creatures available |
|------|--------|---------------------|
| 1 | Nv1 (basic 1) | ahogado, acolito_escarcha, lanzahielos |
| 2 | Nv2 (basic 2) | + sacerdotisa_lago, renacuajo |
| 3 | Nv3 (basic 3) | + vidente_marea, sapo_escupidor, rana_saltarina |
| 4 | Nv4 (inter tier 2) | + guardia_hielo, cangrejo_acorazado, pez_globo |
| 5 | Nv5 (inter tier 3) | + corista_abismo, serpiente_marina, burbuja_gelida |
| 6 | Nv6 (inter tier 4) | + medusa, tiburon_joven, tortuga_acorazada |

`makeBranch` calls `basic(1)`, `basic(2)`, `basic(3)` for nv1–3 and `inter(2)`, `inter(3)`, `inter(4)` for nv4–6 intermediate levels.

- [ ] **Step 1: Add `waterWaves` and `waterInterWaves` functions**

In `src/data/regions.js`, add these two functions after `fireInterWaves` (before the `mb` helper line):

```js
// Water waves: control + attrition (more HP, healers, mobility threats).
// Composition rule — anchor (healer/slower) + filler (ahogados/renacuajos)
//                  + mobility threat (burrow shark or charger).
// Tier 1 = only nv1 introductory creatures; tiers 2–3 add healers + frogs;
// tiers 4–6 add heavy beasts. See spec §3.4 intro schedule.
function waterWaves(tier) {
  if (tier === 1) {
    // Nv1: Ahogado filler + Acólito (slow anchor). No mobility threat yet.
    return [
      wave(700, [{ type: 'ahogado', count: ramp(4, tier) }, { type: 'acolito_escarcha', count: ramp(2, tier) }]),
      wave(650, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'lanzahielos', count: tier }]),
      wave(600, [{ type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'lanzahielos', count: tier }, { type: 'ahogado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    // Nv2: Introduce Sacerdotisa (anchor/kill-priority) + Renacuajo filler.
    return [
      wave(670, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(2, tier) }]),
      wave(630, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'lanzahielos', count: tier }]),
      wave(580, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }]),
    ];
  }
  // Tier 3: Nv3 — introduce Vidente (forcing dodge), Sapo Escupidor, Rana Saltarina.
  return [
    wave(640, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'vidente_marea', count: tier }, { type: 'rana_saltarina', count: ramp(2, tier) }]),
    wave(600, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'sapo_escupidor', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(2, tier) }]),
    wave(550, [{ type: 'lanzahielos', count: tier }, { type: 'vidente_marea', count: tier }, { type: 'rana_saltarina', count: ramp(2, tier) }, { type: 'ahogado', count: ramp(2, tier) }]),
  ];
}

function waterInterWaves(tier) {
  if (tier <= 2) {
    // Nv4: introduce Guardia de Hielo (slow charger, mobility threat), Cangrejo (tank), Pez Globo.
    // Anchor = Sacerdotisa. Filler = Ahogados. Threat = Guardia de Hielo.
    return [
      wave(580, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'guardia_hielo', count: 1 }, { type: 'acolito_escarcha', count: tier }]),
      wave(530, [{ type: 'cangrejo_acorazado', count: 1 }, { type: 'pez_globo', count: ramp(2, tier) }, { type: 'vidente_marea', count: tier }, { type: 'ahogado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 3) {
    // Nv5: introduce Corista del Abismo (aura kill-priority), Serpiente Marina, Burbuja Gélida.
    // Anchor = Sacerdotisa + Corista. Filler = Renacuajos/Ahogados. Threat = Guardia de Hielo.
    return [
      wave(540, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'guardia_hielo', count: 1 }, { type: 'burbuja_gelida', count: tier }]),
      wave(490, [{ type: 'corista_abismo', count: 1 }, { type: 'serpiente_marina', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }, { type: 'pez_globo', count: tier }]),
    ];
  }
  // Tier 4 (inter(4) = Nv6): introduce Medusa (splitsOnDeath), Tiburón Joven (burrow), Tortuga Acorazada.
  // Anchor = Sacerdotisa. Filler = Ahogados/Renacuajos. Threat = Tiburón Joven (burrow).
  return [
    wave(510, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'medusa', count: tier }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'tiburon_joven', count: 1 }]),
    wave(460, [{ type: 'tortuga_acorazada', count: 1 }, { type: 'serpiente_marina', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }, { type: 'burbuja_gelida', count: tier }]),
  ];
}
```

- [ ] **Step 2: Wire the functions into `REGIONS.water`**

In `src/data/regions.js`, update the `REGIONS.water` `makeBranch` call to pass the new wave functions and add a TODO for Plan 3 boss wiring:

```js
  water: makeBranch({
    id: 'water', element: 'water', name: 'El Lago', grantsSkill: 'freeze',
    basic: waterWaves, inter: waterInterWaves,
    // TODO(Plan 3): wire minibosses: [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL],
    //              levelBosses: KRAKEN_TRIO (or single levelboss),
    //              templeBoss: DAMA_DEL_LAGO (cambiaformas)
    intro: [{ speaker: 'Narrador', text: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' }],
    mageName: 'Dama del Lago',
    mageLines: [
      'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
      'Pues estas aguas ahora son mías.',
    ],
  }),
```

- [ ] **Step 3: Run the existing regions test suite**

```bash
node --test tests/regions.test.js
```

Expected: all existing tests pass. The water region still uses default minibosses/bosses (the `mb`/`lb`/`tb` defaults from `makeBranch`) because Plan 3 hasn't wired them yet — the existing `all temple/level/mini bosses are flagged elite` test iterates generically and the water defaults carry `elite: true`.

- [ ] **Step 4: Commit**

```bash
git add src/data/regions.js
git commit -m "feat(water): add waterWaves/waterInterWaves and wire into REGIONS.water"
```

---

### Task 6: Tests — roster registration + wave type resolution + mechanic placement

**Files:**
- Create: `tests/waterRoster.test.js`

Write targeted pure-logic tests that:
1. Assert all 20 (+ medusa_cria) Water creature types register in `ENEMY_TYPES`.
2. Assert every `type` string referenced inside `waterWaves`/`waterInterWaves` resolves to a known `ENEMY_TYPES` entry.
3. Assert `onHitSlow` appears on exactly `acolito_escarcha`, `guardia_hielo`, `burbuja_gelida`.
4. Assert `splitsOnDeath` appears on exactly `medusa`.
5. Assert `burrow` movement appears on exactly `tiburon_joven`.
6. Assert `resist` modifier appears on exactly `tortuga_acorazada`.
7. Regression: Fire and generic types still present (the spread is additive).

- [ ] **Step 1: Create `tests/waterRoster.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';
import { REGIONS } from '../src/data/regions.js';

// ── 1. Full roster registration ───────────────────────────────────────────────
const WATER_CREATURE_KEYS = [
  'acolito_escarcha', 'lanzahielos', 'ahogado', 'sacerdotisa_lago', 'vidente_marea',
  'guardia_hielo', 'corista_abismo', 'renacuajo', 'rana_saltarina', 'sapo_escupidor',
  'pez_globo', 'cangrejo_acorazado', 'medusa', 'medusa_cria', 'tiburon_joven',
  'serpiente_marina', 'nayade', 'burbuja_gelida', 'totem_escarcha', 'huevo_sapo',
  'tortuga_acorazada',
];

test('water roster: all 20 creature types (+medusa_cria) register in ENEMY_TYPES', () => {
  for (const k of WATER_CREATURE_KEYS) {
    assert.ok(ENEMY_TYPES[k], `ENEMY_TYPES missing: ${k}`);
    assert.equal(ENEMY_TYPES[k].key, k, `key field must match object key for ${k}`);
  }
  assert.equal(WATER_CREATURE_KEYS.length, 21); // 20 named + medusa_cria
});

// ── 2. Wave type strings resolve ──────────────────────────────────────────────
function collectWaveTypes(waves) {
  const types = new Set();
  for (const w of waves) {
    for (const s of w.spawns) types.add(s.type);
  }
  return types;
}

test('waterWaves tiers 1–3: all referenced enemy types exist in ENEMY_TYPES', () => {
  const waterLevels = REGIONS.water.levels;
  // basic levels are indices 0, 1, 2
  for (let i = 0; i < 3; i++) {
    const level = waterLevels[i];
    for (const phase of level.phases) {
      if (phase.type !== 'wave') continue;
      for (const spawn of phase.wave.spawns) {
        assert.ok(ENEMY_TYPES[spawn.type], `waterWaves: unknown type '${spawn.type}' in level index ${i}`);
      }
    }
  }
});

test('waterInterWaves tiers 2–4: all referenced enemy types exist in ENEMY_TYPES', () => {
  const waterLevels = REGIONS.water.levels;
  // intermediate levels are indices 3, 4, 5
  for (let i = 3; i <= 5; i++) {
    const level = waterLevels[i];
    for (const phase of level.phases) {
      if (phase.type !== 'wave') continue;
      for (const spawn of phase.wave.spawns) {
        assert.ok(ENEMY_TYPES[spawn.type], `waterInterWaves: unknown type '${spawn.type}' in level index ${i}`);
      }
    }
  }
});

// ── 3. onHitSlow — exactly 3 intended creatures ───────────────────────────────
test('onHitSlow modifier is on exactly acolito_escarcha, guardia_hielo, burbuja_gelida', () => {
  const hasSlowMod = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'onHitSlow');
  const slowCarriers = Object.keys(ENEMY_TYPES).filter(hasSlowMod);
  assert.deepEqual(
    slowCarriers.sort(),
    ['acolito_escarcha', 'burbuja_gelida', 'guardia_hielo'],
    'onHitSlow should appear on exactly these three Water creatures',
  );
});

// ── 4. splitsOnDeath — exactly medusa ────────────────────────────────────────
test('splitsOnDeath modifier is on exactly medusa', () => {
  const hasSplit = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'splitsOnDeath');
  const splitCarriers = Object.keys(ENEMY_TYPES).filter(hasSplit);
  assert.deepEqual(splitCarriers, ['medusa'], 'splitsOnDeath should be on medusa only');
  // Verify medusa_cria does NOT have splitsOnDeath (no re-split)
  assert.ok(!hasSplit('medusa_cria'), 'medusa_cria must not have splitsOnDeath (no re-split)');
});

// ── 5. burrow movement — exactly tiburon_joven ───────────────────────────────
test('burrow movement is on exactly tiburon_joven', () => {
  const hasBurrow = (k) => ENEMY_TYPES[k].movement && ENEMY_TYPES[k].movement.type === 'burrow';
  const burrowers = Object.keys(ENEMY_TYPES).filter(hasBurrow);
  assert.deepEqual(burrowers, ['tiburon_joven'], 'burrow should be on tiburon_joven only');
  const def = ENEMY_TYPES.tiburon_joven;
  assert.ok(def.movement.submergeMs > 0, 'tiburon_joven burrow needs submergeMs');
  assert.ok(def.movement.emergeMs > 0, 'tiburon_joven burrow needs emergeMs');
});

// ── 6. resist modifier — exactly tortuga_acorazada ───────────────────────────
test('resist modifier is on exactly tortuga_acorazada', () => {
  const hasResist = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'resist');
  const resisters = Object.keys(ENEMY_TYPES).filter(hasResist);
  assert.deepEqual(resisters, ['tortuga_acorazada'], 'resist should be on tortuga_acorazada only');
  const resistMod = ENEMY_TYPES.tortuga_acorazada.modifiers.find((m) => m.type === 'resist');
  assert.ok(resistMod.factor > 0 && resistMod.factor < 1, 'resist factor must be in (0, 1)');
});

// ── 7. Regression: Fire and generic keys still present ───────────────────────
test('Fire and generic enemy types are unaffected by Water roster addition', () => {
  const legacyKeys = ['villager', 'warrior', 'archer', 'acolito_brasa', 'lanzabrasas',
    'piromante', 'caballero_brasa', 'sacerdote_llama', 'portaestandarte',
    'larva_magma', 'can_lava', 'imp_brasa', 'totem_pira'];
  for (const k of legacyKeys) {
    assert.ok(ENEMY_TYPES[k], `Regression: ENEMY_TYPES missing legacy key '${k}'`);
  }
});
```

- [ ] **Step 2: Run the new test file**

```bash
node --test tests/waterRoster.test.js
```

Expected: all 7 tests pass, 0 failures.

> Note on wave-type tests (tests 2 and 3): these tests check wave phases via `phase.wave.spawns`. Verify against `src/data/levelBuilder.js`'s `buildPhase` output shape — if the wave object is stored under a different field (e.g. `phase.spawns` directly), update the accessor in the test to match. The test logic is correct; only the path to `spawns` may need adjusting after inspecting `buildPhase`.

- [ ] **Step 3: Run the full test suite**

```bash
node --test
```

Expected: all tests pass (0 failures). Confirms the Water addition is fully additive and no Fire/generic/campaign/economy/skill-tree behavior changed.

- [ ] **Step 4: Commit**

```bash
git add tests/waterRoster.test.js
git commit -m "test(water): assert Water roster registration, wave type resolution, mechanic placement"
```

---

### Task 7: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite one final time**

```bash
node --test
```

Expected: all tests pass. Zero failures. Output should include `waterRoster.test.js` passing all 7 tests alongside all pre-existing test files.

- [ ] **Step 2: Spot-check the `levelBuilder.js` wave-phase shape**

```bash
node --input-type=module <<'EOF'
import { makeLevel } from './src/data/levelBuilder.js';
// Use a known-good water wave to confirm the phase shape
const waves = [
  { spawnDelay: 700, spawns: [{ type: 'ahogado', count: 4 }] },
  { spawnDelay: 650, spawns: [{ type: 'acolito_escarcha', count: 2 }] },
];
const lv = makeLevel('water_1', 'water', 'basic', { waves });
const wavePhases = lv.phases.filter((p) => p.type === 'wave');
console.log('wave phase keys:', Object.keys(wavePhases[0]).join(', '));
// Confirm how spawns are accessed so tests use the correct path
const firstWave = wavePhases[0];
const spawnsPath = firstWave.wave ? 'phase.wave.spawns' : 'phase.spawns';
console.log('spawns path:', spawnsPath, '→', JSON.stringify(firstWave.wave ? firstWave.wave.spawns : firstWave.spawns));
EOF
```

Expected: prints the wave phase shape. Use output to confirm or correct the spawns-path in `waterRoster.test.js` if needed (see Task 6 Step 2 note).

- [ ] **Step 3: Confirm Water region structure in REGIONS**

```bash
node --input-type=module <<'EOF'
import { REGIONS } from './src/data/regions.js';
const w = REGIONS.water;
console.log('water.name:', w.name);
console.log('water.grantsSkill:', w.grantsSkill);
console.log('water levels:', w.levels.length);
console.log('level kinds:', w.levels.map((l) => l.kind).join(', '));
// Confirm levels 1–3 are basic, 4–6 intermediate, 7 levelboss, 8 temple
const kinds = w.levels.map((l) => l.kind);
const expected = ['basic','basic','basic','intermediate','intermediate','intermediate','levelboss','temple'];
if (JSON.stringify(kinds) !== JSON.stringify(expected)) throw new Error('kinds mismatch: ' + kinds);
console.log('Water region structure OK');
EOF
```

Expected: prints structure and `Water region structure OK`.

- [ ] **Step 4: Final commit if any fixes were needed; otherwise done**

```bash
# If corrections were made to test accessor paths:
git add tests/waterRoster.test.js
git commit -m "fix(water): correct wave-phase spawns accessor path in waterRoster tests"
# Otherwise no commit needed — all changes are already committed in Tasks 1–6.
```

---

## Scope boundaries for this plan

**In scope (Plan 2):**
- `config.js` — 16 new Water COLORS entries.
- `src/data/enemies/water.js` — 20 creature definitions (21 entries including `medusa_cria`).
- `src/data/enemies/index.js` — `WATER_ENEMIES` spread into `ENEMY_TYPES`.
- `src/data/regions.js` — `waterWaves(tier)` + `waterInterWaves(tier)` + wired into `REGIONS.water`.
- `tests/waterRoster.test.js` — 7 registration/placement/regression tests.

**Explicitly out of scope (Plan 3 — Water Bosses):**
- `src/data/bosses/water.js` — Soldado de Hielo, Sapo Desovador, Tiburón Abisal, Kraken, Dama del Lago.
- Boss wiring in `makeBranch` for `REGIONS.water` (`minibosses`, `levelBosses`, `templeBoss`).
- The `TODO(Plan 3)` comment in `REGIONS.water` marks exactly where Plan 3 plugs in.

**Requires Plan 1 (engine pieces) before executing:**
- `{ type: 'onHitSlow' }` modifier handler in `GameScene` + `Caster.moveBy`.
- `{ type: 'burrow', ... }` movement in `EnemyBrain.MOVEMENTS`.
- `{ type: 'splitsOnDeath', ... }` modifier handler in `GameScene.onEnemyDeath`.
- `{ type: 'resist', factor }` modifier on `Enemy` (damage reduction in `hitEnemy`).
- Without Plan 1, the `water.js` defs will load fine (they are inert data), but the mechanics won't fire in gameplay.
