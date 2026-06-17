# Proyectiles tipados + contención de cuerpo completo — Diseño

**Fecha:** 2026-06-16
**Branch sugerida:** sigue en `feat/pixel-art-hd` o una nueva `fix/projectiles-and-containment`.

## Problema

Dos defectos de juego en The Caster:

1. **Todos los proyectiles enemigos son flechas.** En `GameScene.executeAttack()` cada disparo
   enemigo se crea con `TEX.arrow` y un tinte naranja fijo, sin importar el enemigo. El
   comportamiento correcto es que cada enemigo lance su propio tipo de proyectil (flecha, fuego,
   hielo, veneno…), coherente con su naturaleza.
2. **Enemigos a medio salir de pantalla.** `containEnemy()` clampa el **centro** del enemigo a
   `[0, GAME_WIDTH] × [0, GAME_HEIGHT]`, lo que permite que medio cuerpo quede fuera o escondido en
   el borde. El jugador no puede planear sus movimientos contra enemigos que no ve completos. Todos
   los enemigos —incluidos jefes— deben mostrar su cuerpo completo dentro de la pantalla.

## Decisiones de diseño (cerradas con el usuario)

- **Tipo de proyectil = visual + efecto implícito.** Cada tipo trae su efecto por defecto; no es
  solo cosmético.
- **Catálogo inicial:** `arrow` (sin efecto), `fire` (quemadura/DoT), `ice` (ralentiza),
  `poison` (DoT). `orb` arcano queda deferido.
- **Asignación por ataque, con default por elemento del mundo.** Un ataque puede declarar
  `projectile: 'ice'`; si lo omite, hereda el default del mundo.
- **Contención de cuerpo completo aplica a todos**, incluidos minibosses/bosses.
- **Margen de seguridad** (~10px) extra al radio, para que nada quede pegado al borde ni bajo el HUD.

## Arquitectura

Respeta la separación Phaser / lógica pura del proyecto: toda decisión testeable vive en módulos
sin dependencia de Phaser (`src/data/`, `src/systems/`); las escenas solo orquestan.

### A. Proyectiles tipados

#### Módulo de datos puro nuevo: `src/data/projectiles.js`

Sin Phaser (importa solo `TEX`/`COLORS` de `config.js`, que es Phaser-free).

```js
export const PROJECTILES = {
  arrow:  { tex: TEX.arrow,      tint: COLORS.arrow,    effect: null },
  fire:   { tex: TEX.fireball,   tint: COLORS.fireball, effect: { kind: 'burn', dps: 6, ms: 2000 } },
  ice:    { tex: TEX.iceShard,   tint: COLORS.ice,      effect: { kind: 'slow', factor: 0.6, ms: 1200 } },
  poison: { tex: TEX.poisonGlob, tint: COLORS.poison,   effect: { kind: 'dot',  dps: 5, ms: 2500 } },
};

export const ELEMENT_DEFAULT_PROJECTILE = {
  fire: 'fire', water: 'ice', air: 'arrow', earth: 'arrow', castle: 'arrow',
};

// att.projectile gana; si no, default del mundo; si no, 'arrow'.
export function resolveProjectile(att, element) {
  return (att && att.projectile) || ELEMENT_DEFAULT_PROJECTILE[element] || 'arrow';
}
```

Los parámetros de efecto por defecto se centralizan aquí como constantes y replican el
comportamiento actual: `burn dps:6 ms:2000` (= defaults de `onHitBurn` en `executeAttack`),
`slow factor:0.6 ms:1200` (= defaults de `applyCasterSlowFx`). El `poison dot:5 ms:2500` es nuevo
(no existía proyectil de veneno); valor conservador, ajustable en tuning.

#### Datos de enemigos: `src/data/enemies/fire.js`, `water.js`

Cada ataque puede declarar `projectile: 'fire' | 'ice' | 'poison' | 'arrow'` (opcional). Si lo
omite, hereda el default del mundo (`fire → fire`, `water → ice`). Solo se etiqueta explícitamente
donde el tipo difiere del default (p. ej. los sapos de veneno en el mundo de agua).

**Migración de modifiers:** los enemigos que hoy usan el modifier `onHitSlow` pasan a
`projectile: 'ice'` y se elimina el modifier redundante; igual `onHitBurn → 'fire'`. Así el efecto
no se aplica dos veces.

#### Sprites: `src/data/sprites/recipes.js` + `parts.js`

- `fire` **reusa** el sprite `fireball` existente.
- `arrow` queda igual.
- Se añaden dos recetas procedurales pequeñas: **esquirla de hielo** (`iceShard`) y **gota de
  veneno** (`poisonGlob`), con sus claves en `config.js` `TEX` y sus colores en `COLORS`
  (`COLORS.ice`, `COLORS.poison` ya existen).

#### `src/systems/ProjectilePool.js`

`fire(texKey, …)` resuelve la textura vía `PROJECTILE_KEY`/recetas. Se extiende el mapa de
resolución para incluir `iceShard` y `poisonGlob` (y se confirma `fireball`/`arrow`).

#### `src/scenes/GameScene.js` — `executeAttack`

Se elimina el `TEX.arrow` + `setTint(COLORS.fireball)` fijo. Nuevo flujo:

1. `const type = resolveProjectile(att, this.regionElement)` (el elemento del mundo se lee del
   region/levelBuilder ya disponible en la escena).
2. `const spec = PROJECTILES[type]`.
3. Dispara con `spec.tex`, aplica `shot.setTint(spec.tint)`.
4. Setea las props de efecto en el disparo según `spec.effect`:
   - `burn` → `shot.burnDps`, `shot.burnMs` (ruta ya existente, líneas 118 / 532).
   - `slow` → `shot.slowFactor`, `shot.slowMs` (la ruta de aplicación ya existe, línea 119).
   - `dot` (veneno) → se añade la ruta de DoT de veneno, que reusa el mecanismo de daño-por-tiempo
     del burn pero con semántica/feedback propio (tinte/flash verde).

El golpe disparo↔caster ya aplica burn y slow al caster; solo se añade el caso `dot` de veneno.

### B. Contención de cuerpo completo

#### Helper puro nuevo: `src/systems/clampBodyInside.js`

```js
// Devuelve {x, y} para que el cuerpo (halfW × halfH) quede completo dentro de
// [0,W] × [0,H], con un margen extra contra los bordes.
export function clampBodyInside(x, y, halfW, halfH, W, H, margin = 0) {
  return {
    x: clamp(x, halfW + margin, W - halfW - margin),
    y: clamp(y, halfH + margin, H - halfH - margin),
  };
}
```

(Si los límites se cruzan en cuerpos enormes, el clamp degrada al centro del eje — caso no
esperado con los tamaños actuales, pero se cubre en tests.)

#### `src/scenes/GameScene.js` — `containEnemy(e)`

```js
const halfW = (e.displayWidth  || e.def.radius * 2) / 2;
const halfH = (e.displayHeight || e.def.radius * 2) / 2;
const { x, y } = clampBodyInside(e.x, e.y, halfW, halfH, GAME_WIDTH, GAME_HEIGHT, ENEMY_MARGIN);
e.x = x; e.y = y;
```

- `halfW/halfH` del tamaño real del sprite (`displayWidth/Height`), con fallback a `def.radius*2`.
- `ENEMY_MARGIN` (~10px): constante nueva en `config.js`.
- Aplica a **todos** los enemigos vivos (el bucle de la línea ~652 ya los itera, incluido el boss).
  El boss spawnea en `y=-40` y hoy ya hace "pop" al borde en el primer frame; con el cambio hará pop
  con cuerpo completo dentro. No hay tween de entrada que romper.

#### Consistencia: `src/systems/EnemyBrain.js` (burrow)

El reposicionamiento del `burrow` ya clampa por radio (líneas ~121-122). Se alinea al mismo margen
para que el enemigo emergente tampoco quede pegado al borde.

## Flujo de datos (proyectiles)

```
attack.projectile  (o default por elemento del mundo)
  → resolveProjectile()                 [puro, testeable]
  → executeAttack(): textura + tinte + props de efecto en el disparo
  → overlap disparo ↔ caster: aplica burn / slow / dot   [infra mayormente existente]
```

## Testing

`node --test` (solo lógica pura):
- `resolveProjectile`: override por ataque, defaults por cada elemento, fallback a `arrow`.
- `PROJECTILES`: forma de la tabla y presencia de efecto correcto por tipo.
- `buildProjectiles` / tagging: que el tipo se propague a cada spec disparado.
- `clampBodyInside`: cada borde, cada esquina, respeto del margen, y degradación con cuerpo > área.

Prueba manual en viewport móvil portrait:
- Mundo de fuego dispara proyectiles de fuego; agua dispara hielo; sapos disparan veneno; arqueros
  genéricos disparan flechas.
- Efectos correctos al jugador (quema / ralentiza / DoT).
- Ningún enemigo —incluidos jefes— queda con cuerpo fuera o pegado al borde.

## Alcance

**Incluido:** los 4 tipos de proyectil con efecto, asignación por ataque + default por mundo,
sprites nuevos de hielo/veneno, contención de cuerpo completo con margen para todos los enemigos.

**Fuera de alcance (deferido):**
- `orb` arcano enemigo (trivial de añadir luego: una entrada en `PROJECTILES` + receta).
- Mundos `air`/`earth` (aún no construidos; default `arrow`).
- Rebalanceo numérico de enemigos más allá de la migración `onHit*` → tipo, que preserva el efecto.

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `src/data/projectiles.js` | **nuevo** — tabla `PROJECTILES`, defaults por elemento, `resolveProjectile` |
| `src/systems/clampBodyInside.js` | **nuevo** — helper puro de clamp de cuerpo |
| `src/config.js` | `TEX.iceShard`, `TEX.poisonGlob`, `ENEMY_MARGIN` |
| `src/data/sprites/recipes.js`, `parts.js` | recetas esquirla de hielo + gota de veneno |
| `src/data/enemies/fire.js`, `water.js` | tags `projectile` + migración `onHit*` → tipo |
| `src/systems/EnemyBrain.js` | margen en reposicionamiento del burrow |
| `src/systems/ProjectilePool.js` | resolución de textura para tipos nuevos |
| `src/scenes/GameScene.js` | `executeAttack` (tipo→tex/tinte/efecto), `containEnemy` (cuerpo completo), ruta DoT veneno |
| `tests/` | tests de `resolveProjectile`, `PROJECTILES`, `clampBodyInside`, tagging |
