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
