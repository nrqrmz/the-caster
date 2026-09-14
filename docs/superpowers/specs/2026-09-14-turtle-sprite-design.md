# Sprite de la Tortuga Acorazada — rediseño HD desde referencia

**Fecha:** 2026-09-14 · **Rama:** `feat/turtle-sprite` · **Estado:** diseño aprobado

## Objetivo

Sustituir el sprite simple actual de `tortuga_acorazada` (rejilla 21×26 escalada ×2, una
sola paleta verde) por una tortuga cenital detallada fiel a la referencia del usuario
(`tools/refs/tortuga-acorazada.png`): caparazón de placas musgo con grietas claras, púas de
hueso en cresta y bordes, runa roja sangre, cabeza oliva con ojos rojos brillantes y cuatro
patas con garras de hueso.

## Alcance

- La `tortuga_acorazada` solo aparece en **Agua nv6** (`src/data/regions.js`, oleada final,
  2 unidades). Ningún jefe la invoca. Cambiar su receta la cambia en todo el juego.
- **Fuera de alcance:** stats, IA, modificadores (`shielded`/`resist`), niveles, animación
  de "esconderse al cargar".

## Enfoque

**Conversión de la referencia a la rejilla de roles de SpriteForge** (no PNG directo, no
redibujo con primitivas). Así se conserva el pipeline: paletas por parte, forja perezosa por
mundo y frames autorados por parte.

## 1. Arte

- **Lienzo nativo 64×64 a escala 1:** receta `{ archetype: 'shelled', gridW: 64, gridH: 64,
  scale: 1, … }`; partes con `res: 32` (factor 1 → un carácter = un píxel del lienzo).
  Tamaño en pantalla = 64px, idéntico al actual → hitbox (`radius: 32`) sin cambios.
- **Capas (atrás → adelante), cada una con su paleta:**

  | Parte | Paleta | Contenido |
  |---|---|---|
  | `turtle_shadow` | `shadow` | sombra oscura bajo el cuerpo |
  | `turtle_legs` | `oliveskin` | 4 patas (piel); garras en `turtle_claws` |
  | `turtle_claws` | `bone` | garras de las 4 patas |
  | `turtle_head` | `oliveskin` | cabeza |
  | `turtle_shell` | `mossshell` | placas del caparazón + grietas (`h`/`a`) |
  | `turtle_spikes` | `bone` | púas de cresta y bordes |
  | `turtle_rune` | `bloodrune` | glifo rojo |
  | `turtle_eyes` | `redeye` | ojos rojos brillantes |

  (8 partes: las garras se separan de las patas porque cada parte tiene una sola paleta.)
- **Paletas nuevas** en `palettes.js`, con colores muestreados de la referencia:
  `mossshell`, `oliveskin`, `bloodrune`, `redeye`. Las púas y garras reutilizan `bone`
  y la sombra, `shadow`.

## 2. Conversión (`tools/gen-turtle.mjs`)

1. Paso previo de un solo uso (Python + PIL, `tools/refs/extract-turtle.py`): recorta el
   sprite de la referencia (sin cotas ni fondo), lo reduce a 64×64 por área y guarda
   `tools/refs/tortuga-acorazada-64.json` (matriz RGBA). Es solo herramienta de desarrollo;
   el runtime no la usa.
2. `gen-turtle.mjs` lee el JSON y clasifica cada píxel en **capa + rol** (`o/s/b/h/a`) por
   tono, luminosidad y región (fondo → transparente; rojo saturado → runa u ojo según la
   posición; beige claro → hueso; verde → caparazón o piel según la región).
3. Retoque manual en el generador (overrides por coordenada) para ojos, runa y púas, que
   es donde la reducción mete ruido.
4. Emite los bloques de las partes listos para pegar en `src/data/sprites/parts.js`,
   siguiendo la convención del resto de `gen-*.mjs`.

## 3. Animación

- **Idle (2 frames):** respiración; la cabeza entra y sale 1px.
- **Walk (4 frames autorados):** patas en diagonal alternada. Frame A: delantera izquierda
  y trasera derecha avanzan 2px. Frame B: neutro. Frame C: las otras dos avanzan. Frame D:
  neutro. Caparazón, púas, runa y sombra quedan fijos; la cabeza sigue el paso con ±1px.
  Las patas usan `anim.walk[dir]` y `anim.idle[dir]` en sus partes (patrón existente).
- **Orientación:** `down` = referencia (cabeza abajo). `up` = reflejo vertical. `side` =
  rotación de 90° con la cabeza a la derecha; el volteo a la izquierda lo hace
  `FacingController` con `flipX`. El generador deriva `up`/`side` de `down` para todos los
  frames.
- Receta: `anim: { idle: 2, walk: 4 }`.

## 4. Integración

- Eliminar `turtle_body` y `turtle_eye` de `parts.js` y su bloque de `tools/gen-aqua.mjs`
  (de ahí también la entrada en `layers` y el comentario de cabecera).
- Reemplazar la constante `TORTUGA` y la receta `tortuga_acorazada` en `recipes.js`.
- Actualizar el comentario de `recipes.js` ("Turtle/crab carry their own green/red type
  colors"): la tortuga pasa a paletas propias.

## 5. Verificación

- **Gate de diseño:** antes de pegar nada en `parts.js`, generar un preview PNG ampliado
  (3 sentidos + 4 frames de caminar + idle) y obtener el OK del usuario.
- **Tests** (`tests/sprites/`):
  - la receta forja a 64×64 (`width`/`height`) en `idle`/`walk` × `down`/`up`/`side`;
  - `walk` tiene 4 frames distintos (las patas se mueven) y el caparazón es idéntico entre
    ellos;
  - `up` es el reflejo vertical de `down`;
  - las 8 partes existen con `res: 32` y no quedan referencias a `turtle_body`/`turtle_eye`;
  - las 4 paletas nuevas tienen los 5 roles.
- `node --test` completo en verde.
- **In-game:** captura con Playwright de Agua nv6 con las tortugas moviéndose.
