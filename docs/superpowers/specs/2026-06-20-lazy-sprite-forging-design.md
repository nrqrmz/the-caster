# Forja perezosa de sprites por mundo + IntroScene

**Fecha:** 2026-06-20
**Estado:** Diseño aprobado, listo para plan de implementación
**Tipo:** Fix de rendimiento de arranque (no es feature de gameplay)

## Problema

Al abrir la URL del juego, el jugador ve una **pantalla negra de ~3.5 s en desktop** (y un estimado **10–15 s en un móvil de gama media**, que es el target real del juego) antes de que aparezca el menú.

### Diagnóstico medido (Playwright, headless, instrumentando `BootScene`)

| Fase | Tiempo (desktop) | Qué es |
|---|---|---|
| Descarga de Phaser (CDN) | 29 ms | red |
| Init Phaser + descarga de módulos JS → empieza `BootScene` | 245–670 ms | el "código" |
| **Forjado de los 129 sprites** | **3 115–3 222 ms** | 🔴 culpable (>96%) |
| **Total hasta menú jugable** | **~3.4–3.9 s** | |

La causa **no es la red**: todo el JS son 131 KB gzip y no hay ni un PNG (los sprites se generan en runtime). El cuello de botella es que `BootScene.create()` **forja los 129 sprites de los 5 mundos de una sola vez, sincrónicamente** (1 683 generaciones de textura vía `Graphics.generateTexture`, todo en el hilo principal) **antes** de mostrar el menú. El menú no aparece hasta forjar el último sprite del castillo, aunque el jugador nunca lo visite esa sesión.

### Costo real por mundo (medido, set de Fuego = 20 sprites)

| | Desktop | Móvil gama media (×3–5) |
|---|---|---|
| Forja de un mundo (Fuego) | **678 ms** (260 texturas) | ~2 – 3.4 s |

Las texturas viven en el `TextureManager` global del `Phaser.Game`, **no por escena**: una vez forjado un mundo queda cacheado toda la sesión (hasta recargar la página). Hoy nadie las elimina.

## Objetivo

Sacar el forjado masivo del arranque. Forjar **solo lo mínimo** en boot (menú ágil) y forjar **el set de cada mundo bajo demanda**, enmascarado tras una pantalla de introducción narrativa, de modo que el jugador nunca perciba un freeze.

### Criterios de aceptación

- **Boot → menú jugable: objetivo < 600 ms en desktop** (validar en implementación; hoy ~3.5 s).
- Primera entrada a un mundo: la forja (~0.7 s desktop / ~2–3 s móvil) queda **completamente solapada** por la lectura de la intro. La pantalla de loading de respaldo solo aparece si el jugador pulsa "Continuar" antes de que termine la forja.
- **Revisita a un mundo ya visitado: instantánea** (texturas en caché; la intro es saltable sin espera).
- Cero regresiones visuales: todo sprite que hoy se ve, se sigue viendo (mismas texturas, mismas anims).
- La suite `node --test` sigue verde y gana cobertura nueva en la parte pura.

## Diseño

Tres piezas: **(1)** un manifiesto puro que dice qué sprites necesita cada región, **(2)** un servicio de forja reutilizable y troceado, **(3)** una `IntroScene` que enmascara la forja del mundo al entrar.

### Flujo de escenas (cambio)

```
ANTES:  Boot(forja TODO) → Menu → Map → [portal] → Branch → Game
DESPUÉS: Boot(forja CORE) → Menu → Map → [portal] → Intro(forja MUNDO) → Branch → Game
```

**Solo los 4 portales elementales pasan por `IntroScene`.** El portal del **castillo** va directo a `Branch` como hoy: su manifiesto es ⊆ core (waves genéricas + bosses geométricos → nada que forjar bajo demanda), y ya tiene su propio `onEnter` narrativo en `castle_1` (`regions.js:243`), que se conserva intacto.

El portal de `MapScene` es el **único** punto de entrada a un mundo elemental en una sesión (`MapScene.js:33,39` → `scene.start('Branch', {regionId})`). Insertamos `IntroScene` entre el portal y `Branch`. Como tras morir se vuelve `Game → Branch` (no a Map), y al recargar la página se pasa de nuevo por el portal, **la primera vez que se toca un mundo en una sesión siempre pasa por su IntroScene** → no hay forma de llegar a un `Game` con sprites sin forjar.

### Pieza 1 — Manifiesto de sprites por región (puro, testeable)

Nuevo módulo `src/data/spriteManifest.js` (sin Phaser):

```js
regionSpriteKeys(region) -> Set<string>   // claves de recipe que la región necesita
```

Recorre `region.levels[].phases[]` y junta:
- `wave` → `spawns[].type`
- `miniboss` → `enemyDef.key`
- `levelBoss` → `enemyDef?.key` + `bosses[].key`
- `templeBoss` → `enemyDef.key`
- `minions` → `minions[].type` (en cualquier fase)

Luego **resuelve invocaciones transitivamente** hasta punto fijo:
- enemigos (`ENEMY_TYPES[type].attacks[]`) con `{type:'summon', spawnType | spawnTypes}`
- bosses (objeto boss `.phases[].sequence[]`) con `{do:'summon', spawnType | spawnTypes}`

Esto da el set **exacto**: incluye invocados (p. ej. `imp_brasa`, `brasa_errante`) y **excluye automáticamente** defs que el roster declara pero ninguna oleada/boss usa (en Fuego: `encapuchado_pira`, `portaestandarte`, `coloso_magma`, `fenix_menor`). El castillo, que solo usa genéricos + bosses geométricos, devuelve un set ⊆ core (su IntroScene no forja nada → instantánea).

Constante hermana en el mismo módulo:

```js
CORE_SPRITE_KEYS = ['hero', 'villager', 'villager_blond', 'villager_black', 'warrior', 'archer', /* + proyectiles forjados */]
```

Core = el héroe + los tres humanos genéricos (y sus skins, usados como minions de templo en **todos** los mundos) + los proyectiles forjados. Menu/Map/Branch no pintan sprites forjados (son UI/texto), así que el core es chico. **La implementación debe auditar** qué pinta cada escena previa a `Game` y confirmar que todo eso está en core.

### Pieza 2 — Servicio de forja reutilizable y troceado (Phaser-coupled)

Hoy la lógica de pintado vive atrapada en `BootScene` (`buildSprites`/`paintForged`/`paintGrid`/`mirrorFrames`/`resolvePartPalette` + resolución de `baseColor`). La extraemos a un helper compartido, p. ej. `src/scenes/spriteBaker.js`:

```js
async function bakeSprites(scene, keys, { chunkSize = 4, onProgress } = {})
```

- Para cada `key` **que no exista ya** (`scene.textures.exists(spriteKey(key))`), forja (vía el `forge()` puro existente) y pinta frames + crea anims.
- **Idempotente**: salta texturas Y anims ya presentes (`scene.anims.exists(...)`) para no re-crear nada ni emitir warnings de Phaser al revisitar.
- **Troceado/`async`**: cada `chunkSize` recipes hace `await` de un tick del navegador (`requestAnimationFrame`) para ceder el hilo. Así la IntroScene anima fluida y atiende el toque mientras la forja avanza entre frames. `chunkSize` se afina en implementación (grueso → hitch visible; fino → más overhead).
- `onProgress(done, total)` para alimentar la barra de la IntroScene.

**Nota sobre `async`:** esto NO es paralelismo real (JS es de un solo hilo; `generateTexture` necesita el canvas/WebGL del hilo principal, así que un Web Worker solo podría precalcular grillas — sobre-ingeniería para 678 ms ya tapados por la intro). El troceado es concurrencia **cooperativa**: rebanamos la forja tan fino que el freeze nunca se percibe.

`BootScene` se simplifica a: forjar primitivas geométricas + `bakeSprites(this, CORE_SPRITE_KEYS)` → `scene.start('Menu')`.

### Pieza 3 — IntroScene (Phaser-coupled)

Nueva escena `src/scenes/IntroScene.js`, registrada en `main.js`.

- `init({ regionId })`.
- `create()`:
  1. Pinta el **lore del mundo** (texto narrativo) + un botón **"Continuar"** + una barra de progreso oculta.
  2. Lanza `bakeSprites(this, [...regionSpriteKeys(REGIONS[regionId])], { onProgress })` y guarda la promesa.
- **Botón "Continuar":**
  - forja **terminada** → `scene.start('Branch', { regionId })`.
  - forja **pendiente** → muestra la barra de progreso (la "pantalla de loading de respaldo") y avanza a `Branch` automáticamente al resolver.
- Toda la lógica de espera/loading vive **solo aquí**; `Branch` y `Game` quedan intactos y asumen que los sprites existen.

**Fuente del texto:** la región ya tiene un campo `intro` (líneas i18n) que hoy se cablea como `dialogue.onEnter` del nivel 1 (`regions.js` `makeBranch`, mostrado en `GameScene.js:119`). Lo **reubicamos**: la IntroScene consume `region.intro`, y se **quita** el `onEnter: intro` del nivel 1 para no mostrar el lore dos veces. (Expandir la prosa al texto más rico que se quiere es trabajo de contenido i18n, independiente de esta arquitectura.)

## Lo que NO está en alcance (YAGNI)

- **Pre-forja en background ociosa** (forjar mundos no visitados mientras se navega menú/mapa). La intro ya cubre el costo de la primera entrada con margen ~10×, así que no aporta y arriesga jank en los menús. Queda documentado como opción futura.
- **Desalojo de texturas / gestión de memoria.** Mantener los 5 mundos forjados tras visitarlos es trivial en RAM (texturas pixel-art chicas). No se desaloja.
- **Web Workers / forja off-thread.** Sobre-ingeniería para este costo.
- **Forja por nivel** (más granular que por mundo). Analizado y descartado: en Fuego el grueso se concentra en 2 saltos (nv1: 8 sprites, nv4: 9) y los demás niveles forjan 0–1; además los picos a media progresión (entrar a nv4 desde Branch) NO los cubre ninguna intro, generando más puntos de hitch. Por mundo + intro es el punto dulce.

## Plan de pruebas

**Puras (`node --test`, nuevas):** `tests/spriteManifest.test.js`
- `regionSpriteKeys(REGIONS.fire)` incluye los invocados (`imp_brasa`, `brasa_errante`) y **excluye** los no usados (`encapuchado_pira`, `portaestandarte`, `coloso_magma`, `fenix_menor`).
- Cada región elemental incluye sus bosses (miniboss/levelBoss/templeBoss) y minions.
- `regionSpriteKeys(REGIONS.castle)` ⊆ `CORE_SPRITE_KEYS`.
- Resolución transitiva de invocaciones (un invocado que invoca) llega a punto fijo sin loop infinito.

**Phaser-coupled (no unit-test, por convención del repo):** `bakeSprites`, `IntroScene`, `BootScene` se validan a mano / con Playwright.

**Verificación manual / Playwright (medición de aceptación):**
- Boot → menú: confirmar caída a < 600 ms desktop.
- Entrar a Fuego: la intro aparece al instante; leyendo a ritmo normal, "Continuar" ya está listo sin loading.
- Pulsar "Continuar" inmediatamente (sin leer): aparece la barra de progreso un instante y luego avanza.
- Revisitar Fuego (Map → portal otra vez): intro instantánea, sin forja.
- Auditoría visual: todos los sprites de cada mundo se ven igual que antes; sin texturas faltantes ni warnings de anim duplicada en consola.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Sprite que pinta una escena previa a `Game` no está en core → textura faltante | Auditar Menu/Map/Branch/SkillTree/Shop en implementación; ampliar `CORE_SPRITE_KEYS`. |
| Re-crear una anim ya existente al revisitar → warning Phaser | `bakeSprites` salta texturas **y** anims existentes (idempotente). |
| `chunkSize` mal calibrado (hitch o lentitud) | Afinar contra medición; objetivo: intro fluida sin alargar la forja total notablemente. |
| El manifiesto omite una invocación anidada (boss que invoca algo que invoca) | Resolución transitiva a punto fijo + test que lo cubre. |

## Archivos afectados

- **Nuevo** `src/data/spriteManifest.js` — `regionSpriteKeys`, `CORE_SPRITE_KEYS` (puro).
- **Nuevo** `src/scenes/spriteBaker.js` — `bakeSprites` (extraído de BootScene).
- **Nuevo** `src/scenes/IntroScene.js`.
- **Nuevo** `tests/spriteManifest.test.js`.
- `src/scenes/BootScene.js` — solo primitivas + core; delega pintado a `spriteBaker`.
- `src/scenes/MapScene.js` — los 4 portales elementales → `Intro` en vez de `Branch`; el portal del castillo se queda en `Branch`.
- `src/data/regions.js` — quitar `onEnter: intro` del nivel 1 en `makeBranch` (lore pasa a IntroScene); `makeCastle` queda intacto.
- `src/main.js` — registrar `IntroScene`.
```
