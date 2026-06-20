# Sprites del Mundo de Tierra (El Jardín de Circe) — Documento de Diseño

**Fecha:** 2026-06-18
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Sub-proyecto de arte** del mundo de Tierra (ver `2026-06-17-earth-world-design.md`, ya implementado: PR #31 merged). Reusa el pipeline de sprites del proyecto pixel-art HD (`SpriteForge` + `parts.js` + `recipes.js` + `palettes.js` + `tools/gen-*.mjs`). Espeja el sub-proyecto de Aire (`2026-06-17-air-sprites-design.md`).

---

## 0. Contexto y problema

El mundo de Tierra embarcó **geométrico**: sus 22 criaturas y 9 texturas de jefe llevan `geometric: true` y renderizan con texturas geométricas de fallback (círculos tintados `TEX.villager`/`warrior`/`archer`/`miniboss`/`boss`). El test invariante `recipes.test.js` ("every registered enemy type has a sprite recipe") los exime por ese flag. El resto del juego (Fuego/Agua/Aire) ya usa sprites 32×32 forjados de recetas. **Tierra es el único mundo todavía 100% en placeholders geométricos.** Este sub-proyecto **da sprite a las criaturas de Tierra** y retira `geometric: true` a medida que cada lote se aprueba.

**Regla dura del usuario:** **cada sprite se forja y se muestra al usuario vía Playwright (captura del preview ampliado) antes de aprobarse.** Ningún sprite se da por bueno sin su visto bueno; se itera hasta aprobar.

### Por qué Tierra es distinto a Aire

Aire era casi todo **humanoide** (cultistas, caballeros, vampiros) → reuso pesado de partes humanas existentes (`KNIGHT`, `CULT_HOODED`, `VAMP_GRUNT`) y solo ~5 siluetas nuevas. Tierra es un **bestiario + flora**: lobos, jabalí, oso, hombre-lobo, hongos, zarzas, flores carnívoras, enredaderas, gólems, un Ent (árbol), un Grifo, un felino. Muy pocos humanoides. Eso **invierte la proporción reuso/bespoke**: Tierra necesita ~19 siluetas nuevas.

**Decisión de ambición (aprobada): bespoke máximo.** Cada bestia/planta/gólem tiene su propia silueta real, y **todos los jefes llevan silueta propia bespoke, sin compartir por recolor** (Lélaps, Céfalo humano, Céfalo felino y el Señor Lobo no se reducen a recolores de la chusma). Solo los humanos cautivos reusan partes humanas — y eso no es un compromiso de calidad: *son* humanos, y que se vean humanos refuerza la mecánica firma (el cautivo humano se transmuta en bestia ante los ojos del jugador).

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos. Mobile-only, portrait, 480×854.
- Arte por código: las partes son rejillas de píxeles con roles (`o`/`b`/`s`/`h`/`a`) autoradas por scripts `tools/gen-*.mjs`; `SpriteForge` (puro, `DESIGN=32`) las forja contra paletas. Lógica nunca toca texturas (claves centralizadas en `config.js`).
- **No tocar la lógica del mundo de Tierra** (defs/oleadas/jefes ya implementados y verdes). Solo se retira `geometric: true` de los defs a medida que el sprite correspondiente se aprueba.

### Alcance
Recetas + partes + paletas para las **31 texturas** de Tierra (22 criaturas + 9 texturas de jefe, incluyendo las formas de Céfalo), el **mecanismo de preview** para revisión, y el retiro incremental de `geometric: true`. **Fuera de alcance:** cambios de gameplay/balance; lógica/oleadas/fases (Tierra ya está verde); el bloque petrificado de Lélaps (usa `StaticBlock`, no receta); arte de otros mundos; el Castillo; Nimue/Merlín; animaciones más allá de las que el archetype ya define (idle/walk/attack según el patrón existente).

---

## 1. Mecanismo de revisión (Playwright)

Sin preview visual no se puede cumplir la regla del usuario (hoy los `gen-*.mjs` solo emiten rejillas ASCII de partes; el sprite a color solo se forja en `BootScene` en runtime).

**Página de preview** — `tools/sprite-preview.html` (**ya existe** del sub-proyecto de Aire). Se **extiende** para forjar también **cada receta de Tierra** y dibujarla en una rejilla etiquetada y ampliada (escala ~6–8×, fondo neutro), mostrando los frames por anim (idle/walk/attack) y direcciones que el archetype define. Estática, sin build; se sirve con el mismo `python3 -m http.server`.

**Loop de revisión por criatura:**
1. Autoro/ajusto las recetas (+partes nuevas) de un lote.
2. Sirvo el proyecto; **Playwright** navega a la página de preview y captura screenshot(s) del lote.
3. El usuario revisa los sprites y **aprueba o pide cambios** (itero hasta aprobar).
4. Al aprobar el lote: retiro `geometric: true` de esos defs (el runtime cambia solo a sprite vía `hasRecipe`).

La página de preview es **herramienta de desarrollo** (no entra al juego).

---

## 2. Mapa de reuso vs. arte nuevo

El sistema de recetas recolorea por `baseColor` (`paletteFor` deriva la paleta del color del def, salvo paleta nombrada). Los humanos cautivos son **reuso + recolor** (cero arte nuevo); todo lo demás es bespoke.

### 2.1 Reuso + recolor (sin arte nuevo) — partes existentes
| Criatura | Set de partes reusado | Paleta / baseColor |
|---|---|---|
| naufrago_encantado (cautivo) | `VILLAGER` | `fleshPale` ("encantado") |
| acolito_cautivo (cautivo, dispara) | `MAGE_ARCHER` | `fleshPale` |
| sierva_jardin (cautivo, huye) | `VILLAGER` | `fleshPale` |
| ninfa_transmutadora (fodder élite) | `MAGE_CASTER` | `sporeViolet` |
| fuego_fatuo_pantano (wisp) | `BRASA` / `CENIZA` (blob) | `mossGreen` (glow pantano) |

### 2.2 Arte nuevo bespoke (nuevos `gen-*.mjs` + partes)

**Chusma — 11 siluetas** (consolidación por familia vía recolor+escala permitida, NO son jefes):
| Silueta (`gen-*`) | Sirve a | Notas |
|---|---|---|
| **lobo** (cánido cuadrúpedo) | `lobo` | beast; fur gris-pardo |
| **hombre_lobo** (licántropo bípedo) | `hombre_lobo` | beast/humanoid bípedo |
| **jabali** | `jabali` | beast; colmillos |
| **oso** | `oso_jardin` | beast grande |
| **hongo** | `hongo_esporario` + `brote_pustula` (variante recolor) | estático; sombrero + esporas |
| **zarza/enredadera** | `zarza_estranguladora` + `enredadera_reptante`(+`enredadera_cria` a menor `size`) | enredadera espinosa |
| **flor_carnivora** | `flor_carnivora` | fauces + pétalos |
| **golem** | `golem_lodo`(+`golem_lodo_cria` menor) + `golem_piedra` (recolor `stoneGrey`) + `coloso_musgoso` (recolor `mossGreen`, mayor `size`) | masa pétrea humanoide |
| **totem_espinas** | `totem_espinas` | columna tallada + espinas |
| **pixie** | `pixie` | hada alada diminuta |
| **duende** | `duende_ladron` | trasgo pequeño |

**Jefes — 8 siluetas bespoke propias** (sin recolor-share entre sí):
| Silueta (`gen-*`) | Jefe | Notas |
|---|---|---|
| **senor_lobo** | `senor_lobo` (Alfa Licántropo, nv4) | licántropo alfa; melena/cicatrices que lo distinguen de `hombre_lobo` |
| **lelaps** | `lelaps` (sabueso de Céfalo, nv5) | sabueso mítico "que siempre alcanza"; silueta propia, no recolor de `lobo` |
| **cefalo_humano** | `cefalo` forma 1 (cazador, nv5) | cazador con jabalina/arco madera-y-plata |
| **cefalo_felino** | `cefalo` forma 2 (pantera, nv5) | felino veloz en que Circe lo transmuta |
| **driada** | `driada` (nv6) | mujer-planta hechicera, musgo/corteza |
| **ent_guardian** | `ent` (nv6) | árbol guardián gigante (tank) |
| **grifo** | `grifo` (nv7 levelboss) | águila-león alado |
| **circe** | `circe` (nv8 templeboss) | reina hechicera, esporas/veneno |

**Total:** ~19 siluetas nuevas + 5 reusos. La consolidación por familia solo aplica a chusma (lobo/golem/hongo/zarza); los jefes nunca comparten silueta.

---

## 3. Lotes y orden

Cada lote: autoría → servir → **Playwright captura** → **revisión/aprobación del usuario** → retirar `geometric: true` de esos defs → suite verde.

- **Lote 0 — Preview.** Extender `tools/sprite-preview.html` para forjar las recetas de Tierra; validar con una receta YA existente (p. ej. `acolito_brasa`) antes de autorar nada.
- **Lote A — Humanos/reuso** (cautivos, ninfa, wisp): entradas de receta + paletas, sin arte nuevo.
- **Lote B — Bestias fodder:** lobo, hombre_lobo, jabalí, oso.
- **Lote C — Flora + fey:** hongo(+pustula), zarza/enredadera(+cría), flor carnívora, pixie, duende.
- **Lote D — Gólems/pétreos:** golem (lodo+cría/piedra/coloso musgoso), tótem de espinas.
- **Lote E — Jefes:** senor_lobo, lelaps, cefalo (humano+felino), dríada+ent, grifo, circe.

Lotes grandes (B/E) se sub-dividen por criatura/familia para que las capturas de Playwright sean legibles.

---

## 4. Paletas y arquetipos

- **`baseColor`** de las recetas salen de las claves `COLORS` de Tierra que ya existen en `config.js` (`beastFur`, `mudBrown`, `mossGreen`, `sporeViolet`, `vineGreen`, `barkBrown`, `stoneGrey`, `fleshPale`); `derivePalette` recolorea.
- **Paletas nombradas nuevas** (en `palettes.js`) solo donde haga falta un acento específico, p. ej.:
  - `petrified` — gris piedra para Lélaps petrificado / acentos pétreos.
  - un glow de **veneno** (verde/violeta) para ojos/esporas/fauces si `glow` (dorado) no encaja — puede derivarse de `COLORS.sporeViolet`/`mossGreen`.
  - `fleshPale` "encantado" para la piel de los cautivos.
- **Arquetipos:** se reutilizan los existentes — bestias→`beast`; plantas estáticas→`floating`/`blob` (bob idle, no caminan); gólems/Ent→`boss`/`humanoid`; grifo→`floating`; hechiceras (Dríada/Circe)→`boss`. No se inventan arquetipos nuevos.

---

## 5. Testing y criterio de "aprobado"

- **`recipes.test.js`:** a medida que cae `geometric: true`, la invariante GLOBAL deja de eximir y **exige** receta para esos enemigos → garantiza que no quede ninguno sin sprite por error. `every recipe forges without throwing` (mirror de BootScene) cubre las partes nuevas (parte/role inválido falla en `node --test`, no solo en runtime). Añadir los **8 jefes de Tierra** a la lista explícita del test por-jefe.
- **Forja sin Phaser:** todo el pipeline (`SpriteForge`, recipes, parts, palettes) es puro → `node --test`.
- **Criterio de aprobado por lote:** (1) cada receta forja sin tirar; (2) el usuario aprueba las capturas de Playwright; (3) `geometric: true` retirado de esos defs; (4) suite verde. El mundo entero se considera "con sprites" cuando ningún def de Tierra conserva `geometric: true` y `recipes.test.js` pasa sin exenciones de Tierra.

---

## 6. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `tools/gen-*.mjs` — autoría de las partes nuevas, uno (o pocos) por familia: `gen-wolf`, `gen-werewolf`, `gen-boar`, `gen-bear`, `gen-mushroom`, `gen-bramble`, `gen-flower`, `gen-golem`, `gen-thorntotem`, `gen-pixie`, `gen-goblin`, `gen-lelaps`, `gen-cefalo`, `gen-feline`, `gen-dryad`, `gen-ent`, `gen-griffin`, `gen-circe`, `gen-alphawolf` (nombres orientativos).

**Modificados:**
- `tools/sprite-preview.html` — incluir las recetas de Tierra en la rejilla de preview.
- `src/data/sprites/parts.js` — partes nuevas spliceadas desde los gen.
- `src/data/sprites/recipes.js` — recetas de las 31 texturas de Tierra (reuso + nuevas), con `baseColor`/`palette`/`accent`/`size`/`archetype`.
- `src/data/sprites/palettes.js` — paletas nuevas (`petrified`, glow veneno, flesh encantado) si hacen falta.
- `src/data/enemies/earth.js` y `src/data/bosses/earth.js` — **retirar `geometric: true`** de cada def al aprobarse su sprite (único cambio a la lógica de Tierra).
- `tests/sprites/recipes.test.js` — añadir los 8 jefes de Tierra a la lista por-jefe; la GLOBAL ya se ajusta sola al caer los flags.

---

## 7. Fuera de alcance / follow-ups
- Cambios de gameplay, balance, oleadas o fases (Tierra ya está implementado y verde).
- El bloque petrificado de Lélaps (`StaticBlock` / `spawnPetrifyBlock`) — mantiene su textura de obstáculo; no es una receta de criatura.
- Arte de otros mundos; el Castillo (endgame, spec propio aún por escribir); Nimue/Merlín (reservados).
- Animaciones nuevas más allá de las del archetype (idle/walk/attack) — se mantienen las que el patrón ya provee.
