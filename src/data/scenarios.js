import { TEX, COLORS } from '../config.js';

// A scenario is fully data-driven: dialogues + ordered waves + temple + boss.
// Wave entry: { spawns: [{ type, count }], spawnDelay } — spawnDelay ms between spawns.
export const SCENARIO_1 = {
  id: 'scenario1',
  intro: [
    { speaker: 'Narrador', text: 'Un amor prohibido entre una princesa y un hechicero fue castigado con la muerte.' },
    { speaker: 'Narrador', text: 'Su hija huérfana creció con un solo propósito: la venganza.' },
    { speaker: 'The Caster', text: 'Abuelo… Rey. Tu trono se construyó sobre la sangre de mis padres.' },
  ],
  waves: [
    { spawnDelay: 700, spawns: [{ type: 'villager', count: 6 }] },
    { spawnDelay: 650, spawns: [{ type: 'villager', count: 5 }, { type: 'archer', count: 2 }] },
    { spawnDelay: 600, spawns: [{ type: 'warrior', count: 3 }, { type: 'archer', count: 2 }] },
  ],
  miniboss: { key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp: 300, speed: 70, damage: 18, radius: 22, behavior: 'chase' },
  temple: {
    element: 'fire',
    grantsSkill: 'fireball',
    dialogue: [
      { speaker: 'Templo de Fuego', text: 'Quien arde en ira, que arda también su enemigo.' },
      { speaker: 'The Caster', text: 'Fuego. Sí. Que ardan todos.' },
    ],
  },
  boss: {
    key: 'boss', tex: TEX.boss, color: COLORS.boss, hp: 800, speed: 55, damage: 25, radius: 30, behavior: 'chase',
    dialogue: [
      { speaker: 'Guardia Real', text: 'Niña… tus padres traicionaron a la corona. El Rey solo impartió justicia.' },
      { speaker: 'The Caster', text: 'Eso no fue justicia. Fue miedo. Y el miedo se quema.' },
      { speaker: 'Narrador', text: 'El primer guardián cae. El camino al castillo se abre…' },
    ],
  },
  skillPointsReward: 4,
};
