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
