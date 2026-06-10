// Each node: id, label (short, shown in its track column), cost (skill points),
// requires (prereq node ids — the previous node in its track), effect { stat, add }.
// `add` is negative for cooldowns / shotRate / freezeSlowPct (lower = better).
export const SKILL_TREE = {
  // General — Ataque básico
  dmg1:  { id: 'dmg1',  label: '+5',     cost: 1, requires: [],        effect: { stat: 'basicDamage', add: 5 } },
  dmg2:  { id: 'dmg2',  label: '+8',     cost: 2, requires: ['dmg1'],  effect: { stat: 'basicDamage', add: 8 } },
  dmg3:  { id: 'dmg3',  label: '+12',    cost: 3, requires: ['dmg2'],  effect: { stat: 'basicDamage', add: 12 } },
  rate1: { id: 'rate1', label: '−60ms',  cost: 1, requires: [],        effect: { stat: 'shotRate', add: -60 } },
  rate2: { id: 'rate2', label: '−80ms',  cost: 2, requires: ['rate1'], effect: { stat: 'shotRate', add: -80 } },
  rate3: { id: 'rate3', label: '−100ms', cost: 3, requires: ['rate2'], effect: { stat: 'shotRate', add: -100 } },
  // General — Vida
  hp1:    { id: 'hp1',    label: '+25', cost: 1, requires: [],         effect: { stat: 'maxHealth', add: 25 } },
  hp2:    { id: 'hp2',    label: '+40', cost: 2, requires: ['hp1'],    effect: { stat: 'maxHealth', add: 40 } },
  hp3:    { id: 'hp3',    label: '+60', cost: 3, requires: ['hp2'],    effect: { stat: 'maxHealth', add: 60 } },
  regen1: { id: 'regen1', label: '+2/s', cost: 2, requires: [],         effect: { stat: 'healthRegen', add: 2 } },
  regen2: { id: 'regen2', label: '+3/s', cost: 3, requires: ['regen1'], effect: { stat: 'healthRegen', add: 3 } },
  // General — Movilidad
  spd1: { id: 'spd1', label: '+25', cost: 1, requires: [],       effect: { stat: 'moveSpeed', add: 25 } },
  spd2: { id: 'spd2', label: '+35', cost: 2, requires: ['spd1'], effect: { stat: 'moveSpeed', add: 35 } },

  // Fuego
  f_dmg1:  { id: 'f_dmg1',  label: '+15',   cost: 2, requires: [],          effect: { stat: 'fireballDamage', add: 15 } },
  f_dmg2:  { id: 'f_dmg2',  label: '+25',   cost: 3, requires: ['f_dmg1'],  effect: { stat: 'fireballDamage', add: 25 } },
  f_cd1:   { id: 'f_cd1',   label: '−800ms', cost: 2, requires: [],         effect: { stat: 'fireballCooldown', add: -800 } },
  f_cd2:   { id: 'f_cd2',   label: '−800ms', cost: 3, requires: ['f_cd1'],  effect: { stat: 'fireballCooldown', add: -800 } },
  f_area1: { id: 'f_area1', label: '+20',   cost: 2, requires: [],          effect: { stat: 'fireballRadius', add: 20 } },
  f_area2: { id: 'f_area2', label: '+25',   cost: 3, requires: ['f_area1'], effect: { stat: 'fireballRadius', add: 25 } },
  f_burn1: { id: 'f_burn1', label: 'Burn +8/s', cost: 3, requires: [],          effect: { stat: 'burnDamage', add: 8 } },
  f_burn2: { id: 'f_burn2', label: '+6/s',  cost: 3, requires: ['f_burn1'], effect: { stat: 'burnDamage', add: 6 } },

  // Aire (lightning)
  l_dmg1:   { id: 'l_dmg1',   label: '+12',   cost: 2, requires: [],           effect: { stat: 'lightningDamage', add: 12 } },
  l_dmg2:   { id: 'l_dmg2',   label: '+18',   cost: 3, requires: ['l_dmg1'],   effect: { stat: 'lightningDamage', add: 18 } },
  l_cd1:    { id: 'l_cd1',    label: '−800ms', cost: 2, requires: [],          effect: { stat: 'lightningCooldown', add: -800 } },
  l_cd2:    { id: 'l_cd2',    label: '−800ms', cost: 3, requires: ['l_cd1'],   effect: { stat: 'lightningCooldown', add: -800 } },
  l_chain1: { id: 'l_chain1', label: '+1',    cost: 3, requires: [],           effect: { stat: 'lightningChain', add: 1 } },
  l_chain2: { id: 'l_chain2', label: '+1',    cost: 3, requires: ['l_chain1'], effect: { stat: 'lightningChain', add: 1 } },
  l_chain3: { id: 'l_chain3', label: '+1',    cost: 4, requires: ['l_chain2'], effect: { stat: 'lightningChain', add: 1 } },

  // Tierra (poison)
  p_dmg1:  { id: 'p_dmg1',  label: '+8/s',   cost: 2, requires: [],          effect: { stat: 'poisonDamage', add: 8 } },
  p_dmg2:  { id: 'p_dmg2',  label: '+10/s',  cost: 3, requires: ['p_dmg1'],  effect: { stat: 'poisonDamage', add: 10 } },
  p_cd1:   { id: 'p_cd1',   label: '−1000ms', cost: 2, requires: [],         effect: { stat: 'poisonCooldown', add: -1000 } },
  p_cd2:   { id: 'p_cd2',   label: '−1000ms', cost: 3, requires: ['p_cd1'],  effect: { stat: 'poisonCooldown', add: -1000 } },
  p_dur1:  { id: 'p_dur1',  label: '+1.5s',  cost: 2, requires: [],          effect: { stat: 'poisonDuration', add: 1500 } },
  p_dur2:  { id: 'p_dur2',  label: '+1.5s',  cost: 3, requires: ['p_dur1'],  effect: { stat: 'poisonDuration', add: 1500 } },
  p_heal1: { id: 'p_heal1', label: '+5/s',   cost: 3, requires: [],          effect: { stat: 'poisonHeal', add: 5 } },
  p_heal2: { id: 'p_heal2', label: '+6/s',   cost: 3, requires: ['p_heal1'], effect: { stat: 'poisonHeal', add: 6 } },

  // Agua (freeze)
  w_cd1:   { id: 'w_cd1',   label: '−1200ms', cost: 2, requires: [],          effect: { stat: 'freezeCooldown', add: -1200 } },
  w_cd2:   { id: 'w_cd2',   label: '−1200ms', cost: 3, requires: ['w_cd1'],   effect: { stat: 'freezeCooldown', add: -1200 } },
  w_area1: { id: 'w_area1', label: '+25',    cost: 2, requires: [],           effect: { stat: 'freezeRadius', add: 25 } },
  w_area2: { id: 'w_area2', label: '+30',    cost: 3, requires: ['w_area1'],  effect: { stat: 'freezeRadius', add: 30 } },
  w_dur1:  { id: 'w_dur1',  label: '+0.8s',  cost: 2, requires: [],           effect: { stat: 'freezeDuration', add: 800 } },
  w_dur2:  { id: 'w_dur2',  label: '+1.0s',  cost: 3, requires: ['w_dur1'],   effect: { stat: 'freezeDuration', add: 1000 } },
  w_slow1: { id: 'w_slow1', label: '−10%',   cost: 3, requires: [],           effect: { stat: 'freezeSlowPct', add: -0.1 } },
  w_slow2: { id: 'w_slow2', label: '−10%',   cost: 4, requires: ['w_slow1'],  effect: { stat: 'freezeSlowPct', add: -0.1 } },
};

// Branches drive the tabbed UI and elemental gating. element=null → always available.
export const SKILL_BRANCHES = [
  { key: 'basic', label: 'Ataque básico', element: null, tracks: [
    { label: 'Daño',     nodes: ['dmg1', 'dmg2', 'dmg3'] },
    { label: 'Cadencia', nodes: ['rate1', 'rate2', 'rate3'] } ] },
  { key: 'vit', label: 'Vida', element: null, tracks: [
    { label: 'Vida máx', nodes: ['hp1', 'hp2', 'hp3'] },
    { label: 'Regen',    nodes: ['regen1', 'regen2'] } ] },
  { key: 'mob', label: 'Movilidad', element: null, tracks: [
    { label: 'Velocidad', nodes: ['spd1', 'spd2'] } ] },
  { key: 'fire', label: '🔥 Fuego', element: 'fire', tracks: [
    { label: 'Daño',      nodes: ['f_dmg1', 'f_dmg2'] },
    { label: '−Cooldown', nodes: ['f_cd1', 'f_cd2'] },
    { label: 'Área',      nodes: ['f_area1', 'f_area2'] },
    { label: 'Quemadura', nodes: ['f_burn1', 'f_burn2'] } ] },
  { key: 'air', label: '⚡ Aire', element: 'air', tracks: [
    { label: 'Daño',      nodes: ['l_dmg1', 'l_dmg2'] },
    { label: '−Cooldown', nodes: ['l_cd1', 'l_cd2'] },
    { label: 'Cadena',    nodes: ['l_chain1', 'l_chain2', 'l_chain3'] } ] },
  { key: 'earth', label: '☠️ Tierra', element: 'earth', tracks: [
    { label: 'Daño',          nodes: ['p_dmg1', 'p_dmg2'] },
    { label: '−Cooldown',     nodes: ['p_cd1', 'p_cd2'] },
    { label: 'Duración',      nodes: ['p_dur1', 'p_dur2'] },
    { label: 'Regen de zona', nodes: ['p_heal1', 'p_heal2'] } ] },
  { key: 'water', label: '❄️ Agua', element: 'water', tracks: [
    { label: '−Cooldown',     nodes: ['w_cd1', 'w_cd2'] },
    { label: 'Área',          nodes: ['w_area1', 'w_area2'] },
    { label: 'Duración',      nodes: ['w_dur1', 'w_dur2'] },
    { label: 'Ralentización', nodes: ['w_slow1', 'w_slow2'] } ] },
];

// Display order for the skill tree UI (top to bottom) — kept for SkillTreeScene compatibility.
export const SKILL_TREE_ORDER = Object.keys(SKILL_TREE);
