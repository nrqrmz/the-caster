// src/data/sprites/recipes.js
// PURE. Per-creature sprite recipes. key -> { archetype, size, parts, anim, palette?, accent? }
import { derivePalette, NAMED_PALETTES } from './palettes.js';

export const RECIPES = {
  hero: {
    // archetype is a classifier for organizing recipes; SpriteForge does not read it.
    archetype: 'hero', size: 32, palette: 'hero', anim: { idle: 2, walk: 2 }, fps: 5,
    parts: ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff'],
  },
  orb: { archetype: 'projectile', size: 32, baseColor: 0x80d8ff, anim: { idle: 2, walk: 1 }, fps: 8, parts: ['orb_body'] },
  fireball: { archetype: 'projectile', size: 32, baseColor: 0xff7043, anim: { idle: 3, walk: 1 }, fps: 10, parts: ['flame_body'] },
  arrow: { archetype: 'projectile', size: 32, baseColor: 0xfff176, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['arrow_body'] },

  // --- Generic (shared) ---
  villager:        { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  warrior:         { archetype: 'humanoid', size: 64, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  archer:          { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  // --- Fire cultists (humanoid) ---
  acolito_brasa:   { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots'] },
  lanzabrasas:     { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  iniciado_veloz:  { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  piromante:       { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  encapuchado_pira:{ archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood'] },
  pirovidente:     { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  caballero_brasa: { archetype: 'humanoid', size: 64, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  sacerdote_llama: { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  portaestandarte: { archetype: 'humanoid', size: 64, parts: ['body_armor', 'head_round', 'eyes_dots', 'banner'] },
  // --- Fire beasts ---
  larva_magma:     { archetype: 'beast', size: 64, parts: ['body_beast', 'eye_single'] },
  salamandra:      { archetype: 'beast', size: 32, parts: ['body_beast', 'crest_flame', 'eyes_dots'] },
  espiritu_ceniza: { archetype: 'blob', size: 32, parts: ['body_blob', 'eyes_dots'] },
  can_lava:        { archetype: 'beast', size: 64, parts: ['body_beast', 'horns', 'eyes_dots'] },
  elemental_fuego: { archetype: 'blob', size: 64, parts: ['body_blob', 'eye_single'] },
  coloso_magma:    { archetype: 'beast', size: 64, parts: ['body_beast', 'horns', 'eye_single'] },
  fenix_menor:     { archetype: 'floating', size: 64, parts: ['body_winged', 'crest_flame', 'eyes_dots'] },
  // --- Summoned / ambient ---
  imp_brasa:       { archetype: 'blob', size: 32, parts: ['body_blob', 'horns', 'eyes_dots'] },
  avispa_brasa:    { archetype: 'floating', size: 32, parts: ['body_winged', 'eyes_dots'] },
  totem_pira:      { archetype: 'floating', size: 64, parts: ['body_totem', 'eye_single'] },
  brasa_errante:   { archetype: 'blob', size: 32, parts: ['body_blob'] },

  // --- Fire bosses (single-form) ---
  favilla:  { archetype: 'boss', size: 96, baseColor: 0xffca28, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  pyra:     { archetype: 'boss', size: 96, baseColor: 0xe64a19, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  vesta:    { archetype: 'boss', size: 96, baseColor: 0xff5722, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  ignatius: { archetype: 'boss', size: 96, baseColor: 0xff7043, parts: ['body_ignatius', 'horns', 'eye_single'] },

  // --- Water bosses (single-form) ---
  soldado_hielo:   { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  sapo_desovador:  { archetype: 'boss', size: 96, baseColor: 0x7cb342, parts: ['body_frog', 'eyes_dots'] },
  tiburon_abisal:  { archetype: 'boss', size: 96, baseColor: 0x4fc3f7, parts: ['body_fish', 'fin', 'eyes_dots'] },
  kraken:          { archetype: 'boss', size: 96, baseColor: 0xab47bc, parts: ['body_kraken', 'eye_single'] },
  // --- Dama del Lago + her 5 forms (each a distinct creature) ---
  dama_lago:       { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  dama_maga:       { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },
  dama_tiburon:    { archetype: 'boss', size: 96, baseColor: 0x4fc3f7, parts: ['body_fish', 'fin', 'eyes_dots'] },
  dama_kraken:     { archetype: 'boss', size: 96, baseColor: 0xab47bc, parts: ['body_kraken', 'eye_single'] },
  dama_ballena:    { archetype: 'boss', size: 96, baseColor: 0xd32f2f, parts: ['body_whale', 'eyes_dots'] },
  dama_maga_final: { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: ['body_sister', 'head_round', 'eyes_dots', 'crown'] },

  // --- Water cultists (humanoid) ---
  acolito_escarcha:  { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots'] },
  ahogado:           { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  corista_abismo:    { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots'] },
  lanzahielos:       { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  nayade:            { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  sacerdotisa_lago:  { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_round', 'eyes_dots', 'staff'] },
  vidente_marea:     { archetype: 'humanoid', size: 32, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  guardia_hielo:     { archetype: 'humanoid', size: 64, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  // --- Water beasts ---
  tiburon_joven:     { archetype: 'fish',    size: 64, parts: ['body_fish', 'fin', 'eyes_dots'] },
  serpiente_marina:  { archetype: 'serpent', size: 64, parts: ['body_serpent', 'eyes_dots'] },
  tortuga_acorazada: { archetype: 'shelled', size: 64, parts: ['body_shell', 'head_round', 'eyes_dots'] },
  cangrejo_acorazado:{ archetype: 'shelled', size: 64, parts: ['body_shell', 'eyes_dots'] },
  medusa:            { archetype: 'jelly',   size: 64, parts: ['body_jelly', 'eyes_dots'] },
  medusa_cria:       { archetype: 'jelly',   size: 32, parts: ['body_jelly', 'eyes_dots'] },
  pez_globo:         { archetype: 'blob',    size: 32, parts: ['body_blob', 'eyes_dots'] },
  // --- Frog lineage ---
  huevo_sapo:        { archetype: 'egg',     size: 32, parts: ['frog_egg'] },
  renacuajo:         { archetype: 'blob',    size: 32, parts: ['tadpole_tail', 'eyes_dots'] },
  rana_saltarina:    { archetype: 'frog',    size: 32, parts: ['body_frog', 'eyes_dots'] },
  sapo_escupidor:    { archetype: 'frog',    size: 32, parts: ['body_frog', 'eyes_dots'] },
  sapo_adulto:       { archetype: 'frog',    size: 64, parts: ['body_frog', 'eyes_dots'] },
  // --- Ambient ---
  burbuja_gelida:    { archetype: 'blob',     size: 32, parts: ['body_bubble'] },
  totem_escarcha:    { archetype: 'floating', size: 64, parts: ['body_totem', 'eye_single'] },
};

export function hasRecipe(key) { return Object.prototype.hasOwnProperty.call(RECIPES, key); }
export function getRecipe(key) { return RECIPES[key]; }

// A named palette wins entirely (its accent is intentional); else derive from baseColor with optional accent override.
export function paletteFor(key, baseColor) {
  const r = RECIPES[key];
  if (r && r.palette) {
    const named = NAMED_PALETTES[r.palette];
    if (!named) throw new Error(`paletteFor: recipe '${key}' names unknown palette '${r.palette}'`);
    return named;
  }
  return derivePalette(baseColor ?? 0x888888, (r && r.accent != null) ? { accent: r.accent } : {});
}
