// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,
  fireballDamage: 40,
  fireballCooldown: 4000,
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
};
