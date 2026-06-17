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
  hp: 480, speed: 80, damage: 20, radius: 24,
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
      { do: 'summon', spawnType: 'guardia_hielo', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
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
  hp: 440, speed: 80, damage: 20, radius: 26,
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
  hp: 520, speed: 85, damage: 30, radius: 38,
  elite: true,
  movement: { type: 'burrow', submergeMs: 1600, emergeMs: 450, surfaceMs: 2500 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 22, range: 70, telegraph: 400, dur: 450 }, // telegraphed by emerge ring
      { do: 'wait', dur: 700 },                                               // recover (vulnerable)
      { do: 'summon', spawnType: 'tiburon_joven', count: 1, cap: 1, respawnMs: 15000, dur: 800 },
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
// Whirlpool is SUSTAINED for the whole fight (enter:['sustainWhirlpool'] on p1); GameScene
// auto-respawns it and escalates its strength by the Kraken's hp fraction (stronger + longer +
// shorter-cooldown vortex in p3). From p2 on, `submerge` makes it vanish completely (untargetable
// + invisible, no fin) for a window and summon a deep minion — a DPS-denial beat, not movement.
export const KRAKEN = {
  key: 'kraken', tex: TEX.boss, color: COLORS.miniboss,
  hp: 1300, speed: 28, damage: 20, radius: 42, // doubled (was 650) — a true levelBoss, not a miniboss
  elite: true,
  movement: { type: 'static' }, // anchored — the whirlpool, tentacles and submerges do the work
  phases: [
    // p1: sustained whirlpool + tentacles + jellyfish adds (capped). No submerge yet.
    { from: 1.0, enter: ['sustainWhirlpool'], sequence: [
      { do: 'lobAoe', radius: 70, dps: 20, duration: 3000, telegraph: 500, dur: 900 }, // tentacle at player pos
      { do: 'lobAoe', radius: 55, dps: 18, duration: 2500, telegraph: 500, dur: 900 }, // perimeter tentacle
      { do: 'summon', spawnType: 'medusa', count: 1, cap: 2, capKey: 'kraken_jelly', respawnMs: 12000, telegraph: 350, dur: 700 },
      { do: 'wait', dur: 600 },
    ] },
    // p2: + 3 serpents (capped) + submerge (vanish ~2.5s, summons a deep minion).
    { from: 0.6, sequence: [
      { do: 'lobAoe', radius: 70, dps: 22, duration: 3200, telegraph: 450, dur: 850 }, // tentacle at player
      { do: 'lobAoe', radius: 55, dps: 20, duration: 2800, telegraph: 450, dur: 850 }, // perimeter tentacle
      { do: 'summon', spawnType: 'serpiente_marina', count: 3, cap: 3, capKey: 'kraken_serpent', respawnMs: 14000, telegraph: 300, dur: 700 },
      { do: 'submerge', duration: 2500, telegraph: 500, dur: 2500 },
      { do: 'wait', dur: 400 },
    ] },
    // p3 frenzy: stronger sustained whirlpool + tentacles + jellyfish + dense nova + longer submerge.
    { from: 0.3, speedMul: 1.1, sequence: [
      { do: 'lobAoe', radius: 75, dps: 26, duration: 3500, telegraph: 380, dur: 750 }, // faster tentacles
      { do: 'lobAoe', radius: 60, dps: 22, duration: 3000, telegraph: 380, dur: 750 },
      { do: 'summon', spawnType: 'medusa', count: 1, cap: 2, capKey: 'kraken_jelly', respawnMs: 12000, telegraph: 300, dur: 700 },
      { do: 'nova', count: 14, speed: 220, damage: 13, telegraph: 320, dur: 600 },
      { do: 'submerge', duration: 3000, telegraph: 450, dur: 3000 },
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
  elite: true, iceImmune: true, // Madame Le Fay — immune to ice (her own element)
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
  elite: true, iceImmune: true,
  movement: { type: 'burrow', submergeMs: 1400, emergeMs: 450, surfaceMs: 2200 },
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
  elite: true, iceImmune: true,
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
  elite: true, iceImmune: true,
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
      { do: 'summon', spawnType: 'ahogado', count: 3, telegraph: 350, dur: 800 },        // summons drowned adds (uncapped)
      { do: 'summon', spawnType: 'cangrejo_acorazado', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
      { do: 'summon', spawnType: 'pez_globo', count: 2, cap: 2, respawnMs: 15000, dur: 800 },
      { do: 'nova', count: 18, speed: 200, damage: 15, telegraph: 380, dur: 750 },
      { do: 'wait', dur: 500 },
    ] },
  ],
};

// maga_final: 320 HP, kite movement. A real final fight. Death fires onClear (the closing dialogue).
// FormSequencer revert-to-maga on ballena death produces this form.
const DAMA_MAGA_FINAL = {
  key: 'dama_maga_final', tex: TEX.boss, color: COLORS.ice,
  hp: 320, speed: 55, damage: 10, radius: 24, resist: 0,
  elite: true, iceImmune: true,
  movement: { type: 'kite', range: 240 },
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
  elite: true, iceImmune: true, // Madame Le Fay — immune to ice (her own element)
  scaleForms: true, // forms' hp/damage scale with difficulty (temple-boss tier), like every other boss
  movement: { type: 'kite', range: 240 },
  forms: [DAMA_MAGA, DAMA_TIBURON, DAMA_KRAKEN, DAMA_BALLENA, DAMA_MAGA_FINAL],
};
