# Sprite de la Tortuga Acorazada — rediseño HD desde referencia

**Fecha:** 2026-09-14 · **Rama:** `feat/turtle-sprite` · **Estado:** diseño aprobado (rev. 2 tras prototipo)

## Objetivo

Sustituir el sprite simple actual de `tortuga_acorazada` (rejilla 21×26 escalada ×2, una
sola paleta verde) por una tortuga cenital detallada fiel a la referencia del usuario
(`tools/refs/tortuga-acorazada.png`): caparazón de placas musgo con grietas claras, púas de
hueso en cresta y flancos, runa roja sangre, cabeza oliva con ojos rojos brillantes y cuatro
patas con garras de hueso.

## Alcance

- La `tortuga_acorazada` solo aparece en **Agua nv6** (`src/data/regions.js`, oleada final,
  2 unidades). Ningún jefe la invoca. Cambiar su receta la cambia en todo el juego.
- **Fuera de alcance:** stats, IA, modificadores (`shielded`/`resist`), niveles, animación
  de "esconderse al cargar".

## Enfoque

**Calco de la referencia sobre la rejilla de roles de SpriteForge** (ni PNG en runtime ni
diseño libre). El juego no carga ningún PNG: la tortuga son rejillas de texto + paletas que
SpriteForge pinta al forjar el mundo de Agua.

> **Rev. 2 (prototipo):** reducir la referencia a 64×64 píxel a píxel da un resultado
> borroso (grietas y púas se vuelven ruido). Por eso la referencia fija **posiciones y
> colores** (medidos sobre la imagen), y el generador **dibuja** placas, púas, runa, cabeza y
> garras con formas nítidas. No hay script de extracción en el repo; la imagen queda como
> documentación de diseño.

## 1. Arte

- **Lienzo nativo 64×64 a escala 1:** receta `{ archetype: 'shelled', gridW: 64, gridH: 64,
  scale: 1, anim: { idle: 2, walk: 4 }, … }`. Partes con `res: 32` (factor 1 → un carácter
  = un píxel), todas a lienzo completo `w: 64, h: 64, anchor: (0,0)`. `Enemy` hace
  `setDisplaySize(radius*2)` = 64px → píxeles 1:1 en pantalla, hitbox sin cambios.
- **Capas (atrás → adelante):**

  | Parte | Paleta | Contenido |
  |---|---|---|
  | `turtle_legs` | `oliveskin` | 4 patas escamosas (mitad interior bajo el caparazón) |
  | `turtle_claws` | `hornbone` | garras en cono: dedos + codos |
  | `turtle_head` | `oliveskin` | cráneo + hocico, ceja pesada, fosas |
  | `turtle_shell` | `mossshell` | placas Voronoi (juntas `o`, bisel `h`/`s`, moteado, grietas `a`) |
  | `turtle_spikes` | `hornbone` | pirámides de 4 caras: cresta central + 3 por flanco |
  | `turtle_rune` | `bloodrune` | sigilo doble sobre las placas vertebrales |
  | `turtle_eyes` | `redeye` | ojos rojos rasgados bajo la ceja |

  Se descartó la capa de sombra: ningún otro sprite la usa.
- **Paletas nuevas** en `palettes.js` (muestreadas de la referencia y aclaradas para que se
  lean en juego): `mossshell`, `oliveskin`, `hornbone`, `bloodrune`, `redeye`. `hornbone`
  sustituye a `bone`, que es casi blanco; las púas de la referencia son hueso tostado.

## 2. Generador (`tools/gen-turtle.mjs`)

- Script de desarrollo en Node, determinista (ruido con hash entero). Dibuja cada pose y
  **escribe entero** `src/data/sprites/partsTurtle.js` (archivo GENERADO, no se edita a
  mano). Así se evita pegar ~1800 líneas a mano en `parts.js`.
- `partsTurtle.js` guarda solo la vista `down` (y sus frames). `up`/`side` se derivan al
  cargar con `src/data/sprites/gridTransform.js` (puro, testeado).
- `parts.js` importa `TURTLE_PARTS` y lo expande dentro de `PARTS`.
- `tools/preview-turtle.mjs` forja la receta REAL con SpriteForge y escribe un PNG ampliado
  (3 sentidos + 4 frames de caminar + idle) para revisar el diseño.

## 3. Animación

- **Idle (2 frames):** la cabeza entra y sale 1px (respiración). Partes animadas: `head`,
  `eyes`.
- **Walk (4 frames):** patas en diagonal alternada. A: delantera izquierda + trasera derecha
  +2px, las otras −1px, cabeza +1. B: neutro. C: la diagonal contraria. D: neutro.
  Partes animadas: `legs`, `claws`, `head`, `eyes`. Caparazón, púas y runa quedan fijos.
- **Orientación:** `down` = referencia (cabeza abajo). `up` = **giro de 180°** (no reflejo:
  la runa y el paso asimétrico se conservan correctamente). `side` = giro de 90° con la
  cabeza a la derecha; `FacingController` voltea con `flipX` para la izquierda.

## 4. Integración

- Eliminar `turtle_body`/`turtle_eye` de `parts.js` y su bloque de `tools/gen-aqua.mjs`
  (comentario de cabecera, entrada en `layers`, sección TORTUGA_ACORAZADA).
- Reemplazar la constante `TORTUGA` y la receta `tortuga_acorazada` en `recipes.js`, y
  actualizar el comentario "Turtle/crab carry their own green/red type colors".
- `COLORS.turtleGreen` y el def del enemigo no se tocan.

## 5. Verificación

- **Gate de diseño:** preview del prototipo mostrado al usuario antes de implementar, y un
  segundo preview de la forja real (`tools/preview-turtle.mjs`) antes del PR.
- **Tests:**
  - `gridTransform`: `rot180` y `rotHeadRight` sobre rejillas conocidas;
  - las paletas nuevas tienen 5 roles, con `shade` más oscuro y `highlight` más claro que `base`;
  - la receta forja 64×64 con `idle` = 2 y `walk` = 4 frames por sentido; los frames de
    caminar difieren; `up` = giro de 180° de `down` y `side` = giro de 90°; aparecen los
    colores de runa y ojos; ya no existen `turtle_body`/`turtle_eye`;
  - el generador es reproducible: al re-ejecutarlo, `git diff` sale limpio.
- `node --test` completo en verde.
- **In-game:** Playwright a 480×854 genera 2 tortugas en una partida de Agua, con captura y
  sin errores de consola.
