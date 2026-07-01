// src/systems/TornadoHazard.js
// Pure (no Phaser). Force field for the tornado-ojo. Mirror of WhirlpoolHazard, but
// the EYE IS CALM (no center DoT) — the danger is being trapped in a predictable spot.
// All geometry exported and unit-tested.

import { TORNADO_EYE_PULL, TORNADO_EYE_RADIUS_FRAC } from '../data/tuning.js';

export function isInside(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius;
}

// True when pos is within the calm inner eye.
export function inEye(center, radius, pos) {
  return Math.hypot(pos.x - center.x, pos.y - center.y) <= radius * TORNADO_EYE_RADIUS_FRAC;
}

// Pull-force vector toward the eye. 0 at the edge (dist=radius) and 0 inside the calm
// eye; grows toward TORNADO_EYE_PULL × speed just outside the eye.
export function forceAt(center, radius, pos, speed) {
  const dx = center.x - pos.x;
  const dy = center.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > radius) return { x: 0, y: 0 };
  const eyeR = radius * TORNADO_EYE_RADIUS_FRAC;
  if (dist <= eyeR) return { x: 0, y: 0 }; // calm eye: no pull
  // t = 0 at edge, 1 at the eye boundary.
  const t = (radius - dist) / (radius - eyeR);
  const magnitude = t * TORNADO_EYE_PULL * speed;
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: nx * magnitude, y: ny * magnitude };
}

// Phase scaling: stronger pull / smaller safe space in later boss phases.
export function scaleForPhase(phase) {
  const table = [1.0, 1.0, 1.25, 1.9];
  return table[Math.min(phase, table.length - 1)] ?? 1.0;
}
