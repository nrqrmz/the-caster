// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,

  // Fireball (already playable)
  fireballDamage: 40,
  fireballCooldown: 4000,

  // Lightning (air): chain strike
  lightningDamage: 30,
  lightningCooldown: 5000,
  lightningChain: 2,
  lightningJumpRadius: 150,

  // Poison (earth): heal-zone at the caster's feet
  poisonDamage: 15,     // damage/sec to enemies inside
  poisonCooldown: 7000,
  poisonDuration: 4000,
  poisonRadius: 70,
  poisonHeal: 8,        // hp/sec healed to the caster while inside

  // Freeze (water): frost burst on nearest enemy
  freezeCooldown: 8000,
  freezeRadius: 90,
  freezeDuration: 2500,
  freezeSlowPct: 0.5,   // elite speed multiplier while slowed
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
  lightningCooldown: 1500,
  poisonCooldown: 2000,
  freezeCooldown: 2500,
};
