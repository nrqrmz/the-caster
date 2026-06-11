// src/data/sprites/parts.js
// PURE. Each part is a stamp on a 16x16 design grid.
// Chars: '.'=transparent o=outline b=base s=shade h=highlight a=accent
// anchor: {x,y} = top-left offset (in 16x16 design-grid pixels) where this stamp is placed.
// A direction set to null means the part is not drawn for that facing.

export const PARTS = {
  // Lower-body robe (humanoid). Bottom 3 rows are the "leg region" that walk-animates.
  body_robe: {
    w: 10, h: 9, anchor: { x: 3, y: 6 },
    down: [
      '...oooo...',
      '..obbbbo..',
      '..obhhbo..',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbbo.',
      '.obssssbo.',
      '.obs..sbo.',
      '.oo....oo.',
    ],
    up: [
      '...oooo...',
      '..obbbbo..',
      '..obbbbo..',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbbo.',
      '.obssssbo.',
      '.obs..sbo.',
      '.oo....oo.',
    ],
    side: [
      '...ooo....',
      '..obbbo...',
      '..obhbo...',
      '..obbbo...',
      '..obbbo...',
      '..obbbbo..',
      '..obssbo..',
      '..obs.bo..',
      '..oo..oo..',
    ],
  },
  // Round head. up = back of head (no face).
  head_round: {
    w: 6, h: 5, anchor: { x: 5, y: 2 },
    down: ['.oooo.', 'obbbbo', 'obhbbo', 'obbbbo', '.oooo.'],
    up:   ['.oooo.', 'obbbbo', 'obbbbo', 'obbbbo', '.oooo.'],
    side: ['.oooo.', 'obbbbo', 'obbbho', 'obbbbo', '.oooo.'],
  },
  // Eyes overlay on the face. No eyes on the back (up = null).
  eyes_dots: {
    w: 6, h: 2, anchor: { x: 5, y: 4 },
    down: ['.o..o.', '......'],
    up: null,
    side: ['....o.', '......'],
  },
  // Witch hat (accent-colored).
  hat_witch: {
    w: 8, h: 5, anchor: { x: 4, y: 0 },
    down: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
    up:   ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
    side: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '...oo...'],
  },
  // Staff: a vertical pole; looks the same from any facing, so down/up/side share the matrix.
  staff: {
    w: 2, h: 11, anchor: { x: 12, y: 3 },
    down: ['aa', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo'],
    up:   ['aa', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo'],
    side: ['aa', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo', 'oo'],
  },

  // Hooded cultist head — pointed cowl covers more than head_round.
  head_hood: {
    w: 6, h: 6, anchor: { x: 5, y: 1 },
    down: [
      '.oaao.',
      'oaaaao',
      'obbbbo',
      'obhbbo',
      'obbbbo',
      '.oooo.',
    ],
    up: [
      '.oaao.',
      'oaaaao',
      'obbbbo',
      'obbbbo',
      'obbbbo',
      '.oooo.',
    ],
    side: [
      '.oaao.',
      'oaaaao',
      'obbbbo',
      'obbbho',
      'obbbbo',
      '.oooo.',
    ],
  },

  // Low quadruped/creature body — wider, sits low on the grid.
  body_beast: {
    w: 12, h: 8, anchor: { x: 2, y: 7 },
    down: [
      '...oooooo...',
      '..obbbbbbo..',
      '.obbhhhhbbo.',
      '.obbbbbbbbo.',
      '.obssssssbo.',
      '.oboooooobo.',
      '.oo......oo.',
      '..o......o..',
    ],
    up: [
      '...oooooo...',
      '..obbbbbbo..',
      '.obbbbbbbo..',
      '.obbbbbbbbo.',
      '.obssssssbo.',
      '.oboooooobo.',
      '.oo......oo.',
      '..o......o..',
    ],
    side: [
      '....oooo....',
      '..oobbbboo..',
      '.obbhhhhbbo.',
      'obbbbbbbbbbo',
      'obssssssssbo',
      'oboo....oobo',
      'oo........oo',
      'o..........o',
    ],
  },

  // Rounded blob/elemental body — symmetric puffball.
  body_blob: {
    w: 10, h: 8, anchor: { x: 3, y: 7 },
    down: [
      '..oooooo..',
      '.obbbbbbo.',
      'obbhhhbbbo',
      'obbbbbbsbo',
      'obbbbbbsbo',
      '.obssssbo.',
      '..obbbbo..',
      '...oooo...',
    ],
    up: [
      '..oooooo..',
      '.obbbbbbo.',
      'obbbbbbbo.',
      'obbbbbbsbo',
      'obbbbbbsbo',
      '.obssssbo.',
      '..obbbbo..',
      '...oooo...',
    ],
    side: [
      '..oooooo..',
      '.obbbbbbo.',
      'obbhbbbbo.',
      'obbbbbbsbo',
      'obbbbbbsbo',
      '.obssssbo.',
      '..obbbbo..',
      '...oooo...',
    ],
  },

  // Small body with wings to the sides — wasp/phoenix silhouette.
  body_winged: {
    w: 12, h: 7, anchor: { x: 2, y: 8 },
    down: [
      'oo..oooo..oo',
      'oboobbbboobo',
      'obbobhbbobbo',
      '.obbbbbbbo..',
      '.obssssbo...',
      '..obbbbo....',
      '...oooo.....',
    ],
    up: [
      'oo..oooo..oo',
      'oboobbbboobo',
      'obbobbbbobbo',
      '.obbbbbbbo..',
      '.obssssbo...',
      '..obbbbo....',
      '...oooo.....',
    ],
    side: [
      'oo..oooo....',
      'oboobbbboo..',
      'obbobhbbobb.',
      '.obbbbbbbo..',
      '.obssssbo...',
      '..obbbbo....',
      '...oooo.....',
    ],
  },

  // Bulkier armored humanoid torso — knight/warrior silhouette.
  body_armor: {
    w: 10, h: 9, anchor: { x: 3, y: 6 },
    down: [
      '...oooo...',
      '..obbbbo..',
      '.obhhhhbo.',
      '.obbbbbbo.',
      '.obbssbbo.',
      'obbbbbbbbo',
      'obssssssbo',
      'obs....sbo',
      '.oo....oo.',
    ],
    up: [
      '...oooo...',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbbo.',
      '.obbssbbo.',
      'obbbbbbbbo',
      'obssssssbo',
      'obs....sbo',
      '.oo....oo.',
    ],
    side: [
      '...oooo...',
      '..obbbbo..',
      '..obhbbo..',
      '..obbbbo..',
      '..obssbo..',
      '.obbbbbbo.',
      '.obssssbo.',
      '.obs..sbo.',
      '..oo..oo..',
    ],
  },

  // Tall totem/standard pole body — vertical with rune-marks.
  body_totem: {
    w: 6, h: 12, anchor: { x: 5, y: 2 },
    down: [
      'oaaaao',
      'obaabo',
      'oobboo',
      '.obbo.',
      '.obbo.',
      'oahhao',
      'oobboo',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.oooo.',
    ],
    up: [
      'oaaaao',
      'obaabo',
      'oobboo',
      '.obbo.',
      '.obbo.',
      'oahhao',
      'oobboo',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.oooo.',
    ],
    side: [
      'oaaaao',
      'obaabo',
      'oobboo',
      '.obbo.',
      '.obbo.',
      'oahhao',
      'oobboo',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.obbo.',
      '.oooo.',
    ],
  },

  // A pair of horns overlay — sits atop a head.
  horns: {
    w: 8, h: 3, anchor: { x: 4, y: 0 },
    down: [
      'o.oooo.o',
      'oabbbbao',
      '.obbbbo.',
    ],
    up: [
      'o.oooo.o',
      'oabbbbao',
      '.obbbbo.',
    ],
    side: [
      'o....ooo',
      'oa..abbo',
      '.o..obo.',
    ],
  },

  // Flame crest/plume overlay — for salamander/phoenix head.
  crest_flame: {
    w: 6, h: 4, anchor: { x: 5, y: 0 },
    down: [
      '.oaao.',
      'oahhao',
      'oahbao',
      '.oaao.',
    ],
    up: [
      '.oaao.',
      'oahhao',
      'oahbao',
      '.oaao.',
    ],
    side: [
      '..oao.',
      '.oahao',
      '.oabao',
      '..oao.',
    ],
  },

  // Banner/flag overlay — standard bearer flag to one side.
  banner: {
    w: 5, h: 8, anchor: { x: 11, y: 3 },
    down: [
      'ooooo',
      'oaaao',
      'oahao',
      'oaaao',
      'ooooo',
      '..oo.',
      '..oo.',
      '..oo.',
    ],
    up: [
      'ooooo',
      'oaaao',
      'oahao',
      'oaaao',
      'ooooo',
      '..oo.',
      '..oo.',
      '..oo.',
    ],
    side: [
      'ooooo',
      'oaaao',
      'oahao',
      'oaaao',
      'ooooo',
      '..oo.',
      '..oo.',
      '..oo.',
    ],
  },

  // Single large cyclops eye overlay — for elementals.
  eye_single: {
    w: 4, h: 3, anchor: { x: 6, y: 5 },
    down: [
      'oooo',
      'ohbo',
      'oooo',
    ],
    up: null,
    side: [
      'oooo',
      'ohho',
      'oooo',
    ],
  },

  // Elegant tall humanoid sorceress body — flowing gown, regal silhouette (sisters trio).
  // Bottom 3 rows are the leg region (walk-animated). w=10 h=12.
  body_sister: {
    w: 10, h: 12, anchor: { x: 3, y: 3 },
    down: [
      '...oooo...',
      '..obhhbo..',
      '..obbbbo..',
      '..obhhbo..',
      '.obbbbbo..',
      '.obbbbbbo.',
      '.obbhbbbo.',
      'obbbbbbbo.',
      'obbbbbbbbo',
      '.obsssbo..',
      '.obs.sbo..',
      '..oooooo..',
    ],
    up: [
      '...oooo...',
      '..obbbbo..',
      '..obbbbo..',
      '..obbbbo..',
      '.obbbbbo..',
      '.obbbbbbo.',
      '.obbbbbbo.',
      'obbbbbbbo.',
      'obbbbbbbbo',
      '.obsssbo..',
      '.obs.sbo..',
      '..oooooo..',
    ],
    side: [
      '...ooo....',
      '..obhbo...',
      '..obbbo...',
      '..obhbo...',
      '..obbbbo..',
      '..obbbbo..',
      '..obbhbo..',
      '.obbbbbo..',
      '.obbbbbbo.',
      '.obsssbo..',
      '.obs.sbo..',
      '..oooooo..',
    ],
  },

  // Small crown/tiara overlay — sits atop the head; accent chars = gold.
  // w=6 h=3, anchor near head top.
  crown: {
    w: 6, h: 3, anchor: { x: 5, y: 1 },
    down: [
      'oaooao',
      'aaaaaa',
      'oooooo',
    ],
    up: [
      'oaooao',
      'aaaaaa',
      'oooooo',
    ],
    side: [
      'oaooao',
      'aaaaaa',
      'oooooo',
    ],
  },

  // Large imposing fire-elemental/dragon body — broad, menacing, flame silhouette (Ignatius).
  // w=12 h=11, anchor at top-left of design grid center.
  body_ignatius: {
    w: 12, h: 11, anchor: { x: 2, y: 4 },
    down: [
      '..oaaaaoo...',
      '.oabbbbabo..',
      'oabhhhhbabo.',
      'oabbbbbbabo.',
      'oabbbbbbbbo.',
      'oabbbbbbbbo.',
      'oabbsssbbbo.',
      'oabbbbbbbbo.',
      '.obbsssbbbo.',
      '.oobbbbboo..',
      '..ooooooo...',
    ],
    up: [
      '..oaaaaoo...',
      '.oabbbbabo..',
      'oabbbbbabo..',
      'oabbbbbbabo.',
      'oabbbbbbbbo.',
      'oabbbbbbbbo.',
      'oabbsssbbbo.',
      'oabbbbbbbbo.',
      '.obbsssbbbo.',
      '.oobbbbboo..',
      '..ooooooo...',
    ],
    side: [
      '..oaaaoo....',
      '.oabbbabo...',
      'oabbhbbabo..',
      'oabbbbbabo..',
      'oabbbbbbbo..',
      'oabbbbbbbo..',
      'oabssssbbbo.',
      'oabbbbbbbbo.',
      '.obbsssbbo..',
      '.oobbbbboo..',
      '..ooooooo...',
    ],
  },

  // --- Projectile bodies (radial; only 'down' used) ---
  orb_body: {
    w: 6, h: 6, anchor: { x: 5, y: 5 },
    down: ['.hbbh.', 'hbbbbh', 'bbsbbb', 'bbbsbb', 'hbbbbh', '.hbbh.'],
    up: null, side: null,
  },
  flame_body: {
    w: 8, h: 8, anchor: { x: 4, y: 4 },
    down: ['...aa...', '..ahha..', '.ahhhha.', 'ahhbbhha', 'ahbbbbha', '.abbbba.', '..asba..', '...oo...'],
    up: null, side: null,
  },
  arrow_body: {
    w: 10, h: 4, anchor: { x: 3, y: 6 },
    down: ['o.........', 'ahhhhhhbbo', 'ahhhhhhbbo', 'o.........'],
    up: null, side: null,
  },
};
