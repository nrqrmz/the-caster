// src/systems/WhirlpoolHazard.js
// Pure (no Phaser). Force field and damage math for the whirlpool/maelstrom hazard.
// Mirror of TriangleHazard — all geometry exported and unit-tested.

import { WHIRLPOOL_CENTER_PULL, WHIRLPOOL_CENTER_DPS } from '../data/tuning.js';

// Returns true if `pos` is within the whirlpool's influence circle.
export function isInside(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius;
}

// Returns the pull-force vector applied to the caster this frame.
// Force = 0 at the edge (dist = radius), WHIRLPOOL_CENTER_PULL × casterSpeed at the center.
// Linear interpolation: strength = (1 - dist/radius) × WHIRLPOOL_CENTER_PULL × casterSpeed.
export function forceAt(center, radius, pos, casterSpeed) {
  const dx = center.x - pos.x;
  const dy = center.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return { x: 0, y: 0 };
  // t = 0 at edge, 1 at center.
  const t = 1 - dist / radius;
  const magnitude = t * WHIRLPOOL_CENTER_PULL * casterSpeed;
  if (dist < 1e-4) return { x: 0, y: 0 }; // at center: no defined direction, no net pull
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: nx * magnitude, y: ny * magnitude };
}

// Returns damage-per-second when the caster is inside the center zone (inner 20% of radius).
// Returns 0 outside the center zone.
export function centerDot(center, radius, pos) {
  const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
  return dist <= radius * 0.2 ? WHIRLPOOL_CENTER_DPS : 0;
}

// Phase scaling multiplier (1.0 at phase 1, increases for later phases).
// Used by GameScene to intensify the vortex in later boss phases.
export function scaleForPhase(phase) {
  // Phase 1 = 1.0×, phase 2 = 1.25×, phase 3 = 1.6×.
  const table = [1.0, 1.0, 1.25, 1.6];
  return table[Math.min(phase, table.length - 1)] ?? 1.0;
}
