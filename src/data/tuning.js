// src/data/tuning.js
// Pure. Central balance knobs (curves, caps). No Phaser.

// Absolute difficulty by level depth (index 0..6), independent of player power.
export const BASE_CURVE = [1.0, 1.15, 1.3, 1.5, 1.7, 1.95, 2.3];

// Max enemies alive at once; waves keep queuing but the spawner throttles to this.
export const CONCURRENCY_CAP = 16;

// Enemy projectile pool size (Fire is projectile-dense).
export const ENEMY_SHOT_POOL = 400;

export function baseDifficulty(levelIndex) {
  if (levelIndex < 0) return BASE_CURVE[0];
  if (levelIndex >= BASE_CURVE.length) return BASE_CURVE[BASE_CURVE.length - 1];
  return BASE_CURVE[levelIndex];
}
