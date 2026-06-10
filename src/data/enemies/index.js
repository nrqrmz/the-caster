import { COLORS, TEX } from '../../config.js';
import { FIRE_ENEMIES } from './fire.js';

// Generic enemies shared across worlds (the original three, as recipes).
const GENERIC = {
  villager: { key: 'villager', tex: TEX.villager, color: COLORS.villager, hp: 20, speed: 90, damage: 8, radius: 10,
    movement: { type: 'chase' }, attacks: [] },
  warrior: { key: 'warrior', tex: TEX.warrior, color: COLORS.warrior, hp: 50, speed: 60, damage: 14, radius: 12,
    movement: { type: 'chase' }, attacks: [] },
  archer: { key: 'archer', tex: TEX.archer, color: COLORS.archer, hp: 25, speed: 70, damage: 10, radius: 10,
    movement: { type: 'kite', range: 220 }, attacks: [{ type: 'shootStraight', every: 1500, speed: 260 }] },
};

export const ENEMY_TYPES = { ...GENERIC, ...FIRE_ENEMIES };
