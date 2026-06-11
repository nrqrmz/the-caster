// src/systems/CombatSystem.js
import { CASTER_SLOW_FLOOR } from '../data/tuning.js';

export function applyDamage(entity, amount) {
  const dmg = Math.max(0, amount);
  const hp = Math.max(0, entity.hp - dmg);
  return { hp, dead: hp <= 0 };
}

// state: { slowRemaining, slowFactor }  (fields live on Caster instance)
export function applyCasterSlow(state, factor, ms) {
  // Clamp factor to floor so no enemy can freeze the caster.
  const clampedFactor = Math.max(CASTER_SLOW_FLOOR, factor);
  if (state.slowRemaining > 0) {
    // Stacking: keep the stronger (lower) factor, refresh duration.
    state.slowFactor = Math.min(state.slowFactor, clampedFactor);
    state.slowRemaining = Math.max(state.slowRemaining, ms);
  } else {
    state.slowFactor = clampedFactor;
    state.slowRemaining = ms;
  }
}

export function tickCasterSlow(state, delta) {
  if (state.slowRemaining <= 0) return;
  state.slowRemaining -= delta;
  if (state.slowRemaining <= 0) {
    state.slowRemaining = 0;
    state.slowFactor = 1;
  }
}

export function getCasterSpeedMul(state) {
  return state.slowRemaining > 0 ? state.slowFactor : 1;
}
