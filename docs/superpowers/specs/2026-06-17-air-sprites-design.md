# Sprites del Mundo de Aire (La Torre Montaña) — Documento de Diseño

**Fecha:** 2026-06-17
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Sub-proyecto de arte** del mundo de Aire (ver `2026-06-17-air-world-design.md`, ya implementado: PR #27 merged). Reusa el pipeline de sprites del proyecto pixel-art HD (`SpriteForge` + `parts.js` + `recipes.js` + `palettes.js` + `tools/gen-*.mjs`).

---

## 0. Contexto y problema

El mundo de Aire embarcó **geométrico**: sus 20 enemigos y 5 jefes llevan `geometric: true` y renderizan con texturas geométricas de fallback (`TEX.archer`/`villager`/`warrior`/`miniboss`/`boss`). El test invariante `recipes.test.js` ("every registered enemy type has a sprite recipe") los exime por ese flag. El resto del juego (Fuego/Agua) ya usa sprites 32×32 forjados de recetas. Este sub-proyecto **da sprite a las criaturas de Aire** y retira `geometric: true` a medida que cada lote se aprueba.

**Regla dura del usuario:** **cada sprite se revisa con el usuario (vía Playwright) antes de aprobarse.** Ningún sprite se da por bueno sin su visto bueno.

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos. Mobile-only, portrait, 480×854.
- Arte por código: las partes son rejillas de píxeles con roles (`o`/`b`/`s`/`h`/`a`) autoradas por scripts `tools/gen-*.mjs`; `SpriteForge` (puro, `DESIGN=32`) las forja contra paletas. Lógica nunca toca texturas (claves centralizadas en `config.js`).
- **No tocar la lógica del mundo de Aire** (defs/oleadas/jefes ya implementados y verdes, 319 tests). Solo se retira `geometric: true` de los defs a medida que el sprite correspondiente se aprueba.

### Alcance
Recetas + partes + paletas para las **29 texturas** de Aire (20 enemigos + 5 jefes, con las formas de Galahad), el **mecanismo de preview** para revisión, y el retiro incremental de `geometric: true`. **Fuera de alcance:** cambios de gameplay/balance; arte de otros mundos; el renombrado Dama→Morgan le Fay (ajuste aparte); animaciones más allá de las que el archetype ya define (idle/walk/attack según el patrón existente).

---

## 1. Mecanismo de revisión (Playwright)

Sin preview visual no se puede cumplir la regla del usuario (hoy los `gen-*.mjs` solo emiten rejillas ASCII de partes; el sprite a color solo se forja en `BootScene` en runtime).

**Página de preview** — `tools/sprite-preview.html` (estática, sin build): importa `SpriteForge`, `recipes.js`, `parts.js`, `palettes.js` como módulos ES, forja **cada receta de Aire** y la dibuja en una rejilla **etiquetada y ampliada** (escala ~6–8×, fondo neutro), mostrando los frames por anim (idle/walk/attack) y direcciones (down/up/side) que el archetype define. Cabe junto a `index.html` y se sirve con el mismo `python3 -m http.server`.

**Loop de revisión por criatura:**
1. Autoro/ajusto las recetas (+partes nuevas) de un lote.
2. Sirvo el proyecto; **Playwright** navega a la página de preview y captura screenshot(s) del lote.
3. El usuario revisa los sprites y **aprueba o pide cambios** (itero hasta aprobar).
4. Al aprobar el lote: retiro `geometric: true` de esos defs (el runtime cambia solo a sprite vía `hasRecipe`).

La página de preview es **herramienta de desarrollo** (no entra al juego); puede quedar en `tools/` o excluirse del deploy.

---

## 2. Mapa de reuso vs. arte nuevo

El sistema de recetas recolorea por `baseColor` (`paletteFor` deriva la paleta del color del def, salvo paleta nombrada). Así, como `CULT_HOODED` sirve a Fuego (ember) y Agua (frost), muchas criaturas de Aire son **reuso + recolor** (cero arte nuevo).

### 2.1 Reuso + recolor (sin arte nuevo) — partes existentes
| Criatura(s) | Set de partes reusado | Paleta / baseColor |
|---|---|---|
| Cultista, Cultista Canalizador (faceless), Guardián del Rito, **Líder Cultista** | `CULT_HOODED` / `CULT_FACELESS` / `CULT_STAFF` | `cultRobe` / storm |
| Caballero de Sangre, Guardia Nocturno | `KNIGHT` (size 64) | `bloodRed` / `stormDark`; ojos = glow o nueva `vampglow` |
| **Galahad** humano / rage / rage×2 / final | `KNIGHT` | sangre/oro; rage = paleta más roja / accent |
| Acólito del Trueno, Heraldo del Rayo, Hechicero del Viento, Tronador, Sacerdote de Sangre, **Bruja del Vendaval** | `MAGE_CASTER` / `CULT_STAFF` | storm / `wispYellow` orbe-rayo / `bloodRed` (sacerdote) |
| Siervo de la Torre, Duelista Nocturno, Vástago Vampírico | `VILLAGER` / `MAGE_MELEE` | nueva paleta `vampskin` (piel pálida) + ropa oscura |
| Fuego Fatuo, Espíritu de Tormenta | `BRASA` / `CENIZA` (blob) | `wispYellow` / `lightning` (núcleo eléctrico) |
| Centinela de Piedra, Gárgola Pararrayos | `TOTEM` (ídolo tallado) | `sentinelStone` / `gargoyleStone`; ojo glow/rayo |

### 2.2 Arte nuevo (nuevos `gen-*.mjs` + partes) — ~5 siluetas
| Criatura(s) | Por qué nuevo | Notas |
|---|---|---|
| **Murciélago** | silueta murciélago propia (alas membranosas, no avispa) | base reusada por Vampiro Alado y la forma murciélago de Galahad, a distinto `size` |
| **Arpía** | humanoide alado distinto | cuerpo + alas + garras |
| **Torbellino Errante** | remolino de viento (forma en espiral) | ambiental, 0 dmg |
| **Elemental de Tormenta** (jefe nv6) | cúmulo de nubes negras relampagueante, **sobredimensionado** | el setpiece; size grande |
| **Galahad Murciélago Gigante** (forma nv8) | murciélago monstruoso a escala de jefe | reusa partes del murciélago a `size` de boss + detalles |

**Enfoque:** reuso-pesado (2.1) + arte bespoke solo para esas ~5 siluetas (2.2). El Vampiro Alado y la forma murciélago de Galahad reusan las partes del Murciélago recoloreadas/escaladas (no son 3 artes separadas).

---

## 3. Lotes y orden

Cada lote: autoría → servir → Playwright captura → **revisión/aprobación del usuario** → retirar `geometric: true` de esos defs → suite verde.

- **Lote 0 — Página de preview.** Construir `tools/sprite-preview.html` y validarla con una receta YA existente (p. ej. `acolito_brasa`) para confirmar que forja y se ve bien antes de autorar nada de Aire.
- **Lote A — Recolores** (sin arte nuevo): cultistas/líder, knights (Caballero, Guardia, Galahad humano/rage/rage×2/final), casters (Acólito, Heraldo, Hechicero, Tronador, Sacerdote, Bruja), vampiros humanoides (Siervo, Duelista, Vástago), blobs (Fuego Fatuo, Espíritu de Tormenta), totems (Centinela, Gárgola). Mayormente entradas de receta + paletas nuevas.
- **Lote B — Arte nuevo de chusma**: Murciélago, Arpía, Torbellino Errante (+ Vampiro Alado reusando murciélago).
- **Lote C — Jefes/setpieces**: Elemental de Tormenta (nube de tormenta sobredimensionada), forma Galahad Murciélago Gigante.

Dentro de un lote grande (A), se puede sub-dividir la revisión por familia (cultistas / knights / casters / vampiros / blobs / totems) para que las capturas de Playwright sean legibles.

---

## 4. Paletas

Reusar las nombradas existentes donde apliquen (`shadow`, `glow`, `bone`, `wood`, `skin`, `steel`, `silverhair`, etc.). Paletas nuevas (en `palettes.js`) según haga falta, p. ej.:
- `vampskin` — piel pálida vampírica (para Siervo/Duelista/Vástago).
- un glow eléctrico para ojos/orbes de rayo (puede derivarse de `COLORS.lightning`/`wispYellow`) si `glow` (dorado) no encaja.

Los `baseColor` de las recetas salen de las claves `COLORS` de Aire ya añadidas (`stormGrey/stormDark/bloodRed/vampPale/duelistSteel/batPurple/harpyPlum/wispYellow/gargoyleStone/sentinelStone/whirlGrey/cultRobe`).

---

## 5. Testing y criterio de "aprobado"

- **`recipes.test.js`:** a medida que cae `geometric: true`, la invariante GLOBAL deja de eximir y **exige** receta para esos enemigos → garantiza que no quede ninguno sin sprite por error. `every recipe forges without throwing` (mirror de BootScene) cubre las partes nuevas (parte/role inválido falla en `node --test`, no solo en runtime). Para jefes nuevos, añadir su clave a la lista explícita del test por-jefe si corresponde (hoy esa lista es de jefes de Agua).
- **Forja sin Phaser:** todo el pipeline (`SpriteForge`, recipes, parts, palettes) es puro → `node --test`.
- **Criterio de aprobado por lote:** (1) cada receta forja sin tirar; (2) el usuario aprueba las capturas de Playwright; (3) `geometric: true` retirado de esos defs; (4) suite verde. El mundo entero se considera "con sprites" cuando ningún def de Aire conserva `geometric: true` y `recipes.test.js` pasa sin exenciones de Aire.

---

## 6. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `tools/sprite-preview.html` — página de preview (dev tool).
- `tools/gen-bat.mjs`, `tools/gen-harpy.mjs`, `tools/gen-whirlwind.mjs`, `tools/gen-stormelem.mjs` (nombres orientativos) — autoría de las partes nuevas (Lotes B/C).

**Modificados:**
- `src/data/sprites/parts.js` — partes nuevas (bat/harpy/whirlwind/storm-cloud/giant-bat) spliceadas desde los gen.
- `src/data/sprites/recipes.js` — recetas de las 29 texturas de Aire (reuso + nuevas), con `baseColor`/`palette`/`accent`/`size`/`archetype`.
- `src/data/sprites/palettes.js` — paletas nuevas (`vampskin`, glow eléctrico) si hacen falta.
- `src/data/enemies/air.js` y `src/data/bosses/air.js` — **retirar `geometric: true`** de cada def al aprobarse su sprite (único cambio a la lógica de Aire).
- `tests/sprites/recipes.test.js` — (si aplica) añadir jefes de Aire a la lista por-jefe; la GLOBAL ya se ajusta sola al caer los flags.

---

## 7. Fuera de alcance / follow-ups
- Cambios de gameplay, balance, oleadas o fases (Aire ya está implementado y verde).
- Renombrado Dama del Lago → Morgan le Fay (ajuste de strings aparte).
- Trigger in-game de `story.air.bruja.death` (pass-through de `dialogue` por-miniboss en `levelBuilder`).
- Pulido visual de playtest del mundo (tint de CC, espiral del tornado, barra del ritual).
- Animaciones nuevas más allá de las del archetype (idle/walk/attack) — se mantienen las que el patrón ya provee.
