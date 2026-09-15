# Sprites de los 10 enemigos restantes de Fuego — rediseño desde referencia

**Fecha:** 2026-09-14 · **Rama:** `feat/fire-advanced-sprites` · **Estado:** diseño aprobado

Segunda tanda del proceso de `2026-09-14-fire-basic-sprites-design.md` (PR #38 y #39), que ya
rediseñó los 10 villanos básicos. Esta cubre los 10 enemigos no-jefe de Fuego que conservan el
arte procedural antiguo.

## Objetivo

Sustituir los sprites de estos 10 enemigos por versiones fieles a la referencia del usuario:

| Clave | Radio | Rasgos de la referencia |
|---|---|---|
| `caballero_brasa` | 18 | armadura roja con cresta de llama, visera y espada incandescente |
| `portaestandarte` | 18 | armadura dorada y asta con estandarte de sol rojo |
| `can_lava` | 17 | lobo de roca con grietas de lava, de perfil mirando a la derecha |
| `coloso_magma` | 30 | gigante de roca con cuernos, grietas de lava y núcleo brillante en el pecho |
| `elemental_fuego` | 26 | llama viva con cara de ojos brillantes |
| `fenix_menor` | 20 | fénix de frente con alas abiertas y cola de llamas |
| `totem_pira` | 36 | columna de piedra con calavera, runas de lava y fuego en la cima |
| `avispa_brasa` | 16 | avispa con alas membranosas y abdomen rayado naranja |
| `imp_brasa` | 16 | diablillo rojo con cuernos, alas y bola de fuego en la mano |
| `brasa_errante` | 16 | bola de fuego con núcleo de brasa y chispas |

Los jefes y minibosses (`src/data/bosses/fire.js`) quedan fuera. `elemental_fuego`,
`fenix_menor` y `coloso_magma` usan la textura geométrica de miniboss, pero son enemigos de
oleada. `imp_brasa` y `brasa_errante` solo aparecen invocados.

## Alcance

- **Dentro:** el sprite estático de frente de los 10, generado desde la referencia; cuerpos de
  tamaño real (más de 32 px) en el motor; el volteo del can; y la limpieza del arte viejo que
  queda sin uso.
- **Fuera:** animaciones, un sprite distinto para el fénix renacido y cambios de stats o
  comportamiento.

## Referencia

`tools/refs/fuego-avanzado.png` (1536×1024, RGB de 8 bits): una cuadrícula de 2×5 paneles,
cada uno con una sola figura, título arriba y pie "32 × 32 px" abajo. Cada figura mide entre
180 y 260 px de alto. El fondo de los paneles es casi negro, alrededor de `(13,12,15)`, con
sombras suaves bajo los pies y chispas sueltas. El pie "32 × 32 px" es decorativo: el tamaño lo
fija el radio de cada enemigo (ver Decisiones).

## Decisiones

- **Tamaño real, escala 1:** el cuadro del cuerpo mide `radius*2` px y se pinta sin estirar,
  con la misma densidad de píxel que los básicos. El coloso lleva un cuerpo de 60 y el tótem
  uno de 72. Se descartó generarlos todos a 32 y ampliarlos, porque los grandes quedarían con
  píxeles casi el doble de gruesos que sus vecinos.
- **El can se voltea:** es estático, pero su receta declara `faces: true` y se voltea hacia la
  princesa como hoy.
- **Generador:** segunda hoja con código compartido en `tools/lib/`. Se descartaron un
  generador único para todas las hojas (obliga a renombrar y regenerar lo ya mergeado) y
  copiar y pegar (duplica unas 80 líneas).

## 1. Motor y datos

### Cuerpo de tamaño variable (`src/systems/enemyDisplay.js`)

- `body` acepta un lado opcional: `body: { x, y, size }`. Sin `size` mide `BODY_PX` (32), así
  que los básicos y el resto de recetas no cambian.
- `displayFor(recipe, radius)` usa ese lado:
  - `scale = radius*2 / size`;
  - `originX = (body.x + size/2) / gridW`, `originY = (body.y + size/2) / gridH`;
  - `body: { w: size, h: size, x: body.x, y: body.y }`, `half: radius`.
- En esta tanda `size = radius*2`, así que la escala es 1.
- `Enemy#applyDisplay` y `GameScene#containEnemy` ya consumen ese resultado y no cambian.

### Estático que se voltea (`src/objects/FacingController.js`)

- Nuevo flag de receta `faces: true`, válido solo junto a `static: true`.
- `Enemy` pasa a `FacingController` si el volteo está bloqueado: `static && !faces`. Hoy
  `isStatic` bloquea `setFlipX` en las dos ramas (`facePlayer` y velocidad); pasa a hacerlo
  solo cuando la receta no tiene `faces`.
- El can de la referencia mira a la derecha, que es la convención de la vista lateral
  (`flipX` = mirar a la izquierda), así que sus frames no se espejan y su receta pierde el
  `flip: true` antiguo.

### Arte generado

- `tools/gen-fire-advanced.mjs` escribe entero `src/data/sprites/partsFireAdvanced.js`
  (archivo GENERADO, cabecera "do not edit by hand"), que exporta:
  - `FIRE_ADVANCED_PARTS`: una parte por criatura, `fa_<clave>`, con `res: 32`, `w`/`h` del
    lienzo, `anchor: { x: 0, y: 0 }`, `colors` y `down`;
  - `FIRE_ADVANCED_META`: `{ gridW, gridH, body: { x, y, size } }` por criatura.
- `parts.js` importa `FIRE_ADVANCED_PARTS` y lo expande dentro de `PARTS`.

### Recetas (`src/data/sprites/recipes.js`)

- `fireBasicRecipe(key, archetype)` se generaliza en
  `sheetRecipe(meta, prefix, key, archetype, extra = {})`, que devuelve
  `{ archetype, static: true, scale: 1, gridW, gridH, body: { ...meta[key].body }, parts: [{ name: prefix + key }], ...extra }`
  y lanza error si falta la clave.
- `fireBasicRecipe` se conserva como envoltorio de una línea sobre `sheetRecipe`, para no
  tocar sus 10 usos ni `preview-fire-basics.mjs`. Se añade `fireAdvancedRecipe` con la misma
  forma.
- Las 10 recetas nuevas quedan en una línea cada una. El can usa
  `fireAdvancedRecipe('can_lava', 'beast', { faces: true })`.

### Limpieza del arte viejo

- **Se eliminan**, si `grep` confirma que nada más las referencia: las constantes
  `KNIGHT_BANNER`, `CAN_LAVA`, `COLOSO`, `FUEGO_ELEM`, `FENIX`, `IMP` y `AVISPA` de
  `recipes.js`; sus partes en `parts.js` (`banner`, `can_*`, `coloso_*`, `fuego_*`, `fenix_*`,
  `imp_*` y `avispa_*`); y sus bloques en `tools/gen-beast.mjs`, `gen-blob.mjs` y
  `gen-winged.mjs`.
- **Se conservan** porque otros enemigos las usan: `KNIGHT` (`warrior`), `TOTEM_FIRE`
  (`centinela_piedra`) y `BRASA` (`fuego_fatuo`, `fuego_fatuo_pantano`), con sus partes.

## 2. Generador

### Código compartido (`tools/lib/`)

- `tools/lib/sheetParts.mjs`: `renderSheetParts(results, { file, generator, prefix, metaName, partsName, header })`
  devuelve el texto del archivo de partes (cabecera, `META` con `body.size` cuando no es 32 y
  `PARTS`). El generador lo escribe a disco.
- `tools/lib/sheetPreview.mjs`: compone el PNG de revisión. Por criatura: el recorte de la
  referencia, el sprite forjado con la receta real a ×6 con el cuadro del cuerpo marcado en
  cian (del lado `size`), y el sprite a ×2 sobre fondo oscuro y sobre suelo de lava. Si el
  recorte es muy alto, se reduce para que quepa junto al sprite.
- `gen-fire-basics.mjs` y `preview-fire-basics.mjs` pasan a usar estos módulos. Al regenerar,
  `partsFireBasics.js` debe salir byte a byte idéntico.

### Conversión (`tools/lib/figure.mjs`)

- `convertFigure` acepta `bodySize` (por defecto 32, la constante `BODY` actual) y lo usa en
  todo lo que hoy usa `BODY`: el centrado y la contención del cuadro, y el crecimiento del
  lienzo cuando la figura es más pequeña que el cuadro.
- Si la figura no fija `minWidth`, el ancho mínimo es `bodySize`: ninguna silueta queda más
  estrecha que su cuerpo.
- Nuevo campo opcional `bodyShift: [dx, dy]`, aplicado tras el centrado y antes de contener el
  cuadro en la silueta, para casos como el estandarte, donde la masa desplaza el hitbox.
- El resultado incluye `body.size`.

### Hoja nueva (`tools/fire-advanced-figures.mjs`)

- Exporta `REF_PATH` (`tools/refs/fuego-avanzado.png`) y `FIGURES`. Cada entrada declara
  `slot`/`rows` (recorte dentro de su panel, sin título ni pie), `bodySize` (`radius*2`),
  `scale` inicial, `bg: [13, 12, 15]` y, cuando haga falta, `bgTol`, `peel`, `bodyShift` y
  `overrides`.
- Casos que se ajustan durante el prototipo:
  - las chispas sueltas (brasa, elemental, tótem): el despeckle las quita; si alguna llama
    queda amputada, se recupera con `overrides`;
  - las sombras bajo los pies (coloso, imp, tótem): `bgTol` las deja fuera;
  - el estandarte: `bodyShift` si el cuadro se va hacia la bandera.
- `tools/preview-fire-advanced.mjs <out.png> [key,…]` escribe el PNG de revisión.

## 3. Revisión visual

1. **Prototipo:** `coloso_magma` (grande, cuerpo de 60), `can_lava` (de perfil) y
   `brasa_errante` (pequeña, con llamas y chispas). Se envía el preview al usuario y se itera
   hasta su OK.
2. **Resto:** se generan los 7 restantes, se envía el preview y se itera hasta su OK.
3. Solo después se conectan las recetas y se elimina el arte viejo.

## 4. Verificación

- **Tests (`node --test`):**
  - `displayFor` con `body.size` (radio 30 y cuerpo de 60: escala 1, origen en el centro del
    cuadro, cuerpo de 60×60) y sin `size`; los tests actuales pasan sin cambios;
  - `FacingController` con un sprite falso: `static` sin `faces` nunca voltea (ni con
    `facePlayer` ni por velocidad); `static` con `faces: true` voltea hacia la princesa;
  - `convertFigure` con `bodySize` distinto de 32 sobre una imagen sintética: cuadro de ese
    lado dentro de la silueta, ancho mínimo cumplido, `bodyShift` aplicado y contenido;
  - las 10 recetas forjan sin error, el cuadro del cuerpo cabe en el lienzo, usan como máximo
    16 colores, `body.size === radius*2` según `enemies/fire.js`, y ninguna receta depende de
    las partes eliminadas;
  - `bodySize` de cada figura en `fire-advanced-figures.mjs` es `radius*2` del enemigo;
  - reproducibilidad: al re-ejecutar ambos generadores, `git diff` sale limpio (cubre que
    `partsFireBasics.js` no cambió).
- Suite completa en verde.
- **En juego:** Playwright a 480×854 con el debug de físicas y sin errores de consola:
  - nv4: caballero, portaestandarte, can (capturas volteado a ambos lados) e imp invocado por
    el sacerdote;
  - nv5: elemental, fénix y avispa;
  - nv6: coloso y tótem, con el cuerpo alineado con el cuadro y los grandes contenidos en la
    pantalla;
  - brasa errante: en la pelea de Ignatius o forzando su aparición desde la consola.

## Riesgos

- **La reducción queda borrosa en los pequeños.** La avispa, con alas finas, es la más frágil.
  Se mitiga con `overrides` y con la revisión del prototipo.
- **Pantallas saturadas en nv5 y nv6.** Los grandes ocupan lo mismo que hoy, pero con más
  detalle. Si cuesta distinguirlos, se ajusta aparte, en balance.
- **Siluetas no cuadradas.** La cabeza y la cola del can, el estandarte y las alas del fénix
  sobresalen del hitbox, igual que el halo del pirovidente. Se acepta.
