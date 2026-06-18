// src/data/tuning.js
// Pure. Central balance knobs (curves, caps). No Phaser.

// Absolute difficulty by level depth (index 0..7), independent of player power.
// nv8 (index 7, temple boss) scales above nv7 (index 6, level boss).
export const BASE_CURVE = [1.0, 1.15, 1.3, 1.5, 1.7, 1.95, 2.3, 2.6];

// --- Difficulty rebalance (2026-06-16) ---
// Player-power bonus uses diminishing returns so adding worlds/skill points later
// cannot explode the curve. It asymptotes to POWER_CAP (points term) + a small
// linear element term. Basics receive a fraction of this bonus, elites the full
// amount; elites additionally gain bounded damage-reduction (resist) by depth.
export const POWER_CAP = 1.2;            // ceiling of the points-based power bonus
export const POWER_SCALE = 45;           // e-folding constant (~45 pts → 63% of cap)
export const PER_ELEMENT = 0.08;         // additive bonus per mastered element
export const BASIC_POWER_FACTOR = 0.35;  // share of the power bonus basics receive
export const ELITE_POWER_FACTOR = 1.0;   // share of the power bonus elites receive
export const ELITE_RESIST_MAX = 0.30;    // cap on scaling-granted damage reduction
export const ELITE_RESIST_PER_DEPTH = 0.15; // resist per unit of depth bonus

// Max enemies alive at once; waves keep queuing but the spawner throttles to this.
export const CONCURRENCY_CAP = 16;

// Contacto melee: un enemigo solo puede asestar UN golpe de contacto cada
// MELEE_CONTACT_CD ms (i-frames por enemigo). Antes el overlap drenaba vida cada
// frame (~134 HP/s con un renacuajo); ahora el contacto es un golpe discreto.
export const MELEE_CONTACT_CD = 600;

// Distancia mínima a la princesa al que puede aparecer/emerger un enemigo invocado
// (p. ej. tiburones). 160px es el valor más cercano válido; más lejos siempre vale.
export const SPAWN_SAFE_DIST = 160;

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

// --- Water world ---

// Caster slow (onHitSlow applied by water enemies).
export const CASTER_SLOW_FLOOR = 0.45; // never below 45% speed

// Whirlpool / Maelstrom hazard.
export const WHIRLPOOL_RADIUS = 120;          // px, influence circle
export const WHIRLPOOL_CENTER_PULL = 0.7;     // fraction of caster speed at the very center
export const WHIRLPOOL_CENTER_DPS = 16;       // damage/sec when caster is within 20% of center
export const WHIRLPOOL_TELEGRAPH_MS = 1200;   // warning before the vortex activates
export const WHIRLPOOL_ACTIVE_MS = 4500;      // vortex is live for this long
export const WHIRLPOOL_COOLDOWN_MS = 5000;    // gap before the boss can trigger it again

// Burrow movement.
// How close (px, center-to-center) the submerged shark swims before parking to emerge.
// Independent of SPAWN_SAFE_DIST (which governs where enemies first spawn): the shark
// should surface right next to the princess, not 160px away.
export const BURROW_EMERGE_DIST = 60;
export const BURROW_SUBMERGE_MS = 1500;       // invuln + hidden window
export const BURROW_TELEGRAPH_MS = 450;       // surface-warning ring duration (antes 400)
export const BURROW_SURFACE_MS = 2500;        // ventana de superficie/persecución vulnerable
export const BURROW_RECOVER_MS = 600;         // (legacy; ya no usado por el nuevo flujo)

// Frog lifecycle (generational summon).
export const EGG_HATCH_MS = 2500;             // egg → tadpole (antes 3500)
export const TADPOLE_GROW_MS = 4000;          // tadpole → adult frog (antes 6000)

// Río de lava de Ignatius (hazard de línea a pantalla completa).
export const LAVA_RIVER_COOLDOWN_MS = 13000;  // espera entre activaciones (fases 2-3)
export const LAVA_RIVER_TELEGRAPH_MS = 1000;  // aviso antes de encenderse
export const LAVA_RIVER_ACTIVE_MS = 2500;     // dura encendido
export const LAVA_RIVER_DPS = 18;             // menos letal que el triángulo (~28)

// --- Caster control-loss (stun/lift = Air; root = Earth). Brief but consequential. ---

// Caster control-loss mechanics.
export const CASTER_STUN_MS = 300;   // total control loss (electric discharge)
export const CASTER_LIFT_MS = 500;   // lifted by a small tornado (can't move/dodge)
export const CASTER_ROOT_MS = 800;   // legs rooted (raíces/lodo): can't move, CAN still cast
export const CC_IMMUNE_MS   = 600;   // anti-chain window after a stun/lift/root expires

// Directional push (onHitPush / gust). Impulse the caster receives on hit.
export const PUSH_FORCE = 220;       // px/sec impulse magnitude
export const PUSH_MS    = 250;       // how long the impulse decays over

// evade movement (dodging duelists). Periodic perpendicular dash.
export const EVADE_DODGE_EVERY = 1400; // ms between dodges
export const EVADE_DODGE_MS    = 220;  // dodge dash duration
export const EVADE_DODGE_MUL   = 3.0;  // dash speed = base speed × this

// Tornado-ojo hazard (the eye is the trap, not the damage — inverse of the whirlpool).
export const TORNADO_RADIUS          = 130;  // px, influence circle
export const TORNADO_EYE_PULL        = 0.7;  // fraction of caster speed pulling toward the eye
export const TORNADO_EYE_RADIUS_FRAC = 0.18; // inner "eye" zone (calm: ~0 pull, no DoT)
export const TORNADO_ENEMY_PULL      = 0.25; // light pull applied to NON-flying enemies (visual + makes `flying` matter)
export const TORNADO_TELEGRAPH_MS    = 1100; // warning before the vortex activates
export const TORNADO_ACTIVE_MS       = 4500; // vortex is live for this long
export const TORNADO_COOLDOWN_MS     = 4500; // gap before it reforms at a new spot

// Ritual meter (nv7 cultist leader). Fills while the leader channels (untargetable).
export const RITUAL_FILL_MS = 38000; // time to fill from empty to full

// Griffin flight/ground cycle (nv7 earth levelboss El Grifo).
export const GRIFFIN_GROUND_MS = 5000; // reachable window — generous + always returns (anti-spam)
export const GRIFFIN_FLIGHT_MS = 3000; // bounded untargetable dive window
