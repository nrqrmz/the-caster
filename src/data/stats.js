// Caster base numbers before any skill-tree bonuses.
// shotRate and *Cooldown are in milliseconds; LOWER is better.
export const BASE_STATS = {
  basicDamage: 10,
  shotRate: 500,
  moveSpeed: 200,
  maxHealth: 100,
  healthRegen: 0,       // hp/sec passive regen (skill-tree)

  // Fireball
  fireballDamage: 40,
  fireballCooldown: 4000,
  fireballRadius: 70,   // explosion radius (skill-tree "Área" track)
  burnDamage: 0,        // burn DoT/sec applied on fireball hit (0 = no burn until unlocked)
  burnDuration: 2500,   // burn duration (ms)

  // Lightning (air): chain strike
  lightningDamage: 30,
  lightningCooldown: 5000,
  lightningChain: 2,
  lightningJumpRadius: 150,

  // Poison (earth): heal-zone at the caster's feet
  poisonDamage: 15,
  poisonCooldown: 7000,
  poisonDuration: 4000,
  poisonRadius: 70,
  poisonHeal: 8,

  // Freeze (water): frost burst on nearest enemy
  freezeCooldown: 8000,
  freezeRadius: 90,
  freezeDuration: 2500,
  freezeSlowPct: 0.5,
  freezeDamage: 50,     // bonus frost damage at full intensity; scales per-enemy by how much it's slowed
};

// Hard floors so reductions can't break the game.
export const STAT_FLOORS = {
  shotRate: 150,
  fireballCooldown: 1000,
  lightningCooldown: 1500,
  poisonCooldown: 2000,
  freezeCooldown: 2500,
  freezeSlowPct: 0.2,
};
