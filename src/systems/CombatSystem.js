// src/systems/CombatSystem.js
import { CASTER_SLOW_FLOOR, CC_IMMUNE_MS } from '../data/tuning.js';

export function applyDamage(entity, amount) {
  const dmg = Math.max(0, amount);
  const hp = Math.max(0, entity.hp - dmg);
  return { hp, dead: hp <= 0 };
}

// Melee contact i-frames. `state` es el enemigo (o cualquier objeto con
// contactReadyAt). Devuelve true y arma el cooldown si el contacto está permitido;
// false mientras sigue en cooldown. PURE (solo muta state.contactReadyAt).
export function tryMeleeContact(state, now, cooldownMs) {
  if ((state.contactReadyAt ?? 0) > now) return false;
  state.contactReadyAt = now + cooldownMs;
  return true;
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

export function applyResist(damage, resist) {
  const r = Math.max(0, Math.min(1, resist ?? 0));
  return damage * (1 - r);
}

// --- Air: caster control-loss (stun/lift) with anti-chain immunity ---
// state: { stunRemaining, liftRemaining, ccImmuneRemaining }  (fields live on Caster)

// Apply a control-loss effect. Returns false (no-op) while the immunity window is up
// so a swarm can't perma-lock the player. kind: 'stun' | 'lift'.
export function applyCasterCc(state, kind, ms) {
  if ((state.ccImmuneRemaining ?? 0) > 0) return false;
  if (kind === 'lift') state.liftRemaining = Math.max(state.liftRemaining ?? 0, ms);
  else state.stunRemaining = Math.max(state.stunRemaining ?? 0, ms);
  return true;
}

export function tickCasterCc(state, delta) {
  const wasLocked = isControlLocked(state);
  if (state.stunRemaining > 0) state.stunRemaining = Math.max(0, state.stunRemaining - delta);
  if (state.liftRemaining > 0) state.liftRemaining = Math.max(0, state.liftRemaining - delta);
  // When control-lock just ended, arm the immunity window.
  if (wasLocked && !isControlLocked(state)) state.ccImmuneRemaining = CC_IMMUNE_MS;
  else if ((state.ccImmuneRemaining ?? 0) > 0) state.ccImmuneRemaining = Math.max(0, state.ccImmuneRemaining - delta);
}

export function isControlLocked(state) {
  return (state.stunRemaining ?? 0) > 0 || (state.liftRemaining ?? 0) > 0;
}

// --- Air: decaying directional push (onHitPush / gust) ---
// state: { pushX, pushY, pushRemaining }
export function applyCasterPush(state, vx, vy, ms) {
  state.pushX = vx;
  state.pushY = vy;
  state.pushRemaining = ms;
}

export function tickCasterPush(state, delta) {
  if ((state.pushRemaining ?? 0) <= 0) return;
  state.pushRemaining = Math.max(0, state.pushRemaining - delta);
  if (state.pushRemaining === 0) { state.pushX = 0; state.pushY = 0; }
}

export function getCasterPush(state) {
  return (state.pushRemaining ?? 0) > 0 ? { x: state.pushX, y: state.pushY } : { x: 0, y: 0 };
}

// --- Air: drain (lifesteal). Heals entity {hp,maxHp}, clamped. ---
export function applyDrain(entity, heal) {
  entity.hp = Math.min(entity.maxHp ?? entity.hp, entity.hp + Math.max(0, heal));
}
