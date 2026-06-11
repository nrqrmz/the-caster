// src/data/sprites/palettes.js
// PURE. Color = integer 0xRRGGBB. A palette has 5 roles.

function clamp8(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function toRGB(c) { return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 }; }
function fromRGB(r, g, b) { return (clamp8(r) << 16) | (clamp8(g) << 8) | clamp8(b); }

function mix(c1, c2, t) {
  const a = toRGB(c1), b = toRGB(c2);
  return fromRGB(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

export function darken(c, t) { return mix(c, 0x000000, t); }
export function lighten(c, t) { return mix(c, 0xffffff, t); }

// Build a 5-role palette from one base color; overrides win.
export function derivePalette(base, overrides = {}) {
  return {
    outline: overrides.outline ?? mix(base, 0x000000, 0.78),
    base: overrides.base ?? base,
    shade: overrides.shade ?? mix(base, 0x000000, 0.40),
    highlight: overrides.highlight ?? mix(base, 0xffffff, 0.38),
    accent: overrides.accent ?? mix(base, 0xffffff, 0.60),
  };
}

// Named palettes for special characters (hero, bosses) override the auto-derived one.
export const NAMED_PALETTES = {
  hero: derivePalette(0x4fc3f7, { accent: 0xffd54f }), // light blue robe, gold accent
};
