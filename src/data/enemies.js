import { COLORS, TEX } from '../config.js';

// behavior: 'chase' (run straight at caster) | 'ranged' (keep distance, shoot)
export const ENEMY_TYPES = {
  villager: { key: 'villager', tex: TEX.villager, color: COLORS.villager, hp: 20,  speed: 90,  damage: 8,  radius: 10, behavior: 'chase' },
  warrior:  { key: 'warrior',  tex: TEX.warrior,  color: COLORS.warrior,  hp: 50,  speed: 60,  damage: 14, radius: 12, behavior: 'chase' },
  archer:   { key: 'archer',   tex: TEX.archer,   color: COLORS.archer,   hp: 25,  speed: 70,  damage: 10, radius: 10, behavior: 'ranged', range: 220, fireEvery: 1500 },
};
