# Air Roster & Waves — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 20-creature Air world roster and Air-specific wave functions (basic + intermediate) wired into `REGIONS.air`, implementing the spec §3.5 intro calendar and §5 wave-composition rule (anchor + filler + mobility threat). One small Phaser wiring task makes ranged `stun`/`lift`/`push` attack flags reach the caster handlers built in Plan 1.

**Architecture:** Pure-data files grow. `src/config.js` gets new COLORS keys for the stormy-night/vampire palette; a new `src/data/enemies/air.js` holds the 20 recipes in the same shape as `water.js`; `src/data/enemies/index.js` spreads `AIR_ENEMIES` into `ENEMY_TYPES`; and `src/data/regions.js` gains `airWaves(tier)` / `airInterWaves(tier)` functions passed as `basic`/`inter` to the `REGIONS.air` `makeBranch` call. One Phaser-coupled task extends `GameScene.executeAttack` to copy an attack's `stun`/`lift`/`push` flags onto the spawned enemy shot (`shot.stunMs` / `shot.liftKind` / `shot.pushForce` / `shot.pushMs`), which the caster/enemyShots overlap handler from Plan 1 already reads. Boss wiring is deferred to Plan 3 — this plan leaves a clear TODO comment. All enemy decision logic already lives in `EnemyBrain` and the new modifiers/movement/flags are wired in Plan 1; this plan only adds declarative recipes, wave tables, and the one projectile-flag copy.

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN), node:test for pure logic.

**Spec:** docs/superpowers/specs/2026-06-17-air-world-design.md
**Depends on:** Plan 1 (air-1-engine-pieces) — `drain`, `onHitStun` (`kind:'stun'|'lift'`), `onHitPush`, the `evade` movement, the `flying`/`untargetable` flags, plus reused `reviveOnce`/`shielded`/`healAllies`/`auraDamage` must exist (caster CC/push/drain handlers, `MOVEMENTS.evade`, `isFlying`, the `untargetable` skip).

## Global Constraints

- No build step, no bundler: native ES modules + Phaser 3 from CDN. (CLAUDE.md)
- Mobile-only, portrait. Logical resolution fixed at 480×854 (`GAME_WIDTH`/`GAME_HEIGHT` in `src/config.js`). Time fields in ms; lower is better.
- Pure/Phaser split: testable logic lives in `src/systems/` or `src/data/` with **no Phaser import** and is covered by `node --test`. `src/scenes/` and `src/objects/` are Phaser-coupled (verified by playtest).
- Texture/color keys are centralized in `src/config.js` (`TEX`, `COLORS`); reference them, never inline a key or hex.
- Tests use `node:test` + `node:assert/strict`. Run a single file with `node --test tests/<file>`; the whole suite with `node --test`.

---

### Task 1: New COLORS keys for Air in `config.js`

**Files:**
- Modify: `src/config.js`

Air uses geometric art (same approach as Fire/Water): reuse the existing TEX shape keys (`TEX.archer` circle, `TEX.villager` circle, `TEX.warrior` diamond/armored) with new stormy-night/vampire tints. No new TEX keys are needed for this plan (the oversized Elemental texture and boss keys are Plan 3). `COLORS.lightning` (`0xfff176`) already exists and is reused for electric attacks. Only new COLORS entries are added.

**TEX shape reuse mapping (Air creature group → existing TEX key):**

| Air creature group | TEX shape to reuse | Reason |
|---|---|---|
| Vampire humanoids (Siervo, Duelista, Acólito, Heraldo, Sacerdote, Guardia, Hechicero, Vástago) | `TEX.villager` / `TEX.archer` / `TEX.warrior` | Same silhouettes as Fire/Water humanoids; warrior for the armored Guardia |
| Flyers (Murciélago, Arpía, Espíritu, Fuego Fatuo, Vampiro Alado) | `TEX.archer` / `TEX.villager` | Slim/small fast circles |
| Ambient / turret (Gárgola, Centinela, Torbellino, Tronador) | `TEX.warrior` / `TEX.archer` | Static landmark diamond + ranged circle |
| Ritual fodder (Cultista, Canalizador, Guardián del Rito) | `TEX.villager` | Small humanoid circle |

- [ ] **Step 1: Add Air COLORS to `src/config.js`**

In `src/config.js`, add these entries to the `COLORS` object immediately after the Water world palette block (after the `toadEgg` entry, before `healthBack`):

```js
  // Air world palette (storm greys, electric yellows, blood reds, bat purples)
  stormGrey: 0x607d8b,      // Acólito/Heraldo/Espíritu/Tronador — slate storm-cloud blue-grey
  stormDark: 0x37474f,      // Hechicero del Viento, Guardia Nocturno — darker thundercloud
  bloodRed: 0xb71c1c,       // Sacerdote de Sangre, Vampiro Alado — deep arterial red
  vampPale: 0xd7a3a3,       // Siervo de la Torre, Vástago Vampírico — pale corpse-flushed skin
  duelistSteel: 0x90a4ae,   // Duelista Nocturno — cold blued-steel grey
  batPurple: 0x6a1b9a,      // Murciélago — deep bat purple
  harpyPlum: 0x8e24aa,      // Arpía — brighter plum (winged)
  wispYellow: 0xffee58,     // Fuego Fatuo — eerie electric will-o'-the-wisp yellow
  gargoyleStone: 0x546e7a,  // Gárgola Pararrayos — wet lightning-rod stone
  sentinelStone: 0x78909c,  // Centinela de Piedra — paler statue grey
  whirlGrey: 0xb0bec5,      // Torbellino Errante — pale dust-devil grey
  cultRobe: 0x4a148c,       // Cultista, Cultista Canalizador, Guardián del Rito — dark ritual purple
```

After adding, the `COLORS` object's Air section should match the Fire/Water sections — one line per key, consistent comment style.

- [ ] **Step 2: Verify config loads cleanly**

```bash
node --input-type=module <<'EOF'
import { COLORS } from './src/config.js';
const airKeys = ['stormGrey','stormDark','bloodRed','vampPale','duelistSteel','batPurple','harpyPlum','wispYellow','gargoyleStone','sentinelStone','whirlGrey','cultRobe'];
airKeys.forEach(k => { if (COLORS[k] === undefined) throw new Error('Missing COLORS.' + k); });
if (COLORS.lightning === undefined) throw new Error('expected reused COLORS.lightning');
console.log('config OK – ' + airKeys.length + ' Air COLORS registered (+ reused lightning)');
EOF
```

Expected output: `config OK – 12 Air COLORS registered (+ reused lightning)`

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(air): add Air world COLORS palette keys to config"
```

---

### Task 2: Wire `stun`/`lift`/`push` attack flags onto enemy shots in `executeAttack`

**Files:**
- Modify: `src/scenes/GameScene.js`

Plan 1 wired the caster/enemyShots overlap handler to read `shot.stunMs` / `shot.liftKind` / `shot.pushForce` / `shot.pushMs`, but nothing sets them yet. Ranged Air enemies (Heraldo del Rayo's stun bolt, Hechicero del Viento's lift "tornadito", the Bruja's stun shots in Plan 3) mark their attack with a `stun`/`lift`/`push` flag; this task copies those flags onto the spawned enemy shot inside `executeAttack`. Melee `onHitStun`/`onHitPush`/`drain` already work via the caster-vs-enemies contact handler (Plan 1) using the def modifier — no change needed for those. Phaser-coupled — verified by playtest.

The relevant projectile-spawn loop in `executeAttack` currently ends each iteration with the burn/slow/dot effect assignment (around lines 596–610 of `src/scenes/GameScene.js`):

```js
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      const shot = this.enemyShots.fire(spec.tex, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
      if (!shot) continue;
      shot.setTint(spec.tint); // disparos enemigos distinguibles del orbe cian del jugador
      if (p.big) {
        shot.setDisplaySize(60, 60);                 // bola enorme reusando TEX.fireball (32px)
        if (shot.body) shot.body.setCircle(28); // hitbox grande
      }
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; shot.homingLife = HOMING_TTL_MS; }
      if (eff && eff.kind === 'burn') { shot.burnDps = burnMod?.dps ?? eff.dps; shot.burnMs = burnMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'slow') { shot.slowFactor = slowMod?.factor ?? eff.factor; shot.slowMs = slowMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'dot') { shot.poisonDps = eff.dps; shot.poisonMs = eff.ms; }
    }
```

- [ ] **Step 1: Add the stun/lift/push flag copy** — in `src/scenes/GameScene.js`, inside that `for (const p of projs)` loop, add these lines right after the `else if (eff && eff.kind === 'dot')` line (still inside the loop body, before the closing `}` of the `for`):

```js
      // Air: ranged control-loss. Copy the attack's stun/lift/push flags onto the
      // shot so the caster/enemyShots overlap handler (Plan 1) can apply them.
      if (att.lift) { shot.stunMs = att.liftMs ?? CASTER_LIFT_MS; shot.liftKind = true; }
      else if (att.stun) { shot.stunMs = att.stunMs ?? CASTER_STUN_MS; shot.liftKind = false; }
      if (att.push) { shot.pushForce = att.pushForce ?? PUSH_FORCE; shot.pushMs = att.pushMs ?? PUSH_MS; }
```

- [ ] **Step 2: Import the tuning fallbacks** — ensure `CASTER_STUN_MS`, `CASTER_LIFT_MS`, `PUSH_FORCE`, `PUSH_MS` are imported in `src/scenes/GameScene.js`. Find the existing import from `'../data/tuning.js'` (it already imports tuning constants such as `HOMING_TTL_MS`) and add these four names to it. If no tuning import exists near the top, add one:

```js
import { CASTER_STUN_MS, CASTER_LIFT_MS, PUSH_FORCE, PUSH_MS } from '../data/tuning.js';
```

> Note: those four constants were added to `src/data/tuning.js` by Plan 1 (Task 1). The `att.lift` branch uses `liftKind: true` so the Plan 1 handler routes it to `applyCasterCc(..., 'lift', ...)`; `att.stun` uses `liftKind: false` → `'stun'`. `att.push` sets the impulse fields. Defaults fall back to the tuning constants when an attack omits an explicit ms/force.

- [ ] **Step 3: Run the full suite (no logic regression)**

```bash
node --test
```

Expected: all tests pass (this is additive Phaser wiring; no test touches `executeAttack`).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): copy attack stun/lift/push flags onto enemy shots in executeAttack"
```

> Playtest item (Plan 3 / when defs land): a Heraldo del Rayo bolt briefly stuns (0.3 s); a Hechicero del Viento "tornadito" briefly lifts (0.5 s); the anti-chain immunity window (Plan 1) prevents perma-lock.

---

### Task 3: `src/data/enemies/air.js` — vampire humanoids (#1–8)

**Files:**
- Create: `src/data/enemies/air.js`

Write the first roster block: the 8 vampire humanoids (spec §3.1). All stat numbers are taken **verbatim from spec §3** (HP/Spd/Dmg/R columns). Mechanics used here are all Plan 1 pieces: `drain` (lifesteal), the `evade` movement, ranged `lift`/`stun` attack flags (consumed by Task 2's `executeAttack` wiring), plus reused `healAllies`, `shielded`, and `reviveOnce`.

- [ ] **Step 1: Create `src/data/enemies/air.js` with creatures #1–8**

```js
import { COLORS, TEX } from '../../config.js';

// Air world roster (20). Velocity + displacement: fast flyers, dueling dashers,
// gusts that push/lift/stun, and vampiric drain that punishes contact. Projectile
// density is lower than Fire. Stat numbers are from spec §3; tune in playtest.
export const AIR_ENEMIES = {
  // === Humanoides vampiros (por tierra; les afecta el terreno) — nv1–7 ===

  // #1 — Siervo de la Torre: fast melee filler that heals on contact (drain).
  siervo_torre: { key: 'siervo_torre', tex: TEX.villager, color: COLORS.vampPale,
    hp: 24, speed: 95, damage: 9, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 4 }] },

  // #2 — Duelista Nocturno: evade movement — dashes to dodge your orbs, hit-and-run dashStrike + drain.
  duelista_nocturno: { key: 'duelista_nocturno', tex: TEX.archer, color: COLORS.duelistSteel,
    hp: 30, speed: 120, damage: 12, radius: 16,
    movement: { type: 'evade', range: 120 },
    attacks: [{ type: 'dashStrike' }],
    modifiers: [{ type: 'drain', heal: 5 }] },

  // #3 — Acólito del Trueno: base ranged. Kites and fires straight lightning bolts.
  acolito_trueno: { key: 'acolito_trueno', tex: TEX.archer, color: COLORS.stormGrey,
    hp: 22, speed: 70, damage: 8, radius: 16,
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 240 }] },

  // #4 — Heraldo del Rayo: ranged stun. Kites and fires a bolt that briefly stuns (0.3 s).
  heraldo_rayo: { key: 'heraldo_rayo', tex: TEX.archer, color: COLORS.stormGrey,
    hp: 24, speed: 66, damage: 7, radius: 16,
    movement: { type: 'kite', range: 220 },
    attacks: [{ type: 'shootStraight', stun: true, every: 2200, speed: 230 }] },

  // #5 — Sacerdote de Sangre: healer, kill-priority. Strafes with the pack, never attacks.
  sacerdote_sangre: { key: 'sacerdote_sangre', tex: TEX.villager, color: COLORS.bloodRed,
    hp: 95, speed: 72, damage: 10, radius: 16,
    movement: { type: 'strafe', range: 190 },
    attacks: [],
    modifiers: [{ type: 'healAllies', hps: 12, radius: 140 }] },

  // #6 — Guardia Nocturno: fast shielded bruiser; charges, drains, soaks damage.
  guardia_nocturno: { key: 'guardia_nocturno', tex: TEX.warrior, color: COLORS.stormDark,
    hp: 150, speed: 90, damage: 16, radius: 20,
    movement: { type: 'charge', windup: 500, dash: 360, recover: 600, dashMul: 3.0 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 6 }, { type: 'shielded', reduce: 0.4 }] },

  // #7 — Hechicero del Viento: ranged lift. Kites and conjures a "tornadito" that lifts (0.5 s).
  hechicero_viento: { key: 'hechicero_viento', tex: TEX.archer, color: COLORS.stormDark,
    hp: 60, speed: 65, damage: 8, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootStraight', lift: true, every: 2600, speed: 210 }] },

  // #8 — Vástago Vampírico: chases, drains, and RISES ONCE (reviveOnce) — forces a finishing blow.
  vastago_vampirico: { key: 'vastago_vampirico', tex: TEX.villager, color: COLORS.vampPale,
    hp: 42, speed: 85, damage: 11, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 5 }, { type: 'reviveOnce' }] },
};
```

- [ ] **Step 2: Quick smoke-test (node import)**

```bash
node --input-type=module <<'EOF'
import { AIR_ENEMIES } from './src/data/enemies/air.js';
const keys = Object.keys(AIR_ENEMIES);
console.log('air.js loads, humanoids #1–8:', keys.join(', '));
if (keys.length !== 8) throw new Error('expected 8, got ' + keys.length);
EOF
```

Expected: prints 8 creature keys, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies/air.js
git commit -m "feat(air): add Air roster — vampire humanoids #1–8"
```

---

### Task 4: `src/data/enemies/air.js` — flyers (#9–13)

**Files:**
- Modify: `src/data/enemies/air.js`

Add the 5 flyers (spec §3.2). Every one carries the `flying: true` flag (Plan 1) — they ignore ground hazards (the tornado-ojo) and tend to move fast/erratic. Mechanics: `drain`, `auraDamage` + `onHitStun` (Fuego Fatuo — touching it stuns 0.3 s). Murciélago is the cheap swarm chain-target for Lightning (hp 20).

- [ ] **Step 1: Append creatures #9–13 to the `AIR_ENEMIES` object in `air.js`**

In `src/data/enemies/air.js`, add these entries into the `AIR_ENEMIES` object (after `vastago_vampirico`):

```js
  // === Voladores (flying: inmunes al terreno, rápidos/erráticos) — nv1–6 ===

  // #9 — Murciélago: erratic swarm flyer + drain. Cheap, fast — the big chain target for Lightning.
  murcielago: { key: 'murcielago', tex: TEX.villager, color: COLORS.batPurple,
    hp: 20, speed: 130, damage: 6, radius: 14,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 3 }] },

  // #10 — Arpía: dive-bomb flyer. Charges in then dashStrikes.
  arpia: { key: 'arpia', tex: TEX.archer, color: COLORS.harpyPlum,
    hp: 40, speed: 110, damage: 13, radius: 16,
    flying: true,
    movement: { type: 'charge', windup: 450, dash: 320, recover: 500, dashMul: 3.2 },
    attacks: [{ type: 'dashStrike' }] },

  // #11 — Espíritu de Tormenta: ranged flyer. Drifts erratically, fires straight lightning.
  espiritu_tormenta: { key: 'espiritu_tormenta', tex: TEX.archer, color: COLORS.stormGrey,
    hp: 30, speed: 80, damage: 8, radius: 16,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'shootStraight', every: 1800, speed: 240 }] },

  // #12 — Fuego Fatuo: erratic flyer with a damage aura; brushing it stuns you (0.3 s). No direct attack.
  fuego_fatuo: { key: 'fuego_fatuo', tex: TEX.villager, color: COLORS.wispYellow,
    hp: 26, speed: 75, damage: 8, radius: 14,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 9, radius: 42 }, { type: 'onHitStun', kind: 'stun', ms: 300 }] },

  // #13 — Vampiro Alado: heavy dive flyer. Charges, dashStrikes, drains hard (+8).
  vampiro_alado: { key: 'vampiro_alado', tex: TEX.archer, color: COLORS.bloodRed,
    hp: 120, speed: 100, damage: 18, radius: 19,
    flying: true,
    movement: { type: 'charge', windup: 500, dash: 340, recover: 550, dashMul: 3.0 },
    attacks: [{ type: 'dashStrike' }],
    modifiers: [{ type: 'drain', heal: 8 }] },
```

- [ ] **Step 2: Verify the flyers carry the flag and Fuego Fatuo's stun**

```bash
node --input-type=module <<'EOF'
import { AIR_ENEMIES } from './src/data/enemies/air.js';
const keys = Object.keys(AIR_ENEMIES);
if (keys.length !== 13) throw new Error('expected 13 (8 + 5 flyers), got ' + keys.length);
const flyers = keys.filter(k => AIR_ENEMIES[k].flying === true);
console.log('flyers:', flyers.join(', '));
const expected = ['murcielago','arpia','espiritu_tormenta','fuego_fatuo','vampiro_alado'];
if (JSON.stringify(flyers) !== JSON.stringify(expected)) throw new Error('flyer set wrong: ' + flyers);
const wisp = AIR_ENEMIES.fuego_fatuo.modifiers.find(m => m.type === 'onHitStun');
if (!wisp || wisp.kind !== 'stun' || wisp.ms !== 300) throw new Error('Fuego Fatuo onHitStun wrong');
console.log('5 flyers OK; Fuego Fatuo stuns (kind=stun, ms=300).');
EOF
```

Expected: lists 5 flyers, confirms Fuego Fatuo's stun. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies/air.js
git commit -m "feat(air): add Air roster — flyers #9–13 (flying flag, bats/harpies/wisps)"
```

---

### Task 5: `src/data/enemies/air.js` — ambient/turret + ritual fodder (#14–20)

**Files:**
- Modify: `src/data/enemies/air.js`

Add the final block: 4 ambient/turret creatures (spec §3.3) and 3 ritual fodder (spec §3.4). Mechanics: the Gárgola is a `static` nova turret whose bolts stun (`onHitStun`) and is `shielded(0.25)`; the Centinela is a `static` homing turret; the Torbellino Errante deals **0 damage** but pushes + lifts (`onHitPush` + ranged `lift` via the `att.lift` flag is N/A here — it is a contact hazard, so it carries the `onHitPush` modifier and an `onHitStun` of `kind:'lift'`); the Tronador kites a 3-bolt spread. The ritual fodder are plain summon targets for the nv7 boss (Plan 3) — the Cultista Canalizador is `static` with no attack but is **not** `untargetable` (only the leader is, in Plan 3).

> Spec §3.3 lists Torbellino Errante as `onHitPush` + `lift (0.5 s)`. Since it never fires a projectile (no attack), both effects are **contact** effects: `{ type:'onHitPush', force, ms }` and `{ type:'onHitStun', kind:'lift', ms:500 }`, both applied by the caster-vs-enemies contact handler from Plan 1.

- [ ] **Step 1: Append creatures #14–20 to the `AIR_ENEMIES` object in `air.js`**

In `src/data/enemies/air.js`, add these entries into the `AIR_ENEMIES` object (after `vampiro_alado`):

```js
  // === Ambientales / torreta — nv3–7 ===

  // #14 — Gárgola Pararrayos: static turret. Lightning nova whose bolts stun (0.3 s); shielded.
  gargola_pararrayos: { key: 'gargola_pararrayos', tex: TEX.warrior, color: COLORS.gargoyleStone,
    hp: 250, speed: 0, damage: 8, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'nova', count: 8, every: 3200, speed: 200, telegraph: 550, stun: true }],
    modifiers: [{ type: 'shielded', reduce: 0.25 }] },

  // #15 — Centinela de Piedra: static homing turret. Fixed hazard that tracks you.
  centinela_piedra: { key: 'centinela_piedra', tex: TEX.warrior, color: COLORS.sentinelStone,
    hp: 60, speed: 0, damage: 10, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'shootHoming', every: 2600, speed: 120, telegraph: 350 }] },

  // #16 — Torbellino Errante: 0-damage ambient hazard. Pushes you and briefly lifts (0.5 s) on contact.
  torbellino_errante: { key: 'torbellino_errante', tex: TEX.archer, color: COLORS.whirlGrey,
    hp: 40, speed: 50, damage: 0, radius: 20,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'onHitPush', force: 220, ms: 250 }, { type: 'onHitStun', kind: 'lift', ms: 500 }] },

  // #17 — Tronador: kite spread ranged. Area-denial — 3 lightning bolts in a 36° arc.
  tronador: { key: 'tronador', tex: TEX.archer, color: COLORS.stormGrey,
    hp: 30, speed: 64, damage: 8, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootSpread', count: 3, arc: 36, every: 1900, speed: 230 }] },

  // === Fodder del ritual (nv7) — summoned by the cultist leader (Plan 3) ===

  // #18 — Cultista: cheap melee filler for the ritual waves.
  cultista: { key: 'cultista', tex: TEX.villager, color: COLORS.cultRobe,
    hp: 16, speed: 60, damage: 7, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  // #19 — Cultista Canalizador: static, no attack — feeds the rite. Targetable fodder
  // (only the LEADER is untargetable, in Plan 3); killing it does NOT stop the ritual.
  cultista_canalizador: { key: 'cultista_canalizador', tex: TEX.villager, color: COLORS.cultRobe,
    hp: 14, speed: 0, damage: 0, radius: 16,
    movement: { type: 'static' },
    attacks: [] },

  // #20 — Guardián del Rito: chases to defend the leader (invoked).
  guardian_rito: { key: 'guardian_rito', tex: TEX.villager, color: COLORS.cultRobe,
    hp: 18, speed: 70, damage: 8, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },
```

- [ ] **Step 2: Verify the full file imports with all 20 entries + mechanic placement**

```bash
node --input-type=module <<'EOF'
import { AIR_ENEMIES } from './src/data/enemies/air.js';
const keys = Object.keys(AIR_ENEMIES);
console.log('Total air entries:', keys.length, '-', keys.join(', '));
if (keys.length !== 20) throw new Error('expected 20, got ' + keys.length);

// drain only on the intended vampires/bats
const drainers = keys.filter(k => (AIR_ENEMIES[k].modifiers || []).some(m => m.type === 'drain')).sort();
const expDrain = ['duelista_nocturno','guardia_nocturno','murcielago','siervo_torre','vampiro_alado','vastago_vampirico'];
if (JSON.stringify(drainers) !== JSON.stringify(expDrain)) throw new Error('drain set wrong: ' + drainers);

// reviveOnce only on Vástago
const revivers = keys.filter(k => (AIR_ENEMIES[k].modifiers || []).some(m => m.type === 'reviveOnce'));
if (JSON.stringify(revivers) !== JSON.stringify(['vastago_vampirico'])) throw new Error('reviveOnce wrong: ' + revivers);

// onHitPush only on Torbellino
const pushers = keys.filter(k => (AIR_ENEMIES[k].modifiers || []).some(m => m.type === 'onHitPush'));
if (JSON.stringify(pushers) !== JSON.stringify(['torbellino_errante'])) throw new Error('onHitPush wrong: ' + pushers);

// evade movement only on Duelista
const evaders = keys.filter(k => AIR_ENEMIES[k].movement && AIR_ENEMIES[k].movement.type === 'evade');
if (JSON.stringify(evaders) !== JSON.stringify(['duelista_nocturno'])) throw new Error('evade wrong: ' + evaders);

// Torbellino does 0 damage
if (AIR_ENEMIES.torbellino_errante.damage !== 0) throw new Error('Torbellino must be 0 damage');
// Canalizador is NOT untargetable here
if (AIR_ENEMIES.cultista_canalizador.untargetable) throw new Error('Canalizador must not be untargetable (only the leader is)');
console.log('All mechanic-placement checks passed.');
EOF
```

Expected: prints 20 keys, confirms drain×6, reviveOnce/onHitPush/evade singletons, Torbellino 0-dmg, Canalizador not untargetable. No errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/enemies/air.js
git commit -m "feat(air): add Air roster — ambient/turret #14–17 + ritual fodder #18–20"
```

---

### Task 6: Register the Air roster in `src/data/enemies/index.js`

**Files:**
- Modify: `src/data/enemies/index.js`

- [ ] **Step 1: Add the Air import and spread**

In `src/data/enemies/index.js`, add the `AIR_ENEMIES` import alongside the existing `FIRE_ENEMIES`/`WATER_ENEMIES` imports, and spread it into `ENEMY_TYPES`:

```js
import { COLORS, TEX } from '../../config.js';
import { FIRE_ENEMIES } from './fire.js';
import { WATER_ENEMIES } from './water.js';
import { AIR_ENEMIES } from './air.js';
```

And update the final export line:

```js
export const ENEMY_TYPES = { ...GENERIC, ...FIRE_ENEMIES, ...WATER_ENEMIES, ...AIR_ENEMIES };
```

(Leave the `GENERIC` block unchanged.)

- [ ] **Step 2: Verify ENEMY_TYPES contains all 20 Air creatures**

```bash
node --input-type=module <<'EOF'
import { ENEMY_TYPES } from './src/data/enemies/index.js';
const airKeys = [
  'siervo_torre','duelista_nocturno','acolito_trueno','heraldo_rayo','sacerdote_sangre',
  'guardia_nocturno','hechicero_viento','vastago_vampirico','murcielago','arpia',
  'espiritu_tormenta','fuego_fatuo','vampiro_alado','gargola_pararrayos','centinela_piedra',
  'torbellino_errante','tronador','cultista','cultista_canalizador','guardian_rito',
];
airKeys.forEach(k => { if (!ENEMY_TYPES[k]) throw new Error('ENEMY_TYPES missing: ' + k); });
console.log('ENEMY_TYPES: all', airKeys.length, 'Air entries resolved OK');
// Confirm Fire + Water + generic still intact
['villager','warrior','archer','acolito_brasa','ahogado','medusa'].forEach(k => {
  if (!ENEMY_TYPES[k]) throw new Error('ENEMY_TYPES missing legacy key: ' + k);
});
console.log('Fire + Water + generic keys still present — no regression');
EOF
```

Expected: both success lines, no errors.

- [ ] **Step 3: Run the existing test suite to confirm no regression**

```bash
node --test
```

Expected: all tests pass (0 failures). The change is additive (a spread into `ENEMY_TYPES`).

- [ ] **Step 4: Commit**

```bash
git add src/data/enemies/index.js
git commit -m "feat(air): register Air roster in ENEMY_TYPES"
```

---

### Task 7: Air wave functions in `src/data/regions.js`

**Files:**
- Modify: `src/data/regions.js`

Implement `airWaves(tier)` and `airInterWaves(tier)` following the `waterWaves`/`waterInterWaves` pattern, then wire them as `basic`/`inter` into the `REGIONS.air` `makeBranch` call. Composition rule (spec §5): *anchor* (a Hechicero del Viento or Sacerdote de Sangre that defines the puzzle) + *filler* (Siervos/Murciélagos) + *one mobility threat* (a Duelista that dodges or a Vampiro Alado that dives). Intro calendar from spec §3.5 determines which creature types appear per tier.

**§3.5 calendar mapped to tier** (`makeBranch` calls `basic(1)`, `basic(2)`, `basic(3)` for nv1–3 and `inter(2)`, `inter(3)`, `inter(4)` for nv4–6; nv7 ritual fodder and all bosses are Plan 3):

| Tier | Level | Creatures available (cumulative) |
|------|-------|----------------------------------|
| basic 1 | Nv1 | siervo_torre, murcielago, acolito_trueno |
| basic 2 | Nv2 | + duelista_nocturno, heraldo_rayo, espiritu_tormenta |
| basic 3 | Nv3 | + arpia, tronador, centinela_piedra |
| inter 2 | Nv4 | + guardia_nocturno, fuego_fatuo, gargola_pararrayos |
| inter 3 | Nv5 | + vastago_vampirico, torbellino_errante |
| inter 4 | Nv6 | + vampiro_alado |

- [ ] **Step 1: Add `airWaves` and `airInterWaves` functions**

In `src/data/regions.js`, add these two functions after `waterInterWaves` (before the `REGIONS` object / the `makeBranch` definitions). They use the existing `wave(spawnDelay, spawns)` and `ramp(base, tier)` helpers at the top of the file:

```js
// Air waves: velocity + displacement (fast flyers, dueling dashers, gusts).
// Composition rule (spec §5) — anchor (Hechicero/Sacerdote that defines the puzzle)
//                  + filler (Siervos/Murciélagos)
//                  + one mobility threat (a Duelista that dodges or a diving Alado).
// Tier 1 = only nv1 introductory creatures; tiers 2–3 add dashers + flyers + turret.
// See spec §3.5 intro calendar.
function airWaves(tier) {
  if (tier === 1) {
    // Nv1: Siervo filler + Murciélago swarm + Acólito (ranged anchor). No threat yet.
    return [
      wave(700, [{ type: 'siervo_torre', count: ramp(4, tier) }, { type: 'acolito_trueno', count: ramp(2, tier) }]),
      wave(650, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(3, tier) }]),
      wave(600, [{ type: 'acolito_trueno', count: ramp(2, tier) }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    // Nv2: introduce Duelista (mobility threat), Heraldo (ranged stun), Espíritu (flyer).
    return [
      wave(670, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'heraldo_rayo', count: tier }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(630, [{ type: 'duelista_nocturno', count: 1 }, { type: 'acolito_trueno', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: ramp(2, tier) }]),
      wave(580, [{ type: 'heraldo_rayo', count: tier }, { type: 'duelista_nocturno', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  // Tier 3: Nv3 — introduce Arpía (dive-bomb), Tronador (area denial), Centinela (homing turret).
  return [
    wave(640, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'tronador', count: tier }, { type: 'arpia', count: ramp(2, tier) }]),
    wave(600, [{ type: 'centinela_piedra', count: 1 }, { type: 'heraldo_rayo', count: tier }, { type: 'murcielago', count: ramp(3, tier) }]),
    wave(550, [{ type: 'duelista_nocturno', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'tronador', count: tier }, { type: 'siervo_torre', count: ramp(2, tier) }]),
  ];
}

function airInterWaves(tier) {
  if (tier <= 2) {
    // Nv4: introduce Guardia Nocturno (fast bruiser threat), Fuego Fatuo (stun aura flyer),
    // Gárgola Pararrayos (stun turret). Anchor = Heraldo. Filler = Siervos/Murciélagos.
    return [
      wave(580, [{ type: 'heraldo_rayo', count: tier }, { type: 'siervo_torre', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(530, [{ type: 'gargola_pararrayos', count: 1 }, { type: 'fuego_fatuo', count: tier }, { type: 'duelista_nocturno', count: 1 }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 3) {
    // Nv5 (spec §5 example): Hechicero del Viento (anchor: lifts you) + Murciélagos (filler/chain)
    // + Duelista Nocturno (evasive threat). Also introduce Vástago Vampírico, Torbellino Errante.
    return [
      wave(540, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'vastago_vampirico', count: tier }]),
      wave(490, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'torbellino_errante', count: 1 }, { type: 'heraldo_rayo', count: tier }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  // Tier 4 (inter(4) = Nv6): introduce Vampiro Alado (heavy diver). Anchor = Hechicero + Sacerdote.
  // Filler = Murciélagos/Siervos. Threat = Vampiro Alado + Duelista.
  return [
    wave(510, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'vampiro_alado', count: 1 }, { type: 'vastago_vampirico', count: tier }]),
    wave(460, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'torbellino_errante', count: 1 }]),
  ];
}
```

- [ ] **Step 2: Wire the functions into `REGIONS.air`**

In `src/data/regions.js`, update the `REGIONS.air` `makeBranch` call to pass the new wave functions and add a TODO for Plan 3 boss wiring (keep the narrative fields exactly as they are):

```js
  air: makeBranch({
    id: 'air', element: 'air', name: 'region.air.name', grantsSkill: 'lightning',
    basic: airWaves, inter: airInterWaves,
    // TODO(Plan 3): wire minibosses: [CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA],
    //              levelBoss: LIDER_CULTISTA (ritual, meter-driven), templeBoss: GALAHAD (forms).
    intro: [{ speaker: 'speaker.narrator', text: 'story.air.intro.0' }],
    mageName: 'speaker.mage.air',
    mageLines: [
      'story.air.mage.0',
      'story.air.mage.1',
    ],
  }),
```

- [ ] **Step 3: Run the existing regions test suite**

```bash
node --test tests/regions.test.js
```

Expected: all existing tests pass. The air region still uses default minibosses/level/temple bosses (the `mb`/`lb`/`tb` defaults from `makeBranch`) because Plan 3 hasn't wired them yet; the generic "all bosses are elite" assertions still hold against those defaults.

- [ ] **Step 4: Commit**

```bash
git add src/data/regions.js
git commit -m "feat(air): add airWaves/airInterWaves and wire into REGIONS.air"
```

---

### Task 8: Tests — roster validation + wave type resolution + mechanic placement

**Files:**
- Create: `tests/AirRoster.test.js`

Write the TDD anchor for the Air data. The wave-phase shape is `{ type: 'wave', spawnDelay, spawns }` — spawns live **directly on the phase** (`phase.spawns`), not `phase.wave.spawns` (confirmed against `src/data/levelBuilder.js` `buildPhase`).

- [ ] **Step 1: Create `tests/AirRoster.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_TYPES } from '../src/data/enemies/index.js';
import { AIR_ENEMIES } from '../src/data/enemies/air.js';
import { REGIONS } from '../src/data/regions.js';

// ── 1. Full roster registration ───────────────────────────────────────────────
const AIR_CREATURE_KEYS = [
  'siervo_torre', 'duelista_nocturno', 'acolito_trueno', 'heraldo_rayo', 'sacerdote_sangre',
  'guardia_nocturno', 'hechicero_viento', 'vastago_vampirico', 'murcielago', 'arpia',
  'espiritu_tormenta', 'fuego_fatuo', 'vampiro_alado', 'gargola_pararrayos', 'centinela_piedra',
  'torbellino_errante', 'tronador', 'cultista', 'cultista_canalizador', 'guardian_rito',
];

const KNOWN_MOVEMENTS = new Set([
  'chase', 'kite', 'flee', 'charge', 'orbit', 'strafe', 'erratic', 'static', 'zigzag', 'burrow', 'evade', 'holdAt',
]);
const KNOWN_MODIFIERS = new Set([
  'drain', 'onHitStun', 'onHitPush', 'auraDamage', 'healAllies', 'shielded', 'reviveOnce',
  'onHitSlow', 'onHitBurn', 'explodesOnDeath', 'splitsOnDeath', 'resist',
]);

test('air roster: exactly 20 creatures, all register in ENEMY_TYPES with matching key', () => {
  assert.equal(Object.keys(AIR_ENEMIES).length, 20, 'air.js must hold exactly 20 defs');
  assert.equal(AIR_CREATURE_KEYS.length, 20);
  for (const k of AIR_CREATURE_KEYS) {
    assert.ok(ENEMY_TYPES[k], `ENEMY_TYPES missing: ${k}`);
    assert.equal(ENEMY_TYPES[k].key, k, `key field must match object key for ${k}`);
  }
});

test('air roster: every def has required numeric fields and a valid color/tex', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const d = ENEMY_TYPES[k];
    for (const f of ['hp', 'speed', 'damage', 'radius']) {
      assert.ok(Number.isFinite(d[f]), `${k}.${f} must be a finite number`);
      assert.ok(d[f] >= 0, `${k}.${f} must be >= 0`);
    }
    assert.ok(typeof d.tex === 'string' && d.tex.length, `${k}.tex must be a tex key`);
    assert.ok(Number.isFinite(d.color), `${k}.color must be a hex number`);
  }
});

test('air roster: every movement.type is engine-supported', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const m = ENEMY_TYPES[k].movement;
    assert.ok(m && KNOWN_MOVEMENTS.has(m.type), `${k} has unsupported movement '${m && m.type}'`);
  }
});

test('air roster: every modifier type is known and flags are booleans', () => {
  for (const k of AIR_CREATURE_KEYS) {
    const d = ENEMY_TYPES[k];
    for (const mod of d.modifiers || []) {
      const type = typeof mod === 'string' ? mod : mod.type;
      assert.ok(KNOWN_MODIFIERS.has(type), `${k} has unknown modifier '${type}'`);
    }
    if ('flying' in d) assert.equal(typeof d.flying, 'boolean', `${k}.flying must be boolean`);
    if ('untargetable' in d) assert.equal(typeof d.untargetable, 'boolean', `${k}.untargetable must be boolean`);
  }
});

// ── 2. Wave type strings resolve ──────────────────────────────────────────────
// { type: 'wave', spawnDelay, spawns } — spawns live directly on the phase
// (phase.spawns), NOT phase.wave.spawns. Confirmed against levelBuilder.buildPhase.
test('airWaves tiers 1–3 (basic levels 0–2): every spawn type exists in ENEMY_TYPES', () => {
  const levels = REGIONS.air.levels;
  for (let i = 0; i < 3; i++) {
    for (const phase of levels[i].phases) {
      if (phase.type !== 'wave') continue;
      for (const s of phase.spawns) {
        assert.ok(ENEMY_TYPES[s.type], `airWaves: unknown type '${s.type}' in level index ${i}`);
      }
    }
  }
});

test('airInterWaves tiers 2–4 (intermediate levels 3–5): every spawn type exists in ENEMY_TYPES', () => {
  const levels = REGIONS.air.levels;
  for (let i = 3; i <= 5; i++) {
    for (const phase of levels[i].phases) {
      if (phase.type !== 'wave') continue;
      for (const s of phase.spawns) {
        assert.ok(ENEMY_TYPES[s.type], `airInterWaves: unknown type '${s.type}' in level index ${i}`);
      }
    }
  }
});

// ── 3. flying flag — exactly the five flyers ──────────────────────────────────
test('flying flag is on exactly the five flyers', () => {
  const flyers = AIR_CREATURE_KEYS.filter((k) => ENEMY_TYPES[k].flying === true).sort();
  assert.deepEqual(flyers, ['arpia', 'espiritu_tormenta', 'fuego_fatuo', 'murcielago', 'vampiro_alado']);
});

// ── 4. drain modifier — exactly the six vampires/bats ─────────────────────────
test('drain modifier is on exactly the intended six creatures', () => {
  const has = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'drain');
  const drainers = AIR_CREATURE_KEYS.filter(has).sort();
  assert.deepEqual(drainers, [
    'duelista_nocturno', 'guardia_nocturno', 'murcielago', 'siervo_torre', 'vampiro_alado', 'vastago_vampirico',
  ]);
});

// ── 5. evade movement — exactly Duelista Nocturno ─────────────────────────────
test('evade movement is on exactly duelista_nocturno', () => {
  const evaders = AIR_CREATURE_KEYS.filter((k) => ENEMY_TYPES[k].movement.type === 'evade');
  assert.deepEqual(evaders, ['duelista_nocturno']);
});

// ── 6. control-loss modifiers — onHitStun / onHitPush / reviveOnce placement ──
test('onHitStun (lift) is on Fuego Fatuo (stun) and Torbellino Errante (lift)', () => {
  const stunMod = (k) => (ENEMY_TYPES[k].modifiers || []).find((m) => m.type === 'onHitStun');
  assert.equal(stunMod('fuego_fatuo').kind, 'stun');
  assert.equal(stunMod('fuego_fatuo').ms, 300);
  assert.equal(stunMod('torbellino_errante').kind, 'lift');
  assert.equal(stunMod('torbellino_errante').ms, 500);
});

test('onHitPush is on exactly torbellino_errante; reviveOnce on exactly vastago_vampirico', () => {
  const hasPush = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'onHitPush');
  assert.deepEqual(AIR_CREATURE_KEYS.filter(hasPush), ['torbellino_errante']);
  const hasRevive = (k) => (ENEMY_TYPES[k].modifiers || []).some((m) => m.type === 'reviveOnce');
  assert.deepEqual(AIR_CREATURE_KEYS.filter(hasRevive), ['vastago_vampirico']);
  assert.equal(ENEMY_TYPES.torbellino_errante.damage, 0, 'Torbellino Errante deals 0 damage');
});

// ── 7. ranged control-loss attack flags (consumed by executeAttack, Task 2) ───
test('ranged stun/lift attack flags are set on Heraldo (stun) and Hechicero (lift)', () => {
  assert.ok(ENEMY_TYPES.heraldo_rayo.attacks.some((a) => a.stun === true), 'Heraldo bolt must carry stun:true');
  assert.ok(ENEMY_TYPES.hechicero_viento.attacks.some((a) => a.lift === true), 'Hechicero tornadito must carry lift:true');
  assert.ok(ENEMY_TYPES.gargola_pararrayos.attacks.some((a) => a.stun === true), 'Gárgola nova must carry stun:true');
});

// ── 8. untargetable — Canalizador is NOT untargetable (only the leader, Plan 3) ─
test('cultista_canalizador is plain fodder (not untargetable here)', () => {
  assert.ok(!ENEMY_TYPES.cultista_canalizador.untargetable, 'only the nv7 leader is untargetable (Plan 3)');
  assert.equal(ENEMY_TYPES.cultista_canalizador.movement.type, 'static');
});

// ── 9. Regression: Fire, Water and generic keys still present ─────────────────
test('Fire/Water/generic enemy types are unaffected by the Air roster addition', () => {
  const legacy = ['villager', 'warrior', 'archer', 'acolito_brasa', 'piromante', 'ahogado', 'medusa', 'tiburon_joven'];
  for (const k of legacy) assert.ok(ENEMY_TYPES[k], `Regression: ENEMY_TYPES missing legacy key '${k}'`);
});
```

- [ ] **Step 2: Run the new test file**

```bash
node --test tests/AirRoster.test.js
```

Expected: all tests pass, 0 failures.

- [ ] **Step 3: Run the full test suite**

```bash
node --test
```

Expected: all tests pass (0 failures). Confirms the Air addition is fully additive and no Fire/Water/generic/campaign/economy/skill-tree behavior changed.

- [ ] **Step 4: Commit**

```bash
git add tests/AirRoster.test.js
git commit -m "test(air): assert Air roster validation, wave type resolution, mechanic placement"
```

---

### Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the complete test suite one final time**

```bash
node --test
```

Expected: all tests pass. Zero failures. Output includes `AirRoster.test.js` passing alongside all pre-existing test files.

- [ ] **Step 2: Confirm Air region structure and wave types resolve end-to-end**

```bash
node --input-type=module <<'EOF'
import { REGIONS } from './src/data/regions.js';
import { ENEMY_TYPES } from './src/data/enemies/index.js';
const a = REGIONS.air;
const kinds = a.levels.map((l) => l.kind);
const expected = ['basic','basic','basic','intermediate','intermediate','intermediate','levelboss','temple'];
if (JSON.stringify(kinds) !== JSON.stringify(expected)) throw new Error('kinds mismatch: ' + kinds);
// Walk every wave phase across all 8 levels; ensure each spawn type resolves.
let count = 0;
for (const lvl of a.levels) for (const ph of lvl.phases) {
  if (ph.type !== 'wave') continue;
  for (const s of ph.spawns) { if (!ENEMY_TYPES[s.type]) throw new Error('unknown wave type: ' + s.type); count++; }
}
console.log('Air region structure OK; resolved', count, 'wave spawn entries.');
EOF
```

Expected: prints `Air region structure OK; resolved <N> wave spawn entries.`

- [ ] **Step 3: Final commit if any fixes were needed; otherwise done**

```bash
# If corrections were made during verification:
git add -A
git commit -m "fix(air): corrections found during final verification pass"
# Otherwise no commit needed — all changes are already committed in Tasks 1–8.
```

---

## Scope boundaries for this plan

**In scope (Plan 2):**
- `config.js` — 12 new Air COLORS entries (`COLORS.lightning` reused).
- `src/scenes/GameScene.js` — `executeAttack` copies `att.stun`/`att.lift`/`att.push` onto enemy shots.
- `src/data/enemies/air.js` — 20 creature definitions.
- `src/data/enemies/index.js` — `AIR_ENEMIES` spread into `ENEMY_TYPES`.
- `src/data/regions.js` — `airWaves(tier)` + `airInterWaves(tier)` + wired into `REGIONS.air`.
- `tests/AirRoster.test.js` — roster validation, wave type resolution, mechanic-placement, regression tests.

**Explicitly out of scope (Plan 3 — Air Bosses):**
- `src/data/bosses/air.js` — Caballero de Sangre, Bruja del Vendaval, Elemental de Tormenta (tornado-ojo), Líder Cultista (ritual, meter-driven), Sir Galahad (forms).
- Boss wiring in `makeBranch` for `REGIONS.air` (`minibosses`, `levelBoss`, `templeBoss`), the death line of the Bruja, Galahad's `onClear`, the nv7 ritual fodder summons (`cultista`/`cultista_canalizador`/`guardian_rito` are placed by the leader, not by waves), and the leader's `untargetable` flag.
- The `TODO(Plan 3)` comment in `REGIONS.air` marks exactly where Plan 3 plugs in.

**Requires Plan 1 (engine pieces) before executing:**
- `{ type: 'drain', heal }` handler in the caster-vs-enemies contact path.
- `{ type: 'onHitStun', kind:'stun'|'lift', ms }` + `{ type: 'onHitPush', force, ms }` handlers (contact + the `shot.stunMs`/`shot.liftKind`/`shot.pushForce`/`shot.pushMs` reads on the enemyShots path that Task 2 feeds).
- `MOVEMENTS.evade` in `EnemyBrain` and `isFlying(def)` (the `flying` flag consumer).
- `CASTER_STUN_MS` / `CASTER_LIFT_MS` / `PUSH_FORCE` / `PUSH_MS` in `src/data/tuning.js` (imported by Task 2).
- Without Plan 1, the `air.js` defs load fine (inert data), but the new mechanics won't fire in gameplay.
