// src/systems/Difficulty.js
// Pure, class-aware difficulty scaling with diminishing returns. No Phaser.
import { SKILL_TREE } from '../data/skilltree.js';
import {
  baseDifficulty,
  POWER_CAP, POWER_SCALE, PER_ELEMENT,
  BASIC_POWER_FACTOR, ELITE_POWER_FACTOR,
  ELITE_RESIST_MAX, ELITE_RESIST_PER_DEPTH,
} from '../data/tuning.js';

function spentPoints(save) {
  return (save.purchasedNodes || []).reduce((sum, id) => {
    const node = SKILL_TREE[id];
    return sum + (node ? node.cost : 0);
  }, 0);
}

// Additive depth bonus (0 at level 0). Reuses BASE_CURVE as the single source.
export function depthBonus(levelIndex) {
  return baseDifficulty(levelIndex) - 1;
}

// Player-power bonus with diminishing returns: the points term asymptotes to
// POWER_CAP, so adding more skill points/levels later cannot explode the curve.
// The element term is a small linear add (only ~4-5 elements ever exist).
export function powerBonus(save) {
  const s = save || {};
  const spent = spentPoints(s);
  const elements = (s.elements || []).length;
  return POWER_CAP * (1 - Math.exp(-spent / POWER_SCALE)) + elements * PER_ELEMENT;
}

// Combine two damage-reduction factors so the result never reaches 1.
// Round to 10 decimal places to avoid IEEE-754 float noise in tests/comparisons.
export function combineResist(a, b) {
  return Math.round((1 - (1 - a) * (1 - b)) * 1e10) / 1e10;
}

// Per-run scaling context: separate multipliers for basic vs elite enemies, plus
// the depth-based resist granted to elites.
export function difficultyContext(save, levelIndex) {
  const depth = depthBonus(levelIndex);
  const power = powerBonus(save);
  return {
    basicMult: 1 + depth + BASIC_POWER_FACTOR * power,
    eliteMult: 1 + depth + ELITE_POWER_FACTOR * power,
    eliteResist: Math.min(ELITE_RESIST_MAX, ELITE_RESIST_PER_DEPTH * depth),
  };
}

// Returns a new def with hp/damage scaled by enemy class. Only scales fields that
// are present (a def may omit either hp or damage). Elites also gain combined resist.
export function scaleEnemyDef(def, ctx) {
  const mult = def.elite ? ctx.eliteMult : ctx.basicMult;
  const scaled = { ...def };
  if (typeof def.hp === 'number') scaled.hp = Math.round(def.hp * mult);
  if (typeof def.damage === 'number') scaled.damage = Math.round(def.damage * mult);
  if (def.elite) {
    scaled.resist = combineResist(def.resist ?? 0, ctx.eliteResist);
  }
  return scaled;
}

// --- Legacy scalar: retained ONLY for the gold reward + debug readout. The
// economy is out of scope for the rebalance, so this preserves its old behavior.
export function difficultyMultiplier(save) {
  const s = save || {};
  const elements = (s.elements || []).length;
  return 1 + spentPoints(s) * 0.04 + elements * 0.15;
}

export function levelMultiplier(save, levelIndex) {
  return baseDifficulty(levelIndex) * difficultyMultiplier(save);
}
