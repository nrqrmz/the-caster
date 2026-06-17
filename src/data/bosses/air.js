import { COLORS, TEX } from '../../config.js';

// Air-world boss definitions (La Torre Montaña). Stats are pre-scale starting
// values; GameScene applies scaleEnemyDef(def, mult). All bosses elite: true.
// Identity: velocidad + desplazamiento (charge bruiser, wind control, the
// tornado-eye setpiece, the ritual, and the shapeshifter vampire Galahad).
// Stat ballpark (spec §4): miniboss hp 420-680, levelboss ~200 (fight phase),
// templeboss distributed across forms. Tuned in playtest.
//
// Engine pieces consumed (Plan 1): step CC flags stun:true / lift:true /
// push:{force,ms} flow onto shots via executeAttack (Plan 2); `drain` modifier
// heals the boss on contact; movement `evade` juke-dashes; `enter:['spawnTornado']`
// runs the tornado-eye hook; `untargetable` + forcedPhase drive the ritual.

// ─── nv4 MINIBOSS ────────────────────────────────────────────────────────────
// Caballero de Sangre — fast vampiric bruiser. Unlike the slow ice knights of
// Water, this one HARASSES: charges, heals off you (drain), and at <50% starts
// juking your orbs (movement swaps charge → evade in P2). Read the dash, punish
// the recover. Decision: one movement per phase — charge (P1), evade (P2).
export const CABALLERO_SANGRE = {
  key: 'caballero_sangre', tex: TEX.miniboss, color: COLORS.boss,
  hp: 440, speed: 110, damage: 20, radius: 24,
  elite: true, geometric: true,
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  modifiers: [
    { type: 'drain', heal: 10 }, // heals 10 hp when it lands a contact/dash hit
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 450 },                                              // charge windup (movement drives the dash)
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 }, // drains via modifier on contact
      { do: 'wait', dur: 500 },                                              // recover (vulnerable window)
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.3, movement: { type: 'evade', range: 120 }, sequence: [
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 }, // double dash, faster
      { do: 'wait', dur: 300 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 350 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
    ] },
  ],
};

// ─── nv5 MINIBOSS ────────────────────────────────────────────────────────────
// Bruja del Vendaval — aerial control. Conjures lifting tornados and stunning
// bolts. First boss-scale taste of displacement: don't stand still under the
// tornados. Death line bridges narratively to nv6 (the storm itself).
export const BRUJA_VENDAVAL = {
  key: 'bruja_vendaval', tex: TEX.miniboss, color: COLORS.lightning,
  hp: 420, speed: 75, damage: 16, radius: 26,
  elite: true, geometric: true,
  movement: { type: 'strafe', range: 260, strafeSpeed: 55 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'lobAoe', radius: 56, dps: 14, duration: 1600, lift: true, telegraph: 500, dur: 850 }, // tornadito que eleva
      { do: 'shootHoming', speed: 130, damage: 14, stun: true, telegraph: 420, dur: 900 },          // rayo aturdidor
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'lobAoe', radius: 56, dps: 14, duration: 1600, lift: true, telegraph: 420, dur: 750 }, // dos tornaditos por ciclo
      { do: 'lobAoe', radius: 56, dps: 14, duration: 1600, lift: true, telegraph: 420, dur: 750 },
      { do: 'shootSpread', count: 5, arc: 70, speed: 240, damage: 13, stun: true, telegraph: 320, dur: 650 }, // rayos
      { do: 'wait', dur: 350 },
    ] },
  ],
};

// ─── nv6 MINIBOSS ────────────────────────────────────────────────────────────
// Elemental de Tormenta — the tornado-eye setpiece. STATIC, oversized (radius 56
// → GameScene setDisplaySize 112, the world's HP wall despite the miniboss slot,
// because nv7's ritual is full of short-lived enemies). Three phases: P1 lifting
// tornaditos + stun nova + bats; P2 (<60%) enter spawnTornado (the great eye) +
// faster stun bolts; P3 (<30%) frenzy (stronger pull via _tornadoPhase bump,
// more tornaditos, summons arpías). Damage-the-boss = a positioning loop: it's
// anchored at top, your auto-fire hits the nearest, so you must push UP into the
// tornado/lightning field to make it your nearest target. The low summon cap
// leaves a lane to climb. resist 0.20.
export const ELEMENTAL_TORMENTA = {
  key: 'elemental_tormenta', tex: TEX.miniboss, color: COLORS.ash,
  hp: 680, speed: 0, damage: 18, radius: 56, resist: 0.20,
  elite: true, geometric: true,
  movement: { type: 'static' },
  phases: [
    { from: 1.0, sequence: [
      { do: 'lobAoe', radius: 60, dps: 16, duration: 1700, lift: true, telegraph: 520, dur: 880 }, // tornadito
      { do: 'nova', count: 8, speed: 240, damage: 12, stun: true, telegraph: 380, dur: 700 },        // nova de rayos
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.6, enter: ['spawnTornado'], sequence: [
      { do: 'lobAoe', radius: 60, dps: 16, duration: 1700, lift: true, telegraph: 440, dur: 800 },
      { do: 'shootHoming', speed: 150, damage: 13, stun: true, telegraph: 320, dur: 700 },           // rayos aturdidores más rápidos
      { do: 'nova', count: 10, speed: 250, damage: 12, stun: true, telegraph: 340, dur: 650 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.3, speedMul: 1.0, enter: ['spawnTornado'], sequence: [
      { do: 'lobAoe', radius: 64, dps: 18, duration: 1800, lift: true, telegraph: 360, dur: 720 }, // frenesí: más tornaditos
      { do: 'lobAoe', radius: 64, dps: 18, duration: 1800, lift: true, telegraph: 360, dur: 720 },
      { do: 'shootHoming', speed: 160, damage: 14, stun: true, telegraph: 280, dur: 620 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 4, respawnMs: 12000, dur: 650 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};
