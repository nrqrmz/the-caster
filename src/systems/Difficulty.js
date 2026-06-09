// src/systems/Difficulty.js
// Pure power-based difficulty scaling. No Phaser.
import { SKILL_TREE } from '../data/skilltree.js';

const PER_POINT = 0.04;    // each skill point spent
const PER_ELEMENT = 0.15;  // each element mastered

function spentPoints(save) {
  return (save.purchasedNodes || []).reduce((sum, id) => {
    const node = SKILL_TREE[id];
    return sum + (node ? node.cost : 0);
  }, 0);
}

export function difficultyMultiplier(save) {
  const spent = spentPoints(save || {});
  const elements = ((save && save.elements) || []).length;
  return 1 + spent * PER_POINT + elements * PER_ELEMENT;
}

// Returns a new def with hp/damage scaled (mult >= 1, so never below base).
export function scaleEnemyDef(def, mult) {
  return { ...def, hp: Math.round(def.hp * mult), damage: Math.round(def.damage * mult) };
}
