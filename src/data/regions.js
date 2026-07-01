// src/data/regions.js
// Data-driven campaign content. Pure (no Phaser). Enemy textures are reused
// geometric keys; temple/level bosses reuse TEX.miniboss / TEX.boss.
import { TEX, COLORS } from '../config.js';
import { makeLevel } from './levelBuilder.js';
import { PYRA, VESTA, FAVILLA, SISTERS_TRIO, IGNATIUS } from './bosses/fire.js';
import { SOLDADO_HIELO, SAPO_DESOVADOR, TIBURON_ABISAL, KRAKEN, DAMA_LAGO } from './bosses/water.js';
import { CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA, LIDER_CULTISTA, GALAHAD } from './bosses/air.js';
import { SENOR_LOBO, CEFALO, DRIADA, GRIFO, CIRCE } from './bosses/earth.js';

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
// Escalonado por tier (como agua/aire/tierra): cada nivel presenta criaturas
// nuevas para que ningún nivel repita el mismo roster.
// Regla de oleadas (fuego): cada ola consecutiva es MÁS grande que la anterior;
// toda ola mezcla ≥3 tipos; la ola 3 es el clímax (más cantidad, más variedad y
// las criaturas más duras del nivel). El roster crece por tier (intro escalonada).
function fireWaves(tier) {
  if (tier === 1) {
    // Nv1: introductorio — acólito (ancla a distancia) + iniciado_veloz (rusher) + salamandra.
    return [
      wave(620, [{ type: 'acolito_brasa', count: 4 }, { type: 'iniciado_veloz', count: 2 }, { type: 'salamandra', count: 2 }]),
      wave(540, [{ type: 'acolito_brasa', count: 4 }, { type: 'salamandra', count: 4 }, { type: 'iniciado_veloz', count: 3 }]),
      wave(470, [{ type: 'acolito_brasa', count: 5 }, { type: 'salamandra', count: 5 }, { type: 'iniciado_veloz', count: 5 }]),
    ];
  }
  if (tier === 2) {
    // Nv2: añade lanzabrasas (abanico), larva_magma (explota), espíritu_ceniza.
    return [
      wave(600, [{ type: 'acolito_brasa', count: 4 }, { type: 'lanzabrasas', count: 3 }, { type: 'iniciado_veloz', count: 2 }, { type: 'larva_magma', count: 2 }]),
      wave(520, [{ type: 'lanzabrasas', count: 4 }, { type: 'salamandra', count: 4 }, { type: 'espiritu_ceniza', count: 3 }, { type: 'larva_magma', count: 3 }]),
      wave(450, [{ type: 'acolito_brasa', count: 4 }, { type: 'lanzabrasas', count: 4 }, { type: 'larva_magma', count: 4 }, { type: 'espiritu_ceniza', count: 3 }, { type: 'salamandra', count: 3 }]),
    ];
  }
  // Nv3: añade piromante (ráfaga), pirovidente (homing), encapuchado_pira (charcos) + sacerdote_llama (healer) en el clímax.
  return [
    wave(580, [{ type: 'piromante', count: 3 }, { type: 'lanzabrasas', count: 3 }, { type: 'iniciado_veloz', count: 3 }, { type: 'salamandra', count: 4 }]),
    wave(500, [{ type: 'piromante', count: 4 }, { type: 'pirovidente', count: 3 }, { type: 'encapuchado_pira', count: 2 }, { type: 'larva_magma', count: 4 }, { type: 'iniciado_veloz', count: 3 }]),
    wave(430, [{ type: 'sacerdote_llama', count: 1 }, { type: 'piromante', count: 4 }, { type: 'pirovidente', count: 3 }, { type: 'encapuchado_pira', count: 3 }, { type: 'larva_magma', count: 4 }, { type: 'espiritu_ceniza', count: 3 }]),
  ];
}
function fireInterWaves(tier) {
  // Intermedios: densos y retadores (≥36 enemigos entre ola 1 y 2, antes del
  // miniboss) y escalando nv4 < nv5 < nv6. Combos duros: healers que hay que
  // matar primero, blindados/tanques que aguantan, enjambres y homing simultáneos.
  if (tier === 2) {
    // Nv4 (~36): muro de blindados + healer + estandarte que potencia el aura. Foco: el sacerdote.
    return [
      wave(520, [{ type: 'caballero_brasa', count: 3 }, { type: 'sacerdote_llama', count: 1 }, { type: 'can_lava', count: 3 }, { type: 'acolito_brasa', count: 6 }, { type: 'piromante', count: 3 }]),
      wave(440, [{ type: 'portaestandarte', count: 1 }, { type: 'caballero_brasa', count: 3 }, { type: 'sacerdote_llama', count: 2 }, { type: 'can_lava', count: 4 }, { type: 'piromante', count: 5 }, { type: 'acolito_brasa', count: 5 }]),
    ];
  }
  if (tier === 3) {
    // Nv5 (~42): doble fénix (revive) sostenido por doble healer + enjambre + homing. Puzzle de prioridad.
    return [
      wave(500, [{ type: 'elemental_fuego', count: 1 }, { type: 'sacerdote_llama', count: 1 }, { type: 'avispa_brasa', count: 6 }, { type: 'piromante', count: 5 }, { type: 'pirovidente', count: 5 }]),
      wave(420, [{ type: 'fenix_menor', count: 2 }, { type: 'elemental_fuego', count: 2 }, { type: 'sacerdote_llama', count: 2 }, { type: 'avispa_brasa', count: 8 }, { type: 'piromante', count: 6 }, { type: 'pirovidente', count: 4 }]),
    ];
  }
  // Nv6 (~48): clímax — doble coloso (tanque blindado) + torretas + carga + enjambre denso.
  return [
    wave(480, [{ type: 'coloso_magma', count: 1 }, { type: 'totem_pira', count: 1 }, { type: 'caballero_brasa', count: 4 }, { type: 'can_lava', count: 5 }, { type: 'avispa_brasa', count: 6 }, { type: 'piromante', count: 4 }]),
    wave(400, [{ type: 'coloso_magma', count: 2 }, { type: 'totem_pira', count: 1 }, { type: 'elemental_fuego', count: 2 }, { type: 'caballero_brasa', count: 3 }, { type: 'can_lava', count: 4 }, { type: 'avispa_brasa', count: 9 }, { type: 'piromante', count: 6 }]),
  ];
}

// Regla de oleadas (agua): cada ola consecutiva es MÁS grande que la anterior;
// toda ola mezcla ≥3 tipos; la ola 3 es el clímax. El roster crece por tier.
// La cadena generacional (huevo→renacuajo→sapo_adulto) es EXCLUSIVA del Sapo
// Desovador (nv5 miniboss): el renacuajo ya no es relleno de oleadas.
function waterWaves(tier) {
  if (tier === 1) {
    // Nv1: introductorio — Ahogado (relleno) + Acólito (ancla a distancia) + Lanzahielos.
    return [
      wave(620, [{ type: 'ahogado', count: 4 }, { type: 'acolito_escarcha', count: 2 }, { type: 'lanzahielos', count: 2 }]),
      wave(540, [{ type: 'ahogado', count: 5 }, { type: 'acolito_escarcha', count: 3 }, { type: 'lanzahielos', count: 3 }]),
      wave(470, [{ type: 'ahogado', count: 6 }, { type: 'acolito_escarcha', count: 4 }, { type: 'lanzahielos', count: 4 }]),
    ];
  }
  if (tier === 2) {
    // Nv2: introduce Sacerdotisa (healer / prioridad de kill).
    return [
      wave(600, [{ type: 'ahogado', count: 5 }, { type: 'acolito_escarcha', count: 3 }, { type: 'lanzahielos', count: 3 }]),
      wave(520, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 6 }, { type: 'acolito_escarcha', count: 3 }, { type: 'lanzahielos', count: 3 }]),
      wave(450, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 6 }, { type: 'acolito_escarcha', count: 4 }, { type: 'lanzahielos', count: 5 }]),
    ];
  }
  // Nv3: introduce Vidente (homing), Rana Saltarina (rápida), Sapo Escupidor (veneno a distancia).
  return [
    wave(580, [{ type: 'ahogado', count: 4 }, { type: 'lanzahielos', count: 3 }, { type: 'vidente_marea', count: 3 }, { type: 'rana_saltarina', count: 3 }]),
    wave(500, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 4 }, { type: 'vidente_marea', count: 3 }, { type: 'rana_saltarina', count: 4 }, { type: 'sapo_escupidor', count: 4 }]),
    wave(430, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 4 }, { type: 'vidente_marea', count: 4 }, { type: 'rana_saltarina', count: 4 }, { type: 'sapo_escupidor', count: 3 }, { type: 'acolito_escarcha', count: 3 }]),
  ];
}

function waterInterWaves(tier) {
  // Intermedios: densos y retadores (≥36 entre ola 1 y 2, antes del miniboss),
  // escalando nv4 < nv5 < nv6. Combos duros: healers (Sacerdotisa/Náyade) que hay
  // que matar primero, blindados/tanques que aguantan, torretas y enjambres.
  if (tier <= 2) {
    // Nv4 (~36): muro blindado (Guardia/Cangrejo) + torreta (Tótem de Escarcha) + explosivos (Pez Globo).
    return [
      wave(540, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 5 }, { type: 'guardia_hielo', count: 2 }, { type: 'acolito_escarcha', count: 4 }, { type: 'vidente_marea', count: 4 }]),
      wave(450, [{ type: 'totem_escarcha', count: 1 }, { type: 'sacerdotisa_lago', count: 1 }, { type: 'cangrejo_acorazado', count: 2 }, { type: 'guardia_hielo', count: 2 }, { type: 'pez_globo', count: 5 }, { type: 'ahogado', count: 5 }, { type: 'acolito_escarcha', count: 4 }]),
    ];
  }
  if (tier === 3) {
    // Nv5 (~42): DOBLE healer (Sacerdotisa + Náyade que invoca escupidores) + aura (Corista) + torreta.
    return [
      wave(520, [{ type: 'sacerdotisa_lago', count: 1 }, { type: 'ahogado', count: 5 }, { type: 'guardia_hielo', count: 2 }, { type: 'burbuja_gelida', count: 4 }, { type: 'serpiente_marina', count: 4 }, { type: 'corista_abismo', count: 2 }]),
      wave(440, [{ type: 'nayade', count: 1 }, { type: 'totem_escarcha', count: 1 }, { type: 'corista_abismo', count: 1 }, { type: 'guardia_hielo', count: 2 }, { type: 'serpiente_marina', count: 5 }, { type: 'pez_globo', count: 5 }, { type: 'burbuja_gelida', count: 5 }, { type: 'ahogado', count: 4 }]),
    ];
  }
  // Nv6 (~48): clímax — DOBLE healer + doble Tortuga (tanque 55%) + Tiburón joven (burrow) + Medusas que se dividen + torreta.
  return [
    wave(500, [{ type: 'nayade', count: 1 }, { type: 'medusa', count: 3 }, { type: 'ahogado', count: 6 }, { type: 'tiburon_joven', count: 1 }, { type: 'serpiente_marina', count: 5 }, { type: 'burbuja_gelida', count: 5 }]),
    wave(420, [{ type: 'nayade', count: 1 }, { type: 'sacerdotisa_lago', count: 1 }, { type: 'totem_escarcha', count: 1 }, { type: 'tortuga_acorazada', count: 2 }, { type: 'medusa', count: 3 }, { type: 'tiburon_joven', count: 1 }, { type: 'serpiente_marina', count: 6 }, { type: 'burbuja_gelida', count: 6 }, { type: 'ahogado', count: 6 }]),
  ];
}

// Air waves: velocity + displacement (fast flyers, dueling dashers, gusts).
// Composition rule (spec §5) — anchor (Hechicero/Sacerdote that defines the puzzle)
//                  + filler (Siervos/Murciélagos)
//                  + one mobility threat (a Duelista that dodges or a diving Alado).
// Tier 1 = only nv1 introductory creatures; tiers 2–3 add dashers + flyers + turret.
// See spec §3.5 intro calendar.
function airWaves(tier) {
  if (tier === 1) {
    // Nv1 (~22): intro — Siervo filler + Murciélago swarm + Acólito anchor.
    return [
      wave(700, [{ type: 'siervo_torre', count: ramp(4, tier) }, { type: 'acolito_trueno', count: ramp(2, tier) }]),
      wave(650, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(4, tier) }]),
      wave(600, [{ type: 'acolito_trueno', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    // Nv2 (~30): + Duelista, Heraldo (stun), Espíritu (plasma volador).
    return [
      wave(670, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'heraldo_rayo', count: 2 }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(630, [{ type: 'duelista_nocturno', count: 1 }, { type: 'acolito_trueno', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: ramp(2, tier) }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(580, [{ type: 'heraldo_rayo', count: 2 }, { type: 'duelista_nocturno', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: 1 }]),
    ];
  }
  // Nv3 (~38): + Arpía, Tronador (push), Centinela (petrify).
  return [
    wave(640, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'tronador', count: 3 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: 2 }]),
    wave(600, [{ type: 'centinela_piedra', count: 1 }, { type: 'heraldo_rayo', count: 3 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: 2 }]),
    wave(550, [{ type: 'duelista_nocturno', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'tronador', count: 3 }, { type: 'siervo_torre', count: ramp(2, tier) }, { type: 'murcielago', count: 1 }]),
  ];
}

function airInterWaves(tier) {
  if (tier <= 2) {
    // Nv4 (~28, pico 15): muro (Guardia) + torretas (Gárgola/Centinela) + aura (Fuego Fatuo).
    return [
      wave(580, [{ type: 'heraldo_rayo', count: 2 }, { type: 'siervo_torre', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'murcielago', count: ramp(4, tier) }, { type: 'centinela_piedra', count: 1 }, { type: 'fuego_fatuo', count: 1 }]),
      wave(530, [{ type: 'gargola_pararrayos', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'duelista_nocturno', count: 1 }, { type: 'siervo_torre', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'heraldo_rayo', count: 2 }]),
    ];
  }
  if (tier === 3) {
    // Nv5 (~33, pico 17): + Hechicero (lift), Sacerdote (healer), Vástago, Torbellino, Vampiro Alado.
    return [
      wave(540, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'vastago_vampirico', count: 3 }, { type: 'guardia_nocturno', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'centinela_piedra', count: 1 }, { type: 'siervo_torre', count: 2 }]),
      wave(490, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'torbellino_errante', count: 1 }, { type: 'gargola_pararrayos', count: 1 }, { type: 'heraldo_rayo', count: 2 }, { type: 'siervo_torre', count: 4 }, { type: 'vampiro_alado', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'espiritu_tormenta', count: 2 }]),
    ];
  }
  // Nv6 (~40, pico 20): clímax — doble Vampiro Alado + Hechicero + Sacerdote + enjambre + torretas.
  return [
    wave(510, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'vampiro_alado', count: 1 }, { type: 'vastago_vampirico', count: ramp(2, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'gargola_pararrayos', count: 1 }, { type: 'arpia', count: 3 }]),
    wave(460, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'torbellino_errante', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'heraldo_rayo', count: 3 }, { type: 'vampiro_alado', count: 1 }, { type: 'fuego_fatuo', count: 1 }]),
  ];
}

// Earth waves: poison + control + transmutation (spec §3.7).
// Tier 1 = servants/wolves/pixies; tier 2 adds cautivos/duendes/hongos;
// tier 3 adds jabalis/totems/brotes.
function earthWaves(tier) {
  if (tier === 1) {
    return [
      wave(700, [{ type: 'naufrago_encantado', count: ramp(4, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
      wave(650, [{ type: 'lobo', count: ramp(2, tier) }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
      wave(600, [{ type: 'pixie', count: ramp(3, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'naufrago_encantado', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    return [
      wave(650, [{ type: 'acolito_cautivo', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(2, tier) }]),
      wave(600, [{ type: 'hongo_esporario', count: ramp(2, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
      wave(550, [{ type: 'acolito_cautivo', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(3, tier) }, { type: 'naufrago_encantado', count: ramp(2, tier) }]),
    ];
  }
  return [
    wave(600, [{ type: 'jabali', count: ramp(2, tier) }, { type: 'totem_espinas', count: 1 }]),
    wave(550, [{ type: 'brote_pustula', count: ramp(2, tier) }, { type: 'lobo', count: ramp(2, tier) }, { type: 'pixie', count: ramp(2, tier) }]),
    wave(500, [{ type: 'jabali', count: ramp(2, tier) }, { type: 'duende_ladron', count: ramp(2, tier) }, { type: 'acolito_cautivo', count: ramp(2, tier) }]),
  ];
}

function earthInterWaves(tier) {
  if (tier <= 2) { // Nv4
    return [
      wave(600, [{ type: 'oso_jardin', count: 1 }, { type: 'lobo', count: ramp(2, tier) }]),
      wave(550, [{ type: 'fuego_fatuo_pantano', count: ramp(2, tier) }, { type: 'golem_lodo', count: 1 }, { type: 'pixie', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 3) { // Nv5 — introduce the transmute anchor
    return [
      wave(600, [{ type: 'ninfa_transmutadora', count: 1 }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
      wave(550, [{ type: 'zarza_estranguladora', count: 2 }, { type: 'lobo', count: ramp(2, tier) }, { type: 'sierva_jardin', count: ramp(2, tier) }]),
    ];
  }
  return [ // Nv6
    wave(550, [{ type: 'hombre_lobo', count: 1 }, { type: 'flor_carnivora', count: 2 }, { type: 'enredadera_reptante', count: ramp(2, tier) }]),
    wave(500, [{ type: 'golem_piedra', count: 1 }, { type: 'ninfa_transmutadora', count: 1 }, { type: 'naufrago_encantado', count: ramp(3, tier) }]),
  ];
}

const mb = (hp, dmg) => ({ key: 'miniboss', tex: TEX.miniboss, color: COLORS.miniboss, hp, speed: 70, damage: dmg, radius: 33, behavior: 'chase', elite: true });
const lb = (hp, dmg) => ({ key: 'levelboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 60, damage: dmg, radius: 42, behavior: 'chase', elite: true });
const tb = (hp, dmg, mechanics) => ({ key: 'templeboss', tex: TEX.boss, color: COLORS.boss, hp, speed: 55, damage: dmg, radius: 48, behavior: 'chase', elite: true, mechanics });

// Elemental temple-boss mechanics (each temple feels distinct). See BossMechanics.
const MECHANICS = {
  fire:  [{ type: 'nova', every: 3000, count: 10, speed: 240, damage: 12 }, { type: 'boulder', every: 2200, speed: 220, damage: 22 }],
  water: [{ type: 'nova', every: 2400, count: 14, speed: 210, damage: 10 }],
  air:   [{ type: 'boulder', every: 1700, speed: 320, damage: 16 }, { type: 'nova', every: 3200, count: 8, speed: 270, damage: 10 }],
  earth: [{ type: 'poisonFloor', every: 3200, radius: 70, dps: 30, duration: 4000 }, { type: 'boulder', every: 2400, speed: 170, damage: 28 }],
};

// Build a standard elemental branch: 8 levels, one boss per level.
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, levelBoss = null, templeBoss = null, onClear = null }) {
  // nv7 is a dedicated levelboss level (boss only): the trio (multi-boss + lava
  // triangle) when provided, else a single default level-boss blob.
  const levelBossSpec = levelBosses
    ? { bosses: levelBosses, triangle: true }
    : levelBoss
      ? { levelBoss }
      : { levelBoss: lb(650, 24) };
  const levels = [
    makeLevel(`${id}_1`, id, 'basic', { waves: basic(1) }),
    makeLevel(`${id}_2`, id, 'basic', { waves: basic(2) }),
    makeLevel(`${id}_3`, id, 'basic', { waves: basic(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: inter(2), miniboss: minibosses[0] || mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: inter(3), miniboss: minibosses[1] || mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'intermediate', { waves: inter(4), miniboss: minibosses[2] || mb(380, 20) }),
    makeLevel(`${id}_7`, id, 'levelboss', { ...levelBossSpec }),
    makeLevel(`${id}_8`, id, 'temple', {
      templeBoss: templeBoss || tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: onClear || mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'speaker.caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels, intro };
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
    basic: airWaves, inter: airInterWaves,
    minibosses: [CABALLERO_SANGRE, BRUJA_VENDAVAL, ELEMENTAL_TORMENTA],
    levelBoss: LIDER_CULTISTA,
    templeBoss: GALAHAD,
    intro: [{ speaker: 'speaker.narrator', text: 'story.air.intro.0' }],
    mageName: 'speaker.mage.air',
    mageLines: [
      'story.air.mage.0',
      'story.air.mage.1',
    ],
    onClear: [
      { speaker: 'speaker.galahad', text: 'story.air.galahad.clear.0' },
      { speaker: 'speaker.galahad', text: 'story.air.galahad.clear.1' },
      { speaker: 'speaker.caster',  text: 'story.air.galahad.clear.2' },
    ],
  }),
  earth: makeBranch({
    id: 'earth', element: 'earth', name: 'region.earth.name', grantsSkill: 'poison',
    basic: earthWaves, inter: earthInterWaves,
    minibosses: [SENOR_LOBO, CEFALO, DRIADA],
    levelBoss: GRIFO,
    templeBoss: CIRCE,
    intro: [{ speaker: 'speaker.narrator', text: 'story.earth.intro.0' }],
    mageName: 'speaker.mage.earth',
    mageLines: [
      'story.earth.mage.0',
      'story.earth.mage.1',
    ],
    onClear: [
      { speaker: 'speaker.circe',   text: 'story.earth.circe.clear.0' },
      { speaker: 'speaker.caster',  text: 'story.earth.circe.clear.1' },
      { speaker: 'speaker.narrator', text: 'story.earth.circe.clear.2' },
    ],
  }),
  castle: makeCastle(),
};

export const REGION_ORDER = ['fire', 'water', 'air', 'earth'];
export const CASTLE_ID = 'castle';
export const REQUIRED_ELEMENTS = ['fire', 'water', 'air', 'earth'];
