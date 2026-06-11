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
};
