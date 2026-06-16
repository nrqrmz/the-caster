# Pixel art HD (32×32) + hero + tamaños — diseño

**Fecha:** 2026-06-16
**Estado:** aprobado (brainstorming)
**Sub-proyecto:** C de la tanda previa a los mundos Aire/Tierra
(orden: B dificultad ✅ → A i18n ✅ → **C pixel art** → D animaciones).

Mockups de referencia (companion visual, en `.superpowers/brainstorm/.../content/`):
`hero-princess-v2.html` (hero final), `quality.html` (decisión de grilla).

## Problema

Todo el arte se genera proceduralmente en una grilla **fija de 16×16**
(`DESIGN=16` en `SpriteForge`). El `size` del recipe solo **escala** esa grilla
(pixel-doubling), no agrega detalle. Tres dolores:

1. **Calidad**: 16×16 no da para sombreado/brillo/formas finas. Queremos el nivel
   de detalle de la princesa para **todo** el roster.
2. **Hero**: hoy es una maga genérica con sombrero de bruja. Debe ser una
   **princesa pelirroja** (heredera al trono), hermosa, cabello largo suelto,
   vestido verde, sin sombrero.
3. **Tamaños / targeting**: enemigos chicos (medusas y, peor, las **medusas
   divididas**) quedan diminutos e intargeteables. El auto-apuntado va al enemigo
   más cercano, pero el tamaño visible y el hitbox salen de `def.radius`
   (`display = radius×2`), y la cría es `radius×0.7` de una medusa ya pequeña.

Además, el sistema de color usa **una sola paleta de 5 roles por criatura**
(base + sombra + brillo + acento + contorno), insuficiente para una hero
multicolor (piel + cabello rojo + vestido verde + dorado + orbe).

## Decisiones (del brainstorming)

1. **Grilla 32×32** (`DESIGN=32`), máximo detalle.
2. **Calidad nativa 32 para TODOS** los enemigos, no solo más grandes. Un solo
   sub-proyecto, ejecutado **en oleadas** por familia de pieza.
3. **Hero = princesa pelirroja** (ver mockup `hero-princess-v2.html`): melena roja
   larga y suelta, hombros descubiertos, **brazos visibles** (uno sostiene el
   báculo, otro libre), vestido verde en **triángulo isósceles**, cintura marcada
   con cinturón dorado, rasgos finos, báculo con orbe.
4. **Tamaños**: escala global **×1.5** en `def.radius`; **piso duro radius ≥ 16**
   (~32px); crías de split = `padre×0.7` pero nunca < 16; hitbox físico = tamaño
   visible. Texturas a tiers nuevos para que queden crujientes.

## Arquitectura

### Andamio de migración (clave para hacerlo incremental sin romper el juego)

Subir `DESIGN` a 32 rompería las ~36 piezas (autoradas para 16). Para migrar pieza
por pieza con el juego **siempre corriendo**:

- Cada parte declara `res` (default **16** = legacy). En `composeGrid`, una parte
  con `res < DESIGN` se **auto-escala** ×(`DESIGN/res`) (filas y `anchor`
  multiplicados, nearest-neighbor). Resultado: las piezas viejas se ven **igual que
  hoy** pero ya pobladas en la grilla 32.
- Redibujar una pieza = reautorarla a **`res: 32`** con detalle real. El juego nunca
  queda roto: una pieza está auto-escalada-16 o nativa-32, ambas válidas.
- **Estado final del proyecto: todas las piezas a `res: 32` nativo.** El andamio es
  transitorio, no un atajo para evitar el redibujo.

### Paletas por-pieza (habilita el multicolor)

Hoy `forge(recipe, parts, palette)` resuelve **todas** las partes contra una sola
paleta. Extensión:

- Un part-ref en `recipe.parts` (forma objeto `{ name, ... }`) o la propia parte
  puede declarar su **propia paleta**: `{ name, palette: 'skin' }` o
  `{ name, color: 0x2e8b57 }` (deriva 5 roles de ese color), con `accent`/overrides
  opcionales.
- `forge` resuelve **cada parte con su paleta** (la del part-ref si existe, si no la
  del recipe). Compatibilidad total: las partes sin override usan la paleta del
  recipe como hoy.
- Nuevas paletas nombradas: `skin`, `redhair`, `greengown`, `gold`, `orbblue`
  (`palettes.js`), más las que pidan los enemigos al redibujarse.

### Tamaños de textura (`scale`)

`scale = recipe.scale ?? (recipe.size / DESIGN)`. Con `DESIGN=32`, los `size` de
recipes pasan a tiers de textura **32 / 48 / 64 / 96** (mob normal / grande /
miniboss / boss). El tamaño **en pantalla** lo sigue gobernando `def.radius`
(`display=radius×2`); el `size` solo fija la resolución de la textura (nitidez).

### Hero (princesa, nativa 32)

Piezas nuevas `res:32`, cada una con su paleta por-pieza:
- `body_gown` — bodice + falda triángulo isósceles, cinturón dorado (talle),
  paleta `greengown` (+ ribete `gold`). El "caminar" usa el `legShift` existente
  → vaivén de la falda.
- `hair_long` — melena roja larga y voluminosa (paleta `redhair`), con brillo.
- `arm_staff` + `arm_free` — brazos (piel), uno al báculo, otro libre.
- `head_princess` — cabeza de rasgos finos (paleta `skin`; ojos/cejas/labios).
- `staff` (madera) + orbe (paleta `orbblue`) — reusa/ajusta la pieza actual.
Se **quita `hat_witch`** del recipe de la hero. El recipe `hero` deja de usar la
paleta mono `hero`; sus partes traen paleta propia.
> Nota: el *balanceo de brazos por-frame* (que se vio en el mockup) es animación
> rica que cae en **Sub-proyecto D**. C entrega la hero hermosa con brazos
> visibles + vaivén de falda (modelo de animación actual: idle bob + `legShift`).

### Redibujo del roster — oleadas

Cada oleada redibuja una **familia de piezas** a `res:32` (todas las recetas que
las usan suben de calidad de golpe). Orden sugerido (cada una independiente, el
juego sigue corriendo por el andamio):

1. **Motor + andamio + paletas por-pieza** (fundación, sin arte nuevo aún).
2. **Tamaños / targeting** (tuning de `def.radius`; win funcional temprano).
3. **Hero + proyectiles** (`body_gown`, `hair_long`, `arm_*`, `head_princess`;
   `orb_body`, `flame_body`, `arrow_body`).
4. **Humanoides** (`body_robe`, `body_armor`, `head_round`, `head_hood`,
   `eyes_dots`, `staff`, `banner`, `crown`).
5. **Bestias / blobs / elementales** (`body_beast`, `body_blob`, `body_winged`,
   `body_totem`, `horns`, `crest_flame`, `eye_single`).
6. **Criaturas de agua** (`body_jelly`, `body_fish`, `fin`, `body_serpent`,
   `body_shell`, `body_frog`, `frog_egg`, `tadpole_tail`, `body_bubble`).
7. **Bosses** (`body_sister`, `body_ignatius`, `body_kraken`, `body_whale`).

### Tamaños / targeting (datos de enemigos)

- En `src/data/enemies/*`: `def.radius` × **1.5** (escala global), redondeado.
- **Piso duro: `radius` final ≥ 16** para todo enemigo.
- Split (`splitsOnDeath` → cría): `radius_padre × 0.7`, con **clamp a 16**.
- Hitbox físico = tamaño visible (`Enemy` ya hace `setDisplaySize(radius*2)`;
  asegurar que el cuerpo de Arcade siga ese tamaño).
- Texturas de los recipes a los tiers nuevos para que el upscale a `radius*2` sea
  nítido (nearest-neighbor).

## Flujo de datos

```
recipe + parts(res 16|32) + paletas(por-pieza o del recipe)
  → SpriteForge.forge (auto-escala res<DESIGN; resuelve cada parte con su paleta)
  → textura DESIGN*scale  →  BootScene genera la textura
Enemy: display = def.radius×2 (≥16 piso); hitbox = display
```

## Pruebas (`node --test`, `SpriteForge` es puro)

`tests/SpriteForge.test.js` (extender) y `tests/sprites.*` (paridad existente):

1. **Auto-escala**: una parte `res:16` se compone ocupando ×2 su tamaño en una
   grilla `DESIGN=32` (verificar dims/anchor escalados).
2. **Nativa 32**: una parte `res:32` se compone 1:1.
3. **Paleta por-pieza**: dos partes con paletas distintas resuelven a colores
   distintos en el mismo sprite; una parte sin override usa la del recipe.
4. **`scale` / tiers**: `size:64` con `DESIGN=32` → `scale 2` → textura 64.
5. **Paridad** (patrón existente): toda receta en `RECIPES` forja sin error tras la
   migración (ningún part faltante, ninguna paleta nombrada inexistente).
6. **Tamaños**: el helper puro que arma las crías de split (`buildSplitChildren`)
   aplica `padre×0.7` con **clamp a 16**; y un test recorre `ENEMY_TYPES`
   verificando que ningún `def.radius` final quede < 16 tras la escala ×1.5.

## Fuera de alcance

- **Sub-proyecto D** (animaciones): balanceo de brazos por-frame, whirlpool del
  kraken animado, áreas de lava como fuego. C es **look estático + animación
  actual** (idle bob + `legShift`).
- Rediseñar la lógica de juego, hitboxes por-forma de boss más allá del tamaño,
  o el sistema de partículas.
- Cambiar el formato de autoría (sigue siendo grillas de role-chars o/b/s/h/a).

## Notas de ejecución

- Plan **largo**: ~una tarea por pieza/familia. El andamio garantiza que cada
  tarea deja el juego corriendo (smoke test por oleada).
- Mantener la convención: claves de textura/paleta centralizadas; `SpriteForge` y
  `recipes.js`/`parts.js`/`palettes.js` permanecen puros y testeables.
