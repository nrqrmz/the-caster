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
  hp: 640, speed: 180, damage: 20, radius: 28,
  elite: true,
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  modifiers: [
    { type: 'drainBite', amount: 20, range: 150, cooldown: 4000 }, // muerde a distancia al embestir
    { type: 'shielded', reduce: 0.25 },
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 450 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
      // dardo de sangre violeta, muy veloz, ~35% de slow
      { do: 'shootStraight', projectile: 'bloodDart', speed: 320, damage: 14, slowChance: 0.35, telegraph: 260, dur: 500 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.3, movement: { type: 'evade', range: 120 }, sequence: [
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
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
  elite: true,
  movement: { type: 'strafe', range: 260, strafeSpeed: 55 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 160, telegraph: 0, dur: 650 }, // tornado recto que eleva
      { do: 'shootHoming', speed: 130, damage: 14, stun: true, telegraph: 420, dur: 900 },          // rayo aturdidor
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 170, telegraph: 0, dur: 600 }, // frenesí: tornado recto…
      { do: 'shootHoming',   projectile: 'tornado', lift: true, damage: 12, speed: 120, telegraph: 0, dur: 600 }, // …y tornado homing (despawnea a 2.6s)
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
  elite: true,
  movement: { type: 'static' },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 150, telegraph: 0, dur: 700 }, // tornado recto que eleva
      { do: 'nova', count: 8, speed: 240, damage: 12, stun: true, telegraph: 380, dur: 700 },        // nova de rayos
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.6, enter: ['spawnTornado'], sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 160, telegraph: 0, dur: 650 }, // tornado recto
      { do: 'shootHoming', speed: 150, damage: 13, stun: true, telegraph: 320, dur: 700 },           // rayos aturdidores más rápidos
      { do: 'nova', count: 10, speed: 250, damage: 12, stun: true, telegraph: 340, dur: 650 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.3, speedMul: 1.0, enter: ['spawnTornado'], sequence: [
      { do: 'shootStraight', projectile: 'tornado', lift: true, damage: 12, speed: 170, telegraph: 0, dur: 620 }, // frenesí: tornado recto…
      { do: 'shootHoming',   projectile: 'tornado', lift: true, damage: 12, speed: 120, telegraph: 0, dur: 620 }, // …y tornado homing
      { do: 'shootHoming', speed: 160, damage: 14, stun: true, telegraph: 280, dur: 620 },
      { do: 'summon', spawnType: 'arpia', count: 2, cap: 4, respawnMs: 12000, dur: 650 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};

// ─── nv7 LEVELBOSS ───────────────────────────────────────────────────────────
// El Líder Cultista — the ritual setpiece (dramatic irony: killing the leader
// completes the rite that revives Galahad). Phase 0 (channel): untargetable
// (visible ritual shield via GameScene), static, summons the ritual fodder
// (capped). The ritual bar fills by TIMER while he channels — NOT by kills — so
// the player can't stop it by clearing adds; periodic taunting floating text.
// Phase 1 (fight): on bar-full, GameScene flips _untargetable=false and sets
// brainState.boss.forcedPhase=1 → he stops summoning, becomes targetable, and
// fights with ~200 hp + bolts. His death completes the rite (clears the level).
// Flags: ritual:true (gates the GameScene updateRitual loop), untargetable:true
// (seeds the runtime _untargetable flag at spawn).
export const LIDER_CULTISTA = {
  key: 'lider_cultista', tex: TEX.boss, color: COLORS.boss,
  hp: 200, speed: 60, damage: 12, radius: 26,
  elite: true,
  ritual: true,         // GameScene.updateRitual gates on this
  untargetable: true,   // seeds enemy._untargetable at spawn (channel phase)
  movement: { type: 'static' },
  phases: [
    // Phase 0 — channel. forcedPhase stays 0 (untargetable) until the bar fills.
    // from:1.0 so it is the default hp-fraction pick before the meter forces phase 1.
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'cultista_canalizador', count: 1, cap: 3, respawnMs: 9000, dur: 900 },
      { do: 'summon', spawnType: 'guardian_rito', count: 1, cap: 2, respawnMs: 11000, dur: 900 },
      { do: 'summon', spawnType: 'cultista', count: 2, cap: 6, respawnMs: 7000, dur: 800 },
      { do: 'wait', dur: 700 },
    ] },
    // Phase 1 — fight. Reached ONLY via forcedPhase=1 (meter full), never by hp.
    // from:0.0 so the hp-fraction picker never selects it on its own.
    { from: 0.0, sequence: [
      { do: 'shootStraight', speed: 250, damage: 12, telegraph: 300, dur: 600 },
      { do: 'shootSpread', count: 5, arc: 70, speed: 240, damage: 11, telegraph: 320, dur: 650 },
      { do: 'wait', dur: 450 },
    ] },
  ],
};

// ─── nv8 TEMPLEBOSS ──────────────────────────────────────────────────────────
// Sir Galahad — the immortal vampire (cambiaformas). Reuses the FormSequencer
// VERBATIM (built for the Dama del Lago): one HP bar per form; hp refills fully
// on transformation; resist climbs. Draining a form's HP does NOT kill him — he
// "cae cadáver → resucita" (themed collapse/rise tween, Task 5) into the next
// form. Only the death of the FINAL form ends the fight (then he reverts and
// burns — Task 5). His death fires onClear (the world-closing dialogue in
// regions.js). All forms elite: true; FormSequencer enforces CC immunity.
//
// Spec §4.5 stat table:
//   Humano        hp 340 spd  80 dmg 14 r 26 resist 0    · strafe + blood darts + evade
//   Rage          hp 460 spd 110 dmg 20 r 26 resist 0.10 · dashStrike + drain + summon bats
//   Rage ×2       hp 560 spd 150 dmg 22 r 26 resist 0.20 · Rage cadence/speed DOUBLED
//   Murciélago    hp 700 spd 100 dmg 24 r 48 resist 0.30 · flying + dive (charge) + push gust + bat nova
//   Final         hp ~90 spd  55 dmg 10 r 24 resist 0    · minimal kit (one last dart)

const GALAHAD_HUMANO = {
  key: 'galahad_humano', tex: TEX.boss, color: COLORS.boss,
  hp: 340, speed: 80, damage: 14, radius: 26, resist: 0,
  elite: true,
  movement: { type: 'evade', range: 240 }, // dodges your orbs — teaches his rhythm
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', speed: 240, damage: 14, telegraph: 320, dur: 650 }, // blood darts
      { do: 'shootSpread', count: 3, arc: 50, speed: 230, damage: 12, telegraph: 340, dur: 700 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'shootStraight', speed: 260, damage: 14, telegraph: 280, dur: 580 },
      { do: 'shootSpread', count: 5, arc: 70, speed: 240, damage: 13, telegraph: 300, dur: 620 },
      { do: 'wait', dur: 400 },
    ] },
  ],
};

const GALAHAD_RAGE = {
  key: 'galahad_rage', tex: TEX.boss, color: COLORS.boss,
  hp: 460, speed: 110, damage: 20, radius: 26, resist: 0.10,
  elite: true,
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  modifiers: [
    { type: 'drain', heal: 10 },
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 450 },                                              // charge windup
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 300, dur: 360 }, // drains on contact
      { do: 'wait', dur: 500 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'wait', dur: 350 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 },
      { do: 'wait', dur: 300 },
      { do: 'dashStrike', damage: 20, range: 70, telegraph: 240, dur: 320 }, // double dash
      { do: 'wait', dur: 450 },
    ] },
  ],
};

// Rage ×2 — the Rage kit with cadence/speed DOUBLED (looks superhuman; telegraphs
// intact so it stays fair). Speed 150, faster windup/dash/recover, halved waits.
const GALAHAD_RAGE2 = {
  key: 'galahad_rage2', tex: TEX.boss, color: COLORS.boss,
  hp: 560, speed: 150, damage: 22, radius: 26, resist: 0.20,
  elite: true,
  movement: { type: 'charge', windup: 225, dash: 170, recover: 250, dashMul: 3.2 },
  modifiers: [
    { type: 'drain', heal: 10 },
  ],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 225 },                                              // half windup
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 200, dur: 220 },
      { do: 'wait', dur: 250 },
      { do: 'summon', spawnType: 'murcielago', count: 2, cap: 4, respawnMs: 9000, dur: 500 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'wait', dur: 180 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 },
      { do: 'wait', dur: 180 },
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 180, dur: 200 }, // double dash, doubled cadence
      { do: 'wait', dur: 250 },
    ] },
  ],
};

const GALAHAD_MURCIELAGO = {
  key: 'galahad_murcielago', tex: TEX.boss, color: COLORS.miniboss,
  hp: 700, speed: 100, damage: 24, radius: 48, resist: 0.30,
  elite: true,
  flying: true,                                       // immune to ground hazards
  movement: { type: 'charge', windup: 400, dash: 360, recover: 550, dashMul: 3.0 }, // dive-bombs
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 400 },                                                                 // dive windup
      { do: 'dashStrike', damage: 24, range: 80, telegraph: 320, dur: 380 },                    // dive
      { do: 'nova', count: 10, speed: 230, damage: 14, push: { force: 220, ms: 250 }, telegraph: 380, dur: 700 }, // gust nova (pushes)
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 6, respawnMs: 10000, dur: 800 },  // bat nova
      { do: 'wait', dur: 450 },
    ] },
    { from: 0.45, speedMul: 1.1, sequence: [
      { do: 'wait', dur: 320 },
      { do: 'dashStrike', damage: 24, range: 80, telegraph: 260, dur: 340 },
      { do: 'nova', count: 12, speed: 240, damage: 15, push: { force: 240, ms: 280 }, telegraph: 340, dur: 650 },
      { do: 'summon', spawnType: 'murcielago', count: 3, cap: 6, respawnMs: 9000, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

// Final (humano) — a small, mortal last form. Death fires onClear (the closing
// dialogue) and the themed burn (Task 5). ~90 hp, minimal kit.
const GALAHAD_FINAL = {
  key: 'galahad_final', tex: TEX.boss, color: COLORS.boss,
  hp: 90, speed: 55, damage: 10, radius: 24, resist: 0,
  elite: true,
  movement: { type: 'flee' },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootStraight', speed: 200, damage: 10, telegraph: 320, dur: 700 }, // one last dart
      { do: 'wait', dur: 800 },
    ] },
  ],
};

// Top-level Galahad def. FormSequencer reads `forms` in order; each form runs its
// own BossBrain phases. The outer hp/speed/etc mirror the first form (Humano) as
// a safe fallback before the sequencer takes over. deathFeint:true gates the
// themed collapse→rise transition + final burn (Task 5).
export const GALAHAD = {
  key: 'galahad', tex: TEX.boss, color: COLORS.boss,
  hp: 340, speed: 80, damage: 14, radius: 26,
  elite: true,
  deathFeint: true,
  movement: { type: 'evade', range: 240 },
  forms: [GALAHAD_HUMANO, GALAHAD_RAGE, GALAHAD_RAGE2, GALAHAD_MURCIELAGO, GALAHAD_FINAL],
};
