// src/systems/SkillTargeting.js
// Pure helpers for active-skill targeting. No Phaser. Positions are {x, y}.

// Lightning chain: target 1 is the nearest enemy to the caster (no radius limit —
// it's the cast target). Each subsequent hop is the nearest not-yet-chosen enemy
// within jumpRadius of the LAST chosen enemy. Stops at maxTargets or when none in
// range. Returns the chosen enemy indices in hit order.
export function chainTargets(casterPos, enemies, jumpRadius, maxTargets) {
  if (!enemies.length || maxTargets <= 0) return [];
  const chosen = [];
  const used = new Set();
  let from = casterPos;
  for (let step = 0; step < maxTargets; step++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      if (used.has(i)) continue;
      if (enemies[i].untargetable) continue;
      const d = Math.hypot(enemies[i].x - from.x, enemies[i].y - from.y);
      if (step > 0 && d > jumpRadius) continue; // hops are range-limited; primary is not
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best === -1) break;
    used.add(best);
    chosen.push(best);
    from = enemies[best];
  }
  return chosen;
}

// Freeze affects weak enemies differently from elites (miniboss/levelBoss/templeBoss).
export function freezeEffect(def) {
  return def && def.elite ? 'slow' : 'freeze';
}
