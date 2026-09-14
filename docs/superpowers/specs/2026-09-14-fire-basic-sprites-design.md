# Sprites de los villanos básicos de Fuego — rediseño desde referencia

**Fecha:** 2026-09-14 · **Rama:** `fix/fire-sprites` · **Estado:** diseño aprobado

## Objetivo

Sustituir los sprites actuales de los 10 villanos básicos de Fuego (nv1–3) por versiones fieles
a la referencia del usuario, que hoy son casi idénticos entre sí: seis comparten la misma
capucha y solo cambian de color. La referencia fija silueta, rasgos y paleta de cada uno:

| Clave | Rasgos de la referencia |
|---|---|
| `acolito_brasa` | túnica con capucha roja, cara oscura, ojos brillantes, manos al frente |
| `lanzabrasas` | capucha roja y bastón largo con antorcha encendida |
| `piromante` | capucha roja con bordado dorado y una bola de fuego en cada mano |
| `pirovidente` | túnica roja y dorada, halo dorado con mira y dos llamas flotantes |
| `sacerdote_llama` | túnica dorada, corona de tres llamas y antorchas a los lados |
| `encapuchado_pira` | capucha gris ceniza y farol de brasas colgando de la mano |
| `iniciado_veloz` | capucha roja corta y dagas en ambas manos |
| `salamandra` | lagarto negro con cresta de lava y garras naranjas (vista cenital) |
| `larva_magma` | gusano segmentado de roca con grietas de lava |
| `espiritu_ceniza` | vasija de ceniza con humo gris enroscado |

## Alcance

- **Dentro:** arte de los 10, soporte del motor para capas con colores propios, recetas
  estáticas y sprites que sobresalen del cuadro del cuerpo.
- **Fuera:** vistas de espalda y perfil, animaciones de idle, caminar y ataque (los sprites
  quedan estáticos, solo de frente), el resto de enemigos de Fuego, stats y comportamiento.

## Referencias

- `tools/refs/fuego-basicos-small.png` (1569×192): **fuente del generador**. Cada figura mide
  unos 45×80 px; la prueba de reducción a 32×32 conserva los rasgos clave.
- `tools/refs/fuego-basicos.png` (933×510): versión grande con paletas por criatura; solo
  documenta el diseño, el generador no la lee.

## Decisiones

- **Resolución:** el juego pinta sobre un lienzo lógico de 480×854 y los básicos se muestran a
  32–34 px, así que el sprite nativo es de **32 px de cuerpo, escala 1** (un píxel de rejilla =
  un píxel lógico). No se usan lienzos mayores encogidos: perderían la mitad del detalle.
- **Sobresalir del cuadro:** el halo, las antorchas, las llamas o el humo pueden salirse del
  cuadro de 32×32 del cuerpo. El cuerpo sigue coincidiendo con la hitbox.
- **Estáticos:** una sola vista de frente, un solo frame, sin volteo horizontal.
- **Enfoque:** capas con colores libres dentro de SpriteForge (se descartaron el sistema de 5
  tonos, que pierde los degradados de fuego y lava, y los PNG directos, que crean un segundo
  pipeline de sprites).

## 1. Motor y datos

### SpriteForge: colores por capa

- Una parte puede declarar `colors: { '<carácter>': 0xRRGGBB, … }`.
- En `composeColorGrid`, cada carácter se busca primero en `part.colors`; si no está, se usa
  `ROLE_MAP` (`o/b/s/h/a`) con la paleta de siempre. `.` sigue siendo transparente y un
  carácter que no esté en ninguno de los dos lanza error.
- El arte existente no cambia: ninguna parte actual declara `colors`.
- Las partes con `colors` usan solo `0-9` y `A-Z` (mayúsculas), nunca las minúsculas de los
  roles, para que la lectura de la rejilla no dependa de la prioridad.

### Receta estática

- Opción de receta `static: true`: `forge` compone la vista `down` una vez y la usa para
  `idle` y `walk` en `down`, `up` y `side`, con **un frame** cada una (sin `shiftV` ni
  `legShift`). Si la parte no define `up`/`side`, no importa: se usa `down`.
- `FacingController` recibe si la receta es estática y en ese caso nunca llama a `setFlipX`
  (tampoco con `facePlayer`). Sigue reproduciendo la animación de la dirección, que es la
  misma imagen.

### Arte generado

- `tools/gen-fire-basics.mjs` escribe entero `src/data/sprites/partsFireBasics.js`
  (archivo GENERADO, cabecera "do not edit by hand"), que exporta `FIRE_BASIC_PARTS`.
- Una parte por criatura, `fb_<clave>`: `res: 32`, `w`/`h` = lienzo, `anchor: { x: 0, y: 0 }`,
  `colors`, y `down` con las filas.
- `parts.js` importa `FIRE_BASIC_PARTS` y lo expande dentro de `PARTS`.

### Recetas

- Las 10 recetas pasan a
  `{ archetype, static: true, gridW, gridH, scale: 1, body: { x, y }, parts: [{ name: 'fb_<clave>' }] }`,
  con `gridW/gridH/body` tomados del resultado del generador.
- Las constantes compartidas (`CULT_HOODED`, `CULT_STAFF`, `CENIZA`) se conservan porque las
  usan enemigos de otros mundos.
- Quedan sin uso y se eliminan: las constantes `LARVA`, `SALAMANDRA`, `MAGE_MELEE` y
  `CULT_FACELESS` de `recipes.js` (sus partes `mage_*`/`cult_*` siguen en uso), las
  partes `larva_body`, `larva_glow`, `larva_eyes`, `sala_body`, `sala_crest`, `sala_eyes` y
  `mage_club` de `parts.js`, y sus bloques en `tools/gen-beast.mjs` y `tools/gen-mage.mjs`
  (antes de borrar, `grep` confirma que nada más las referencia).

## 2. Mostrar sprites que sobresalen

### Problema

`Enemy` y tres sitios de `GameScene` (`swapToBeast`, invocaciones y reapariciones) hacen
`setDisplaySize(radius*2, radius*2)`: aplasta un lienzo no cuadrado y el cuerpo físico toma el
tamaño del dibujo entero.

### Diseño

- La receta declara `body: { x, y }`: esquina superior izquierda del cuadro de 32×32 del
  cuerpo dentro del lienzo. Sin `body`, se asume que el lienzo es el cuerpo (comportamiento
  actual).
- Función **pura** `displayFor(recipe, radius)` (en `src/systems/`, sin Phaser) que devuelve:
  - `scale = radius*2 / 32`, igual en X e Y;
  - `originX = (body.x + 16) / gridW`, `originY = (body.y + 16) / gridH`, para que `x,y` del
    enemigo sea el centro del cuerpo;
  - `bodySize = 32` y `bodyOffset = { x: body.x, y: body.y }` en píxeles de textura.
  Para recetas sin `body` devuelve exactamente lo que hoy produce `setDisplaySize`.
- Método `Enemy#applyDisplay()` (Phaser) que usa `displayFor` y sustituye los cuatro
  `setDisplaySize(radius*2, radius*2)` de enemigos normales. Los tamaños fijos de jefes
  (Elemental, Galahad, ataúd, formas) no se tocan.
- `containEnemy` usa el tamaño del cuerpo (`radius`) en lugar de `displayWidth/Height` cuando la
  receta tiene `body`, para que el halo pueda asomar por el borde sin empujar al enemigo.

## 3. Generador

`tools/gen-fire-basics.mjs`: Node sin dependencias y determinista.

1. **Lectura:** decodificador PNG mínimo (IHDR/IDAT/filtros 0–4, RGB y RGBA de 8 bits) con
   `node:zlib`.
2. **Recorte:** caja fija por criatura sobre la referencia, figura **izquierda** de cada pareja
   (pirovidente y sacerdote tienen una sola).
3. **Fondo:** flood fill desde el borde del recorte sobre píxeles cercanos al color del panel
   (tolerancia por criatura), de modo que las zonas oscuras encerradas en la figura no se
   pierden.
4. **Cuantizado:** paleta corta por criatura (≤16 colores, mediana determinista sobre los
   píxeles originales de la figura).
5. **Reducción:** escala por criatura elegida para que el cuerpo mida ~32 px de alto; lo que
   sobresale conserva la misma escala. Cada píxel de salida toma el color de paleta **más
   votado** de su zona (no el promedio, que embarra), y los brillos votan con más peso para
   que ojos y llamas sobrevivan. Los píxeles de baja cobertura quedan transparentes.
6. **Limpieza:** pelado de bordes oscuros (halos de brillo/sombra; se desactiva en criaturas
   oscuras como la salamandra), eliminación de píxeles aislados, contorno oscuro de 1 px en
   los bordes que no son brillo y retoques por coordenada (ojos, núcleos de fuego, halo,
   dagas, grietas).
7. Se calculan `gridW`, `gridH` y `body` (cuadro de 32×32 apoyado abajo y centrado en la masa
   de las filas inferiores).

La conversión vive en `tools/lib/figure.mjs` (pura, testeada con imágenes sintéticas) y el
códec PNG en `tools/lib/png.mjs`; los recortes y parámetros por criatura, en
`tools/fire-basics-figures.mjs`, que comparten generador y preview.
8. **Salida:** escribe `partsFireBasics.js` con `FIRE_BASIC_PARTS` y `FIRE_BASIC_META`
   (`gridW/gridH/body` por criatura), que las recetas consumen con el helper
   `fireBasicRecipe(key, archetype)` en vez de copiar números a mano.

`tools/preview-fire-basics.mjs` forja las recetas **reales** con SpriteForge y escribe un PNG
con cada sprite a ×6 y a ×2 junto al recorte de la referencia.

## 4. Revisión visual

1. **Prototipo:** `acolito_brasa` (caso normal) y `pirovidente` (caso que sobresale). Se envía
   el preview al usuario y se itera hasta su OK.
2. **Resto:** se generan los 8 restantes, se envía el preview y se itera hasta su OK.
3. Solo después se conectan las recetas y se integra en el juego.

## 5. Verificación

- **Tests (`node --test`):**
  - SpriteForge: `colors` tiene prioridad sobre roles; se vuelve a los roles si el carácter no
    está; carácter desconocido lanza error; una receta `static` produce 1 frame idéntico en
    todas las direcciones y estados;
  - `displayFor`: receta sin `body` (equivale al comportamiento actual) y receta que sobresale
    (escala, origen y cuerpo);
  - `FacingController` con un sprite falso: una receta estática nunca voltea;
  - las 10 recetas forjan sin error, el cuadro del cuerpo cabe en el lienzo, cada una usa como
    máximo 16 colores y ya no dependen de las partes eliminadas;
  - reproducibilidad: al re-ejecutar el generador, `git diff` sale limpio.
- Suite completa en verde.
- **En juego:** Playwright a 480×854 en un nivel 3 de Fuego: captura con los sprites nuevos,
  sin errores de consola y con el debug de físicas mostrando los cuerpos alineados con el
  cuadro del cuerpo.

## Riesgos

- **La reducción queda borrosa** (lo que pasó con la tortuga): la limpieza y los retoques por
  coordenada del paso 5 existen para eso; el prototipo lo valida antes de hacer los 10.
- **Conflicto con la PR #37 (tortuga):** ambas ramas añaden un import generado en `parts.js`
  y tocan `recipes.js`. Se resuelve a mano al mergear la segunda.
