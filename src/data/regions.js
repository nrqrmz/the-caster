// src/data/regions.js
// Data-driven campaign content. Pure (no Phaser). Enemy textures are reused
// geometric keys; temple/level bosses reuse TEX.miniboss / TEX.boss.
import { TEX, COLORS } from '../config.js';
import { makeLevel } from './levelBuilder.js';
import { PYRA, VESTA, FAVILLA, SISTERS_TRIO, IGNATIUS } from './bosses/fire.js';
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO } from './bosses/water.js';

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
// Two waves for an `intermediate` or castle `pretemple` level at depth `tier`.
function interWaves(tier) {
  return [
    wave(620, [{ type: 'villager', count: ramp(4, tier) }, { type: 'archer', count: tier + 1 }]),
    wave(560, [{ type: 'warrior', count: ramp(3, tier) }, { type: 'archer', count: tier + 1 }]),
  ];
}

// Fire waves: denser, mostly ranged, with a melee rusher that forces movement.
function fireWaves(tier) {
  return [
    wave(560, [{ type: 'acolito_brasa', count: ramp(3, tier) }, { type: 'iniciado_veloz', count: ramp(2, tier) }, { type: 'lanzabrasas', count: tier }]),
    wave(520, [{ type: 'lanzabrasas', count: ramp(2, tier) }, { type: 'salamandra', count: ramp(2, tier) }, { type: 'larva_magma', count: tier }]),
    wave(480, [{ type: 'piromante', count: tier + 1 }, { type: 'pirovidente', count: tier }, { type: 'espiritu_ceniza', count: ramp(2, tier) }]),
  ];
}
function fireInterWaves(tier) {
  return [
    wave(500, [{ type: 'acolito_brasa', count: ramp(3, tier) }, { type: 'caballero_brasa', count: 1 }, { type: 'sacerdote_llama', count: 1 }, { type: 'can_lava', count: tier }]),
    wave(440, [{ type: 'piromante', count: ramp(2, tier) }, { type: 'elemental_fuego', count: 1 }, { type: 'avispa_brasa', count: ramp(3, tier) }, { type: 'totem_pira', count: 1 }]),
  ];
}

// Water waves: control + attrition (more HP, healers, mobility threats).
// Composition rule — anchor (healer/slower) + filler (ahogados/renacuajos)
//                  + mobility threat (burrow shark or charger).
// Tier 1 = only nv1 introductory creatures; tiers 2–3 add healers + frogs;
// tiers 4–6 add heavy beasts. See spec §3.4 intro schedule.
function waterWaves(tier) {
  if (tier === 1) {
    // Nv1: Ahogado filler + Acólito (slow anchor). No mobility threat yet.
    return [
      wave(700, [{ type: 'ahogado', count: ramp(4, tier) }, { type: 'acolito_escarcha', count: ramp(2, tier) }]),
      wave(650, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'lanzahielos', count: tier }]),
      wave(600, [{ type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'lanzahielos', count: tier }, { type: 'ahogado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    // Nv2: Introduce Sacerdotisa (anchor/kill-priority) + Renacuajo filler.
    return [
      wave(670, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(2, tier) }]),
      wave(630, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'lanzahielos', count: tier }]),
      wave(580, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'acolito_escarcha', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }]),
    ];
  }
  // Tier 3: Nv3 — introduce Vidente (forcing dodge), Sapo Escupidor, Rana Saltarina.
  return [
    wave(640, [{ type: 'ahogado', count: ramp(3, tier) }, { type: 'vidente_marea', count: tier }, { type: 'rana_saltarina', count: ramp(2, tier) }]),
    wave(600, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'sapo_escupidor', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(2, tier) }]),
    wave(550, [{ type: 'lanzahielos', count: tier }, { type: 'vidente_marea', count: tier }, { type: 'rana_saltarina', count: ramp(2, tier) }, { type: 'ahogado', count: ramp(2, tier) }]),
  ];
}

function waterInterWaves(tier) {
  if (tier <= 2) {
    // Nv4: introduce Guardia de Hielo (slow charger, mobility threat), Cangrejo (tank), Pez Globo.
    // Anchor = Sacerdotisa. Filler = Ahogados. Threat = Guardia de Hielo.
    return [
      wave(580, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'guardia_hielo', count: 1 }, { type: 'acolito_escarcha', count: tier }]),
      wave(530, [{ type: 'cangrejo_acorazado', count: 1 }, { type: 'pez_globo', count: ramp(2, tier) }, { type: 'vidente_marea', count: tier }, { type: 'ahogado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 3) {
    // Nv5: introduce Corista del Abismo (aura kill-priority), Serpiente Marina, Burbuja Gélida.
    // Anchor = Sacerdotisa + Corista. Filler = Renacuajos/Ahogados. Threat = Guardia de Hielo.
    return [
      wave(540, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'guardia_hielo', count: 1 }, { type: 'burbuja_gelida', count: tier }]),
      wave(490, [{ type: 'corista_abismo', count: 1 }, { type: 'serpiente_marina', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }, { type: 'pez_globo', count: tier }]),
    ];
  }
  // Tier 4 (inter(4) = Nv6): introduce Medusa (splitsOnDeath), Tiburón Joven (burrow), Tortuga Acorazada.
  // Anchor = Sacerdotisa. Filler = Ahogados/Renacuajos. Threat = Tiburón Joven (burrow).
  return [
    wave(510, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'medusa', count: tier }, { type: 'ahogado', count: ramp(3, tier) }, { type: 'tiburon_joven', count: 1 }]),
    wave(460, [{ type: 'tortuga_acorazada', count: 1 }, { type: 'serpiente_marina', count: ramp(2, tier) }, { type: 'renacuajo', count: ramp(3, tier) }, { type: 'burbuja_gelida', count: tier }]),
  ];
}

const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 22, behavior: 'chase', elite: true });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 28, behavior: 'chase', elite: true });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 32, behavior: 'chase', elite: true, mechanics });

// Elemental temple-boss mechanics (each temple feels distinct). See BossMechanics.
const MECHANICS = {
  fire:  [{ type: 'nova', every: 3000, count: 10, speed: 240, damage: 12 }, { type: 'boulder', every: 2200, speed: 220, damage: 22 }],
  water: [{ type: 'nova', every: 2400, count: 14, speed: 210, damage: 10 }],
  air:   [{ type: 'boulder', every: 1700, speed: 320, damage: 16 }, { type: 'nova', every: 3200, count: 8, speed: 270, damage: 10 }],
  earth: [{ type: 'poisonFloor', every: 3200, radius: 70, dps: 30, duration: 4000 }, { type: 'boulder', every: 2400, speed: 170, damage: 28 }],
};

// Build a standard elemental branch: 8 levels, one boss per level.
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, levelBoss = null, templeBoss = null }) {
  // nv7 is a dedicated levelboss level (boss only): the trio (multi-boss + lava
  // triangle) when provided, else a single default level-boss blob.
  const levelBossSpec = levelBosses
    ? { bosses: levelBosses, triangle: true }
    : levelBoss
      ? { levelBoss }
      : { levelBoss: lb(650, 24) };
  const levels = [
    makeLevel(`${id}_1`, id, 'basic', { waves: basic(1), dialogue: { onEnter: intro } }),
    makeLevel(`${id}_2`, id, 'basic', { waves: basic(2) }),
    makeLevel(`${id}_3`, id, 'basic', { waves: basic(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: inter(2), miniboss: minibosses[0] || mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: inter(3), miniboss: minibosses[1] || mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'intermediate', { waves: inter(4), miniboss: minibosses[2] || mb(380, 20) }),
    makeLevel(`${id}_7`, id, 'levelboss', { ...levelBossSpec }),
    makeLevel(`${id}_8`, id, 'temple', {
      templeBoss: templeBoss || tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'speaker.caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels };
}

// The castle: 5 hard levels; final 'temple' phase is the King (puppet) reveal.
function makeCastle() {
  const id = 'castle';
  const levels = [
    makeLevel(`${id}_1`, id, 'intermediate', { waves: interWaves(4), miniboss: mb(420, 22),
      dialogue: { onEnter: [{ speaker: 'speaker.narrator', text: 'story.castle.intro.0' }] } }),
    makeLevel(`${id}_2`, id, 'intermediate', { waves: interWaves(5), miniboss: mb(460, 24) }),
    makeLevel(`${id}_3`, id, 'pretemple', { waves: interWaves(5), miniboss: mb(480, 24), levelBoss: lb(800, 28) }),
    makeLevel(`${id}_4`, id, 'pretemple', { waves: interWaves(6), miniboss: mb(520, 26), levelBoss: lb(900, 30) }),
    makeLevel(`${id}_5`, id, 'temple', {
      templeBoss: tb(1400, 30, [...MECHANICS.fire, ...MECHANICS.earth]),
      minions: [{ type: 'warrior', count: 4 }],
      dialogue: { onClear: [
        { speaker: 'speaker.caster',  text: 'story.castle.clear.0' },
        { speaker: 'speaker.unknown', text: 'story.castle.clear.1' },
        { speaker: 'speaker.caster',  text: 'story.castle.clear.2' },
        { speaker: 'speaker.unknown', text: 'story.castle.clear.3' },
        { speaker: 'speaker.narrator', text: 'story.castle.clear.4' },
      ] },
    }),
  ];
  return { id, element: null, name: 'region.castle.name', grantsSkill: null, locked: true, levels };
}

export const REGIONS = {
  fire: makeBranch({
    id: 'fire', element: 'fire', name: 'region.fire.name', grantsSkill: 'fireball',
    basic: fireWaves, inter: fireInterWaves,
    minibosses: [PYRA, VESTA, FAVILLA],
    levelBosses: SISTERS_TRIO,
    templeBoss: IGNATIUS,
    intro: [
      { speaker: 'speaker.narrator', text: 'story.fire.intro.0' },
      { speaker: 'speaker.narrator', text: 'story.fire.intro.1' },
    ],
    mageName: 'speaker.mage.fire',
    mageLines: [
      'story.fire.mage.0',
      'story.fire.mage.1',
    ],
  }),
  water: makeBranch({
    id: 'water', element: 'water', name: 'region.water.name', grantsSkill: 'freeze',
    basic: waterWaves, inter: waterInterWaves,
    minibosses: [SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL],
    levelBoss: KRAKEN,
    templeBoss: DAMA_LAGO,
    intro: [{ speaker: 'speaker.narrator', text: 'story.water.intro.0' }],
    mageName: 'speaker.mage.water',
    mageLines: [
      'story.water.mage.0',
      'story.water.mage.1',
    ],
  }),
  air: makeBranch({
    id: 'air', element: 'air', name: 'region.air.name', grantsSkill: 'lightning',
    intro: [{ speaker: 'speaker.narrator', text: 'story.air.intro.0' }],
    mageName: 'speaker.mage.air',
    mageLines: [
      'story.air.mage.0',
      'story.air.mage.1',
    ],
  }),
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'region.earth.name', grantsSkill: 'poison',
    intro: [{ speaker: 'speaker.narrator', text: 'story.earth.intro.0' }],
    mageName: 'speaker.mage.earth',
    mageLines: [
      'story.earth.mage.0',
      'story.earth.mage.1',
    ],
  }),
  castle: makeCastle(),
};

export const REGION_ORDER = ['fire', 'water', 'air', 'earth'];
export const CASTLE_ID = 'castle';
export const REQUIRED_ELEMENTS = ['fire', 'water', 'air', 'earth'];
