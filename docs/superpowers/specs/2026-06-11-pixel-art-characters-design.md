# Pixel-art de personajes — diseño

**Fecha:** 2026-06-11
**Estado:** aprobado (pendiente de plan de implementación)
**Enfoque:** A — recetas de sprite paramétricas

## Objetivo

Sustituir las texturas geométricas (círculos/diamantes) por **personajes pixel-art
reconocibles, animados y a 4 direcciones**, generados **proceduralmente en el arranque**
a partir de *recetas de sprite paramétricas*, **sin tocar la lógica de juego**
(combate, brains, fases, economía, skill tree).

Alcance de este esfuerzo (todo de una):

- **Héroe** (la sorceress).
- **Todo el roster de fuego** (cultistas, bestias, invocados/ambiente) + bosses (incl. trío de hermanas).
- **Todo el roster de agua** (~20 criaturas) + 5 bosses de agua.
- **Proyectiles** (orb básico, fireball, flecha/arrow y los disparos enemigos que reusan esas claves).

Lo que **no** entra: rehacer telegraphs de ataque, zonas de AoE, partículas/efectos,
ni la textura del templo (`TEX.temple` se queda como diamante).

## Restricciones que se respetan

- **Sin build step.** Todo ES modules + Phaser CDN. Nada de bundlers ni paquetes npm en runtime.
- **Arte procedural en `BootScene`.** Se sigue generando textura por código; las claves de
  textura siguen centralizadas (nunca inline).
- **Lógica libre de Phaser sigue libre de Phaser.** La generación de frames es pura y testeable.
- **Móvil/retrato 480×854.** Tamaños de sprite escalados a la huella visual actual.

## Arquitectura

### Módulos nuevos PUROS (sin import de Phaser → `node --test`)

- **`src/data/sprites/palettes.js`**
  Paletas con *roles* de color: `outline`, `base`, `shade`, `highlight`, `accent`.
  Por defecto, cada criatura **deriva su paleta de su `color` actual** (de `enemies`/`bosses`):
  `shade` = oscurecer, `highlight` = aclarar, `outline` = casi negro, `accent` = override opcional.
  Función `derivePalette(baseColor, overrides?) → { outline, base, shade, highlight, accent }`.
  Paletas con nombre solo para casos especiales (héroe, bosses).

- **`src/data/sprites/parts.js`**
  La **librería de piezas**. Cada pieza es un *stamp*: un grid pequeño de índices de rol
  (`0` = transparente, `1..N` = roles de paleta), con variantes por dirección donde aplica
  (`{ down, up, side }`) y, para miembros animados, por frame.
  Categorías mínimas:
  - **Cuerpos:** humanoide-con-túnica, cuadrúpedo-bestia, blob, pez, crustáceo/tortuga,
    serpiente, flotante.
  - **Cabezas** (front/back/side) y **tocados:** capucha, sombrero de pico, corona, cuernos.
  - **Miembros:** patas (2 fases de andar), brazos, tentáculos, aletas, alas.
  - **Detalles:** ojos, **accesorios** (báculo, tótem, escudo, caparazón).
  Cada pieza declara su tamaño y su *anchor* (punto de anclaje) para componer.

- **`src/data/sprites/recipes.js`**
  Mapea cada `key` de criatura → receta:
  ```js
  {
    archetype: 'humanoid' | 'beast' | 'blob' | 'fish' | 'shelled' | 'serpent' | 'floating' | 'hero' | 'boss',
    size: 16 | 24 | 32 | 48,          // lado del grid (cuadrado)
    parts: ['body_robe', 'head_hood', 'eyes_dot', 'staff'],  // orden de composición (atrás→delante)
    colorRoles: { /* override opcional de mapeo pieza→rol */ },
    palette: 'frost' | undefined,      // nombre opcional; si no, derivada del color
    anim: { idle: 2, walk: 2 },        // nº de frames por anim
  }
  ```
  Héroe y bosses llevan recetas a medida con piezas más ricas. El resto reutiliza
  piezas por arquetipo + la paleta derivada del `color` que ya tienen en sus defs.

- **`src/systems/SpriteForge.js`** — **PURO**, el corazón del sistema.
  `forge(recipe, palette) → { size, anims: { 'idle-down': [grid,…], 'walk-side': [grid,…], … } }`
  donde cada `grid` es una matriz `size×size` de **colores resueltos** (entero `0xRRGGBB` o
  `null`/`-1` para transparente).
  Responsabilidades:
  - Componer las piezas del arquetipo sobre un grid según su `anchor`.
  - **Derivar direcciones:** `down` (frente), `up` (espalda: oculta cara/ojos, usa variante back),
    `side` (perfil; la izquierda se obtiene en runtime con `flipX`).
  - **Derivar frames de andar:** desplazar/alternar las piezas de miembros (offset de patas,
    bob vertical) entre fases; `idle` = bob sutil de 2 frames.
  - Resolver la paleta (índice de rol → color concreto).
  Para criaturas orgánicas donde "espalda vs frente" es sutil (serpiente, medusa, blob),
  `up` puede igualar a `down` con un ligero matiz; sigue habiendo `side` + flip.

### Capa acoplada a Phaser (integración)

- **`src/scenes/BootScene.js`** — nuevo `buildSprites()`:
  - Recorre todas las recetas; para cada una llama a `SpriteForge.forge`.
  - **Pinta cada frame** a una textura tipo spritesheet por criatura (vía `Graphics`/
    `generateTexture`, un frame por celda), bajo la clave `spriteKey(key)`.
  - **Registra las animaciones de Phaser:** `<key>-idle-down`, `<key>-idle-up`, `<key>-idle-side`,
    `<key>-walk-down`, `<key>-walk-up`, `<key>-walk-side` (la izquierda reusa `-side` + flip).
  - Sigue generando los proyectiles y el templo (ver "Proyectiles").

- **`src/objects/` — capa fina de presentación (lo único cercano a la lógica; 100% cosmético):**
  - **`FacingController`** (helper nuevo, p.ej. `src/objects/FacingController.js`):
    dado un `velocity` (y opcionalmente un `target` al disparar), elige `dir ∈ {down,up,side}`
    y `flipX`, y reproduce la anim `walk`/`idle` correspondiente. Reglas:
    - |vx| > |vy| → `side`, `flipX = vx < 0`.
    - vy < 0 → `up`; vy ≥ 0 → `down`.
    - velocidad ≈ 0 → `idle` en la última dirección.
    - El héroe, al auto-disparar sin moverse, encara al `target`.
  - **`Caster`, `Enemy`, `Boss`:** se construyen con su textura por-criatura (si tienen receta)
    y en su `update`/`think`-execute llaman al `FacingController`. **No cambia ninguna decisión
    de combate, daño, movimiento o fases.**

- **Tamaño/físicas:** cada sprite se escala con `setDisplaySize` para que su huella case con el
  `radius` de la criatura; **el body de Arcade Physics se deja igual** (mismo hitbox) → colisiones
  y gameplay idénticos.

### Proyectiles

`ProjectilePool` (Phaser-coupled) recicla un grupo y usa `TEX.orb`, `TEX.fireball`, `TEX.arrow`,
compartidos por disparos del jugador y de enemigos.

- **`orb`** (~8×8): orbe luminoso con *twinkle* de 2 frames (anim radial, sin direcciones).
- **`fireball`** (~16×16): bola de fuego con *flicker* de 2–3 frames; rota hacia la velocidad
  (`setRotation(angle)`).
- **`arrow`** (~12 largo): flecha direccional de 1 frame; rota hacia la velocidad.
- Los disparos enemigos reutilizan estas mismas claves/anims.

Integración: `BootScene` genera estas texturas/anims vía el mismo `SpriteForge` (recetas de
proyectil simples, sin sets de 4 direcciones). `ProjectilePool.fire()` reproduce la anim y, para
`fireball`/`arrow`, fija la rotación a partir del vector de disparo. El radio del body de físicas
no cambia.

### Estrategia de claves de textura

- Hoy los enemigos **comparten** textura + `setTint(color)`. Ahora cada criatura necesita la **suya**
  para tener silueta propia.
- Helper centralizado en `config.js`: **`spriteKey(key) → 'spr_<key>'`** (nunca se inline una clave).
- `def.tex` pasa a ser *legacy*: **si la criatura tiene receta, manda la receta**; si no, *fallback*
  a forma compartida + tinte (comportamiento actual). → **rollout incremental, el juego nunca se rompe.**
- Las claves `TEX` actuales (orb/fireball/arrow/temple y las formas de fallback) se conservan.

## Flujo de datos

```
BOOT:  recipes ─▶ SpriteForge.forge(recipe, palette) ─▶ frames (grids de color)
              ─▶ BootScene pinta spritesheets (spriteKey) + registra anims de Phaser

RUN:   objeto creado con su textura por-criatura (o fallback si no hay receta)
       cada frame: FacingController lee velocity/target ─▶ play(anim) + flipX
       combate / brains / fases  ──  INTACTOS
```

## Fidelidad

- **Tamaño de grid (atado a `radius`):** *minions* **16×16**, criaturas grandes/minibosses **24–32**,
  **bosses 32–48**. Proyectiles 8–16.
- **Paleta:** 4–5 roles por criatura, **auto-derivados del `color`** existente; overrides con
  nombre para héroe y bosses.
- **Animación:** `idle` (bob sutil, 2 frames) + `walk` (2 frames; ampliable a 4 en pulido).
  Frame-rate de anim modesto (p.ej. 4–6 fps) acorde al look chunky.
- **Direcciones:** `down`/`up`/`side` con `flipX` para la izquierda (modelo de 4 direcciones).

## Testing (solo lógica pura, `node --test`)

Tests sobre `SpriteForge`, `recipes`, `parts`, `palettes`:

1. **Paridad de recetas:** toda `key` de `ENEMY_TYPES` + todos los bosses (fuego+agua) + héroe +
   proyectiles tienen receta. (Evita arte faltante; falla si se añade una criatura sin sprite.)
2. **Set de frames:** `forge` devuelve las anims esperadas; cada grid es `size×size`; el nº de
   frames de cada anim casa con `recipe.anim`.
3. **Direcciones distintas:** el frame `up` (espalda) difiere de `down` para arquetipos humanoides/
   bestia; existe `side`.
4. **Animación distinta:** los frames de `walk` difieren entre sí y del `idle`.
5. **Resolución de paleta:** todo rol referido por toda pieza resuelve a un color concreto (nada
   `undefined`); `derivePalette` produce los 5 roles para un color dado.
6. **Integridad de piezas:** toda pieza referida en una receta existe en `parts.js` con su tamaño/anchor.

`BootScene`/objetos/`ProjectilePool` se verifican **visualmente** corriendo el juego
(`python3 -m http.server 8000`), y opcionalmente con capturas Playwright más adelante.

## Forma del plan de implementación

Aunque el alcance es "todo de una", el plan se secuencia para ser seguro y revisable;
**cada paso deja el juego jugable y los tests en verde** (el *fallback* cubre lo aún no migrado):

1. **Core puro:** `palettes` + `parts` (librería inicial) + `SpriteForge` + tests. Sin cambio visible.
2. **Integración + héroe:** `spriteKey`, `BootScene.buildSprites`, `FacingController`, héroe
   end-to-end. **Primer resultado visible** → validar el look y el facing.
3. **Proyectiles:** recetas orb/fireball/arrow + integración en `ProjectilePool`.
4. **Roster de fuego:** recetas de cultistas, bestias, invocados + bosses/trío de hermanas.
5. **Roster de agua:** recetas de cultistas, bestias, ambiente + 5 bosses.
6. **Pulido:** paletas, timing de andar, walk a 4 frames donde luzca; test de paridad verde para
   todas las claves.

## Riesgos / honestidad

- El pixel-art por código será **limpio, legible y estilizado** — no pixel-art artesanal a mano.
  Estilo objetivo: "criaturas pixel *chunky* y legibles".
- La **librería de piezas es el palo largo**: lograr siluetas suficientemente distintas entre
  ~40 criaturas es el trabajo real; los arquetipos + accesorios + paleta son la palanca.
- En criaturas orgánicas la diferencia espalda/frente es sutil; se acepta `up≈down` + `side`/flip.
- Riesgo de regresión visual de hitbox: mitigado dejando el body de físicas intacto y solo
  escalando `displaySize`.
