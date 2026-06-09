// Each node: id, label, cost (skill points), requires (node ids),
// effect { stat, add }. add may be negative (e.g. faster shotRate).
export const SKILL_TREE = {
  basic_dmg_1: { id: 'basic_dmg_1', label: '+Daño básico I',  cost: 1, requires: [], effect: { stat: 'basicDamage', add: 5 } },
  basic_dmg_2: { id: 'basic_dmg_2', label: '+Daño básico II', cost: 2, requires: ['basic_dmg_1'], effect: { stat: 'basicDamage', add: 10 } },
  shot_rate_1: { id: 'shot_rate_1', label: '+Cadencia I',     cost: 1, requires: [], effect: { stat: 'shotRate', add: -75 } },
  move_speed_1: { id: 'move_speed_1', label: '+Velocidad I',  cost: 1, requires: [], effect: { stat: 'moveSpeed', add: 30 } },
  max_hp_1:    { id: 'max_hp_1',    label: '+Vida máx I',     cost: 1, requires: [], effect: { stat: 'maxHealth', add: 25 } },
  fireball_dmg_1: { id: 'fireball_dmg_1', label: '+Daño Fireball I', cost: 2, requires: [], effect: { stat: 'fireballDamage', add: 20 } },
  fireball_cd_1:  { id: 'fireball_cd_1',  label: '-CD Fireball I',   cost: 2, requires: ['fireball_dmg_1'], effect: { stat: 'fireballCooldown', add: -1000 } },
};

// Display order for the skill tree UI (top to bottom).
export const SKILL_TREE_ORDER = [
  'basic_dmg_1', 'basic_dmg_2',
  'shot_rate_1', 'move_speed_1', 'max_hp_1',
  'fireball_dmg_1', 'fireball_cd_1',
];
