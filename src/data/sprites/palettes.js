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

// Named palettes for special characters (hero, bosses), with hand-tuned overrides.
export const NAMED_PALETTES = {
  hero: derivePalette(0x4fc3f7, { accent: 0xffd54f }), // legacy; hero recipe moves to per-part palettes
  skin: derivePalette(0xf1c9a5, { shade: 0xd9a87f, outline: 0x7a4a32 }),
  redhair: derivePalette(0xc0392b, { highlight: 0xef6a3d, shade: 0x8e2a1e, outline: 0x511812 }),
  greengown: derivePalette(0x2e8b57, { highlight: 0x49bd7d, shade: 0x1f6b41, accent: 0xffd54f, outline: 0x123d26 }),
  gold: derivePalette(0xffd54f, { shade: 0xc79a2b, outline: 0x6b5310 }),
  orbblue: derivePalette(0x80d8ff, { highlight: 0xdff5ff, outline: 0x2a6a85 }),
  wood: derivePalette(0x6f4a2a, { outline: 0x3a2614 }),
  // Hooded-cultist accents (shared across elements): a deep face cavity, glowing
  // eyes, and a staff ember. Body/hood take the creature's own type color.
  shadow: derivePalette(0x241018, { base: 0x2a1320, outline: 0x0a0408, shade: 0x140a10, highlight: 0x3a1c2c }),
  glow: derivePalette(0xffe27a, { highlight: 0xfff7cc, base: 0xffd54f, shade: 0xffb300, outline: 0xc79a2b }),
  ember: derivePalette(0xff8a50, { highlight: 0xffe082, base: 0xff7043, shade: 0xd84315, outline: 0x7a2a10 }),
};
