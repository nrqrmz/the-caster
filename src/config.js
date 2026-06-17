// Logical resolution (portrait). Scale Manager FITs this to the device.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 854;

// Colchón extra (px) además del radio del enemigo para contenerlo en pantalla:
// nada queda pegado al borde ni escondido bajo el HUD (barra HP arriba, joystick abajo).
export const ENEMY_MARGIN = 10;

// Render order: ground hazards (lava/poison zones, tentacle puddles, triangle/river
// edges) live at depth 5-7; projectiles fly over the ground (depth 8) but under the
// actors that fire them; actors render above them (they stand ON the lava, not
// under it). Telegraphs (1400) and bars/UI (1500+) stay above actors.
export const PROJECTILE_DEPTH = 8;
export const ACTOR_DEPTH = 10;

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
  // Air world palette (storm greys, electric yellows, blood reds, bat purples)
  stormGrey: 0x607d8b,      // Acólito/Heraldo/Espíritu/Tronador — slate storm-cloud blue-grey
  stormDark: 0x37474f,      // Hechicero del Viento, Guardia Nocturno — darker thundercloud
  bloodRed: 0xb71c1c,       // Sacerdote de Sangre, Vampiro Alado — deep arterial red
  vampPale: 0xd7a3a3,       // Siervo de la Torre, Vástago Vampírico — pale corpse-flushed skin
  duelistSteel: 0x90a4ae,   // Duelista Nocturno — cold blued-steel grey
  batPurple: 0x6a1b9a,      // Murciélago — deep bat purple
  harpyPlum: 0x8e24aa,      // Arpía — brighter plum (winged)
  wispYellow: 0xffee58,     // Fuego Fatuo — eerie electric will-o'-the-wisp yellow
  gargoyleStone: 0x546e7a,  // Gárgola Pararrayos — wet lightning-rod stone
  sentinelStone: 0x78909c,  // Centinela de Piedra — paler statue grey
  whirlGrey: 0xb0bec5,      // Torbellino Errante — pale dust-devil grey
  cultRobe: 0x4a148c,       // Cultista, Cultista Canalizador, Guardián del Rito — dark ritual purple
  heal: 0x00e676,       // vivid healing green — healer marker ring + tethers (region-agnostic so "green = cura")
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
  iceShard: 'tex_iceShard',
  poisonGlob: 'tex_poisonGlob',
  miniboss: 'tex_miniboss',
  boss: 'tex_boss',
  temple: 'tex_temple',
  tentacle: 'tex_tentacle',
};

// Per-creature sprite texture keys. Base texture = idle-down frame 0.
export function spriteKey(key) { return `spr_${key}`; }
export function frameKey(key, anim, i) { return `spr_${key}__${anim}__${i}`; }
