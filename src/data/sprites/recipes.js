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
