// src/systems/CombatSystem.js
export function applyDamage(entity, amount) {
  const dmg = Math.max(0, amount);
  const hp = Math.max(0, entity.hp - dmg);
  return { hp, dead: hp <= 0 };
}
