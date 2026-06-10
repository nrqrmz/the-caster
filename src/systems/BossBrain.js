// src/systems/BossBrain.js
// Pure (no Phaser). Boss phase + choreographed-sequence engine. Given a boss def
// with `phases` (each gated by an hp-fraction threshold `from`, descending), the
// active phase runs an ordered `sequence` of steps. Each step: telegraph window
// (if `telegraph` ms) → fire once → hold until `telegraph + dur`, then advance.
// A `{ do: 'wait' }` step neither telegraphs nor fires.

// Phases are ordered by descending `from`. Active = the deepest phase whose
// threshold the current hp fraction is at or below.
export function activePhase(phases, hpFrac) {
  let idx = 0;
  for (let i = 0; i < phases.length; i++) if (hpFrac <= phases[i].from) idx = i;
  return idx;
}

// rt is mutable runtime: { phaseIndex, stepIndex, stepTimer, fired }.
// Returns { phaseIndex, entered, enter, movement, speedMul, telegraph, fire }.
export function stepBoss(def, rt, hpFrac, dt) {
  const phases = def.phases || [];
  const pi = phases.length ? activePhase(phases, hpFrac) : 0;
  let entered = false;
  if (rt.phaseIndex !== pi) {
    rt.phaseIndex = pi; rt.stepIndex = 0; rt.stepTimer = 0; rt.fired = false;
    entered = true;
  }
  const phase = phases[pi] || {};
  const seq = phase.sequence || [];
  const movement = phase.movement || def.movement;
  const speedMul = phase.speedMul ?? 1;
  let telegraph = null, fire = null;
  if (seq.length) {
    const step = seq[rt.stepIndex % seq.length];
    rt.stepTimer = (rt.stepTimer ?? 0) + dt;
    const tele = step.telegraph || 0;
    const dur = step.dur ?? 500;
    const isWait = step.do === 'wait';
    if (rt.stepTimer < tele) {
      if (!isWait) telegraph = step;
    } else if (!rt.fired) {
      if (!isWait) fire = step;
      rt.fired = true;
    }
    if (rt.stepTimer >= tele + dur) { rt.stepIndex += 1; rt.stepTimer = 0; rt.fired = false; }
  }
  return { phaseIndex: pi, entered, enter: entered ? (phase.enter || []) : [], movement, speedMul, telegraph, fire };
}
