# Air Sprites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 20 Air enemies + 5 bosses real 32×32 sprites (recipes + parts + palettes), reviewed batch-by-batch with the user via a Playwright-driven preview page, removing each def's `geometric: true` flag only after its sprite is approved.

**Architecture:** Reuse the existing pure sprite pipeline — `SpriteForge` (forge) + `src/data/sprites/parts.js` (role-tagged pixel grids) + `recipes.js` (key → parts/palette/baseColor) + `palettes.js` (5-role palettes). Most Air creatures are **reuse + recolor** of existing part-sets (cultists/knights/casters/blobs/totems) via a new `baseColor`; only ~5 silhouettes get new hand-authored parts (bat, harpy, whirlwind, storm-cloud elemental, giant bat). A new dev-only preview page (`tools/sprite-preview.html`) forges and displays the Air recipes for visual review.

**Tech Stack:** JavaScript ES modules (no build), Phaser 3 (CDN, runtime only), `node:test` for pure forge invariants, Playwright (MCP) for visual review.

**Spec:** docs/superpowers/specs/2026-06-17-air-sprites-design.md
**Depends on:** Air world (merged, PR #27) — the 20 enemy defs in `src/data/enemies/air.js` and 5 boss defs in `src/data/bosses/air.js`, all carrying `geometric: true`.

## Global Constraints

- No build/bundler; native ES modules; mobile portrait 480×854. Art is code: parts are role-tagged grids, forged by `SpriteForge` (`DESIGN=32`).
- Part grid shape: `{ res, w, h, anchor:{x,y}, down:[rows], up:[rows], side:[rows] }`; each row is a string of role chars — `.`=transparent, `o`=outline, `b`=base, `s`=shade, `h`=highlight, `a`=accent.
- Palette shape: 5 roles `{ outline, base, shade, highlight, accent }`, built by `derivePalette(baseColorInt, overrides)`; named palettes live in `NAMED_PALETTES` (`palettes.js`).
- Recipe shape: `key: { archetype, size, parts: [...], baseColor?, palette?, accent? }`. `parts` entries are `'name'` or `{ name, palette }`. `paletteFor` uses a named `palette` if set, else `derivePalette(baseColor, {accent})`.
- Texture/color keys centralized in `config.js`. Air `COLORS` keys already exist: `stormGrey/stormDark/bloodRed/vampPale/duelistSteel/batPurple/harpyPlum/wispYellow/gargoyleStone/sentinelStone/whirlGrey/cultRobe`.
- **Only logic change permitted to the Air world:** removing `geometric: true` from a def once its sprite is approved. No gameplay/balance/wave/phase changes.
- **Human review gate (the user's hard rule):** no sprite is approved without the user seeing it in the Playwright preview. Every batch task ends with a review checkpoint BEFORE `geometric: true` is removed.
- Test ordering invariant: within a batch, ADD the recipe first (so `every recipe forges without throwing` and `GLOBAL recipe` stay green), get approval, THEN remove `geometric: true` (so the GLOBAL recipe test — which requires a recipe for any non-`geometric` enemy — stays green).
- Run tests with `node --test`; serve with `python3 -m http.server 8000`.

## Recipe key inventory (29 textures)

Enemies (20): `siervo_torre, duelista_nocturno, acolito_trueno, heraldo_rayo, sacerdote_sangre, guardia_nocturno, hechicero_viento, vastago_vampirico, murcielago, arpia, espiritu_tormenta, fuego_fatuo, vampiro_alado, gargola_pararrayos, centinela_piedra, torbellino_errante, tronador, cultista, cultista_canalizador, guardian_rito`.
Bosses (9 keys): `caballero_sangre, bruja_vendaval, elemental_tormenta, lider_cultista, galahad_humano, galahad_rage, galahad_rage2, galahad_murcielago, galahad_final`. (`galahad` top-level def has no own texture — its forms do.)

---

## Task 1: Sprite preview page (Lote 0)

**Files:**
- Create: `tools/sprite-preview.html`
- (verify against existing recipe `acolito_brasa`)

A dev-only page that ES-imports the pure pipeline, forges a configurable list of keys, and draws each forged sprite scaled up with its key label. Verified by serving + a Playwright screenshot showing an existing sprite renders.

- [ ] **Step 1: Create the preview page**

Create `tools/sprite-preview.html`. It imports the pipeline with paths relative to `tools/` (`../src/...`), forges each listed key's `idle`/`down` frame 0 (the base frame every recipe produces), and paints it on a canvas at 8× with a label. Default key list = the 29 Air keys (those without a recipe yet are listed as "MISSING" so the grid shows progress).

```html
<!doctype html>
<html><head><meta charset="utf-8"><title>Air sprite preview</title>
<style>
  body { background:#1a1224; color:#eee; font-family:sans-serif; margin:0; padding:12px; }
  .grid { display:flex; flex-wrap:wrap; gap:14px; }
  .cell { background:#241a33; border:1px solid #3a2c52; border-radius:6px; padding:6px; text-align:center; }
  canvas { image-rendering:pixelated; background:#0e0a16; display:block; margin:0 auto 4px; }
  .label { font-size:11px; color:#cbb8e6; max-width:160px; word-break:break-word; }
  .missing { color:#e57373; }
  h1 { font-size:15px; font-weight:600; }
</style></head>
<body>
<h1>Air sprite preview — <span id="count"></span></h1>
<div class="grid" id="grid"></div>
<script type="module">
import { composeColorGrid, DESIGN } from '../src/systems/SpriteForge.js';
import { RECIPES, getRecipe, paletteFor, hasRecipe } from '../src/data/sprites/recipes.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { NAMED_PALETTES } from '../src/data/sprites/palettes.js';

// Keys to review. Edit this list per batch; defaults to the full Air roster.
const KEYS = new URLSearchParams(location.search).get('keys')?.split(',') ?? [
  'siervo_torre','duelista_nocturno','acolito_trueno','heraldo_rayo','sacerdote_sangre',
  'guardia_nocturno','hechicero_viento','vastago_vampirico','murcielago','arpia',
  'espiritu_tormenta','fuego_fatuo','vampiro_alado','gargola_pararrayos','centinela_piedra',
  'torbellino_errante','tronador','cultista','cultista_canalizador','guardian_rito',
  'caballero_sangre','bruja_vendaval','elemental_tormenta','lider_cultista',
  'galahad_humano','galahad_rage','galahad_rage2','galahad_murcielago','galahad_final',
];
const SCALE = 8;
const grid = document.getElementById('grid');
let done = 0;
// partPalette resolver: a part-ref's own named palette wins, else the recipe palette.
function makePartPalette(recipeKey) {
  return (ref) => {
    const name = typeof ref === 'string' ? null : ref.palette;
    return name ? NAMED_PALETTES[name] : null;
  };
}
for (const key of KEYS) {
  const cell = document.createElement('div'); cell.className = 'cell';
  if (!hasRecipe(key)) {
    cell.innerHTML = `<canvas width="${DESIGN*SCALE}" height="${DESIGN*SCALE}"></canvas><div class="label missing">${key}<br>(no recipe)</div>`;
    grid.appendChild(cell); continue;
  }
  const recipe = getRecipe(key);
  const baseColor = recipe.baseColor ?? 0x888888;
  const palette = paletteFor(key, baseColor);
  const g = composeColorGrid(recipe, PARTS, 'down', palette, makePartPalette(key), null, 0);
  const cv = document.createElement('canvas'); cv.width = DESIGN*SCALE; cv.height = DESIGN*SCALE;
  const ctx = cv.getContext('2d');
  for (let y=0;y<DESIGN;y++) for (let x=0;x<DESIGN;x++) {
    const c = g[y][x]; if (c==null) continue;
    ctx.fillStyle = '#'+(c>>>0).toString(16).padStart(6,'0').slice(-6);
    ctx.fillRect(x*SCALE,y*SCALE,SCALE,SCALE);
  }
  cell.innerHTML = `<div class="label">${key}</div>`;
  cell.insertBefore(cv, cell.firstChild);
  grid.appendChild(cell); done++;
}
document.getElementById('count').textContent = `${done}/${KEYS.length} forged`;
</script></body></html>
```

> Note: `?keys=a,b,c` lets a batch review show only its creatures. The page reads the SAME `paletteFor`/`composeColorGrid`/`PARTS` the game uses, so what you see is what BootScene forges.

- [ ] **Step 2: Serve and verify an EXISTING sprite forges/renders**

Run (background):
```
python3 -m http.server 8000
```
Open `http://localhost:8000/tools/sprite-preview.html?keys=acolito_brasa,villager,kraken` and confirm three known-good sprites render (cultist, villager, kraken). This proves the page wires the pipeline correctly before any Air art exists.

- [ ] **Step 3: Playwright screenshot to confirm**

Use Playwright (MCP): navigate to the URL above, snapshot/screenshot, confirm the canvases are non-empty (recognizable cultist/villager/kraken). This is the review tool that every later batch uses.

- [ ] **Step 4: Confirm no Air recipe exists yet (page shows them MISSING) + commit**

Open `http://localhost:8000/tools/sprite-preview.html` (no `?keys`) — all 29 Air keys show "(no recipe)". That is the expected starting state.

```
git add tools/sprite-preview.html
git commit -m "feat(air-sprites): dev preview page (forge + Playwright review)"
```

> No `node --test` change here — the page is a dev tool, not shipped logic. The pipeline it imports is already covered by the existing forge tests.

---

## Task 2: Lote A1 — Cultists + Líder Cultista (reuse `CULT_*`)

**Files:**
- Modify: `src/data/sprites/recipes.js`
- Modify: `src/data/enemies/air.js` (remove `geometric` on the 3 fodder), `src/data/bosses/air.js` (remove `geometric` on the leader)
- Test: `tests/sprites/recipes.test.js` (existing `every recipe forges` covers new recipes)

Cultista (hooded), Cultista Canalizador (faceless, channeling), Guardián del Rito (hooded), Líder Cultista (hooded + staff, distinct robe color). All reuse existing `CULT_*` part-sets, recolored via `baseColor` = an Air cult color.

**Interfaces:**
- Consumes: `CULT_HOODED`, `CULT_FACELESS`, `CULT_STAFF` (already defined in recipes.js); `COLORS.cultRobe`, `COLORS.stormDark`.
- Produces: recipes `cultista`, `cultista_canalizador`, `guardian_rito`, `lider_cultista`.

- [ ] **Step 1: Add the 4 recipes** — in `src/data/sprites/recipes.js`, add an Air section before `hasRecipe`:

```js
  // --- Air cultists (La Torre Montaña) ---
  cultista:            { archetype: 'humanoid', size: 32, baseColor: 0x4a148c, parts: CULT_HOODED },
  guardian_rito:       { archetype: 'humanoid', size: 32, baseColor: 0x4a148c, parts: CULT_HOODED },
  cultista_canalizador:{ archetype: 'humanoid', size: 32, baseColor: 0x37474f, parts: CULT_FACELESS },
  lider_cultista:      { archetype: 'boss',     size: 96, baseColor: 0x6a1b9a, parts: CULT_STAFF },
```

> `0x4a148c`=`COLORS.cultRobe`, `0x37474f`=`COLORS.stormDark`, `0x6a1b9a`=`COLORS.batPurple` (leader stands out). These are hex literals because recipes.js does not import `COLORS` — match the existing file (water/fire recipes also inline baseColor hexes).

- [ ] **Step 2: Forge test green**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS — `every recipe forges without throwing` now also forges the 4 new recipes (a bad part/palette would throw here).

- [ ] **Step 3: Review gate (Playwright) — USER APPROVAL REQUIRED**

Serve, open `http://localhost:8000/tools/sprite-preview.html?keys=cultista,cultista_canalizador,guardian_rito,lider_cultista`, Playwright screenshot, present to the user. **Wait for approval.** If changes requested, adjust `baseColor`/part-set and re-review. Do NOT proceed to Step 4 until approved.

- [ ] **Step 4: Remove `geometric: true` from these 4 defs**

In `src/data/enemies/air.js` delete the `geometric: true` field from `cultista`, `cultista_canalizador`, `guardian_rito`. In `src/data/bosses/air.js` delete it from `LIDER_CULTISTA`.

- [ ] **Step 5: Full suite green + commit**

Run: `node --test`
Expected: 319 pass, 0 fail — the GLOBAL recipe test stays green because these now have recipes; the AirRoster/AirBosses geometric assertions must be updated if they assert `geometric === true` on these keys.

> If `tests/AirRoster.test.js` / `tests/AirBosses.test.js` assert `geometric === true` for a now-spritted key, relax those specific assertions to "geometric flag absent OR a recipe exists" for the approved keys (the GLOBAL recipe invariant is the real guard). Show the diff; do not weaken unrelated assertions.

```
git add src/data/sprites/recipes.js src/data/enemies/air.js src/data/bosses/air.js tests/
git commit -m "feat(air-sprites): cultists + Líder Cultista recipes (reuse CULT_*), drop geometric"
```

---

## Task 3: Lote A2 — Knights (Caballero de Sangre, Guardia Nocturno) reuse `KNIGHT`

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/sprites/palettes.js` (optional vamp-eye palette), `src/data/enemies/air.js`, `src/data/bosses/air.js`

**Interfaces:**
- Consumes: `KNIGHT` part-set; `COLORS.bloodRed` (0xb71c1c), `COLORS.stormDark` (0x37474f).
- Produces: recipes `guardia_nocturno`, `caballero_sangre`.

- [ ] **Step 1: (Optional) add a vampiric eye-glow palette** — only if the default `glow` (gold) eyes look wrong on a blood knight. In `palettes.js` `NAMED_PALETTES`, add:

```js
  vampglow: derivePalette(0xff5252, { highlight: 0xffcdd2, base: 0xff5252, shade: 0xc62828, outline: 0x7f1d1d }),
```

- [ ] **Step 2: Add the 2 recipes** — in recipes.js Air section. If you added `vampglow`, override the `knight_eyes` palette per-recipe by defining a local part list; otherwise reuse `KNIGHT` directly:

```js
  // --- Air knights (vampiric) ---
  guardia_nocturno: { archetype: 'humanoid', size: 64, baseColor: 0x37474f, parts: KNIGHT },
  caballero_sangre: { archetype: 'boss',     size: 96, baseColor: 0xb71c1c, parts: KNIGHT },
```

> If using `vampglow`, define `const KNIGHT_VAMP = [...KNIGHT.slice(0,5), { name: 'knight_eyes', palette: 'vampglow' }];` near the other KNIGHT consts and use `parts: KNIGHT_VAMP`.

- [ ] **Step 3: Forge test green** — `node --test tests/sprites/recipes.test.js` → PASS.

- [ ] **Step 4: Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=guardia_nocturno,caballero_sangre`; screenshot; present; wait for approval; iterate on `baseColor`/eye palette if requested.

- [ ] **Step 5: Remove `geometric: true`** from `guardia_nocturno` (enemies/air.js) and `CABALLERO_SANGRE` (bosses/air.js); relax any `geometric===true` test assertion for these keys.

- [ ] **Step 6: Full suite green + commit**

```
node --test
git add src/data/sprites/ src/data/enemies/air.js src/data/bosses/air.js tests/
git commit -m "feat(air-sprites): vampiric knights (Caballero de Sangre, Guardia Nocturno), drop geometric"
```

---

## Task 4: Lote A3 — Casters (Acólito, Heraldo, Hechicero, Tronador, Sacerdote, Bruja del Vendaval)

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/enemies/air.js`, `src/data/bosses/air.js`

Ranged/caster humanoids reuse `CULT_STAFF` (hooded staff-caster) or `MAGE_CASTER(hairPal)` (bare-headed caster). Pick per creature for variety; recolor via baseColor. Bruja del Vendaval is the nv5 boss (size 96).

**Interfaces:**
- Consumes: `CULT_STAFF`, `MAGE_CASTER`; `COLORS.stormGrey` (0x607d8b), `COLORS.bloodRed` (0xb71c1c), `COLORS.batPurple` (0x6a1b9a).
- Produces: recipes `acolito_trueno`, `heraldo_rayo`, `hechicero_viento`, `tronador`, `sacerdote_sangre`, `bruja_vendaval`.

- [ ] **Step 1: Add the 6 recipes** — recipes.js Air section:

```js
  // --- Air casters ---
  acolito_trueno:   { archetype: 'humanoid', size: 32, baseColor: 0x607d8b, parts: CULT_STAFF },
  heraldo_rayo:     { archetype: 'humanoid', size: 32, baseColor: 0x546e7a, parts: CULT_STAFF },
  hechicero_viento: { archetype: 'humanoid', size: 32, baseColor: 0x90a4ae, parts: MAGE_CASTER('blackhair') },
  tronador:         { archetype: 'humanoid', size: 32, baseColor: 0x607d8b, parts: MAGE_CASTER('hair') },
  sacerdote_sangre: { archetype: 'humanoid', size: 32, baseColor: 0xb71c1c, parts: CULT_STAFF },
  bruja_vendaval:   { archetype: 'boss',     size: 96, baseColor: 0x6a1b9a, parts: MAGE_CASTER('silverhair') },
```

> `0x546e7a`=`gargoyleStone`, `0x90a4ae`=`duelistSteel` — reused as storm-grey tints. Inline hexes (recipes.js doesn't import COLORS).

- [ ] **Step 2: Forge test green** — `node --test tests/sprites/recipes.test.js` → PASS.

- [ ] **Step 3: Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=acolito_trueno,heraldo_rayo,hechicero_viento,tronador,sacerdote_sangre,bruja_vendaval`; screenshot; present; wait for approval; iterate.

- [ ] **Step 4: Remove `geometric: true`** from the 5 enemy casters (enemies/air.js) and `BRUJA_VENDAVAL` (bosses/air.js); relax any `geometric===true` assertions for these keys.

- [ ] **Step 5: Full suite green + commit**

```
node --test
git add src/data/sprites/recipes.js src/data/enemies/air.js src/data/bosses/air.js tests/
git commit -m "feat(air-sprites): caster humanoids + Bruja del Vendaval, drop geometric"
```

---

## Task 5: Lote A4 — Humanoid vampires (Siervo, Duelista, Vástago) + `vampskin` palette

**Files:**
- Modify: `src/data/sprites/palettes.js`, `src/data/sprites/recipes.js`, `src/data/enemies/air.js`

Grounded vampire footsoldiers reuse the bare-headed humanoid sets (`VILLAGER(hairPal)`, `MAGE_MELEE(weapon)`) with a new pale-vampire skin palette so they read as undead, not peasants.

**Interfaces:**
- Consumes: `VILLAGER`, `MAGE_MELEE`, `MAGE_HEAD`, `MAGE_HANDS` (recipes.js); new palette `vampskin`.
- Produces: recipes `siervo_torre`, `duelista_nocturno`, `vastago_vampirico`; palette `vampskin`.

- [ ] **Step 1: Add `vampskin` palette** — in `palettes.js` `NAMED_PALETTES`:

```js
  vampskin: derivePalette(0xd7a3a3, { base: 0xcdbfc9, highlight: 0xede0e6, shade: 0x9a8a96, outline: 0x4a3a44 }),
```

- [ ] **Step 2: Add a vamp humanoid part-list + the 3 recipes** — in recipes.js, near the VILLAGER/MAGE consts add:

```js
// Vampire footsoldiers: bare-headed humanoid with pale `vampskin` face/hands.
const VAMP_GRUNT = (hairPal) => [
  { name: 'villager_legs', palette: 'pants' }, { name: 'villager_shirt' },
  { name: 'mage_head', palette: 'vampskin' }, { name: 'mage_hands', palette: 'vampskin' },
  { name: 'hair_short', palette: hairPal },
];
const VAMP_DUELIST = [
  { name: 'mage_robe' }, { name: 'mage_head', palette: 'vampskin' }, { name: 'mage_mitre' },
  { name: 'mage_hands', palette: 'vampskin' }, { name: 'mage_club', palette: 'steel' },
];
```

And in the Air section:
```js
  // --- Air humanoid vampires ---
  siervo_torre:      { archetype: 'humanoid', size: 32, baseColor: 0x37474f, parts: VAMP_GRUNT('blackhair') },
  vastago_vampirico: { archetype: 'humanoid', size: 32, baseColor: 0x6a1b9a, parts: VAMP_GRUNT('blackhair') },
  duelista_nocturno: { archetype: 'humanoid', size: 32, baseColor: 0x90a4ae, parts: VAMP_DUELIST },
```

> Verify `villager_legs`, `villager_shirt`, `hair_short`, `mage_robe`, `mage_mitre`, `mage_club` exist in `parts.js` (grep). If `mage_club` is missing, reuse `mage_bow` or the staff; pick an existing weapon part.

- [ ] **Step 3: Forge test green** — `node --test tests/sprites/recipes.test.js` → PASS (catches a missing part name).

- [ ] **Step 4: Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=siervo_torre,duelista_nocturno,vastago_vampirico`; screenshot; present; wait for approval; iterate on `vampskin`/hair/weapon.

- [ ] **Step 5: Remove `geometric: true`** from the 3 defs (enemies/air.js); relax assertions.

- [ ] **Step 6: Full suite green + commit**

```
node --test
git add src/data/sprites/ src/data/enemies/air.js tests/
git commit -m "feat(air-sprites): humanoid vampires + vampskin palette, drop geometric"
```

---

## Task 6: Lote A5 — Blobs + Totems (Fuego Fatuo, Espíritu de Tormenta, Centinela, Gárgola)

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/enemies/air.js`

Will-o-wisps reuse the `BRASA`/`CENIZA` blob sets (recolored to electric yellow); the stone sentinels reuse the `TOTEM` idol set (recolored to stone). An electric-eye palette for the totem eye if `glow` (gold) reads wrong.

**Interfaces:**
- Consumes: `BRASA`, `CENIZA`, `TOTEM_FIRE`/`TOTEM_FROST` (recipes.js); `COLORS.wispYellow` (0xffee58), `COLORS.gargoyleStone` (0x546e7a), `COLORS.sentinelStone` (0x78909c).
- Produces: recipes `fuego_fatuo`, `espiritu_tormenta`, `centinela_piedra`, `gargola_pararrayos`.

- [ ] **Step 1: Add the 4 recipes** — recipes.js Air section. For the totems, define a storm-eyed variant reusing the totem body:

```js
  // --- Air blobs + stone sentinels ---
  fuego_fatuo:        { archetype: 'blob',     size: 32, baseColor: 0xffee58, parts: BRASA },
  espiritu_tormenta:  { archetype: 'blob',     size: 32, baseColor: 0xb0bec5, parts: CENIZA },
  centinela_piedra:   { archetype: 'floating', size: 64, baseColor: 0x78909c, parts: TOTEM_FIRE },
  gargola_pararrayos: { archetype: 'floating', size: 64, baseColor: 0x546e7a, parts: TOTEM_FIRE },
```

> `TOTEM_FIRE` = body + shadow face + `glow` (gold) eye — a lightning-charged stone idol reads fine in gold; if the user prefers an electric eye, swap to a `TOTEM_STORM = [{name:'totem_body'},{name:'totem_face',palette:'shadow'},{name:'totem_eye',palette:'wispglow'}]` with a `wispglow` palette (`derivePalette(0xffee58,{outline:0x9e7a00})`). Decide at review.

- [ ] **Step 2: Forge test green** — `node --test tests/sprites/recipes.test.js` → PASS.

- [ ] **Step 3: Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=fuego_fatuo,espiritu_tormenta,centinela_piedra,gargola_pararrayos`; screenshot; present; wait for approval; iterate.

- [ ] **Step 4: Remove `geometric: true`** from the 4 defs (enemies/air.js); relax assertions.

- [ ] **Step 5: Full suite green + commit**

```
node --test
git add src/data/sprites/recipes.js src/data/enemies/air.js tests/
git commit -m "feat(air-sprites): wisps + stone sentinels (reuse blob/totem), drop geometric"
```

> After Task 6, all reuse-only creatures are spritted. Remaining: the ~5 new-art silhouettes (Tasks 7–10).

---

## Task 7: Lote B1 — Bat (Murciélago, Vampiro Alado) — new art

**Files:**
- Create: `tools/gen-bat.mjs`
- Modify: `src/data/sprites/parts.js` (splice emitted parts), `src/data/sprites/recipes.js`, `src/data/enemies/air.js`

A new bat silhouette: small body + two membranous wings + glowing eyes, authored as role-tagged grids by a generator following the `tools/gen-winged.mjs` pattern (disk/line/blob helpers, `emit(name, prettyName)` prints a part object to stdout to splice into `parts.js`). Vampiro Alado reuses the same parts at a larger `size` with a blood baseColor.

**Interfaces:**
- Consumes: the `emit` pattern from `gen-winged.mjs`.
- Produces: parts `bat_wings`, `bat_body`, `bat_eyes`; recipes `murcielago`, `vampiro_alado`.

- [ ] **Step 1: Author `tools/gen-bat.mjs`**

Model it on `tools/gen-winged.mjs`: a 32-grid, `put/disk/line/blob` helpers, three layers (`bat_wings`, `bat_body`, `bat_eyes`), composing a front-facing bat — a small rounded body (`blob`), two scalloped wings spanning outward from the shoulders (`line`/`blob` with `o` edges, `b` membrane, `s`/`h` for depth), two `h` glowing eyes. End with `emit('wings','bat_wings'); emit('body','bat_body'); emit('eyes','bat_eyes');` (the emit function from gen-winged, copied in). Run `node tools/gen-bat.mjs` and capture stdout.

> The exact pixel composition is hand-authored art — iterate it visually in Step 4. Keep wings within the 32 grid; anchor will be auto-computed by `emit` from the min/max populated cells.

- [ ] **Step 2: Splice parts into `parts.js`** — paste the three emitted `bat_*: { res:32, w, h, anchor, down, up, side }` blocks into the `PARTS` object in `src/data/sprites/parts.js`.

- [ ] **Step 3: Add recipes** — recipes.js:

```js
// Bat: membranous wings + small body + glowing eyes. Serves the swarm bat, the
// heavy winged vampire, and Galahad's giant-bat form (different size/baseColor).
const BAT = [{ name: 'bat_wings' }, { name: 'bat_body' }, { name: 'bat_eyes', palette: 'glow' }];
```
```js
  // --- Air winged (new art) ---
  murcielago:    { archetype: 'floating', size: 32, baseColor: 0x6a1b9a, parts: BAT },
  vampiro_alado: { archetype: 'floating', size: 64, baseColor: 0xb71c1c, parts: BAT },
```

- [ ] **Step 4: Forge test + Review gate (Playwright) — USER APPROVAL REQUIRED**

`node --test tests/sprites/recipes.test.js` → PASS (forges without throwing). Then serve, `?keys=murcielago,vampiro_alado`, Playwright screenshot, present. **This is the first new-art review — expect iteration:** adjust `gen-bat.mjs`, re-run, re-splice, re-screenshot until the user approves the bat silhouette.

- [ ] **Step 5: Remove `geometric: true`** from `murcielago`, `vampiro_alado` (enemies/air.js); relax assertions.

- [ ] **Step 6: Full suite green + commit**

```
node --test
git add tools/gen-bat.mjs src/data/sprites/parts.js src/data/sprites/recipes.js src/data/enemies/air.js tests/
git commit -m "feat(air-sprites): bat art (Murciélago, Vampiro Alado), drop geometric"
```

---

## Task 8: Lote B2 — Harpy + Whirlwind (Arpía, Torbellino Errante) — new art

**Files:**
- Create: `tools/gen-harpy.mjs`, `tools/gen-whirlwind.mjs`
- Modify: `src/data/sprites/parts.js`, `src/data/sprites/recipes.js`, `src/data/enemies/air.js`

Harpy = winged humanoid (feathered wings + torso + clawed legs + eyes). Whirlwind = a spiral of wind (concentric swept arcs, mostly `b`/`h` with `o` edges, faint center), an ambient hazard.

**Interfaces:**
- Produces: parts `harpy_wings/harpy_body/harpy_eyes`, `whirl_body`; recipes `arpia`, `torbellino_errante`.

- [ ] **Step 1: Author `tools/gen-harpy.mjs`** (model on gen-winged): layers `harpy_wings`, `harpy_body`, `harpy_eyes`; emit as `harpy_*`. Run and capture.

- [ ] **Step 2: Author `tools/gen-whirlwind.mjs`**: a single `whirl_body` layer — draw 2–3 swept spiral arcs (use `line` along a parametric spiral, `o` outer, `b`/`h` inner) leaving a faint center; emit `whirl_body`. Run and capture.

- [ ] **Step 3: Splice parts into `parts.js`** — paste `harpy_*` and `whirl_body` blocks into `PARTS`.

- [ ] **Step 4: Add recipes** — recipes.js:

```js
const HARPY = [{ name: 'harpy_wings' }, { name: 'harpy_body' }, { name: 'harpy_eyes', palette: 'glow' }];
const WHIRL = [{ name: 'whirl_body' }];
```
```js
  arpia:             { archetype: 'floating', size: 32, baseColor: 0x8e24aa, parts: HARPY },
  torbellino_errante:{ archetype: 'blob',     size: 32, baseColor: 0xb0bec5, parts: WHIRL },
```

- [ ] **Step 5: Forge test + Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=arpia,torbellino_errante`; screenshot; present; iterate on the gen scripts until approved.

- [ ] **Step 6: Remove `geometric: true`** from `arpia`, `torbellino_errante` (enemies/air.js); relax assertions.

- [ ] **Step 7: Full suite green + commit**

```
node --test
git add tools/gen-harpy.mjs tools/gen-whirlwind.mjs src/data/sprites/parts.js src/data/sprites/recipes.js src/data/enemies/air.js tests/
git commit -m "feat(air-sprites): harpy + whirlwind art, drop geometric"
```

---

## Task 9: Lote C1 — Elemental de Tormenta (storm-cloud boss) — new art

**Files:**
- Create: `tools/gen-stormelem.mjs`
- Modify: `src/data/sprites/parts.js`, `src/data/sprites/recipes.js`, `src/data/bosses/air.js`

The nv6 setpiece: a roiling black storm cloud with lightning veins and a glaring eye, authored large (the def renders oversized, size 96). Body = dark cloud (`stormDark`), lightning veins = an electric accent, eye = glow/electric.

**Interfaces:**
- Produces: parts `storm_body`, `storm_bolts`, `storm_eye`; recipe `elemental_tormenta`.

- [ ] **Step 1: Author `tools/gen-stormelem.mjs`** (model on gen-blob/gen-winged): layers `storm_body` (lumpy cloud via overlapping `blob`s, `o` rim), `storm_bolts` (a few `line` zig-zags tagged `a`/`h` for lightning), `storm_eye` (one `h` glaring eye). Emit `storm_*`. Run and capture.

- [ ] **Step 2: Splice parts into `parts.js`**.

- [ ] **Step 3: Add recipe** — recipes.js:

```js
const STORM_ELEM = [{ name: 'storm_body' }, { name: 'storm_bolts', palette: 'wispglow' }, { name: 'storm_eye', palette: 'glow' }];
```
```js
  elemental_tormenta: { archetype: 'boss', size: 96, baseColor: 0x37474f, parts: STORM_ELEM },
```

> If `wispglow` was not added in Task 6, add it to `palettes.js`: `wispglow: derivePalette(0xffee58, { outline: 0x9e7a00 })`.

- [ ] **Step 4: Forge test + Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=elemental_tormenta`; screenshot; present; iterate. (Recall the def already oversizes its display in-game; the preview shows the 32-grid art that gets scaled.)

- [ ] **Step 5: Remove `geometric: true`** from `ELEMENTAL_TORMENTA` (bosses/air.js); relax assertions.

- [ ] **Step 6: Full suite green + commit**

```
node --test
git add tools/gen-stormelem.mjs src/data/sprites/ src/data/bosses/air.js tests/
git commit -m "feat(air-sprites): Elemental de Tormenta storm-cloud art, drop geometric"
```

---

## Task 10: Lote C2 — Galahad's 5 forms — finish the world

**Files:**
- Modify: `src/data/sprites/recipes.js`, `src/data/bosses/air.js`
- Test: `tests/sprites/recipes.test.js` (add Galahad forms to the per-boss recipe list)

Galahad's human forms (humano/rage/rage×2/final) reuse `KNIGHT` (he is the Grail knight), recolored across a blood→fury palette ramp; his giant-bat form reuses the `BAT` parts at boss size. This is the climax — review carefully.

**Interfaces:**
- Consumes: `KNIGHT`, `BAT` (from Task 7); blood/fury baseColors.
- Produces: recipes `galahad_humano`, `galahad_rage`, `galahad_rage2`, `galahad_murcielago`, `galahad_final`.

- [ ] **Step 1: Add the 5 form recipes** — recipes.js Air section:

```js
  // --- Galahad (Grail knight) — 4 human forms reuse KNIGHT, bat form reuses BAT ---
  galahad_humano:     { archetype: 'boss', size: 96, baseColor: 0x9aa6b2, accent: 0xffd54f, parts: KNIGHT },
  galahad_rage:       { archetype: 'boss', size: 96, baseColor: 0xb71c1c, accent: 0xffd54f, parts: KNIGHT },
  galahad_rage2:      { archetype: 'boss', size: 96, baseColor: 0x7f0000, accent: 0xff5252, parts: KNIGHT },
  galahad_murcielago: { archetype: 'boss', size: 96, baseColor: 0x4a148c, parts: BAT },
  galahad_final:      { archetype: 'boss', size: 96, baseColor: 0xcdbfc9, accent: 0xffd54f, parts: KNIGHT },
```

> Pale steel human → blood rage → dark-red fury (rage×2) → purple giant bat → ashen final. `accent` gold (paladin trim) fades; `BAT` is defined in Task 7 (this task depends on Task 7).

- [ ] **Step 2: Add Galahad forms to the per-boss recipe test** — in `tests/sprites/recipes.test.js`, add an Air-boss test mirroring the water one:

```js
test('every air boss + form has a recipe with a forgeable base', () => {
  const keys = ['caballero_sangre','bruja_vendaval','elemental_tormenta','lider_cultista',
    'galahad_humano','galahad_rage','galahad_rage2','galahad_murcielago','galahad_final'];
  for (const key of keys) {
    assert.ok(hasRecipe(key), `air boss '${key}' has no recipe`);
    const r = getRecipe(key);
    for (const ref of r.parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

- [ ] **Step 3: Forge test green** — `node --test tests/sprites/recipes.test.js` → PASS (new air-boss test + `every recipe forges`).

- [ ] **Step 4: Review gate (Playwright) — USER APPROVAL REQUIRED** — `?keys=galahad_humano,galahad_rage,galahad_rage2,galahad_murcielago,galahad_final`; screenshot; present; iterate on the palette ramp until approved.

- [ ] **Step 5: Remove `geometric: true`** from `GALAHAD` and all 5 form defs (bosses/air.js). At this point NO Air def should retain `geometric: true`.

- [ ] **Step 6: Final verification + commit**

Run: `node --test` → expect green.
Confirm no Air `geometric` flags remain:
```
grep -rn "geometric: true" src/data/enemies/air.js src/data/bosses/air.js   # expect: no matches
```
Open `http://localhost:8000/tools/sprite-preview.html` (full list) — all 29 keys forged, none "(no recipe)".

```
git add src/data/sprites/recipes.js src/data/bosses/air.js tests/sprites/recipes.test.js
git commit -m "feat(air-sprites): Galahad 5 forms, drop geometric — Air world fully spritted"
```

---

## Done

After Task 10, every Air creature has a reviewed sprite, no `geometric: true` remains in the Air defs, and the `recipes.test.js` GLOBAL invariant guards the world with no Air exemptions. The preview page stays in `tools/` for future art review. Whole-branch review then finishing-a-development-branch.
