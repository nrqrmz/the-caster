// Logical resolution (portrait). Scale Manager FITs this to the device.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

// Colchón extra (px) además del radio del enemigo para contenerlo en pantalla:
// nada queda pegado al borde ni escondido bajo el HUD (barra HP arriba, joystick abajo).
export const ENEMY_MARGIN = 10;

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
  // Water world palette (ice blues, deep lake blues, swamp greens)
  frostBlue: 0x90caf9,      // Acólito de Escarcha, Vidente de Marea — light cornflower blue
  deepBlue: 0x1565c0,       // Ahogado, Corista del Abismo — dark lake blue (drowned hue)
  lakeGreen: 0x26a69a,      // Sacerdotisa del Lago, Náyade — teal healer
  iceGuard: 0x80deea,       // Guardia de Hielo — pale cyan armored
  turtleGreen: 0x5a9e57,    // Tortuga Acorazada — mossy shell green
  frostSpread: 0xb2ebf2,    // Lanzahielos — very pale ice, area-denial feel
  frozenGray: 0x78909c,     // (legacy armor grey-blue)
  crabRed: 0xcf4436,        // Cangrejo Acorazado — boiled-crab red
  tadpole: 0x558b2f,        // Renacuajo — dark swamp green (frog lineage)
  frogJump: 0x689f38,       // Rana Saltarina — lighter swamp green
  toadSpit: 0x33691e,       // Sapo Escupidor — darker muted toad
  globeFish: 0x4dd0e1,      // Pez Globo — bright cyan (inflated)
  jellyfish: 0xce93d8,      // Medusa — soft purple (bioluminescence)
  sharkYoung: 0x455a64,     // Tiburón Joven — dark blue-grey slate
  seaSerpent: 0x006064,     // Serpiente Marina — dark teal
  frostBubble: 0xe0f7fa,    // Burbuja Gélida — near-white ice
  frostTotem: 0xb0bec5,     // Tótem de Escarcha — cold grey-blue
  toadEgg: 0x8d6e63,        // Huevo de Sapo — muddy brown egg
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

// Per-creature sprite texture keys. Base texture = idle-down frame 0.
export function spriteKey(key) { return `spr_${key}`; }
export function frameKey(key, anim, i) { return `spr_${key}__${anim}__${i}`; }
