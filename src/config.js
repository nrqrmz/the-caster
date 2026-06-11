// Logical resolution (portrait). Scale Manager FITs this to the device.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

// Debug helpers (oculta el botón de borrar guardado en release con poner false).
export const DEBUG = true;

// Geometric-art palette. Swapped for sprites later without touching logic.
export const COLORS = {
  bg: 0x1a1224,
  caster: 0x4fc3f7,     // light blue
  orb: 0x80d8ff,        // cyan basic shot
  fireball: 0xff7043,   // orange
  villager: 0xef5350,   // red
  warrior: 0x8d6e63,    // brown
  archer: 0x66bb6a,     // green
  ember: 0xff8a65,      // acólitos / iniciados
  emberDeep: 0xe64a19,  // piromantes / caballeros
  ash: 0x9e9e9e,        // espíritus de ceniza / humo
  magma: 0xff5722,      // larvas / colosos / cans de lava
  salamander: 0xffa726, // salamandras / fénix
  totemFire: 0xffca28,  // tótems / portaestandarte / wisp
  arrow: 0xfff176,      // yellow
  miniboss: 0xab47bc,   // purple
  boss: 0xd32f2f,       // deep red
  temple: 0xffd54f,     // gold
  lightning: 0xfff176,  // yellow zap
  ice: 0xb3e5fc,        // pale ice blue (distinct from the orb's cyan)
  water: 0x00bcd4,      // burrow surface / whirlpool telegraph (cyan)
  waterDeep: 0x0288d1,  // active whirlpool spiral (deep blue)
  poison: 0x7cb342,     // green poison zone
  healthBack: 0x33272a,
  healthFill: 0x66bb6a,
};

// Texture keys (geometric now, sprite atlases later — keys stay the same).
export const TEX = {
  caster: 'tex_caster',
  orb: 'tex_orb',
  fireball: 'tex_fireball',
  villager: 'tex_villager',
  warrior: 'tex_warrior',
  archer: 'tex_archer',
  arrow: 'tex_arrow',
  miniboss: 'tex_miniboss',
  boss: 'tex_boss',
  temple: 'tex_temple',
};
