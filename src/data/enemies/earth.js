// src/data/enemies/earth.js
// El Jardín de Circe (Earth world) roster — 20 creatures + split children.
// Identity: terrain + triage (transmute) + aguante. Recipe shape mirrors air.js.
import { COLORS, TEX } from '../../config.js';

export const EARTH_ENEMIES = {
  // --- Cautivos: víctimas humanas (fodder de transmutación, frágiles) ---
  naufrago_encantado: { key: 'naufrago_encantado', tex: TEX.villager, color: COLORS.fleshPale,
    hp: 18, speed: 90, damage: 8, radius: 16,
    captive: true, transmuteTo: 'lobo',
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  acolito_cautivo: { key: 'acolito_cautivo', tex: TEX.archer, color: COLORS.fleshPale,
    hp: 16, speed: 70, damage: 7, radius: 16,
    captive: true, transmuteTo: 'jabali',
    movement: { type: 'kite', range: 200 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 210 }] },

  sierva_jardin: { key: 'sierva_jardin', tex: TEX.villager, color: COLORS.fleshPale,
    hp: 14, speed: 85, damage: 0, radius: 14,
    captive: true, transmuteTo: 'pixie',
    movement: { type: 'flee' },
    attacks: [],
    modifiers: [{ type: 'mutateOnDeath', zone: { radius: 36, dps: 12, duration: 1500 } }] },

  // --- Bestias: fauna / resultado del transmute ---
  lobo: { key: 'lobo', tex: TEX.villager, color: COLORS.beastFur,
    hp: 30, speed: 130, damage: 11, radius: 16,
    movement: { type: 'evade', range: 110 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'mutateOnDeath', spawnType: 'sierva_jardin' }] },

  jabali: { key: 'jabali', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 60, speed: 100, damage: 16, radius: 18,
    movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.0 },
    attacks: [{ type: 'melee' }] },

  oso_jardin: { key: 'oso_jardin', tex: TEX.warrior, color: COLORS.beastFur,
    hp: 150, speed: 70, damage: 20, radius: 22,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  hombre_lobo: { key: 'hombre_lobo', tex: TEX.warrior, color: COLORS.beastFur,
    hp: 110, speed: 120, damage: 18, radius: 19,
    movement: { type: 'evade', range: 140 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'drain', heal: 6 }] },

  // --- Flora / hongos: terreno + veneno, estáticos/lentos ---
  hongo_esporario: { key: 'hongo_esporario', tex: TEX.villager, color: COLORS.sporeViolet,
    hp: 40, speed: 0, damage: 6, radius: 16,
    movement: { type: 'static' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 8, radius: 40 },
      { type: 'mutateOnDeath', zone: { radius: 50, dps: 18, duration: 2500 } },
    ] },

  brote_pustula: { key: 'brote_pustula', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 50, speed: 0, damage: 0, radius: 16,
    movement: { type: 'static' },
    attacks: [{ type: 'lobAoe', every: 3200, radius: 60, dps: 30, duration: 4000 }] },

  zarza_estranguladora: { key: 'zarza_estranguladora', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 70, speed: 0, damage: 8, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'lobAoe', every: 3000, radius: 50, duration: 1500, root: true, telegraph: 500 }] },

  flor_carnivora: { key: 'flor_carnivora', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 60, speed: 0, damage: 9, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'shootHoming', every: 2600, speed: 120, telegraph: 350 }] },

  enredadera_reptante: { key: 'enredadera_reptante', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 45, speed: 45, damage: 10, radius: 16,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [
      { type: 'onHitSlow', factor: 0.6, ms: 1200 },
      { type: 'splitsOnDeath', spawnType: 'enredadera_cria', count: 2, hpMul: 0.6, radiusMul: 0.7 },
    ] },

  enredadera_cria: { key: 'enredadera_cria', tex: TEX.villager, color: COLORS.vineGreen,
    hp: 22, speed: 55, damage: 8, radius: 12,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'onHitSlow', factor: 0.7, ms: 900 }] },

  // --- Fey pequeños: rápidos / enjambre ---
  pixie: { key: 'pixie', tex: TEX.villager, color: COLORS.sporeViolet,
    hp: 16, speed: 135, damage: 5, radius: 12,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  duende_ladron: { key: 'duende_ladron', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 24, speed: 110, damage: 9, radius: 14,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  fuego_fatuo_pantano: { key: 'fuego_fatuo_pantano', tex: TEX.villager, color: COLORS.mossGreen,
    hp: 26, speed: 80, damage: 7, radius: 14,
    flying: true,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 8, radius: 40 },
      { type: 'onHitSlow', factor: 0.7, ms: 1000 },
    ] },

  // --- Golems / pétreos: muro, lentos, golpes pesados ---
  golem_lodo: { key: 'golem_lodo', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 90, speed: 50, damage: 12, radius: 20,
    geometric: true,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [
      { type: 'onHitSlow', factor: 0.6, ms: 1200 },
      { type: 'splitsOnDeath', spawnType: 'golem_lodo_cria', count: 2, hpMul: 0.6, radiusMul: 0.7 },
    ] },

  golem_lodo_cria: { key: 'golem_lodo_cria', tex: TEX.warrior, color: COLORS.mudBrown,
    hp: 45, speed: 60, damage: 10, radius: 14,
    geometric: true,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'onHitSlow', factor: 0.7, ms: 900 }] },

  golem_piedra: { key: 'golem_piedra', tex: TEX.warrior, color: COLORS.stoneGrey,
    hp: 220, speed: 45, damage: 14, radius: 22,
    geometric: true,
    movement: { type: 'chase' },
    attacks: [{ type: 'lobAoe', every: 2600, radius: 55, dps: 22, duration: 1500, telegraph: 450 }],
    modifiers: [{ type: 'shielded', reduce: 0.3 }] },

  totem_espinas: { key: 'totem_espinas', tex: TEX.warrior, color: COLORS.barkBrown,
    hp: 120, speed: 0, damage: 10, radius: 20,
    geometric: true,
    movement: { type: 'static' },
    attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 2200, speed: 200 }] },

  coloso_musgoso: { key: 'coloso_musgoso', tex: TEX.warrior, color: COLORS.mossGreen,
    hp: 300, speed: 40, damage: 18, radius: 24,
    geometric: true,
    movement: { type: 'chase' },
    attacks: [{ type: 'lobAoe', every: 3000, radius: 55, duration: 1500, root: true, telegraph: 550 }] },

  // --- Élite del jardín: la fuente de la mecánica firma ---
  ninfa_transmutadora: { key: 'ninfa_transmutadora', tex: TEX.archer, color: COLORS.sporeViolet,
    hp: 70, speed: 70, damage: 6, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'transmute', every: 5000, speed: 150 }] },
};
