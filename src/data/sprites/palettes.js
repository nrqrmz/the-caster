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
  vampglow: derivePalette(0xff5252, { highlight: 0xffcdd2, base: 0xff5252, shade: 0xc62828, outline: 0x7f1d1d }),
  ember: derivePalette(0xff8a50, { highlight: 0xffe082, base: 0xff7043, shade: 0xd84315, outline: 0x7a2a10 }),
  // Bare-headed mage/acolyte accents. The robe takes the creature's type color;
  // these dress the visible face. A living set (skin/hair/eyes) and a drowned set.
  hair: derivePalette(0x7a4a2a, { highlight: 0xb07a44, shade: 0x4f2f18, outline: 0x2c190c }),
  blackhair: derivePalette(0x1b1c26, { base: 0x1b1c26, highlight: 0x3c3e52, shade: 0x101119, outline: 0x050508 }),
  blondhair: derivePalette(0xd9b25a, { base: 0xd9b25a, highlight: 0xf2dc95, shade: 0xa8842f, outline: 0x5c4416 }),
  pants: derivePalette(0x6e5236, { base: 0x6e5236, highlight: 0x8a6c4a, shade: 0x4a3522, outline: 0x251a10 }),
  deadfish: derivePalette(0x9bb0b8, { base: 0x9bb0b8, highlight: 0xcfe0e4, shade: 0x6c8088, outline: 0x33444a }),
  // Beast accents: ivory cow-horns, FILLED, with a near-black border (cracks reuse
  // `ember`, eyes `glow`).
  bone: derivePalette(0xede4d0, { base: 0xede4d0, highlight: 0xfffaf0, shade: 0xc9bda0, outline: 0x140f0a }),
  // Boss-tier metal (Vesta's heavy plate trim, shield rim, hammer head).
  steel: derivePalette(0x9aa6b2, { base: 0x9aa6b2, highlight: 0xd6dee6, shade: 0x5e6a78, outline: 0x262e38 }),
  // Ethereal silver-white hair (the Lady of the Lake / Dama del Lago).
  silverhair: derivePalette(0xcfd8e0, { base: 0xcfd8e0, highlight: 0xf2f6f9, shade: 0x9aa6b2, outline: 0x4a525c }),
  eyes_living: derivePalette(0x2a1a10, { base: 0x2a1a10, highlight: 0xfff3e0, shade: 0x1a0f08, outline: 0x140a05 }),
  drownedskin: derivePalette(0xbcd0c0, { base: 0xbcd0c0, shade: 0x86a392, highlight: 0xe0eee2, outline: 0x3a4f44 }),
  drownedhair: derivePalette(0x222d28, { base: 0x222d28, highlight: 0x415048, shade: 0x141b17, outline: 0x080c0a }),
  hollow: derivePalette(0x0c120f, { base: 0x0c120f, highlight: 0x33473d, shade: 0x060a08, outline: 0x020403 }),
  // Black cape for Caballero de Sangre — near-black with dark-plum highlight fold sheen.
  vampblack: derivePalette(0x14090c, { base: 0x1a0e12, highlight: 0x3a2630, shade: 0x0c0608, outline: 0x000000 }),
  // Pale vampire skin for humanoid vampire footsoldiers (Siervo/Duelista/Vástago).
  vampskin: derivePalette(0xd7a3a3, { base: 0xcdbfc9, highlight: 0xede0e6, shade: 0x9a8a96, outline: 0x4a3a44 }),
};
