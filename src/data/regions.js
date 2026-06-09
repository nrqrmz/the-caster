// src/data/regions.js
// Data-driven campaign content. Pure (no Phaser). Enemy textures are reused
// geometric keys; temple/level bosses reuse TEX.miniboss / TEX.boss.
import { TEX, COLORS } from '../config.js';
import { makeLevel } from './levelBuilder.js';

const wave = (spawnDelay, spawns) => ({ spawnDelay, spawns });
const ramp = (base, tier) => Math.round(base * (1 + 0.4 * (tier - 1)));

// Three escalating waves for a `basic` level at depth `tier` (1..3).
function basicWaves(tier) {
  return [
    wave(700, [{ type: 'villager', count: ramp(5, tier) }]),
    wave(650, [{ type: 'villager', count: ramp(4, tier) }, { type: 'archer', count: tier }]),
    wave(600, [{ type: 'warrior', count: ramp(2, tier) }, { type: 'archer', count: tier }]),
  ];
}
// Two waves for an `intermediate`/`pretemple` level at depth `tier`.
function interWaves(tier) {
  return [
    wave(620, [{ type: 'villager', count: ramp(4, tier) }, { type: 'archer', count: tier + 1 }]),
    wave(560, [{ type: 'warrior', count: ramp(3, tier) }, { type: 'archer', count: tier + 1 }]),
  ];
}

const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 22, behavior: 'chase' });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 28, behavior: 'chase' });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 32, behavior: 'chase', mechanics });

// Elemental temple-boss mechanics (each temple feels distinct). See BossMechanics.
const MECHANICS = {
  fire:  [{ type: 'nova', every: 3000, count: 10, speed: 240, damage: 12 }, { type: 'boulder', every: 2200, speed: 220, damage: 22 }],
  water: [{ type: 'nova', every: 2400, count: 14, speed: 210, damage: 10 }],
  air:   [{ type: 'boulder', every: 1700, speed: 320, damage: 16 }, { type: 'nova', every: 3200, count: 8, speed: 270, damage: 10 }],
  earth: [{ type: 'poisonFloor', every: 3200, radius: 70, dps: 30, duration: 4000 }, { type: 'boulder', every: 2400, speed: 170, damage: 28 }],
};

// Build a standard elemental branch: 7 levels.
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines }) {
  const levels = [
    makeLevel(`${id}_1`, id, 'basic', { waves: basicWaves(1), dialogue: { onEnter: intro } }),
    makeLevel(`${id}_2`, id, 'basic', { waves: basicWaves(2) }),
    makeLevel(`${id}_3`, id, 'basic', { waves: basicWaves(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: interWaves(2), miniboss: mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: interWaves(3), miniboss: mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'pretemple', { waves: interWaves(4), miniboss: mb(380, 20), levelBoss: lb(650, 24) }),
    makeLevel(`${id}_7`, id, 'temple', {
      templeBoss: tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'The Caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels };
}

// The castle: 5 hard levels; final 'temple' phase is the King (puppet) reveal.
function makeCastle() {
  const id = 'castle';
  const levels = [
    makeLevel(`${id}_1`, id, 'intermediate', { waves: interWaves(4), miniboss: mb(420, 22),
      dialogue: { onEnter: [{ speaker: 'Narrador', text: 'Las puertas del castillo se abren. Los que amaban a quienes mataste te esperan.' }] } }),
    makeLevel(`${id}_2`, id, 'intermediate', { waves: interWaves(5), miniboss: mb(460, 24) }),
    makeLevel(`${id}_3`, id, 'pretemple', { waves: interWaves(5), miniboss: mb(480, 24), levelBoss: lb(800, 28) }),
    makeLevel(`${id}_4`, id, 'pretemple', { waves: interWaves(6), miniboss: mb(520, 26), levelBoss: lb(900, 30) }),
    makeLevel(`${id}_5`, id, 'temple', {
      templeBoss: tb(1400, 30, [...MECHANICS.fire, ...MECHANICS.earth]),
      minions: [{ type: 'warrior', count: 4 }],
      dialogue: { onClear: [
        { speaker: 'The Caster', text: 'Abuelo… el Rey. Por fin.' },
        { speaker: '???', text: 'No queda nada de él que puedas matar. Hace años que el Rey está muerto.' },
        { speaker: 'The Caster', text: '¿Quién eres? Conocías a mi padre…' },
        { speaker: '???', text: 'Su amigo. Y quien mueve este cadáver con magia. Tu venganza apenas comienza, niña.' },
        { speaker: 'Narrador', text: 'CONTINUARÁ…' },
      ] },
    }),
  ];
  return { id, element: null, name: 'El Castillo', grantsSkill: null, locked: true, levels };
}

export const REGIONS = {
  fire: makeBranch({
    id: 'fire', element: 'fire', name: 'El Volcán', grantsSkill: 'fireball',
    intro: [
      { speaker: 'Narrador', text: 'Un amor prohibido entre una princesa y un hechicero fue castigado por el Consejo de Magos.' },
      { speaker: 'Narrador', text: 'Tu madre, exiliada. Tu padre, asesinado. Tú, la huérfana que descendió al volcán por venganza.' },
    ],
    mageName: 'Mago del Fuego',
    mageLines: [
      'Yo encendí la pira de tu padre. Ardió pidiendo clemencia.',
      'Entonces aprenderé tu fuego, y haré que cada mago del Consejo arda igual.',
    ],
  }),
  water: makeBranch({
    id: 'water', element: 'water', name: 'El Lago', grantsSkill: 'freeze',
    intro: [{ speaker: 'Narrador', text: 'Bajo el lago habita la maga que firmó el exilio de tu madre.' }],
    mageName: 'Dama del Lago',
    mageLines: [
      'Tu madre suplicó por su vida en estas aguas. Yo no escuché.',
      'Pues estas aguas ahora son mías.',
    ],
  }),
  air: makeBranch({
    id: 'air', element: 'air', name: 'La Montaña', grantsSkill: 'thunderbolt',
    intro: [{ speaker: 'Narrador', text: 'En la cima, el mago que falsificó la sentencia de tu padre te observa caer y subir.' }],
    mageName: 'Mago del Aire',
    mageLines: [
      'Yo redacté la mentira que condenó a tu padre. El Consejo solo asintió.',
      'Entonces tu rayo escribirá la verdad sobre tu tumba.',
    ],
  }),
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'El Bosque', grantsSkill: 'poison',
    intro: [{ speaker: 'Narrador', text: 'El bosque esconde al más viejo del Consejo, el que envenenó el oído del Rey.' }],
    mageName: 'Mago de la Tierra',
    mageLines: [
      'Yo le susurré al Rey que tu familia era una amenaza. Y me creyó.',
      'El Rey ya no te servirá de nada. Lo verás tú misma.',
    ],
  }),
  castle: makeCastle(),
};

export const REGION_ORDER = ['fire', 'water', 'air', 'earth'];
export const CASTLE_ID = 'castle';
export const REQUIRED_ELEMENTS = ['fire', 'water', 'air', 'earth'];
