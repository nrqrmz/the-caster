// src/data/sprites/recipes.js
// PURE. Per-creature sprite recipes. key -> { archetype, size, parts, anim, palette?, accent? }
import { derivePalette, NAMED_PALETTES } from './palettes.js';

export const RECIPES = {
  hero: {
    archetype: 'hero', size: 16, palette: 'hero', anim: { idle: 2, walk: 2 }, fps: 5,
    parts: ['body_robe', 'head_round', 'eyes_dots', 'hat_witch', 'staff'],
  },
};

export function hasRecipe(key) { return Object.prototype.hasOwnProperty.call(RECIPES, key); }
export function getRecipe(key) { return RECIPES[key]; }

// Resolve a 5-role palette: named palette wins, else derive from the creature's base color.
export function paletteFor(key, baseColor) {
  const r = RECIPES[key];
  if (r && r.palette && NAMED_PALETTES[r.palette]) return NAMED_PALETTES[r.palette];
  return derivePalette(baseColor ?? 0x888888, r && r.accent ? { accent: r.accent } : {});
}
