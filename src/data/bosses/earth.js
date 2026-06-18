// src/data/bosses/earth.js — El Jardín de Circe bosses.
import { COLORS, TEX } from '../../config.js';

// nv4 miniboss — fast licántrope bruiser that harries and calls the pack.
export const SENOR_LOBO = {
  key: 'senor_lobo', tex: TEX.miniboss, color: COLORS.beastFur,
  hp: 460, speed: 120, damage: 18, radius: 22, elite: true,
  modifiers: [{ type: 'drain', heal: 8 }],
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 18, range: 80, telegraph: 320, dur: 420 },
      { do: 'wait', dur: 600 },
      { do: 'summon', spawnType: 'lobo', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.5, speedMul: 1.3, sequence: [
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 280, dur: 380 },
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 260, dur: 360 },
      { do: 'summon', spawnType: 'lobo', count: 3, cap: 6, respawnMs: 10000, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

// nv5 miniboss — the hunter Céfalo guarded by his hound Lélaps.
// Lélaps is untargetable-gate-boss for Céfalo; petrifies into a block on death.
// Céfalo's 2 forms: marksman → Circe transmutes him into a feline.

// The hound "that always catches" — guards Céfalo; petrifies into an impassable block on death.
const LELAPS = {
  key: 'lelaps', tex: TEX.miniboss, color: COLORS.stoneGrey,
  hp: 140, speed: 140, damage: 14, radius: 18, elite: true,
  petrifyBlock: true,
  movement: { type: 'chase' },
  attacks: [{ type: 'melee' }],
};

// Form 1 — the marksman: infallible (homing) wood-and-silver javelin, kept at range.
const CEFALO_HUMANO = {
  key: 'cefalo_humano', tex: TEX.miniboss, color: COLORS.barkBrown,
  hp: 300, speed: 70, damage: 14, radius: 24, resist: 0, elite: true,
  movement: { type: 'kite', range: 230 },
  phases: [ { from: 1.0, sequence: [
    { do: 'shootHoming', speed: 130, damage: 14, tint: COLORS.wood, telegraph: 350, dur: 700 },
    { do: 'shootStraight', speed: 230, damage: 12, tint: COLORS.wood, telegraph: 250, dur: 600 },
    { do: 'wait', dur: 500 },
  ] } ],
};

// Form 2 — the feline Circe made of him: fast, dodgy, melee.
const CEFALO_FELINO = {
  key: 'cefalo_felino', tex: TEX.miniboss, color: COLORS.beastFur,
  hp: 360, speed: 150, damage: 18, radius: 22, resist: 0.10, elite: true,
  movement: { type: 'evade', range: 120 },
  phases: [ { from: 1.0, sequence: [
    { do: 'dashStrike', damage: 18, range: 80, telegraph: 280, dur: 380 },
    { do: 'wait', dur: 450 },
  ] } ],
};

export const CEFALO = {
  key: 'cefalo', tex: TEX.miniboss, color: COLORS.barkBrown,
  hp: 300, speed: 70, damage: 14, radius: 24, elite: true,
  untargetable: true,           // guarded by Lélaps (gate clears when Lélaps dies)
  coBoss: LELAPS,
  gateUntilCoBossDead: true,
  deathFeint: true,             // collapse→rise on the form transition
  transformCameo: true,         // Circe appears in the transition
  movement: { type: 'kite', range: 230 },
  forms: [CEFALO_HUMANO, CEFALO_FELINO],
};

// nv6 dual boss — La Dríada & su Ent, the healer + tank with hamadryad death-link.
// The tank: slow, high-HP, stomps for root. Its death kills the bound Dríada (hamadryad link).
const ENT_GUARDIAN = {
  key: 'ent_guardian', tex: TEX.boss, color: COLORS.barkBrown,
  hp: 520, speed: 40, damage: 18, radius: 26, resist: 0.10, elite: true,
  movement: { type: 'chase' },
  phases: [ { from: 1.0, sequence: [
    { do: 'lobAoe', radius: 55, duration: 1500, root: true, telegraph: 550, dur: 700 }, // pisotón
    { do: 'wait', dur: 700 },
  ] } ],
};

// The brain: mobile (kite, NOT flee), stays at heal range, heals the Ent + roots you with raíces.
export const DRIADA = {
  key: 'driada', tex: TEX.miniboss, color: COLORS.mossGreen,
  hp: 280, speed: 75, damage: 10, radius: 24, elite: true,
  coBoss: ENT_GUARDIAN,
  coBossKillsMaster: true,        // killing the Ent kills the Dríada
  modifiers: [{ type: 'healAllies', hps: 15, radius: 220 }],
  movement: { type: 'kite', range: 230 },
  phases: [ { from: 1.0, sequence: [
    { do: 'lobAoe', radius: 50, duration: 1500, root: true, telegraph: 500, dur: 650 }, // raíces
    { do: 'lobAoe', radius: 60, dps: 26, duration: 3000, telegraph: 450, dur: 700 },     // poison floor
    { do: 'summon', spawnType: 'flor_carnivora', count: 1, cap: 2, respawnMs: 11000, dur: 700 },
    { do: 'wait', dur: 500 },
  ] } ],
};

// nv7 levelboss — guardian of Circe's sanctum. Alternates flight (untargetable dives) and ground (window).
export const GRIFO = {
  key: 'grifo', tex: TEX.boss, color: COLORS.barkBrown,
  hp: 700, speed: 110, damage: 20, radius: 26, resist: 0.20, elite: true,
  flying: true,
  griffin: true, // drives updateGriffin's flight/ground state machine
  movement: { type: 'charge', windup: 420, dash: 360, recover: 520, dashMul: 3.0 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'lobo', count: 2, cap: 4, respawnMs: 9000, dur: 800 },
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 320, dur: 420 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.45, speedMul: 1.15, sequence: [
      { do: 'summon', spawnTypes: ['lobo', 'jabali'], count: 2, cap: 5, respawnMs: 8000, dur: 750 },
      { do: 'dashStrike', damage: 22, range: 100, telegraph: 280, dur: 400 },
      { do: 'dashStrike', damage: 22, range: 100, telegraph: 260, dur: 380 },
      { do: 'wait', dur: 400 },
    ] },
  ],
};

// nv8 templeboss — Circe, summoner pura. Releases captives and transmutes them into beasts.
// `taunts` drives a floating-text line (Task 7); death triggers revertBeasts (Task 7).
export const CIRCE = {
  key: 'circe', tex: TEX.boss, color: COLORS.sporeViolet,
  hp: 900, speed: 60, damage: 12, radius: 24, elite: true,
  taunts: ['story.earth.circe.taunt.0', 'story.earth.circe.taunt.1'],
  movement: { type: 'kite', range: 240 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 4, respawnMs: 6000, dur: 800 },
      { do: 'transmute', speed: 150, dur: 700 },
      { do: 'shootSpread', count: 3, arc: 50, speed: 210, damage: 11, telegraph: 300, dur: 650 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.66, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 5, respawnMs: 5500, dur: 700 },
      { do: 'transmute', speed: 160, dur: 600 },
      { do: 'lobAoe', radius: 60, dps: 28, duration: 3500, root: true, telegraph: 450, dur: 700 },
      { do: 'summon', spawnType: 'hombre_lobo', count: 1, cap: 1, respawnMs: 14000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.33, speedMul: 1.1, sequence: [
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'lobAoe', radius: 64, dps: 32, duration: 3500, telegraph: 380, dur: 650 },
      { do: 'summon', spawnTypes: ['hombre_lobo', 'oso_jardin'], count: 1, cap: 2, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};
