// src/data/tuning.js
// Pure. Central balance knobs (curves, caps). No Phaser.

// Absolute difficulty by level depth (index 0..7), independent of player power.
// nv8 (index 7, temple boss) scales above nv7 (index 6, level boss).
export const BASE_CURVE = [1.0, 1.15, 1.3, 1.5, 1.7, 1.95, 2.3, 2.6];

// Max enemies alive at once; waves keep queuing but the spawner throttles to this.
export const CONCURRENCY_CAP = 16;

// Enemy projectile pool size (Fire is projectile-dense).
export const ENEMY_SHOT_POOL = 400;

// Homing shots curve toward the player; without a lifespan they'd chase forever and
// become impossible to dodge. They expire (return to the pool) after this many ms.
export const HOMING_TTL_MS = 2600;

export function baseDifficulty(levelIndex) {
  if (levelIndex < 0) return BASE_CURVE[0];
  if (levelIndex >= BASE_CURVE.length) return BASE_CURVE[BASE_CURVE.length - 1];
  return BASE_CURVE[levelIndex];
}
