// src/data/sprites/recipes.js
// PURE. Per-creature sprite recipes. key -> { archetype, size, parts, anim, palette?, accent? }
import { derivePalette, NAMED_PALETTES } from './palettes.js';

export const RECIPES = {
  hero: {
    // archetype is a classifier for organizing recipes; SpriteForge does not read it.
    archetype: 'hero', size: 16, palette: 'hero', anim: { idle: 2, walk: 2 }, fps: 5,
    parts: ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff'],
  },
  orb: { archetype: 'projectile', size: 8, baseColor: 0x80d8ff, anim: { idle: 2, walk: 1 }, fps: 8, parts: ['orb_body'] },
  fireball: { archetype: 'projectile', size: 16, baseColor: 0xff7043, anim: { idle: 3, walk: 1 }, fps: 10, parts: ['flame_body'] },
  arrow: { archetype: 'projectile', size: 16, baseColor: 0xfff176, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['arrow_body'] },

  // --- Generic (shared) ---
  villager:        { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  warrior:         { archetype: 'humanoid', size: 32, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  archer:          { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  // --- Fire cultists (humanoid) ---
  acolito_brasa:   { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots'] },
  lanzabrasas:     { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  iniciado_veloz:  { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_round', 'eyes_dots'] },
  piromante:       { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  encapuchado_pira:{ archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood'] },
  pirovidente:     { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  caballero_brasa: { archetype: 'humanoid', size: 32, parts: ['body_armor', 'head_round', 'eyes_dots'] },
  sacerdote_llama: { archetype: 'humanoid', size: 16, parts: ['body_robe', 'head_hood', 'eyes_dots', 'staff'] },
  portaestandarte: { archetype: 'humanoid', size: 32, parts: ['body_armor', 'head_round', 'eyes_dots', 'banner'] },
  // --- Fire beasts ---
  larva_magma:     { archetype: 'beast', size: 32, parts: ['body_beast', 'eye_single'] },
  salamandra:      { archetype: 'beast', size: 16, parts: ['body_beast', 'crest_flame', 'eyes_dots'] },
  espiritu_ceniza: { archetype: 'blob', size: 16, parts: ['body_blob', 'eyes_dots'] },
  can_lava:        { archetype: 'beast', size: 32, parts: ['body_beast', 'horns', 'eyes_dots'] },
  elemental_fuego: { archetype: 'blob', size: 32, parts: ['body_blob', 'eye_single'] },
  coloso_magma:    { archetype: 'beast', size: 32, parts: ['body_beast', 'horns', 'eye_single'] },
  fenix_menor:     { archetype: 'floating', size: 32, parts: ['body_winged', 'crest_flame', 'eyes_dots'] },
  // --- Summoned / ambient ---
  imp_brasa:       { archetype: 'blob', size: 16, parts: ['body_blob', 'horns', 'eyes_dots'] },
  avispa_brasa:    { archetype: 'floating', size: 16, parts: ['body_winged', 'eyes_dots'] },
  totem_pira:      { archetype: 'floating', size: 32, parts: ['body_totem', 'eye_single'] },
  brasa_errante:   { archetype: 'blob', size: 16, parts: ['body_blob'] },
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
