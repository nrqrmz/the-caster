# Sprites de los jefes de Fuego y la Escolta del Templo — rediseño desde referencia

**Fecha:** 2026-09-15 · **Rama:** `feat/fire-boss-sprites` (desde `feat/fire-advanced-sprites`) ·
**Estado:** diseño aprobado

Tercera y última tanda de Fuego, tras `2026-09-14-fire-basic-sprites-design.md` (10 básicos) y
`2026-09-14-fire-advanced-sprites-design.md` (10 restantes, PR #40). Con esta, todo lo que
aparece en el mundo de Fuego tiene arte desde referencia.

La rama parte de `feat/fire-advanced-sprites` porque depende de lo que esa PR añade y aún no
está en master: `body.size` en `displayFor`, `sheetRecipe`, `bodySize` en `convertFigure`,
`tools/lib/sheetParts.mjs` y `tools/lib/sheetPreview.mjs`.

## Objetivo

| Clave | Aparece en | Radio | Sprite en pantalla | Rasgos de la referencia |
|---|---|---|---|---|
| `pyra` | miniboss nv4 + trío nv7 | 24 | lado mayor 48 | pelo rojo en llamas, corona, vestido rojo y dorado, orbe de fuego en la mano |
| `vesta` | miniboss nv5 + trío nv7 | 32 | lado mayor 64 | armadura roja pesada, coleta negra, martillo de piedra en llamas, escudo con sol |
| `favilla` | miniboss nv6 + trío nv7 | 24 | lado mayor 48 | pelo blanco, halo y corona, túnica dorada, una llama en cada mano |
| `ignatius` | jefe del templo nv8 | 30 | lado mayor 64 | rey de barba de fuego, corona, capa roja con llamas, cetro con sol |
| `escolta_templo` | minions del templo nv8 | 16 | ancho ≥ 32 | caballero oscuro con yelmo, penacho y bufanda rojos, escudo con sol y lanza |

Las hermanas del trío (`SISTERS_TRIO`) comparten `key` y receta con las solo, así que quedan
cubiertas sin trabajo aparte.

## Alcance

- **Dentro:** el sprite estático de frente de los 4 jefes y de la escolta, generado desde la
  referencia; el enemigo nuevo `escolta_templo` como minion del templo de Fuego; y la limpieza
  del arte viejo de los jefes.
- **Fuera:** animaciones (caminar, ataque), vistas de espalda y de lado, cambios de stats, de
  hitbox o de comportamiento de los jefes, la escolta en oleadas de nv1–3 (la tarjeta dice
  "NV1-3", pero el usuario decidió que solo escolte el templo) y los minions de los templos de
  los otros mundos.

## Referencias

- `tools/refs/fuego-jefes.png` (1560×523, RGBA): 4 paneles en fila (Pyra, Vesta, Favilla,
  Ignatius), cada uno con título y subtítulo arriba y pie "64 x 64 px | idle | frente" abajo.
  Paneles aproximados en x: [10, 382], [398, 770], [786, 1158], [1173, 1545]; las figuras ocupan
  aproximadamente las filas [100, 460]. Fondo casi negro, alrededor de `(13,12,17)`, con
  resplandores rojos, chispas sueltas y llamas que salen de la figura.
- `tools/refs/fuego-escolta.png` (714×717, RGBA): un panel con título "ESCOLTA DEL TEMPLO" y pie
  "32 x 32 px". La figura ocupa aproximadamente x [190, 520] e y [140, 610]. Fondo alrededor de
  `(15,13,16)`, con chispas y un botón "Editar" de la interfaz en la esquina inferior izquierda,
  que queda fuera del recorte.

Los recortes exactos (`slot`/`rows`) se fijan en el prototipo. Los pies "64 x 64 px" y
"32 x 32 px" son decorativos: el tamaño lo fijan las decisiones de abajo.

## Decisiones

- **Tamaño de los jefes, escala 1:** el lado mayor de la silueta (llamas, escudo y cetro
  incluidos) mide 48 en Pyra y Favilla y 64 en Vesta e Ignatius, pintado sin estirar, con la
  misma densidad de píxel que el resto de Fuego. Es el tamaño aproximado con el que salen hoy
  (el lienzo viejo de 96×96 se reducía a `radius*2`); Ignatius crece de 60 a 64.
- **Hitbox intacta:** el cuadro del cuerpo mide `radius*2` (48, 64, 48, 60). En Pyra y Favilla
  el cuerpo es más ancho que la silueta y el lienzo crece hasta 48, como ya hace
  `convertFigure`.
- **Escolta como los básicos:** silueta de ≥ 32 px de ancho (`minWidth: 32`) con el alto que
  salga de su ratio y un cuerpo de 32.
- **Escolta = aldeano con otro arte:** mismos stats y comportamiento que `villager`, para no
  alterar el balance del templo.
- **Estáticos:** los jefes pierden las animaciones de caminar y las vistas de espalda y de lado
  del arte viejo. Se acepta, igual que con los 20 enemigos anteriores.
- **Generador:** tercera hoja sobre `tools/lib/`, con dos imágenes de referencia en una sola hoja
  lógica (un `ref` por figura).

## 1. Motor y datos

### Arte generado

- `tools/gen-fire-bosses.mjs` escribe entero `src/data/sprites/partsFireBosses.js` (GENERADO,
  cabecera "do not edit by hand") con `renderSheetParts`, prefijo `fj_`, `FIRE_BOSS_META` y
  `FIRE_BOSS_PARTS`.
- `parts.js` importa `FIRE_BOSS_PARTS` y lo expande dentro de `PARTS`.

### Recetas (`src/data/sprites/recipes.js`)

- `fireBossRecipe = (key, archetype, extra) => sheetRecipe(FIRE_BOSS_META, 'fj_', key, archetype, extra)`.
- `pyra`, `vesta`, `favilla` e `ignatius` pasan a `fireBossRecipe(key, 'boss')` y
  `escolta_templo` a `fireBossRecipe('escolta_templo', 'humanoid')`.
- `Boss` hereda de `Enemy`, así que `Enemy#applyDisplay` (con `displayFor`) y
  `flipLocked`/`FacingController` ya los manejan sin cambios.

### Enemigo nuevo (`src/data/enemies/fire.js`)

- `escolta_templo: { key: 'escolta_templo', tex: TEX.warrior, color: COLORS.emberDeep, hp: 20, speed: 90, damage: 8, radius: 16, movement: { type: 'chase' }, attacks: [] }`.
  Los valores numéricos, `movement` y `attacks` copian a `villager` (`enemies/index.js`);
  `tex`/`color` solo importan sin sprite.

### Minions del templo (`src/data/regions.js`)

- `makeBranch` acepta `templeMinions` (por defecto `[{ type: 'villager', count: 4 }]`) y lo usa
  en el nivel `temple`.
- Fuego pasa `templeMinions: [{ type: 'escolta_templo', count: 4 }]`. Agua, Aire y Tierra no lo
  pasan y no cambian.
- `regionSpriteKeys` ya recorre `phase.minions`, así que la escolta se forja con el mundo de
  Fuego sin tocar el manifiesto.

### Limpieza del arte viejo

- **Se eliminan**, si `grep` confirma que nada más las referencia: las listas `PYRA`, `VESTA`,
  `FAVILLA` e `IGNATIUS` de `recipes.js` (y su comentario); las partes `pyra_*`, `vesta_*`,
  `favilla_*` e `ign_*` de `parts.js` (bloques "Fire sisters bosses" e "Ignatius"); y
  `tools/gen-sisters.mjs` y `tools/gen-ignatius.mjs`.
- **Se conservan** las paletas con nombre (`redhair`, `blondhair`, `glow`, …) y todo lo de
  `villager`, que usan otros mundos.
- El test "every fire boss has a recipe with known parts" deja de exigir `baseColor` (las
  recetas de hoja llevan colores propios) y comprueba las partes `fj_`.

## 2. Generador

### Conversión (`tools/lib/figure.mjs`)

- Nueva opción `fitSide` (por defecto 0 = sin efecto). Si es > 0, la escala se busca para que el
  lado mayor de la silueta final (tras pelado y despeckle) mida exactamente `fitSide`: se parte
  de `fitSide / max(bw, bh)` y una búsqueda binaria afina, igual que con `minWidth`. `fitSide` y
  `minWidth` no se combinan: si llegan los dos, error.
- Si la silueta mide menos que `bodySize` en un eje, el lienzo crece como hoy.
- Sin `fitSide`, la salida de los básicos y los avanzados no cambia byte a byte.

### Hoja nueva (`tools/fire-bosses-figures.mjs`)

- Exporta `FIGURES`. Cada entrada declara `ref` (ruta absoluta de su PNG), `slot`/`rows`,
  `bodySize` (`radius*2`), `fitSide` (jefes) o `minWidth: 32` (escolta), `scale` inicial, `bg` y,
  cuando haga falta, `bgTol`, `peel`, `bodyShift` y `overrides`.
- `gen-fire-bosses.mjs` decodifica cada `ref` una sola vez (caché por ruta).

### Preview (`tools/lib/sheetPreview.mjs`)

- Cada item puede traer su propia imagen decodificada (`item.img`); si no la trae, se usa la del argumento,
  así que `preview-fire-basics.mjs` y `preview-fire-advanced.mjs` no cambian.
- `tools/preview-fire-bosses.mjs <out.png> [key,…]` escribe el PNG de revisión con
  `refScale: 1`.

### Casos que se ajustan en el prototipo

- Resplandores rojos alrededor de las figuras: `bgTol` los deja fuera sin cortar las llamas.
- Chispas sueltas: el despeckle las quita; si alguna llama queda amputada, `overrides`.
- Sombras bajo los pies: `bgTol`.
- Tope de 16 colores: `colors` por figura si el dorado o la piel se apagan.

## 3. Revisión visual

1. **Prototipo:** `ignatius` (64, capa de llamas y cetro) y `pyra` (48, pelo en llamas y orbe).
   Se envía el preview al usuario y se itera hasta su OK.
2. **Resto:** `vesta`, `favilla` y `escolta_templo`. Se envía el preview y se itera hasta su OK.
3. Solo después se conectan las recetas, se añade la escolta al templo y se elimina el arte viejo.

## 4. Verificación

- **Tests (`node --test tests/`):**
  - `convertFigure` con `fitSide` sobre una imagen sintética: el lado mayor de la silueta mide
    `fitSide`, el cuadro del cuerpo cabe en el lienzo y `fitSide` + `minWidth` lanza error;
  - las 5 recetas forjan sin error, el cuadro del cuerpo cabe en el lienzo, usan como máximo
    16 colores y `body.size === radius*2` según su def (`bosses/fire.js`, `enemies/fire.js`);
  - el lado mayor de la silueta de cada jefe es 48 (Pyra, Favilla) o 64 (Vesta, Ignatius) y la
    escolta mide ≥ 32 de ancho;
  - `bodySize` de cada figura en `fire-bosses-figures.mjs` es `radius*2` de su def;
  - el templo de Fuego (`fire_8`) tiene como minions `escolta_templo` ×4 y los templos de
    Agua, Aire y Tierra siguen con `villager` ×4; `regionSpriteKeys(REGIONS.fire)` incluye
    `escolta_templo`;
  - ninguna receta depende de las partes eliminadas;
  - reproducibilidad: al re-ejecutar los tres generadores de hoja, `git diff` sale limpio.
- Suite completa en verde.
- **En juego:** Playwright a 480×854 con el debug de físicas y sin errores de consola:
  - nv4 Pyra, nv5 Vesta y nv6 Favilla solas, con el cuerpo alineado con el cuadro;
  - nv7 el trío con el triángulo de lava;
  - nv8 Ignatius con las 4 escoltas.

## Riesgos

- **Detalle perdido a 48 px.** El pelo en llamas de Pyra y la túnica de Favilla son lo más
  frágil. Se ve en el prototipo; si no se leen, se decide con el usuario.
- **El fondo con resplandor confunde el recorte.** Llamas cortadas o halos oscuros incluidos.
  Se mitiga con `bgTol`, `peel` y `overrides`.
- **Siluetas asimétricas.** El escudo de Vesta y el cetro de Ignatius desplazan la masa; el
  cuadro del cuerpo se centra en ella y `bodyShift` lo corrige si hace falta.
