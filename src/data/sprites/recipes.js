// src/data/sprites/recipes.js
// PURE. Per-creature sprite recipes. key -> { archetype, size, parts, anim, palette?, accent? }
import { derivePalette, NAMED_PALETTES } from './palettes.js';

// Hooded-cultist part lists. cult_robe/cult_hood take the creature's type color
// (no palette override); the rest use named palettes. Order = back-to-front.
const CULT_HOODED = [
  { name: 'cult_robe' }, { name: 'cult_hood' },
  { name: 'cult_face', palette: 'shadow' }, { name: 'cult_eyes', palette: 'glow' },
];
const CULT_STAFF = [
  { name: 'cult_staff', palette: 'wood' }, { name: 'cult_ember', palette: 'ember' }, ...CULT_HOODED,
];
const CULT_FACELESS = [
  { name: 'cult_robe' }, { name: 'cult_hood' }, { name: 'cult_face', palette: 'shadow' },
];
// Water variant: frost-cyan eyes and orb (reuses the orbblue palette).
const CULT_HOODED_WATER = [
  { name: 'cult_robe' }, { name: 'cult_hood' },
  { name: 'cult_face', palette: 'shadow' }, { name: 'cult_eyes', palette: 'orbblue' },
];
const CULT_STAFF_WATER = [
  { name: 'cult_staff', palette: 'wood' }, { name: 'cult_ember', palette: 'orbblue' }, ...CULT_HOODED_WATER,
];
// Armored knight. helm/body/sword take the type color; visor=shadow, eyes glow
// (gold for fire/neutral, frost-cyan for water).
const KNIGHT = [
  { name: 'knight_sword' }, { name: 'knight_body' }, { name: 'knight_shield' }, { name: 'knight_helm' },
  { name: 'knight_visor', palette: 'shadow' }, { name: 'knight_eyes', palette: 'glow' },
];
const KNIGHT_WATER = [
  { name: 'knight_sword' }, { name: 'knight_body' }, { name: 'knight_shield' }, { name: 'knight_helm' },
  { name: 'knight_visor', palette: 'shadow' }, { name: 'knight_eyes', palette: 'orbblue' },
];
const KNIGHT_VAMP = [...KNIGHT.slice(0, 5), { name: 'knight_eyes', palette: 'vampglow' }];
const KNIGHT_BANNER = [{ name: 'banner' }, ...KNIGHT];
// Air caster pair A: acolito (light grey hood, yellow ember) vs heraldo (dark steel-blue, cyan ember)
const ACOLITO = [{ name: 'cult_staff', palette: 'wood' }, { name: 'cult_ember', palette: 'glow' }, ...CULT_HOODED];
const HERALDO = [{ name: 'cult_staff', palette: 'wood' }, { name: 'cult_ember', palette: 'orbblue' }, ...CULT_HOODED];
// Air caster pair B: hechicero (bare-head, grey robe, cyan orb) vs tronador (hooded, tan, yellow orb)
const TRONADOR_PARTS = [{ name: 'cult_staff', palette: 'wood' }, { name: 'cult_ember', palette: 'glow' }, ...CULT_HOODED];
// Bruja del Vendaval — wind-witch boss (air nv5). Clearly HUMANOID: purple robe/torso,
// silver hair framing a visible skin face, wind-orb staff. Gale accents (cyan) stay subtle.
// Layer order back-to-front: wind gust → robe/body → hair → skin face → staff.
const BRUJA = [
  { name: 'bruja_wind', palette: 'orbblue' },
  { name: 'bruja_body' },
  { name: 'bruja_hair', palette: 'silverhair' },
  { name: 'bruja_head', palette: 'skin' },
  { name: 'bruja_staff', palette: 'wood' },
];
// Bespoke blood-knight lord for caballero_sangre (air nv4 boss). Full-height (h32)
// imposing armored vampire-lord: black flowing cape, red+black plate armor, massive
// Saga-style pauldrons, slimmer torso, visored helm (no crown), greaves + greatsword.
// Distinctly different from the plain fodder KNIGHT_VAMP used by guardia_nocturno.
// Layer order back-to-front: cape → body → pauldrons → sword → eyes.
const BLOOD_KNIGHT = [
  { name: 'bk_cape', palette: 'vampblack' },
  { name: 'bk_body' },
  { name: 'bk_pauldrons' },
  { name: 'bk_sword', palette: 'steel' },
  { name: 'bk_eyes', palette: 'vampglow' },
];
// Sir Galahad — nv8 air temple final boss. Bespoke regal grail-knight, GRANDER than
// the Caballero de Sangre. Key visual distinctions: wide FANNING royal cape (vs straight
// curtain), CROWN prongs on helm (vs visor beak), grail-chalice emblem on breastplate
// (vs blood-V mark), cross-shaped longsword crossguard (vs greatsword serrations), gold
// holy-gleam accent (vs blood-red accent), open face slit with golden eyes (vs vampglow).
// Layer order back-to-front: cape → body → sword → eyes.
const GALAHAD_KNIGHT = [
  { name: 'gal_cape', palette: 'vampblack' },
  { name: 'gal_body' },
  { name: 'gal_sword', palette: 'steel' },
  { name: 'gal_eyes', palette: 'glow' },
];
// Jellyfish: translucent bell + inner core + trailing tentacles (type color) and
// glowing eyes. Serves both the medusa and its smaller split child.
const JELLY = [
  { name: 'jelly_tentacles' }, { name: 'jelly_bell' }, { name: 'jelly_guts' },
  { name: 'jelly_eyes', palette: 'glow' },
];
// Bare-headed mage/acolyte archetype. robe/mitre/shirt/trousers take the creature's
// type color; head + hands = skin; hair = a named hair palette. Melee carry a weapon,
// casters a staff + glow orb, the archer a bow (its projectile is TEX.arrow).
const MAGE_HEAD = { name: 'mage_head', palette: 'skin' };
const MAGE_HANDS = { name: 'mage_hands', palette: 'skin' };
const VILLAGER = (hairPal) => [
  { name: 'villager_legs', palette: 'pants' }, { name: 'villager_shirt' },
  MAGE_HEAD, MAGE_HANDS, { name: 'hair_short', palette: hairPal },
];
const MAGE_MELEE = (weapon) => [
  { name: 'mage_robe' }, MAGE_HEAD, { name: 'mage_mitre' }, MAGE_HANDS, weapon,
];
const MAGE_DROWNED = [
  { name: 'mage_robe' }, { name: 'mage_head', palette: 'drownedskin' }, { name: 'mage_mitre' },
  { name: 'mage_hands', palette: 'drownedskin' }, { name: 'mage_fish', palette: 'deadfish' },
];
const MAGE_ARCHER = [
  { name: 'mage_robe' }, MAGE_HEAD, { name: 'mage_mitre' }, MAGE_HANDS, { name: 'mage_bow', palette: 'wood' },
];
const MAGE_CASTER = (hairPal) => [
  { name: 'mage_staff', palette: 'wood' }, { name: 'mage_robe' }, MAGE_HEAD,
  { name: 'mage_hair', palette: hairPal }, MAGE_HANDS, { name: 'mage_orb', palette: 'orbblue' },
];
// Vampire footsoldiers: bare-headed humanoid with pale `vampskin` face/hands.
const VAMP_GRUNT = (hairPal) => [
  { name: 'villager_legs', palette: 'pants' }, { name: 'villager_shirt' },
  { name: 'mage_head', palette: 'vampskin' }, { name: 'mage_hands', palette: 'vampskin' },
  { name: 'hair_short', palette: hairPal },
];
// Lean night swordsman: small cape behind shoulders, fitted shirt+trousers, pale vamp face/hands,
// black hair, and a slender rapier held to the right. Dark steel-blue (0x455a64) fitted top.
// Layer order back-to-front: cape → legs → shirt → head → hands → hair → blade.
const DUELIST = [
  { name: 'duelist_cape', palette: 'vampblack' },
  { name: 'villager_legs', palette: 'pants' },
  { name: 'villager_shirt' },
  { name: 'mage_head', palette: 'vampskin' },
  { name: 'mage_hands', palette: 'vampskin' },
  { name: 'hair_short', palette: 'blackhair' },
  { name: 'duelist_blade', palette: 'steel' },
];
// Fire beasts. body = type color; molten cracks/crest/core = `ember`; eyes = `glow`;
// horns = `bone` (filled ivory cow-horns).
const LARVA = [{ name: 'larva_body' }, { name: 'larva_glow', palette: 'ember' }, { name: 'larva_eyes', palette: 'glow' }];
const SALAMANDRA = [{ name: 'sala_body' }, { name: 'sala_crest', palette: 'ember' }, { name: 'sala_eyes', palette: 'glow' }];
const CAN_LAVA = [{ name: 'can_body' }, { name: 'can_glow', palette: 'ember' }, { name: 'can_horns', palette: 'bone' }, { name: 'can_eyes', palette: 'glow' }];
const COLOSO = [{ name: 'coloso_body' }, { name: 'coloso_core', palette: 'ember' }, { name: 'coloso_horns', palette: 'bone' }, { name: 'coloso_eyes', palette: 'glow' }];
// Blobs / elementals. body = type color; cores/cracks = ember/glow; ice sheen =
// orbblue; eyes glow/shadow/eyes_living. brasa & burbuja keep no eyes / a frosty face.
const CENIZA = [{ name: 'ceniza_body' }, { name: 'ceniza_eyes', palette: 'glow' }];
const FUEGO_ELEM = [{ name: 'fuego_core', palette: 'glow' }, { name: 'fuego_body' }, { name: 'fuego_eyes', palette: 'shadow' }];
const IMP = [{ name: 'imp_body' }, { name: 'imp_horns' }, { name: 'imp_eyes', palette: 'glow' }];
const PEZ_GLOBO = [{ name: 'globo_body' }, { name: 'globo_spikes' }, { name: 'globo_eyes', palette: 'eyes_living' }];
const BRASA = [{ name: 'brasa_body' }, { name: 'brasa_glow', palette: 'ember' }];
const BURBUJA = [{ name: 'burbuja_body' }, { name: 'burbuja_sheen', palette: 'orbblue' }, { name: 'burbuja_eyes', palette: 'shadow' }];
// Winged / floating. body/wings = type color; phoenix crest/tail = ember, wasp wings
// = bone membrane; totem is a columnar pole with a recessed `shadow` face + a glowing
// eye (glow for fire, orbblue for frost) — one body serves both variants.
const FENIX = [{ name: 'fenix_crest', palette: 'ember' }, { name: 'fenix_body' }, { name: 'fenix_eyes', palette: 'glow' }];
const AVISPA = [{ name: 'avispa_wings', palette: 'bone' }, { name: 'avispa_body' }, { name: 'avispa_eyes', palette: 'shadow' }];
const TOTEM_FIRE = [{ name: 'totem_body' }, { name: 'totem_face', palette: 'shadow' }, { name: 'totem_eye', palette: 'glow' }];
const TOTEM_FROST = [{ name: 'totem_body' }, { name: 'totem_face', palette: 'shadow' }, { name: 'totem_eye', palette: 'orbblue' }];
// Bat: membranous wings + small furred body + ears + glowing eyes. Serves the swarm
// bat, the heavy winged vampire, and (later) Galahad's giant-bat form (size/baseColor vary).
const BAT = [{ name: 'bat_wings' }, { name: 'bat_body' }, { name: 'bat_eyes', palette: 'glow' }];
// Fish / serpent / shelled. body = type color (belly = its own highlight); teeth/fangs
// = bone; eyes shadow|glow. Turtle/crab carry their own green/red type colors.
const SHARK = [{ name: 'shark_body' }, { name: 'shark_teeth', palette: 'bone' }, { name: 'shark_eye', palette: 'shadow' }];
const SERPIENTE = [{ name: 'serpent_body' }, { name: 'serpent_fangs', palette: 'bone' }, { name: 'serpent_eye', palette: 'glow' }];
const TORTUGA = [{ name: 'turtle_body' }, { name: 'turtle_eye', palette: 'shadow' }];
const CANGREJO = [{ name: 'crab_body' }, { name: 'crab_eye', palette: 'shadow' }];
// Frog lineage. body = type color (belly/warts = its own highlight); embryos/pupils/
// mouth = shadow. Sized by stats: frog (small) < spitter toad < adult tank toad.
const HUEVO = [{ name: 'huevo_body' }, { name: 'huevo_spots', palette: 'shadow' }];
const RENACUAJO = [{ name: 'tadpole_body' }, { name: 'tadpole_eyes', palette: 'shadow' }];
const RANA = [{ name: 'frog_body' }, { name: 'frog_eyes', palette: 'shadow' }];
const SAPO_ESCUPIDOR = [{ name: 'toad_body' }, { name: 'toad_eyes', palette: 'shadow' }];
const SAPO_ADULTO = [{ name: 'bigtoad_body' }, { name: 'bigtoad_eyes', palette: 'shadow' }];
// Fire sisters (bosses). armor/robe/shield = type color; `a` = GOLD trim (recipe
// accent); skin face/hands = skin; hair = red/black/blond; flames/embers = glow;
// hammer = steel.
const PYRA = [{ name: 'pyra_body' }, { name: 'pyra_hair', palette: 'redhair' }, { name: 'pyra_skin', palette: 'skin' }, { name: 'pyra_crown', palette: 'glow' }, { name: 'pyra_orb', palette: 'glow' }];
const VESTA = [{ name: 'vesta_body' }, { name: 'vesta_hammer', palette: 'steel' }, { name: 'vesta_shield' }, { name: 'vesta_hair', palette: 'blackhair' }, { name: 'vesta_skin', palette: 'skin' }];
const FAVILLA = [{ name: 'favilla_body' }, { name: 'favilla_hair', palette: 'blondhair' }, { name: 'favilla_skin', palette: 'skin' }, { name: 'favilla_crown', palette: 'glow' }, { name: 'favilla_embers', palette: 'glow' }];
// Ignatius, the Fire King — father of the sisters. armor/robe = type color; `a` = gold;
// skin face/hands = skin; flaming beard = ember; crown/scepter-flame = glow; shaft = steel.
const IGNATIUS = [{ name: 'ign_scepter', palette: 'steel' }, { name: 'ign_body' }, { name: 'ign_skin', palette: 'skin' }, { name: 'ign_beard', palette: 'ember' }, { name: 'ign_crown', palette: 'glow' }, { name: 'ign_flame', palette: 'glow' }];
// Water monster bosses. body = type color; teeth/eggs = bone; armor/sword = steel;
// eyes/lure = glow; mouths = shadow; whale spout = orbblue.
const ICE_KNIGHT = [{ name: 'ice_sword', palette: 'steel' }, { name: 'ice_body' }, { name: 'ice_eyes', palette: 'glow' }];
const SAPO_DESOV = [{ name: 'desov_body' }, { name: 'desov_eggs', palette: 'bone' }, { name: 'desov_eyes', palette: 'shadow' }];
const TIBURON_ABISAL = [{ name: 'abisal_body' }, { name: 'abisal_teeth', palette: 'bone' }, { name: 'abisal_eye', palette: 'glow' }];
const KRAKEN = [{ name: 'kraken_body' }, { name: 'kraken_eye', palette: 'glow' }];
const WHALE = [{ name: 'whale_body' }, { name: 'whale_eye', palette: 'glow' }, { name: 'whale_spout', palette: 'orbblue' }];
// Dama del Lago — ethereal water sorceress, shared by her humanoid forms (lago/maga/
// maga_final). gown = type color; `a` = gold; skin = skin; hair = silver; crown = glow;
// orb = orbblue. Her shark form reuses TIBURON_ABISAL; kraken/whale forms reuse those.
const DAMA = [{ name: 'dama_gown' }, { name: 'dama_hair', palette: 'silverhair' }, { name: 'dama_skin', palette: 'skin' }, { name: 'dama_crown', palette: 'glow' }, { name: 'dama_orb', palette: 'orbblue' }];

// Tentáculo de agua: sprite de zona lobAoe (brota del suelo con scaleY 0→1→0).
// baseColor = COLORS.water (0x00bcd4); derivePalette genera la paleta cyan/teal.
const TENTACLE = [{ name: 'tentacle_body' }];

// Stone gargoyle (gargola_pararrayos) — perched/crouching grotesque, distinct from the totem.
// Bat-like stone wings (folded), hunched body, horned grotesque head with fanged snarl,
// electric glowing eyes (glow palette). Layer order back-to-front: wings → body → head → eyes.
const GARGOLA = [
  { name: 'gar_wings' },
  { name: 'gar_body' },
  { name: 'gar_head' },
  { name: 'gar_eyes', palette: 'glow' },
];
// Harpy (Arpía) — winged humanoid bird-woman. Wings behind body, torso + clawed legs,
// fierce head + feather crest, glowing eyes. Layer order back-to-front: wings → body → head → eyes.
const HARPY = [
  { name: 'harpy_wings' },
  { name: 'harpy_body' },
  { name: 'harpy_head' },
  { name: 'harpy_eyes', palette: 'glow' },
];
// Torbellino Errante — spinning wind vortex (ambient hazard, no face).
const WHIRL = [{ name: 'whirl_body' }];
// Elemental de Tormenta — nv6 setpiece. Organic cloud cluster: dark storm body, animated
// lightning veins (wispglow = electric yellow, 4 idle frames crackling through the cloud),
// and THREE glaring eyes (glow) across the left/center/right puffs.
const STORM_ELEM = [{ name: 'storm_body' }, { name: 'storm_bolts', palette: 'wispglow' }, { name: 'storm_eyes', palette: 'glow' }];

export const RECIPES = {
  hero: {
    // The redheaded princess. Each part composes against its own palette (per-part
    // palette overrides), so she mixes skin + red hair + green gown + gold + orb.
    archetype: 'hero', size: 32, anim: { idle: 2, walk: 2, attack: 3 }, fps: 5,
    parts: [
      { name: 'staff_princess', palette: 'wood' },
      { name: 'body_gown', palette: 'greengown' },
      { name: 'princess_skin', palette: 'skin' },
      { name: 'hair_long', palette: 'redhair' },
      { name: 'orb_princess', palette: 'orbblue' },
    ],
  },
  tentacle: { archetype: 'zone', size: 32, baseColor: 0x00bcd4, anim: { idle: 1, walk: 1 }, fps: 1, parts: TENTACLE },
  orb: { archetype: 'projectile', size: 32, baseColor: 0x80d8ff, anim: { idle: 2, walk: 1 }, fps: 8, parts: ['orb_body'] },
  fireball: { archetype: 'projectile', size: 32, baseColor: 0xff7043, anim: { idle: 3, walk: 1 }, fps: 10, parts: ['flame_body'] },
  arrow: { archetype: 'projectile', size: 32, baseColor: 0xfff176, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['arrow_body'] },
  iceShard:   { archetype: 'projectile', size: 32, baseColor: 0xb3e5fc, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['ice_shard'] },
  poisonGlob: { archetype: 'projectile', size: 32, baseColor: 0x7cb342, anim: { idle: 1, walk: 1 }, fps: 1, parts: ['poison_glob'] },

  // --- Generic (shared) ---
  // villager has 3 hair skins picked at random per-instance (Enemy.def.skins).
  villager:        { archetype: 'humanoid', size: 32, parts: VILLAGER('hair') },
  villager_blond:  { archetype: 'humanoid', size: 32, parts: VILLAGER('blondhair') },
  villager_black:  { archetype: 'humanoid', size: 32, parts: VILLAGER('blackhair') },
  warrior:         { archetype: 'humanoid', size: 64, parts: KNIGHT },
  archer:          { archetype: 'humanoid', size: 32, parts: MAGE_ARCHER },
  // --- Fire cultists (humanoid) ---
  acolito_brasa:   { archetype: 'humanoid', size: 32, parts: CULT_HOODED },
  lanzabrasas:     { archetype: 'humanoid', size: 32, parts: CULT_STAFF },
  iniciado_veloz:  { archetype: 'humanoid', size: 32, parts: MAGE_MELEE({ name: 'mage_club', palette: 'wood' }) },
  piromante:       { archetype: 'humanoid', size: 32, parts: CULT_STAFF },
  encapuchado_pira:{ archetype: 'humanoid', size: 32, parts: CULT_FACELESS },
  pirovidente:     { archetype: 'humanoid', size: 32, parts: CULT_STAFF },
  caballero_brasa: { archetype: 'humanoid', size: 64, parts: KNIGHT },
  sacerdote_llama: { archetype: 'humanoid', size: 32, parts: CULT_STAFF },
  portaestandarte: { archetype: 'humanoid', size: 64, parts: KNIGHT_BANNER },
  // --- Fire beasts ---
  larva_magma:     { archetype: 'beast', size: 64, parts: LARVA },
  salamandra:      { archetype: 'beast', size: 32, parts: SALAMANDRA },
  espiritu_ceniza: { archetype: 'blob', size: 32, parts: CENIZA },
  can_lava:        { archetype: 'beast', size: 64, parts: CAN_LAVA },
  elemental_fuego: { archetype: 'blob', size: 64, parts: FUEGO_ELEM },
  coloso_magma:    { archetype: 'beast', size: 64, parts: COLOSO },
  fenix_menor:     { archetype: 'floating', size: 64, parts: FENIX },
  // --- Summoned / ambient ---
  imp_brasa:       { archetype: 'blob', size: 32, parts: IMP },
  avispa_brasa:    { archetype: 'floating', size: 32, parts: AVISPA },
  totem_pira:      { archetype: 'floating', size: 64, parts: TOTEM_FIRE },
  brasa_errante:   { archetype: 'blob', size: 32, parts: BRASA },

  // --- Fire bosses (single-form) ---
  favilla:  { archetype: 'boss', size: 96, baseColor: 0xffca28, accent: 0xffd54f, parts: FAVILLA },
  pyra:     { archetype: 'boss', size: 96, baseColor: 0xe64a19, accent: 0xffd54f, parts: PYRA },
  vesta:    { archetype: 'boss', size: 96, baseColor: 0xff5722, accent: 0xffd54f, parts: VESTA },
  ignatius: { archetype: 'boss', size: 96, baseColor: 0xff7043, accent: 0xffd54f, parts: IGNATIUS },

  // --- Water bosses (single-form) ---
  soldado_hielo:   { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, parts: ICE_KNIGHT },
  sapo_desovador:  { archetype: 'boss', size: 96, baseColor: 0x7cb342, parts: SAPO_DESOV },
  tiburon_abisal:  { archetype: 'boss', size: 96, baseColor: 0x4fc3f7, parts: TIBURON_ABISAL },
  kraken:          { archetype: 'boss', size: 96, baseColor: 0xab47bc, anim: { idle: 4, walk: 4 }, parts: KRAKEN },
  // --- Dama del Lago + her 5 forms (each a distinct creature) ---
  dama_lago:       { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: DAMA },
  dama_maga:       { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: DAMA },
  dama_tiburon:    { archetype: 'boss', size: 96, baseColor: 0x4fc3f7, parts: TIBURON_ABISAL },
  dama_kraken:     { archetype: 'boss', size: 96, baseColor: 0xab47bc, anim: { idle: 4, walk: 4 }, parts: KRAKEN },
  dama_ballena:    { archetype: 'boss', size: 96, baseColor: 0xd32f2f, parts: WHALE },
  dama_maga_final: { archetype: 'boss', size: 96, baseColor: 0xb3e5fc, accent: 0xffd54f, parts: DAMA },

  // --- Water cultists (humanoid) ---
  acolito_escarcha:  { archetype: 'humanoid', size: 32, parts: CULT_HOODED_WATER },
  ahogado:           { archetype: 'humanoid', size: 32, parts: MAGE_DROWNED },
  corista_abismo:    { archetype: 'humanoid', size: 32, parts: CULT_HOODED_WATER },
  lanzahielos:       { archetype: 'humanoid', size: 32, parts: CULT_STAFF_WATER },
  nayade:            { archetype: 'humanoid', size: 32, parts: MAGE_CASTER('hair') },
  sacerdotisa_lago:  { archetype: 'humanoid', size: 32, parts: MAGE_CASTER('blackhair') },
  vidente_marea:     { archetype: 'humanoid', size: 32, parts: CULT_STAFF_WATER },
  guardia_hielo:     { archetype: 'humanoid', size: 64, parts: KNIGHT_WATER },
  // --- Water beasts ---
  tiburon_joven:     { archetype: 'fish',    size: 64, parts: SHARK },
  serpiente_marina:  { archetype: 'serpent', size: 64, parts: SERPIENTE },
  tortuga_acorazada: { archetype: 'shelled', size: 64, parts: TORTUGA },
  cangrejo_acorazado:{ archetype: 'shelled', size: 64, parts: CANGREJO },
  medusa:            { archetype: 'jelly',   size: 64, parts: JELLY },
  medusa_cria:       { archetype: 'jelly',   size: 32, parts: JELLY },
  pez_globo:         { archetype: 'blob',    size: 32, parts: PEZ_GLOBO },
  // --- Frog lineage ---
  huevo_sapo:        { archetype: 'egg',     size: 32, parts: HUEVO },
  renacuajo:         { archetype: 'blob',    size: 32, parts: RENACUAJO },
  rana_saltarina:    { archetype: 'frog',    size: 32, parts: RANA },
  sapo_escupidor:    { archetype: 'frog',    size: 64, parts: SAPO_ESCUPIDOR },
  sapo_adulto:       { archetype: 'frog',    size: 64, parts: SAPO_ADULTO },
  // --- Ambient ---
  burbuja_gelida:    { archetype: 'blob',     size: 32, parts: BURBUJA },
  totem_escarcha:    { archetype: 'floating', size: 64, parts: TOTEM_FROST },

  // --- Air cultists (La Torre Montaña) ---
  // Three visually distinct hooded fodder: purple / dark-storm / grey-blue, all glowing eyes.
  // Líder carries an arcane force-field barrier (lider_field=orbblue) + authority staff
  // with a large crystal orb finial (lider_staff=wood shaft; crystal roles glow palette).
  cultista:            { archetype: 'humanoid', size: 32, baseColor: 0x4a148c, parts: CULT_HOODED },
  guardian_rito:       { archetype: 'humanoid', size: 32, baseColor: 0x37474f, parts: CULT_HOODED },
  cultista_canalizador:{ archetype: 'humanoid', size: 32, baseColor: 0x607d8b, parts: CULT_HOODED },
  lider_cultista:      { archetype: 'boss',     size: 96, baseColor: 0x6a1b9a, parts: [
    { name: 'lider_field', palette: 'orbblue' },
    ...CULT_HOODED,
    { name: 'lider_staff', palette: 'wood' },
  ] },

  // --- Air knights (vampiric) ---
  guardia_nocturno: { archetype: 'humanoid', size: 64, baseColor: 0x37474f, parts: KNIGHT_VAMP },
  caballero_sangre: { archetype: 'boss',     size: 96, baseColor: 0xb71c1c, parts: BLOOD_KNIGHT },

  // --- Air humanoid vampires ---
  siervo_torre:      { archetype: 'humanoid', size: 32, baseColor: 0x37474f, parts: VAMP_GRUNT('blackhair') },
  vastago_vampirico: { archetype: 'humanoid', size: 32, baseColor: 0x6a1b9a, parts: VAMP_GRUNT('blackhair') },
  duelista_nocturno: { archetype: 'humanoid', size: 32, baseColor: 0x455a64, parts: DUELIST },

  // --- Air casters ---
  acolito_trueno:   { archetype: 'humanoid', size: 32, baseColor: 0x607d8b, parts: ACOLITO },
  heraldo_rayo:     { archetype: 'humanoid', size: 32, baseColor: 0x455a64, parts: HERALDO },
  hechicero_viento: { archetype: 'humanoid', size: 32, baseColor: 0x607d8b, parts: MAGE_CASTER('blackhair') },
  tronador:         { archetype: 'humanoid', size: 32, baseColor: 0x8d6e63, parts: TRONADOR_PARTS },
  sacerdote_sangre: { archetype: 'humanoid', size: 32, baseColor: 0xb71c1c, parts: CULT_STAFF },
  bruja_vendaval:   { archetype: 'boss',     size: 96, baseColor: 0x6a1b9a, parts: BRUJA },

  // --- Air winged (new art) ---
  murcielago:    { archetype: 'floating', size: 32, baseColor: 0x6a1b9a, parts: BAT },
  vampiro_alado: { archetype: 'floating', size: 64, baseColor: 0xb71c1c, parts: BAT },
  arpia:             { archetype: 'floating', size: 32, baseColor: 0x8e24aa, parts: HARPY },
  torbellino_errante:{ archetype: 'blob',     size: 32, baseColor: 0xb0bec5, parts: WHIRL },

  // --- Air blobs + stone sentinels ---
  fuego_fatuo:        { archetype: 'blob',     size: 32, baseColor: 0xffee58, parts: BRASA },
  espiritu_tormenta:  { archetype: 'blob',     size: 32, baseColor: 0xb0bec5, parts: CENIZA },
  centinela_piedra:   { archetype: 'floating', size: 64, baseColor: 0x78909c, parts: TOTEM_FIRE },
  // Bespoke stone gargoyle — perched/crouching grotesque with folded bat-wings, horned head,
  // snarling fanged jaws, clawed forelimbs. Electric glowing eyes (glow palette). Distinct
  // from centinela_piedra (which keeps TOTEM_FIRE). Layer order: wings → body → head → eyes.
  gargola_pararrayos: { archetype: 'floating', size: 64, baseColor: 0x546e7a, parts: GARGOLA },

  // --- Air boss (nv6 setpiece) ---
  // Native 2:1: authored 64×32, forged at scale 2 → 128×64 texture (uniform pixels).
  elemental_tormenta: { archetype: 'boss', gridW: 64, gridH: 32, scale: 2, baseColor: 0x37474f, anim: { idle: 4 }, parts: STORM_ELEM },

  // --- Galahad (nv8 air temple final boss) — 5 shapeshifter forms ---
  // Holy → blood → dark fury → giant bat → ashen. The 4 human forms use the bespoke
  // GALAHAD_KNIGHT parts; the bat form reuses the BAT archetype at boss scale (96px).
  galahad_humano:     { archetype: 'boss', size: 96, baseColor: 0x9aa6b2, accent: 0xffd54f, parts: GALAHAD_KNIGHT }, // pale steel plate, gold trim — holy paladin
  galahad_rage:       { archetype: 'boss', size: 96, baseColor: 0xb71c1c, accent: 0xffd54f, parts: GALAHAD_KNIGHT }, // blood-red — first corruption
  galahad_rage2:      { archetype: 'boss', size: 96, baseColor: 0x7f0000, accent: 0xff5252, parts: GALAHAD_KNIGHT }, // dark crimson, scarlet accent — full fury
  galahad_murcielago: { archetype: 'boss', size: 96, baseColor: 0x4a148c, parts: BAT },                             // deep purple giant bat
  galahad_final:      { archetype: 'boss', size: 96, baseColor: 0xcdbfc9, accent: 0xffd54f, parts: GALAHAD_KNIGHT }, // ashen — the cursed grail king stripped bare
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
