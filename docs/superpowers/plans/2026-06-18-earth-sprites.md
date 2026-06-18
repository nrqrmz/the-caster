# Sprites del Mundo de Tierra (El Jardín de Circe) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar sprites pixel-art 32×32 a las 31 texturas de Tierra (22 criaturas + 8 formas de jefe que renderizan), retirando `geometric: true` lote a lote, con revisión visual del usuario vía Playwright antes de aprobar cada lote.

**Architecture:** Reusa el pipeline puro `SpriteForge` + `parts.js` + `recipes.js` + `palettes.js` + `tools/gen-*.mjs`. Cada criatura nueva: un script `gen-*.mjs` autora las partes (rejilla de roles → bloque PARTS por stdout), se splicea en `parts.js`, se añade su entrada en `recipes.js`, y se valida con `node --test tests/sprites/recipes.test.js` (integridad + forja sin tirar). El humano cautivo reusa partes humanas existentes. Tras la aprobación del usuario se retira `geometric: true` del def, lo que activa el invariante GLOBAL (el runtime cambia a sprite vía `hasRecipe`).

**Tech Stack:** ES modules nativos (sin build/bundler), Node `node:test`, scripts `gen-*.mjs` (Node puro), `tools/sprite-preview.html` (forja en canvas para revisión), Playwright para capturar el preview.

## Global Constraints

- **Sin build / sin bundler.** Módulos ES nativos. Los `gen-*.mjs` corren con `node tools/gen-X.mjs` y emiten texto a stdout; NO se importan al runtime del juego.
- **Mobile-only, portrait, 480×854.** No tocar `config.js` salvo paletas (`palettes.js`) — los `COLORS` de Tierra ya existen.
- **Lógica de Tierra intocable.** El ÚNICO cambio a `src/data/enemies/earth.js` y `src/data/bosses/earth.js` es **retirar la línea `geometric: true,`** del def cuyo sprite ya fue aprobado. Nada de balance/oleadas/fases/mecánicas.
- **Claves de textura centralizadas.** Nunca inlinear claves; las recetas usan el `key` del def. `recipes.js` usa hex crudo para `baseColor` (estilo existente del archivo), con comentario nombrando la clave `COLORS` equivalente.
- **Regla dura de revisión.** Ningún sprite se da por bueno sin captura de Playwright aprobada por el usuario. Se itera el pixel-art contra esa captura hasta el OK; recién entonces cae `geometric: true`.
- **Roles de pixel:** `'.'`=transparente `o`=outline `b`=base `s`=shade `h`=highlight `a`=accent. Las paletas tienen 5 roles (`outline/base/shade/highlight/accent`).
- **Claves `COLORS` de Tierra (ya en `config.js`):** `barkBrown 0x6d4c41`, `mossGreen 0x558b2f`, `stoneGrey 0x9e9e9e`, `mudBrown 0x795548`, `vineGreen 0x33691e`, `sporeViolet 0x8e24aa`, `fleshPale 0xe0c0a0`, `beastFur 0x5d4037`.

---

## Scaffold compartido de los `gen-*.mjs`

**Todos** los scripts `gen-*.mjs` de este plan empiezan con este boilerplate (copiado verbatim de `tools/gen-harpy.mjs:15-44` y `182-198`). NO se repite en cada tarea; cada tarea sólo describe las CAPAS y sus formas/roles. Manténlo idéntico salvo `N`/`cx` si el lienzo no es 32.

```js
const N = 32, cx = 16;
const layers = { /* una clave por parte, p.ej. wolf_body: {}, wolf_head: {} */ };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
};
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.80) r = 'o';
      else if ((x - cx0) / rx + (y - cy0) / ry < -0.55) r = 'h';
      else if ((x - cx0) / rx + (y - cy0) / ry > 0.6) r = 's';
      put(L, x, y, r);
    }
}
// ... CAPAS de la criatura aquí (describir por tarea) ...
function emit(name) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
emit('wolf_body'); /* ... un emit por parte ... */
```

**Flujo de autoría por criatura (lo mismo en cada tarea de arte):**
1. Escribir `tools/gen-X.mjs` (scaffold + capas).
2. `node tools/gen-X.mjs` → copiar el stdout y **pegarlo dentro del objeto `PARTS` de `src/data/sprites/parts.js`** (al final, antes del `};` de cierre).
3. Añadir el part-list `const` y la entrada en `RECIPES` de `src/data/sprites/recipes.js`.
4. `node --test tests/sprites/recipes.test.js` → verde (integridad + forja sin tirar; `geometric:true` aún protege el GLOBAL).
5. Servir + Playwright captura el preview → **el usuario revisa**. Si pide cambios: ajustar el gen, re-emitir, re-pegar, repetir 4–5.
6. Al aprobar el lote: retirar `geometric: true` de esos defs.
7. `node --test` (suite completa) → verde. Commit.

---

## Estructura de archivos

- **Crear:** `tools/gen-wolf.mjs`, `gen-werewolf.mjs`, `gen-boar.mjs`, `gen-bear.mjs`, `gen-mushroom.mjs`, `gen-bramble.mjs`, `gen-flower.mjs`, `gen-pixie.mjs`, `gen-goblin.mjs`, `gen-golem.mjs`, `gen-thorntotem.mjs`, `gen-alphawolf.mjs`, `gen-lelaps.mjs`, `gen-hunter.mjs`, `gen-feline.mjs`, `gen-dryad.mjs`, `gen-ent.mjs`, `gen-griffin.mjs`, `gen-circe.mjs` (dev tools, Node puro).
- **Modificar:**
  - `tools/sprite-preview.html` — lista `KEYS` por defecto y título a Tierra (Task 0).
  - `src/data/sprites/parts.js` — partes nuevas spliceadas (un bloque por gen).
  - `src/data/sprites/recipes.js` — part-list `const`s + entradas en `RECIPES`.
  - `src/data/sprites/palettes.js` — paletas nombradas nuevas (`petrified`, `sporeglow`).
  - `src/data/enemies/earth.js`, `src/data/bosses/earth.js` — retirar `geometric: true` por lote.
  - `tests/sprites/recipes.test.js` — test por-jefe de Tierra + invariante "cero geometric en Tierra".

---

## Task 0: Lote 0 — Preview de Tierra + paletas base

**Files:**
- Modify: `tools/sprite-preview.html:13` (título) y `:26-33` (lista `KEYS` por defecto)
- Modify: `src/data/sprites/palettes.js:82` (añadir `petrified`, `sporeglow` antes del `};`)

**Interfaces:**
- Produces: paletas nombradas `petrified`, `sporeglow` y `leafgreen` (consumibles por recetas vía `{ palette: 'petrified' }`). Página de preview que forja cualquier `key` de Tierra y acepta `?keys=a,b,c`.

- [ ] **Step 1: Añadir las paletas nuevas a `palettes.js`**

Insertar dentro de `NAMED_PALETTES` (antes de la línea `};` final, `palettes.js:82`):

```js
  // Earth — petrified stone-grey (Lélaps petrificado, acentos pétreos de gólems).
  petrified: derivePalette(0x8a8a8a, { base: 0x9e9e9e, highlight: 0xd0d0d0, shade: 0x5e5e5e, outline: 0x2a2a2a }),
  // Earth — sickly poison/spore glow (ojos, esporas, fauces venenosas) verde-lima.
  sporeglow: derivePalette(0xaed581, { base: 0xaed581, highlight: 0xe6ffcc, shade: 0x689f38, outline: 0x33691e }),
  // Earth — follaje (copa del Ent, pelo/hojas de la Dríada) verde hoja distinto del cuerpo.
  leafgreen: derivePalette(0x4a8a2a, { base: 0x4a8a2a, highlight: 0x8bc34a, shade: 0x2e5a18, outline: 0x14300a }),
```

- [ ] **Step 2: Actualizar la página de preview a Tierra**

En `tools/sprite-preview.html`, cambiar el `<h1>` (línea 13) `Air sprite preview` por `Earth sprite preview`, y reemplazar el array por defecto de `KEYS` (líneas 26-33) por:

```js
const KEYS = new URLSearchParams(location.search).get('keys')?.split(',') ?? [
  'naufrago_encantado','acolito_cautivo','sierva_jardin','ninfa_transmutadora','fuego_fatuo_pantano',
  'lobo','hombre_lobo','jabali','oso_jardin',
  'hongo_esporario','brote_pustula','zarza_estranguladora','enredadera_reptante','enredadera_cria','flor_carnivora','pixie','duende_ladron',
  'golem_lodo','golem_lodo_cria','golem_piedra','coloso_musgoso','totem_espinas',
  'senor_lobo','lelaps','cefalo_humano','cefalo_felino','driada','ent_guardian','grifo','circe',
];
```

- [ ] **Step 3: Verificar que las paletas forjan (suite verde, sin recetas nuevas aún)**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS (las paletas nuevas no rompen nada; aún no las referencia ninguna receta).

- [ ] **Step 4: Smoke-test del preview con una receta existente**

Run: `python3 -m http.server 8000` (en background) y con Playwright navegar a `http://localhost:8000/tools/sprite-preview.html?keys=acolito_brasa` — capturar screenshot.
Expected: se ve el sprite forjado de `acolito_brasa` (valida que el pipeline de preview funciona antes de autorar Tierra). Las claves de Tierra mostrarán "(no recipe)" — correcto a esta altura.

- [ ] **Step 5: Commit**

```bash
git add tools/sprite-preview.html src/data/sprites/palettes.js
git commit -m "feat(earth-sprites): preview de Tierra + paletas petrified/sporeglow"
```

---

## Task 1: Lote A — Humanos cautivos + reuso (sin arte nuevo)

**Files:**
- Modify: `src/data/sprites/recipes.js` (añadir entradas en `RECIPES`, sección nueva "Earth")
- Modify: `src/data/enemies/earth.js` (retirar `geometric: true` de los 5 defs tras aprobación)
- Test: `tests/sprites/recipes.test.js`

**Interfaces:**
- Consumes: part-lists existentes `VILLAGER`, `MAGE_ARCHER`, `MAGE_CASTER`, `BRASA` (de `recipes.js`).
- Produces: recetas `naufrago_encantado`, `acolito_cautivo`, `sierva_jardin`, `ninfa_transmutadora`, `fuego_fatuo_pantano`.

- [ ] **Step 1: Añadir las 5 recetas de reuso a `recipes.js`**

Al final de `RECIPES` (antes del `};` de cierre, `recipes.js:421`), añadir:

```js
  // --- Earth: humanos cautivos + fodder de reuso (El Jardín de Circe) ---
  // Cautivos = humanos comunes (paleta carne pálida "encantada"); su transmute a bestia es la mecánica firma.
  naufrago_encantado:  { archetype: 'humanoid', size: 32, baseColor: 0xe0c0a0, parts: VILLAGER('hair') },      // fleshPale
  acolito_cautivo:     { archetype: 'humanoid', size: 32, baseColor: 0xe0c0a0, parts: MAGE_ARCHER },           // fleshPale, dispara
  sierva_jardin:       { archetype: 'humanoid', size: 32, baseColor: 0xe0c0a0, parts: VILLAGER('blondhair') }, // fleshPale, huye
  ninfa_transmutadora: { archetype: 'humanoid', size: 32, baseColor: 0x8e24aa, parts: MAGE_CASTER('blackhair') }, // sporeViolet
  fuego_fatuo_pantano: { archetype: 'blob',     size: 32, baseColor: 0x558b2f, parts: BRASA },                 // mossGreen wisp
```

- [ ] **Step 2: Correr el test — debe pasar (integridad + forja)**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS. Los 5 keys forjan; el GLOBAL aún los exime (siguen con `geometric:true`).

- [ ] **Step 3: Servir + Playwright captura el lote para revisión**

Run: servir y Playwright a `http://localhost:8000/tools/sprite-preview.html?keys=naufrago_encantado,acolito_cautivo,sierva_jardin,ninfa_transmutadora,fuego_fatuo_pantano` — screenshot.
Expected: 5 sprites forjados (humanos pálidos + ninfa violeta + wisp verde). **Esperar OK del usuario.** Si pide cambios (p.ej. otra paleta de pelo), ajustar la receta y repetir Steps 2–3.

- [ ] **Step 4: Tras aprobación — retirar `geometric: true` de los 5 defs**

En `src/data/enemies/earth.js`, borrar la línea `geometric: true,` de: `naufrago_encantado`, `acolito_cautivo`, `sierva_jardin`, `ninfa_transmutadora`, `fuego_fatuo_pantano`.

- [ ] **Step 5: Correr la suite completa — el GLOBAL ahora exige y encuentra estas recetas**

Run: `node --test`
Expected: PASS (sin `missing` en el invariante GLOBAL para estos 5).

- [ ] **Step 6: Commit**

```bash
git add src/data/sprites/recipes.js src/data/enemies/earth.js
git commit -m "feat(earth-sprites): Lote A — cautivos + ninfa + wisp (reuso humano)"
```

---

## Task 2: Lote B — Bestias fodder (lobo, hombre_lobo, jabalí, oso)

**Files:**
- Create: `tools/gen-wolf.mjs`, `tools/gen-werewolf.mjs`, `tools/gen-boar.mjs`, `tools/gen-bear.mjs`
- Modify: `src/data/sprites/parts.js` (4 bloques de partes), `src/data/sprites/recipes.js` (4 part-lists + 4 recetas), `src/data/enemies/earth.js` (retirar 4 `geometric`)

**Interfaces:**
- Produces: partes `wolf_*`, `werewolf_*`, `boar_*`, `bear_*`; part-lists `WOLF/WEREWOLF/BOAR/BEAR`; recetas `lobo/hombre_lobo/jabali/oso_jardin`.

- [ ] **Step 1: Autorar `gen-wolf.mjs` (cuadrúpedo cánido, lateral)**

Usar el scaffold compartido. Capas (silueta de lobo de perfil, mirando a la derecha; `flip:true` en receta da el otro lado):
- `wolf_body` — torso alargado horizontal `blob('wolf_body', 14, 18, 7, 3.5)`, lomo en `h`, vientre en `s`; cuello que sube hacia la cabeza; cola tupida hacia atrás (líneas desde `(7,17)` a `(4,14)`).
- `wolf_legs` — 4 patas: dos delanteras `(11..12, 21..26)`, dos traseras `(18..19, 21..26)`, en `b` con `o` en las pezuñas (y=26).
- `wolf_head` — cabeza con hocico apuntando a la derecha en `(23,16)`, orejas triangulares en punta arriba `(21,12)` y `(24,12)`.
- `wolf_eyes` — un ojo en `(23,15)` (palette `glow`).

Emitir las 4 partes. `node tools/gen-wolf.mjs`, pegar en `parts.js`.

- [ ] **Step 2: Autorar `gen-werewolf.mjs` (licántropo bípedo, frontal)**

Capas (hombre-lobo erguido, hombros anchos, brazos con garras):
- `werewolf_body` — torso bípedo musculoso `blob(cx,16,4,5)`, piernas digitígradas cortas `(13..14 y 18..19, 22..28)`, brazos colgando con garras `o` en `(10,20)` y `(22,20)`.
- `werewolf_head` — cabeza lobuna en alto `(cx,9)` con hocico saliente hacia abajo-frente, orejas en punta `(cx-3,4)`/`(cx+3,4)`, fauces con colmillos `o`.
- `werewolf_eyes` — dos ojos `(cx-2,8)`/`(cx+2,8)` (palette `glow`).

- [ ] **Step 3: Autorar `gen-boar.mjs` (jabalí cuadrúpedo, lateral)**

Capas: `boar_body` (torso robusto con joroba de cerdas en `h` sobre el lomo), `boar_legs` (4 patas cortas), `boar_head` (morro con dos colmillos `o` curvos hacia arriba en palette `bone`, vía part-ref `{ name:'boar_tusks', palette:'bone' }`), `boar_eyes` (1 ojo `glow`). Emitir 4 partes (`boar_body/boar_legs/boar_head/boar_tusks`) + ojo.

- [ ] **Step 4: Autorar `gen-bear.mjs` (oso grande cuadrúpedo, lateral, lienzo 32)**

Capas: `bear_body` (masa grande `blob(15,17,8,5)`), `bear_legs` (4 patas gruesas con garras `o`), `bear_head` (cabeza redonda con hocico corto y orejas redondas `disk`), `bear_eyes` (`glow`). El tamaño visual lo da `size:64` en la receta.

- [ ] **Step 5: Pegar las 4 salidas en `parts.js` y añadir part-lists + recetas en `recipes.js`**

En `recipes.js`, junto a la sección Earth, añadir los part-lists:

```js
const WOLF     = [{ name: 'wolf_body' }, { name: 'wolf_legs' }, { name: 'wolf_head' }, { name: 'wolf_eyes', palette: 'glow' }];
const WEREWOLF = [{ name: 'werewolf_body' }, { name: 'werewolf_head' }, { name: 'werewolf_eyes', palette: 'glow' }];
const BOAR     = [{ name: 'boar_body' }, { name: 'boar_legs' }, { name: 'boar_head' }, { name: 'boar_tusks', palette: 'bone' }, { name: 'boar_eyes', palette: 'glow' }];
const BEAR     = [{ name: 'bear_body' }, { name: 'bear_legs' }, { name: 'bear_head' }, { name: 'bear_eyes', palette: 'glow' }];
```

Y las recetas:

```js
  lobo:       { archetype: 'beast', size: 64, baseColor: 0x5d4037, parts: WOLF, flip: true },     // beastFur
  hombre_lobo:{ archetype: 'beast', size: 64, baseColor: 0x5d4037, parts: WEREWOLF },             // beastFur (bípedo, sin flip)
  jabali:     { archetype: 'beast', size: 64, baseColor: 0x795548, parts: BOAR, flip: true },     // mudBrown
  oso_jardin: { archetype: 'beast', size: 64, baseColor: 0x5d4037, parts: BEAR, flip: true },     // beastFur
```

- [ ] **Step 6: Correr el test de recetas (integridad + forja)**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS (las 4 partes existen y forjan). Si falla con "unknown part", revisar que el bloque pegado en `parts.js` use los nombres exactos del part-list.

- [ ] **Step 7: Servir + Playwright captura — revisión del usuario**

Playwright a `...?keys=lobo,hombre_lobo,jabali,oso_jardin` — screenshot. **Esperar OK.** Iterar el pixel-art (ajustar gen → re-emitir → re-pegar → Step 6) hasta aprobación.

- [ ] **Step 8: Tras aprobación — retirar `geometric: true` de los 4 defs en `earth.js` y correr la suite**

Run: `node --test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add tools/gen-wolf.mjs tools/gen-werewolf.mjs tools/gen-boar.mjs tools/gen-bear.mjs src/data/sprites/parts.js src/data/sprites/recipes.js src/data/enemies/earth.js
git commit -m "feat(earth-sprites): Lote B — bestias (lobo, hombre-lobo, jabalí, oso)"
```

---

## Task 3: Lote C — Flora + fey

**Files:**
- Create: `tools/gen-mushroom.mjs`, `tools/gen-bramble.mjs`, `tools/gen-flower.mjs`, `tools/gen-pixie.mjs`, `tools/gen-goblin.mjs`
- Modify: `parts.js`, `recipes.js`, `src/data/enemies/earth.js`

**Interfaces:**
- Produces: partes `mush_*`, `bramble_*`, `flower_*`, `pixie_*`, `goblin_*`; recetas `hongo_esporario`, `brote_pustula`, `zarza_estranguladora`, `enredadera_reptante`, `enredadera_cria`, `flor_carnivora`, `pixie`, `duende_ladron`.

- [ ] **Step 1: `gen-mushroom.mjs` — hongo con sombrero (sirve hongo + pustula por recolor)**

Capas: `mush_cap` (sombrero `blob(cx,12,7,4)` con manchas `h`/`s`), `mush_stem` (tallo `(cx-2..cx+2, 16..26)`), `mush_spores` (4-6 puntos de esporas flotando sobre el sombrero, palette `sporeglow`). Emitir 3 partes.

- [ ] **Step 2: `gen-bramble.mjs` — zarza espinosa (sirve zarza + enredadera + cría)**

Capas: `bramble_body` (maraña de tallos: varias `line` entrelazadas desde la base hacia arriba), `bramble_thorns` (espinas `o` salientes a lo largo de los tallos), `bramble_eyes` (2 ojos `glow` ocultos entre la maraña, opcional). Emitir 3 partes.

- [ ] **Step 3: `gen-flower.mjs` — flor carnívora (fauces)**

Capas: `flower_stem` (tallo verde), `flower_head` (cabeza-fauce abierta `blob(cx,11,6,5)` con borde `o`), `flower_maw` (interior rojo/púrpura `s` + dientes `o` arriba y abajo), `flower_eyes` (palette `sporeglow`). Emitir 4 partes.

- [ ] **Step 4: `gen-pixie.mjs` — hada alada diminuta (frontal)**

Capas: `pixie_wings` (dos alas translúcidas tipo libélula detrás, `blob` finos), `pixie_body` (cuerpecito humanoide pequeño `blob(cx,16,2,3)`), `pixie_glow` (aura/destello palette `sporeglow`). Emitir 3 partes.

- [ ] **Step 5: `gen-goblin.mjs` — trasgo ladrón pequeño (frontal humanoide)**

Capas: `goblin_body` (cuerpo pequeño encorvado, túnica), `goblin_head` (cabeza grande con orejas puntiagudas largas a los lados, nariz ganchuda), `goblin_eyes` (palette `glow`). Emitir 3 partes.

- [ ] **Step 6: Pegar salidas en `parts.js`; añadir part-lists + recetas en `recipes.js`**

```js
const MUSHROOM = [{ name: 'mush_stem' }, { name: 'mush_cap' }, { name: 'mush_spores', palette: 'sporeglow' }];
const BRAMBLE  = [{ name: 'bramble_body' }, { name: 'bramble_thorns', palette: 'bone' }, { name: 'bramble_eyes', palette: 'glow' }];
const FLOWER   = [{ name: 'flower_stem' }, { name: 'flower_head' }, { name: 'flower_maw', palette: 'shadow' }, { name: 'flower_eyes', palette: 'sporeglow' }];
const PIXIE    = [{ name: 'pixie_wings' }, { name: 'pixie_body' }, { name: 'pixie_glow', palette: 'sporeglow' }];
const GOBLIN   = [{ name: 'goblin_body' }, { name: 'goblin_head' }, { name: 'goblin_eyes', palette: 'glow' }];
```

```js
  hongo_esporario:      { archetype: 'blob', size: 32, baseColor: 0x8e24aa, parts: MUSHROOM }, // sporeViolet
  brote_pustula:        { archetype: 'blob', size: 32, baseColor: 0x33691e, parts: MUSHROOM }, // vineGreen recolor
  zarza_estranguladora: { archetype: 'blob', size: 32, baseColor: 0x33691e, parts: BRAMBLE },  // vineGreen
  enredadera_reptante:  { archetype: 'beast', size: 32, baseColor: 0x33691e, parts: BRAMBLE }, // vineGreen (repta)
  enredadera_cria:      { archetype: 'beast', size: 32, baseColor: 0x33691e, parts: BRAMBLE }, // vineGreen, más chica
  flor_carnivora:       { archetype: 'blob', size: 32, baseColor: 0x558b2f, parts: FLOWER },   // mossGreen
  pixie:                { archetype: 'floating', size: 32, baseColor: 0x8e24aa, parts: PIXIE }, // sporeViolet
  duende_ladron:        { archetype: 'humanoid', size: 32, baseColor: 0x558b2f, parts: GOBLIN }, // mossGreen
```

- [ ] **Step 7: Test de recetas → verde**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 8: Servir + Playwright (revisión por sub-familia para legibilidad)**

Capturas: `?keys=hongo_esporario,brote_pustula,zarza_estranguladora,enredadera_reptante,enredadera_cria,flor_carnivora` y luego `?keys=pixie,duende_ladron`. **Esperar OK.** Iterar pixel-art hasta aprobación.

- [ ] **Step 9: Retirar `geometric: true` de los 8 defs + suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add tools/gen-mushroom.mjs tools/gen-bramble.mjs tools/gen-flower.mjs tools/gen-pixie.mjs tools/gen-goblin.mjs src/data/sprites/parts.js src/data/sprites/recipes.js src/data/enemies/earth.js
git commit -m "feat(earth-sprites): Lote C — flora (hongo/zarza/flor) + fey (pixie/duende)"
```

---

## Task 4: Lote D — Gólems y pétreos

**Files:**
- Create: `tools/gen-golem.mjs`, `tools/gen-thorntotem.mjs`
- Modify: `parts.js`, `recipes.js`, `src/data/enemies/earth.js`

**Interfaces:**
- Produces: partes `golem_*`, `thorntotem_*`; recetas `golem_lodo`, `golem_lodo_cria`, `golem_piedra`, `coloso_musgoso`, `totem_espinas`.

- [ ] **Step 1: `gen-golem.mjs` — masa pétrea humanoide (sirve lodo/piedra/coloso por recolor+escala)**

Capas: `golem_body` (torso macizo en bloques `blob(cx,15,6,6)`, hombros anchos, brazos-mazo grandes a los lados `(8,16)` y `(24,16)`, piernas-bloque cortas), `golem_cracks` (grietas internas `s`/`o` por el cuerpo), `golem_eyes` (palette `glow`). Emitir 3 partes.

- [ ] **Step 2: `gen-thorntotem.mjs` — columna tallada con espinas**

Capas: `thorntotem_body` (columna vertical `(cx-4..cx+4, 6..28)` con caras talladas en `s`), `thorntotem_face` (rostro tallado hueco palette `shadow`), `thorntotem_thorns` (espinas `o` saliendo de los lados palette `bone`), `thorntotem_eye` (ojo central palette `sporeglow`). Emitir 4 partes.

- [ ] **Step 3: Pegar salidas; añadir part-lists + recetas en `recipes.js`**

```js
const GOLEM      = [{ name: 'golem_body' }, { name: 'golem_cracks', palette: 'shadow' }, { name: 'golem_eyes', palette: 'glow' }];
const THORNTOTEM = [{ name: 'thorntotem_body' }, { name: 'thorntotem_face', palette: 'shadow' }, { name: 'thorntotem_thorns', palette: 'bone' }, { name: 'thorntotem_eye', palette: 'sporeglow' }];
```

```js
  golem_lodo:      { archetype: 'beast', size: 64, baseColor: 0x795548, parts: GOLEM }, // mudBrown
  golem_lodo_cria: { archetype: 'beast', size: 32, baseColor: 0x795548, parts: GOLEM }, // mudBrown, chico
  golem_piedra:    { archetype: 'beast', size: 64, baseColor: 0x9e9e9e, parts: GOLEM }, // stoneGrey
  coloso_musgoso:  { archetype: 'beast', size: 64, baseColor: 0x558b2f, parts: GOLEM }, // mossGreen (grande)
  totem_espinas:   { archetype: 'floating', size: 64, baseColor: 0x6d4c41, parts: THORNTOTEM }, // barkBrown
```

- [ ] **Step 4: Test de recetas → verde**

Run: `node --test tests/sprites/recipes.test.js`
Expected: PASS.

- [ ] **Step 5: Servir + Playwright captura — revisión**

`?keys=golem_lodo,golem_lodo_cria,golem_piedra,coloso_musgoso,totem_espinas`. **Esperar OK.** Iterar hasta aprobación (verificar que lodo/piedra/musgo se distinguen sólo por color — si el usuario los quiere más distintos, ajustar el gen, pero mantienen silueta por ser chusma).

- [ ] **Step 6: Retirar `geometric: true` de los 5 defs + suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add tools/gen-golem.mjs tools/gen-thorntotem.mjs src/data/sprites/parts.js src/data/sprites/recipes.js src/data/enemies/earth.js
git commit -m "feat(earth-sprites): Lote D — gólems (lodo/piedra/coloso) + tótem de espinas"
```

---

## Task 5: Lote E1 — Jefes bestia (Señor Lobo, Lélaps, Céfalo humano+felino)

**Files:**
- Create: `tools/gen-alphawolf.mjs`, `tools/gen-lelaps.mjs`, `tools/gen-hunter.mjs`, `tools/gen-feline.mjs`
- Modify: `parts.js`, `recipes.js`, `tests/sprites/recipes.test.js` (test por-jefe)

**Interfaces:**
- Produces: partes `alpha_*`, `lelaps_*`, `hunter_*`, `feline_*`; recetas `senor_lobo`, `lelaps`, `cefalo_humano`, `cefalo_felino`. (Los jefes NO llevan `geometric`; el test por-jefe los exige.)

- [ ] **Step 1: `gen-alphawolf.mjs` — Alfa Licántropo (jefe, silueta propia)**

Werewolf alfa imponente: como `WEREWOLF` pero **silueta propia, más masiva** — melena/crin en `h` alrededor del cuello y hombros, cicatrices `o` en el torso, fauces más grandes con colmillos `bone`. Capas: `alpha_body`, `alpha_mane` (crin, palette propia del baseColor), `alpha_head`, `alpha_eyes` (palette `vampglow` — alfa rojo). Emitir 4 partes.

- [ ] **Step 2: `gen-lelaps.mjs` — sabueso mítico (jefe, silueta propia, NO recolor de lobo)**

Sabueso esbelto y atlético "que siempre alcanza": cuerpo más estilizado y largo que el lobo, postura de carrera (patas extendidas), cuello largo, orejas caídas. Capas: `lelaps_body`, `lelaps_legs` (en zancada), `lelaps_head`, `lelaps_eyes` (palette `glow`). Emitir 4 partes.

- [ ] **Step 3: `gen-hunter.mjs` — Céfalo cazador (jefe humano, jabalina madera-y-plata)**

Cazador humano con armadura de cuero: torso humanoide, capa corta de caza, y una **jabalina** (lanza) sostenida en diagonal con punta de plata. Capas: `hunter_body` (cuerpo + cuero), `hunter_head` (cara + pelo), `hunter_javelin` (asta palette `wood` + punta palette `steel` — como part-ref separada `{ name:'hunter_javelin_tip', palette:'steel' }`), `hunter_eyes` opcional. Emitir partes: `hunter_body`, `hunter_head`, `hunter_javelin`, `hunter_javelin_tip`.

- [ ] **Step 4: `gen-feline.mjs` — Céfalo felino (jefe, pantera, cuadrúpedo)**

Gran felino esbelto de perfil: cuerpo musculoso bajo, cola larga curva, cabeza felina con orejas redondeadas. Capas: `feline_body`, `feline_legs`, `feline_head`, `feline_eyes` (palette `glow`). Emitir 4 partes.

- [ ] **Step 5: Pegar salidas; añadir part-lists + recetas en `recipes.js`**

```js
const ALPHAWOLF = [{ name: 'alpha_body' }, { name: 'alpha_mane' }, { name: 'alpha_head' }, { name: 'alpha_eyes', palette: 'vampglow' }];
const LELAPS_P  = [{ name: 'lelaps_body' }, { name: 'lelaps_legs' }, { name: 'lelaps_head' }, { name: 'lelaps_eyes', palette: 'glow' }];
const HUNTER    = [{ name: 'hunter_body' }, { name: 'hunter_head' }, { name: 'hunter_javelin', palette: 'wood' }, { name: 'hunter_javelin_tip', palette: 'steel' }];
const FELINE    = [{ name: 'feline_body' }, { name: 'feline_legs' }, { name: 'feline_head' }, { name: 'feline_eyes', palette: 'glow' }];
```

```js
  // --- Earth bosses (silueta propia por jefe) ---
  senor_lobo:    { archetype: 'boss', size: 96, baseColor: 0x5d4037, parts: ALPHAWOLF },             // beastFur (Alfa Licántropo, nv4)
  lelaps:        { archetype: 'boss', size: 96, baseColor: 0x9e9e9e, parts: LELAPS_P, flip: true },  // stoneGrey (sabueso, nv5)
  cefalo_humano: { archetype: 'boss', size: 96, baseColor: 0x6d4c41, parts: HUNTER },                // barkBrown (cazador, nv5)
  cefalo_felino: { archetype: 'boss', size: 96, baseColor: 0x5d4037, parts: FELINE, flip: true },    // beastFur (pantera, nv5)
```

- [ ] **Step 6: Añadir el test por-jefe de Tierra en `recipes.test.js`**

Tras el bloque `'every air boss + form has a recipe...'`, añadir:

```js
test('every earth boss + form has a recipe with known parts', () => {
  const keys = ['senor_lobo','lelaps','cefalo_humano','cefalo_felino','driada','ent_guardian','grifo','circe'];
  for (const key of keys) {
    assert.ok(hasRecipe(key), `earth boss '${key}' has no recipe`);
    for (const ref of getRecipe(key).parts) {
      const name = typeof ref === 'string' ? ref : ref.name;
      assert.ok(PARTS[name], `recipe '${key}' references unknown part '${name}'`);
    }
  }
});
```

(Este test fallará hasta que existan TODAS las recetas de jefe; las de Dríada/Ent/Grifo/Circe llegan en Tasks 6–8. Es esperado: queda rojo en `driada` hasta Task 6.)

- [ ] **Step 7: Correr el test "every recipe forges" y la integridad (las 4 recetas de este lote)**

Run: `node --test tests/sprites/recipes.test.js --test-name-pattern "every recipe forges|integrity"`
Expected: PASS (las 4 partes forjan). El nuevo test por-jefe quedará rojo hasta Task 8 — eso se gatea en Step 9.

- [ ] **Step 8: Servir + Playwright captura — revisión**

`?keys=senor_lobo,lelaps,cefalo_humano,cefalo_felino`. **Esperar OK.** Iterar hasta aprobación (énfasis: cada jefe debe leerse distinto de su contraparte fodder — alfa con melena vs hombre_lobo; sabueso esbelto vs lobo).

- [ ] **Step 9: Suite completa (el test por-jefe seguirá rojo en driada/ent/grifo/circe — OK hasta Task 8). Commit del lote.**

```bash
git add tools/gen-alphawolf.mjs tools/gen-lelaps.mjs tools/gen-hunter.mjs tools/gen-feline.mjs src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(earth-sprites): Lote E1 — jefes bestia (Señor Lobo, Lélaps, Céfalo h+felino) + test por-jefe"
```

---

## Task 6: Lote E2 — Dríada & Ent

**Files:**
- Create: `tools/gen-dryad.mjs`, `tools/gen-ent.mjs`
- Modify: `parts.js`, `recipes.js`

**Interfaces:**
- Produces: partes `dryad_*`, `ent_*`; recetas `driada`, `ent_guardian`.

- [ ] **Step 1: `gen-dryad.mjs` — mujer-planta hechicera (jefe)**

Hechicera con cuerpo de mujer fundido con planta: torso/vestido de hojas y musgo, pelo de enredaderas, piel de corteza clara, brazos extendidos canalizando curación. Capas: `dryad_body` (vestido-hojas, toma el baseColor), `dryad_skin` (cara/manos palette `skin`), `dryad_hair` (enredaderas palette `leafgreen`), `dryad_bloom` (flor/aura curativa palette `sporeglow`). Emitir 4 partes.

- [ ] **Step 2: `gen-ent.mjs` — árbol guardián gigante (jefe tank)**

Ent enorme: tronco macizo vertical con grietas de corteza, dos brazos-rama nudosos, raíces-pies, copa de hojas arriba, rostro tallado en el tronco. Capas: `ent_trunk` (tronco, toma el baseColor barkBrown), `ent_canopy` (copa de hojas palette `leafgreen`), `ent_face` (rostro tallado palette `shadow`), `ent_eyes` (palette `sporeglow`). Emitir 4 partes.

- [ ] **Step 3: Pegar salidas; añadir part-lists + recetas**

```js
const DRYAD = [{ name: 'dryad_body' }, { name: 'dryad_hair', palette: 'leafgreen' }, { name: 'dryad_skin', palette: 'skin' }, { name: 'dryad_bloom', palette: 'sporeglow' }];
const ENT   = [{ name: 'ent_trunk' }, { name: 'ent_canopy', palette: 'leafgreen' }, { name: 'ent_face', palette: 'shadow' }, { name: 'ent_eyes', palette: 'sporeglow' }];
```

```js
  driada:       { archetype: 'boss', size: 96, baseColor: 0x558b2f, parts: DRYAD }, // mossGreen (nv6)
  ent_guardian: { archetype: 'boss', size: 96, baseColor: 0x6d4c41, parts: ENT },   // barkBrown (nv6 tank)
```

- [ ] **Step 4: Test de recetas (integridad + forja)**

Run: `node --test tests/sprites/recipes.test.js --test-name-pattern "every recipe forges|integrity"`
Expected: PASS.

- [ ] **Step 5: Servir + Playwright captura — revisión**

`?keys=driada,ent_guardian`. **Esperar OK.** Iterar hasta aprobación.

- [ ] **Step 6: Commit**

```bash
git add tools/gen-dryad.mjs tools/gen-ent.mjs src/data/sprites/parts.js src/data/sprites/recipes.js
git commit -m "feat(earth-sprites): Lote E2 — Dríada & Ent"
```

---

## Task 7: Lote E3 — El Grifo

**Files:**
- Create: `tools/gen-griffin.mjs`
- Modify: `parts.js`, `recipes.js`

**Interfaces:**
- Produces: partes `griffin_*`; receta `grifo`.

- [ ] **Step 1: `gen-griffin.mjs` — águila-león alado (jefe nv7)**

Grifo: cuartos delanteros de águila (cabeza con pico, garras de ave), cuartos traseros de león (cuerpo, patas, cola), grandes alas desplegadas detrás. Capas: `griffin_wings` (alas grandes detrás, plumadas tipo `harpy_wings`), `griffin_body` (cuerpo león + pecho de plumas en `h`), `griffin_head` (cabeza de águila con pico `bone`, cresta), `griffin_eyes` (palette `glow`). Emitir 4 partes.

- [ ] **Step 2: Pegar salida; añadir part-list + receta**

```js
const GRIFFIN = [{ name: 'griffin_wings' }, { name: 'griffin_body' }, { name: 'griffin_head' }, { name: 'griffin_eyes', palette: 'glow' }];
```

```js
  grifo: { archetype: 'boss', size: 96, baseColor: 0x6d4c41, parts: GRIFFIN, flip: true }, // barkBrown (nv7 levelboss)
```

- [ ] **Step 3: Test de recetas (integridad + forja)**

Run: `node --test tests/sprites/recipes.test.js --test-name-pattern "every recipe forges|integrity"`
Expected: PASS.

- [ ] **Step 4: Servir + Playwright captura — revisión**

`?keys=grifo`. **Esperar OK.** Iterar hasta aprobación (legibilidad águila-arriba / león-abajo a tamaño jefe).

- [ ] **Step 5: Commit**

```bash
git add tools/gen-griffin.mjs src/data/sprites/parts.js src/data/sprites/recipes.js
git commit -m "feat(earth-sprites): Lote E3 — El Grifo"
```

---

## Task 8: Lote E4 — Circe + cierre del mundo

**Files:**
- Create: `tools/gen-circe.mjs`
- Modify: `parts.js`, `recipes.js`, `tests/sprites/recipes.test.js` (invariante "cero geometric en Tierra")

**Interfaces:**
- Produces: partes `circe_*`; receta `circe`. Cierra el mundo: el test por-jefe (Task 5) pasa entero y se añade el invariante de cero-geometric.

- [ ] **Step 1: `gen-circe.mjs` — reina hechicera (jefe final nv8)**

Circe: hechicera regia de pie, vestido largo, melena oscura, corona/diadema, vara con orbe de transmutación, aura de esporas. Capas: `circe_gown` (vestido palette baseColor sporeViolet), `circe_hair` (melena palette `blackhair`), `circe_skin` (cara/manos palette `skin`), `circe_crown` (diadema palette `glow`), `circe_staff` (vara `wood` + orbe palette `sporeglow` como part-ref `{ name:'circe_orb', palette:'sporeglow' }`). Emitir partes: `circe_gown`, `circe_hair`, `circe_skin`, `circe_crown`, `circe_staff`, `circe_orb`.

- [ ] **Step 2: Pegar salida; añadir part-list + receta**

```js
const CIRCE = [{ name: 'circe_staff', palette: 'wood' }, { name: 'circe_orb', palette: 'sporeglow' }, { name: 'circe_gown' }, { name: 'circe_hair', palette: 'blackhair' }, { name: 'circe_skin', palette: 'skin' }, { name: 'circe_crown', palette: 'glow' }];
```

```js
  circe: { archetype: 'boss', size: 96, baseColor: 0x8e24aa, parts: CIRCE }, // sporeViolet (nv8 templeboss)
```

- [ ] **Step 3: Añadir el invariante "cero geometric en Tierra" en `recipes.test.js`**

Tras el test por-jefe de Tierra, añadir:

```js
import { EARTH_ENEMIES } from '../../src/data/enemies/earth.js';

test('no earth enemy retains geometric:true (world fully spritted)', () => {
  const stillGeometric = Object.keys(EARTH_ENEMIES).filter((k) => EARTH_ENEMIES[k].geometric);
  assert.deepEqual(stillGeometric, [], `earth enemies still geometric: ${stillGeometric.join(', ')}`);
});
```

- [ ] **Step 4: Servir + Playwright captura — revisión de Circe**

`?keys=circe`. **Esperar OK.** Iterar hasta aprobación.

- [ ] **Step 5: Correr la suite COMPLETA — todo debe pasar ahora**

Run: `node --test`
Expected: PASS — incluyendo (a) el test por-jefe de Tierra (8/8 con receta), (b) "no earth enemy retains geometric:true", (c) el GLOBAL sin `missing`, (d) "every recipe forges".
Si "no earth enemy retains geometric" falla, listará los defs cuyo `geometric:true` no se retiró en su lote — volver y borrarlos.

- [ ] **Step 6: Commit**

```bash
git add tools/gen-circe.mjs src/data/sprites/parts.js src/data/sprites/recipes.js tests/sprites/recipes.test.js
git commit -m "feat(earth-sprites): Lote E4 — Circe + invariante cero-geometric (mundo con sprites)"
```

---

## Task 9: Verificación final in-game + cierre

**Files:**
- (Solo verificación; sin cambios salvo fixes que surjan.)

- [ ] **Step 1: Suite completa verde**

Run: `node --test`
Expected: PASS, sin exenciones de Tierra.

- [ ] **Step 2: Smoke visual del preview completo**

Servir y Playwright a `tools/sprite-preview.html` (sin `?keys`, usa el default de Tierra de Task 0) — capturar la rejilla entera (30 sprites). Confirmar `N/N forged` y 0 celdas "(no recipe)".

- [ ] **Step 3: Smoke in-game (opcional, recomendado)**

Servir el juego, entrar a una oleada de Tierra y a un jefe; confirmar que los enemigos ya NO son círculos tintados sino los sprites forjados (vía `hasRecipe` en `Enemy.js`/`GameScene.js`). Capturar screenshot para el usuario.

- [ ] **Step 4: Commit final si hubo fixes**

```bash
git add -A && git commit -m "chore(earth-sprites): verificación final — Tierra 100% con sprites"
```

---

## Notas de ejecución

- **El pixel-art es iterativo bajo la regla de Playwright.** Las formas/coordenadas de cada `gen-*.mjs` en este plan son la **dirección de arte** (capas, silueta, paletas, escala): el detalle fino de píxeles se ajusta contra la captura aprobada por el usuario. No se retira ningún `geometric:true` sin ese OK.
- **DRY:** el scaffold de los `gen-*.mjs` es idéntico; las familias de chusma (golem/hongo/zarza) comparten part-list y se diferencian sólo por `baseColor`/`size` en la receta. Los jefes NO comparten silueta.
- **Orden de jefes y el test por-jefe:** el test por-jefe (Task 5 Step 6) exige los 8 jefes; queda rojo hasta Task 8. Por eso la suite COMPLETA sólo se exige verde en Task 8 Step 5 y Task 9. Tasks 5–7 gatean su verde con `--test-name-pattern "every recipe forges|integrity"`.
- **Reversión segura:** si un sprite se rechaza tras retirar `geometric:true`, se puede re-añadir la línea para volver al placeholder mientras se itera (el GLOBAL vuelve a eximir).
```
