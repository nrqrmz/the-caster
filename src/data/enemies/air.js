import { COLORS, TEX } from '../../config.js';

// Air world roster (20). Velocity + displacement: fast flyers, dueling dashers,
// gusts that push/lift/stun, and vampiric drain that punishes contact. Projectile
// density is lower than Fire. Stat numbers are from spec §3; tune in playtest.
export const AIR_ENEMIES = {
  // === Humanoides vampiros (por tierra; les afecta el terreno) — nv1–7 ===

  // #1 — Siervo de la Torre: fast melee filler that heals on contact (drain).
  siervo_torre: { key: 'siervo_torre', geometric: true, tex: TEX.villager, color: COLORS.vampPale,
    hp: 24, speed: 95, damage: 9, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 4 }] },

  // #2 — Duelista Nocturno: evade movement — dashes to dodge your orbs, hit-and-run dashStrike + drain.
  duelista_nocturno: { key: 'duelista_nocturno', geometric: true, tex: TEX.archer, color: COLORS.duelistSteel,
    hp: 30, speed: 120, damage: 12, radius: 16,
    movement: { type: 'evade', range: 120 },
    attacks: [{ type: 'dashStrike' }],
    modifiers: [{ type: 'drain', heal: 5 }] },

  // #3 — Acólito del Trueno: base ranged. Kites and fires straight lightning bolts.
  acolito_trueno: { key: 'acolito_trueno', geometric: true, tex: TEX.archer, color: COLORS.stormGrey,
    hp: 22, speed: 70, damage: 8, radius: 16,
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 240 }] },

  // #4 — Heraldo del Rayo: ranged stun. Kites and fires a bolt that briefly stuns (0.3 s).
  heraldo_rayo: { key: 'heraldo_rayo', geometric: true, tex: TEX.archer, color: COLORS.stormGrey,
    hp: 24, speed: 66, damage: 7, radius: 16,
    movement: { type: 'kite', range: 220 },
    attacks: [{ type: 'shootStraight', stun: true, every: 2200, speed: 230 }] },

  // #5 — Sacerdote de Sangre: healer, kill-priority. Strafes with the pack, never attacks.
  sacerdote_sangre: { key: 'sacerdote_sangre', geometric: true, tex: TEX.villager, color: COLORS.bloodRed,
    hp: 95, speed: 72, damage: 10, radius: 16,
    movement: { type: 'strafe', range: 190 },
    attacks: [],
    modifiers: [{ type: 'healAllies', hps: 12, radius: 140 }] },

  // #6 — Guardia Nocturno: fast shielded bruiser; charges, drains, soaks damage.
  guardia_nocturno: { key: 'guardia_nocturno', geometric: true, tex: TEX.warrior, color: COLORS.stormDark,
    hp: 150, speed: 90, damage: 16, radius: 20,
    movement: { type: 'charge', windup: 500, dash: 360, recover: 600, dashMul: 3.0 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 6 }, { type: 'shielded', reduce: 0.4 }] },

  // #7 — Hechicero del Viento: ranged lift. Kites and conjures a "tornadito" that lifts (0.5 s).
  hechicero_viento: { key: 'hechicero_viento', geometric: true, tex: TEX.archer, color: COLORS.stormDark,
    hp: 60, speed: 65, damage: 8, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootStraight', lift: true, every: 2600, speed: 210 }] },

  // #8 — Vástago Vampírico: chases, drains, and RISES ONCE (reviveOnce) — forces a finishing blow.
  vastago_vampirico: { key: 'vastago_vampirico', geometric: true, tex: TEX.villager, color: COLORS.vampPale,
    hp: 42, speed: 85, damage: 11, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 5 }, { type: 'reviveOnce' }] },

  // === Voladores (flying: inmunes al terreno, rápidos/erráticos) — nv1–6 ===

  // #9 — Murciélago: erratic swarm flyer + drain. Cheap, fast — the big chain target for Lightning.
  murcielago: { key: 'murcielago', geometric: true, tex: TEX.villager, color: COLORS.batPurple,
    hp: 20, speed: 130, damage: 6, radius: 16,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 3 }] },

  // #10 — Arpía: dive-bomb flyer. Charges in then dashStrikes.
  arpia: { key: 'arpia', geometric: true, tex: TEX.archer, color: COLORS.harpyPlum,
    hp: 40, speed: 110, damage: 13, radius: 16,
    flying: true,
    movement: { type: 'charge', windup: 450, dash: 320, recover: 500, dashMul: 3.2 },
    attacks: [{ type: 'dashStrike' }] },

  // #11 — Espíritu de Tormenta: ranged flyer. Drifts erratically, fires straight lightning.
  espiritu_tormenta: { key: 'espiritu_tormenta', geometric: true, tex: TEX.archer, color: COLORS.stormGrey,
    hp: 30, speed: 80, damage: 8, radius: 16,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'shootStraight', every: 1800, speed: 240 }] },

  // #12 — Fuego Fatuo: erratic flyer with a damage aura; brushing it stuns you (0.3 s). No direct attack.
  fuego_fatuo: { key: 'fuego_fatuo', geometric: true, tex: TEX.villager, color: COLORS.wispYellow,
    hp: 26, speed: 75, damage: 8, radius: 16,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 9, radius: 42 }, { type: 'onHitStun', kind: 'stun', ms: 300 }] },

  // #13 — Vampiro Alado: heavy dive flyer. Charges, dashStrikes, drains hard (+8).
  vampiro_alado: { key: 'vampiro_alado', geometric: true, tex: TEX.archer, color: COLORS.bloodRed,
    hp: 120, speed: 100, damage: 18, radius: 19,
    flying: true,
    movement: { type: 'charge', windup: 500, dash: 340, recover: 550, dashMul: 3.0 },
    attacks: [{ type: 'dashStrike' }],
    modifiers: [{ type: 'drain', heal: 8 }] },

  // === Ambientales / torreta — nv3–7 ===

  // #14 — Gárgola Pararrayos: static turret. Lightning nova whose bolts stun (0.3 s); shielded.
  gargola_pararrayos: { key: 'gargola_pararrayos', geometric: true, tex: TEX.warrior, color: COLORS.gargoyleStone,
    hp: 250, speed: 0, damage: 8, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'nova', count: 8, every: 3200, speed: 200, telegraph: 550, stun: true }],
    modifiers: [{ type: 'shielded', reduce: 0.25 }] },

  // #15 — Centinela de Piedra: static homing turret. Fixed hazard that tracks you.
  centinela_piedra: { key: 'centinela_piedra', geometric: true, tex: TEX.warrior, color: COLORS.sentinelStone,
    hp: 60, speed: 0, damage: 10, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'shootHoming', every: 2600, speed: 120, telegraph: 350 }] },

  // #16 — Torbellino Errante: 0-damage ambient hazard. Pushes you and briefly lifts (0.5 s) on contact.
  torbellino_errante: { key: 'torbellino_errante', geometric: true, tex: TEX.archer, color: COLORS.whirlGrey,
    hp: 40, speed: 50, damage: 0, radius: 20,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'onHitPush', force: 220, ms: 250 }, { type: 'onHitStun', kind: 'lift', ms: 500 }] },

  // #17 — Tronador: kite spread ranged. Area-denial — 3 lightning bolts in a 36° arc.
  tronador: { key: 'tronador', geometric: true, tex: TEX.archer, color: COLORS.stormGrey,
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
};
