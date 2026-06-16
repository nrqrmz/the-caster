// src/systems/EnemyBrain.js
// Pure (no Phaser). Turns an enemy def + mutable runtime state into a per-frame
// Intent that GameScene executes. Movement and attack-pattern decisions live here
// so they can be unit-tested under `node --test`.

import {
  BURROW_SUBMERGE_MS, BURROW_TELEGRAPH_MS, BURROW_RECOVER_MS,
  EGG_HATCH_MS, TADPOLE_GROW_MS,
} from '../data/tuning.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js'; // config.js is Phaser-free (constants only)

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function angleBetween(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function distance(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

const DEFAULT_BURST_GAP = 120; // ms, ~2 frames at 60fps

// --- Movement library ---------------------------------------------------------
// Each returns a desired velocity {x,y}.
// args: { self, target, speed, dt, params, state }  (params = def.movement, state mutable)
export const MOVEMENTS = {
  chase({ self, target, speed }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
  },

  static() { return { x: 0, y: 0 }; },

  flee({ self, target, speed }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    return { x: -Math.cos(a) * speed, y: -Math.sin(a) * speed };
  },

  kite({ self, target, speed, params }) {
    const range = params?.range ?? 200;
    const d = distance(self.x, self.y, target.x, target.y);
    const a = angleBetween(self.x, self.y, target.x, target.y);
    if (d > range + 20) return { x: Math.cos(a) * speed, y: Math.sin(a) * speed };
    if (d < range - 20) return { x: -Math.cos(a) * speed, y: -Math.sin(a) * speed };
    return { x: 0, y: 0 };
  },

  zigzag({ self, target, speed, dt, state }) {
    state.phase = (state.phase || 0) + dt / 1000;
    const a = angleBetween(self.x, self.y, target.x, target.y);
    const perp = a + Math.PI / 2;
    // 6 = sway frequency (rad/s), 0.7 = lateral amplitude relative to forward speed
    const sway = Math.sin(state.phase * 6) * 0.7;
    return {
      x: Math.cos(a) * speed + Math.cos(perp) * speed * sway,
      y: Math.sin(a) * speed + Math.sin(perp) * speed * sway,
    };
  },

  strafe({ self, target, speed, params, state }) {
    const range = params?.range ?? 180;
    const d = distance(self.x, self.y, target.x, target.y);
    const a = angleBetween(self.x, self.y, target.x, target.y);
    let radial = 0;
    if (d > range + 20) radial = 1; else if (d < range - 20) radial = -1;
    const perp = a + Math.PI / 2;
    state.dir = state.dir || 1;
    return {
      x: Math.cos(a) * speed * radial + Math.cos(perp) * speed * 0.8 * state.dir,
      y: Math.sin(a) * speed * radial + Math.sin(perp) * speed * 0.8 * state.dir,
    };
  },

  orbit({ self, target, speed, state }) {
    const a = angleBetween(self.x, self.y, target.x, target.y);
    const perp = a + Math.PI / 2;
    state.dir = state.dir || 1;
    return { x: Math.cos(perp) * speed * state.dir, y: Math.sin(perp) * speed * state.dir };
  },

  charge({ self, target, speed, params, dt, state }) {
    const windup = params?.windup ?? 600;
    const dash = params?.dash ?? 400;
    const recover = params?.recover ?? 700;
    const dashSpeed = speed * (params?.dashMul ?? 3);
    state.mode = state.mode || 'windup';
    state.t = (state.t || 0) + dt;
    if (state.mode === 'windup') {
      if (state.t >= windup) {
        state.mode = 'dash'; state.t = 0;
        state.heading = angleBetween(self.x, self.y, target.x, target.y);
      }
      return { x: 0, y: 0 };
    }
    if (state.mode === 'dash') {
      if (state.t >= dash) { state.mode = 'recover'; state.t = 0; return { x: 0, y: 0 }; }
      return { x: Math.cos(state.heading) * dashSpeed, y: Math.sin(state.heading) * dashSpeed };
    }
    if (state.t >= recover) { state.mode = 'windup'; state.t = 0; }
    return { x: 0, y: 0 };
  },

  burrow({ self, target, speed, dt, params, state }) {
    const submergeMs    = params?.submergeMs    ?? BURROW_SUBMERGE_MS;
    const telegraphMs   = params?.surfaceTelegraphMs ?? params?.emergeMs ?? BURROW_TELEGRAPH_MS;
    const recoverMs     = params?.recoverMs     ?? BURROW_RECOVER_MS;
    const dashSpeed     = speed * (params?.dashMul ?? 3.5);

    state.mode = state.mode || 'submerged';
    state.t    = (state.t || 0) + dt;

    if (state.mode === 'submerged') {
      if (state.t >= submergeMs) { state.mode = 'reposition'; state.t = 0; }
      return { x: 0, y: 0, submerged: true };
    }

    if (state.mode === 'reposition') {
      // Teleport to a spot near the target (caller handles the position write).
      state.mode = 'telegraph';
      state.t = 0;
      // Offset so the enemy doesn't land exactly on the caster.
      const a = angleBetween(target.x, target.y, self.x, self.y);
      const dist = 80;
      const r = self.radius || 16;
      const rx = clamp(target.x + Math.cos(a) * dist, r, GAME_WIDTH - r);
      const ry = clamp(target.y + Math.sin(a) * dist, r, GAME_HEIGHT - r);
      return { x: 0, y: 0, repositionTo: { x: rx, y: ry } };
    }

    if (state.mode === 'telegraph') {
      if (state.t >= telegraphMs) { state.mode = 'attack'; state.t = 0; }
      return { x: 0, y: 0, surfacing: true };
    }

    if (state.mode === 'attack') {
      // Fire once, immediately transition to recover.
      state.mode = 'recover';
      state.t = 0;
      const heading = angleBetween(self.x, self.y, target.x, target.y);
      state.dashHeading = heading;
      return { x: Math.cos(heading) * dashSpeed, y: Math.sin(heading) * dashSpeed, dashStrike: true };
    }

    if (state.mode === 'recover') {
      if (state.t >= recoverMs) { state.mode = 'submerged'; state.t = 0; }
      return { x: 0, y: 0, vulnerable: true };
    }

    return { x: 0, y: 0 }; // fallback
  },

  erratic({ speed, dt, state }) {
    // Deterministic pseudo-random heading (LCG) so it's testable; reroll every 500ms.
    state.t = (state.t || 0) - dt;
    if (state.heading === undefined || state.t <= 0) {
      state.t = 500;
      // NOTE: fresh instances share seed=1 until set; vary state.seed per-enemy when spawning for diverse headings
      state.seed = ((state.seed || 1) * 1103515245 + 12345) & 0x7fffffff;
      state.heading = (state.seed / 0x7fffffff) * Math.PI * 2;
    }
    return { x: Math.cos(state.heading) * speed, y: Math.sin(state.heading) * speed };
  },
};

export function computeMovement(def, state, ctx) {
  const type = def.movement && def.movement.type;
  const fn = MOVEMENTS[type] || MOVEMENTS.chase;
  return fn({ ...ctx, params: def.movement, state });
}

// --- Attack sequencer ---------------------------------------------------------
// Advances one attack's runtime timer. Returns {} | { telegraph: true } | { fire: true }.
// rt is mutable per-attack state: { remaining, mode, tele, burstLeft, burstTimer }.
export function stepAttack(att, rt, dt) {
  // Mid-burst: emit the queued shots spaced by burstGap.
  if (rt.burstLeft > 0) {
    rt.burstTimer -= dt;
    if (rt.burstTimer <= 0) {
      rt.burstLeft -= 1;
      rt.burstTimer = att.burstGap ?? DEFAULT_BURST_GAP;
      return { fire: true };
    }
    return {};
  }
  const every = att.every ?? 1000;
  if (rt.mode === 'telegraph') {
    rt.tele -= dt;
    if (rt.tele <= 0) { rt.mode = 'cooldown'; rt.remaining = every; return startBurstOrFire(att, rt); }
    return { telegraph: true };
  }
  rt.remaining = (rt.remaining === undefined ? every : rt.remaining) - dt;
  if (rt.remaining <= 0) {
    if (att.telegraph > 0) { rt.mode = 'telegraph'; rt.tele = att.telegraph; return { telegraph: true }; }
    rt.remaining = every;
    return startBurstOrFire(att, rt);
  }
  return {};
}

// On a fire trigger, queue the remaining burst shots (if any) and fire the first.
function startBurstOrFire(att, rt) {
  if (att.burst > 1) { rt.burstLeft = att.burst - 1; rt.burstTimer = att.burstGap ?? DEFAULT_BURST_GAP; }
  return { fire: true };
}

// --- Projectile builder -------------------------------------------------------
// Turns a fired attack into projectile specs {angle, speed, damage}.
// ctx = { self, target, damage? }  (damage = fallback when the attack omits one)
export function buildProjectiles(att, ctx) {
  const { self, target } = ctx;
  const base = angleBetween(self.x, self.y, target.x, target.y);
  const speed = att.speed ?? 240;
  const damage = att.damage ?? ctx.damage ?? 8;
  const out = [];
  if (att.type === 'shootStraight') {
    out.push({ angle: base, speed, damage });
  } else if (att.type === 'shootSpread') {
    const n = att.count ?? 3;
    const arc = ((att.arc ?? 30) * Math.PI) / 180;
    const start = base - arc / 2;
    const step = n > 1 ? arc / (n - 1) : 0;
    for (let i = 0; i < n; i++) out.push({ angle: start + step * i, speed, damage });
  } else if (att.type === 'nova') {
    const n = att.count ?? 10;
    for (let i = 0; i < n; i++) out.push({ angle: (Math.PI * 2 * i) / n, speed, damage });
  } else if (att.type === 'shootHoming') {
    out.push({ angle: base, speed, damage, homing: true });
  } else if (att.type === 'shootBurst') {
    out.push({ angle: base, speed, damage });
  }
  // melee and not-yet-implemented types produce no projectiles.
  return out;
}

// --- Modifier lookup ----------------------------------------------------------
// Modifiers live on def.modifiers as strings ('explodesOnDeath') or objects
// ({ type: 'onHitBurn', dps, ms }). Returns the (normalized) entry or null.
export function findModifier(def, type) {
  for (const m of (def && def.modifiers) || []) {
    if (typeof m === 'string') { if (m === type) return { type }; }
    else if (m && m.type === type) return { ...m };
  }
  return null;
}

// Builds the child enemy defs when an enemy with splitsOnDeath dies.
// Returns [] if the modifier is absent or the enemy is already a split child.
export function buildSplitChildren(def) {
  if (def._split) return []; // one generation only
  const mod = findModifier(def, 'splitsOnDeath');
  if (!mod) return [];
  const count = mod.count ?? 2;
  const children = [];
  for (let i = 0; i < count; i++) {
    const child = {
      ...def,
      hp: Math.max(1, Math.round((def.hp ?? 40) * 0.5)),
      radius: Math.max(16, Math.round((def.radius ?? 16) * 0.7)),
      _split: true, // prevents re-splitting
      _spawnType: mod.spawnType || null,
      // Strip splitsOnDeath from children so they definitely cannot split again.
      modifiers: (def.modifiers || []).filter(
        (m) => (typeof m === 'string' ? m : m.type) !== 'splitsOnDeath'
      ),
    };
    children.push(child);
  }
  return children;
}

export const LIFECYCLE = Object.freeze({ EGG: 'egg', TADPOLE: 'tadpole', ADULT: 'adult' });

// Ticks the per-enemy lifecycle timer (egg→tadpole→adult).
// state: { lifecycle?: string, lifecycleTimer?: number }
// Returns { promote: bool, promoteTo?: string }.
export function tickLifecycle(state, delta) {
  if (!state.lifecycle) return { promote: false };
  state.lifecycleTimer = (state.lifecycleTimer ?? 0) + delta;

  if (state.lifecycle === LIFECYCLE.EGG) {
    if (state.lifecycleTimer >= EGG_HATCH_MS) {
      state.lifecycle = LIFECYCLE.TADPOLE;
      state.lifecycleTimer = 0;
      return { promote: true, promoteTo: LIFECYCLE.TADPOLE };
    }
    return { promote: false };
  }

  if (state.lifecycle === LIFECYCLE.TADPOLE) {
    if (state.lifecycleTimer >= TADPOLE_GROW_MS) {
      state.lifecycle = LIFECYCLE.ADULT;
      state.lifecycleTimer = 0;
      return { promote: true, promoteTo: LIFECYCLE.ADULT };
    }
    return { promote: false };
  }

  // ADULT: no further promotion.
  return { promote: false };
}
