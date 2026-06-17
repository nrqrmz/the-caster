import { COLORS, TEX } from '../../config.js';

// Fire world roster (~20). Glass-cannon: low hp, high damage, mostly ranged.
// Recipes use EnemyBrain components. Textures are reused shapes + per-enemy tint.
export const FIRE_ENEMIES = {
  // --- Cultists (human) ---
  acolito_brasa: { key: 'acolito_brasa', tex: TEX.archer, color: COLORS.ember, hp: 16, speed: 70, damage: 9, radius: 16,
    movement: { type: 'kite', range: 210 }, attacks: [{ type: 'shootStraight', every: 1400, speed: 250 }] },
  lanzabrasas: { key: 'lanzabrasas', tex: TEX.archer, color: COLORS.emberDeep, hp: 20, speed: 65, damage: 8, radius: 16,
    movement: { type: 'kite', range: 230 }, attacks: [{ type: 'shootSpread', count: 3, arc: 34, every: 1700, speed: 240 }] },
  iniciado_veloz: { key: 'iniciado_veloz', tex: TEX.villager, color: COLORS.ember, hp: 14, speed: 130, damage: 11, radius: 16,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  piromante: { key: 'piromante', tex: TEX.archer, color: COLORS.emberDeep, hp: 24, speed: 60, damage: 7, radius: 16,
    movement: { type: 'strafe', range: 200 }, attacks: [{ type: 'shootBurst', burst: 4, burstGap: 110, every: 2200, speed: 280 }] },
  encapuchado_pira: { key: 'encapuchado_pira', tex: TEX.archer, color: COLORS.ash, hp: 28, speed: 0, damage: 6, radius: 17,
    movement: { type: 'static' }, attacks: [{ type: 'lobAoe', radius: 60, dps: 20, duration: 3000, every: 2600, telegraph: 500 }] },
  pirovidente: { key: 'pirovidente', tex: TEX.archer, color: COLORS.salamander, hp: 26, speed: 60, damage: 12, radius: 16,
    movement: { type: 'kite', range: 240 }, attacks: [{ type: 'shootHoming', every: 2400, speed: 120, telegraph: 350 }] },
  caballero_brasa: { key: 'caballero_brasa', tex: TEX.warrior, color: COLORS.emberDeep, hp: 70, speed: 75, damage: 16, radius: 18,
    movement: { type: 'charge' }, attacks: [{ type: 'melee' }], modifiers: [{ type: 'shielded', reduce: 0.5 }] },
  sacerdote_llama: { key: 'sacerdote_llama', tex: TEX.archer, color: COLORS.totemFire, hp: 34, speed: 70, damage: 6, radius: 17,
    movement: { type: 'flee' }, attacks: [{ type: 'summon', spawnType: 'imp_brasa', count: 2, every: 3200 }],
    modifiers: [{ type: 'healAllies', hps: 10, radius: 130 }] },
  portaestandarte: { key: 'portaestandarte', tex: TEX.warrior, color: COLORS.totemFire, hp: 40, speed: 55, damage: 8, radius: 18,
    movement: { type: 'orbit' }, attacks: [], modifiers: [{ type: 'auraDamage', dps: 12, radius: 46 }] },

  // --- Beasts (elemental) ---
  larva_magma: { key: 'larva_magma', tex: TEX.villager, color: COLORS.magma, hp: 22, speed: 55, damage: 10, radius: 17,
    movement: { type: 'chase' }, attacks: [{ type: 'melee' }], modifiers: [{ type: 'explodesOnDeath', count: 8, speed: 200 }] },
  salamandra: { key: 'salamandra', tex: TEX.villager, color: COLORS.salamander, hp: 18, speed: 95, damage: 9, radius: 16,
    movement: { type: 'zigzag' }, attacks: [{ type: 'shootStraight', every: 1300, speed: 230 }] },
  espiritu_ceniza: { key: 'espiritu_ceniza', tex: TEX.villager, color: COLORS.ash, hp: 24, speed: 70, damage: 7, radius: 16,
    movement: { type: 'erratic' }, attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 220 }],
    modifiers: [{ type: 'onHitBurn', dps: 6, ms: 2000 }] },
  can_lava: { key: 'can_lava', tex: TEX.villager, color: COLORS.magma, hp: 30, speed: 90, damage: 15, radius: 17,
    movement: { type: 'charge', windup: 500, dash: 350, recover: 600, dashMul: 3.2 }, attacks: [{ type: 'melee' }] },
  elemental_fuego: { key: 'elemental_fuego', tex: TEX.miniboss, color: COLORS.magma, hp: 60, speed: 55, damage: 8, radius: 26,
    movement: { type: 'kite', range: 200 }, attacks: [{ type: 'nova', count: 10, every: 2600, speed: 200, telegraph: 400 }],
    modifiers: [{ type: 'onHitBurn', dps: 8, ms: 2200 }] },
  coloso_magma: { key: 'coloso_magma', tex: TEX.miniboss, color: COLORS.emberDeep, hp: 110, speed: 35, damage: 14, radius: 30,
    movement: { type: 'chase' }, attacks: [{ type: 'lobAoe', radius: 70, dps: 24, duration: 3200, every: 2800, telegraph: 550 }],
    modifiers: [{ type: 'shielded', reduce: 0.45 }] },
  fenix_menor: { key: 'fenix_menor', tex: TEX.miniboss, color: COLORS.salamander, hp: 50, speed: 80, damage: 10, radius: 20,
    movement: { type: 'orbit' }, attacks: [{ type: 'shootBurst', burst: 3, burstGap: 130, every: 2400, speed: 260 }],
    modifiers: ['reviveOnce'] },

  // --- Summoned / ambient ---
  imp_brasa: { key: 'imp_brasa', tex: TEX.villager, color: COLORS.ember, hp: 10, speed: 120, damage: 8, radius: 16,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  avispa_brasa: { key: 'avispa_brasa', tex: TEX.villager, color: COLORS.salamander, hp: 8, speed: 150, damage: 7, radius: 16,
    movement: { type: 'zigzag' }, attacks: [{ type: 'melee' }] },
  totem_pira: { key: 'totem_pira', tex: TEX.warrior, color: COLORS.totemFire, hp: 45, speed: 0, damage: 9, radius: 18,
    movement: { type: 'static' }, attacks: [{ type: 'nova', count: 8, every: 3000, speed: 180, telegraph: 500 }],
    modifiers: [{ type: 'auraDamage', dps: 8, radius: 50 }] },
  brasa_errante: { key: 'brasa_errante', tex: TEX.villager, color: COLORS.totemFire, hp: 12, speed: 60, damage: 0, radius: 16,
    movement: { type: 'erratic' }, attacks: [], modifiers: [{ type: 'auraDamage', dps: 10, radius: 40 }] },
};
