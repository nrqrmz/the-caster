// src/data/levelBuilder.js
// Pure: expands a level `kind` preset + compact spec into a level with an
// ordered `phases` array consumed by WaveRunner/GameScene. No Phaser.

export const KIND_PHASES = {
  basic:        ['wave', 'wave', 'wave'],
  intermediate: ['wave', 'wave', 'miniboss'],
  pretemple:    ['wave', 'wave', 'miniboss', 'levelBoss'],
  temple:       ['templeBoss'],
};

export const DEFAULT_REWARD = { basic: 1, intermediate: 2, pretemple: 3, temple: 4 };

function buildPhase(type, spec, waveCursor) {
  if (type === 'wave') {
    const w = spec.waves[waveCursor.i++ % spec.waves.length];
    return { type: 'wave', spawnDelay: w.spawnDelay, spawns: w.spawns };
  }
  if (type === 'miniboss')  return { type: 'miniboss', enemyDef: spec.miniboss, minions: spec.minions };
  if (type === 'levelBoss') return { type: 'levelBoss', enemyDef: spec.levelBoss, bosses: spec.bosses, triangle: spec.triangle, minions: spec.minions };
  if (type === 'templeBoss') {
    return { type: 'templeBoss', enemyDef: spec.templeBoss, mechanics: spec.templeBoss?.mechanics, minions: spec.minions };
  }
  throw new Error(`fase desconocida: ${type}`);
}

export function makeLevel(id, regionId, kind, spec = {}) {
  const types = KIND_PHASES[kind];
  if (!types) throw new Error(`kind desconocido: ${kind}`);
  const waveCursor = { i: 0 };
  const phases = types.map((t) => buildPhase(t, spec, waveCursor));
  return {
    id,
    regionId,
    kind,
    phases,
    dialogue: spec.dialogue || {},
    reward: { skillPoints: spec.skillPoints ?? DEFAULT_REWARD[kind] },
  };
}
