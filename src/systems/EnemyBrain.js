// src/systems/EnemyBrain.js
// Pure (no Phaser). Turns an enemy def + mutable runtime state into a per-frame
// Intent that GameScene executes. Movement and attack-pattern decisions live here
// so they can be unit-tested under `node --test`.

function angleBetween(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function distance(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

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
// rt is mutable per-attack state: { remaining, mode, tele }.
export function stepAttack(att, rt, dt) {
  const every = att.every ?? 1000;
  if (rt.mode === 'telegraph') {
    rt.tele -= dt;
    if (rt.tele <= 0) { rt.mode = 'cooldown'; rt.remaining = every; return { fire: true }; }
    return { telegraph: true };
  }
  rt.remaining = (rt.remaining === undefined ? every : rt.remaining) - dt;
  if (rt.remaining <= 0) {
    if (att.telegraph > 0) { rt.mode = 'telegraph'; rt.tele = att.telegraph; return { telegraph: true }; }
    rt.remaining = every;
    return { fire: true };
  }
  return {};
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
  }
  // melee and not-yet-implemented types produce no projectiles.
  return out;
}
